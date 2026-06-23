/**
 * Vault encryption — a runnable demonstration of the plan's privacy posture
 * (section 5). When the user sets a passphrase, the entire local data vault is
 * encrypted at rest with AES-256-GCM using a key derived via PBKDF2. The
 * passphrase is the root of the key and is never stored, so the data cannot be
 * recovered without it (real E2EE semantics).
 *
 * In production this same key would wrap the sync payloads pushed to the
 * server (Jazz/Evolu), so the server only ever sees ciphertext.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const saltBuf = Uint8Array.from(salt);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: 210_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedBlob {
  v: 1;
  salt: string;
  iv: string;
  ct: string;
}

export async function encryptJSON(data: unknown, passphrase: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: Uint8Array.from(iv) },
    key,
    enc.encode(JSON.stringify(data)),
  );
  return { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function decryptJSON<T>(blob: EncryptedBlob, passphrase: string): Promise<T> {
  const key = await deriveKey(passphrase, unb64(blob.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(unb64(blob.iv)) },
    key,
    Uint8Array.from(unb64(blob.ct)),
  );
  return JSON.parse(dec.decode(pt)) as T;
}

export function isEncryptedBlob(x: unknown): x is EncryptedBlob {
  return !!x && typeof x === "object" && (x as EncryptedBlob).v === 1 && "ct" in (x as object);
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
