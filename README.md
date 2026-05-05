# WhisperBox

> End-to-end encrypted messaging. The server stores only ciphertext — plaintext never leaves your device.

![E2E Encrypted](https://img.shields.io/badge/encryption-E2E-7c9a6e?style=flat-square) ![Built with React](https://img.shields.io/badge/built%20with-React%20%2B%20TypeScript-blue?style=flat-square) ![Vite](https://img.shields.io/badge/bundler-Vite-646cff?style=flat-square)

---

## What is WhisperBox?

WhisperBox is a secure messaging application where every message is encrypted on your device before it ever reaches the server. The backend stores and forwards encrypted blobs — it has no ability to read your conversations, and neither does anyone who might intercept traffic.

---

## How the Encryption Works

WhisperBox uses a **hybrid encryption scheme** combining asymmetric and symmetric cryptography, implemented entirely via the browser's native **Web Crypto API** — no third-party crypto libraries.

### Key Generation (on Register)

1. An **RSA-OAEP 2048-bit keypair** is generated in the browser
2. A random **PBKDF2 salt** (128-bit) is generated
3. An **AES-GCM wrapping key** is derived from the user's password + salt via PBKDF2 (200,000 iterations)
4. The RSA private key is **wrapped (encrypted)** with this AES-GCM key
5. The server receives: `public_key`, `wrapped_private_key`, `pbkdf2_salt`, and the hashed password
6. The raw private key **never leaves the client**

### Session Restore (on Login)

1. The server returns `wrapped_private_key` + `pbkdf2_salt`
2. The client re-derives the AES-GCM wrapping key from the user's password
3. The private key is **unwrapped into memory only** — never written to disk or storage

### Sending a Message

1. A random **AES-GCM 256-bit key** and **96-bit IV** are generated per message
2. The plaintext is encrypted with AES-GCM → `ciphertext`
3. The AES key is encrypted with the **recipient's RSA public key** → `encryptedKey`
4. The AES key is also encrypted with the **sender's own RSA public key** → `encryptedKeyForSelf`
5. All four values (`ciphertext`, `iv`, `encryptedKey`, `encryptedKeyForSelf`) are sent to the backend

### Receiving a Message

1. `encryptedKey` is decrypted using the recipient's **RSA private key** → AES key
2. `ciphertext` is decrypted using the AES key + `iv` → plaintext

The server sees only opaque base64 blobs at every step.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS v4 + CSS variables |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Routing | React Router v6 |
| Cryptography | Web Crypto API (native browser) |
| Real-time | WebSocket |
| Backend | WhisperBox API (provided) |

---

## Project Structure

```
src/
├── crypto/
│   ├── keys.ts          # RSA keypair generation, PBKDF2, AES-GCM wrap/unwrap
│   └── messaging.ts     # AES-GCM message encrypt/decrypt, safeDecrypt wrapper
├── api/
│   ├── auth.ts          # register, login, refresh, logout
│   ├── users.ts         # search, getPublicKey
│   ├── messages.ts      # send, getConversations, getHistory
│   └── ws.ts            # WebSocket manager (singleton, auto-reconnect)
├── store/
│   └── useAuthStore.ts  # Zustand store — access token, user, private key (memory only)
├── hooks/
│   └── useTokenRefresh.ts  # Silent JWT refresh every 13 minutes
├── components/
│   ├── ui/
│   │   ├── Input.tsx
│   │   └── Button.tsx
│   ├── EncryptedBadge.tsx
│   ├── ConversationList.tsx
│   └── MessageThread.tsx
├── pages/
│   ├── Register.tsx
│   ├── Login.tsx
│   └── Chat.tsx
└── App.tsx
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/whisperbox.git
cd whisperbox

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

```env
VITE_API_BASE_URL=
VITE_WS_URL=
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## Security Design Decisions

### Private Key Storage
The RSA private key is held **in Zustand state (memory) only**. It is never written to `localStorage`, `sessionStorage`, or `IndexedDB` in plaintext. On page refresh, the user re-enters their password to unwrap it — this is intentional and correct behavior.

### Password Usage
The password serves two independent purposes:
- **Backend:** bcrypt-hashed for identity verification
- **Client only:** PBKDF2 key derivation to wrap/unwrap the private key

These are cryptographically independent. The wrapping key derived on the client is never transmitted.

### No Sensitive Data in localStorage
Access tokens are stored in Zustand memory only. Refresh tokens are also memory-only. There is no persistence between sessions — users must log in again after a page refresh.

### Decryption Failures
All decryption is wrapped in a `safeDecrypt` utility that catches errors gracefully and displays `[Unable to decrypt message]` rather than crashing, protecting against corrupted payloads or wrong-key scenarios.

### Token Refresh
Access tokens expire after 15 minutes. A `useTokenRefresh` hook silently refreshes every 13 minutes and reconnects the WebSocket with the new token. On refresh failure, the session is cleared and the user is redirected to login.

---

## API Reference

Base URL: `https://whisperbox.koyeb.app`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account with key material |
| POST | `/auth/login` | Login, returns wrapped private key |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Get current user profile |
| GET | `/users/search?q=` | Search users by username or display name |
| GET | `/users/{userId}/public-key` | Get a user's RSA public key |
| GET | `/conversations` | List all conversation threads |
| GET | `/conversations/{userId}/messages` | Paginated message history |
| POST | `/messages` | Send encrypted message (REST fallback) |
| WSS | `/ws?token=` | Real-time message delivery |

Full API documentation: `https://whisperbox.koyeb.app/docs`

---

## WebSocket Events

**Incoming — `message.receive`**
```json
{
  "event": "message.receive",
  "data": {
    "id": "uuid",
    "from_user_id": "uuid",
    "to_user_id": "uuid",
    "payload": {
      "ciphertext": "base64",
      "iv": "base64",
      "encryptedKey": "base64",
      "encryptedKeyForSelf": "base64"
    },
    "created_at": "ISO8601"
  }
}
```

**Outgoing — `message.send`**
```json
{
  "event": "message.send",
  "data": {
    "to": "recipient-uuid",
    "payload": {
      "ciphertext": "base64",
      "iv": "base64",
      "encryptedKey": "base64",
      "encryptedKeyForSelf": "base64"
    }
  }
}
```

---

## Cryptographic Algorithms

| Purpose | Algorithm |
|---|---|
| Asymmetric keypair | RSA-OAEP, 2048-bit, SHA-256 |
| Message encryption | AES-GCM, 256-bit, 96-bit IV |
| Private key wrapping | AES-GCM, 256-bit |
| Wrapping key derivation | PBKDF2, SHA-256, 200,000 iterations |
| Password hashing (server) | bcrypt |

---

## Known Constraints

- **Page refresh clears the session.** The private key is memory-only by design. Users must log in again after a refresh.
- **Single device only.** There is no multi-device key sync — a private key generated on one device cannot be used on another without re-deriving from the password (which is supported via the wrapped key flow).
- **No message deletion.** The backend does not expose a delete endpoint in the current API version.

---

## License

MIT