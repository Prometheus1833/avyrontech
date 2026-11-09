import {projectsRouter} from "../../cloudflare/workers/api/src/projects";
import { retrievePublicSources } from "../../cloudflare/workers/api/src/knowledgeRetrieval";
// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SQLite, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { websiteSubscriptionsRouter } from "../../cloudflare/workers/api/src/websiteSubscriptions";
import {
  recordWebsitePeriod,
  confirmWebsiteCheckout,
  syncWebsiteSubscriptionStatus,
  expectedMonthlyEnd,
  reconcileWebsiteBilling,
} from "../../cloudflare/workers/api/src/websiteSubscriptionBilling";
import { recordPaidOrder,billingRouter } from "../../cloudflare/workers/api/src/billing";
import { websiteOrderAuthorized } from "../../cloudflare/workers/api/src/websiteSubscriptionBilling";
import {
  defaultWebsitePlans,
  type WebsitePlan,
} from "../shared/websiteSubscriptions";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
let db: SQLite, app: Hono<AppBindings>, env: Env, actor: string;
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly sql: string) {}
  bind(...v: SQLInputValue[]) {
    this.values = v;
    return this;
  }
  async first() {
    return db.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return { meta: db.prepare(this.sql).run(...this.values) };
  }
}
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync("cloudflare/d1/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
  for (const [id, email, role] of [
    ["owner", "prometheus@avyron.ro", "admin"],
    ["admin", "ordinary-admin@example.test", "admin"],
    ["staff", "staff@example.test", "staff"],
    ["a", "a@example.test", "user"],
    ["b", "b@example.test", "user"],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,'synthetic',1,1,1)",
    ).run(id, email);
    db.prepare("INSERT INTO user_roles(user_id,role) VALUES(?,?)").run(
      id,
      role,
    );
  }
  db.exec(
    "INSERT INTO clients(id,company_name,email,created_at,access_managed) VALUES('ca','Client A','a@example.test',1,1),('cb','Client B','b@example.test',1,1)",
  );
  env = {
    APP_ENV: "preview",
    STRIPE_SECRET_KEY: "sk_test_synthetic",
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
    STRIPE_ACCOUNT_ID: "acct_synthetic",
    DB: {
      prepare: (s: string) => new Statement(s),
      batch: async (st: Statement[]) => {
        db.exec("BEGIN");
        try {
          const results = [];
          for (const s of st) results.push(await s.run());
          db.exec("COMMIT");
          return results;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
    PUBLIC_API_RATE_LIMITER: { limit: async () => ({ success: true }) },
  } as unknown as Env;
  actor = "owner";
  app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("userId", actor);
    c.set(
      "roles",
      actor === "owner" || actor === "admin"
        ? ["admin"]
        : actor === "staff"
          ? ["staff"]
          : ["user"],
    );
    await next();
  });
  app.onError((e, c) => c.json({ error: e.message }, 500));
  app.route("/", websiteSubscriptionsRouter);
  app.route("/",projectsRouter);
  app.route("/",billingRouter);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "https://api.stripe.com/v1/account")
        return Response.json({ id: "acct_synthetic", charges_enabled: true });
      throw Error("Unexpected outbound request");
    }),
  );
});
afterEach(() => {
  db.close();
  vi.unstubAllGlobals();
});
const call = (path: string, method = "GET", value?: unknown, key?: string) =>
  app.request(
    "https://avyron.ro/api/website-subscriptions/" + path,
    {
      method,
      headers: {
        "content-type": "application/json",
        ...(key ? { "Idempotency-Key": key } : {}),
        "cf-connecting-ip": "192.0.2.11",
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    },
    env,
  );
const brief = {
  planId: "start",
  company: "Client sintetic",
  industry: "Consultanță",
  objectives: "Prezentare servicii și contact",
  name: "Client sintetic",
  email: "client@example.test",
  phone: "",
  website: "",
  consent: true,
  lang: "ro",
  token: "",
  trap: "",
};
async function configure() {
  const p = defaultWebsitePlans()[0];
  const value = {
    revision: 1,
    priceMinor: 10000,
    currency: "RON",
    vatBasisPoints: 0,
    taxVerified: true,
    reviewed: true,
    terms:
      "Termeni sintetici utilizați numai în teste. Abonamentul lunar este contra cost, fără taxă separată de dezvoltare și fără obligații implicite.",
    cancellation:
      "Anularea și continuarea se confirmă explicit înainte de activare.",
    emailPolicy: p.emailPolicy,
    pages: p.pages,
    changes: p.changes,
    buttons: p.buttons,
    emails: p.emails,
    tagline: p.tagline,
    features: p.features,
  };
  const r = await call("internal/plans/start", "PUT", value);
  expect(await r.clone().json()).toMatchObject({ ok: true });
  expect(r.status).toBe(200);
  return value;
}
async function allocate(
  requestId: string | null = null,
  key = crypto.randomUUID(),
) {
  actor = "owner";
  const value = {
    key,
    requestId,
    clientId: "ca",
    newClient: null,
    accountId: "a",
    planId: "start",
    name: "Website sintetic",
    staffIds: ["staff"],
    confirmed: true,
  };
  const r = await call("internal/allocate", "POST", value);
  const b = (await r.json()) as { projectId: string; error?: unknown };
  expect(b.error).toBeUndefined();
  expect(r.status).toBeLessThan(300);
  return { ...value, projectId: b.projectId };
}
function periodStart(monthOffset = 0) {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + monthOffset, 1, 12);
}
async function paid(
  projectId: string,
  monthOffset = 0,
  invoiceId = "in_synthetic",
) {
  db.prepare(
    "UPDATE website_subscription_projects SET provider_subscription_id=? WHERE project_id=?",
  ).run("sub_synthetic", projectId);
  const start = periodStart(monthOffset);
  await recordWebsitePeriod(env, {
    subscriptionId: "sub_synthetic",
    invoiceId,
    startsAt: start,
    endsAt: expectedMonthlyEnd(start, 1),
    amountMinor: 10000,
    currency: "RON",
  });
  db.exec("UPDATE subscriptions SET status='active'");
  return String(
    db
      .prepare(
        "SELECT id FROM website_subscription_periods WHERE provider_invoice_id=?",
      )
      .get(invoiceId)!.id,
  );
}
it("publishes no invented tariff and records one native lead/notice for repeated or concurrent submissions", async () => {
  const plans = (await (await call("plans")).json()) as { data: WebsitePlan[] };
  expect(plans.data).toHaveLength(3);
  expect(plans.data.every((p) => p.priceMinor === null && !p.available)).toBe(
    true,
  );
  const key = crypto.randomUUID();
  const first = await call("requests", "POST", brief, key);
  expect(await first.clone().json()).toHaveProperty("reference");
  expect(first.status).toBe(201);
  expect((await call("requests", "POST", brief, key)).status).toBe(200);
  expect(
    (await call("requests", "POST", { ...brief, company: "Different" }, key))
      .status,
  ).toBe(409);
  expect(
    db
      .prepare(
        "SELECT count(*) n FROM leads WHERE source='website-subscription'",
      )
      .get()!.n,
  ).toBe(1);
  expect(
    db
      .prepare(
        "SELECT count(*) n FROM operation_notifications WHERE deduplication_key LIKE 'website-request:%'",
      )
      .get()!.n,
  ).toBe(1);
  expect(
    (
      await call(
        "requests",
        "POST",
        { ...brief, consent: false },
        crypto.randomUUID(),
      )
    ).status,
  ).toBe(400);
});
it("allocates the real CRM, account, service, subscription, staff and work items without charging", async () => {
  const p = await allocate();
  expect(
    db
      .prepare("SELECT count(*) n FROM project_work_items WHERE project_id=?")
      .get(p.projectId)!.n,
  ).toBe(5);
  expect(
    db
      .prepare(
        "SELECT count(*) n FROM client_account_access WHERE client_id='ca' AND user_id='a'",
      )
      .get()!.n,
  ).toBe(1);
  expect(db.prepare("SELECT count(*) n FROM commerce_orders").get()!.n).toBe(0);
  expect(
    db
      .prepare(
        "SELECT status FROM subscriptions WHERE id=(SELECT subscription_id FROM website_subscription_projects WHERE project_id=?)",
      )
      .get(p.projectId)!.status,
  ).toBe("paused");
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  actor = "a";
  const projects = (await (await call("account/projects")).json()) as {
    data: Record<string, unknown>[];
  };
  expect(projects.data).toHaveLength(1);
  expect(projects.data[0]).not.toHaveProperty("allocation_key");
  expect(projects.data[0]).not.toHaveProperty("allocation_hash");
  actor = "b";
  expect((await call("account/projects/" + p.projectId)).status).toBe(404);
  expect(await (await call("account/projects")).json()).toMatchObject({
    data: [],
  });
  actor = "staff";
  expect((await call("account/projects/" + p.projectId)).status).toBe(200);
  db.prepare("DELETE FROM project_staff WHERE project_id=?").run(p.projectId);
  expect((await call("account/projects/" + p.projectId)).status).toBe(404);
  actor="a";
  db.exec("DELETE FROM client_account_access WHERE client_id='ca' AND user_id='a'");
  expect((await call("account/projects/"+p.projectId)).status).toBe(404);
  expect((await (await call("account/projects")).json()).data).toEqual([]);
  const native=await app.request("https://avyron.ro/api/projects",{},env);
  expect((await native.json()).data.some((r:{id:string})=>r.id===p.projectId)).toBe(false);
  const slug=db.prepare("SELECT slug FROM projects WHERE id=?").get(p.projectId)!.slug;
  expect((await app.request("https://avyron.ro/api/projects/"+slug,{},env)).status).toBe(403);
});
it("does not recreate projects on retry or allow two allocations from the same lead", async () => {
  const request = (await (
    await call("requests", "POST", brief, crypto.randomUUID())
  ).json()) as { reference: string };
  const p = await allocate(request.reference);
  const { projectId, ...same } = p;
  expect((await call("internal/allocate", "POST", same)).status).toBe(200);
  expect(
    (
      await call("internal/allocate", "POST", {
        ...same,
        key: crypto.randomUUID(),
      })
    ).status,
  ).toBe(409);
  expect(
    db.prepare("SELECT count(*) n FROM website_subscription_projects").get()!.n,
  ).toBe(1);
  expect(
    db
      .prepare(
        "SELECT converted_project_id FROM leads WHERE id=(SELECT lead_id FROM website_subscription_requests WHERE id=?)",
      )
      .get(request.reference)!.converted_project_id,
  ).toBe(projectId);
});
it("keeps ordinary admins and clients out of configuration and allocation", async () => {
  actor = "admin";
  expect((await call("internal/options")).status).toBe(403);
  actor = "a";
  expect((await call("internal/allocate", "POST", {})).status).toBe(403);
  expect((await call("internal/plans/start", "PUT", {})).status).toBe(403);
});
it("requires approved configuration, exact terms revision and native billing details before checkout", async () => {
  const p = await allocate();
  actor = "a";
  expect(
    (
      await call("account/projects/" + p.projectId + "/checkout", "POST", {
        revision: 1,
        accepted: true,
        provider: "stripe",
      })
    ).status,
  ).toBe(409);
  actor = "owner";
  await configure();
  actor = "a";
  expect(
    (
      await call("account/projects/" + p.projectId + "/checkout", "POST", {
        revision: 1,
        accepted: true,
        provider: "stripe",
      })
    ).status,
  ).toBe(409);
  actor = "owner";
  expect(
    (
      await call("internal/projects/" + p.projectId + "/plan", "POST", {
        revision: 1,
        planId: "start",
        confirmed: true,
      })
    ).status,
  ).toBe(200);
  actor = "a";
  expect(
    (
      await call("account/projects/" + p.projectId + "/checkout", "POST", {
        revision: 1,
        accepted: true,
        provider: "stripe",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await call("account/projects/" + p.projectId + "/checkout", "POST", {
        revision: 2,
        accepted: false,
        provider: "stripe",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await call("account/projects/" + p.projectId + "/checkout", "POST", {
        revision: 2,
        accepted: true,
        provider: "stripe",
      })
    ).status,
  ).toBe(409);
  expect(db.prepare("SELECT count(*) n FROM commerce_orders").get()!.n).toBe(0);
});
it("preserves plan history and rejects changed catalog pricing until it is reviewed again", async () => {
  await configure();
  const p = await allocate();
  expect(() =>
    db.exec(
      "UPDATE website_subscription_plan_versions SET config_json='{}' WHERE plan_id='start' AND revision=1",
    ),
  ).toThrow("immutable_plan");
  db.exec(
    "UPDATE commercial_catalog_codes SET base_price_minor=20000 WHERE entity_key='website-sub-start'",
  );
  const plans = (await (await call("plans")).json()) as { data: WebsitePlan[] };
  expect(plans.data.find((p) => p.id === "start")!.available).toBe(false);
  actor = "a";
  const row = (await (
    await call("account/projects/" + p.projectId)
  ).json()) as { data: { plan: WebsitePlan } };
  expect(row.data.plan.priceMinor).toBe(10000);
});
it("uses immutable invoice-specific, non-overlapping monthly periods with an anchored month-end", async () => {
  await configure();
  const p = await allocate();
  await paid(p.projectId);
  await paid(p.projectId);
  expect(
    db.prepare("SELECT count(*) n FROM website_subscription_periods").get()!.n,
  ).toBe(1);
  const start = periodStart();
  await expect(
    recordWebsitePeriod(env, {
      subscriptionId: "sub_synthetic",
      invoiceId: "in_wrong",
      startsAt: start + 86400000,
      endsAt: expectedMonthlyEnd(start + 86400000, 1),
      amountMinor: 10000,
      currency: "EUR",
    }),
  ).rejects.toThrow();
  expect(expectedMonthlyEnd(Date.UTC(2026, 0, 31, 8), 31)).toBe(
    Date.UTC(2026, 1, 28, 8),
  );
  expect(expectedMonthlyEnd(Date.UTC(2026, 1, 28, 8), 31)).toBe(
    Date.UTC(2026, 2, 31, 8),
  );
  expect(() => db.exec("DELETE FROM website_subscription_periods")).toThrow(
    "immutable_paid_period",
  );
});
it("shares triage with native project proposals and counts content only once, never security/bugs", async () => {
  await configure();
  const p = await allocate();
  await paid(p.projectId);
  actor = "a";
  const key = crypto.randomUUID(),
    value = {
      key,
      title: "Conținut sintetic",
      description: "Actualizează pagina serviciilor",
      kind: "content",
    };
  expect(
    (await call("account/projects/" + p.projectId + "/changes", "POST", value))
      .status,
  ).toBe(201);
  expect(
    (await call("account/projects/" + p.projectId + "/changes", "POST", value))
      .status,
  ).toBe(200);
  expect(
    (
      await call("account/projects/" + p.projectId + "/changes", "POST", {
        ...value,
        kind: "security",
      })
    ).status,
  ).toBe(409);
  const id = String(
    db.prepare("SELECT proposal_id FROM website_subscription_changes").get()!
      .proposal_id,
  );
  expect(() =>
    db.prepare("UPDATE project_proposals SET status='done' WHERE id=?").run(id),
  ).toThrow("website_change_review_required");
  actor = "staff";
  expect(
    (
      await call("account/changes/" + id, "PATCH", {
        kind: "content",
        units: 4,
        status: "done",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await call("account/changes/" + id, "PATCH", {
        kind: "content",
        units: 3,
        status: "done",
      })
    ).status,
  ).toBe(200);
  expect(
    db
      .prepare("SELECT sum(units) n FROM website_subscription_consumption")
      .get()!.n,
  ).toBe(3);
  const t = Date.now();
  db.prepare(
    "INSERT INTO project_proposals(id,project_id,author_id,title,description,status,created_at,updated_at) VALUES('native-proposal',?,'a','Defect','Bug sintetic','proposed',?,?)",
  ).run(p.projectId, t, t);
  expect(
    db
      .prepare(
        "SELECT kind FROM website_subscription_changes WHERE proposal_id='native-proposal'",
      )
      .get()!.kind,
  ).toBe("content");
  expect(
    (
      await call("account/changes/native-proposal", "PATCH", {
        kind: "security",
        units: 1,
        status: "done",
      })
    ).status,
  ).toBe(200);
  expect(
    db
      .prepare("SELECT sum(units) n FROM website_subscription_consumption")
      .get()!.n,
  ).toBe(3);
  expect(
    (
      await call("account/changes/" + id, "PATCH", {
        kind: "bug",
        units: 1,
        status: "done",
      })
    ).status,
  ).toBe(409);
});
it("requires client approval before marking a website launched", async () => {
  await configure();
  const p = await allocate();
  const value = {
    revision: 1,
    stage: "live",
    domain: "example.test",
    update: "Pregătit pentru lansare",
  };
  expect(
    (await call("internal/projects/" + p.projectId, "PATCH", value)).status,
  ).toBe(409);
  expect(
    (
      await call("internal/projects/" + p.projectId, "PATCH", {
        ...value,
        stage: "testing",
      })
    ).status,
  ).toBe(200);
  actor = "a";
  expect(
    (
      await call("account/projects/" + p.projectId + "/approve", "POST", {
        revision: 2,
        confirmed: true,
      })
    ).status,
  ).toBe(200);
  actor = "owner";
  expect(
    (
      await call("internal/projects/" + p.projectId, "PATCH", {
        ...value,
        revision: 2,
        stage: "testing",
      })
    ).status,
  ).toBe(200);
  actor = "a";
  expect(
    (
      await call("account/projects/" + p.projectId + "/approve", "POST", {
        revision: 2,
        confirmed: true,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await call("account/projects/" + p.projectId + "/approve", "POST", {
        revision: 3,
        confirmed: true,
      })
    ).status,
  ).toBe(200);
  actor = "owner";
  expect(
    (
      await call("internal/projects/" + p.projectId, "PATCH", {
        ...value,
        revision: 3,
      })
    ).status,
  ).toBe(200);
  expect(
    db.prepare("SELECT status FROM projects WHERE id=?").get(p.projectId)!
      .status,
  ).toBe("live");
});
it("offers transition only after twelve verified monthly periods and never changes the product automatically", async () => {
  await configure();
  const p = await allocate();
  actor = "a";
  expect(
    (await call("account/projects/" + p.projectId + "/transition", "POST", {}))
      .status,
  ).toBe(409);
  for (let i = -11; i <= 0; i++)
    await paid(p.projectId, i, "in_month" + String(i + 11));
  actor = "a";
  expect(
    (await call("account/projects/" + p.projectId + "/transition", "POST", {}))
      .status,
  ).toBe(200);
  expect(
    db
      .prepare("SELECT count(*) n FROM project_updates WHERE id=?")
      .get("website-transition-" + p.projectId)!.n,
  ).toBe(1);
  expect(
    db.prepare("SELECT plan_id FROM website_subscription_projects").get()!
      .plan_id,
  ).toBe("start");
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("pins checkout verification to its paid invoice rather than a newer unpaid invoice", async () => {
  await configure();
  const p = await allocate();
  const orderId = crypto.randomUUID(),
    snapshot = JSON.parse(
      String(
        db
          .prepare(
            "SELECT plan_snapshot_json FROM website_subscription_projects",
          )
          .get()!.plan_snapshot_json,
      ),
    ) as WebsitePlan;
  const items = JSON.stringify([
    { sku: snapshot.sku, type: "subscription", period: "monthly" },
  ]);
  db.prepare(
    "INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,status,created_at,updated_at) VALUES(?,'a',?,10000,10000,'RON','paid',1,1)",
  ).run(orderId, items);
  db.prepare(
    "UPDATE website_subscription_projects SET current_order_id=? WHERE project_id=?",
  ).run(orderId, p.projectId);
  db.prepare(
    "INSERT INTO website_subscription_acceptances(order_id,project_id,user_id,plan_id,plan_revision,terms_hash,terms_snapshot_json,accepted_at,buyer_snapshot_json) VALUES(?,?,'a','start',2,'synthetic',?,1,?)",
  ).run(
    orderId,
    p.projectId,
    JSON.stringify(snapshot),
    JSON.stringify({
      name: "Client A",
      address: "Adresă sintetică",
      email: "a@example.test",
      clientId: "ca",
    }),
  );
  const start = periodStart();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/subscriptions/")
        ? Response.json({
            id: "sub_synthetic",
            status: "active",
            metadata: { order_id: orderId, user_id: "a" },
            latest_invoice: "in_unpaid",
          })
        : Response.json({
            id: "in_initial",
            status: "paid",
            subscription: "sub_synthetic",
            amount_paid: 10000,
            currency: "ron",
            lines: {
              data: [
                {
                  period: {
                    start: start / 1000,
                    end: expectedMonthlyEnd(start, 1) / 1000,
                  },
                },
              ],
            },
          }),
    ),
  );
  const order = {
    id: orderId,
    user_id: "a",
    items_json: items,
    total_cents: 10000,
    currency: "RON",
  };
  await confirmWebsiteCheckout(env, order, "sub_synthetic", "in_initial");
  expect(
    db
      .prepare("SELECT provider_invoice_id FROM website_subscription_periods")
      .get()!.provider_invoice_id,
  ).toBe("in_initial");
  expect(
    vi
      .mocked(fetch)
      .mock.calls.every(([url]) => !String(url).includes("in_unpaid")),
  ).toBe(true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        id: "sub_synthetic",
        status: "canceled",
        metadata: { order_id: orderId },
      }),
    ),
  );
  await syncWebsiteSubscriptionStatus(env, "sub_synthetic");
  expect(
    db
      .prepare(
        "SELECT status FROM subscriptions WHERE id=(SELECT subscription_id FROM website_subscription_projects)",
      )
      .get()!.status,
  ).toBe("cancelled");
  // Existing billing reconciliation repairs a missed renewal without granting
  // active access to a subscription that is currently cancelled at Stripe.
  db.prepare(
    "INSERT INTO billing_subscriptions(id,user_id,order_id,provider,provider_subscription_id,sku,status,period,amount_minor,currency,created_at,updated_at) VALUES('bs','a',?,'stripe','sub_synthetic','AVY-WEB-SUB-START','cancelled','monthly',10000,'RON',1,1)",
  ).run(orderId);
  db.prepare("INSERT INTO website_subscription_orders VALUES(?,?,?)").run(
    orderId,
    p.projectId,
    orderId,
  );
  const next = expectedMonthlyEnd(start, 1);
  const renewal = {
    id: "in_renewal",
    status: "paid",
    subscription: "sub_synthetic",
    billing_reason: "subscription_cycle",
    amount_paid: 10000,
    currency: "ron",
    lines: {
      data: [
        {
          period: {
            start: next / 1000,
            end: expectedMonthlyEnd(next, 1) / 1000,
          },
        },
      ],
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/subscriptions/")
        ? Response.json({
            id: "sub_synthetic",
            status: "canceled",
            metadata: { order_id: orderId },
          })
        : Response.json({ data: [renewal], has_more: false }),
    ),
  );
  const fulfill = async (
    id: string,
    reference: string,
    subscriptionId: string,
  ) => {
    const order = db
      .prepare("SELECT * FROM commerce_orders WHERE id=?")
      .get(id) as unknown as Parameters<typeof recordPaidOrder>[1]["order"];
    return recordPaidOrder(env, {
      provider: "stripe",
      providerReference: reference,
      order,
      subscriptionId,
    });
  };
  await reconcileWebsiteBilling(env, fulfill);
  await reconcileWebsiteBilling(env, fulfill);
  expect(
    db.prepare("SELECT count(*) n FROM website_subscription_periods").get()!.n,
  ).toBe(2);
  expect(db.prepare("SELECT count(*) n FROM financial_revenues").get()!.n).toBe(
    1,
  );
  expect(
    db.prepare("SELECT client_id,project_id FROM financial_revenues").get(),
  ).toMatchObject({ client_id: "ca", project_id: p.projectId });
  expect(db.prepare("SELECT status FROM subscriptions").get()!.status).toBe(
    "cancelled",
  );
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/subscriptions/")
        ? Response.json({
            id: "sub_synthetic",
            status: "canceled",
            metadata: { order_id: orderId },
          })
        : Response.json({
            data: [{ ...renewal, id: "in_wrong", amount_paid: 5000 }],
            has_more: false,
          }),
    ),
  );
  await reconcileWebsiteBilling(env, fulfill);
  expect(db.prepare("SELECT count(*) n FROM financial_revenues").get()!.n).toBe(
    1,
  );
  expect(logged).toHaveBeenCalledWith(
    expect.stringContaining("provider_or_ledger_verification_failed"),
  );
  logged.mockRestore();
});

it("creates one native checkout with explicit buyer acceptance and blocks the same SKU through an unrelated order", async () => {
  await configure();
  const p = await allocate();
  actor = "a";
  const buyer = {
    entityType: "company",
    legalName: "Client A legal",
    taxId: "TEST-CUI-A",
    address: "Adresă sintetică A",
    invoiceEmail: "a@example.test",
    paymentTermsDays: 0,
  };
  expect(
    (await call("account/projects/" + p.projectId + "/billing", "PUT", buyer))
      .status,
  ).toBe(200);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/account"))
        return Response.json({ id: "acct_synthetic", charges_enabled: true });
      if (url.endsWith("/customers"))
        return Response.json({ id: "cus_synthetic" });
      if (url.endsWith("/checkout/sessions")) {
        const fields = init?.body as URLSearchParams;
        expect(fields.get("mode")).toBe("subscription");
        expect(fields.get("line_items[0][price_data][unit_amount]")).toBe(
          "10000",
        );
        return Response.json({
          id: "cs_synthetic",
          url: "https://checkout.stripe.com/c/pay/synthetic",
        });
      }
      throw Error("Unexpected request");
    }),
  );
  const request = { revision: 2, accepted: true, provider: "stripe" };
  const r = await call(
    "account/projects/" + p.projectId + "/checkout",
    "POST",
    request,
  );
  expect(await r.clone().json()).toMatchObject({
    url: "https://checkout.stripe.com/c/pay/synthetic",
  });
  expect(r.status).toBeLessThan(300);
  expect(
    (
      await call(
        "account/projects/" + p.projectId + "/checkout",
        "POST",
        request,
      )
    ).status,
  ).toBeLessThan(300);
  expect(db.prepare("SELECT count(*) n FROM commerce_orders").get()!.n).toBe(1);
  expect(() =>
    db.exec(
      "UPDATE services SET price=999 WHERE id=(SELECT service_id FROM subscriptions WHERE id=(SELECT subscription_id FROM website_subscription_projects))",
    ),
  ).toThrow(/website_accepted_plan_immutable/);
  expect(() =>
    db.exec("UPDATE website_subscription_projects SET plan_snapshot_json='{}'"),
  ).toThrow(/website_accepted_plan_immutable/);
  const nativeOrderId=String(db.prepare("SELECT id FROM commerce_orders LIMIT 1").get()!.id);
  const wrongProvider=await app.request("https://avyron.ro/api/billing/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({orderId:nativeOrderId,provider:"revolut"})},env);
  expect(wrongProvider.status).toBe(409);
  expect((await wrongProvider.json()).error.code).toBe("website_subscription_provider_required");
  const receipt = db
    .prepare("SELECT buyer_snapshot_json FROM website_subscription_acceptances")
    .get()!;
  expect(JSON.parse(String(receipt.buyer_snapshot_json))).toMatchObject({
    name: "Client A legal",
    clientId: "ca",
    taxId: "TEST-CUI-A",
  });
  expect(
    (
      await call("account/projects/" + p.projectId + "/billing", "PUT", {
        ...buyer,
        legalName: "Changed",
      })
    ).status,
  ).toBe(409);
  expect(
    await websiteOrderAuthorized(env, {
      id: crypto.randomUUID(),
      user_id: "a",
      items_json: JSON.stringify([
        {
          sku: "AVY-WEB-SUB-START",
          type: "subscription",
          period: "monthly",
          quantity: 1,
        },
      ]),
      total_cents: 10000,
      currency: "RON",
    }),
  ).toBe(false);
  const order = db
    .prepare("SELECT * FROM commerce_orders LIMIT 1")
    .get() as unknown as Parameters<typeof recordPaidOrder>[1]["order"];
  await recordPaidOrder(env, {
    provider: "stripe",
    providerReference: "pi_synthetic",
    order,
  });
  expect(
    db
      .prepare(
        "SELECT client_id,project_id FROM financial_revenues WHERE stripe_reference=?",
      )
      .get("pi_synthetic"),
  ).toMatchObject({ client_id: "ca", project_id: p.projectId });
});
it("does not allow a saved legal identity for another company to replace the beneficiary", async () => {
  const p = await allocate();
  db.prepare(
    "INSERT INTO client_legal_profiles(client_id,entity_type,legal_name,tax_id,address,updated_by,updated_at) VALUES('ca','company','Client A legal','TEST-CUI-A','Adresă A','owner',1)",
  ).run();
  actor = "a";
  expect(
    (
      await call("account/projects/" + p.projectId + "/billing", "PUT", {
        entityType: "company",
        legalName: "Client B",
        taxId: "TEST-CUI-B",
        address: "Adresă sintetică B",
        invoiceEmail: "b@example.test",
        paymentTermsDays: 0,
      })
    ).status,
  ).toBe(409);
  actor = "b";
  expect(
    (await call("account/projects/" + p.projectId + "/billing", "GET")).status,
  ).toBe(404);
});
it("can explicitly allocate an account after creating a future-client project, before any agreement or payment", async () => {
  const value = {
    key: crypto.randomUUID(),
    requestId: null,
    clientId: null,
    newClient: {
      companyName: "Client viitor",
      email: "future@example.test",
      contactName: "Contact viitor",
      phone: "",
    },
    accountId: null,
    planId: "start",
    name: "Website viitor",
    staffIds: [],
    confirmed: true,
  };
  const response = await call("internal/allocate", "POST", value);
  const p = (await response.json()) as { projectId: string };
  expect(response.status).toBe(201);
  expect(
    (
      await call("internal/projects/" + p.projectId + "/account", "POST", {
        accountId: "a",
        revision: 1,
        confirmed: true,
      })
    ).status,
  ).toBe(200);
  actor = "a";
  const detail = (await (
    await call("account/projects/" + p.projectId)
  ).json()) as { data: { canSubscribe: boolean } };
  expect(detail.data.canSubscribe).toBe(true);
});

it("keeps subscription discovery contextual and never invents an unapproved monthly price", async () => {
  const generic = await retrievePublicSources(
    env.DB,
    "ro",
    "Cât costă un site?",
  );
  expect(generic[0].entry.id).toBe("service:premium-website");
  const monthly = await retrievePublicSources(
    env.DB,
    "ro",
    "Vreau un website prin abonament",
  );
  expect(monthly[0].entry.id).toBe("service:website-subscription");
  expect(monthly[0].entry.answer).toContain(
    "abonamentul lunar este contra cost",
  );
  expect(monthly[0].entry.answer).toContain("solicită oferta lunară");
  expect(monthly[0].entry.answer).not.toContain("100 RON");
  await configure();
  const approved = await retrievePublicSources(
    env.DB,
    "ro",
    "Vreau un website prin abonament",
  );
  expect(approved[0].entry.answer).toContain("100 RON / lună");
});
