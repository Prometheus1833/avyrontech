import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppBindings } from "./types";
import { randomHex, sha256 } from "./security";

type Ctx = Context<AppBindings>;
export const SESSION_COOKIE = "__Host-sid";
export const ROTATION_INTERVAL_MS = 15 * 60_000;
const GRACE_MS = 30_000;
export function sessionCookie(c: Ctx) {
  // A malformed preferred cookie must not silently fall back to a shadow cookie.
  const value = getCookie(c, SESSION_COOKIE) ?? getCookie(c, "sid");
  return value && value.length <= 512 ? value : null;
}
export function clearSessionCookie(c: Ctx) {
  for (const name of [SESSION_COOKIE, "sid"])
    deleteCookie(c, name, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    });
}
export function writeSessionCookie(c: Ctx, value: string, maxAge?: number) {
  setCookie(c, SESSION_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: c.env.APP_ENV === "production" ? "Lax" : "None",
    path: "/",
    ...(maxAge === undefined
      ? {}
      : { maxAge: Math.max(1, Math.floor(maxAge)) }),
  });
  if (getCookie(c, "sid") !== undefined)
    deleteCookie(c, "sid", {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    });
}
export type RefreshSession = {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  mfa_verified_at: number | null;
  last_seen_at: number;
  must_change_password: number;
  refresh_token_hash: string | null;
  previous_refresh_token_hash: string | null;
  previous_refresh_expires_at: number | null;
  refresh_rotated_at: number | null;
  legacy_refresh_expires_at: number | null;
};
export async function findRefreshSession(
  db: D1Database,
  secret: string,
  timestamp = Date.now(),
  legacyOnly = false,
): Promise<RefreshSession | null> {
  const hash = await sha256(secret);
  return db
    .prepare(
      `SELECT s.*,u.must_change_password FROM sessions s
    JOIN users u ON u.id=s.user_id AND u.disabled_at IS NULL
    WHERE s.revoked_at IS NULL AND s.expires_at>?
      AND (s.refresh_token_hash=? OR (s.previous_refresh_token_hash=? AND s.previous_refresh_expires_at>?)
        OR (s.refresh_token_hash IS NULL AND s.id=?))
      AND (?=0 OR s.refresh_token_hash IS NULL OR (s.previous_refresh_token_hash=? AND s.previous_refresh_expires_at>? AND s.legacy_refresh_expires_at>?)) LIMIT 1`,
    )
    .bind(
      timestamp,
      hash,
      hash,
      timestamp,
      hash,
      legacyOnly ? 1 : 0,
      hash,
      timestamp,
      timestamp,
    )
    .first<RefreshSession>();
}
export async function refreshSession(
  c: Ctx,
  secret: string,
  timestamp = Date.now(),
): Promise<RefreshSession | null> {
  const legacyOnly = getCookie(c, SESSION_COOKIE) === undefined;
  const row = await findRefreshSession(c.env.DB, secret, timestamp, legacyOnly);
  if (!row) return null;
  const hash = await sha256(secret);
  // A concurrent request using the previous secret may mint an access token,
  // but never writes its obsolete cookie over the winner's new secret.
  if (row.refresh_token_hash && row.refresh_token_hash !== hash) return row;
  if (
    row.refresh_rotated_at &&
    row.refresh_rotated_at > timestamp - ROTATION_INTERVAL_MS
  ) {
    if (!getCookie(c, SESSION_COOKIE)) writeSessionCookie(c, secret);
    return row;
  }
  const nextSecret = randomHex(32);
  const nextHash = await sha256(nextSecret);
  const result = await c.env.DB.prepare(
    `UPDATE sessions SET refresh_token_hash=?,previous_refresh_token_hash=?,
    previous_refresh_expires_at=?,refresh_rotated_at=?,
    legacy_refresh_expires_at=CASE WHEN refresh_token_hash IS NULL THEN ? ELSE legacy_refresh_expires_at END
    WHERE id=? AND revoked_at IS NULL
    AND expires_at>? AND refresh_token_hash IS ?`,
  )
    .bind(
      nextHash,
      hash,
      timestamp + GRACE_MS,
      timestamp,
      timestamp + GRACE_MS,
      row.id,
      timestamp,
      row.refresh_token_hash ?? null,
    )
    .run();
  if (result.meta.changes === 1) {
    // Keep a browser-session cookie non-persistent. Existing persistent cookies
    // retain persistence via the opt-in session metadata, not their opaque name.
    const persistent = row.expires_at - row.created_at > 12 * 60 * 60_000;
    writeSessionCookie(
      c,
      nextSecret,
      persistent ? (row.expires_at - timestamp) / 1000 : undefined,
    );
    return {
      ...row,
      refresh_token_hash: nextHash,
      previous_refresh_token_hash: hash,
      previous_refresh_expires_at: timestamp + GRACE_MS,
      refresh_rotated_at: timestamp,
      legacy_refresh_expires_at:
        row.refresh_token_hash === null
          ? timestamp + GRACE_MS
          : row.legacy_refresh_expires_at,
    };
  }
  return findRefreshSession(c.env.DB, secret, timestamp, legacyOnly);
}
