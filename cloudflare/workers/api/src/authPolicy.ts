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
