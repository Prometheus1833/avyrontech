import type { Env } from "./types";

export const allowedOrigin = (env: Env, origin: string | undefined): string => {
  const configured = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!origin) return configured[0] || "";
  return configured.includes(origin) ? origin : "";
};
