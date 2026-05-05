const WS_URL = import.meta.env.VITE_WS_URL;

export type WSMessage = {
  event: "message.receive";
  data: {
    id: string;
    from_user_id: string;
    to_user_id: string;
    payload: {
      ciphertext: string;
      iv: string;
      encryptedKey: string;
      encryptedKeyForSelf: string;
    };
    created_at: string;
  };
};

type MessageHandler = (msg: WSMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string = "";

  connect(token: string) {
    this.token = token;
    this.cleanup();
    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.event === "message.receive") {
          this.handlers.forEach((h) => h(msg));
        }
      } catch {
        // malformed frame — ignore
      }
    };

    this.ws.onclose = () => {

      this.reconnectTimer = setTimeout(() => {
        if (this.token) this.connect(this.token);
      }, 3000);
    };

    this.ws.onerror = () => this.ws?.close();
  }

  updateToken(newToken: string) {
    this.token = newToken;
    this.connect(newToken);
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler); 
  }

  private cleanup() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  disconnect() {
    this.token = "";
    this.cleanup();
  }
}

export const wsManager = new WebSocketManager();