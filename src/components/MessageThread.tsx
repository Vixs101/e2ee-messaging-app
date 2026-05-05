import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { messagesApi, type MessageResponse } from "../api/messages";
import { usersApi } from "../api/users";
import { importPublicKey } from "../crypto/keys";
import { encryptMessage, safeDecrypt } from "../crypto/messaging";
import { wsManager } from "../api/ws";
import { EncryptedBadge } from "./EncryptedBadge";
import { Banner } from "./ui/Banner";
import { cn } from "@/lib/utils";
import { toAppError } from "@/lib/errors";

interface DecryptedMessage {
  id: string;
  fromSelf: boolean;
  text: string;
  createdAt: string;
  status: "sending" | "sent" | "delivered" | "failed";
}

function sortMessagesByCreatedAt(messages: DecryptedMessage[]) {
  return [...messages].sort((a, b) => {
    const timeDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });
}

interface Props {
  recipientId: string;
  recipientName: string;
  isMobile?: boolean;
  onBack?: () => void;
}

export function MessageThread({ recipientId, recipientName, isMobile = false, onBack }: Props) {
  const { user, accessToken, privateKey } = useAuthStore();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const upsertMessage = useCallback((next: DecryptedMessage, optimisticId?: string) => {
    setMessages((prev) => {
      const withoutOptimistic = optimisticId
        ? prev.filter((message) => message.id !== optimisticId)
        : prev;

      const existingIndex = withoutOptimistic.findIndex((message) => message.id === next.id);
      if (existingIndex === -1) return sortMessagesByCreatedAt([...withoutOptimistic, next]);

      const updated = [...withoutOptimistic];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...next,
        status:
          updated[existingIndex].status === "sending" && next.status === "sent"
            ? "sending"
            : next.status,
      };
      return sortMessagesByCreatedAt(updated);
    });
  }, []);

  const decryptAndAdd = useCallback(async (msg: MessageResponse, optimisticId?: string) => {
    if (!privateKey) return;
    const fromSelf = msg.from_user_id === user?.id;
    const text = await safeDecrypt(msg.payload, privateKey, fromSelf);
    upsertMessage({
      id: msg.id,
      fromSelf,
      text,
      createdAt: msg.created_at,
      status: fromSelf ? (msg.delivered ? "delivered" : "sent") : "delivered",
    }, optimisticId);
  }, [privateKey, upsertMessage, user?.id]);

  // Load history
  useEffect(() => {
    if (!accessToken || !privateKey) return;

    const controller = new AbortController();

    async function load() {
      setMessages([]);
      setLoading(true);
      setHistoryError(null);
      try {
        const msgs = await messagesApi.getHistory(recipientId, accessToken!);
        if (!controller.signal.aborted) {
          await Promise.all(msgs.map((msg) => decryptAndAdd(msg)));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setHistoryError(toAppError(err, "Unable to load this conversation.").message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [recipientId, accessToken, privateKey, decryptAndAdd]);

  // WebSocket — incoming messages
  useEffect(() => {
    const unsub = wsManager.subscribe(async (wsMsg) => {
      if (wsMsg.event !== "message.receive") return;
      const { data } = wsMsg;
      if (data.from_user_id !== recipientId && data.to_user_id !== recipientId) return;
      await decryptAndAdd({
        id: data.id,
        from_user_id: data.from_user_id,
        to_user_id: data.to_user_id,
        payload: data.payload,
        delivered: true,
        created_at: data.created_at,
      });
    });
    return () => { unsub(); };
  }, [recipientId, decryptAndAdd]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !accessToken || !privateKey || !user) return;
    const messageText = input.trim();
    const optimisticId = `temp-${crypto.randomUUID()}`;
    setComposerError(null);

    upsertMessage({
      id: optimisticId,
      fromSelf: true,
      text: messageText,
      createdAt: new Date().toISOString(),
      status: "sending",
    });
    setInput("");
    setSending(true);

    try {
      // Get recipient's public key
      const { public_key } = await usersApi.getPublicKey(recipientId, accessToken);
      const recipientPubKey = await importPublicKey(public_key);
      const senderPubKey = await importPublicKey(user.public_key);

      // Encrypt
      const payload = await encryptMessage(messageText, recipientPubKey, senderPubKey);

      // Send
      const msg = await messagesApi.send(recipientId, payload, accessToken);
      upsertMessage({
        id: msg.id,
        fromSelf: true,
        text: messageText,
        createdAt: msg.created_at,
        status: msg.delivered ? "delivered" : "sent",
      }, optimisticId);
    } catch (err) {
      upsertMessage({
        id: optimisticId,
        fromSelf: true,
        text: messageText,
        createdAt: new Date().toISOString(),
        status: "failed",
      });
      setInput((current) => current || messageText);
      setComposerError(toAppError(err, "Unable to send message.").message);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="flex h-full min-h-dvh flex-col">
      <div className={isMobile ? "flex shrink-0 items-center justify-between gap-3 border-b border-app-border px-4 py-[14px]" : "flex shrink-0 items-center justify-between gap-3 border-b border-app-border px-5 py-4"}>
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back to conversations"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-app-border bg-transparent text-app-text transition-colors hover:border-app-accent"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <p className="truncate text-[15px] font-medium">{recipientName}</p>
        </div>
        <EncryptedBadge />
      </div>

      <div className={isMobile ? "min-w-0 flex-1 overflow-y-auto px-3 pb-2 pt-4" : "min-w-0 flex-1 overflow-y-auto px-5 pb-2 pt-5"}>
        {historyError && (
          <Banner
            message={historyError}
            actionLabel="RETRY"
            onAction={() => {
              setHistoryError(null);
              setLoading(true);
              void messagesApi.getHistory(recipientId, accessToken!)
                .then((msgs) => Promise.all(msgs.map((msg) => decryptAndAdd(msg))))
                .then(() => setHistoryError(null))
                .catch((error) => setHistoryError(toAppError(error, "Unable to load this conversation.").message))
                .finally(() => setLoading(false));
            }}
            className="mb-3"
          />
        )}
        {loading ? (
          <p className="font-mono text-[11px] text-app-subtext">decrypting messages...</p>
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-[13px] text-app-subtext">
            No messages yet. Say something — only {recipientName} can read it.
          </p>
        ) : (
          messages.map(m => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div className={isMobile ? "relative flex shrink-0 items-end gap-2.5 border-t border-app-border px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5" : "relative flex shrink-0 items-end gap-2.5 border-t border-app-border px-5 pb-5 pt-3"}>
        {composerError && (
          <div className="absolute bottom-full left-0 right-0 px-3 pb-2 md:px-5">
            <Banner message={composerError} />
          </div>
        )}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send)"
          rows={1}
          className={cn(
            "min-h-[42px] flex-1 resize-none rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm leading-6 text-app-text outline-none transition-colors placeholder:text-app-subtext/70 focus:border-app-accent",
            isMobile ? "max-h-[120px]" : "max-h-[160px]"
          )}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-text text-app-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: DecryptedMessage }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const failed = message.text === "[Unable to decrypt message]";

  return (
    <div className={message.fromSelf ? "mb-2.5 flex justify-end" : "mb-2.5 flex justify-start"}>
      <div className={cn(
        "w-fit max-w-[68%] break-words px-3.5 py-[9px]",
        message.fromSelf
          ? "rounded-[14px_14px_4px_14px] bg-app-text text-app-bg"
          : "rounded-[14px_14px_14px_4px] border border-app-border bg-app-surface text-app-text",
        failed && "border border-app-danger"
      )}>
        <p className={failed ? "text-sm leading-6 text-app-danger" : "text-sm leading-6"}>
          {message.text}
        </p>
        <p className={message.fromSelf
          ? "mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-black/50"
          : "mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-app-subtext"}>
          <span>{time}</span>
          {message.fromSelf && <MessageStatusIcon status={message.status} />}
        </p>
      </div>
    </div>
  );
}

function MessageStatusIcon({ status }: { status: DecryptedMessage["status"] }) {
  const stroke = "currentColor";

  if (status === "sending") {
    return (
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-label="Sending">
        <circle cx="8" cy="8" r="5.25" stroke={stroke} strokeWidth="1.25" opacity="0.6" />
        <path d="M8 5.2V8.1L10 9.4" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === "delivered" || status === "sent") {
    return (
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-label={status === "delivered" ? "Delivered" : "Sent"}>
        <path d="M3.5 8.4 6.3 11l6.2-6.4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-label="Failed">
      <circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth="1.25" />
      <path d="M8 4.8v4.1" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="11.8" r="0.9" fill={stroke} />
    </svg>
  );
}
