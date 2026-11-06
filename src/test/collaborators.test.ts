// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { collaboratorsRouter } from "../../cloudflare/workers/api/src/collaborators";
import { collaborationIdentity } from "../../cloudflare/workers/api/src/collaboratorPolicy";
import {
  documentActor,
  documentVisibility,
  accessibleDocument,
  documentActionAllowed,
} from "../../cloudflare/workers/api/src/documentPolicy";
import {
  bouncerFixture,
  malwareBucket,
  fixtureScannerSettings,
} from "./helpers/bouncerFixture";
import {
  blankCollaborator,
  collaboratorInput,
  collaboratorContactLinks,
} from "../shared/collaborators";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
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
let db: DatabaseSync,
  env: Env,
  app: Hono<AppBindings>,
  actor: string,
  files: ReturnType<typeof malwareBucket>,
  vendor: ReturnType<typeof bouncerFixture>;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync("cloudflare/d1/migrations")
    .filter((v) => v.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
  for (const [id, email, role] of [
    ["owner", "prometheus@avyron.ro", "admin"],
    ["manager", "manager@fixture.test", "staff"],
    ["staff", "staff@fixture.test", "staff"],
    ["a", "a@fixture.test", "user"],
    ["b", "b@fixture.test", "user"],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
    ).run(id, email, "synthetic");
    db.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, role);
  }
  db.exec(
    "INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','a@fixture.test',1),('cb','Client B','b@fixture.test',1); INSERT INTO client_account_access(client_id,user_id,granted_by,created_at) VALUES('ca','a','owner',1),('cb','b','owner',1)",
  );
  files = malwareBucket();
  vendor = bouncerFixture();
  env = {
    ...fixtureScannerSettings,
    MFA_AUTH_ENABLED: "false",
    DOCUMENT_STORAGE_PRIVACY_VERIFIED: "true",
    FILES: files,
    DB: {
      prepare: (q: string) => new Stmt(db, q),
      batch: async (s: Stmt[]) => {
        db.exec("BEGIN");
        try {
          const r = [];
          for (const p of s)
            r.push({ meta: db.prepare(p.sql).run(...p.values) });
          db.exec("COMMIT");
          return r;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
  } as unknown as Env;
  actor = "owner";
  app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("userId", actor);
    c.set("roles", [
      actor === "owner"
        ? "admin"
        : ["manager", "staff"].includes(actor)
          ? "staff"
          : "user",
    ]);
    c.set("mfaVerified", false);
    await next();
  });
  app.route("/", collaboratorsRouter);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  db.close();
});
const input = (extra = {}) => ({
  ...blankCollaborator(),
  name: "Colaborator sintetic",
  category: "legal" as const,
  status: "active" as const,
  summary: "Consultanță juridică pentru agenție.",
  internalNotes: "PRIVATE-AVYRON-NOTES",
  ...extra,
});
const req = (
  path = "/api/collaborators",
  body?: unknown,
  method = "POST",
  key = crypto.randomUUID(),
) =>
  app.request(
    path,
    {
      method: body === undefined ? "GET" : method,
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env,
  );
const create = async (extra = {}, key = crypto.randomUUID()) => {
  const r = await req(
    "/api/collaborators",
    { input: input(extra), accountConfirmed: true },
    "POST",
    key,
  );
  expect(r.status, await r.clone().text()).toBe(201);
  return r.json() as Promise<{ id: string; code: string }>;
};
const detail = async (id: string) => {
  const r = await req("/api/collaborations/" + id);
  expect(r.status, await r.clone().text()).toBe(200);
  return r.json();
};
const upload = (
  id: string,
  bytes = "%PDF-1.7\nSynthetic fixture",
  key = crypto.randomUUID(),
  visible = true,
) =>
  app.request(
    `/api/collaborations/${id}/files?visible=${visible ? "1" : "0"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-File-Name": "synthetic.pdf",
        "Idempotency-Key": key,
      },
      body: bytes,
    },
    env,
  );
const grant = (who: string, cap: string) =>
  db
    .prepare(
      "INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES(?,?,?,?,?,1)",
    )
    .run(crypto.randomUUID(), who, cap, "owner", "Synthetic test");
it("creates informational collaborators without clients/accounts, stable codes and a single central document container", async () => {
  const key = crypto.randomUUID(),
    a = await create({}, key),
    b = await create({}, key);
  expect(b).toEqual(a);
  expect(a.code).toMatch(/^AVP-[A-F0-9]{10}$/);
  expect(
    db.prepare("SELECT count(*) n FROM agency_collaborators").get()!.n,
  ).toBe(1);
  expect(
    db
      .prepare("SELECT count(*) n FROM documents WHERE number LIKE 'COL-AVP-%'")
      .get()!.n,
  ).toBe(1);
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(await collaborationIdentity(env.DB, "a")).toEqual({
    hasCollaborations: false,
    isAgencyPartner: false,
  });
});
it("separates business collaborators from AVY product entitlements and derives the badge from an explicit account association", async () => {
  const d = await create({ accountUserId: "a", clientId: "ca" });
  expect(await collaborationIdentity(env.DB, "a")).toEqual({
    hasCollaborations: true,
    isAgencyPartner: true,
  });
  expect(await collaborationIdentity(env.DB, "b")).toEqual({
    hasCollaborations: false,
    isAgencyPartner: false,
  });
  expect(
    db.prepare("SELECT count(*) n FROM product_entitlements").get()!.n,
  ).toBe(0);
  expect((await detail(d.id)).collaborator.accountUserId).toBe("a");
});
it("requires account confirmation and rejects another client, disabled/unverified accounts and inaccessible client associations", async () => {
  const a = await req("/api/collaborators", {
    input: input({ accountUserId: "a" }),
    accountConfirmed: false,
  });
  expect(a.status).toBe(400);
  expect(
    (
      await req("/api/collaborators", {
        input: input({ accountUserId: "b", clientId: "ca" }),
        accountConfirmed: true,
      })
    ).status,
  ).toBe(403);
  db.exec("UPDATE users SET email_verified=0 WHERE id='a'");
  expect(
    (
      await req("/api/collaborators", {
        input: input({ accountUserId: "a" }),
        accountConfirmed: true,
      })
    ).status,
  ).toBe(403);
  expect(
    db.prepare("SELECT count(*) n FROM agency_collaborators").get()!.n,
  ).toBe(0);
});
it("keeps the directory and internal notes out of other accounts, including direct resource and file URLs", async () => {
  const d = await create({ accountUserId: "a", clientId: "ca" });
  const f = await (await upload(d.id)).json();
  actor = "a";
  expect((await req()).status).toBe(403);
  const own = await detail(d.id);
  expect(JSON.stringify(own)).not.toContain("PRIVATE-AVYRON-NOTES");
  expect(own.collaborator).not.toHaveProperty("accountEmail");
  expect((await req("/api/my/collaborations")).status).toBe(200);
  actor = "b";
  for (const path of [
    `/api/collaborations/${d.id}`,
    `/api/collaborations/${d.id}/files/${f.id}`,
  ])
    expect((await req(path)).status).toBe(404);
});
it("checks explicit staff permissions and revocation on the directory and central document visibility", async () => {
  actor = "manager";
  expect((await req()).status).toBe(403);
  grant("manager", "collaborators.manage");
  const d = await create();
  expect((await req()).status).toBe(200);
  const docId = db
    .prepare("SELECT document_id FROM agency_collaborators WHERE id=?")
    .get(d.id)!.document_id as string;
  const a = await documentActor(env.DB, "manager");
  expect(await accessibleDocument(env.DB, a!, docId)).not.toBeNull();
  db.exec("UPDATE user_capabilities SET revoked_at=2 WHERE user_id='manager'");
  expect((await req()).status).toBe(403);
  const revoked = await documentActor(env.DB, "manager");
  const policy = documentVisibility(revoked!);
  expect(
    db
      .prepare("SELECT id FROM documents d WHERE " + policy.sql)
      .all(...policy.values),
  ).toEqual([]);
});
it("does not permit generic Document Center editing/publishing of a collaboration container", async () => {
  const d = await create();
  const id = db
      .prepare("SELECT document_id FROM agency_collaborators WHERE id=?")
      .get(d.id)!.document_id as string,
    a = await documentActor(env.DB, "owner"),
    doc = await accessibleDocument(env.DB, a!, id);
  expect(doc?.collaborator_id).toBe(d.id);
  expect(
    await documentActionAllowed(env.DB, a!, doc!, "documents.publish"),
  ).toBe(false);
  expect(
    await documentActionAllowed(env.DB, a!, doc!, "documents.backups.manage"),
  ).toBe(true);
});
it("prevents overwriting a concurrently edited record and preserves account visibility on conflict", async () => {
  const d = await create({ accountUserId: "a" }),
    v = input({ accountUserId: "a", summary: "New shared summary" });
  const body = {
    input: v,
    revision: 1,
    archived: false,
    accountConfirmed: true,
  };
  expect((await req("/api/collaborators/" + d.id, body, "PATCH")).status).toBe(
    200,
  );
  expect(
    (
      await req(
        "/api/collaborators/" + d.id,
        { ...body, input: { ...v, name: "stale" } },
        "PATCH",
      )
    ).status,
  ).toBe(409);
  expect((await detail(d.id)).collaborator.name).not.toBe("stale");
});
it("keeps uploads blocked and leaves no file slots or provider calls when compliance is missing", async () => {
  const d = await create({ accountUserId: "a" });
  env.BOUNCER_DPA_REFERENCE = "";
  actor = "a";
  const r = await upload(d.id);
  expect(r.status).toBe(503);
  expect((await r.json()).error.code).toBe("antivirus_compliance_blocked");
  expect(vendor.creates).toBe(0);
  expect(
    db.prepare("SELECT count(*) n FROM collaborator_documents").get()!.n,
  ).toBe(0);
});
it("limits real bytes to 5 MB before scanning and rejects a disguised invalid format", async () => {
  const d = await create();
  expect((await upload(d.id, "%PDF-" + "x".repeat(5_000_000))).status).toBe(
    413,
  );
  expect((await upload(d.id, "not a PDF")).status).toBe(415);
  expect(vendor.creates).toBe(0);
});
it("reserves at most three slots before scan, including concurrent uploads, and deduplicates an accepted retry", async () => {
  const d = await create();
  for (let i = 0; i < 2; i++)
    expect((await upload(d.id, "%PDF-1.7\nfixture" + i)).status).toBe(201);
  const key = crypto.randomUUID();
  const r = await upload(d.id, "%PDF-1.7\nthird", key);
  expect(r.status).toBe(201);
  const f = await r.json();
  expect((await upload(d.id, "%PDF-1.7\nthird", key)).status).toBe(201);
  expect(vendor.creates).toBe(3);
  expect((await upload(d.id, "%PDF-1.7\nfourth")).status).toBe(409);
  expect(vendor.creates).toBe(3);
  expect((await detail(d.id)).files.map((v: { id: string }) => v.id)).toContain(
    f.id,
  );
  expect(db.prepare("SELECT count(*) n FROM document_files").get()!.n).toBe(3);
});
it("serves exact CLEAN bytes only after explicit publication, and checks R2 version on every download", async () => {
  const d = await create({ accountUserId: "a" }),
    text = "%PDF-1.7\nprivate collaborator document",
    r = await upload(d.id, text, crypto.randomUUID(), false),
    f = await r.json();
  actor = "a";
  expect((await req(`/api/collaborations/${d.id}/files/${f.id}`)).status).toBe(
    404,
  );
  expect((await detail(d.id)).files).toEqual([]);
  actor = "owner";
  const state = await detail(d.id);
  expect(
    (
      await req(
        `/api/collaborations/${d.id}/files/${f.id}`,
        {
          revision: state.collaborator.revision,
          confirmed: true,
          visible: true,
        },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  actor = "a";
  const download = await req(`/api/collaborations/${d.id}/files/${f.id}`);
  expect(download.status).toBe(200);
  expect(await download.text()).toBe(text);
  expect(download.headers.get("cache-control")).toContain("no-store");
  const key = db
    .prepare("SELECT object_key FROM document_files WHERE id=?")
    .get(f.id)!.object_key as string;
  await files.put(key, new TextEncoder().encode(text));
  expect((await req(`/api/collaborations/${d.id}/files/${f.id}`)).status).toBe(
    423,
  );
});
it("allows partner upload/removal while preserving the central immutable history and preventing another account from changing documents", async () => {
  const d = await create({ accountUserId: "a" });
  actor = "a";
  const r = await upload(d.id),
    f = await r.json();
  expect(r.status).toBe(201);
  const state = await detail(d.id);
  expect(state.files[0].visible).toBe(true);
  actor = "b";
  expect(
    (
      await req(
        `/api/collaborations/${d.id}/files/${f.id}`,
        {
          revision: state.collaborator.revision,
          confirmed: true,
          remove: true,
        },
        "PATCH",
      )
    ).status,
  ).toBe(404);
  actor = "a";
  expect(
    (
      await req(
        `/api/collaborations/${d.id}/files/${f.id}`,
        {
          revision: state.collaborator.revision,
          confirmed: true,
          visible: false,
        },
        "PATCH",
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await req(
        `/api/collaborations/${d.id}/files/${f.id}`,
        {
          revision: state.collaborator.revision,
          confirmed: true,
          remove: true,
        },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  expect((await detail(d.id)).files).toEqual([]);
  expect(db.prepare("SELECT count(*) n FROM document_files").get()!.n).toBe(1);
  expect(db.prepare("SELECT count(*) n FROM document_versions").get()!.n).toBe(
    1,
  );
});
it("quarantines malicious/suspicious files and releases the slot without publishing or persisting a usable document", async () => {
  const d = await create();
  vendor.setVerdict("malicious");
  expect((await upload(d.id)).status).toBe(400);
  expect(
    db.prepare("SELECT count(*) n FROM collaborator_documents").get()!.n,
  ).toBe(0);
  expect(db.prepare("SELECT count(*) n FROM document_files").get()!.n).toBe(0);
  expect(
    db.prepare("SELECT quarantine_held FROM malware_scan_jobs").get()!
      .quarantine_held,
  ).toBe(1);
});
it("revokes access and badge immediately when a native client grant is removed, without email fallback", async () => {
  const d = await create({ accountUserId: "a", clientId: "ca" });
  actor = "a";
  expect((await req("/api/collaborations/" + d.id)).status).toBe(200);
  db.exec("DELETE FROM client_account_access WHERE user_id='a'");
  expect((await req("/api/collaborations/" + d.id)).status).toBe(404);
  expect((await (await req("/api/my/collaborations")).json()).data).toEqual([]);
  expect(await collaborationIdentity(env.DB, "a")).toEqual({
    hasCollaborations: false,
    isAgencyPartner: false,
  });
});
it("requires confirmation when relinking an account, clears all published documents and archives without exposing history to the old account", async () => {
  const d = await create({ accountUserId: "a" });
  await upload(d.id);
  let state = await detail(d.id);
  const body = {
    input: input({ accountUserId: "b" }),
    revision: state.collaborator.revision,
    archived: false,
    accountConfirmed: false,
  };
  expect((await req("/api/collaborators/" + d.id, body, "PATCH")).status).toBe(
    400,
  );
  expect(
    (
      await req(
        "/api/collaborators/" + d.id,
        { ...body, accountConfirmed: true },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  actor = "a";
  expect((await req("/api/collaborations/" + d.id)).status).toBe(404);
  actor = "b";
  expect((await detail(d.id)).files).toEqual([]);
  actor = "owner";
  state = await detail(d.id);
  expect(
    (
      await req(
        "/api/collaborators/" + d.id,
        {
          ...body,
          revision: state.collaborator.revision,
          archived: true,
          accountConfirmed: true,
        },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  actor = "b";
  expect((await req("/api/collaborations/" + d.id)).status).toBe(404);
  expect((await collaborationIdentity(env.DB, "b")).isAgencyPartner).toBe(
    false,
  );
});
it("does not transfer documents to a different legal beneficiary", async () => {
  const d = await create({ clientId: "ca", accountUserId: "a" });
  await upload(d.id);
  const s = await detail(d.id);
  expect(
    (
      await req(
        "/api/collaborators/" + d.id,
        {
          input: input({ clientId: "cb", accountUserId: "b" }),
          revision: s.collaborator.revision,
          archived: false,
          accountConfirmed: true,
        },
        "PATCH",
      )
    ).status,
  ).toBe(409);
});
it("validates actual calendar dates, contact protocols, international WhatsApp and optional fields without collecting unnecessary identity data", () => {
  expect(
    collaboratorInput.safeParse(input({ startsOn: "2026-02-30" })).success,
  ).toBe(false);
  expect(
    collaboratorInput.safeParse(input({ website: "javascript:alert(1)" }))
      .success,
  ).toBe(false);
  expect(
    collaboratorInput.safeParse(
      input({ startsOn: "2026-10-20", endsOn: "2026-10-19" }),
    ).success,
  ).toBe(false);
  expect(collaboratorInput.safeParse(input()).success).toBe(true);
  const links = collaboratorContactLinks({
    phone: "+40 700 000 000",
    whatsapp: "+40 700 000 000",
    email: "fixture@example.test",
  });
  expect(links.call).toBe("tel:+40700000000");
  expect(links.whatsapp).toBe("https://wa.me/40700000000");
  expect(
    collaboratorContactLinks({ phone: "", whatsapp: "0700000000", email: "" })
      .whatsapp,
  ).toBeNull();
});
it("serializes competing uploads for the final slot before any extra provider scan", async () => {
  const d = await create();
  await upload(d.id, "%PDF-1.7\nfirst");
  await upload(d.id, "%PDF-1.7\nsecond");
  const responses = await Promise.all([
    upload(d.id, "%PDF-1.7\nthird-concurrent"),
    upload(d.id, "%PDF-1.7\nfourth-concurrent"),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(vendor.creates).toBe(3);
  expect((await detail(d.id)).collaborator.fileCount).toBe(3);
  const recovery = await create();
  for (let slot = 1; slot <= 3; slot++)
    db.prepare(
      "INSERT INTO collaborator_documents(id,collaborator_id,slot,file_name,content_type,size_bytes,uploaded_by,intent_key,request_hash,lease_token,lease_expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,'abandoned','expired',1,1)",
    ).run(
      crypto.randomUUID(),
      recovery.id,
      slot,
      "abandoned.pdf",
      "application/pdf",
      20,
      "owner",
      crypto.randomUUID(),
    );
  const recoverable = await detail(recovery.id);
  expect(recoverable.collaborator.fileCount).toBe(0);
  expect(recoverable.files).toEqual([]);
  expect(
    (await upload(recovery.id, "%PDF-1.7\nRecovered after interruption"))
      .status,
  ).toBe(201);
});
it("revalidates native membership after scanning and does not publish an upload when access was revoked in flight", async () => {
  const d = await create({ clientId: "ca", accountUserId: "a" }),
    original = vendor.fetcher.getMockImplementation()!;
  vendor.fetcher.mockImplementation(async (input, init) => {
    const r = await original(input, init);
    const url = String(input);
    if (url.includes("/v2/scan/"))
      db.exec("DELETE FROM client_account_access WHERE user_id='a'");
    return r;
  });
  actor = "a";
  const r = await upload(d.id);
  expect(r.status).toBe(403);
  expect(db.prepare("SELECT count(*) n FROM document_files").get()!.n).toBe(0);
  expect(
    db.prepare("SELECT count(*) n FROM collaborator_documents").get()!.n,
  ).toBe(0);
});
it("allows immediate archival during an in-flight scan and never releases its file to the associated account", async () => {
  const d = await create({ accountUserId: "a" }),
    original = vendor.fetcher.getMockImplementation()!;
  vendor.fetcher.mockImplementation(async (input, init) => {
    const r = await original(input, init);
    if (String(input).includes("/v2/scan/"))
      db.prepare(
        "UPDATE agency_collaborators SET archived_at=1,revision=revision+1 WHERE id=?",
      ).run(d.id);
    return r;
  });
  actor = "a";
  expect((await upload(d.id)).status).toBe(403);
  expect((await collaborationIdentity(env.DB, "a")).hasCollaborations).toBe(
    false,
  );
  expect(db.prepare("SELECT count(*) n FROM document_files").get()!.n).toBe(0);
});
it("allows preserving history and archiving when an already linked account/client becomes inactive", async () => {
  const d = await create({ clientId: "ca", accountUserId: "a" });
  await upload(d.id);
  db.exec(
    "UPDATE clients SET status='archived' WHERE id='ca'; UPDATE users SET disabled_at=1 WHERE id='a'",
  );
  const s = await detail(d.id);
  expect(
    (
      await req(
        "/api/collaborators/" + d.id,
        {
          input: input({
            clientId: "ca",
            accountUserId: "a",
            status: "closed",
          }),
          revision: s.collaborator.revision,
          archived: true,
          accountConfirmed: false,
        },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  expect((await detail(d.id)).collaborator.archivedAt).not.toBeNull();
});
it("does not allow self-selected profile categories to manufacture the business-partner badge", async () => {
  db.exec(
    "INSERT INTO profiles(id,entity_type,language,theme,updated_at) VALUES('a','avyron_partner','ro','dark',1)",
  );
  expect(await collaborationIdentity(env.DB, "a")).toEqual({
    hasCollaborations: false,
    isAgencyPartner: false,
  });
});
it("retains authorized closed-collaboration history without an active badge or further uploads", async () => {
  const d = await create({ accountUserId: "a", status: "closed" });
  actor = "a";
  expect((await detail(d.id)).collaborator.canUpload).toBe(false);
  expect(await collaborationIdentity(env.DB, "a")).toEqual({
    hasCollaborations: true,
    isAgencyPartner: false,
  });
  expect((await upload(d.id)).status).toBe(403);
});
