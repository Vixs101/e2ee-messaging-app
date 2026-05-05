import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { usersApi, type UserPublicInfo } from "../api/users";
import { EncryptedBadge } from "./EncryptedBadge";
import type { ConversationSummary } from "../api/messages";
import { Button } from "./ui/Button";
import { authApi } from "../api/auth";
import { wsManager } from "../api/ws";

interface Props {
  conversations: ConversationSummary[];
  activeUserId: string | null;
  unreadConversationIds: Set<string>;
  loading: boolean;
  isMobile: boolean;
  onSelect: (id: string) => void;
  onNewConversation: (id: string, displayName: string, username: string) => void;
}

export function ConversationList({
  conversations,
  activeUserId,
  unreadConversationIds,
  loading,
  isMobile,
  onSelect,
  onNewConversation,
}: Props) {
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, clearSession } = useAuthStore();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserPublicInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSearch(q: string) {
    setSearch(q);
    if (q.length < 2) return setResults([]);
    setSearching(true);
    try {
      const res = await usersApi.search(q, accessToken!);
      setResults(res.filter(u => u.id !== user?.id));
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      if (refreshToken && accessToken) {
        await authApi.logout(refreshToken, accessToken);
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      wsManager.disconnect();
      clearSession();
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  }

  return (
    <div className={isMobile ? "flex min-h-dvh min-w-0 w-full shrink-0 flex-col border-r border-app-border" : "flex min-h-dvh min-w-0 w-[280px] shrink-0 flex-col border-r border-app-border"}>
      <div className={isMobile ? "border-b border-app-border px-4 pb-3 pt-[18px]" : "border-b border-app-border px-4 pb-3 pt-5"}>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.06em] text-white font-semibold">
            {user?.display_name}
          </span>
          <EncryptedBadge />
        </div>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Find user..."
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-[13px] text-app-text outline-none transition-colors placeholder:text-app-subtext/70 focus:border-app-accent"
        />
        {searching ? (
          <div className="mt-1 px-3 py-2.5 font-mono text-[11px] text-app-subtext">
            searching...
          </div>
        ) : results.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-md border border-app-border bg-app-surface">
            {results.map(u => (
              <button key={u.id}
                onClick={() => { onNewConversation(u.id, u.display_name, u.username); setSearch(""); setResults([]); }}
                className="flex w-full cursor-pointer flex-col gap-0.5 bg-transparent px-3 py-2.5 text-left text-[13px] text-app-text transition-colors hover:bg-app-border/40"
              >
                <span>{u.display_name}</span>
                <span className="font-mono text-[11px] text-app-subtext">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 font-mono text-xs text-app-subtext">loading...</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-xs text-app-subtext">No conversations yet. Search for a user above.</p>
        ) : (
          conversations.map(c => (
            <button key={c.user_id}
              onClick={() => onSelect(c.user_id)}
              className={activeUserId === c.user_id
                ? isMobile
                  ? "flex w-full cursor-pointer flex-col gap-[3px] border-b border-app-border bg-app-surface px-4 py-[14px] text-left text-app-text transition-colors"
                  : "flex w-full cursor-pointer flex-col gap-[3px] border-b border-app-border bg-app-surface px-4 py-3 text-left text-app-text transition-colors"
                : isMobile
                  ? "flex w-full cursor-pointer flex-col gap-[3px] border-b border-app-border bg-transparent px-4 py-[14px] text-left text-app-text transition-colors hover:bg-app-border/30"
                  : "flex w-full cursor-pointer flex-col gap-[3px] border-b border-app-border bg-transparent px-4 py-3 text-left text-app-text transition-colors hover:bg-app-border/30"}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">{c.display_name}</span>
                {activeUserId !== c.user_id && unreadConversationIds.has(c.user_id) && (
                  <span
                    aria-label="Unread messages"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                  />
                )}
              </div>
              <span className="font-mono text-[11px] text-app-subtext">@{c.username}</span>
            </button>
          ))
        )}
      </div>

      <div className={isMobile ? "border-t border-app-border px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3" : "border-t border-app-border p-4"}>
        <Button variant="ghost" loading={loggingOut} onClick={handleLogout} className="cursor-pointer">
          LOG OUT
        </Button>
      </div>
    </div>
  );
}
