// Controlled account importer. No identities or temporary passwords live in source control.
import { Hono } from "hono";
import type { Env, Role } from "./types";
import { constantTimeEqual, hashPassword } from "./security";

type ImportUser = {
  email: string;
  temporaryPassword: string;
  displayName?: string;
  roles?: Role[];
  profile?: {
    entityType?: "individual" | "srl" | "pfa" | "ii" | "other";
    companyName?: string;
    pseudonym?: string;
    staffRole?: "dev" | "designer" | "marketing" | "support";
  };
  client?: {
    companyName: string;
    contactName?: string;
    projects?: Array<{
      name: string;
      slug: string;
      kind?: "website_prezentare" | "prezentare_premium" | "magazin_online" | "retele_sociale" | "identitate_completa" | "aplicatie";
      url?: string;
      description?: string;
      status?: "lead" | "in_progress" | "live" | "maintenance" | "archived";
      bannerStatus?: "online" | "offline" | "revizuire" | "in_progress" | "testing";
    }>;
  };
};

type ImportStatus = "created" | "exists" | "invalid";
type ImportReport = {
  email: string;
  status: ImportStatus;
  client?: ImportStatus;
  projects?: Array<{ slug: string; status: ImportStatus }>;
};

export const seedRouter = new Hono<{ Bindings: Env }>();

seedRouter.post("/api/admin/import-users", async (c) => {
  const supplied = c.req.header("x-seed-token") || "";
  if (!c.env.SEED_TOKEN || !(await constantTimeEqual(supplied, c.env.SEED_TOKEN)))
    return c.json({ error: { code: "forbidden" } }, 403);

  const body = await c.req.json().catch(() => ({})) as { users?: ImportUser[] };
  if (!Array.isArray(body.users) || body.users.length < 1 || body.users.length > 100)
    return c.json({ error: { code: "invalid_batch", message: "Trimite între 1 și 100 de conturi" } }, 400);

  const report: ImportReport[] = [];
  for (const item of body.users) {
    const email = String(item.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || String(item.temporaryPassword || "").length < 10) {
      report.push({ email, status: "invalid" });
      continue;
    }
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
    const id = existing?.id ?? crypto.randomUUID();
    const timestamp = Date.now();
    const roles = Array.from(new Set<Role>(["user", ...(item.roles || []).filter((role): role is Role => ["user", "staff", "admin"].includes(role))]));
    const profile = item.profile || {};
    const entityType = ["individual", "srl", "pfa", "ii", "other"].includes(profile.entityType || "") ? profile.entityType : "individual";
    if (!existing) {
      await c.env.DB.batch([
        c.env.DB.prepare("INSERT INTO users (id,email,password_hash,display_name,email_verified,must_change_password,created_at,updated_at) VALUES (?,?,?,?,1,1,?,?)")
          .bind(id, email, await hashPassword(item.temporaryPassword), String(item.displayName || "").slice(0, 100) || null, timestamp, timestamp),
        c.env.DB.prepare("INSERT INTO profiles (id,display_name,entity_type,company_name,pseudonym,staff_role,language,theme,updated_at) VALUES (?,?,?,?,?,?, 'ro','system',?)")
          .bind(id, String(item.displayName || "").slice(0, 100) || null, entityType, String(profile.companyName || "").slice(0, 160) || null, String(profile.pseudonym || "").slice(0, 80) || null, profile.staffRole || null, timestamp),
        ...roles.map((role) => c.env.DB.prepare("INSERT INTO user_roles (user_id,role) VALUES (?,?)").bind(id, role)),
        c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
          .bind(id, "account_import", JSON.stringify({ roles }), timestamp),
      ]);
    }

    const entry: ImportReport = { email, status: existing ? "exists" : "created" };
    const clientInput = item.client;
    if (clientInput) {
      const companyName = String(clientInput.companyName || "").trim().slice(0, 160);
      const projects = clientInput.projects ?? [];
      if (!companyName || !Array.isArray(projects) || projects.length > 20) {
        entry.client = "invalid";
        report.push(entry);
        continue;
      }

      const existingClient = await c.env.DB.prepare("SELECT id FROM clients WHERE lower(email) = ? ORDER BY created_at LIMIT 1")
        .bind(email).first<{ id: string }>();
      const clientId = existingClient?.id ?? crypto.randomUUID();
      if (!existingClient) {
        await c.env.DB.prepare(
          "INSERT INTO clients (id,company_name,contact_name,email,status,created_at) VALUES (?,?,?,?, 'active',?)",
        ).bind(clientId, companyName, String(clientInput.contactName || "").trim().slice(0, 120) || null, email, timestamp).run();
      }
      entry.client = existingClient ? "exists" : "created";
      entry.projects = [];

      for (const project of projects) {
        const name = String(project.name || "").trim().slice(0, 160);
        const slug = String(project.slug || "").trim().toLowerCase();
        if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          entry.projects.push({ slug, status: "invalid" });
          continue;
        }
        let projectUrl: URL | null = null;
        try {
          projectUrl = project.url ? new URL(project.url) : null;
          if (projectUrl && !["http:", "https:"].includes(projectUrl.protocol)) throw new Error("invalid protocol");
        } catch {
          entry.projects.push({ slug, status: "invalid" });
          continue;
        }
        const existingProject = await c.env.DB.prepare("SELECT id FROM projects WHERE slug = ?").bind(slug).first<{ id: string }>();
        if (existingProject) {
          entry.projects.push({ slug, status: "exists" });
          continue;
        }
        const projectStatus = ["lead", "in_progress", "live", "maintenance", "archived"].includes(project.status || "")
          ? project.status
          : "in_progress";
        const bannerStatus = ["online", "offline", "revizuire", "in_progress", "testing"].includes(project.bannerStatus || "")
          ? project.bannerStatus
          : "in_progress";
        const projectKind = ["website_prezentare", "prezentare_premium", "magazin_online", "retele_sociale", "identitate_completa", "aplicatie"].includes(project.kind || "")
          ? project.kind
          : "website_prezentare";
        await c.env.DB.prepare(
          `INSERT INTO projects
             (id,client_id,name,domain,status,created_at,slug,kind,description,owner_user_id,banner_status,url,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          crypto.randomUUID(), clientId, name, projectUrl?.hostname ?? null,
          projectStatus, timestamp, slug, projectKind,
          String(project.description || "").trim().slice(0, 2000) || null, id, bannerStatus,
          projectUrl?.toString() ?? null, timestamp,
        ).run();
        entry.projects.push({ slug, status: "created" });
      }
    }
    report.push(entry);
  }
  return c.json({ ok: true, report }, 201);
});
