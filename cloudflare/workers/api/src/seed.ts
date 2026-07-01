// One-shot idempotent seed for Avyron internal platform.
// Rulare:
//   curl -X POST https://<worker>/api/admin/seed -H "X-Seed-Token: $SEED_TOKEN"
//
// Gated:
//   • Header X-Seed-Token trebuie să corespundă cu env.SEED_TOKEN, SAU
//   • DB nu are niciun user cu rol admin (bootstrap).
//
// Idempotent: rulările ulterioare fac UPSERT după email (case-insensitive)
// și nu duplică nimic. Parolele NU sunt re-scrise dacă userul există.

import { Hono } from "hono";
import type { Env } from "./index";

const ITER = 210_000;
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, key, 256);
  return `${ITER}$${b64(salt.buffer)}$${b64(bits)}`;
}
const uuid = () => crypto.randomUUID();
const now = () => Date.now();

type SeedStaff = { email: string; password: string; displayName: string; pseudonym: string; role: "dev"|"designer"|"marketing"|"support"; admin?: boolean };
type SeedClient = { email: string; password: string; displayName: string; company: string };
type SeedProject = {
  clientEmail: string;
  name: string;
  slug: string;
  domain: string;
  url: string;
  bannerStatus: "online" | "in_progress" | "testing" | "revizuire" | "offline";
  legacyStatus: "live" | "in_progress" | "maintenance" | "lead" | "archived";
  description: string;
};

const STAFF: SeedStaff[] = [
  { email: "niko@avyron.ro",    password: "Avyronpass123@", displayName: "Niko",    pseudonym: "Niko",    role: "dev",       admin: true },
  { email: "andreea@avyron.ro", password: "Avyronpass123@", displayName: "Andreea", pseudonym: "Andreea", role: "designer" },
  { email: "adi@avyron.ro",     password: "Avyronpass123@", displayName: "Adi",     pseudonym: "Adi",     role: "dev" },
  { email: "alex@avyron.ro",    password: "Avyronpass123@", displayName: "Alex",    pseudonym: "Alex",    role: "marketing" },
  { email: "florin@avyron.ro",  password: "Avyronpass123@", displayName: "Florin",  pseudonym: "Florin",  role: "support" },
];

const CLIENTS: SeedClient[] = [
  { email: "clarlumanari@gmail.com",       password: "Clarlumanari123",       displayName: "Clar Lumânări",      company: "Clar Lumânări" },
  { email: "plaseieftineiasi@gmail.com",   password: "Plaseieftineiasi123",   displayName: "Plase Ieftine Iași", company: "Plase Ieftine Iași" },
  { email: "retuvocore@gmail.com",         password: "retuvo123@",            displayName: "Retuvo",             company: "Retuvo" },
];

const PROJECTS: SeedProject[] = [
  {
    clientEmail: "clarlumanari@gmail.com",
    name: "Clar Lumânări", slug: "clarlumanari", domain: "clarlumanari.ro", url: "https://clarlumanari.ro",
    bannerStatus: "online", legacyStatus: "live",
    description: "Website de prezentare pentru atelier de lumânări artizanale.",
  },
  {
    clientEmail: "plaseieftineiasi@gmail.com",
    name: "Plase Ieftine Iași", slug: "plaseieftineiasi", domain: "plaseieftineiasi.ro", url: "https://plaseieftineiasi.ro",
    bannerStatus: "online", legacyStatus: "live",
    description: "Website comercial pentru plase de țânțari — Iași.",
  },
  {
    clientEmail: "retuvocore@gmail.com",
    name: "Retuvo", slug: "retuvo", domain: "retuvo.ro", url: "https://retuvo.ro",
    bannerStatus: "in_progress", legacyStatus: "in_progress",
    description: "Platformă Retuvo — în dezvoltare.",
  },
];

export const seedRouter = new Hono<{ Bindings: Env }>();

