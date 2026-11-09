// @vitest-environment node
import { createRequire } from "node:module";
import {
  readdirSync,
  readFileSync,
  mkdtempSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync as Sqlite, SQLInputValue } from "node:sqlite";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "vitest";
import { Hono } from "hono";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
import { leadsAgencyRouter } from "../../cloudflare/workers/api/src/leadsAgency";
import { leadsRouter } from "../../cloudflare/workers/api/src/leads";
import { filterNotifications } from "../../cloudflare/workers/api/src/notificationPolicy";
import { newAgencyOpportunity } from "./leads-agency-fixture";
import { AGENCY_CHECKS } from "../shared/agency/model";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: Sqlite,
    readonly sql: string,
    readonly count: () => void,
  ) {}
  bind(...values: SQLInputValue[]) {
    this.values = values;
    return this;
  }
  async first<T>() {
    this.count();
    return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null;
  }
  async all<T>() {
    this.count();
    return { results: this.db.prepare(this.sql).all(...this.values) as T[] };
  }
  async run() {
    this.count();
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
describe("Leads Agency native routes with transactional D1-compatible SQLite", () => {
  const folder = mkdtempSync(join(tmpdir(), "avyron-agency-test-"));
  beforeAll(() => {
    const base = new DatabaseSync(join(folder, "base.sqlite"));
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      base.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
    base.close();
  });
  afterAll(() => rmSync(folder, { recursive: true, force: true }));
  let db: Sqlite,
    app: Hono<AppBindings>,
    env: Env,
    actor: string,
    queries: number,
    beforeBatch: (() => void) | null;
  const grant = (user: string, cap: string) =>
    db
      .prepare(
        "INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES(?,?,?,'owner','fixture',1)",
      )
      .run(crypto.randomUUID(), user, cap);
  beforeEach(() => {
    const file = join(folder, "test-" + crypto.randomUUID() + ".sqlite");
    copyFileSync(join(folder, "base.sqlite"), file);
    db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys=ON");
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["super", "avyrontech@gmail.com", "admin"],
      ["admin", "other-admin@example.test", "admin"],
      ["staff", "agency-staff@example.test", "staff"],
      ["reader", "agency-reader@example.test", "staff"],
      ["client-a", "client-a@example.test", "user"],
      ["client-b", "client-b@example.test", "user"],
      ["operator", "operator@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,email_verified,display_name,created_at,updated_at) VALUES(?,?, 'fixture',1,?,1,1)",
      ).run(id, email, id);
      db.prepare("INSERT INTO user_roles(user_id,role) VALUES(?,?)").run(
        id,
        role,
      );
    }
    for (const cap of [
      "leads_agency.read",
      "leads_agency.manage",
      "leads.read",
      "leads.create",
    ])
      grant("staff", cap);
    grant("reader", "leads_agency.read");
    db.exec(
      "INSERT INTO clients(id,company_name,email,created_at) VALUES('client-a','Client A','a@example.test',1),('client-b','Client B','b@example.test',1)",
    );
    queries = 0;
    beforeBatch = null;
    actor = "owner";
    const DB = {
      prepare: (sql: string) => new Statement(db, sql, () => queries++),
      batch: async (statements: Statement[]) => {
        const hook = beforeBatch;
        beforeBatch = null;
        hook?.();
        db.exec("BEGIN");
        try {
          const results = [];
          for (const s of statements) results.push(await s.run());
          db.exec("COMMIT");
          return results;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    };
    env = { DB, MFA_AUTH_ENABLED: "false" } as unknown as Env;
    app = new Hono<AppBindings>();
    app.use("*", async (c, next) => {
      c.set("userId", actor);
      c.set(
        "roles",
        db
          .prepare("SELECT role FROM user_roles WHERE user_id=?")
          .all(actor)
          .map((r) => r.role) as ("user" | "staff" | "admin")[],
      );
      c.set("requestId", "fixture-request");
      await next();
    });
    app.route("/", leadsAgencyRouter);
    app.route("/", leadsRouter);
  });
  afterEach(() => db.close());
  const req = (
    path: string,
    method = "GET",
    body?: unknown,
    key = crypto.randomUUID(),
  ) =>
    app.request(
      "http://localhost/api/leads-agency" + path,
      {
        method,
        headers: { "content-type": "application/json", "Idempotency-Key": key },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      env,
    );
  async function create(
    input = newAgencyOpportunity(),
    key = crypto.randomUUID(),
  ) {
    const r = await req("/opportunities", "POST", { input }, key);
    const b = await r.json();
    expect(r.status, JSON.stringify(b)).toBe(201);
    return (b as { id: string }).id;
  }
  async function detail(id: string) {
    const r = await req("/opportunities/" + id);
    expect(r.status).toBe(200);
    return (await r.json()) as {
      opportunity: ReturnType<typeof newAgencyOpportunity> & {
        revision: number;
        leadId: string | null;
      };
      entries: { id: string }[];
      margin: { complete: boolean; estimatedNetMinor: number | null };
    };
  }
  const platform = (extra: Record<string, unknown> = {}) => ({
    revision: 0,
    status: "unregistered",
    category: "free",
    profileUrl: "",
    ownerId: null,
    notes: "",
    nextReview: "",
    checks: Object.fromEntries(
      Object.keys(AGENCY_CHECKS).map((k) => [k, false]),
    ),
    verificationNote: "",
    evidenceUrls: [],
    ...extra,
  });
  const verified = (category = "free") =>
    platform({
      status: "active",
      category,
      checks: Object.fromEntries(
        Object.keys(AGENCY_CHECKS).map((k) => [k, true]),
      ),
      verificationNote: "Confirmare umană sintetică pentru testele locale.",
      evidenceUrls: ["https://example.test/verified-terms"],
    });
  it.each(["", "client-a", "client-b", "admin"])(
    "denies all private data to unauthorized actor %s",
    async (user) => {
      actor = user;
      for (const path of [
        "/bootstrap",
        "/reports",
        "/opportunities",
        "/opportunities/missing",
        "/platforms/infinum/history",
      ]) {
        const r = await req(path);
        expect(r.status).toBe(user ? 403 : 401);
        expect(r.headers.get("Cache-Control")).toContain("no-store");
        expect(await r.text()).not.toContain("Infinum");
      }
    },
  );
  it("does not let a client capability impersonate internal staff", async () => {
    grant("client-a", "leads_agency.manage");
    actor = "client-a";
    expect((await req("/bootstrap")).status).toBe(403);
  });
  it("shows nine real sources and zero activity without seeding records", async () => {
    queries = 0;
    const r = await req("/bootstrap");
    expect(r.status).toBe(200);
    const b = (await r.json()) as {
      platforms: { category: string }[];
      accounts: { status: string; opportunityCount: number }[];
    };
    expect(b.platforms).toHaveLength(9);
    expect(b.platforms.filter((p) => p.category === "free")).toHaveLength(5);
    expect(
      b.accounts.every(
        (a) => a.status === "unregistered" && a.opportunityCount === 0,
      ),
    ).toBe(true);
    expect(queries).toBeLessThan(35);
    expect(
      db.prepare("SELECT count(*) n FROM agency_opportunities").get()?.n,
    ).toBe(0);
  });
  it("persists source notes, verifies activation gates and detects concurrent edits", async () => {
    expect(
      (await req("/platforms/infinum", "PUT", platform({ status: "active" })))
        .status,
    ).toBe(400);
    const r = await req(
      "/platforms/infinum",
      "PUT",
      platform({ notes: "Notă reală de test", nextReview: "2026-12-01" }),
    );
    expect(r.status).toBe(200);
    expect(
      JSON.parse(
        String(
          db
            .prepare(
              "SELECT data_json FROM agency_platform_accounts WHERE platform_id='infinum'",
            )
            .get()?.data_json,
        ),
      ).notes,
    ).toBe("Notă reală de test");
    expect((await req("/platforms/infinum", "PUT", platform())).status).toBe(
      409,
    );
    beforeBatch = () =>
      db.exec(
        "UPDATE agency_platform_accounts SET revision=2 WHERE platform_id='infinum'",
      );
    expect(
      (
        await req(
          "/platforms/infinum",
          "PUT",
          platform({ revision: 1, notes: "stale" }),
        )
      ).status,
    ).toBe(409);
    expect(
      JSON.parse(
        String(
          db
            .prepare(
              "SELECT data_json FROM agency_platform_accounts WHERE platform_id='infinum'",
            )
            .get()?.data_json,
        ),
      ).notes,
    ).toBe("Notă reală de test");
  });
  it("keeps AgencyListed in review until all six human checks and evidence exist", async () => {
    expect(
      (await req("/platforms/agencylisted", "PUT", platform())).status,
    ).toBe(400);
    expect(
      (await req("/platforms/agencylisted", "PUT", verified())).status,
    ).toBe(200);
    expect(
      (await req("/platforms/breef", "PUT", verified("free"))).status,
    ).toBe(400);
  });
  it("rejects secret-bearing or unrelated profile links and unknown fields", async () => {
    expect(
      (
        await req(
          "/platforms/infinum",
          "PUT",
          platform({ profileUrl: "https://evil.example/profile" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await req(
          "/platforms/infinum",
          "PUT",
          platform({ password: "not-stored" }),
        )
      ).status,
    ).toBe(400);
  });
  it("replays creation and rejects changed payloads using the same idempotency key", async () => {
    const input = newAgencyOpportunity();
    const key = crypto.randomUUID();
    const id = await create(input, key);
    expect((await req("/opportunities", "POST", { input }, key)).status).toBe(
      201,
    );
    expect(
      (
        await req(
          "/opportunities",
          "POST",
          { input: { ...input, title: "Different" } },
          key,
        )
      ).status,
    ).toBe(409);
    expect(
      db.prepare("SELECT count(*) n FROM agency_opportunities").get()?.n,
    ).toBe(1);
    expect((await detail(id)).opportunity.title).toBe(input.title);
  });
  it("deduplicates the original request despite tracking parameters", async () => {
    await create(newAgencyOpportunity());
    expect(
      (
        await req("/opportunities", "POST", {
          input: {
            ...newAgencyOpportunity(),
            sourceUrl:
              "https://alliance.infinum.com/requests/test-1?utm_source=tracking",
          },
        })
      ).status,
    ).toBe(409);
    expect(
      db.prepare("SELECT count(*) n FROM agency_opportunities").get()?.n,
    ).toBe(1);
  });
  it("uses real service IDs and authorized client context", async () => {
    expect(
      (
        await req("/opportunities", "POST", {
          input: { ...newAgencyOpportunity(), serviceId: "invented" },
        })
      ).status,
    ).toBe(400);
    actor = "staff";
    expect(
      (
        await req("/opportunities", "POST", {
          input: { ...newAgencyOpportunity(), clientId: "client-b" },
        })
      ).status,
    ).toBe(400);
    actor = "owner";
    const id = await create({
      ...newAgencyOpportunity(),
      clientId: "client-b",
    });
    expect((await detail(id)).opportunity.clientId).toBe("client-b");
  });
  it("blocks offers from unvalidated sources and research cannot become a commercial win", async () => {
    expect(
      (
        await req("/opportunities", "POST", {
          input: {
            ...newAgencyOpportunity(),
            platformId: "agencylisted",
            sourceUrl: "",
            sourceReference: "brief-1",
            stage: "sent",
          },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req("/opportunities", "POST", {
          input: {
            ...newAgencyOpportunity(),
            kind: "funding",
            stage: "won",
            contractMinor: 10000,
          },
        })
      ).status,
    ).toBe(400);
  });
  it("keeps unconfirmed commission and Romania payout from becoming a sent offer", async () => {
    const input = {
      ...newAgencyOpportunity(),
      platformId: "unbench",
      sourceUrl: "",
      sourceReference: "deal-1",
      stage: "sent" as const,
      commissionBps: null,
    };
    expect((await req("/opportunities", "POST", { input })).status).toBe(400);
    expect(
      (await req("/platforms/unbench", "PUT", verified("success"))).status,
    ).toBe(200);
    const id = await create({
      ...input,
      commissionBps: 1200,
      commissionNote: "Condiție contractuală sintetică verificată.",
    });
    expect((await detail(id)).opportunity.commissionBps).toBe(1200);
  });
  it("creates one native lead and preserves original creation behavior", async () => {
    const id = await create({ ...newAgencyOpportunity(), stage: "qualified" });
    queries = 0;
    const r = await req(`/opportunities/${id}/transfer`, "POST", {
      revision: 1,
    });
    expect(r.status, await r.clone().text()).toBe(200);
    expect(queries).toBeLessThan(50);
    const lead = ((await r.json()) as { id: string }).id;
    expect(
      db.prepare("SELECT source FROM leads WHERE id=?").get(lead)?.source,
    ).toBe("agency:infinum");
    expect(
      (await req(`/opportunities/${id}/transfer`, "POST", { revision: 1 }))
        .status,
    ).toBe(200);
    expect(db.prepare("SELECT count(*) n FROM leads").get()?.n).toBe(1);
    expect(
      db
        .prepare("SELECT count(*) n FROM lead_assignments WHERE lead_id=?")
        .get(lead)?.n,
    ).toBe(1);
    expect((await detail(id)).opportunity.leadId).toBe(lead);
    const direct = await app.request(
      "http://localhost/api/leads",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          business: "Native lead",
          email: "native@example.test",
        }),
      },
      env,
    );
    expect(direct.status).toBe(201);
  });
  it("reuses an accessible native lead for another qualified request from the same contact", async () => {
    const a = await create({ ...newAgencyOpportunity(), stage: "qualified" });
    await req(`/opportunities/${a}/transfer`, "POST", { revision: 1 });
    const b = await create({
      ...newAgencyOpportunity(),
      sourceUrl: "https://alliance.infinum.com/requests/test-2",
      stage: "qualified",
    });
    const r = await req(`/opportunities/${b}/transfer`, "POST", {
      revision: 1,
    });
    expect(r.status).toBe(200);
    expect(db.prepare("SELECT count(*) n FROM leads").get()?.n).toBe(1);
    expect(
      db.prepare("SELECT count(*) n FROM agency_lead_links").get()?.n,
    ).toBe(2);
  });
  it("serializes concurrent handoffs through the unique transactional link", async () => {
    const id = await create({ ...newAgencyOpportunity(), stage: "qualified" });
    const results = await Promise.all([
      req(`/opportunities/${id}/transfer`, "POST", { revision: 1 }),
      req(`/opportunities/${id}/transfer`, "POST", { revision: 1 }),
    ]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(db.prepare("SELECT count(*) n FROM leads").get()?.n).toBe(1);
    expect(
      db.prepare("SELECT count(*) n FROM agency_lead_links").get()?.n,
    ).toBe(1);
  });
  it("never returns money to agency readers without finance permission", async () => {
    const id = await create({
      ...newAgencyOpportunity(),
      stage: "won",
      contractMinor: 100000,
      estimatedCostMinor: 10000,
    });
    expect(
      (
        await req(`/opportunities/${id}/entries`, "POST", {
          kind: "receipt",
          amountMinor: 100000,
          minutes: 0,
          reference: "PAY-1",
          note: "Încasare manuală sintetică",
          occurredOn: "2026-11-01",
        })
      ).status,
    ).toBe(201);
    actor = "staff";
    const b = await detail(id);
    expect(b.entries).toHaveLength(0);
    const reports = await req("/reports");
    const report = (await reports.json()) as {
      financeVisible: boolean;
      data: { currencies: unknown[] }[];
    };
    expect(report.financeVisible).toBe(false);
    expect(report.data.every((r) => r.currencies.length === 0)).toBe(true);
    expect(
      (
        await req(`/opportunities/${id}/entries`, "POST", {
          kind: "receipt",
          amountMinor: 100,
          minutes: 0,
          reference: "PAY-2",
          note: "No permission",
          occurredOn: "2026-11-01",
        })
      ).status,
    ).toBe(403);
  });
  it("reports cash, costs, time and currencies without a fabricated free score", async () => {
    const id = await create({
      ...newAgencyOpportunity(),
      stage: "won",
      contractMinor: 100000,
      estimatedCostMinor: 10000,
    });
    for (const [kind, amountMinor, minutes, reference] of [
      ["receipt", 90000, 0, "PAY-1"],
      ["commission", 10000, 0, "COM-1"],
      ["delivery_cost", 20000, 0, "COST-1"],
      ["time", 0, 90, "WORK-1"],
    ]) {
      const r = await req(`/opportunities/${id}/entries`, "POST", {
        kind,
        amountMinor,
        minutes,
        reference,
        note: "Dovadă sintetică pentru test",
        occurredOn: "2026-11-01",
      });
      expect(r.status, await r.clone().text()).toBe(201);
    }
    const report = (await (await req("/reports")).json()) as {
      data: {
        platformId: string;
        won: number;
        minutes: number;
        currencies: { cashNet: number; contracts: number }[];
      }[];
    };
    const row = report.data.find((r) => r.platformId === "infinum")!;
    expect(row.won).toBe(1);
    expect(row.minutes).toBe(90);
    expect(row.currencies[0]).toMatchObject({
      cashNet: 60000,
      contracts: 100000,
    });
    expect(JSON.stringify(report)).not.toMatch(/score|rating/);
  });
  it("keeps a manually validated free source free after promotion", async () => {
    expect(
      (await req("/platforms/agencylisted", "PUT", verified())).status,
    ).toBe(200);
    const input = {
      ...newAgencyOpportunity(),
      platformId: "agencylisted",
      sourceUrl: "https://agencylisted.com/brief/test",
      commissionBps: 1000,
      commissionNote: "Comision explicit consemnat",
    };
    expect((await req("/opportunities", "POST", { input })).status).toBe(400);
    expect(
      (
        await req("/opportunities", "POST", {
          input: { ...input, commissionBps: 0 },
        })
      ).status,
    ).toBe(201);
  });
  it("allows a manager to correct time without granting financial access", async () => {
    const id = await create(newAgencyOpportunity());
    actor = "staff";
    const r = await req(`/opportunities/${id}/entries`, "POST", {
      kind: "time",
      amountMinor: 0,
      minutes: 45,
      reference: "TIME-CORRECT",
      note: "Activitate sintetică",
      occurredOn: "2026-11-01",
    });
    expect(r.status).toBe(201);
    const eid = ((await r.json()) as { id: string }).id;
    expect(
      (
        await req(`/entries/${eid}/void`, "POST", {
          reason: "Corecție durată activitate",
        })
      ).status,
    ).toBe(200);
    expect(
      db.prepare("SELECT voided_at FROM agency_entries WHERE id=?").get(eid)
        ?.voided_at,
    ).toBeTruthy();
    const future = await req(`/opportunities/${id}/entries`, "POST", {
      kind: "time",
      amountMinor: 0,
      minutes: 45,
      reference: "TIME-FUTURE",
      note: "Nu este activitate efectuată",
      occurredOn: "2099-01-01",
    });
    expect(future.status).toBe(400);
  });
  it("keeps separate currency totals and refuses rounded aggregate money", async () => {
    await create({
      ...newAgencyOpportunity(),
      stage: "won",
      contractMinor: 100000,
    });
    const euro = await create({
      ...newAgencyOpportunity(),
      sourceUrl: "https://alliance.infinum.com/requests/eur",
      currency: "EUR",
      stage: "won",
      contractMinor: 25000,
    });
    const result = await req("/reports");
    expect(result.status).toBe(200);
    const report = (await result.json()) as {
      data: {
        platformId: string;
        currencies: { currency: string; contracts: number }[];
      }[];
    };
    const totals = report.data.find(
      (r) => r.platformId === "infinum",
    )!.currencies;
    expect(totals.map((r) => [r.currency, r.contracts]).sort()).toEqual([
      ["EUR", 25000],
      ["RON", 100000],
    ]);
    // Simulate imported/legacy aggregate beyond the exact JS range. Never silently round.
    db.prepare(
      "UPDATE agency_opportunities SET contract_minor=? WHERE id=?",
    ).run(9007199254740992, euro);
    expect((await req("/reports")).status).toBe(503);
  });
  it("retains voided entries and removes them from cash totals", async () => {
    const id = await create({
      ...newAgencyOpportunity(),
      stage: "won",
      contractMinor: 100000,
    });
    const r = await req(`/opportunities/${id}/entries`, "POST", {
      kind: "receipt",
      amountMinor: 10000,
      minutes: 0,
      reference: "PAY-1",
      note: "Dovadă de test",
      occurredOn: "2026-11-01",
    });
    const eid = ((await r.json()) as { id: string }).id;
    expect(
      (
        await req(`/entries/${eid}/void`, "POST", {
          reason: "Corecție documentată",
        })
      ).status,
    ).toBe(200);
    expect(db.prepare("SELECT count(*) n FROM agency_entries").get()?.n).toBe(
      1,
    );
    expect(
      db.prepare("SELECT void_reason FROM agency_entries WHERE id=?").get(eid)
        ?.void_reason,
    ).toBe("Corecție documentată");
  });
  it("read-only staff cannot mutate and revocation takes effect immediately", async () => {
    actor = "reader";
    expect((await req("/bootstrap")).status).toBe(200);
    expect((await req("/platforms/infinum", "PUT", platform())).status).toBe(
      403,
    );
    db.exec("UPDATE user_capabilities SET revoked_at=1 WHERE user_id='reader'");
    expect((await req("/bootstrap")).status).toBe(403);
  });
  it("archives reversibly without deleting source or financial history", async () => {
    const id = await create();
    expect(
      (
        await req(`/opportunities/${id}/archive`, "POST", {
          revision: 1,
          archived: true,
          reason: "Monitorizare pe termen lung",
        })
      ).status,
    ).toBe(200);
    expect(
      ((await (await req("/opportunities")).json()) as { total: number }).total,
    ).toBe(0);
    expect(
      (
        (await (await req("/opportunities?archived=1")).json()) as {
          total: number;
        }
      ).total,
    ).toBe(1);
    expect(
      (
        await req(`/opportunities/${id}/archive`, "POST", {
          revision: 2,
          archived: false,
          reason: "Reluare oportunitate",
        })
      ).status,
    ).toBe(200);
    expect(
      db.prepare("SELECT count(*) n FROM agency_opportunities").get()?.n,
    ).toBe(1);
  });
  it("restores only authorized context into the native document generator", async () => {
    const id = await create({
      ...newAgencyOpportunity(),
      clientId: "client-a",
    });
    const r = await req(`/opportunities/${id}/document-context`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      clientId: "client-a",
      name: "Business Test",
      projectName: "Website B2B de test",
    });
    actor = "staff";
    expect((await req(`/opportunities/${id}/document-context`)).status).toBe(
      403,
    );
  });
  it("allows an explicitly bound agent to read, never to apply or mutate", async () => {
    grant("operator", "leads_agency.read");
    actor = "operator";
    expect((await req("/bootstrap")).status).toBe(403);
    db.exec(
      "INSERT INTO agent_operator_bindings(user_id,project_id,agent_slug,operator_role,status,permissions_json,synced_at) VALUES('operator','aip_avyron_web','leads','lead_operator','active','[]',1)",
    );
    expect((await req("/bootstrap")).status).toBe(200);
    expect(
      (await req("/opportunities", "POST", { input: newAgencyOpportunity() }))
        .status,
    ).toBe(403);
    db.exec(
      "UPDATE agent_operator_bindings SET status='revoked' WHERE user_id='operator'",
    );
    expect((await req("/bootstrap")).status).toBe(403);
  });
  it("revalidates native notification visibility after capability revocation", async () => {
    const id = await create({ ...newAgencyOpportunity(), ownerId: "reader" });
    const notices = db
      .prepare("SELECT * FROM operation_notifications WHERE user_id='reader'")
      .all() as unknown as Parameters<typeof filterNotifications>[3];
    expect(notices).toHaveLength(1);
    expect(
      await filterNotifications(env.DB, "reader", ["staff"], notices),
    ).toHaveLength(1);
    db.exec("UPDATE user_capabilities SET revoked_at=1 WHERE user_id='reader'");
    expect(
      await filterNotifications(env.DB, "reader", ["staff"], notices),
    ).toHaveLength(0);
    expect(id).toBeTruthy();
  });
});
