// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect, describe } from "vitest";
import { visualAssetsRouter } from "../../cloudflare/workers/api/src/visualAssets";
import { engineRouter } from "../../cloudflare/workers/api/src/engine";
import { clientWorkspaceRouter } from "../../cloudflare/workers/api/src/clientWorkspace";
import { canOpenSection, buildAccess, SECTIONS } from "../lib/access";
import {
  FINANCE_GROUPS,
  financialView,
  financialRange,
  bucharestLocalTime,
} from "../shared/financeWorkspace";
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
class Bucket {
  objects = new Map<string, Uint8Array>();
  failAfterPut = false;
  async put(k: string, value: ArrayBuffer | Uint8Array | string) {
    const bytes = new Uint8Array(
      typeof value === "string"
        ? new TextEncoder().encode(value)
        : value instanceof ArrayBuffer
          ? value.slice(0)
          : value.slice(),
    );
    this.objects.set(k, bytes);
    if (this.failAfterPut) {
      this.failAfterPut = false;
      throw new Error("synthetic ambiguous put failure");
    }
    return { size: bytes.length };
  }
  async get(k: string) {
    const v = this.objects.get(k);
    return v
      ? {
          size: v.length,
          body: new Blob([v]).stream(),
          arrayBuffer: async () => v.slice().buffer,
          text: async () => new TextDecoder().decode(v),
        }
      : null;
  }
  async delete(k: string) {
    this.objects.delete(k);
  }
}
const root = "/api/visual-assets",
  png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const meta = (
  scope = "agency",
  clientId: string | null = null,
  projectId: string | null = null,
) => ({
  scope,
  clientId,
  projectId,
  title: "Logo de verificare",
  category: "logo",
  description: "Resursă sintetică",
  tags: ["logo", "brand"],
});
describe("OS refinement: scoped visual resources and real Engine state", () => {
  let db: DatabaseSync,
    app: Hono,
    actor: string,
    mfa: boolean,
    storage: boolean,
    backups: boolean,
    files: Bucket,
    company: Bucket,
    clients: Bucket,
    failBatch: boolean;
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
    for (const [id, email, role] of [
      ["owner", "prometheus@avyron.ro", "admin"],
      ["super", "super@example.test", "admin"],
      ["staff-a", "staff-a@example.test", "staff"],
      ["staff-b", "staff-b@example.test", "staff"],
      ["admin", "ordinary@example.test", "admin"],
      ["customer", "customer@example.test", "user"],
    ]) {
      db.prepare(
        "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
      ).run(id, email, "synthetic");
      db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
    }
    db.exec(
      "INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES('super@example.test','superadmin','active',1,1); INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@example.test',1),('cb','Client B','b@example.test',1); INSERT INTO projects(id,client_id,name,slug,created_at,updated_at) VALUES('pa','ca','Project A','a',1,1),('pb','cb','Project B','b',1,1); INSERT INTO project_staff VALUES('pa','staff-a','contributor',1),('pb','staff-b','contributor',1)",
    );
    const binding = {
      prepare: (sql: string) => new Statement(db, sql),
      batch: async (statements: Statement[]) => {
        if (failBatch) {
          failBatch = false;
          throw new Error("synthetic storage transaction failure");
        }
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
    };
    actor = "owner";
    mfa = true;
    storage = true;
    backups = true;
    failBatch = false;
    files = new Bucket();
    company = new Bucket();
    clients = new Bucket();
    app = new Hono();
    app.use("*", async (c, next) => {
      Object.assign(c.env, {
        DB: binding,
        FILES: files,
        DOCUMENT_COMPANY_BACKUPS: company,
        DOCUMENT_BACKUPS: clients,
        DOCUMENT_STORAGE_PRIVACY_VERIFIED: storage ? "true" : "false",
        DOCUMENT_BACKUP_ISOLATION_VERIFIED: backups ? "true" : "false",
        MFA_AUTH_ENABLED: "true",
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
    app.route("/", visualAssetsRouter);
    app.route("/", engineRouter);
    app.route("/", clientWorkspaceRouter);
    app.onError(() => new Response("safe failure", { status: 500 }));
  });
  afterEach(() => {
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });
  const req = (path: string, body?: unknown, method = "POST") =>
    app.request(
      path,
      body === undefined
        ? {}
        : {
            method,
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify(body),
          },
      {},
    );
  const upload = (
    body = meta(),
    key = crypto.randomUUID(),
    content = png,
    type = "image/png",
    name = "logo.png",
  ) =>
    app.request(
      root + "/upload",
      {
        method: "POST",
        headers: {
          "X-Asset-Metadata": encodeURIComponent(JSON.stringify(body)),
          "X-Asset-Filename": encodeURIComponent(name),
          "Content-Type": type,
          "Idempotency-Key": key,
        },
        body: content,
      },
      {},
    );
  const ok = async (r: Response, status = 200) => {
    expect(r.status, await r.clone().text()).toBe(status);
    return r.json();
  };
  it("uploads privately in quarantine, replays safely, and keeps opaque object keys out of metadata", async () => {
    const key = crypto.randomUUID(),
      first = await ok(await upload(meta(), key), 201);
    expect(await ok(await upload(meta(), key), 201)).toEqual(first);
    expect(files.objects.size).toBe(1);
    expect([...files.objects.keys()][0]).not.toContain("logo");
    const list = await ok(await req(root));
    expect(list.data).toHaveLength(1);
    expect(list.data[0].scan_status).toBe("quarantined");
    expect(list.data[0].object_key).toBeUndefined();
    expect((await req(root + "/" + first.id + "/content")).status).toBe(423);
    const inspect = await req(root + "/" + first.id + "/content?inspect=1");
    expect(inspect.status).toBe(200);
    expect(inspect.headers.get("cache-control")).toBe("private, no-store");
    expect((await upload({ ...meta(), title: "Other" }, key)).status).toBe(409);
  });
  it("isolates client A resources from client B staff including direct URLs and owner downgrades", async () => {
    actor = "staff-a";
    const a = await ok(await upload(meta("client", "ca", "pa")), 201);
    actor = "staff-b";
    expect((await ok(await req(root + "?scope=client"))).data).toEqual([]);
    expect((await req(root + "/" + a.id + "/content?inspect=1")).status).toBe(
      404,
    );
    expect(
      (
        await req(
          root + "/" + a.id,
          { ...meta(), revision: 1, archived: false },
          "PATCH",
        )
      ).status,
    ).toBe(404);
    actor = "customer";
    expect((await req(root)).status).toBe(403);
    actor = "owner";
    expect((await ok(await req(root + "?scope=client"))).data).toHaveLength(1);
  });
  it("revokes uploader inspection as soon as its project assignment disappears", async () => {
    actor = "staff-a";
    const a = await ok(await upload(meta("client", "ca", "pa")), 201);
    db.exec("DELETE FROM project_staff WHERE user_id='staff-a'");
    expect((await req(root + "/" + a.id + "/content?inspect=1")).status).toBe(
      404,
    );
    expect((await ok(await req(root + "?scope=client"))).data).toEqual([]);
  });
  it("protects agency writes, MFA, private storage, and beneficiary integrity", async () => {
    actor = "staff-a";
    expect((await upload()).status).toBe(403);
    actor = "owner";
    mfa = false;
    expect((await upload()).status).toBe(403);
    mfa = true;
    storage = false;
    expect((await upload()).status).toBe(503);
    storage = true;
    expect((await upload(meta("client", "cb", "pa"))).status).toBe(409);
    expect((await upload(meta("agency", "ca"))).status).toBe(400);
  });
  it("validates file bytes and keeps SVG attachment-only even for an authorized inspection", async () => {
    expect(
      (await upload(meta(), crypto.randomUUID(), new Uint8Array([1, 2, 3])))
        .status,
    ).toBe(415);
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>throw 1</script></svg>',
    );
    const a = await ok(
      await upload(
        meta(),
        crypto.randomUUID(),
        svg,
        "image/svg+xml",
        "logo.svg",
      ),
      201,
    );
    const response = await req(
      root + "/" + a.id + "/content?inspect=1&preview=1",
    );
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox",
    );
    actor = "staff-a";
    expect((await req(root + "/" + a.id + "/content?inspect=1")).status).toBe(
      404,
    );
  });
  it("rejects oversize or empty files and rolls back uncommitted R2 objects", async () => {
    expect(
      (await upload(meta(), crypto.randomUUID(), new Uint8Array())).status,
    ).toBe(415);
    failBatch = true;
    expect((await upload()).status).toBe(500);
    expect(files.objects.size).toBe(0);
    expect(db.prepare("SELECT count(*) n FROM visual_assets").get()!.n).toBe(0);
  });
  it("edits metadata with revision checks, never promotes unscanned files, and archives without deleting", async () => {
    const a = await ok(await upload(), 201),
      body = {
        title: "Logo nou",
        category: "identity",
        description: "Descriere nouă",
        tags: ["brand"],
        revision: 1,
        archived: true,
      };
    await ok(await req(root + "/" + a.id, body, "PATCH"));
    expect((await req(root + "/" + a.id, body, "PATCH")).status).toBe(409);
    expect(
      (
        await req(
          root + "/" + a.id,
          { ...body, revision: 2, scanStatus: "clean" },
          "PATCH",
        )
      ).status,
    ).toBe(400);
    expect((await ok(await req(root))).data).toEqual([]);
    expect((await ok(await req(root + "?archived=1"))).data[0].title).toBe(
      "Logo nou",
    );
    expect(files.objects.size).toBe(1);
    expect(() =>
      db
        .prepare("UPDATE visual_assets SET client_id='ca' WHERE id=?")
        .run(a.id),
    ).toThrow(/immutable/);
  });
  it("backs up in the isolated company/client destinations, checks corruption and restores original quarantine", async () => {
    const agency = await ok(await upload(), 201),
      a = await ok(await upload(meta("client", "ca", "pa")), 201);
    const backupAgency = await ok(
      await req(root + "/" + agency.id + "/backup", { confirmed: true }),
    );
    expect(company.objects.size).toBe(2);
    expect(
      (
        await ok(
          await req(root + "/" + agency.id + "/backup", { confirmed: true }),
        )
      ).reused,
    ).toBe(true);
    expect(company.objects.size).toBe(2);
    expect(clients.objects.size).toBe(0);
    db.prepare(
      "UPDATE visual_assets SET title='Titlu actualizat',revision=revision+1 WHERE id=?",
    ).run(agency.id);
    const newer = await ok(
      await req(root + "/" + agency.id + "/backup", { confirmed: true }),
    );
    expect(newer.id).not.toBe(backupAgency.id);
    expect(company.objects.size).toBe(4);
    const newerKey = db
      .prepare("SELECT object_key FROM visual_asset_backups WHERE id=?")
      .get(newer.id)!;
    const snapshot = JSON.parse(
      await company
        .get(String(newerKey.object_key) + ".json")
        .then((v) => v!.text()),
    );
    expect(snapshot.asset.title).toBe("Titlu actualizat");
    const b = await ok(
      await req(root + "/" + a.id + "/backup", { confirmed: true }),
    );
    expect(clients.objects.size).toBe(2);
    const object = db
      .prepare("SELECT object_key FROM visual_assets WHERE id=?")
      .get(a.id)!;
    files.objects.delete(String(object.object_key));
    await ok(
      await req(root + "/" + a.id + "/restore", {
        backupId: b.id,
        confirmed: true,
      }),
    );
    expect(files.objects.has(String(object.object_key))).toBe(true);
    expect(
      db.prepare("SELECT scan_status FROM visual_assets WHERE id=?").get(a.id)!
        .scan_status,
    ).toBe("quarantined");
    expect(
      (
        await req(root + "/" + a.id + "/restore", {
          backupId: backupAgency.id,
          confirmed: true,
        })
      ).status,
    ).toBe(404);
    clients.objects.set([...clients.objects.keys()][0], new Uint8Array([9]));
    expect(
      (
        await req(root + "/" + a.id + "/restore", {
          backupId: b.id,
          confirmed: true,
        })
      ).status,
    ).toBe(409);
    actor = "staff-a";
    expect((await req(root + "/" + a.id + "/backups")).status).toBe(404);
  });
  it("keeps backups unavailable when isolation is unconfigured", async () => {
    const a = await ok(await upload(), 201);
    backups = false;
    expect(
      (await req(root + "/" + a.id + "/backup", { confirmed: true })).status,
    ).toBe(503);
  });
  it("blocks moving a project with archived or quarantined visual history", async () => {
    await ok(await upload(meta("client", "ca", "pa")), 201);
    expect(
      (
        await req(
          "/api/admin/operations/clients/cb/projects",
          {
            projects: [{ id: "pa", sourceClientId: "ca", updatedAt: 1 }],
            confirmed: true,
          },
          "PUT",
        )
      ).status,
    ).toBe(409);
  });
  it("provides filtered/paginated catalogs and only authorized context options", async () => {
    actor = "staff-a";
    const o = await ok(await req(root + "/options"));
    expect(o.projects.map((p: { id: string }) => p.id)).toEqual(["pa"]);
    expect(o.clients.map((p: { id: string }) => p.id)).toEqual(["ca"]);
    expect(o.canManageAgency).toBe(false);
    expect((await req(root + "/context?project=pb")).status).toBe(404);
    expect((await req(root + "?offset=-1")).status).toBe(400);
  });
  it("consolidates navigation and finance without exposing administration to clients", () => {
    const owner = buildAccess({ roles: ["admin"], superadmin: true }),
      client = buildAccess({ roles: ["user"] });
    expect(canOpenSection("avy-engine", owner)).toBe(true);
    expect(canOpenSection("avy-engine", client)).toBe(false);
    expect(canOpenSection("platform-control", owner)).toBe(false);
    const rows = SECTIONS.filter((s) => s.group === "platform").map(
      (s) => s.id,
    );
    expect(rows.slice(rows.indexOf("configurator") + 1)).toEqual([
      "careers",
      "library",
    ]);
    expect(rows.indexOf("domains") + 1).toBe(rows.indexOf("surveys"));
    expect(SECTIONS.at(-2)!.id).toBe("other-hub");
    expect(FINANCE_GROUPS).toHaveLength(5);
    expect(financialView("audit", false, false)).toBe("overview");
    expect(financialView("receipts", false, false)).toBe("receipts");
  });
  it("lets Super Admin edit Engine state and reconcile only ineligible bindings without external calls", async () => {
    const source = db.prepare("SELECT id FROM engine_sources LIMIT 1").get()!;
    const capId = "cap-test";
    db.prepare(
      "UPDATE engine_sources SET lifecycle_status='active',security_status='reviewed',robots_reviewed=1,terms_reviewed=1,discovery_enabled=1,approved_at=1,approved_by='owner' WHERE id=?",
    ).run(source.id);
    db.prepare(
      "INSERT INTO engine_capabilities(id,source_id,slug,name,category,summary,delivery_method,implementation_status,approved_at,created_at,updated_at) VALUES(?,?,'test-cap','Test capability','asset','Test','manual','ready',1,1,1)",
    ).run(capId, source.id);
    db.exec(
      "INSERT INTO engine_resource_bindings(id,capability_id,target_type,target_key,purpose,visibility,status,approved_at,created_at,updated_at) VALUES('binding-test','cap-test','avyron_os','core','Test','internal','active',1,1,1)",
    );
    actor = "super";
    await ok(
      await req(
        "/api/engine/sources/" + source.id,
        { lifecycleStatus: "paused", discoveryEnabled: false },
        "PATCH",
      ),
    );
    expect(
      (await ok(await req("/api/engine/projections/avyron_os/core"))).resources,
    ).toEqual([]);
    const first = await ok(
      await req("/api/engine/bindings/reconcile", { confirmed: true }),
    );
    expect(first).toMatchObject({ paused: 1, externalCalls: 0 });
    expect(
      (
        await ok(
          await req("/api/engine/bindings/reconcile", { confirmed: true }),
        )
      ).paused,
    ).toBe(0);
    expect(
      db
        .prepare(
          "SELECT status FROM engine_resource_bindings WHERE id='binding-test'",
        )
        .get()!.status,
    ).toBe("paused");
    actor = "admin";
    expect((await req("/api/engine/overview")).status).toBe(403);
  });
  it("keeps Romanian financial periods accurate across DST and rejects reversed dates", () => {
    expect(
      new Date(
        financialRange("current", Date.parse("2026-11-05T12:00Z"))[0],
      ).toISOString(),
    ).toBe("2026-10-31T22:00:00.000Z");
    const spring = financialRange(
        "custom",
        Date.now(),
        "2026-03-29",
        "2026-03-29",
      ),
      fall = financialRange("custom", Date.now(), "2026-10-25", "2026-10-25");
    expect(spring[1] - spring[0] + 1).toBe(23 * 3600000);
    expect(fall[1] - fall[0] + 1).toBe(25 * 3600000);
    expect(() =>
      financialRange("custom", Date.now(), "2026-11-06", "2026-11-05"),
    ).toThrow();
    expect(() => bucharestLocalTime("2026-02-30")).toThrow();
  });
  it("removes uncommitted objects when a provider fails after writing bytes", async () => {
    files.failAfterPut = true;
    expect((await upload()).status).toBe(500);
    expect(files.objects.size).toBe(0);
    const asset = await ok(await upload(), 201);
    company.failAfterPut = true;
    expect(
      (await req(root + "/" + asset.id + "/backup", { confirmed: true }))
        .status,
    ).toBe(500);
    expect(company.objects.size).toBe(0);
  });
  it("does not preserve corporate quarantine access after the principal is revoked", async () => {
    const a = await ok(await upload(), 201);
    db.exec(
      "UPDATE platform_principals SET status='suspended' WHERE email='prometheus@avyron.ro'",
    );
    expect((await req(root + "/" + a.id + "/content?inspect=1")).status).toBe(
      404,
    );
    expect((await ok(await req(root))).data).toEqual([]);
  });
});
