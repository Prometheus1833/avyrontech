import { pbkdf2, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

const ITERATIONS = 210_000;
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

const derivePassword = (password: string, salt: Uint8Array, iterations: number, length = 32) =>
  new Promise<Uint8Array>((resolve, reject) => {
    pbkdf2(password, salt, iterations, length, "sha256", (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, ITERATIONS);
  return `${ITERATIONS}$${base64(salt)}$${base64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterationsValue, saltValue, expectedValue] = stored.split("$");
  const iterations = Number(iterationsValue);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || !saltValue || !expectedValue) return false;
  try {
    const salt = decodeBase64(saltValue);
    const expected = decodeBase64(expectedValue);
    const actual = await derivePassword(password, salt, iterations, expected.byteLength);
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
  return crypto.subtle.timingSafeEqual(a, b);
}
