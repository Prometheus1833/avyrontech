import { signJwt, verifyJwt } from "./security";
import type { Env } from "./types";
type SessionClaims = { sub: string; sid: string; iat?: number };
const currentKey = (env: Env) => {
  if (
    env.SESSION_JWT_SECRET !== undefined &&
    env.SESSION_JWT_SECRET.length < 32
  )
    throw new Error("session_signing_key_invalid");
  return env.SESSION_JWT_SECRET ?? env.JWT_SECRET;
};
export function signSessionJwt(
  payload: { sub: string; sid: string },
  env: Env,
) {
  return signJwt(payload, currentKey(env), 900);
}
/** Rotate authentication signing keys independently of newsletter/link tokens.
 * The previous key is usable only during an explicit <=15 minute window. */
export async function verifySessionJwt(
  token: string,
  env: Env,
  timestamp = Date.now(),
): Promise<SessionClaims | null> {
  try {
    const result = await verifyJwt<SessionClaims>(token, currentKey(env));
    if (result) return result;
    const started = Number(env.SESSION_JWT_ROTATED_AT);
    const until = Number(env.SESSION_JWT_PREVIOUS_VALID_UNTIL);
    if (
      !env.SESSION_JWT_PREVIOUS_SECRET ||
      env.SESSION_JWT_PREVIOUS_SECRET.length < 32 ||
      !Number.isSafeInteger(started) ||
      !Number.isSafeInteger(until) ||
      started > timestamp ||
      until <= timestamp ||
      until <= started ||
      until - started > 900_000
    )
      return null;
    const previous = await verifyJwt<SessionClaims>(
      token,
      env.SESSION_JWT_PREVIOUS_SECRET,
    );
    return previous && Number(previous.iat) <= Math.floor(started / 1000)
      ? previous
      : null;
  } catch {
    return null;
  }
}
