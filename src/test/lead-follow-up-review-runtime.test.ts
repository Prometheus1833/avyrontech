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

describe("lead follow-up staff review", () => {
  let db: SqliteDatabase;
  let app: Hono<AppBindings>;
  let env: Env;
  const actor = "staff";

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const file of readdirSync("cloudflare/d1/migrations").filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
    }
    for (const [id, email, role] of [["owner", "owner@example.test", "staff"], ["staff", "staff@example.test", "staff"]]) {
      db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,1,1)").run(id, email, "fixture");
      db.prepare("INSERT INTO user_roles(user_id,role) VALUES (?,?)").run(id, role);
    }
    db.prepare(`INSERT INTO leads
      (id,source,name,business,phone,email,status,lifecycle_stage,outreach_eligibility,delivery_status,first_response_at,created_at,updated_at)
      VALUES ('lead-1','Necesit','Ana','Atelier','0712345678','ana@example.ro','contacted','contacted','legitimate_interest','pending',1000,1,1)`).run();
    db.prepare("INSERT INTO lead_assignments(lead_id,user_id,assignment_role,assigned_by,assigned_at) VALUES ('lead-1','owner','owner','owner',1)").run();
    db.prepare(`INSERT INTO lead_follow_up_drafts
      (id,lead_id,sequence,due_at,status,whatsapp_body,email_subject,email_body,generated_by_model,generated_at,expires_at,created_at,updated_at)
      VALUES ('draft-1','lead-1',1,1000,'ready','Mesaj WhatsApp','Subiect','Mesaj e-mail','fixture',1000,9999999999999,1000,1000)`).run();
    env = { AI: { run: async () => ({ response: JSON.stringify({ body: "Mesaj WhatsApp revizuit" }) }) }, DB: {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        db.exec("BEGIN");
        try { const results = await Promise.all(statements.map((statement) => statement.run())); db.exec("COMMIT"); return results; }
        catch (error) { db.exec("ROLLBACK"); throw error; }
      },
    } } as unknown as Env;
    app = new Hono<AppBindings>();
    app.use("*", async (c, next) => {
      c.set("userId", actor); c.set("roles", ["staff"]); c.set("requestId", "request-1"); await next();
    });
    app.route("/", leadsRouter);
  });

  afterEach(() => db.close());

  const request = (path: string, body?: unknown, headers: Record<string, string> = {}) => app.request(`https://avyron.test${path}`, {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
  }, env);

  it("lets staff claim the lead while preserving the previous owner as collaborator", async () => {
    expect((await request("/api/leads/lead-1/claim")).status).toBe(200);
    expect(db.prepare("SELECT assignment_role FROM lead_assignments WHERE lead_id='lead-1' AND user_id='staff'").get()).toMatchObject({ assignment_role: "owner" });
    expect(db.prepare("SELECT assignment_role FROM lead_assignments WHERE lead_id='lead-1' AND user_id='owner'").get()).toMatchObject({ assignment_role: "collaborator" });
  });

  it("separates internal approval from the explicit external-send confirmation", async () => {
    const approval = await request("/api/leads/lead-1/follow-ups/draft-1/review", { decision: "approved", revision: 1 });
    expect(approval.status).toBe(200);
    expect(db.prepare("SELECT status,approval_status,approved_by,revision,sent_at FROM lead_follow_up_drafts WHERE id='draft-1'").get()).toMatchObject({
      status: "ready", approval_status: "approved", approved_by: "staff", revision: 2, sent_at: null,
    });

    const stale = await request("/api/leads/lead-1/follow-ups/draft-1/sent", { revision: 1, channels: ["whatsapp"] });
    expect(stale.status).toBe(409);
    const confirmation = await request("/api/leads/lead-1/follow-ups/draft-1/sent", { revision: 2, channels: ["whatsapp"] });
    expect(confirmation.status).toBe(200);
    expect(db.prepare("SELECT status,revision FROM lead_follow_up_drafts WHERE id='draft-1'").get()).toMatchObject({ status: "sent", revision: 3 });
    expect(db.prepare("SELECT outcome FROM lead_activities WHERE lead_id='lead-1' AND direction='outbound'").get()).toMatchObject({ outcome: "sent_confirmed_by_staff" });
  });

  it("uses Workers AI to revise only the selected section and resets approval", async () => {
    const response = await request("/api/leads/lead-1/follow-ups/draft-1/revise", {
      section: "whatsapp", instruction: "Scurtează și clarifică mesajul.", revision: 1,
    }, { "Idempotency-Key": "revision-key-0001" });
    expect(response.status).toBe(200);
    expect(db.prepare("SELECT whatsapp_body,email_subject,email_body,approval_status,revision FROM lead_follow_up_drafts WHERE id='draft-1'").get()).toMatchObject({
      whatsapp_body: "Mesaj WhatsApp revizuit", email_subject: "Subiect", email_body: "Mesaj e-mail",
      approval_status: "pending", revision: 2,
    });
    expect(db.prepare("SELECT section,status,proposed_text FROM lead_follow_up_draft_revisions WHERE draft_id='draft-1'").get()).toMatchObject({
      section: "whatsapp", status: "ready", proposed_text: "Mesaj WhatsApp revizuit",
    });
  });
});
