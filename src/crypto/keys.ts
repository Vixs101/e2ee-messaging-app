// All RSA + AES-KW key operations

const RSA_ALGORITHM = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
}

const PBKDF2_ITERATIONS = 200_000;
const AES_GCM_WRAP_ALGORITHM = { name: "AES-GCM", length: 256 };

// helpers
export const toBase64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

export const fromBase64 = (b64: string): ArrayBuffer =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

/**
 * Called once at registration.
 * Generates the user's RSA-OAEP keypair.
 * Public key → backend. Private key → wrapped before leaving memory.
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_ALGORITHM, true, ["encrypt", "decrypt"]);
}

/**
 * Exports the public key to base64 so it can be sent to the backend.
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const buf = await crypto.subtle.exportKey("spki", publicKey);
  return toBase64(buf);
}


/**
 * Generates a random 128-bit salt.
 * Created once at registration, stored on backend, returned at login.
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(salt.buffer);
}

/**
 * Derives an AES-KW key from the user's password + salt via PBKDF2.
 * This key is used ONLY to wrap/unwrap the private key — never sent anywhere.
 */
async function deriveWrappingKey(
  password: string,
  saltB64: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();


  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );


  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    AES_GCM_WRAP_ALGORITHM,  
    false, 
    ["encrypt", "decrypt"] 
  );
}


/**
 * Wraps (encrypts) the RSA private key using the AES-KW wrapping key.
 * The result (base64) is safe to send to the backend.
 */
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  password: string,
  saltB64: string
): Promise<string> {
  const wrappingKey = await deriveWrappingKey(password, saltB64);
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    exported
  );
  const combined = new Uint8Array(iv.byteLength + wrapped.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrapped), 12);
  return toBase64(combined.buffer);
}

/**
 * Unwraps (decrypts) the private key using the password + salt.
 * Called at login. Returns a usable CryptoKey held only in memory.
 */
export async function unwrapPrivateKey(
  wrappedPrivateKeyB64: string,
  password: string,
  saltB64: string
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(password, saltB64);
  const combined = new Uint8Array(fromBase64(wrappedPrivateKeyB64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    ciphertext
  );
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
}

/**
 * Imports a base64 public key (from backend) into a usable CryptoKey.
 * Used when encrypting a message for another user.
 */
export async function importPublicKey(publicKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromBase64(publicKeyB64),
    RSA_ALGORITHM,
    false,
    ["encrypt"]
  );
}