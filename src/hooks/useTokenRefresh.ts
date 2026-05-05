import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { authApi } from "../api/auth";
import { wsManager } from "../api/ws";

const REFRESH_INTERVAL = 13 * 60 * 1000; 

export function useTokenRefresh() {
  const { refreshToken, updateAccessToken, clearSession } = useAuthStore();

  useEffect(() => {
    if (!refreshToken) return;

    const interval = setInterval(async () => {
      try {
        const { access_token } = await authApi.refresh(refreshToken);
        updateAccessToken(access_token);
        wsManager.updateToken(access_token); 
      } catch {
        clearSession(); 
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshToken, updateAccessToken, clearSession]);
}