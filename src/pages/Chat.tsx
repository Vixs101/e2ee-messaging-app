import { useState, useEffect } from "react";
import { ConversationList } from "../components/ConversationList";
import { MessageThread } from "../components/MessageThread";
import { useAuthStore } from "../store/useAuthStore";
import { useTokenRefresh } from "../hooks/useTokenRefresh";
import { messagesApi, type ConversationSummary } from "../api/messages";

export function Chat() {
  useTokenRefresh(); // silent token refresh in background

  const { accessToken } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    messagesApi.getConversations(accessToken)
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoadingConvos(false));
  }, [accessToken]);

  const activeConvo = conversations.find(c => c.user_id === activeUserId) ?? null;
  const showThread = !isMobile || !!activeUserId;
  const showList = !isMobile || !activeUserId;

  return (
    <div className="flex min-h-dvh overflow-hidden bg-app-bg">
      {showList && (
        <ConversationList
          conversations={conversations}
          activeUserId={activeUserId}
          loading={loadingConvos}
          isMobile={isMobile}
          onSelect={setActiveUserId}
          onNewConversation={(userId, displayName, username) => {
            if (!conversations.find(c => c.user_id === userId)) {
              setConversations(prev => [...prev, { user_id: userId, display_name: displayName, username, last_message_at: null }]);
            }
            setActiveUserId(userId);
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
              onBack={isMobile ? () => setActiveUserId(null) : undefined}
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
