const BASE = import.meta.env.VITE_API_BASE_URL;

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json())?.detail ?? res.statusText);
  return res.json();
}

export interface UserPublicInfo {
  id: string;
  username: string;
  display_name: string;
}

export const usersApi = {
  search: (q: string, token: string) =>
    get<UserPublicInfo[]>(`/users/search?q=${encodeURIComponent(q)}`, token),

  getPublicKey: (userId: string, token: string) =>
    get<{ public_key: string }>(`/users/${userId}/public-key`, token),
};