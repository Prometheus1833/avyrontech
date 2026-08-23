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
};

export const seedRouter = new Hono<{ Bindings: Env }>();

seedRouter.post("/api/admin/import-users", async (c) => {
  const supplied = c.req.header("x-seed-token") || "";
  if (!c.env.SEED_TOKEN || !(await constantTimeEqual(supplied, c.env.SEED_TOKEN)))
    return c.json({ error: { code: "forbidden" } }, 403);

  const body = await c.req.json().catch(() => ({})) as { users?: ImportUser[] };
  if (!Array.isArray(body.users) || body.users.length < 1 || body.users.length > 100)
    return c.json({ error: { code: "invalid_batch", message: "Trimite între 1 și 100 de conturi" } }, 400);

  const report: Array<{ email: string; status: "created" | "exists" | "invalid" }> = [];
  for (const item of body.users) {
    const email = String(item.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || String(item.temporaryPassword || "").length < 10) {
      report.push({ email, status: "invalid" });
      continue;
    }
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
    if (existing) {
      report.push({ email, status: "exists" });
      continue;
    }

    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const roles = Array.from(new Set<Role>(["user", ...(item.roles || []).filter((role): role is Role => ["user", "staff", "admin"].includes(role))]));
    const profile = item.profile || {};
    const entityType = ["individual", "srl", "pfa", "ii", "other"].includes(profile.entityType || "") ? profile.entityType : "individual";
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO users (id,email,password_hash,display_name,email_verified,must_change_password,created_at,updated_at) VALUES (?,?,?,?,1,1,?,?)")
        .bind(id, email, await hashPassword(item.temporaryPassword), String(item.displayName || "").slice(0, 100) || null, timestamp, timestamp),
      c.env.DB.prepare("INSERT INTO profiles (id,display_name,entity_type,company_name,pseudonym,staff_role,language,theme,updated_at) VALUES (?,?,?,?,?,?, 'ro','system',?)")
        .bind(id, String(item.displayName || "").slice(0, 100) || null, entityType, String(profile.companyName || "").slice(0, 160) || null, String(profile.pseudonym || "").slice(0, 80) || null, profile.staffRole || null, timestamp),
      ...roles.map((role) => c.env.DB.prepare("INSERT INTO user_roles (user_id,role) VALUES (?,?)").bind(id, role)),
      c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
        .bind(id, "account_import", JSON.stringify({ roles }), timestamp),
    ]);
    report.push({ email, status: "created" });
  }
  return c.json({ ok: true, report }, 201);
});
