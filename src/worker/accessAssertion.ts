import { readTextUpTo } from "../../cloudflare/workers/api/src/metadata";
import {
  boundaryPolicy,
  type SecurityBoundaryEnv,
} from "../shared/securityBoundary";

export type AccessIdentity = {
  subject: string;
  email?: string;
  service?: string;
};
type SigningKey = JsonWebKey & { kid?: string; use?: string };
type KeySet = { keys: SigningKey[] };
const decoder = new TextDecoder();
const encoder = new TextEncoder();
function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_encoding");
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (x) => x.charCodeAt(0),
  );
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Validate the assertion, never a header containing an email or a raw service secret.
 * Static Assets routers and Service Bindings do not propagate ctx.access.
 * This path therefore always verifies signature, pinned issuer and application AUD. */
export async function verifyAccessAssertion(
  request: Request,
  env: SecurityBoundaryEnv,
  timestamp = Date.now(),
): Promise<AccessIdentity | null> {
  const policy = boundaryPolicy(env);
  if (!policy.configured) return null;
  const token = request.headers.get("cf-access-jwt-assertion") || "";
  if (token.length > 16_384) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header: unknown = JSON.parse(decoder.decode(decode(parts[0])));
    const claims: unknown = JSON.parse(decoder.decode(decode(parts[1])));
    if (
      !object(header) ||
      !object(claims) ||
      header.alg !== "RS256" ||
      header.crit !== undefined ||
      typeof header.kid !== "string" ||
      header.kid.length > 256
    )
      return null;
    const seconds = Math.floor(timestamp / 1000);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      claims.type !== "app" ||
      claims.iss !== policy.issuer ||
      !aud.includes(policy.audience) ||
      !Number.isSafeInteger(claims.exp) ||
      Number(claims.exp) <= seconds ||
      !Number.isSafeInteger(claims.iat) ||
      Number(claims.iat) > seconds + 30 ||
      Number(claims.iat) >= Number(claims.exp) ||
      (claims.nbf !== undefined &&
        (!Number.isSafeInteger(claims.nbf) ||
          Number(claims.nbf) > seconds + 30))
    )
      return null;
    const email =
      typeof claims.email === "string" && claims.email_verified !== false
        ? claims.email.trim().toLowerCase()
        : undefined;
    const service =
      typeof claims.common_name === "string" && !email && claims.sub === ""
        ? claims.common_name
        : undefined;
    const subject = service || claims.sub;
    if (
      (!email && !service) ||
      typeof subject !== "string" ||
      !subject ||
      subject.length > 256
    )
      return null;

    // Cache only a bounded public key set at a deployment-pinned URL. A supplied
    // jku/x5u/kid can never turn verification into an arbitrary outbound fetch.
    const cache =
      typeof caches === "undefined"
        ? null
        : await caches.open("avyron-access-jwks-v1");
    const keyRequest = new Request(policy.issuer + "/cdn-cgi/access/certs");
    let response = await cache?.match(keyRequest);
    const cached = !!response;
    if (!response)
      response = await fetch(keyRequest, {
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      });
    if (!response.ok) return null;
    const body = await readTextUpTo(response, 65536);
    const set: unknown = JSON.parse(body);
    if (!object(set) || !Array.isArray(set.keys) || set.keys.length > 16)
      return null;
    if (!cached && cache)
      await cache
        .put(
          keyRequest,
          new Response(body, {
            headers: { "Cache-Control": "public, max-age=300" },
          }),
        )
        .catch(() => {});
    const matching = (set as KeySet).keys.filter(
      (key) =>
        key.kty === "RSA" &&
        key.kid === header.kid &&
        (!key.alg || key.alg === "RS256") &&
        (!key.use || key.use === "sig"),
    );
    if (matching.length !== 1) return null; // Unknown keys fail closed until cache expiry.
    const key = await crypto.subtle.importKey(
      "jwk",
      matching[0],
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    if (
      !(await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        decode(parts[2]),
        encoder.encode(parts[0] + "." + parts[1]),
      ))
    )
      return null;
    return { subject, ...(email ? { email } : { service }) };
  } catch {
    return null;
  }
}
