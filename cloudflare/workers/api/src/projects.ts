// Avyron API — Rute Platformă Internă pentru proiecte
// Import și mount în src/index.ts: `app.route("/", projectsRouter);`
//
// Toate rutele necesită auth. Accesul la un proiect e permis dacă:
//   - user e admin, SAU
//   - user e staff: poate vedea toate proiectele; poate edita doar dacă este
//     alocat în project_staff (adminul poate edita orice), SAU
//   - user.id === projects.owner_user_id (clientul admin)

import { Hono } from "hono";
import type { Env } from "./types";
import { fetchMetadataHtml, validateMetadataUrl } from "./metadata";

type Role = "user" | "staff" | "admin";
type Vars = { userId: string; roles: Role[] };

const uuid = () => crypto.randomUUID();
const now = () => Date.now();

async function canAccessProject(db: D1Database, projectId: string, userId: string, roles: Role[]): Promise<{ read: boolean; write: boolean; isStaff: boolean; isOwner: boolean }> {
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff") || isAdmin;
  const proj = await db.prepare("SELECT owner_user_id FROM projects WHERE id = ?").bind(projectId).first<{ owner_user_id: string | null }>();
  if (!proj) return { read: false, write: false, isStaff: false, isOwner: false };
  const isOwner = proj.owner_user_id === userId;
  if (isAdmin) return { read: true, write: true, isStaff: true, isOwner };
  if (isStaff) {
    const assigned = await db.prepare("SELECT 1 FROM project_staff WHERE project_id = ? AND user_id = ?").bind(projectId, userId).first();
    if (assigned) return { read: true, write: true, isStaff: true, isOwner };
    return { read: true, write: false, isStaff: true, isOwner };
  }
  if (isOwner) return { read: true, write: false, isStaff: false, isOwner: true };
  return { read: false, write: false, isStaff, isOwner: false };
}

