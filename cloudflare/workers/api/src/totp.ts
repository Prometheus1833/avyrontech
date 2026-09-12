import { constantTimeEqual } from "./security";

const encoder = new TextEncoder();
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ownedBytes = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(bytes);

const base64UrlEncode = (bytes: ArrayBuffer | Uint8Array): string => {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let index = 0; index < value.length; index += 0x8000) {
    binary += String.fromCharCode(...value.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecode = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

export const base32Encode = (bytes: Uint8Array): string => {
  let bits = 0;
  let buffer = 0;
  let output = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(buffer << (5 - bits)) & 31];
  return output;
};

export const base32Decode = (value: string): Uint8Array => {
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/[\s-]/g, "");
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const digit = BASE32.indexOf(character);
    if (digit < 0) throw new Error("invalid_base32");
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
};

const encryptionKey = async (secret: string): Promise<CryptoKey> => {
  if (secret.length < 32) throw new Error("mfa_encryption_key_too_short");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptTotpSecret = async (secret: Uint8Array, encryptionSecret: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ownedBytes(iv) },
    await encryptionKey(encryptionSecret),
    ownedBytes(secret),
  );
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(ciphertext)}`;
};

export const decryptTotpSecret = async (ciphertext: string, encryptionSecret: string): Promise<Uint8Array> => {
  const [version, ivValue, encryptedValue] = ciphertext.split(".");
  if (version !== "v1" || !ivValue || !encryptedValue) throw new Error("invalid_totp_ciphertext");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ownedBytes(base64UrlDecode(ivValue)) },
    await encryptionKey(encryptionSecret),
    ownedBytes(base64UrlDecode(encryptedValue)),
  );
  return new Uint8Array(decrypted);
};

export const generateTotpSecret = (): Uint8Array => crypto.getRandomValues(new Uint8Array(20));

export const totpAt = async (
  secret: Uint8Array,
  timestampMs = Date.now(),
  digits = 6,
  periodSeconds = 30,
): Promise<string> => {
  const counter = Math.floor(timestampMs / 1000 / periodSeconds);
  const message = new Uint8Array(8);
  let remaining = counter;
  for (let index = 7; index >= 0; index -= 1) {
    message[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  const key = await crypto.subtle.importKey("raw", ownedBytes(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
};

export const verifyTotp = async (secret: Uint8Array, code: string, timestampMs = Date.now()): Promise<boolean> => {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const candidates = await Promise.all([-1, 0, 1].map((offset) => totpAt(secret, timestampMs + offset * 30_000)));
  const matches = await Promise.all(candidates.map((candidate) => constantTimeEqual(candidate, normalized)));
  return matches.some(Boolean);
};

export const totpUri = (secret: Uint8Array, email: string): string => {
  const issuer = "Avyron";
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({ secret: base32Encode(secret), issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};
