const BASE = import.meta.env.VITE_API_BASE_URL;

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json())?.detail ?? res.statusText);
  return res.json();
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export const authApi = {
  register: (body: {
    username: string;
    display_name: string;
    password: string;
    public_key: string;
    wrapped_private_key: string;
    pbkdf2_salt: string;
  }) => post<AuthResponse>("/auth/register", body),

  login: (username: string, password: string) =>
    post<AuthResponse>("/auth/login", { username, password }),

  refresh: (refresh_token: string) =>
    post<TokenResponse>("/auth/refresh", { refresh_token }),

  logout: (refresh_token: string, token: string) =>
    post("/auth/logout", { refresh_token }, token),
};