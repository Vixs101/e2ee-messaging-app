import { useState, useEffect, useCallback } from "react";
import { ConversationList } from "../components/ConversationList";
import { MessageThread } from "../components/MessageThread";
import { Banner } from "../components/ui/Banner";
import { useAuthStore } from "../store/useAuthStore";
import { useTokenRefresh } from "../hooks/useTokenRefresh";
import { messagesApi, type ConversationSummary } from "../api/messages";
import { wsManager } from "../api/ws";
import { toAppError } from "@/lib/errors";

export function Chat() {
  useTokenRefresh(); 

  const { accessToken, user } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(new Set());
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [connectionBanner, setConnectionBanner] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sortConversations = useCallback((items: ConversationSummary[]) => {
    return [...items].sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const next = await messagesApi.getConversations(accessToken);
      setConversations(sortConversations(next));
      setConversationsError(null);
    } catch (error) {
      setConversationsError(toAppError(error, "Unable to load conversations.").message);
    }
  }, [accessToken, sortConversations]);

  useEffect(() => {
    if (!accessToken) return;
    
    async function load() {
      setLoadingConvos(true);
      try {
        await refreshConversations();
      } finally {
        setLoadingConvos(false);
      }
    }
    
    void load();
  }, [accessToken, refreshConversations]);

  useEffect(() => {
    if (!accessToken) return;

    const unsubscribe = wsManager.subscribe(async (wsMsg) => {
      if (wsMsg.event !== "message.receive") return;
      const { data } = wsMsg;

      setConnectionBanner(null);

      //  just refresh conversation order in the background
      if (data.from_user_id === user?.id) {
        void refreshConversations();
        return;
      }

      const conversationUserId = data.from_user_id;


      await refreshConversations();

      if (conversationUserId === activeUserId) return;

      setUnreadConversationIds((prev) => {
        if (prev.has(conversationUserId)) return prev;
        const next = new Set(prev);
        next.add(conversationUserId);
        return next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [accessToken, activeUserId, refreshConversations, user?.id]);

  useEffect(() => {
    function handleOffline() {
      setConnectionBanner("You’re offline. Messages may be delayed until your connection returns.");
    }

    function handleOnline() {
      setConnectionBanner("Connection restored.");
      void refreshConversations();
      window.setTimeout(() => setConnectionBanner((current) => current === "Connection restored." ? null : current), 3000);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshConversations]);

  const handleSelectConversation = useCallback((userId: string | null) => {
    setActiveUserId(userId);
    if (userId) {
      setUnreadConversationIds((prev) => {
        if (!prev.has(userId)) return prev;
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, []);

  const activeConvo = conversations.find(c => c.user_id === activeUserId) ?? null;
  const showThread = !isMobile || !!activeUserId;
  const showList = !isMobile || !activeUserId;

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-app-bg">
      {(conversationsError || connectionBanner) && (
        <div className="absolute left-4 right-4 top-4 z-20">
          <Banner
            message={conversationsError ?? connectionBanner ?? ""}
            variant={conversationsError ? "error" : "info"}
            actionLabel={conversationsError ? "RETRY" : undefined}
            onAction={conversationsError ? () => void refreshConversations() : undefined}
          />
        </div>
      )}
      {showList && (
        <ConversationList
          conversations={conversations}
          activeUserId={activeUserId}
          unreadConversationIds={unreadConversationIds}
          loading={loadingConvos}
          searchPlaceholder="Find user..."
          isMobile={isMobile}
          onSelect={handleSelectConversation}
          onNewConversation={(userId, displayName, username) => {
            if (!conversations.find(c => c.user_id === userId)) {
              setConversations((prev) =>
                sortConversations([
                  ...prev,
                  { user_id: userId, display_name: displayName, username, last_message_at: null },
                ])
              );
            }
            handleSelectConversation(userId);
          }}
        />
      )}

      {showThread && (
        <div className={isMobile || !showList ? "flex min-w-0 flex-1 flex-col" : "flex min-w-0 flex-1 flex-col border-l border-app-border"}>
          {activeUserId && activeConvo ? (
            <MessageThread
              recipientId={activeUserId}
              recipientName={activeConvo.display_name}
              isMobile={isMobile}
              onBack={isMobile ? () => handleSelectConversation(null) : undefined}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-6">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-app-muted">
        <rect x="4" y="10" width="24" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 10V7a6 6 0 0 1 12 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="16" cy="18" r="2" fill="currentColor"/>
      </svg>
      <p className="font-mono text-[11px] tracking-[0.06em] text-app-subtext">
        SELECT A CONVERSATION
      </p>
    </div>
  );
}
