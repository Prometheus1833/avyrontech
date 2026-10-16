import type { Env } from "./types";

export const featureEnabled = (value: string | undefined, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return value.trim().toLowerCase() === "true";
};

export const mfaAuthEnabled = (env: Env) => featureEnabled(env.MFA_AUTH_ENABLED, false);
export const turnstileAuthEnabled = (env: Env) => featureEnabled(env.TURNSTILE_AUTH_ENABLED, false);

export const forcedPasswordAllowedPath = (path: string) => [
  "/api/auth/me",
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/refresh",
].includes(path);

export const normalizeUsername = (value: unknown): string | null => {
  const username = String(value || "").trim().toLowerCase();
  return /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/.test(username) ? username : null;
};

/** Canonical contact number for staff login; profile ownership is checked separately. */
export const normalizeLoginPhone = (value: unknown): string | null => {
  const raw = String(value || "").trim();
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = `40${digits.slice(1)}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

export const uniqueStaffPhoneMatch = <T extends { phone: string }>(candidates: T[], identifier: string): T | null => {
  const phone = normalizeLoginPhone(identifier);
  if (!phone) return null;
  const matches = candidates.filter((candidate) => normalizeLoginPhone(candidate.phone) === phone);
  return matches.length === 1 ? matches[0] : null;
};
