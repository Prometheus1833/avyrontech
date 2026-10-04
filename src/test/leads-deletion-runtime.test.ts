// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leadsRouter } from "../../cloudflare/workers/api/src/leads";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe("lead deletion audit", () => {
  let db: SqliteDatabase;
  let app: Hono<AppBindings>;
  let env: Env;
  let actor = "owner";

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations").filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    }
    for (const [id, email, role] of [["owner", "prometheus@avyron.ro", "admin"], ["staff", "staff@example.test", "staff"]]) {
      db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)").run(id, email, "fixture");
      db.prepare("INSERT INTO user_roles(user_id,role) VALUES (?,?)").run(id, role);
    }
    db.prepare(`INSERT INTO leads(id,source,name,business,email,status,lifecycle_stage,delivery_status,created_at,updated_at)
      VALUES ('lead-1','manual','Ana','Atelier','ana@example.ro','new','new_lead','pending',1,1)`).run();
    env = { DB: { prepare: (sql: string) => new Statement(db, sql), batch: async (statements: Statement[]) => {
      db.exec("BEGIN");
      try { const results = await Promise.all(statements.map((statement) => statement.run())); db.exec("COMMIT"); return results; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    } } } as unknown as Env;
    app = new Hono<AppBindings>();
    app.use("*", async (c, next) => { c.set("userId", actor); c.set("roles", actor === "owner" ? ["admin"] : ["staff"]); c.set("requestId", "request-1"); await next(); });
    app.route("/", leadsRouter);
  });

  afterEach(() => db.close());

  const request = (path: string, init?: RequestInit) => app.request(`https://avyron.test${path}`, init, env);

  it("requires a bounded reason, removes the lead from active lists and keeps a superadmin log", async () => {
    expect((await request("/api/leads/lead-1", { method: "DELETE", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(400);
    const deletion = await request("/api/leads/lead-1", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ reasonCode: "duplicate", reasonDetail: "Aceeași solicitare a fost înregistrată de două ori." }) });
    expect(deletion.status).toBe(200);
    const active = await (await request("/api/leads")).json() as { data: Array<{ id: string }> };
    expect(active.data).toEqual([]);
    expect(db.prepare("SELECT deleted_by,deletion_reason_code,deletion_reason_detail FROM leads WHERE id='lead-1'").get()).toMatchObject({ deleted_by: "owner", deletion_reason_code: "duplicate", deletion_reason_detail: "Aceeași solicitare a fost înregistrată de două ori." });
    const event = db.prepare("SELECT action,target_id,metadata_json FROM security_events WHERE action='lead.delete'").get() as { action: string; target_id: string; metadata_json: string };
    expect(event).toMatchObject({ action: "lead.delete", target_id: "lead-1" });
    expect(JSON.parse(event.metadata_json)).toMatchObject({ reasonCode: "duplicate", label: "Ana", lifecycleStage: "new_lead" });
    const log = await (await request("/api/leads/deletions")).json() as { data: Array<{ lead_id: string; reason_code: string; actor_email: string }> };
    expect(log.data[0]).toMatchObject({ lead_id: "lead-1", reason_code: "duplicate", actor_email: "prometheus@avyron.ro" });
  });

  it("keeps the deletion journal restricted to platform principals", async () => {
    actor = "staff";
    expect((await request("/api/leads/deletions")).status).toBe(403);
  });
});
