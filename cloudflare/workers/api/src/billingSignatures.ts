const encoder = new TextEncoder();

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

export async function stripeSignatureValid(secret: string, header: string, payload: string, now = Date.now()): Promise<boolean> {
  const pairs = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = pairs.find(([key]) => key === "t")?.[1] ?? "";
  const signatures = pairs.filter(([key]) => key === "v1").map(([, value]) => value);
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > 300 || signatures.length === 0) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => timingSafeEqual(expected, signature));
}

export async function revolutSignatureValid(secret: string, timestamp: string, header: string, payload: string, now = Date.now()): Promise<boolean> {
  const rawTimestamp = Number(timestamp);
  const milliseconds = rawTimestamp < 10_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
  if (!Number.isFinite(milliseconds) || Math.abs(now - milliseconds) > 300_000) return false;
  const expected = await hmacHex(secret, `v1.${timestamp}.${payload}`);
  const signatures = header.split(",").map((part) => part.trim()).filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  return signatures.some((signature) => timingSafeEqual(expected, signature));
}
