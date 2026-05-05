const BASE = import.meta.env.VITE_API_BASE_URL;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export interface MessageResponse {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: EncryptedPayload;
  delivered: boolean;
  created_at: string;
}

export interface ConversationSummary {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string | null;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json())?.detail ?? res.statusText);
  return res.json();
}

export const messagesApi = {
  send: async (
    to: string,
    payload: EncryptedPayload,
    token: string
  ): Promise<MessageResponse> => {
    const res = await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, payload }),
    });
    if (!res.ok) throw new Error((await res.json())?.detail ?? res.statusText);
    return res.json();
  },

  getConversations: (token: string) =>
    get<ConversationSummary[]>("/conversations", token),

  getHistory: (userId: string, token: string, before?: string) =>
    get<MessageResponse[]>(
      `/conversations/${userId}/messages${before ? `?before=${before}` : ""}`,
      token
    ),
};