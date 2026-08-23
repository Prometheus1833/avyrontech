// R2 media routes — attach images/documents to proposals or project itself.
// Storage layout in R2 bucket FILES:
//   projects/<projectId>/<mediaId>-<safeFilename>
//
// Endpoints (all require auth; access via canAccessProject):
//   POST   /api/projects/:id/media                 body = raw file bytes
//                                                   query: proposal_id? & filename & content_type
//   GET    /api/projects/:id/media                 list media for a project
//   GET    /api/media/:mediaId/file                serve file bytes (streamed from R2)
//   DELETE /api/media/:mediaId

import { Hono } from "hono";
import type { Env } from "./types";

type Role = "user" | "staff" | "admin";
type Vars = { userId: string; roles: Role[] };
const uuid = () => crypto.randomUUID();
const now = () => Date.now();

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_CT = /^(image\/(png|jpeg|jpg|webp|gif|svg\+xml)|application\/pdf|text\/plain)$/i;

async function canAccessProject(db: D1Database, projectId: string, userId: string, roles: Role[]) {
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff") || isAdmin;
  const proj = await db.prepare("SELECT owner_user_id FROM projects WHERE id = ?").bind(projectId).first<{ owner_user_id: string | null }>();
  if (!proj) return { read: false, write: false };
  const isOwner = proj.owner_user_id === userId;
  if (isAdmin) return { read: true, write: true };
  if (isStaff) {
    const a = await db.prepare("SELECT 1 FROM project_staff WHERE project_id = ? AND user_id = ?").bind(projectId, userId).first();
    if (a) return { read: true, write: true };
  }
  // owner (client) poate CITI + UPLOAD la propriile propuneri
  if (isOwner) return { read: true, write: true };
  return { read: false, write: false };
}

export const mediaRouter = new Hono<{ Bindings: Env; Variables: Vars }>();

// ─── UPLOAD ──────────────────────────────────────────────────────────────
mediaRouter.post("/api/projects/:id/media", async (c) => {
  const projectId = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, projectId, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);

  const filename = (c.req.query("filename") || "file").replace(/[^\w.-]/g, "_").slice(0, 120);
  const contentType = c.req.header("content-type") || c.req.query("content_type") || "application/octet-stream";
  if (!ALLOWED_CT.test(contentType)) return c.json({ error: { code: "unsupported_type", message: contentType } }, 415);

  const proposalId = c.req.query("proposal_id") || null;
  if (proposalId) {
    const ok = await c.env.DB.prepare("SELECT 1 FROM project_proposals WHERE id = ? AND project_id = ?").bind(proposalId, projectId).first();
    if (!ok) return c.json({ error: { code: "invalid_proposal" } }, 400);
  }

  const body = c.req.raw.body;
  if (!body) return c.json({ error: { code: "no_body" } }, 400);
  const lenHeader = parseInt(c.req.header("content-length") || "0");
  if (lenHeader && lenHeader > MAX_BYTES) return c.json({ error: { code: "too_large", message: "Max 15MB" } }, 413);

  const mediaId = uuid();
  const r2Key = `projects/${projectId}/${mediaId}-${filename}`;
  const put = await c.env.FILES.put(r2Key, body, { httpMetadata: { contentType } });
  const size = put?.size ?? lenHeader ?? null;

  await c.env.DB.prepare(
    "INSERT INTO project_media (id, project_id, proposal_id, uploader_id, r2_key, filename, content_type, size_bytes, created_at) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(mediaId, projectId, proposalId, c.get("userId"), r2Key, filename, contentType, size, now()).run();

  return c.json({ id: mediaId, r2_key: r2Key, filename, content_type: contentType, size_bytes: size, proposal_id: proposalId, url: `/api/media/${mediaId}/file` }, 201);
});

// ─── LIST ────────────────────────────────────────────────────────────────
mediaRouter.get("/api/projects/:id/media", async (c) => {
  const projectId = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, projectId, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const { results } = await c.env.DB.prepare(
    "SELECT id, project_id, proposal_id, uploader_id, filename, content_type, size_bytes, created_at FROM project_media WHERE project_id = ? ORDER BY created_at DESC"
  ).bind(projectId).all<{
    id: string;
    project_id: string;
    proposal_id: string | null;
    uploader_id: string;
    filename: string;
    content_type: string;
    size_bytes: number | null;
    created_at: number;
  }>();
  return c.json({ data: results.map((row) => ({ ...row, url: `/api/media/${row.id}/file` })) });
});

// ─── SERVE (streaming) ───────────────────────────────────────────────────
mediaRouter.get("/api/media/:mediaId/file", async (c) => {
  const mediaId = c.req.param("mediaId");
  const row = await c.env.DB.prepare("SELECT project_id, r2_key, content_type, filename FROM project_media WHERE id = ?")
    .bind(mediaId).first<{ project_id: string; r2_key: string; content_type: string; filename: string }>();
  if (!row) return c.json({ error: { code: "not_found" } }, 404);
  const perm = await canAccessProject(c.env.DB, row.project_id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const obj = await c.env.FILES.get(row.r2_key);
  if (!obj) return c.json({ error: { code: "missing_blob" } }, 404);
  return new Response(obj.body, {
    headers: {
      "content-type": row.content_type || "application/octet-stream",
      "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename="${row.filename}"`,
    },
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────
mediaRouter.delete("/api/media/:mediaId", async (c) => {
  const mediaId = c.req.param("mediaId");
  const row = await c.env.DB.prepare("SELECT project_id, r2_key, uploader_id FROM project_media WHERE id = ?").bind(mediaId).first<{ project_id: string; r2_key: string; uploader_id: string }>();
  if (!row) return c.json({ ok: true });
  const perm = await canAccessProject(c.env.DB, row.project_id, c.get("userId"), c.get("roles"));
  const isUploader = row.uploader_id === c.get("userId");
  if (!perm.write && !isUploader) return c.json({ error: { code: "forbidden" } }, 403);
  await c.env.FILES.delete(row.r2_key).catch(() => {});
  await c.env.DB.prepare("DELETE FROM project_media WHERE id = ?").bind(mediaId).run();
  return c.json({ ok: true });
});
