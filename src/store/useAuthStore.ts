import { create } from "zustand";
import type { UserProfile } from "../api/auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  privateKey: CryptoKey | null; // NEVER persisted — memory only

  setSession: (
    accessToken: string,
    refreshToken: string,
    user: UserProfile,
    privateKey: CryptoKey
  ) => void;
  updateAccessToken: (token: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  privateKey: null,

  setSession: (accessToken, refreshToken, user, privateKey) =>
    set({ accessToken, refreshToken, user, privateKey }),

  updateAccessToken: (token) => set({ accessToken: token }),

  clearSession: () =>
    set({ accessToken: null, refreshToken: null, user: null, privateKey: null }),
}));