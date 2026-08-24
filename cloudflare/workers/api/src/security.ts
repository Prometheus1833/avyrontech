import { pbkdf2Sync, scryptSync, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

const LEGACY_MAX_ITERATIONS = 100_000;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const encoder = new TextEncoder();

const base64 = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let value = "";
  for (let i = 0; i < view.length; i += 0x8000) {
    value += String.fromCharCode(...view.subarray(i, i + 0x8000));
  }
  return btoa(value);
};

const base64Url = (bytes: ArrayBuffer | Uint8Array) =>
  base64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const decodeBase64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

export const now = () => Date.now();
export const randomHex = (bytes = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function sha256(value: string): Promise<string> {
  return base64Url(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = scryptSync(password, salt, 32, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${base64(salt)}$${base64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts[0] === "scrypt") {
    const [, nValue, rValue, pValue, saltValue, expectedValue] = parts;
    const N = Number(nValue);
    const r = Number(rValue);
    const p = Number(pValue);
    if (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P || !saltValue || !expectedValue) return false;
    try {
      const salt = decodeBase64(saltValue);
      const expected = decodeBase64(expectedValue);
      const actual = scryptSync(password, salt, expected.byteLength, { N, r, p, maxmem: SCRYPT_MAX_MEMORY });
      return actual.byteLength === expected.byteLength && nodeTimingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // Compatibility with the original numeric PBKDF2 format. Cloudflare's
  // runtime rejects counts above 100k, so such accounts must use reset/import.
  const [iterationsValue, saltValue, expectedValue] = stored.split("$");
  const iterations = Number(iterationsValue);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > LEGACY_MAX_ITERATIONS || !saltValue || !expectedValue) return false;
  try {
    const salt = decodeBase64(saltValue);
    const expected = decodeBase64(expectedValue);
    const actual = pbkdf2Sync(password, salt, iterations, expected.byteLength, "sha256");
    return actual.byteLength === expected.byteLength && nodeTimingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function signJwt(payload: object, secret: string, ttlSeconds = 900): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64Url(encoder.encode(JSON.stringify({ ...payload, iat: timestamp, exp: timestamp + ttlSeconds })));
  const unsigned = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${unsigned}.${base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(unsigned)))}`;
}

export async function verifyJwt<T>(token: string, secret: string): Promise<T | null> {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decodeBase64(signature), encoder.encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64(body))) as T & { exp?: number };
    return payload.exp && payload.exp < Math.floor(Date.now() / 1000) ? null : payload;
  } catch {
    return null;
  }
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(left)), crypto.subtle.digest("SHA-256", encoder.encode(right))]);
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual?: (left: BufferSource, right: BufferSource) => boolean };
  if (subtle.timingSafeEqual) return subtle.timingSafeEqual(a, b);
  // Browser-compatible fallback used only by local tests; the production
  // Workers runtime exposes crypto.subtle.timingSafeEqual.
  const leftBytes = new Uint8Array(a), rightBytes = new Uint8Array(b);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
    difference |= (leftBytes[index % leftBytes.length] || 0) ^ (rightBytes[index % rightBytes.length] || 0);
  }
  return difference === 0;
}
