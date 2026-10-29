import { bodyLimit } from "hono/body-limit";
import type { Context, Next } from "hono";
import type { AppBindings } from "./types";

export const apiBodyLimitBytes = (path: string): number => {
  if (path === "/api/contact/demo") return 21 * 1024 * 1024;
  if (/^\/api\/projects\/[^/]+\/media$/.test(path)) return 16 * 1024 * 1024;
  if (path === "/api/surveys/files" || /^\/api\/engine\/sources\/[^/]+\/documents$/.test(path) || path === "/api/finance/documents") return 11 * 1024 * 1024;
  if (path === "/api/profile/avatar" || path === "/api/blog/staff/media") return 6 * 1024 * 1024;
  return 1024 * 1024;
};

/** Verify actual streamed bytes before any route parses JSON, multipart, or webhook text. */
export const enforceApiBodyLimit = async (c: Context<AppBindings>, next: Next) => {
  if (!c.req.raw.body) return next();
  const maxSize = apiBodyLimitBytes(c.req.path);
  const advertised = Number(c.req.raw.headers.get("content-length"));
  if (Number.isFinite(advertised) && advertised > maxSize) return c.json({ error: { code: "payload_too_large" } }, 413);
  // Hono's bodyLimit trusts Content-Length when present. Remove it from the
  // internal request so the middleware counts even a mismatched stream.
  const headers = new Headers(c.req.raw.headers);
  headers.delete("content-length");
  c.req.raw = new Request(c.req.raw, { headers });
  return bodyLimit({
    maxSize,
    onError: (ctx) => ctx.json({ error: { code: "payload_too_large" } }, 413),
  })(c, next);
};
