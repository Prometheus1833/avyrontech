// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { adminOperationsRouter } from "../../cloudflare/workers/api/src/adminOperations";
import {
  projectsRouter,
  canAccessProject,
} from "../../cloudflare/workers/api/src/projects";
import {
  workspaceRouter,
  linkClientsByEmail,
} from "../../cloudflare/workers/api/src/workspace";
import { subscriptionOperationsRouter } from "../../cloudflare/workers/api/src/subscriptionOperations";
import { verifyPassword } from "../../cloudflare/workers/api/src/security";
class Statement {
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
const root = "/api/admin/operations/clients";
const identity = (suffix = "nou") => ({
  companyName: `Client ${suffix}`,
  contactName: "Contact test",
  email: `${suffix}@example.test`,
  phone: "",
  status: "active",
  entityType: "PJ",
  legalName: `Client ${suffix} SRL`,
  taxId: "",
  registrationNumber: "",
  address: "Adresă de test",
  representative: "",
  notes: "Notă internă",
});
const account = () => ({
  email: "new-account@example.test",
  username: "new-account",
  displayName: "Client nou",
  temporaryPassword: "Synthetic-Client-2026!",
});
describe("Client workspace: real SQLite, Hono and existing portal authorization", () => {
  let db: DatabaseSync,
    app: Hono,
    actor: string,
    mfa: boolean,
    policy: string | undefined,
    binding: D1Database,
    beforeBatch: (() => void) | null;
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["staff", "staff@example.test", "staff"],
      ["client-a", "a@example.test", "user"],
      ["client-b", "b@example.test", "user"],
      ["unverified", "unverified@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,username,display_name,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?,1,1)",
      ).run(
        id,
        email,
        id,
        id,
        "untouched-existing-hash",
        id === "unverified" ? 0 : 1,
      );
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    db.exec(
      "INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@example.test',1),('cb','Client B','b@example.test',1); INSERT INTO projects(id,name,slug,client_id,created_at) VALUES('pa','Project A','project-a','ca',1),('pb','Project B','project-b','cb',1),('empty-b','Empty B','empty-b','cb',1); INSERT INTO client_account_access VALUES('ca','client-a','owner',1),('cb','client-b','owner',1); INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('sa','pa','Core A',100,'monthly'); INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,maintenance_enabled,status) VALUES('sub-a','ca','sa',2000000000000,1,'active');",
    );
    binding = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        const hook = beforeBatch;
        beforeBatch = null;
        hook?.();
        db.exec("BEGIN");
        try {
          const result = statements.map((s) => ({
            meta: db.prepare(s.sql).run(...s.values),
          }));
          db.exec("COMMIT");
          return result;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    } as unknown as D1Database;
    actor = "owner";
    mfa = true;
    policy = "true";
    beforeBatch = null;
    app = new Hono();
    app.use("*", async (c, next) => {
      Object.assign(c.env, { DB: binding, MFA_AUTH_ENABLED: policy });
      c.set("userId", actor);
      c.set(
        "roles",
        db
          .prepare("SELECT role FROM user_roles WHERE user_id=?")
          .all(actor)
          .map((r) => r.role),
      );
      c.set("mfaVerified", mfa);
      c.set("requestId", "synthetic-request");
      await next();
    });
    app.route("/", adminOperationsRouter);
    app.route("/", projectsRouter);
    app.route("/", workspaceRouter);
    app.route("/", subscriptionOperationsRouter);
    app.onError((e) => {
      console.error(e);
      return new Response("server error", { status: 500 });
    });
  });
  afterEach(() => {
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });
  const req = (
    path: string,
    body?: unknown,
    method = "POST",
    key = crypto.randomUUID(),
  ) =>
    app.request(
      path,
      body === undefined
        ? {}
        : {
            method,
            headers: {
              "content-type": "application/json",
              "idempotency-key": key,
            },
            body: JSON.stringify(body),
          },
      {},
    );
  const ok = async (response: Response, status = 200) => {
    expect(response.status, await response.clone().text()).toBe(status);
    return response.json();
  };
  const create = (
    suffix = "nou",
    choice: unknown = { mode: "none" },
    key = crypto.randomUUID(),
  ) => req(root, { identity: identity(suffix), account: choice }, "POST", key);
  it("creates one CRM identity, a native hashed user and grant atomically; retries do not duplicate", async () => {
    const key = crypto.randomUUID(),
      body = { mode: "new", identity: account(), confirmed: true };
    const result = await ok(await create("nou", body, key));
    const again = await ok(await create("nou", body, key));
    expect(again).toEqual(result);
    const u = db
      .prepare("SELECT * FROM users WHERE id=?")
      .get(result.accountId)!;
    expect(u.must_change_password).toBe(1);
    expect(u.email_verified).toBe(1);
    expect(
      await verifyPassword(
        account().temporaryPassword,
        String(u.password_hash),
      ),
    ).toBe(true);
    expect(
      db
        .prepare("SELECT role FROM user_roles WHERE user_id=?")
        .all(result.accountId),
    ).toEqual([{ role: "user" }]);
    expect(db.prepare("SELECT count(*) n FROM clients").get()!.n).toBe(3);
    expect(
      JSON.stringify(db.prepare("SELECT * FROM security_events").all()),
    ).not.toContain(account().temporaryPassword);
    expect(
      db.prepare("SELECT count(*) n FROM operation_notifications").get()!.n,
    ).toBe(1);
    expect(
      db
        .prepare(
          "SELECT legal_name FROM client_legal_profiles WHERE client_id=?",
        )
        .get(result.id)!.legal_name,
    ).toBe(identity().legalName);
    expect((await create("different", body, key)).status).toBe(409);
  });
  it.each(["PF", "PJ", "PFA", "ONG"])(
    "stores %s in the canonical legal profile",
    async (entityType) => {
      const result = await ok(
        await req(root, {
          identity: { ...identity(entityType), entityType },
          account: { mode: "none" },
        }),
      );
      expect(
        db
          .prepare(
            "SELECT entity_type FROM client_legal_profiles WHERE client_id=?",
          )
          .get(result.id)!.entity_type,
      ).toBe(entityType);
    },
  );
  it("links an existing account without resetting its password and allows distinct legal beneficiaries", async () => {
    await ok(
      await create("new", {
        mode: "existing",
        accountId: "client-a",
        confirmed: true,
      }),
    );
    expect(
      db.prepare("SELECT password_hash FROM users WHERE id='client-a'").get()!
        .password_hash,
    ).toBe("untouched-existing-hash");
    expect(
      db
        .prepare(
          "SELECT count(*) n FROM client_account_access WHERE user_id='client-a'",
        )
        .get()!.n,
    ).toBe(2);
  });
  it("rejects duplicate identity and rolls back raced duplicate inserts including new credentials", async () => {
    await ok(await create());
    expect((await create()).status).toBe(409);
    beforeBatch = () =>
      db
        .prepare(
          "INSERT INTO clients(id,company_name,email,created_at) VALUES(?,?,?,1)",
        )
        .run("race", "Client raced", "raced@example.test");
    expect(
      (
        await create("raced", {
          mode: "new",
          identity: account(),
          confirmed: true,
        })
      ).status,
    ).toBe(409);
    expect(
      db.prepare("SELECT 1 FROM users WHERE email=?").get(account().email),
    ).toBeUndefined();
  });
  it("separates delegated profile changes from financial and account administration; clients cannot use admin APIs", async () => {
    actor = "client-a";
    expect((await req(root)).status).toBe(403);
    actor = "staff";
    expect((await req(root)).status).toBe(403);
    db.exec(
      "INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('read-client','staff','clients.read','owner','test',1),('write-client','staff','clients.write','owner','test',1)",
    );
    const file = await ok(await req(root + "/ca"));
    expect(file.permissions.finance).toBe(false);
    expect(file.invoices).toEqual([]);
    expect(file.accountOptions).toEqual([]);
    expect(
      (
        await req(root + "/ca/accounts", {
          identity: account(),
          confirmed: true,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await create("delegated", {
          mode: "existing",
          accountId: "client-a",
          confirmed: true,
        })
      ).status,
    ).toBe(403);
    await ok(await create("delegated"));
  });
  it("honors existing MFA policy and fails closed when rollout configuration is missing", async () => {
    mfa = false;
    expect((await create()).status).toBe(403);
    policy = undefined;
    expect((await create()).status).toBe(403);
    policy = "false";
    await ok(await create());
  });
  it("does not overwrite a concurrent profile edit and preserves canonical fiscal data", async () => {
    const file = await ok(await req(root + "/ca"));
    const v = {
      ...identity("updated"),
      entityType: "PFA",
      taxId: "SYNTHETIC-TAX",
    };
    await ok(
      await req(
        root + "/ca",
        { identity: v, revision: file.client.revision },
        "PATCH",
      ),
    );
    expect(
      (
        await req(
          root + "/ca",
          { identity: identity("stale"), revision: file.client.revision },
          "PATCH",
        )
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare(
          "SELECT tax_id FROM client_legal_profiles WHERE client_id='ca'",
        )
        .get()!.tax_id,
    ).toBe("SYNTHETIC-TAX");
  });
  it("rejects staff, unverified identities and unconfirmed grants", async () => {
    for (const id of ["owner", "staff", "unverified"])
      expect(
        (
          await create("invalid", {
            mode: "existing",
            accountId: id,
            confirmed: true,
          })
        ).status,
      ).toBe(409);
    expect(
      (
        await create("invalid", {
          mode: "existing",
          accountId: "client-a",
          confirmed: false,
        })
      ).status,
    ).toBe(400);
  });
  it("revokes access immediately, survives email fallback and rejects stale or raced grant replacement", async () => {
    expect(
      (await canAccessProject(binding, "pa", "client-a", ["user"])).read,
    ).toBe(true);
    await ok(
      await req(
        root + "/ca/accounts",
        { userIds: [], expectedUserIds: ["client-a"], confirmed: true },
        "PUT",
      ),
    );
    await linkClientsByEmail(binding, "client-a");
    expect(
      (await canAccessProject(binding, "pa", "client-a", ["user"])).read,
    ).toBe(false);
    expect(
      (
        await req(
          root + "/ca/accounts",
          {
            userIds: ["client-b"],
            expectedUserIds: ["client-a"],
            confirmed: true,
          },
          "PUT",
        )
      ).status,
    ).toBe(409);
    beforeBatch = () =>
      db.exec(
        "INSERT INTO client_account_access VALUES('ca','client-a','owner',1)",
      );
    expect(
      (
        await req(
          root + "/ca/accounts",
          { userIds: ["client-b"], expectedUserIds: [], confirmed: true },
          "PUT",
        )
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare(
          "SELECT user_id FROM client_account_access WHERE client_id='ca'",
        )
        .all(),
    ).toEqual([{ user_id: "client-a" }]);
  });
  it("allows multiple empty projects but blocks service history, owner, organization and concurrent edits", async () => {
    const file = await ok(await req(root + "/ca"));
    const empty = file.availableProjects.find(
      (p: { id: string }) => p.id === "empty-b",
    );
    expect(empty.canAssign).toBe(true);
    db.exec(
      "INSERT INTO projects(id,name,slug,client_id,created_at) VALUES('empty-2','Empty 2','empty-2','cb',1)",
    );
    await ok(
      await req(
        root + "/ca/projects",
        {
          projects: [
            { id: empty.id, sourceClientId: "cb", updatedAt: empty.updated_at },
            { id: "empty-2", sourceClientId: "cb", updatedAt: 0 },
          ],
          confirmed: true,
        },
        "PUT",
      ),
    );
    expect(
      db.prepare("SELECT client_id FROM projects WHERE id='empty-b'").get()!
        .client_id,
    ).toBe("ca");
    expect(
      (
        await req(
          root + "/cb/projects",
          {
            projects: [{ id: "pa", sourceClientId: "ca", updatedAt: 0 }],
            confirmed: true,
          },
          "PUT",
        )
      ).status,
    ).toBe(409);
    beforeBatch = () =>
      db.exec("UPDATE projects SET owner_user_id='client-b' WHERE id='pb'");
    expect(
      (
        await req(
          root + "/ca/projects",
          {
            projects: [{ id: "pb", sourceClientId: "cb", updatedAt: 0 }],
            confirmed: true,
          },
          "PUT",
        )
      ).status,
    ).toBe(409);
    expect(
      db.prepare("SELECT client_id FROM projects WHERE id='pb'").get()!
        .client_id,
    ).toBe("cb");
  });
  it("creates projects through the native API, safely replays, and exposes them only to the correct client", async () => {
    const key = crypto.randomUUID(),
      body = {
        name: "New A",
        slug: "new-a",
        client_id: "ca",
        kind: "website_prezentare",
      };
    const a = await ok(await req("/api/projects", body, "POST", key), 201);
    expect(
      await ok(await req("/api/projects", body, "POST", key), 201),
    ).toEqual(a);
    expect(
      (await req("/api/projects", { ...body, name: "Other" }, "POST", key))
        .status,
    ).toBe(409);
    actor = "client-a";
    expect((await req("/api/projects/new-a")).status).toBe(200);
    actor = "client-b";
    expect((await req("/api/projects/new-a")).status).toBe(403);
  });
  it("loads only client-scoped subscription options and rejects mismatched scope even on replay", async () => {
    const d = await ok(await req("/api/admin/client-subscriptions?client=ca"));
    expect(d.clients.map((c: { id: string }) => c.id)).toEqual(["ca"]);
    expect(
      d.projects.every((p: { client_id: string }) => p.client_id === "ca"),
    ).toBe(true);
    expect(d.providerSubscriptions).toEqual([]);
    expect(d.accounts.some((a: { id: string }) => a.id === "client-b")).toBe(
      false,
    );
    expect(d.data).toHaveLength(1);
    const body = {
      clientId: "ca",
      newClient: null,
      accountId: "client-a",
      projectId: "pa",
      planSku: null,
      name: "Monthly custom",
      priceMinor: 10000,
      specifications: { Support: "Test specification" },
      targetLabel: "Website A",
      externalUrl: null,
      productSlug: null,
      nextBillingDate: 2000000000000,
      billing: {
        entityType: "company",
        legalName: "Client A",
        taxId: "SYNTHETIC",
        address: "Test",
        invoiceEmail: "a@example.test",
        paymentTermsDays: 15,
      },
      confirmed: true,
    };
    const key = crypto.randomUUID();
    await ok(
      await req("/api/admin/client-subscriptions?client=ca", body, "POST", key),
    );
    expect(
      (
        await req(
          "/api/admin/client-subscriptions?client=cb",
          body,
          "POST",
          key,
        )
      ).status,
    ).toBe(409);
    actor = "client-a";
    const portal = await ok(await req("/api/workspace/subscriptions"));
    expect(
      portal.data.some(
        (s: { product_name: string }) => s.product_name === "Monthly custom",
      ),
    ).toBe(true);
    actor = "client-b";
    expect((await ok(await req("/api/workspace/subscriptions"))).data).toEqual(
      [],
    );
  });
  it("searches safely with filters, bounded pages, and private no-store responses", async () => {
    const r = await req(root + "?q=Client%20A");
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect((await ok(r)).data.map((c: { id: string }) => c.id)).toEqual(["ca"]);
    expect((await req(root + "?offset=-1")).status).toBe(400);
    expect((await ok(await req(root + "?q=%25"))).data).toEqual([]);
  });
  it("guards client identity grants inside the transaction when account eligibility changes", async () => {
    beforeBatch = () =>
      db.exec("INSERT INTO user_roles VALUES('client-b','staff')");
    expect(
      (
        await create("raced-account", {
          mode: "existing",
          accountId: "client-b",
          confirmed: true,
        })
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare(
          "SELECT 1 FROM clients WHERE email='raced-account@example.test'",
        )
        .get(),
    ).toBeUndefined();
  });
  it("provisions an account onto an existing client and marks its access as explicit", async () => {
    const result = await ok(
      await req(root + "/ca/accounts", {
        identity: account(),
        confirmed: true,
      }),
    );
    expect(
      db.prepare("SELECT access_managed FROM clients WHERE id='ca'").get()!
        .access_managed,
    ).toBe(1);
    expect(
      db
        .prepare(
          "SELECT user_id FROM client_account_access WHERE client_id='ca' AND user_id=?",
        )
        .get(result.accountId),
    ).toBeTruthy();
  });
  it("exposes only explicit-beneficiary financial rows and suppresses ambiguous account-wide purchases", async () => {
    db.exec(
      "INSERT INTO financial_revenues(id,client_id,service_name,revenue_type,status,currency,gross_amount_minor,created_at,updated_at) VALUES('rev-a','ca','Service A','other','paid','EUR',12345,1,1),('rev-b','cb','Private B','other','overdue','RON',99999,1,1)",
    );
    db.exec(
      "INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,created_at,updated_at) VALUES('order-a','client-a','[]',10000,10000,1,1); INSERT INTO account_carts(user_id,items_json,updated_at) VALUES('client-a','[]',1)",
    );
    const a = await ok(await req(root + "/ca"));
    expect(a.invoices.map((i: { id: string }) => i.id)).toEqual(["rev-a"]);
    expect(a.invoices[0].currency).toBe("EUR");
    expect(a.orders).toHaveLength(1);
    expect(a.carts).toHaveLength(1);
    db.exec(
      "INSERT INTO client_account_access VALUES('cb','client-a','owner',1)",
    );
    const after = await ok(await req(root + "/ca"));
    expect(after.orders).toEqual([]);
    expect(after.carts).toEqual([]);
    const b = await ok(await req(root + "/cb"));
    expect(b.orders).toEqual([]);
    expect(b.carts).toEqual([]);
  });
  it("searches Romanian diacritics consistently", async () => {
    await ok(
      await req(root, {
        identity: {
          ...identity("romanian"),
          companyName: "Ștefănescu Țară Întreprindere",
        },
        account: { mode: "none" },
      }),
    );
    const result = await ok(await req(root + "?q=stefanescu%20tara"));
    expect(result.data).toHaveLength(1);
  });
  it("keeps read and write rate limits independent", async () => {
    const stamp = Math.floor(Date.now() / 1000),
      window = Math.floor(stamp / 3600) * 3600;
    db.prepare(
      "INSERT INTO rate_limit_counters(scope_key,window_start,count,expires_at) VALUES(?,?,?,?)",
    ).run("rate:v1:client-workspace:read:owner", window, 480, window + 3900);
    expect((await req(root)).status).toBe(429);
    await ok(await create("write-still-allowed"));
  });
  it.each(["support", "budget"])(
    "blocks reassignment when %s history belongs to the previous client",
    async (source) => {
      if (source === "support")
        db.exec(
          "INSERT INTO support_tickets(id,client_id,project_id,subject,created_at) VALUES('ticket','cb','pb','Private support',1)",
        );
      else
        db.exec(
          "INSERT INTO financial_budgets(id,name,category,client_id,project_id,period,period_start,period_end,limit_minor,created_at,updated_at) VALUES('budget','Private budget','general','cb','pb','month',1,2,10000,1,1)",
        );
      const file = await ok(await req(root + "/ca"));
      expect(
        file.availableProjects.find((p: { id: string }) => p.id === "pb")
          .canAssign,
      ).toBe(false);
      expect(
        (
          await req(
            root + "/ca/projects",
            {
              projects: [{ id: "pb", sourceClientId: "cb", updatedAt: 0 }],
              confirmed: true,
            },
            "PUT",
          )
        ).status,
      ).toBe(409);
    },
  );
});
