// AES-GCM message encryption/decryption using RSA-OAEP for key exchange.

import { toBase64, fromBase64 } from "./keys";

const AES_GCM = { name: "AES-GCM", length: 256 };

/**
 * Encrypts a plaintext message for a recipient.
 * Returns the encrypted payload ready to POST to the backend.
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey, 
  senderPublicKey: CryptoKey    
): Promise<{
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}> {
  const enc = new TextEncoder();

  const aesKey = await crypto.subtle.generateKey(AES_GCM, true, ["encrypt", "decrypt"]);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    enc.encode(plaintext)
  );

  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);

  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKey
  );

  const encryptedKeyForSelf = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawAesKey
  );

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv.buffer),
    encryptedKey: toBase64(encryptedKey),
    encryptedKeyForSelf: toBase64(encryptedKeyForSelf),
  };
}


/**
 * Decrypts a received message using our RSA private key.
 * Works for both received messages (encryptedKey) and sent messages (encryptedKeyForSelf).
 */
export async function decryptMessage(
  payload: {
    ciphertext: string;
    iv: string;
    encryptedKey: string;
    encryptedKeyForSelf: string;
  },
  privateKey: CryptoKey,
  isSender: boolean 
): Promise<string> {
  const dec = new TextDecoder();

  const encryptedAesKey = isSender
    ? fromBase64(payload.encryptedKeyForSelf)
    : fromBase64(payload.encryptedKey);

  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedAesKey
  );

  const aesKey = await crypto.subtle.importKey("raw", rawAesKey, AES_GCM, false, ["decrypt"]);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    aesKey,
    fromBase64(payload.ciphertext)
  );

  return dec.decode(plaintext);
}


/**
 * Gracefully handles decryption failures (wrong key, corrupted data, etc.)
 * Always use this in the UI instead of calling decryptMessage directly.
 */
export async function safeDecrypt(
  payload: Parameters<typeof decryptMessage>[0],
  privateKey: CryptoKey,
  isSender: boolean
): Promise<string> {
  try {
    return await decryptMessage(payload, privateKey, isSender);
  } catch {
    return "[Unable to decrypt message]";
  }
}