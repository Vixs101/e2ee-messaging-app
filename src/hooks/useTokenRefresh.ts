import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { authApi } from "../api/auth";
import { wsManager } from "../api/ws";
import { toAppError } from "@/lib/errors";

const REFRESH_INTERVAL = 13 * 60 * 1000; 

export function useTokenRefresh() {
  const navigate = useNavigate();
  const { refreshToken, updateAccessToken, clearSession, setSessionMessage } = useAuthStore();

  useEffect(() => {
    if (!refreshToken) return;

    const interval = setInterval(async () => {
      try {
        const { access_token } = await authApi.refresh(refreshToken);
        updateAccessToken(access_token);
        wsManager.updateToken(access_token); 
      } catch (error) {
        const appError = toAppError(error, "Session expired. Please sign in again.");
        wsManager.disconnect();
        clearSession();
        setSessionMessage(
          appError.kind === "network"
            ? "Your session could not be refreshed. Please sign in again."
            : "Session expired. Please sign in again."
        );
        navigate("/login", { replace: true });
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshToken, updateAccessToken, clearSession, navigate, setSessionMessage]);
}
