// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { notificationsRouter } from "../../cloudflare/workers/api/src/notifications";
import {
  filterNotifications,
  type StoredNotice,
} from "../../cloudflare/workers/api/src/notificationPolicy";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  notificationSettingsSchema,
  notificationHref,
  guestContext,
} from "../shared/notifications";
import type { AppBindings, Role } from "../../cloudflare/workers/api/src/types";
import {
  canAccessProject,
  projectAccessMap,
} from "../../cloudflare/workers/api/src/projects";

class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
  ) {}
  bind(...values: SQLInputValue[]) {
    this.values = values;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
describe("Native notifications with real migrated SQLite and production Hono handlers", () => {
  let db: DatabaseSync,
    binding: D1Database,
    app: Hono<AppBindings>,
    actor: string,
    roles: Role[],
    mfa: boolean;
  const get = () =>
    app.request("/api/notifications", {}, {
      DB: binding,
    } as AppBindings["Bindings"]);
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      db.exec(readFileSync(`cloudflare/d1/migrations/${f}`, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["staff", "staff@example.test", "staff"],
      ["other", "other@example.test", "staff"],
      ["a", "a@example.test", "user"],
      ["b", "b@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
      ).run(id, email, "synthetic");
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    db.exec(
      "INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@example.test',1),('cb','Client B','b@example.test',1); INSERT INTO client_account_access VALUES('ca','a','owner',1),('cb','b','owner',1); INSERT INTO projects(id,name,slug,client_id,created_at,updated_at) VALUES('pa','Project A','project-a','ca',1,1),('pb','Project B','project-b','cb',1,1); INSERT INTO project_staff VALUES('pa','staff','contributor',2),('pb','other','contributor',2);",
    );
    binding = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        db.exec("BEGIN");
        try {
          const result = [];
          for (const s of statements) result.push(await s.run());
          db.exec("COMMIT");
          return result;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    } as unknown as D1Database;
    actor = "a";
    roles = ["user"];
    mfa = true;
    app = new Hono<AppBindings>();
    app.use("*", async (c, next) => {
      c.set("userId", actor);
      c.set("roles", roles);
      c.set("mfaVerified", mfa);
      await next();
    });
    app.route("/", notificationsRouter);
  });
  afterEach(() => db.close());
  it("delivers new projects only to authorized beneficiaries and platform principals; preserves chronological order", async () => {
    const a = await (await get()).json();
    expect(a.data.map((n: StoredNotice) => n.title)).toEqual([
      "Proiect nou · Project A",
    ]);
    actor = "b";
    const b = await (await get()).json();
    expect(b.data.map((n: StoredNotice) => n.title)).toEqual([
      "Proiect nou · Project B",
    ]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("notifies only allocated staff about proposals, excludes author, unrelated staff and clients, and revalidates removal", async () => {
    db.exec(
      "INSERT INTO project_staff VALUES('pa','owner','owner',3); INSERT INTO project_proposals(id,project_id,author_id,title,status,created_at,updated_at) VALUES('proposal','pa','staff','Modificare propusă','proposed',10,10)",
    );
    expect(
      db
        .prepare(
          "SELECT user_id FROM operation_notifications WHERE resource_type='proposal'",
        )
        .all(),
    ).toEqual([{ user_id: "owner" }]);
    actor = "owner";
    roles = ["admin"];
    let feed = await (await get()).json();
    expect(
      feed.data.some((n: StoredNotice) => n.title.includes("Propunere nouă")),
    ).toBe(true);
    db.exec(
      "DELETE FROM project_staff WHERE project_id='pa' AND user_id='owner'",
    );
    feed = await (await get()).json();
    expect(
      feed.data.some((n: StoredNotice) => n.title.includes("Propunere nouă")),
    ).toBe(false);
    db.exec(
      "INSERT INTO project_proposals(id,project_id,author_id,title,status,created_at,updated_at) VALUES('client-proposal','pa','a','Propunere client','proposed',11,11)",
    );
    expect(
      db
        .prepare(
          "SELECT user_id FROM operation_notifications WHERE deduplication_key='proposal:client-proposal'",
        )
        .all(),
    ).toEqual([{ user_id: "staff" }]);
  });
  it("hides project updates and subscription notices immediately after grant revocation, including read actions and counters", async () => {
    db.exec(
      "INSERT INTO project_updates(id,project_id,author_id,title,created_at) VALUES('up','pa','staff','Livrare de verificat',20); INSERT INTO services(id,project_id,service_name,price) VALUES('sa','pa','Core',100); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status,created_at,updated_at) VALUES('sub','ca','sa',2000000000000,'active',21,21)",
    );
    const before = await (await get()).json();
    expect(
      before.data.some((n: StoredNotice) => n.category === "subscription"),
    ).toBe(true);
    expect(
      before.data.some((n: StoredNotice) => n.title.includes("Livrare")),
    ).toBe(true);
    const ids = before.data.map((n: StoredNotice) => n.id);
    db.exec("DELETE FROM client_account_access WHERE user_id='a'");
    expect((await (await get()).json()).data).toEqual([]);
    for (const id of ids)
      expect(
        (
          await app.request(
            `/api/notifications/${id}/read`,
            { method: "POST" },
            { DB: binding } as AppBindings["Bindings"],
          )
        ).status,
      ).toBe(404);
    const unread = db
      .prepare("SELECT * FROM operation_notifications WHERE user_id='a'")
      .all() as unknown as StoredNotice[];
    expect(await filterNotifications(binding, actor, roles, unread)).toEqual(
      [],
    );
  });
  it("uses the same bulk and individual ACL for tenant membership, staff scope and live capability revocation", async () => {
    db.exec(
      "INSERT INTO organizations(id,slug,name,created_at,updated_at) VALUES('org','org','Company',1,1); INSERT INTO client_organizations(client_id,organization_id,linked_by,linked_at) VALUES('ca','org','owner',1); UPDATE projects SET organization_id='org' WHERE id='pa';",
    );
    expect((await canAccessProject(binding, "pa", "a", ["user"])).read).toBe(
      true,
    );
    expect((await canAccessProject(binding, "pa", "b", ["user"])).read).toBe(
      false,
    );
    db.exec(
      "INSERT INTO organization_memberships(organization_id,user_id,role,status,approved_at,created_at,updated_at) VALUES('org','b','viewer','active',1,1,1)",
    );
    expect(await canAccessProject(binding, "pa", "b", ["user"])).toMatchObject({
      read: true,
      write: false,
    });
    db.exec(
      "UPDATE organization_memberships SET status='revoked' WHERE user_id='b'; INSERT INTO staff_rank_assignments(user_id,rank_id,permissions_json,reason,assigned_by,updated_at) VALUES('other','vibe_dev','[\"projects.read\",\"projects.all\"]','test','owner',1); INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('all','other','projects.all','owner','test',1),('read','other','projects.read','owner','test',1)",
    );
    const bulk = await projectAccessMap(binding, ["pa", "pb"], "other", [
      "staff",
    ]);
    expect(bulk.get("pa")).toMatchObject({ read: true, write: false });
    expect(await canAccessProject(binding, "pa", "other", ["staff"])).toEqual(
      bulk.get("pa"),
    );
    db.exec(
      "INSERT INTO projects(id,name,slug,created_at,updated_at) VALUES('global','New Global','new-global',2,2)",
    );
    actor = "other";
    roles = ["staff"];
    expect(
      (await (await get()).json()).data.some(
        (n: StoredNotice) => n.title === "Proiect nou · New Global",
      ),
    ).toBe(true);
    db.exec("UPDATE user_capabilities SET revoked_at=1 WHERE id='read'");
    expect(
      (await canAccessProject(binding, "pa", "other", ["staff"])).read,
    ).toBe(false);
    expect((await (await get()).json()).data).toEqual([]);
  });
  it("enforces ownership on mark-read and makes repeat reads idempotent", async () => {
    const notice = (await (await get()).json()).data[0];
    actor = "b";
    expect(
      (
        await app.request(
          `/api/notifications/${notice.id}/read`,
          { method: "POST" },
          { DB: binding } as AppBindings["Bindings"],
        )
      ).status,
    ).toBe(404);
    actor = "a";
    for (let i = 0; i < 2; i++)
      expect(
        (
          await app.request(
            `/api/notifications/${notice.id}/read`,
            { method: "POST" },
            { DB: binding } as AppBindings["Bindings"],
          )
        ).status,
      ).toBe(200);
    expect((await (await get()).json()).data[0].read_at).toBeGreaterThan(0);
  });
  it("deduplicates subscription callbacks, supports billing products and respects disabled event rules", async () => {
    db.exec(
      "INSERT INTO services(id,project_id,service_name,price) VALUES('sa','pa','Core',100); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status,created_at,updated_at) VALUES('sub','ca','sa',2000000000000,'active',21,21); UPDATE subscriptions SET status='active' WHERE id='sub'; INSERT INTO billing_subscriptions(id,user_id,provider,provider_subscription_id,sku,status,period,amount_minor,created_at,updated_at) VALUES('bill','a','stripe','synthetic','AVY-STUDIO','active','monthly',100,22,22)",
    );
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM operation_notifications WHERE category='subscription' AND user_id='a'",
        )
        .get()!.n,
    ).toBe(2);
    db.prepare("UPDATE notification_settings SET config_json=? WHERE id=1").run(
      JSON.stringify({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        events: { projects: false, subscriptions: false, blog: false },
      }),
    );
    db.exec(
      "UPDATE subscriptions SET status='paused',updated_at=23 WHERE id='sub'; INSERT INTO project_proposals(id,project_id,author_id,title,created_at,updated_at) VALUES('disabled','pa','a','No notification',23,23)",
    );
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM operation_notifications WHERE category='subscription' AND user_id='a'",
        )
        .get()!.n,
    ).toBe(2);
    expect(
      db
        .prepare(
          "SELECT 1 FROM operation_notifications WHERE resource_id='disabled'",
        )
        .get(),
    ).toBeUndefined();
  });
  it("materializes only public blog posts once, hides archived posts and respects preferences", async () => {
    const now = Date.now();
    const insert = db.prepare(
      "INSERT INTO blog_posts(id,author_id,language,slug,title,excerpt,content,status,published_at,created_at,updated_at) VALUES(?,'owner','ro',?,'Titlu articol de test',?,?,?, ?,?,?)",
    );
    for (const [id, status, time] of [
      ["live", "published", now - 10],
      ["draft", "draft", now - 10],
      ["future", "published", now + 86400000],
    ] as const)
      insert.run(
        id,
        id,
        "Excerpt ".repeat(8),
        "Content ".repeat(30),
        status,
        time,
        now - 20,
        now - 10,
      );
    await get();
    await get();
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM operation_notifications WHERE category='blog' AND user_id='a'",
        )
        .get()!.n,
    ).toBe(1);
    await app.request(
      "/api/notifications/preferences",
      { method: "PUT", body: JSON.stringify({ blogEnabled: false }) },
      { DB: binding } as AppBindings["Bindings"],
    );
    expect(
      (await (await get()).json()).data.some(
        (n: StoredNotice) => n.category === "blog",
      ),
    ).toBe(false);
    db.exec("UPDATE blog_posts SET status='archived' WHERE id='live'");
    expect(
      await filterNotifications(
        binding,
        "a",
        ["user"],
        db
          .prepare(
            "SELECT * FROM operation_notifications WHERE category='blog'",
          )
          .all() as unknown as StoredNotice[],
      ),
    ).toEqual([]);
  });
  it("rejects unauthenticated inbox, client/staff config access, and missing admin MFA", async () => {
    expect(
      (
        await app.request("/api/notifications/admin", {}, {
          DB: binding,
        } as AppBindings["Bindings"])
      ).status,
    ).toBe(403);
    actor = "staff";
    roles = ["staff"];
    expect(
      (
        await app.request("/api/notifications/admin", {}, {
          DB: binding,
        } as AppBindings["Bindings"])
      ).status,
    ).toBe(403);
    actor = "owner";
    roles = ["admin"];
    mfa = false;
    expect(
      (
        await app.request("/api/notifications/admin", {}, {
          DB: binding,
        } as AppBindings["Bindings"])
      ).status,
    ).toBe(403);
    actor = "";
    const noSession = await get();
    expect(noSession.status).toBe(401);
    expect(noSession.headers.get("Cache-Control")).toBe("private, no-store");
    const publicConfig = await app.request("/api/notifications/config", {}, {
      DB: binding,
    } as AppBindings["Bindings"]);
    expect(publicConfig.status).toBe(200);
    expect(
      (await publicConfig.json()).data.messages.website.title.ro,
    ).toContain("website");
  });
  it("saves admin configuration atomically with revision conflict and no duplicate audit history", async () => {
    const request = (revision: number) =>
      app.request(
        "/api/notifications/admin",
        {
          method: "PUT",
          body: JSON.stringify({
            revision,
            config: DEFAULT_NOTIFICATION_SETTINGS,
          }),
        },
        { DB: binding } as AppBindings["Bindings"],
      );
    actor = "owner";
    roles = ["admin"];
    expect((await request(0)).status).toBe(200);
    expect((await request(0)).status).toBe(409);
    expect(
      db.prepare("SELECT count(*) n FROM notification_settings_history").get()!
        .n,
    ).toBe(1);
  });
});
describe("Safe contextual notification configuration", () => {
  it("rejects spam intervals, unexpected config, redirects and markup-based links", () => {
    expect(
      notificationSettingsSchema.safeParse({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        guest: { ...DEFAULT_NOTIFICATION_SETTINGS.guest, delaySeconds: 0 },
      }).success,
    ).toBe(false);
    for (const url of [
      "javascript:alert(1)",
      "//external.example",
      "/profil/../private",
      "/blog/x#<script>",
    ])
      expect(notificationHref(url)).toBeNull();
    expect(notificationHref("/intern/projects/my-project")).toBe(
      "/intern/projects/my-project",
    );
    expect(guestContext("/profil")).toBeNull();
    expect(guestContext("/en/checkout")).toBeNull();
    expect(guestContext("/servicii/social-media")).toBe("social");
  });
});
