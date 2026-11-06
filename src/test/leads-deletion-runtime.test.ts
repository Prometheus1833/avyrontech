import { leadPipeline } from "../../cloudflare/workers/api/src/analytics";
import { LEAD_ARCHIVE_REASONS, leadWhatsAppUrl } from "../shared/leadArchive";
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
    actor = "owner";
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations").filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    }
    for (const [id, email, role] of [["owner", "prometheus@avyron.ro", "admin"], ["staff", "staff@example.test", "staff"]]) {
      db.prepare("INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,1,1,1)").run(id, email, "fixture");
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

  const archive = (body: unknown, id = "lead-1") => request(`/api/leads/${id}/archive`, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify(body) });
  it("archives with exactly five specific reasons, preserves history and restores the original stage", async () => {
    expect(LEAD_ARCHIVE_REASONS).toHaveLength(5);
    for (const reason of LEAD_ARCHIVE_REASONS) {
      const expectedUpdatedAt = Number(db.prepare("SELECT updated_at FROM leads WHERE id='lead-1'").get()!.updated_at);
      expect((await archive({ restore:false, reason:reason.code, note:"Context păstrat", confirmed:true, expectedUpdatedAt })).status).toBe(200);
      expect((await (await request("/api/leads")).json()).data).toEqual([]);
      const response = await request("/api/leads?archived=1"), archived = await response.json();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(archived.data[0]).toMatchObject({id:"lead-1",archive_reason:reason.code,archive_note:"Context păstrat",lifecycle_stage:"new_lead",can_archive:1});
      expect(String(db.prepare("SELECT content FROM lead_activities WHERE lead_id='lead-1' ORDER BY created_at DESC LIMIT 1").get()!.content)).toContain(reason.label);
      expect((await (await request("/api/leads/lead-1")).json()).canEdit).toBe(false);
      expect((await request("/api/leads/lead-1",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({urgent:true})})).status).toBe(409);
      expect((await archive({ restore:true, confirmed:true, expectedUpdatedAt:archived.data[0].updated_at })).status).toBe(200);
      expect((await (await request("/api/leads")).json()).data[0]).toMatchObject({id:"lead-1",lifecycle_stage:"new_lead",archived_at:null});
    }
    expect(db.prepare("SELECT count(*) n FROM lead_activities WHERE kind='status_change'").get()!.n).toBe(10);
    expect(db.prepare("SELECT count(*) n FROM security_events WHERE action IN ('lead.archive','lead.restore')").get()!.n).toBe(10);
  });
  it("returns the current revision for immediate archival after a stage change", async () => {
    const response = await request("/api/leads/lead-1",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({lifecycleStage:"contacted"})});
    expect(response.status).toBe(200);
    const changed = await response.json();
    expect(changed.updatedAt).toBeGreaterThan(1);
    expect((await archive({restore:false,reason:"postponed",confirmed:true,expectedUpdatedAt:changed.updatedAt})).status).toBe(200);
    expect((await (await request("/api/leads?archived=1")).json()).data[0].lifecycle_stage).toBe("contacted");
  });
  it("rejects unknown reasons, unconfirmed decisions and stale versions without duplicate audit", async () => {
    expect((await archive({restore:false,reason:"invented",confirmed:true,expectedUpdatedAt:1})).status).toBe(400);
    expect((await archive({restore:false,reason:"no_budget",confirmed:false,expectedUpdatedAt:1})).status).toBe(400);
    expect((await archive({restore:false,reason:"no_budget",confirmed:true,expectedUpdatedAt:2})).status).toBe(409);
    expect(db.prepare("SELECT count(*) n FROM security_events WHERE action='lead.archive'").get()!.n).toBe(0);
    const b={restore:false,reason:"no_budget",confirmed:true,expectedUpdatedAt:1};
    expect((await archive(b)).status).toBe(200); expect((await archive(b)).status).toBe(409);
    expect(db.prepare("SELECT count(*) n FROM security_events WHERE action='lead.archive'").get()!.n).toBe(1);
  });
  it("keeps archive listing, decisions and restoration inside the existing resource ACL", async () => {
    expect((await archive({restore:false,reason:"postponed",confirmed:true,expectedUpdatedAt:1})).status).toBe(200);
    actor="staff";
    expect((await (await request("/api/leads?archived=1")).json()).data).toEqual([]);
    expect((await archive({restore:true,confirmed:true,expectedUpdatedAt:1})).status).toBe(403);
    db.exec("INSERT INTO lead_assignments(lead_id,user_id,assignment_role,assigned_by,assigned_at) VALUES('lead-1','staff','reviewer','owner',1)");
    expect((await (await request("/api/leads?archived=1")).json()).data[0].can_archive).toBe(0);
    expect((await archive({restore:true,confirmed:true,expectedUpdatedAt:1})).status).toBe(403);
  });
  it("keeps archived leads out of the existing analytics pipeline and restores them without duplicates", async () => {
    db.prepare("UPDATE leads SET created_at=? WHERE id='lead-1'").run(Date.now());
    expect((await leadPipeline(env.DB,null,30)).recent).toHaveLength(1);
    expect((await archive({restore:false,reason:"postponed",confirmed:true,expectedUpdatedAt:1})).status).toBe(200);
    const archived=await leadPipeline(env.DB,null,30); expect(archived.recent).toEqual([]); expect(archived.byStatus).toEqual([]); expect(archived.waiting.open).toBe(0);
    const revision=Number(db.prepare("SELECT updated_at FROM leads WHERE id='lead-1'").get()!.updated_at);
    expect((await archive({restore:true,confirmed:true,expectedUpdatedAt:revision})).status).toBe(200);
    expect((await leadPipeline(env.DB,null,30)).recent).toHaveLength(1);
  });
  it("paginates archive results without exposing deleted records", async () => {
    for(let i=0;i<51;i++)db.prepare("INSERT INTO leads(id,source,status,created_at,updated_at,archived_at,archive_reason) VALUES(?,'manual','new',?,?,?,'postponed')").run(`archive-${i}`,i+10,i+10,i+10);
    const first=await (await request("/api/leads?archived=1")).json();
    const next=await (await request(`/api/leads?archived=1&offset=${first.nextOffset}`)).json();
    expect(first.data).toHaveLength(50); expect(next.data).toHaveLength(1);
    expect(new Set([...first.data,...next.data].map((r:{id:string})=>r.id)).size).toBe(51);
    expect((await request("/api/leads?archived=1&offset=-1")).status).toBe(400);
  });
  it("builds only structurally valid WhatsApp links and encodes a user-written message", () => {
    expect(leadWhatsAppUrl("0721 123 456")).toBe("https://wa.me/40721123456");
    expect(leadWhatsAppUrl("0040 721123456")).toBe("https://wa.me/40721123456");
    expect(leadWhatsAppUrl("+44 (20) 7946-0000","Bună ziua! & detalii")).toBe("https://wa.me/442079460000?text="+encodeURIComponent("Bună ziua! & detalii"));
    for(const raw of ["123","telefon:0721123456","+00000","0721123456?text=secret",null,"abc", "721123456"])expect(leadWhatsAppUrl(raw)).toBeNull();
  });
  it.each(['changed_mind','unwilling_to_pay','requirements_not_met'])('persists the commercial removal reason %s without deleting its history', async reasonCode => {
    const response=await request('/api/leads/lead-1',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({reasonCode})});
    expect(response.status).toBe(200);
    expect(db.prepare("SELECT deletion_reason_key FROM leads WHERE id='lead-1'").get()!.deletion_reason_key).toBe(reasonCode);
    expect((await (await request('/api/leads')).json()).data).toEqual([]);
    expect((await (await request('/api/leads/deletions')).json()).data[0].reason_code).toBe(reasonCode);
  });

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

  it("does not expose or mutate unassigned legacy leads through a staff role", async () => {
    actor = "staff";
    expect((await (await request("/api/leads")).json() as { data: unknown[] }).data).toEqual([]);
    expect((await request("/api/leads/lead-1")).status).toBe(403);
    const update = () => request("/api/leads/lead-1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ urgent: true }) });
    expect((await update()).status).toBe(403);
    expect(db.prepare("SELECT urgent FROM leads WHERE id='lead-1'").get()!.urgent).toBe(0);
    db.prepare("INSERT INTO lead_assignments(lead_id,user_id,assignment_role,assigned_by,assigned_at) VALUES ('lead-1','staff','owner','owner',1)").run();
    expect((await request("/api/leads/lead-1")).status).toBe(200);
    expect((await update()).status).toBe(200);
    expect(db.prepare("SELECT urgent FROM leads WHERE id='lead-1'").get()!.urgent).toBe(1);
  });
});
