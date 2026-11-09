import type { Env } from "./types";
import { boundaryPolicy } from "../../../../src/shared/securityBoundary";

export const allowedOrigin = (env: Env, origin: string | undefined): string => {
  const configured = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const boundary = boundaryPolicy(env);
  if (boundary.mode !== "off" && boundary.configured) configured.push(`https://${boundary.hostname}`);
  if (!origin) return configured[0] || "";
  return configured.includes(origin) ? origin : "";
};