async function log(db: D1Database, projectId: string, actorId: string, action: string, targetType?: string, targetId?: string, meta?: unknown) {
  await db.prepare(
    "INSERT INTO project_logs (id, project_id, actor_id, action, target_type, target_id, meta_json, created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(uuid(), projectId, actorId, action, targetType ?? null, targetId ?? null, meta ? JSON.stringify(meta) : null, now()).run();
}

// Auth middleware trebuie deja aplicat pe app-ul principal — asigură-te că "userId"/"roles" există în Vars.
export const projectsRouter = new Hono<{ Bindings: Env; Variables: Vars }>();

// ─── LISTĂ ────────────────────────────────────────────────────────────────
projectsRouter.get("/api/projects", async (c) => {
  const userId = c.get("userId");
  const roles = c.get("roles");
  const isStaff = roles.includes("staff") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  let rows;
  if (isAdmin || isStaff) {
    rows = await c.env.DB.prepare(
      "SELECT id, slug, name, kind, banner_status, url, favicon_url, updated_at FROM projects ORDER BY updated_at DESC LIMIT 200"
    ).all();
  } else {
    rows = await c.env.DB.prepare(
      "SELECT id, slug, name, kind, banner_status, url, favicon_url, updated_at FROM projects WHERE owner_user_id = ? ORDER BY updated_at DESC"
    ).bind(userId).all();
  }
  return c.json({ data: rows.results });
});

// ─── CREARE (staff only — via floating button "Creează proiect") ─────────
projectsRouter.post("/api/projects", async (c) => {
  const roles = c.get("roles");
  if (!roles.includes("staff") && !roles.includes("admin")) return c.json({ error: { code: "forbidden" } }, 403);
  const userId = c.get("userId");
  const b = (await c.req.json().catch(() => ({}))) as {
    name?: string; slug?: string; kind?: string; url?: string; description?: string;
    client_id?: string; owner_user_id?: string;
  };
  if (!b.name || !b.slug || !b.client_id) return c.json({ error: { code: "invalid_input", message: "name, slug, client_id required" } }, 400);
  const id = uuid();
  const t = now();
  try {
    await c.env.DB.prepare(
      `INSERT INTO projects (id, client_id, name, slug, kind, url, description, owner_user_id, banner_status, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, b.client_id, b.name, b.slug, b.kind ?? "website_prezentare", b.url ?? null, b.description ?? null, b.owner_user_id ?? null, "in_progress", "in_progress", t, t).run();
    await c.env.DB.prepare("INSERT INTO project_staff (project_id, user_id, role, assigned_at) VALUES (?,?,?,?)")
      .bind(id, userId, "owner", t).run();
    await log(c.env.DB, id, userId, "project.create");
    return c.json({ id, slug: b.slug }, 201);
  } catch (e) {
    return c.json({ error: { code: "create_failed", message: String((e as Error).message) } }, 400);
  }
});

// ─── DETALIU (după slug) ──────────────────────────────────────────────────
projectsRouter.get("/api/projects/:slug", async (c) => {
  const slug = c.req.param("slug");
  const proj = await c.env.DB.prepare(
    "SELECT id,client_id,name,domain,status,created_at,slug,kind,description,owner_user_id,banner_status,url,favicon_url,og_title,og_description,og_image_url,cover_image_url,price_ron,price_eur,subscription_plan,subscription_status,billing_next,updated_at FROM projects WHERE slug = ?",
  ).bind(slug).first<Record<string, unknown> & { id: string }>();
  if (!proj) return c.json({ error: { code: "not_found" } }, 404);
  const perm = await canAccessProject(c.env.DB, proj.id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);

  const [links, proposals, updates, staff] = await Promise.all([
    c.env.DB.prepare("SELECT id,project_id,kind,label,url,updated_by,updated_at FROM project_links WHERE project_id = ? ORDER BY updated_at DESC").bind(proj.id).all(),
    c.env.DB.prepare("SELECT id,project_id,author_id,title,description,status,created_at,updated_at FROM project_proposals WHERE project_id = ? ORDER BY created_at DESC LIMIT 100").bind(proj.id).all(),
    c.env.DB.prepare("SELECT id,project_id,author_id,proposal_id,title,body,created_at FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 20").bind(proj.id).all(),
    c.env.DB.prepare(
      `SELECT ps.user_id, ps.role, u.email, p.display_name, p.avatar_url
       FROM project_staff ps JOIN users u ON u.id = ps.user_id
       LEFT JOIN profiles p ON p.id = ps.user_id WHERE ps.project_id = ?`
    ).bind(proj.id).all(),
  ]);
  return c.json({ project: proj, links: links.results, proposals: proposals.results, updates: updates.results, staff: staff.results, permission: perm });
});

// ─── UPDATE proiect (staff/admin doar) ────────────────────────────────────
projectsRouter.patch("/api/projects/:id", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = ["name", "kind", "description", "banner_status", "url", "favicon_url", "og_title", "og_description", "og_image_url", "cover_image_url", "price_ron", "price_eur", "subscription_plan", "subscription_status", "billing_next", "owner_user_id"];
  const sets: string[] = [], vals: Array<string | number | null> = [];
  for (const k of allowed) {
    if (!(k in b)) continue;
    const value = b[k];
    if (value !== null && typeof value !== "string" && typeof value !== "number") {
      return c.json({ error: { code: "invalid_input", field: k } }, 400);
    }
    sets.push(`${k} = ?`);
    vals.push(value as string | number);
  }
  if (!sets.length) return c.json({ ok: true });
  sets.push("updated_at = ?"); vals.push(now()); vals.push(id);
  await c.env.DB.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  await log(c.env.DB, id, c.get("userId"), "project.update", "project", id, b);
  return c.json({ ok: true });
});

// ─── PROPUNERI ────────────────────────────────────────────────────────────
projectsRouter.post("/api/projects/:id/proposals", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as { title?: string; description?: string };
  if (!b.title) return c.json({ error: { code: "invalid_input" } }, 400);
  const pid = uuid();
  const t = now();
  await c.env.DB.prepare(
    "INSERT INTO project_proposals (id, project_id, author_id, title, description, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(pid, id, c.get("userId"), b.title, b.description ?? null, "proposed", t, t).run();
  await log(c.env.DB, id, c.get("userId"), "proposal.create", "proposal", pid);
  return c.json({ id: pid }, 201);
});

projectsRouter.patch("/api/proposals/:id", async (c) => {
  const pid = c.req.param("id");
  const prop = await c.env.DB.prepare("SELECT project_id FROM project_proposals WHERE id = ?").bind(pid).first<{ project_id: string }>();
  if (!prop) return c.json({ error: { code: "not_found" } }, 404);
  const perm = await canAccessProject(c.env.DB, prop.project_id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden", message: "Doar staff-ul poate schimba starea propunerilor" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as { status?: string; title?: string; description?: string };
  const allowed = ["status", "title", "description"];
  const sets: string[] = [], vals: Array<string | number | null> = [];
  for (const k of allowed) {
    if (!(k in b)) continue;
    const value = b[k as keyof typeof b];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return c.json({ error: { code: "invalid_input", field: k } }, 400);
    }
    sets.push(`${k} = ?`);
    vals.push(value ?? null);
  }
  if (!sets.length) return c.json({ ok: true });
  sets.push("updated_at = ?"); vals.push(now()); vals.push(pid);
  await c.env.DB.prepare(`UPDATE project_proposals SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  await log(c.env.DB, prop.project_id, c.get("userId"), "proposal.update", "proposal", pid, b);
  return c.json({ ok: true });
});

// ─── LINKS (Cloudflare / GSC / GBP / social) ─────────────────────────────
projectsRouter.post("/api/projects/:id/links", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);
  const b = (await c.req.json().catch(() => ({}))) as { kind?: string; label?: string; url?: string; id?: string };
  if (!b.kind || !b.label || !b.url) return c.json({ error: { code: "invalid_input" } }, 400);
  const linkId = b.id ?? uuid();
  const t = now();
  await c.env.DB.prepare(
    `INSERT INTO project_links (id, project_id, kind, label, url, updated_by, updated_at) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, label=excluded.label, url=excluded.url, updated_by=excluded.updated_by, updated_at=excluded.updated_at`
  ).bind(linkId, id, b.kind, b.label, b.url, c.get("userId"), t).run();
  await log(c.env.DB, id, c.get("userId"), "link.upsert", "link", linkId, b);
  return c.json({ id: linkId });
});

projectsRouter.delete("/api/links/:id", async (c) => {
  const linkId = c.req.param("id");
  const link = await c.env.DB.prepare("SELECT project_id FROM project_links WHERE id = ?").bind(linkId).first<{ project_id: string }>();
  if (!link) return c.json({ ok: true });
  const perm = await canAccessProject(c.env.DB, link.project_id, c.get("userId"), c.get("roles"));
  if (!perm.write) return c.json({ error: { code: "forbidden" } }, 403);
  await c.env.DB.prepare("DELETE FROM project_links WHERE id = ?").bind(linkId).run();
  await log(c.env.DB, link.project_id, c.get("userId"), "link.delete", "link", linkId);
  return c.json({ ok: true });
});

// ─── LOGS (audit trail — read only) ──────────────────────────────────────
projectsRouter.get("/api/projects/:id/logs", async (c) => {
  const id = c.req.param("id");
  const perm = await canAccessProject(c.env.DB, id, c.get("userId"), c.get("roles"));
  if (!perm.read) return c.json({ error: { code: "forbidden" } }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, p.display_name as actor_name FROM project_logs l
     LEFT JOIN profiles p ON p.id = l.actor_id
     WHERE l.project_id = ? ORDER BY l.created_at DESC LIMIT 100`
  ).bind(id).all();
  return c.json({ data: results });
});

// ─── METADATA extract (favicon + OG) ─────────────────────────────────────
projectsRouter.get("/api/metadata/extract", async (c) => {
  const requestedUrl = c.req.query("url");
  let target: URL;
  try {
    target = validateMetadataUrl(requestedUrl || "");
  } catch {
    return c.json({ error: { code: "invalid_url" } }, 400);
  }
  try {
    const { html, url } = await fetchMetadataHtml(target);
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    const abs = (value?: string) => (value ? new URL(value, url).toString() : undefined);
    const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ?? pick(/<title[^>]*>([^<]+)<\/title>/i);
    const description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ?? pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const image = abs(pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i));
    const iconRel = pick(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
    const favicon = abs(iconRel) ?? `${url.origin}/favicon.ico`;
    return c.json({ url: url.toString(), title, description, image, favicon });
  } catch (e) {
    console.warn(JSON.stringify({ event: "metadata_fetch_failed", url: target.origin, error: String((e as Error).message) }));
    return c.json({ error: { code: "fetch_failed", message: "Nu am putut prelua metadata în siguranță" } }, 502);
  }
});
