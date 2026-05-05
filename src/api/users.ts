import { parseApiResponse, toAppError } from "@/lib/errors";
const BASE = import.meta.env.VITE_API_BASE_URL;

async function get<T>(path: string, token: string): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiResponse<T>(res);
  } catch (error) {
    throw toAppError(error, "Unable to load user data");
  }
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
