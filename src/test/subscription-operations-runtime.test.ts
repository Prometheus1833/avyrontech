// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type {
  DatabaseSync as SqliteDatabase,
  SQLInputValue,
} from "node:sqlite";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { Hono } from "hono";
import { subscriptionOperationsRouter } from "../../cloudflare/workers/api/src/subscriptionOperations";
import { workspaceRouter } from "../../cloudflare/workers/api/src/workspace";
import { nextSubscriptionMonth } from "../shared/subscriptionOperations";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: SqliteDatabase,
    readonly sql: string,
  ) {}
  bind(...v: SQLInputValue[]) {
    this.values = v;
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
describe("Subscription operations: real handlers, SQLite migrations and existing ledgers", () => {
  let db: SqliteDatabase,
    app: Hono,
    actor: string,
    mfa: boolean,
    beforeBatch: (() => void) | null;
  let mfaPolicy: string | undefined;
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys=ON");
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["super", "avyrontech@gmail.com", "admin"],
      ["admin", "admin@example.test", "admin"],
      ["staff", "staff@example.test", "staff"],
      ["a", "account-a@example.test", "user"],
      ["b", "account-b@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
      ).run(id, email, "fixture");
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    db.exec(
      "INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@example.test',1),('cb','Client B','b@example.test',1);INSERT INTO projects(id,client_id,name,slug,created_at) VALUES('pa','ca','Project A','project-a',1),('pb','cb','Project B','project-b',1)",
    );
    actor = "owner";
    mfa = true;
    mfaPolicy = undefined;
    beforeBatch = null;
    const DB = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        const hook = beforeBatch;
        beforeBatch = null;
        hook?.();
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
    };
    app = new Hono();
    app.use("*", async (c, next) => {
      Object.assign(c.env, {
        DB,
        ADMIN_MFA_POLICY: "optional_until_enrollment",
        MFA_AUTH_ENABLED: mfaPolicy,
      });
      c.set("userId", actor);
      c.set(
        "roles",
        db
          .prepare("SELECT role FROM user_roles WHERE user_id=?")
          .all(actor)
          .map((r) => r.role),
      );
      c.set("mfaVerified", mfa);
      await next();
    });
    app.route("/", subscriptionOperationsRouter);
    app.route("/", workspaceRouter);
    app.onError((e) => {
      console.error(String(e));
      return new Response("safe failure", { status: 500 });
    });
  });
  afterEach(() => db.close());
  const request = (
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
  const billing = {
    entityType: "company",
    legalName: "Client A",
    taxId: "SYNTHETIC",
    address: "Adresă sintetică",
    invoiceEmail: "billing@example.test",
    paymentTermsDays: 10,
  };
  const allocation = (patch: Record<string, unknown> = {}) => ({
    clientId: "ca",
    newClient: null,
    accountId: "a",
    projectId: "pa",
    planSku: null,
    name: "Serviciu lunar sintetic",
    priceMinor: 12345,
    specifications: { Rapoarte: "Lunar", Limită: "Două intervenții" },
    targetLabel: "Website de test",
    externalUrl: null,
    productSlug: null,
    nextBillingDate: Date.UTC(2027, 0, 31, 12),
    billing,
    confirmed: true,
    ...patch,
  });
  const internal = (patch: Record<string, unknown> = {}) => ({
    vendorId: null,
    vendorName: "GitHub",
    serviceName: "Team",
    accountLabel: "Echipă sintetică",
    accountEmail: "team@example.test",
    workspaceLabel: "Org sintetică",
    responsibleUserId: "staff",
    status: "active",
    billingType: "recurring",
    billingCycle: "monthly",
    amountMinor: 2000,
    currency: "USD",
    nextBillingDate: Date.UTC(2027, 0, 31, 12),
    autoRenewal: true,
    notes: "Evidență sintetică",
    ...patch,
  });
  const create = async (patch: Record<string, unknown> = {}) => {
    const r = await request(
      "/api/admin/client-subscriptions",
      allocation(patch),
    );
    expect(r.status).toBe(200);
    return r.json();
  };
  const count = (table: string) =>
    Number(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n);
  it("allocates using existing CRM/project/service records and exposes only the correct client account", async () => {
    const value = await create();
    expect(count("subscriptions")).toBe(1);
    expect(count("services")).toBe(1);
    expect(count("projects")).toBe(2);
    expect(count("billing_subscriptions")).toBe(0);
    const r = await request("/api/admin/client-subscriptions");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    const data = await r.json();
    expect(data.data[0]).toMatchObject({
      id: value.id,
      account_count: 1,
      billingClientMatches: true,
      billing: { taxId: "SYNTHETIC" },
      periods: [],
    });
    actor = "a";
    const own = await (await request("/api/workspace/subscriptions")).json();
    expect(own.data).toHaveLength(1);
    expect(own.data[0]).toMatchObject({
      id: value.id,
      billing_ready: true,
      price_cents: 12345,
      payment_terms_days: 10,
    });
    expect(own.data[0]).not.toHaveProperty("billing");
    actor = "b";
    expect(
      (await (await request("/api/workspace/subscriptions")).json()).data,
    ).toEqual([]);
    actor = "a";
    db.exec("DELETE FROM client_account_access WHERE user_id='a'");
    expect(
      (await (await request("/api/workspace/subscriptions")).json()).data,
    ).toEqual([]);
  });
  it("creates a future client once, preserves retries and waits for a verified account", async () => {
    const body = allocation({
      clientId: null,
      newClient: {
        companyName: "Client viitor",
        contactName: "Contact",
        email: "future@example.test",
        phone: "",
      },
      accountId: null,
      projectId: null,
    });
    const key = "future-client-allocation-key";
    const first = await request(
      "/api/admin/client-subscriptions",
      body,
      "POST",
      key,
    );
    expect(first.status).toBe(200);
    const made = await first.json();
    expect(
      await (
        await request("/api/admin/client-subscriptions", body, "POST", key)
      ).json(),
    ).toEqual(made);
    expect(count("clients")).toBe(3);
    expect(count("users")).toBe(6);
    db.prepare("UPDATE users SET email=?,email_verified=0 WHERE id=?").run(
      "future@example.test",
      "b",
    );
    actor = "b";
    expect(
      (await (await request("/api/workspace/subscriptions")).json()).data,
    ).toEqual([]);
    db.exec("UPDATE users SET email_verified=1 WHERE id='b'");
    expect(
      (await (await request("/api/workspace/subscriptions")).json()).data.map(
        (s) => s.id,
      ),
    ).toEqual([made.id]);
  });
  it("rejects wrong beneficiaries, staff accounts, missing data and unknown plans", async () => {
    for (const patch of [
      { projectId: "pb" },
      { accountId: "staff" },
      { specifications: {} },
      { planSku: "invented-plan" },
      { billing: { ...billing, taxId: "" } },
      { externalUrl: "javascript:alert(1)" },
      { confirmed: false },
    ])
      expect(
        (await request("/api/admin/client-subscriptions", allocation(patch)))
          .status,
      ).toBeGreaterThanOrEqual(400);
    expect(count("subscriptions")).toBe(0);
  });
  it("rechecks roles before reads or an idempotent replay", async () => {
    const body = allocation(),
      key = "allocation-role-revocation";
    expect(
      (await request("/api/admin/client-subscriptions", body, "POST", key))
        .status,
    ).toBe(200);
    actor = "staff";
    expect((await request("/api/admin/client-subscriptions")).status).toBe(403);
    expect(
      (await request("/api/admin/client-subscriptions", body, "POST", key))
        .status,
    ).toBe(403);
    actor = "a";
    expect((await request("/api/internal/subscriptions")).status).toBe(403);
    expect(
      (await request("/api/internal/subscriptions", internal())).status,
    ).toBe(403);
  });
  it("prepares one financial draft per month without issuing, sending, charging or inventing tax", async () => {
    const s = await create(),
      key = "prepare-monthly-invoice-fixture",
      date = allocation().nextBillingDate;
    const prep = (revision: number, billingDate: number, k = key) =>
      request(
        `/api/admin/client-subscriptions/${s.id}/prepare-invoice`,
        { revision, billingDate, confirmed: true },
        "POST",
        k,
      );
    const r = await prep(1, date);
    expect(r.status).toBe(200);
    const value = await r.json();
    expect((await prep(1, date)).status).toBe(200);
    expect((await prep(1, date, "new-key-same-period")).status).toBe(200);
    expect(count("financial_revenues")).toBe(1);
    expect(count("subscription_invoice_periods")).toBe(1);
    expect(count("billing_subscriptions")).toBe(0);
    expect(count("billing_invoices")).toBe(0);
    const revenue = db
      .prepare("SELECT * FROM financial_revenues WHERE id=?")
      .get(value.id)!;
    expect(revenue).toMatchObject({
      client_id: "ca",
      status: "draft",
      invoice_number: null,
      gross_amount_minor: 12345,
      net_amount_minor: null,
      vat_amount_minor: null,
      payment_date: null,
    });
    const next = Date.UTC(2027, 1, 28, 12);
    expect(
      db
        .prepare(
          "SELECT next_billing_date,revision FROM subscriptions WHERE id=?",
        )
        .get(s.id),
    ).toMatchObject({ next_billing_date: next, revision: 2 });
    expect((await prep(2, next, "prepare-second-month")).status).toBe(200);
    expect(
      db
        .prepare("SELECT next_billing_date FROM subscriptions WHERE id=?")
        .get(s.id)!.next_billing_date,
    ).toBe(Date.UTC(2027, 2, 31, 12));
  });
  it("requires MFA and financial permission to prepare invoices and rejects paused subscriptions", async () => {
    const s = await create(),
      body = {
        revision: 1,
        billingDate: allocation().nextBillingDate,
        confirmed: true,
      },
      path = `/api/admin/client-subscriptions/${s.id}/prepare-invoice`;
    mfa = false;
    expect((await request(path, body)).status).toBe(403);
    mfa = true;
    actor = "admin";
    expect((await request(path, body)).status).toBe(403);
    actor = "owner";
    db.prepare("UPDATE subscriptions SET status='paused' WHERE id=?").run(s.id);
    expect((await request(path, body)).status).toBe(409);
    expect(count("financial_revenues")).toBe(0);
  });
  it("keeps calendar anchors during billing-only edits and detects beneficiary changes", async () => {
    const s = await create(),
      next = Date.UTC(2027, 1, 28, 12);
    db.prepare("UPDATE subscriptions SET next_billing_date=? WHERE id=?").run(
      next,
      s.id,
    );
    const loaded = (
      await (await request("/api/admin/client-subscriptions")).json()
    ).data[0].billing;
    expect(loaded).not.toHaveProperty("clientId");
    const update = await request(
      `/api/admin/client-subscriptions/${s.id}/billing`,
      {
        revision: 1,
        billing: { ...loaded, address: "Adresă actualizată" },
        nextBillingDate: next,
        status: "active",
      },
      "PUT",
    );
    expect(update.status).toBe(200);
    expect(
      db
        .prepare(
          "SELECT anchor_day FROM subscription_billing_settings WHERE subscription_id=?",
        )
        .get(s.id)!.anchor_day,
    ).toBe(31);
    db.prepare("UPDATE projects SET client_id=? WHERE id=?").run("cb", "pa");
    db.prepare("UPDATE subscriptions SET client_id=? WHERE id=?").run(
      "cb",
      s.id,
    );
    expect(
      (
        await request(
          `/api/admin/client-subscriptions/${s.id}/prepare-invoice`,
          { revision: 2, billingDate: next, confirmed: true },
        )
      ).status,
    ).toBe(409);
  });
  it("rolls back a concurrent revision change and preserves the original invoice history", async () => {
    const s = await create();
    beforeBatch = () =>
      db
        .prepare("UPDATE subscriptions SET revision=revision+1 WHERE id=?")
        .run(s.id);
    expect(
      (
        await request(
          `/api/admin/client-subscriptions/${s.id}/prepare-invoice`,
          {
            revision: 1,
            billingDate: allocation().nextBillingDate,
            confirmed: true,
          },
        )
      ).status,
    ).toBe(409);
    expect(count("financial_revenues")).toBe(0);
    expect(count("subscription_invoice_periods")).toBe(0);
  });
  it("rejects a beneficiary change racing with invoice preparation or allocation", async () => {
    const s = await create();
    beforeBatch = () => {
      db.prepare("UPDATE projects SET client_id=? WHERE id=?").run("cb", "pa");
      db.prepare("UPDATE subscriptions SET client_id=? WHERE id=?").run(
        "cb",
        s.id,
      );
    };
    expect(
      (
        await request(
          `/api/admin/client-subscriptions/${s.id}/prepare-invoice`,
          {
            revision: 1,
            billingDate: allocation().nextBillingDate,
            confirmed: true,
          },
        )
      ).status,
    ).toBe(409);
    expect(count("financial_revenues")).toBe(0);
    db.prepare("UPDATE projects SET client_id=? WHERE id=?").run("ca", "pa");
    db.prepare("UPDATE subscriptions SET client_id=? WHERE id=?").run(
      "ca",
      s.id,
    );
    beforeBatch = () =>
      db.prepare("UPDATE projects SET client_id=? WHERE id=?").run("cb", "pa");
    expect(
      (
        await request(
          "/api/admin/client-subscriptions",
          allocation({ name: "Alt abonament" }),
        )
      ).status,
    ).toBe(409);
    expect(count("services")).toBe(1);
    expect(count("subscriptions")).toBe(1);
  });
  it("rolls back every dependent entity if allocation audit fails", async () => {
    const old = { clients: count("clients"), projects: count("projects") };
    db.exec(
      "CREATE TRIGGER fail_subscription_audit BEFORE INSERT ON security_events WHEN NEW.action='subscription.client.allocated' BEGIN SELECT RAISE(ABORT,'audit_unavailable'); END",
    );
    expect(
      (
        await request(
          "/api/admin/client-subscriptions",
          allocation({
            clientId: null,
            newClient: {
              companyName: "Rollback client",
              contactName: "",
              email: "rollback@example.test",
              phone: "",
            },
            accountId: null,
            projectId: null,
          }),
        )
      ).status,
    ).toBe(500);
    expect(count("clients")).toBe(old.clients);
    expect(count("projects")).toBe(old.projects);
    expect(count("subscriptions")).toBe(0);
  });
  it("prevents duplicate allocations with different retry keys without orphan services", async () => {
    await create();
    expect(
      (await request("/api/admin/client-subscriptions", allocation())).status,
    ).toBe(409);
    expect(count("subscriptions")).toBe(1);
    expect(count("services")).toBe(1);
  });
  it("uses financial expenses for internal accounts and strips financial/private fields for staff", async () => {
    const r = await request("/api/internal/subscriptions", internal());
    expect(r.status).toBe(200);
    const s = await r.json();
    const expense = db
      .prepare("SELECT * FROM financial_expenses WHERE id=?")
      .get(s.id)!;
    expect(expense).toMatchObject({
      account_label: "Echipă sintetică",
      gross_amount_minor: 2000,
      currency: "USD",
    });
    actor = "staff";
    const response = await request("/api/internal/subscriptions");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json(),
      item = body.data.find((x) => x.id === s.id);
    expect(body.canManage).toBe(false);
    expect(item.account_label).toBe("Echipă sintetică");
    for (const field of [
      "gross_amount_minor",
      "currency",
      "account_email",
      "notes",
      "auto_renewal",
    ])
      expect(item).not.toHaveProperty(field);
    actor = "a";
    expect((await request("/api/internal/subscriptions")).status).toBe(403);
  });
  it("allows authorized internal records under the explicit disabled policy while retaining client isolation", async () => {
    mfa = false;
    mfaPolicy = "false";
    const response = await request("/api/internal/subscriptions", internal(), "POST", "internal-explicit-disabled-policy");
    expect(response.status).toBe(200);
    const saved = await response.json();
    expect(db.prepare("SELECT id FROM financial_expenses WHERE id=?").get(saved.id)).toBeTruthy();
    actor = "a";
    expect((await request("/api/internal/subscriptions", internal(), "POST", "client-explicit-disabled-policy")).status).toBe(403);
  });
  it("enforces MFA, idempotency and optimistic concurrency for internal accounts", async () => {
    const b = internal(),
      key = "internal-subscription-fixture";
    mfa = false;
    expect(
      (await request("/api/internal/subscriptions", b, "POST", key)).status,
    ).toBe(403);
    mfa = true;
    const value = await (
      await request("/api/internal/subscriptions", b, "POST", key)
    ).json();
    expect(
      await (
        await request("/api/internal/subscriptions", b, "POST", key)
      ).json(),
    ).toEqual(value);
    expect(
      (
        await request(
          "/api/internal/subscriptions",
          { ...b, serviceName: "Different" },
          "POST",
          key,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          "/api/internal/subscriptions/" + value.id,
          { ...b, revision: 1, accountLabel: "Actualizat" },
          "PUT",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/api/internal/subscriptions/" + value.id,
          { ...b, revision: 1 },
          "PUT",
        )
      ).status,
    ).toBe(409);
    db.prepare("UPDATE financial_expenses SET description=? WHERE id=?").run(
      "Editare din Financiar",
      value.id,
    );
    expect(
      (
        await request(
          "/api/internal/subscriptions/" + value.id,
          { ...b, revision: 2 },
          "PUT",
        )
      ).status,
    ).toBe(409);
  });
  it("does not overwrite historical tax, invoice or paid amounts from the minimal editor", async () => {
    const s = await (
      await request("/api/internal/subscriptions", internal())
    ).json();
    db.prepare(
      "UPDATE financial_expenses SET net_amount_minor=1500,vat_amount_minor=500,invoice_number='SYNTHETIC' WHERE id=?",
    ).run(s.id);
    expect(
      (
        await request(
          "/api/internal/subscriptions/" + s.id,
          internal({ amountMinor: 3000, revision: 2 }),
          "PUT",
        )
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare(
          "SELECT net_amount_minor,vat_amount_minor,gross_amount_minor FROM financial_expenses WHERE id=?",
        )
        .get(s.id),
    ).toMatchObject({
      net_amount_minor: 1500,
      vat_amount_minor: 500,
      gross_amount_minor: 2000,
    });
    expect(
      (
        await request(
          "/api/internal/subscriptions/" + s.id,
          internal({ accountLabel: "Nume actualizat", revision: 2 }),
          "PUT",
        )
      ).status,
    ).toBe(200);
  });
  it("rejects invalid free/active account states and client-linked finance expenses", async () => {
    for (const patch of [
      { status: "free", amountMinor: null },
      { status: "active", nextBillingDate: null },
      { responsibleUserId: "a" },
      { billingCycle: null },
    ])
      expect(
        (await request("/api/internal/subscriptions", internal(patch))).status,
      ).toBe(400);
    const s = await (
      await request("/api/internal/subscriptions", internal())
    ).json();
    db.prepare("UPDATE financial_expenses SET client_id=? WHERE id=?").run(
      "ca",
      s.id,
    );
    expect(
      (
        await request(
          "/api/internal/subscriptions/" + s.id,
          internal({ revision: 2 }),
          "PUT",
        )
      ).status,
    ).toBe(404);
  });
  it("clamps monthly dates without losing anchors, including leap years", () => {
    expect(nextSubscriptionMonth(Date.UTC(2028, 0, 31, 12), 31)).toBe(
      Date.UTC(2028, 1, 29, 12),
    );
    expect(nextSubscriptionMonth(Date.UTC(2028, 1, 29, 12), 31)).toBe(
      Date.UTC(2028, 2, 31, 12),
    );
    expect(nextSubscriptionMonth(Date.UTC(2027, 11, 31, 12), 31)).toBe(
      Date.UTC(2028, 0, 31, 12),
    );
  });
});