seedRouter.post("/api/admin/seed", async (c) => {
  const headerToken = c.req.header("x-seed-token");
  const envToken = (c.env as any).SEED_TOKEN as string | undefined;

  // gate: fie token corect, fie DB fără admin (bootstrap)
  const adminExists = await c.env.DB
    .prepare("SELECT 1 FROM user_roles WHERE role = 'admin' LIMIT 1").first();
  if (adminExists && (!envToken || headerToken !== envToken)) {
    return c.json({ error: { code: "forbidden", message: "Seed already ran; set SEED_TOKEN header" } }, 403);
  }

  const report: Record<string, any> = { staff: [], clients: [], projects: [] };
  const t = now();

  const upsertUser = async (email: string, password: string, displayName: string, roles: string[]) => {
    const lower = email.toLowerCase();
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(lower).first<{ id: string }>();
    let id = existing?.id;
    let created = false;
    if (!id) {
      id = uuid();
      const hash = await hashPassword(password);
      await c.env.DB.prepare(
        "INSERT INTO users (id,email,password_hash,display_name,email_verified,created_at,updated_at) VALUES (?,?,?,?,1,?,?)"
      ).bind(id, lower, hash, displayName, t, t).run();
      created = true;
    }
    for (const r of roles) {
      await c.env.DB.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)").bind(id, r).run();
    }
    return { id, created };
  };

  const upsertProfile = async (userId: string, patch: Record<string, any>) => {
    const cols = Object.keys(patch);
    const existing = await c.env.DB.prepare("SELECT id FROM profiles WHERE id = ?").bind(userId).first();
    if (existing) {
      const sets = cols.map((k) => `${k} = ?`).join(", ");
      await c.env.DB.prepare(`UPDATE profiles SET ${sets}, updated_at = ? WHERE id = ?`)
        .bind(...cols.map((k) => patch[k]), t, userId).run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO profiles (id, ${cols.join(", ")}, updated_at) VALUES (?, ${cols.map(() => "?").join(", ")}, ?)`
      ).bind(userId, ...cols.map((k) => patch[k]), t).run();
    }
  };

  // ── STAFF ──
  for (const s of STAFF) {
    const roles = ["user", "staff", ...(s.admin ? ["admin"] : [])];
    const { id, created } = await upsertUser(s.email, s.password, s.displayName, roles);
    await upsertProfile(id, { display_name: s.displayName, pseudonym: s.pseudonym, staff_role: s.role, language: "ro", theme: "system", entity_type: "individual" });
    report.staff.push({ email: s.email, id, created, admin: !!s.admin });
  }

  // pick primary owner staff (first admin) to attach to projects
  const primary = (await c.env.DB.prepare(
    "SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role='admin' ORDER BY u.created_at ASC LIMIT 1"
  ).first<{ id: string }>())?.id!;

  // all staff ids for project_staff seeding
  const staffIds = (await c.env.DB.prepare(
    "SELECT DISTINCT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role IN ('staff','admin')"
  ).all<{ id: string }>()).results.map((r) => r.id);

  // ── CLIENTS ──
  for (const cli of CLIENTS) {
    const { id, created } = await upsertUser(cli.email, cli.password, cli.displayName, ["user"]);
    await upsertProfile(id, { display_name: cli.displayName, company_name: cli.company, language: "ro", theme: "system", entity_type: "srl" });

    // clients table entry
    const existingClient = await c.env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(cli.email.toLowerCase()).first<{ id: string }>();
    let clientRowId = existingClient?.id;
    if (!clientRowId) {
      clientRowId = uuid();
      await c.env.DB.prepare(
        "INSERT INTO clients (id, company_name, contact_name, email, status, created_at) VALUES (?,?,?,?,?,?)"
      ).bind(clientRowId, cli.company, cli.displayName, cli.email.toLowerCase(), "active", t).run();
    }
    report.clients.push({ email: cli.email, user_id: id, client_id: clientRowId, created });
  }

  // ── PROJECTS ──
  for (const pr of PROJECTS) {
    const owner = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(pr.clientEmail.toLowerCase()).first<{ id: string }>();
    const clientRow = await c.env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(pr.clientEmail.toLowerCase()).first<{ id: string }>();
    if (!owner || !clientRow) continue;

    const existing = await c.env.DB.prepare("SELECT id FROM projects WHERE slug = ?").bind(pr.slug).first<{ id: string }>();
    let pid = existing?.id;
    if (!pid) {
      pid = uuid();
      await c.env.DB.prepare(
        `INSERT INTO projects (id, client_id, name, slug, kind, description, url, domain, favicon_url,
           owner_user_id, banner_status, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        pid, clientRow.id, pr.name, pr.slug, "website_prezentare", pr.description,
        pr.url, pr.domain, `https://${pr.domain}/favicon.ico`,
        owner.id, pr.bannerStatus, pr.legacyStatus, t, t
      ).run();
    } else {
      await c.env.DB.prepare(
        `UPDATE projects SET name=?, kind=?, description=?, url=?, domain=?, owner_user_id=?, banner_status=?, status=?, updated_at=? WHERE id=?`
      ).bind(pr.name, "website_prezentare", pr.description, pr.url, pr.domain, owner.id, pr.bannerStatus, pr.legacyStatus, t, pid).run();
    }
    // attach all staff
    for (const sid of staffIds) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO project_staff (project_id, user_id, role, assigned_at) VALUES (?,?,?,?)"
      ).bind(pid, sid, sid === primary ? "owner" : "contributor", t).run();
    }
    report.projects.push({ slug: pr.slug, id: pid, owner: pr.clientEmail });
  }

  return c.json({ ok: true, report });
});
