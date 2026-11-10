import { futureLeadHasAssignment } from "../../cloudflare/workers/api/src/futureLeadPolicy";
// @vitest-environment node
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAgencyBackend,
  closeAgencySchemas,
  type AgencyBackend,
} from "../../e2e/fixtures/leadsAgencyBackend";
import {
  bucharestDay,
  futureReminderOffset,
  futureLeadInput,
  type FutureLeadInput,
  type FutureLeadRow,
} from "../shared/futureLeads";
import { runFutureLeadReminders } from "../../cloudflare/workers/api/src/futureLeadReminders";
import {
  filterNotifications,
  type StoredNotice,
} from "../../cloudflare/workers/api/src/notificationPolicy";
import { internalApi } from "../shared/securityBoundary";
import { SECTIONS, canOpenSection, buildAccess } from "../lib/access";
const day = (offset: number, time = Date.now()) =>
  new Date(Date.parse(bucharestDay(time)) + offset * 86400000)
    .toISOString()
    .slice(0, 10);
export const newFutureLead = (): FutureLeadInput => ({
  title: "Website programat",
  name: "Client Test",
  business: "Firma Test",
  email: "future@example.test",
  phone: "0722123456",
  source: "Recomandare",
  requirements: "Website de prezentare cu formular și integrare CRM.",
  contactOn: day(15),
  projectKind: "website_prezentare",
  clientId: null,
  staffIds: ["reader"],
});
describe("Future leads: native CRM, project conversion and scheduled private notices", () => {
  let b: AgencyBackend;
  beforeEach(() => {
    b = createAgencyBackend();
    b.db.exec(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES('super','avyrontech@gmail.com','synthetic',1,1,1),('other','other@example.test','synthetic',1,1,1); INSERT INTO user_roles(user_id,role) VALUES('super','admin'),('other','staff'); INSERT INTO clients(id,company_name,email,created_at) VALUES('client-a','Companie existentă','existent@example.test',1)",
    );
  });
  afterEach(() => b.close());
  afterAll(closeAgencySchemas);
  const req = (
    path: string,
    method = "GET",
    body?: unknown,
    key = crypto.randomUUID(),
  ) =>
    b.request("/api/future-leads" + path, {
      method,
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  async function create(input = newFutureLead(), key = crypto.randomUUID()) {
    const r = await req("", "POST", { input }, key);
    const json = await r.json();
    expect(r.status, JSON.stringify(json)).toBe(201);
    return (json as { id: string }).id;
  }
  async function detail(id: string) {
    const r = await req("/" + id);
    expect(r.status).toBe(200);
    return ((await r.json()) as { data: FutureLeadRow }).data;
  }
  it("positions the new section beside the existing two, with no client access", () => {
    const i = SECTIONS.findIndex((s) => s.id === "leads-agency");
    expect(SECTIONS[i + 1].id).toBe("future-leads");
    expect(
      canOpenSection("future-leads", buildAccess({ roles: ["staff"] })),
    ).toBe(false);
    expect(
      canOpenSection(
        "future-leads",
        buildAccess({
          roles: ["staff"],
          capabilities: ["leads.future.assigned"],
        }),
      ),
    ).toBe(true);
    expect(
      canOpenSection("future-leads", buildAccess({ roles: ["user"] })),
    ).toBe(false);
  });
  it("creates one native CRM lead, source and allocations; lists chronologically and searches requirements", async () => {
    const later = await create();
    const nearer = await create({
      ...newFutureLead(),
      email: "second@example.test",
      phone: "0733123456",
      contactOn: day(2),
      title: "Magazin prioritar",
    });
    const r = await req("");
    const rows = ((await r.json()) as { data: FutureLeadRow[] }).data;
    expect(rows.map((r) => r.lead_id)).toEqual([nearer, later]);
    expect(rows[0].source).toBe("Recomandare");
    expect(rows[0].staff.map((s) => s.id)).toEqual(["reader"]);
    expect(
      (
        b.db.prepare("SELECT count(*) total FROM leads").get() as {
          total: number;
        }
      ).total,
    ).toBe(2);
    expect(
      ((await (await req("?q=integrare")).json()) as { data: unknown[] }).data,
    ).toHaveLength(2);
    expect(b.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("enforces 500 characters, real dates, explicit source, staff and client identities", async () => {
    for (const input of [
      { ...newFutureLead(), requirements: "x".repeat(501) },
      { ...newFutureLead(), source: "" },
      { ...newFutureLead(), contactOn: "2027-02-31" },
      { ...newFutureLead(), contactOn: day(-1) },
      { ...newFutureLead(), staffIds: ["client"] },
      { ...newFutureLead(), clientId: "unknown" },
    ])
      expect((await req("", "POST", { input })).status).toBeGreaterThanOrEqual(
        400,
      );
    expect(
      futureLeadInput.safeParse({
        ...newFutureLead(),
        requirements: "x".repeat(500),
      }).success,
    ).toBe(true);
    expect(b.db.prepare("SELECT count(*) total FROM leads").get()?.total).toBe(
      0,
    );
  });
  it("is idempotent and rejects reuse of a key with changed scheduling data", async () => {
    const key = crypto.randomUUID(),
      input = newFutureLead();
    const id = await create(input, key);
    expect(await create(input, key)).toBe(id);
    expect(
      (await req("", "POST", { input: { ...input, contactOn: day(20) } }, key))
        .status,
    ).toBe(409);
    expect(b.db.prepare("SELECT count(*) total FROM leads").get()?.total).toBe(
      1,
    );
  });
  it("denies clients, unassigned staff, removed allocations and disabled identities", async () => {
    const id = await create();
    expect(await futureLeadHasAssignment(b.env.DB, "reader")).toBe(true);
    expect(await futureLeadHasAssignment(b.env.DB, "other")).toBe(false);
    expect(await futureLeadHasAssignment(b.env.DB, "client")).toBe(false);
    b.actor = "client";
    expect((await req("")).status).toBe(403);
    expect((await req("/" + id)).status).toBe(403);
    b.actor = "other";
    expect((await req("/" + id)).status).toBe(404);
    expect(
      ((await (await req("")).json()) as { data: unknown[] }).data,
    ).toEqual([]);
    b.actor = "reader";
    expect((await detail(id)).can_edit).toBe(true);
    b.db
      .prepare(
        "DELETE FROM lead_assignments WHERE lead_id=? AND user_id='reader'",
      )
      .run(id);
    expect((await req("/" + id)).status).toBe(404);
    b.db.exec("UPDATE users SET disabled_at=2 WHERE id='owner'");
    b.actor = "owner";
    expect((await req("")).status).toBe(403);
  });
  it("allocated staff can edit their record but cannot allocate others, create or convert", async () => {
    const id = await create();
    b.actor = "reader";
    let row = await detail(id);
    let input = { ...newFutureLead(), requirements: "Cerințe actualizate" };
    expect(
      (
        await req("/" + id, "PATCH", {
          input,
          revision: row.revision,
          status: "scheduled",
        })
      ).status,
    ).toBe(200);
    row = await detail(id);
    input = { ...input, staffIds: ["reader", "other"] };
    expect(
      (
        await req("/" + id, "PATCH", {
          input,
          revision: row.revision,
          status: "scheduled",
        })
      ).status,
    ).toBe(403);
    expect((await req("", "POST", { input })).status).toBe(403);
    expect(
      (
        await req("/" + id + "/convert", "POST", {
          revision: row.revision,
          stage: "proposed",
        })
      ).status,
    ).toBe(403);
  });
  it("revisions reject stale saves and stale conversions without creating orphan projects", async () => {
    const id = await create();
    const input = { ...newFutureLead(), title: "Revizie nouă" };
    expect(
      (
        await req("/" + id, "PATCH", {
          input,
          revision: 1,
          status: "scheduled",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req("/" + id, "PATCH", {
          input: { ...input, title: "Vechi" },
          revision: 1,
          status: "scheduled",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await req("/" + id + "/convert", "POST", {
          revision: 1,
          stage: "proposed",
        })
      ).status,
    ).toBe(409);
    expect(
      b.db.prepare("SELECT count(*) total FROM projects").get()?.total,
    ).toBe(0);
    expect((await detail(id)).title).toBe("Revizie nouă");
  });
  it("converts once to a native client project with preserved brief, contact, staff and source", async () => {
    const input = { ...newFutureLead(), clientId: "client-a" };
    const id = await create(input);
    const r = await req("/" + id + "/convert", "POST", {
      revision: 1,
      stage: "proposed",
    });
    expect(r.status).toBe(201);
    const project = (await r.json()) as { id: string };
    const stored = b.db
      .prepare("SELECT * FROM projects WHERE id=?")
      .get(project.id)!;
    expect(stored.client_id).toBe("client-a");
    expect(stored.description).toContain(input.requirements);
    expect(stored.description).toContain("Recomandare");
    expect(stored.description).toContain(input.phone);
    expect(stored.banner_status).toBe("proposed");
    expect(
      b.db
        .prepare(
          "SELECT role FROM project_staff WHERE project_id=? AND user_id='reader'",
        )
        .get(project.id)?.role,
    ).toBe("contributor");
    expect((await detail(id)).converted_project_id).toBe(project.id);
    expect(
      (
        await req("/" + id + "/convert", "POST", {
          revision: 1,
          stage: "proposed",
        })
      ).status,
    ).toBe(200);
    expect(
      b.db.prepare("SELECT count(*) total FROM projects").get()?.total,
    ).toBe(1);
    expect(
      (
        await req("/" + id, "PATCH", {
          input,
          revision: 2,
          status: "scheduled",
        })
      ).status,
    ).toBe(409);
    expect(b.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("schedules an existing CRM lead without copying it and stops old automated follow-ups", async () => {
    const input = newFutureLead();
    const r = await b.request("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        source: input.source,
      }),
    });
    expect(r.status).toBe(201);
    const { id } = (await r.json()) as { id: string };
    expect((await req("", "POST", { input, leadId: id })).status).toBe(201);
    expect((await req("", "POST", { input, leadId: id })).status).toBe(409);
    expect(b.db.prepare("SELECT count(*) total FROM leads").get()?.total).toBe(
      1,
    );
    expect(
      b.db
        .prepare(
          "SELECT lifecycle_stage,next_follow_up_at FROM leads WHERE id=?",
        )
        .get(id),
    ).toMatchObject({ lifecycle_stage: "accepted", next_follow_up_at: null });
  });
  it("rolls conversion back if the native lead changes during the transaction boundary", async () => {
    const id = await create();
    b.beforeBatch(() =>
      b.db
        .prepare("UPDATE leads SET updated_at=updated_at+1 WHERE id=?")
        .run(id),
    );
    expect(
      (
        await req("/" + id + "/convert", "POST", {
          revision: 1,
          stage: "proposed",
        })
      ).status,
    ).toBe(409);
    expect(
      b.db.prepare("SELECT count(*) total FROM projects").get()?.total,
    ).toBe(0);
    expect((await detail(id)).status).toBe("scheduled");
    expect(
      b.db
        .prepare(
          "SELECT count(*) total FROM future_lead_events WHERE lead_id=?",
        )
        .get(id)?.total,
    ).toBe(1);
  });
  it("never reuses another lead's project when a conversion key is repeated", async () => {
    const first = await create();
    const second = await create({
      ...newFutureLead(),
      email: "another@example.test",
      phone: "0733123456",
    });
    const key = crypto.randomUUID();
    expect(
      (
        await req(
          "/" + first + "/convert",
          "POST",
          { revision: 1, stage: "proposed" },
          key,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await req(
          "/" + second + "/convert",
          "POST",
          { revision: 1, stage: "proposed" },
          key,
        )
      ).status,
    ).toBe(409);
    expect((await detail(second)).converted_project_id).toBeNull();
    expect(
      b.db.prepare("SELECT count(*) total FROM projects").get()?.total,
    ).toBe(1);
  });
  it("lets allocated staff mark contact complete and resume reminders only by explicit rescheduling", async () => {
    const id = await create();
    b.actor = "reader";
    const input = newFutureLead();
    expect(
      (
        await req("/" + id, "PATCH", {
          input,
          revision: 1,
          status: "contacted",
        })
      ).status,
    ).toBe(200);
    expect((await reminders(id, 5)).created).toBe(0);
    expect(
      (
        await req("/" + id, "PATCH", {
          input: { ...input, contactOn: day(20) },
          revision: 2,
          status: "scheduled",
        })
      ).status,
    ).toBe(200);
    expect((await detail(id)).schedule_version).toBe(2);
  });
  it("rolls back an allocated staff save if allocation is revoked at commit", async () => {
    const id = await create();
    b.actor = "reader";
    b.beforeBatch(() =>
      b.db
        .prepare(
          "DELETE FROM lead_assignments WHERE lead_id=? AND user_id='reader'",
        )
        .run(id),
    );
    expect(
      (
        await req("/" + id, "PATCH", {
          input: { ...newFutureLead(), title: "Unauthorized change" },
          revision: 1,
          status: "scheduled",
        })
      ).status,
    ).toBe(409);
    b.actor = "owner";
    expect((await detail(id)).title).toBe("Website programat");
  });
  it("keeps creation and conversion within the free D1 query budget with 30 allocated staff", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => "team-" + i);
    for (const id of ids) {
      b.db
        .prepare(
          "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,'synthetic',1,1,1)",
        )
        .run(id, id + "@example.test");
      b.db
        .prepare("INSERT INTO user_roles(user_id,role) VALUES(?,'staff')")
        .run(id);
    }
    const before = b.queryCount;
    const id = await create({ ...newFutureLead(), staffIds: ids });
    expect(b.queryCount - before).toBeLessThan(50);
    expect(
      b.db
        .prepare("SELECT count(*) total FROM lead_assignments WHERE lead_id=?")
        .get(id)?.total,
    ).toBe(30);
    const conversionStart = b.queryCount;
    expect(
      (
        await req("/" + id + "/convert", "POST", {
          revision: 1,
          stage: "proposed",
        })
      ).status,
    ).toBe(201);
    expect(b.queryCount - conversionStart).toBeLessThan(50);
    expect(
      b.db.prepare("SELECT count(*) total FROM project_staff").get()?.total,
    ).toBe(31);
  });
  it("delivers 100-recipient batches through three D1 calls and resumes without duplicates", async () => {
    const ids = Array.from({ length: 30 }, (_, i) => "notify-" + i);
    for (const id of ids) {
      b.db
        .prepare(
          "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,'synthetic',1,1,1)",
        )
        .run(id, id + "@example.test");
      b.db
        .prepare("INSERT INTO user_roles(user_id,role) VALUES(?,'staff')")
        .run(id);
    }
    for (let n = 0; n < 4; n++)
      await create({
        ...newFutureLead(),
        email: `batch-${n}@example.test`,
        phone: "",
        staffIds: ids,
      });
    b.db
      .prepare("UPDATE future_leads SET contact_on=?,scheduled_at=?")
      .run(day(5), Date.parse(day(-20)));
    const time = Date.parse(bucharestDay() + "T10:00:00Z"),
      before = b.bindingCalls;
    expect((await runFutureLeadReminders(b.env, time)).created).toBe(100);
    expect(b.bindingCalls - before).toBe(3);
    expect((await runFutureLeadReminders(b.env, time)).created).toBe(28);
    expect((await runFutureLeadReminders(b.env, time)).created).toBe(0);
    expect(
      b.db.prepare("SELECT count(*) total FROM operation_notifications").get()
        ?.total,
    ).toBe(128);
  });
  it("revalidates each recipient inside the atomic notice batch and reports only inserts", async () => {
    const id = await create();
    b.beforeBatch(() =>
      b.db
        .prepare(
          "DELETE FROM lead_assignments WHERE lead_id=? AND user_id='reader'",
        )
        .run(id),
    );
    expect((await reminders(id, 5)).created).toBe(2);
    expect(
      b.db
        .prepare(
          "SELECT count(*) total FROM operation_notifications WHERE user_id='reader'",
        )
        .get()?.total,
    ).toBe(0);
  });
  it("retries a failed notification transaction without partial notices or duplicate deliveries", async () => {
    const id = await create();
    b.beforeBatch(() => {
      throw new Error("synthetic transient failure");
    });
    await expect(reminders(id, 5)).rejects.toThrow(
      "synthetic transient failure",
    );
    expect(
      b.db.prepare("SELECT count(*) total FROM operation_notifications").get()
        ?.total,
    ).toBe(0);
    expect((await reminders(id, 5)).created).toBe(3);
    expect((await reminders(id, 5)).created).toBe(0);
  });
  async function reminders(id: string, offset: number) {
    const today = bucharestDay();
    b.db
      .prepare(
        "UPDATE future_leads SET contact_on=?,scheduled_at=? WHERE lead_id=?",
      )
      .run(day(offset), Date.parse(day(-20)), id);
    const at = Date.parse(today + "T10:00:00Z");
    return runFutureLeadReminders(b.env, at);
  }
  async function feed(user: string) {
    const notices = b.db
      .prepare("SELECT * FROM operation_notifications WHERE user_id=?")
      .all(user) as StoredNotice[];
    return filterNotifications(
      b.env.DB,
      user,
      [user === "reader" ? "staff" : "admin"],
      notices,
    );
  }
  it("sends the three thresholds to Owner/Super Admin and allocated staff exactly once", async () => {
    const id = await create();
    for (const n of [10, 5, 1]) {
      await reminders(id, n);
      await reminders(id, n);
    }
    expect(
      b.db.prepare("SELECT count(*) total FROM operation_notifications").get()
        ?.total,
    ).toBe(9);
    for (const user of ["owner", "super", "reader"]) {
      expect(
        b.db
          .prepare(
            "SELECT count(*) total FROM operation_notifications WHERE user_id=?",
          )
          .get(user)?.total,
      ).toBe(3);
    }
    expect(
      b.db
        .prepare(
          "SELECT count(*) total FROM operation_notifications WHERE user_id IN('client','other')",
        )
        .get()?.total,
    ).toBe(0);
    expect(await feed("reader")).toHaveLength(3);
  });
  it("revokes notices immediately on reassignment, rescheduling, archiving or conversion", async () => {
    const id = await create();
    await reminders(id, 5);
    expect(await feed("reader")).toHaveLength(1);
    b.db
      .prepare(
        "DELETE FROM lead_assignments WHERE lead_id=? AND user_id='reader'",
      )
      .run(id);
    expect(await feed("reader")).toHaveLength(0);
    expect(await feed("owner")).toHaveLength(1);
    const row = await detail(id);
    const input = { ...newFutureLead(), staffIds: [], contactOn: day(12) };
    expect(
      (
        await req("/" + id, "PATCH", {
          input,
          revision: row.revision,
          status: "scheduled",
        })
      ).status,
    ).toBe(200);
    expect(await feed("owner")).toHaveLength(0);
    await reminders(id, 1);
    expect(await feed("owner")).toHaveLength(1);
    await req("/" + id, "PATCH", {
      input: { ...input, contactOn: day(1) },
      revision: 2,
      status: "archived",
    });
    expect(await feed("owner")).toHaveLength(0);
  });
  it("does not issue notices for archived/deleted/converted native leads", async () => {
    const id = await create();
    b.db.prepare("UPDATE leads SET archived_at=1 WHERE id=?").run(id);
    expect((await reminders(id, 5)).created).toBe(0);
    b.db
      .prepare("UPDATE leads SET archived_at=NULL,deleted_at=1 WHERE id=?")
      .run(id);
    expect((await reminders(id, 5)).created).toBe(0);
  });
});
describe("Romanian business dates and threshold catch-up", () => {
  it("keeps future lead APIs inside the existing administrative host boundary", () => {
    expect(internalApi("/api/future-leads")).toBe(true);
    expect(internalApi("/api/future-leads/lead-a/convert")).toBe(true);
    expect(internalApi("/api/future-leads-other")).toBe(false);
  });
  it("handles DST and local 09:00, and never backfills thresholds before registration", () => {
    const target = "2026-11-10",
      scheduled = Date.parse("2026-10-01");
    expect(
      futureReminderOffset(
        target,
        scheduled,
        Date.parse("2026-10-31T06:59:00Z"),
      ),
    ).toBeNull();
    expect(
      futureReminderOffset(
        target,
        scheduled,
        Date.parse("2026-10-31T07:00:00Z"),
      ),
    ).toBe(10);
    expect(
      futureReminderOffset(
        target,
        scheduled,
        Date.parse("2026-11-06T10:00:00Z"),
      ),
    ).toBe(5);
    expect(
      futureReminderOffset(
        target,
        Date.parse("2026-11-06T08:00:00Z"),
        Date.parse("2026-11-06T10:00:00Z"),
      ),
    ).toBeNull();
    expect(
      futureReminderOffset(
        target,
        scheduled,
        Date.parse("2026-11-11T10:00:00Z"),
      ),
    ).toBeNull();
    expect(bucharestDay(Date.parse("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
  });
});
