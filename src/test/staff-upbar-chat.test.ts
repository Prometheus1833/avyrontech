// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect } from "vitest";
import { projectChatRouter } from "../../cloudflare/workers/api/src/projectChat";
import { workspaceRouter } from "../../cloudflare/workers/api/src/workspace";
import { projectsRouter } from "../../cloudflare/workers/api/src/projects";
import { aiProjectsRouter } from "../../cloudflare/workers/api/src/aiProjects";
import { staffRequestAllowed } from "../../cloudflare/workers/api/src/staffAccessPolicy";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";
import { buildAccess, canOpenSection, defaultSection } from "../lib/access";
class Stmt {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
  ) {}
  bind(...v: SQLInputValue[]) {
    this.values = v;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
let db: DatabaseSync, app: Hono<AppBindings>, actor: string, mfa: boolean;
const root = "/api/project-chat";
const roles: Record<string, "admin" | "staff" | "user"> = {
  owner: "admin",
  sa: "staff",
  sb: "staff",
  ca: "user",
  cb: "user",
};
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const f of readdirSync("cloudflare/d1/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
  for (const [id, role] of Object.entries(roles)) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at,display_name) VALUES(?,?,?,1,1,1,?)",
    ).run(
      id,
      id === "owner" ? "prometheus@avyron.ro" : id + "@example.test",
      "synthetic",
      id,
    );
    db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
  }
  db.exec(
    "INSERT INTO clients(id,company_name,email,created_at) VALUES('a','Firma A','a@example.test',1),('b','Firma B','b@example.test',1);INSERT INTO projects(id,client_id,name,slug,created_at,updated_at) VALUES('pa','a','Proiect A','project-a',1,1),('pb','b','Proiect B','project-b',1,1);INSERT INTO project_staff VALUES('pa','sa','contributor',1),('pb','sb','contributor',1);INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES('a','ca','owner',1),('b','cb','owner',1)",
  );
  const binding = {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (statements: Stmt[]) => {
      db.exec("BEGIN");
      try {
        const r = statements.map((s) => ({
          meta: db.prepare(s.sql).run(...s.values),
        }));
        db.exec("COMMIT");
        return r;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  actor = "sa";
  mfa = true;
  app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    Object.assign(c.env, { DB: binding, MFA_AUTH_ENABLED: "true" });
    c.set("userId", actor);
    c.set("roles", [roles[actor]]);
    c.set("mfaVerified", mfa);
    if (!(await staffRequestAllowed(c.env.DB, actor, c.req.path, c.req.method)))
      return c.json({ error: { code: "staff_permission_required" } }, 403);
    await next();
  });
  app.route("/", projectChatRouter);
  app.route("/", workspaceRouter);
  app.route("/", projectsRouter as unknown as Hono<AppBindings>);
  app.route("/", aiProjectsRouter);
});
afterEach(() => db.close());
async function req(path: string, body?: unknown, key = crypto.randomUUID()) {
  return app.request(
    "http://local.test" + path,
    {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    { DB: {} } as never,
  );
}
async function json(r: Response, status = 200) {
  expect(r.status).toBe(status);
  return r.json();
}
async function send(
  project = "pa",
  text = "Mesaj autorizat",
  key = crypto.randomUUID(),
) {
  return req(`${root}/${project}/messages`, { content: text }, key);
}
it("shows only authorized project names, previews and unread counts to each beneficiary", async () => {
  await json(await send());
  actor = "sb";
  expect(
    (await json(await req(root + "/projects"))).data.map(
      (p: { id: string }) => p.id,
    ),
  ).toEqual(["pb"]);
  actor = "ca";
  const own = await json(await req(root + "/projects"));
  expect(own.data.map((p: { id: string }) => p.id)).toEqual(["pa"]);
  expect(own.data[0]).toMatchObject({
    last_content: "Mesaj autorizat",
    unread: 1,
  });
  actor = "cb";
  expect(
    JSON.stringify(await json(await req(root + "/projects"))),
  ).not.toContain("Mesaj autorizat");
  expect((await req(root + "/pa/messages")).status).toBe(404);
});
it("lets an authorized client and staff collaborate in the same existing message store", async () => {
  const first = await json(await send());
  actor = "ca";
  await json(await send("pa", "Răspuns client"));
  const msgs = await json(await req(root + "/pa/messages"));
  expect(msgs.data.map((m: { content: string }) => m.content)).toContain(
    "Mesaj autorizat",
  );
  expect(msgs.data).toHaveLength(2);
  expect(msgs.data[0].id).toBe(first.id);
  expect(
    db
      .prepare("SELECT count(*) n FROM staff_chat_messages WHERE project_id=?")
      .get("pa")!.n,
  ).toBe(2);
});
it("never mixes client room messages with team channels, DM previews or read markers", async () => {
  const sent = await json(await send());
  await json(
    await req("/api/workspace/chat", {
      recipient_id: null,
      channel: "general",
      content: "Intern",
    }),
  );
  const team = await json(await req("/api/workspace/chat"));
  expect(team.data.map((m: { content: string }) => m.content)).toEqual([
    "Intern",
  ]);
  const threads = await json(await req("/api/workspace/chat/conversations"));
  expect(JSON.stringify(threads)).not.toContain("Mesaj autorizat");
  expect(
    (
      await req("/api/workspace/chat/read", {
        target: "channel:general",
        messageId: sent.id,
      })
    ).status,
  ).toBe(404);
  const project = await json(await req(root + "/pa/messages"));
  expect(project.data).toHaveLength(1);
  actor = "ca";
  expect((await req("/api/workspace/chat")).status).toBe(403);
  expect((await req("/api/workspace/chat/members")).status).toBe(403);
});
it("rejects forged beneficiaries, channel overrides and direct client recipients on the team API", async () => {
  expect(
    (await req(root + "/pa/messages", { content: "x", project_id: "pb" }))
      .status,
  ).toBe(400);
  expect(
    (
      await req("/api/workspace/chat", {
        recipient_id: "ca",
        channel: "general",
        content: "x",
      })
    ).status,
  ).toBe(400);
  actor = "cb";
  expect((await send("pa")).status).toBe(404);
  actor = "sb";
  expect((await send("pa")).status).toBe(404);
});
it("revalidates membership before replaying an idempotent send after revocation", async () => {
  const key = crypto.randomUUID(),
    first = await json(await send("pa", "Un singur mesaj", key));
  expect(await json(await send("pa", "Un singur mesaj", key))).toEqual(first);
  expect(
    db.prepare("SELECT count(*) n FROM staff_chat_messages").get()!.n,
  ).toBe(1);
  db.exec("DELETE FROM project_staff WHERE user_id='sa'");
  expect((await send("pa", "Un singur mesaj", key)).status).toBe(404);
  expect((await req(root + "/pa/messages")).status).toBe(404);
  expect((await json(await req(root + "/projects"))).data).toEqual([]);
});
it("revokes a client immediately and keeps historical messages without moving the beneficiary", async () => {
  actor = "ca";
  await json(await send());
  db.exec("DELETE FROM client_account_access WHERE user_id='ca'");
  expect((await req(root + "/pa/messages")).status).toBe(404);
  expect(() =>
    db.exec("UPDATE projects SET client_id='b' WHERE id='pa'"),
  ).toThrow(/project_chat_history/);
  expect(
    db.prepare("SELECT count(*) n FROM staff_chat_messages").get()!.n,
  ).toBe(1);
});
it("only marks messages inside the current project as read and never moves the marker backwards", async () => {
  const msg = await json(await send());
  actor = "sb";
  const other = await json(await send("pb", "Alt beneficiar"));
  actor = "ca";
  expect((await req(root + "/pa/read", { messageId: other.id })).status).toBe(
    404,
  );
  await json(await req(root + "/pa/read", { messageId: msg.id }));
  expect((await json(await req(root + "/projects"))).data[0].unread).toBe(0);
  expect(
    db.prepare("SELECT target FROM staff_chat_reads WHERE user_id='ca'").get()!
      .target,
  ).toBe("project:pa");
});
it("keeps MFA requirements for staff mutations while allowing ordinary client collaboration", async () => {
  mfa = false;
  expect((await send()).status).toBe(403);
  actor = "ca";
  await json(await send());
});
it("applies live chat permissions independently from team administration", async () => {
  const keys = ["chat.read", "projects.read"];
  db.prepare(
    "INSERT INTO staff_rank_assignments(user_id,rank_id,permissions_json,reason,assigned_by,updated_at) VALUES('sa','vibe_dev',?,'Test','owner',1)",
  ).run(JSON.stringify(keys));
  for (const key of keys)
    db.prepare(
      "INSERT INTO user_capabilities(id,user_id,capability,reason,granted_by,created_at) VALUES(?,'sa',?,'Test','owner',1)",
    ).run(crypto.randomUUID(), key);
  await json(await req(root + "/projects"));
  expect((await send()).status).toBe(403);
  await json(await req("/api/workspace/chat/members"));
  expect((await req("/api/workspace/staff")).status).toBe(403);
  db.exec(
    "UPDATE user_capabilities SET revoked_at=1 WHERE user_id='sa' AND capability='chat.read'",
  );
  expect((await req(root + "/projects")).status).toBe(403);
});
it("bounds messages and cursor pagination and rejects duplicate keys with changed content", async () => {
  expect((await send("pa", "x".repeat(4001))).status).toBe(400);
  const key = crypto.randomUUID();
  await json(await send("pa", "Original", key));
  expect((await send("pa", "Modificat", key)).status).toBe(409);
  expect((await req(root + "/pa/messages?before=invalid")).status).toBe(400);
  for (let i = 0; i < 55; i++)
    db.prepare(
      "INSERT INTO staff_chat_messages(id,author_id,recipient_id,channel,content,created_at,project_id) VALUES(?,'sa','sa','general','Istoric',?,'pa')",
    ).run("msg-" + String(i).padStart(3, "0"), i + 1);
  const first = (await json(await req(root + "/pa/messages"))).data;
  expect(first).toHaveLength(50);
  const cursor = encodeURIComponent(
    JSON.stringify({ at: first[0].created_at, id: first[0].id }),
  );
  const old = (await json(await req(root + "/pa/messages?before=" + cursor)))
    .data;
  expect(old).toHaveLength(6);
  expect(new Set([...first, ...old].map((m) => m.id)).size).toBe(56);
});
it("keeps My Projects scoped to explicit involvement even for a platform principal", async () => {
  actor = "owner";
  expect((await json(await req("/api/projects?scope=mine"))).data).toEqual([]);
  db.exec("INSERT INTO project_staff VALUES('pa','owner','owner',1)");
  const mine = await json(await req("/api/projects?scope=mine"));
  expect(mine.data.map((p: { id: string }) => p.id)).toEqual(["pa"]);
  expect(mine.data[0].member_count).toBe(2);
  expect(mine.sales).toEqual([]);
});
it("shows AI workspace navigation to staff and filters native AI lists by active membership", async () => {
  actor = "sa";
  const p = db.prepare("SELECT id FROM ai_projects LIMIT 1").get()!;
  db.prepare(
    "INSERT INTO ai_project_members(project_id,user_id,role,status,granted_at,updated_at) VALUES(?,'sa','viewer','active',1,1)",
  ).run(p.id);
  const result = await json(await req("/api/ai-projects"));
  expect(result.data).toHaveLength(1);
  db.exec("UPDATE ai_project_members SET status='revoked' WHERE user_id='sa'");
  expect((await json(await req("/api/ai-projects"))).data).toEqual([]);
  expect(canOpenSection("ai-projects", buildAccess({ roles: ["staff"] }))).toBe(
    true,
  );
  const accountant = buildAccess({
    roles: ["staff"],
    capabilities: [
      "staff.access.managed",
      "staff.rank.avy_contabil",
      "finance.read",
    ],
  });
  expect(canOpenSection("finance", accountant)).toBe(true);
  expect(canOpenSection("ai-projects", accountant)).toBe(false);
  expect(defaultSection(accountant)).toBe("finance");
});

it("searches beyond the first room page and focuses only an authorized project", async () => {
  db.exec("UPDATE projects SET name='MENTENANȚĂ ȘI ÎNGRIJIRE' WHERE id='pa'");
  actor = "ca";
  expect(
    (
      await json(await req(root + "/projects?q=mentenanta%20si%20ingrijire"))
    ).data.map((p: { id: string }) => p.id),
  ).toEqual(["pa"]);

  for (let i = 0; i < 105; i++)
    db.prepare(
      "INSERT INTO projects(id,client_id,name,slug,created_at,updated_at) VALUES(?,'a',?,?,1,1)",
    ).run("extra-" + i, "Extra " + i, "extra-" + i);
  actor = "ca";
  const focused = await json(await req(root + "/projects?focus=extra-104"));
  expect(focused.data[0].id).toBe("extra-104");
  expect(focused.data).toHaveLength(100);
  expect(
    (await json(await req(root + "/projects?q=Extra%20104"))).data.map(
      (p: { id: string }) => p.id,
    ),
  ).toEqual(["extra-104"]);
  expect((await json(await req(root + "/projects?q=%25"))).data).toEqual([]);
  expect(
    JSON.stringify(await json(await req(root + "/projects?focus=pb"))),
  ).not.toContain("Proiect B");
});

it("does not revive former staff project assignments when the account is now a client", async () => {
  db.exec("INSERT INTO project_staff VALUES('pb','ca','contributor',1)");
  actor = "ca";
  expect(
    (await json(await req("/api/projects?scope=mine"))).data.map(
      (p: { id: string }) => p.id,
    ),
  ).toEqual(["pa"]);
  expect((await req(root + "/pb/messages")).status).toBe(404);
  expect(
    JSON.stringify(await json(await req(root + "/projects"))),
  ).not.toContain("Proiect B");
});

it("keeps project content out of legacy channel and unrelated DM queries during a rolling release", async () => {
  await json(await send("pa", "Context confidențial"));
  actor = "ca";
  await json(await send("pa", "Răspuns client"));
  const legacy = db
    .prepare(
      "SELECT content FROM staff_chat_messages WHERE recipient_id IS NULL OR author_id='sb' OR recipient_id='sb'",
    )
    .all();
  expect(legacy).toEqual([]);
  expect(() =>
    db.exec(
      "INSERT INTO staff_chat_messages(id,author_id,channel,content,created_at,project_id) VALUES('forged','sa','general','leak',1,'pa')",
    ),
  ).toThrow(/invalid_project_chat_scope/);
});
