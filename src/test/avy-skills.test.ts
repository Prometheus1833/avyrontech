// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { deflateSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { skillsRouter } from "../../cloudflare/workers/api/src/skills";
import {
  processSkillRun,
  drainSkillRuns,
} from "../../cloudflare/workers/api/src/skillRuntime";
import {
  freeTextModel,
  freeTextOutput,
} from "../../cloudflare/workers/api/src/freeTextModel";
import { runAiCore } from "../../cloudflare/workers/api/src/aiCore";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
import {
  bouncerFixture,
  malwareBucket,
  fixtureScannerSettings,
} from "./helpers/bouncerFixture";
import { briefSchema, blankBrief } from "../shared/skills/model";
import { renderSkillPreview } from "../shared/skills/render";
import {
  verifiedImageReservation,
  decodedGeneratedImage,
  imageDimensions,
} from "../../cloudflare/workers/api/src/skillImages";
import { SITE_STAGES } from "../shared/skills/siteStages";
import { buildAccess, sectionsFor } from "../lib/access";

vi.mock("../../cloudflare/workers/api/src/aiCore", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../cloudflare/workers/api/src/aiCore")
  >()),
  runAiCore: vi.fn(async () => ({
    output: { response: "O direcție AI sintetică, fără publicare." },
    model: "registered-primary",
    role: "primary",
    maxTokens: 800,
    estimatedNeurons: 1000,
  })),
}));
class Stmt {
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
    return this.db.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.values);
    return {
      meta: {
        changes: Number(r.changes),
        last_row_id: Number(r.lastInsertRowid),
      },
    };
  }
}
let db: DatabaseSync,
  env: Env,
  app: Hono<AppBindings>,
  actor: string,
  files: ReturnType<typeof malwareBucket>;
const grant = (uid: string, cap: string) =>
  db
    .prepare(
      "INSERT INTO user_capabilities(id,user_id,capability,reason,created_at) VALUES(?,?,?,'synthetic',1)",
    )
    .run(crypto.randomUUID(), uid, cap);
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("cloudflare/d1/migrations")
    .filter((x) => x.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("cloudflare/d1/migrations/" + file, "utf8"));
  for (const [id, email, role] of [
    ["owner", "prometheus@avyron.ro", "admin"],
    ["a", "a@fixture.test", "staff"],
    ["b", "b@fixture.test", "staff"],
    ["client", "client@fixture.test", "user"],
    ["operator", "operator@fixture.test", "user"],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
    ).run(id, email, "synthetic");
    db.prepare("INSERT INTO user_roles(user_id,role) VALUES(?,?)").run(
      id,
      role,
    );
  }
  db.exec(
    "INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Client A','ca@fixture.test',1),('cb','Client B','cb@fixture.test',1); INSERT INTO projects(id,name,slug,client_id,created_at,updated_at) VALUES('pa','Proiect A','a','ca',1,1),('pb','Proiect B','b','cb',1,1); INSERT INTO project_staff(project_id,user_id,assigned_at) VALUES('pa','a',1),('pb','b',1)",
  );
  files = malwareBucket();
  env = {
    ...fixtureScannerSettings,
    MFA_AUTH_ENABLED: "false",
    DOCUMENT_STORAGE_PRIVACY_VERIFIED: "true",
    FILES: files,
    ASYNC_JOBS: { sendBatch: vi.fn(async () => {}) },
    DB: {
      prepare: (q: string) => new Stmt(db, q),
      batch: async (stmts: Stmt[]) => {
        db.exec("BEGIN");
        try {
          const r = [];
          for (const s of stmts) r.push(await s.run());
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
        : ["a", "b"].includes(actor)
          ? "staff"
          : "user",
    ]);
    c.set("mfaVerified", false);
    await next();
  });
  app.route("/", skillsRouter);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  db.close();
});
const brief = (extra = {}) => ({
  ...blankBrief(),
  business: "Afacere sintetică",
  activity: "Design interior",
  ...extra,
});
function generatedPng(width: number, height: number) {
  const chunk = (name: string, data: Buffer) => {
    const type = Buffer.from(name),
      content = Buffer.concat([type, data]);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4),
      sum = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    sum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, content, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((width * 4 + 1) * height))),
    chunk("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}
const req = (
  path: string,
  body?: unknown,
  method = "POST",
  headers: Record<string, string> = {},
) =>
  app.request(
    "https://app.fixture.test/api/skills/site-builder" + path,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
async function create(
  extra = {},
  mode = "template",
  key = crypto.randomUUID(),
) {
  const r = await req("/runs", { brief: brief(extra), mode }, "POST", {
    "Idempotency-Key": key,
  });
  const b = await r.json();
  return { response: r, ...b };
}
async function resource(body = "Instrucțiune reutilizabilă verificabilă.") {
  const r = await req("/resources", {
    title: "Referință sintetică",
    domain: "general",
    body,
    sourceUrl: "",
  });
  return (await r.json()).id as string;
}
const fileRequest = (
  id: string,
  body: BodyInit,
  type = "text/plain",
  name = "note.txt",
) =>
  app.request(
    `https://app.fixture.test/api/skills/site-builder/resources/${id}/file`,
    {
      method: "POST",
      headers: { "Content-Type": type, "X-File-Name": name },
      body,
    },
    env,
  );

it("denies ordinary clients and ungranted staff, including private exports", async () => {
  for (actor of ["client", "a"]) {
    expect((await req("", undefined, "GET")).status).toBe(403);
    expect((await req("/context", undefined, "GET")).status).toBe(403);
    expect(
      (await req("/runs/guessed/export?format=html", undefined, "GET")).status,
    ).toBe(403);
  }
});
it("keeps skill navigation out of the client portal and registers three internal entries", () => {
  expect(
    sectionsFor(buildAccess({ roles: ["user"] })).some(
      (x) => x.group === "skills",
    ),
  ).toBe(false);
  expect(
    sectionsFor(buildAccess({ roles: ["admin"], superadmin: true })).filter(
      (x) => x.group === "skills",
    ),
  ).toHaveLength(3);
  expect(
    sectionsFor(
      buildAccess({ roles: ["staff"], capabilities: ["skills.read"] }),
    ).filter((x) => x.group === "skills"),
  ).toHaveLength(3);
});
it("serves approved portable Markdown with private cache headers", async () => {
  const r = await req("/skill.md", undefined, "GET");
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(r.headers.get("x-robots-tag")).toContain("noindex");
  expect(await r.text()).toMatch(/^---\nname: avy-site-builder/);
});
it("creates a real personalized HTML concept without any inference", async () => {
  const made = await create({ domain: "beauty" });
  expect(made.response.status).toBe(201);
  expect(made.status).toBe("ready");
  expect(runAiCore).not.toHaveBeenCalled();
  const r = await req(`/runs/${made.id}`, undefined, "GET"),
    body = await r.json();
  expect(body.run.preview_html).toContain("Afacere sintetică");
  expect(body.run.preview_html).toContain("Ritualuri de îngrijire");
  expect(body.run.preview_html).toContain("prefers-reduced-motion");
  expect(body.run.preview_html).toContain("Facebook · de configurat");
});
it("deduplicates retries and rejects an idempotency key reused with another brief", async () => {
  const key = crypto.randomUUID(),
    a = await create({}, "template", key),
    b = await create({}, "template", key),
    c = await create({ business: "Altă afacere" }, "template", key);
  expect(b.id).toBe(a.id);
  expect(c.response.status).toBe(409);
  expect(db.prepare("SELECT count(*) n FROM avy_skill_runs").get()?.n).toBe(1);
});
it("uses a separate immutable skill version and never rewrites existing results", async () => {
  const first = await create();
  const s = await (await req("", undefined, "GET")).json();
  const edit = {
    revision: s.revision,
    summary: "Descriere nouă pentru un skill verificat.",
    instructions: "Instrucțiuni noi. ".repeat(12),
    paused: false,
  };
  expect((await req("/versions", edit)).status).toBe(200);
  expect((await (await req("/context", undefined, "GET")).json()).version).toBe(
    s.published_version,
  );
  expect((await req("/approve", { revision: s.revision + 1 })).status).toBe(200);
  const next = await create();
  expect(
    db
      .prepare("SELECT skill_version FROM avy_skill_runs WHERE id=?")
      .get(first.id)?.skill_version,
  ).toBe(s.published_version);
  expect(
    db
      .prepare("SELECT skill_version FROM avy_skill_runs WHERE id=?")
      .get(next.id)?.skill_version,
  ).toBe(s.current_version + 1);
  expect(() =>
    db.exec("UPDATE avy_skill_versions SET instructions='overwrite'"),
  ).toThrow(/immutable/);
  expect(() =>
    db
      .prepare("UPDATE avy_skill_runs SET preview_html='overwrite' WHERE id=?")
      .run(first.id),
  ).toThrow(/immutable/);
});
it("rejects stale configuration and denies use-only users from managing masters", async () => {
  actor = "a";
  grant(actor, "skills.use");
  expect(
    (
      await req("/versions", {
        revision: 1,
        summary: "Long enough summary",
        instructions: "Long instructions ".repeat(15),
        paused: false,
      })
    ).status,
  ).toBe(403);
  actor = "owner";
  expect(
    (
      await req("/versions", {
        revision: 99,
        summary: "Long enough summary",
        instructions: "Long instructions ".repeat(15),
        paused: false,
      })
    ).status,
  ).toBe(409);
});
it("isolates client contexts and revokes preview, list, export and counts immediately", async () => {
  actor = "a";
  grant(actor, "skills.read");
  grant(actor, "skills.use");
  expect((await create({ projectId: "pb" })).response.status).toBe(403);
  const made = await create({ projectId: "pa" });
  expect(made.response.status).toBe(201);
  actor = "b";
  grant(actor, "skills.read");
  expect((await req(`/runs/${made.id}`, undefined, "GET")).status).toBe(404);
  actor = "a";
  db.exec("DELETE FROM project_staff WHERE user_id='a'");
  expect((await req(`/runs/${made.id}`, undefined, "GET")).status).toBe(404);
  expect(
    (await req(`/runs/${made.id}/export?format=html`, undefined, "GET")).status,
  ).toBe(404);
  expect(
    (await (await req("/runs", undefined, "GET")).json()).data,
  ).toHaveLength(0);
  expect((await (await req("", undefined, "GET")).json()).stats.total).toBe(0);
});
it("does not expose even independent briefs to a different skill reader", async () => {
  const made = await create();
  actor = "a";
  grant(actor, "skills.read");
  expect((await req(`/runs/${made.id}`, undefined, "GET")).status).toBe(404);
  expect((await (await req("/runs", undefined, "GET")).json()).data).toEqual(
    [],
  );
});
it("does not turn draft resource contents into agent context", async () => {
  await resource("PRIVATE DRAFT SHOULD NOT ENTER CONTEXT");
  actor = "a";
  grant(actor, "skills.read");
  const response = await req("/context", undefined, "GET");
  expect(await response.text()).not.toContain("PRIVATE DRAFT");
});
it("supports the existing limited operator and fails closed when its binding is revoked", async () => {
  db.exec(
    "INSERT INTO ai_project_members(project_id,user_id,role,status,granted_at,updated_at) VALUES('aip_avyron_web','operator','editor','active',1,1); INSERT INTO agent_operator_bindings(user_id,project_id,agent_slug,operator_role,status,permissions_json,synced_at) VALUES('operator','aip_avyron_web','leads','lead_operator','active','[]',1)",
  );
  grant("operator", "leads.read");
  actor = "operator";
  expect((await req("/context", undefined, "GET")).status).toBe(200);
  expect((await req("/resources", { title: "not allowed" })).status).toBe(403);
  expect((await create()).response.status).toBe(201);
  db.exec(
    "UPDATE agent_operator_bindings SET status='revoked' WHERE user_id='operator'",
  );
  expect((await req("/context", undefined, "GET")).status).toBe(403);
});
it("uses the hosted queue for explicit AI work and never double-executes a claimed job", async () => {
  const made = await create({}, "ai");
  expect(made.status).toBe("queued");
  expect(env.ASYNC_JOBS.sendBatch).toHaveBeenCalledOnce();
  await Promise.all([
    processSkillRun(env, made.id),
    processSkillRun(env, made.id),
  ]);
  expect(runAiCore).toHaveBeenCalledOnce();
  const saved = db
    .prepare("SELECT status,model FROM avy_skill_runs WHERE id=?")
    .get(made.id);
  expect(saved?.status).toBe("ready");
  expect(saved?.model).toBe("registered-primary");
  expect(vi.mocked(runAiCore).mock.calls[0][0]).toMatchObject({
    role: "primary",
    operation: "skill_brief_refinement",
  });
});
it("checks use permissions again when cloud work starts", async () => {
  actor = "a";
  grant(actor, "skills.read");
  grant(actor, "skills.use");
  const made = await create({}, "ai");
  db.exec(
    "UPDATE user_capabilities SET revoked_at=1 WHERE user_id='a' AND capability='skills.use'",
  );
  await drainSkillRuns(env);
  expect(runAiCore).not.toHaveBeenCalled();
  expect(
    db.prepare("SELECT error_code FROM avy_skill_runs WHERE id=?").get(made.id)
      ?.error_code,
  ).toBe("access_revoked");
});
it("retains a failed budget/provider decision without automatic inference retries", async () => {
  vi.mocked(runAiCore).mockRejectedValueOnce(
    new Error("ai_role_daily_limit_exceeded"),
  );
  const made = await create({}, "ai");
  await drainSkillRuns(env);
  await drainSkillRuns(env);
  expect(runAiCore).toHaveBeenCalledOnce();
  expect(
    db
      .prepare("SELECT status,error_code FROM avy_skill_runs WHERE id=?")
      .get(made.id),
  ).toMatchObject({
    status: "blocked",
    error_code: "ai_role_daily_limit_exceeded",
  });
});
it("respects the global kill switch before inference", async () => {
  const made = await create({}, "ai");
  db.exec(
    "INSERT INTO ai_kill_switches(scope_type,scope_id,enabled,reason,changed_at) VALUES('global','all',1,'synthetic test',1)",
  );
  await drainSkillRuns(env);
  expect(runAiCore).not.toHaveBeenCalled();
  expect(
    db.prepare("SELECT error_code FROM avy_skill_runs WHERE id=?").get(made.id)
      ?.error_code,
  ).toBe("agent_paused");
});
it("marks interrupted inference as failed instead of replaying a possibly consumed request", async () => {
  const made = await create({}, "ai");
  db.prepare(
    "UPDATE avy_skill_runs SET status='preparing',started_at=1 WHERE id=?",
  ).run(made.id);
  await drainSkillRuns(env);
  expect(runAiCore).not.toHaveBeenCalled();
  expect(
    db.prepare("SELECT error_code FROM avy_skill_runs WHERE id=?").get(made.id)
      ?.error_code,
  ).toBe("execution_interrupted");
});
it("keeps internal approval distinct from publication and prevents historical replacement", async () => {
  const made = await create();
  const r = await (await req(`/runs/${made.id}`, undefined, "GET")).json();
  expect(
    (
      await req(`/runs/${made.id}/state`, {
        revision: r.run.revision,
        status: "approved",
      })
    ).status,
  ).toBe(200);
  expect(
    db.prepare("SELECT status FROM avy_skill_runs WHERE id=?").get(made.id)
      ?.status,
  ).toBe("approved");
  expect(
    (await req(`/runs/${made.id}/state`, { revision: 1, status: "published" }))
      .status,
  ).toBe(400);
});
it("returns real editable HTML and Markdown exports under resource authorization", async () => {
  const made = await create();
  for (const format of ["html", "md"]) {
    const r = await req(
      `/runs/${made.id}/export?format=${format}`,
      undefined,
      "GET",
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toContain(`.${format}`);
    expect(await r.text()).toContain("Afacere sintetică");
  }
  expect(
    (await req(`/runs/${made.id}/export?format=pdf`, undefined, "GET")).status,
  ).toBe(400);
});
it("blocks sensitive uploads before reading or forwarding them when compliance is missing", async () => {
  env.BOUNCER_SENSITIVE_PROCESSING_APPROVED = "false";
  const vendor = bouncerFixture();
  vi.stubGlobal("fetch", vendor.fetcher);
  const id = await resource();
  db.prepare("UPDATE avy_skill_resources SET stage_key='visual' WHERE id=?").run(id);
  expect((await fileRequest(id, "private synthetic bytes")).status).toBe(503);
  expect(vendor.fetcher).not.toHaveBeenCalled();
  expect(
    db.prepare("SELECT object_key FROM avy_skill_resources WHERE id=?").get(id)
      ?.object_key,
  ).toBeNull();
});
it("permits only scanned CLEAN objects, requires approval and rechecks the exact R2 version", async () => {
  const vendor = bouncerFixture();
  vi.stubGlobal("fetch", vendor.fetcher);
  env.DOCUMENT_BACKUPS = malwareBucket() as unknown as R2Bucket;
  env.DOCUMENT_BACKUP_ISOLATION_VERIFIED = "true";
  const id = await resource();
  expect((await fileRequest(id, "Reusable reference text")).status).toBe(200);
  actor = "a";
  grant(actor, "skills.read");
  expect((await req(`/resources/${id}/file`, undefined, "GET")).status).toBe(
    404,
  );
  actor = "owner";
  const row = db
    .prepare("SELECT revision FROM avy_skill_resources WHERE id=?")
    .get(id);
  expect(
    (
      await req(`/resources/${id}/state`, {
        revision: row?.revision,
        status: "approved",
      })
    ).status,
  ).toBe(200);
  actor = "a";
  const read = await req(`/resources/${id}/file`, undefined, "GET");
  expect(read.status).toBe(200);
  expect(await read.text()).toBe("Reusable reference text");
  const resourceFile = db
    .prepare("SELECT object_key,backup_key FROM avy_skill_resources WHERE id=?")
    .get(id);
  expect(resourceFile?.backup_key).toBeTruthy();
  await files.delete(String(resourceFile?.object_key));
  const recovered = await req(`/resources/${id}/file`, undefined, "GET");
  expect(recovered.status).toBe(200);
  expect(recovered.headers.get("x-avyron-recovery")).toBe("backup");
  db.exec("DELETE FROM malware_object_verdicts");
  expect((await req(`/resources/${id}/file`, undefined, "GET")).status).toBe(
    409,
  );
});
it("quarantines suspicious files and refuses approval or direct download", async () => {
  const vendor = bouncerFixture("suspicious");
  vi.stubGlobal("fetch", vendor.fetcher);
  const id = await resource();
  expect((await fileRequest(id, "Suspicious fixture")).status).toBe(423);
  expect((await req(`/resources/${id}/file`, undefined, "GET")).status).toBe(
    409,
  );
  const row = db
    .prepare("SELECT revision FROM avy_skill_resources WHERE id=?")
    .get(id);
  expect(
    (
      await req(`/resources/${id}/state`, {
        revision: row?.revision,
        status: "approved",
      })
    ).status,
  ).toBe(409);
});
it("rejects malformed image signatures and oversized bodies without using a scan", async () => {
  const vendor = bouncerFixture();
  vi.stubGlobal("fetch", vendor.fetcher);
  const id = await resource();
  expect(
    (await fileRequest(id, "<svg onload='x'>", "image/png", "wrong.png"))
      .status,
  ).toBe(415);
  expect((await fileRequest(id, new Uint8Array(25_000_001))).status).toBe(413);
  expect(vendor.fetcher).not.toHaveBeenCalled();
});
it("escapes hostile brief markup and validates contacts before producing clickable actions", () => {
  const b = brief({
    business: '<script>alert("x")</script>',
    preferences: "<img src=x onerror=x>",
  });
  const html = renderSkillPreview("site-builder", b);
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("https://wa.me/40734605055");
  expect(briefSchema.safeParse(brief({ phone: "+" })).success).toBe(false);
  expect(
    briefSchema.safeParse(brief({ facebook: "javascript:alert(1)" })).success,
  ).toBe(false);
});
it("does not impose an arbitrary daily limit on internal preparations", async () => {
  for (let i = 0; i < 31; i++)
    expect((await create({ business: `Afacere ${i}` })).response.status).toBe(
      201,
    );
  expect(db.prepare("SELECT count(*) n FROM avy_skill_runs").get()?.n).toBe(31);
  expect(db.prepare("SELECT count(*) n FROM malware_scan_jobs").get()?.n).toBe(
    0,
  );
});
it("reserves the full-quality image ceiling and blocks unknown price/model profiles", () => {
  expect(
    verifiedImageReservation(
      "@cf/black-forest-labs/flux-2-klein-4b",
      1920,
      1920,
    ),
  ).toBe(417);
  expect(() =>
    verifiedImageReservation("unreviewed-image-model", 1920, 1920),
  ).toThrow("image_pricing_unverified");
  expect(() =>
    verifiedImageReservation(
      "@cf/black-forest-labs/flux-2-klein-4b",
      2048,
      1920,
    ),
  ).toThrow("invalid_image_dimensions");
  expect(imageDimensions("portrait")).toEqual({ width: 1088, height: 1920 });
  expect(() =>
    decodedGeneratedImage({ image: btoa('<svg onload="bad"/>') }),
  ).toThrow("image_output_invalid");
});
it("stores generated binary images privately and revalidates their exact object version", async () => {
  env.BOUNCER_ENABLED = "false";
  env.BOUNCER_SENSITIVE_PROCESSING_APPROVED = "false";
  env.DOCUMENT_BACKUPS = malwareBucket() as unknown as R2Bucket;
  env.DOCUMENT_BACKUP_ISOLATION_VERIFIED = "true";
  vi.mocked(runAiCore).mockResolvedValueOnce({
    output: {
      image: generatedPng(1920, 1088),
    },
    model: "@cf/black-forest-labs/flux-2-klein-4b",
    role: "image",
    maxTokens: 0,
    estimatedNeurons: 313,
  });
  const response = await app.request(
    "https://app.fixture.test/api/skills/media-generate/runs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ brief: brief(), mode: "image" }),
    },
    env,
  );
  expect(response.status).toBe(201);
  const made = await response.json();
  await drainSkillRuns(env);
  const {mediaPrompt}=await import('../shared/skills/creative');
  const input=vi.mocked(runAiCore).mock.calls[0][0].input.multipart as {body:ReadableStream;contentType:string};
  const posted=await new Response(input.body,{headers:{'content-type':input.contentType}}).formData();
  expect(String(posted.get('prompt')).replace(/\r\n/g,'\n')).toBe(mediaPrompt(briefSchema.parse(brief())));
  const path = `https://app.fixture.test/api/skills/media-generate/runs/${made.id}/image`;
  const image = await app.request(path, { method: "GET" }, env);
  expect(image.status).toBe(200);
  expect(image.headers.get("content-type")).toBe("image/png");
  expect(vi.mocked(runAiCore).mock.calls[0][0]).toMatchObject({
    role: "image",
    imageDimensions: { width: 1920, height: 1088 },
  });
  expect(db.prepare("SELECT count(*) n FROM malware_scan_jobs").get()?.n).toBe(
    0,
  );
  const row = db
    .prepare("SELECT * FROM avy_skill_generated_files WHERE run_id=?")
    .get(made.id);
  expect(row?.backup_key).toBeTruthy();
  await files.put(String(row?.object_key), new Uint8Array([1, 2, 3]));
  expect((await app.request(path, { method: "GET" }, env)).status).toBe(409);
  await files.delete(String(row?.object_key));
  const recovered = await app.request(path, { method: "GET" }, env);
  expect(recovered.status).toBe(200);
  expect(recovered.headers.get("x-avyron-recovery")).toBe("backup");
  actor = "client";
  expect((await app.request(path, { method: "GET" }, env)).status).toBe(403);
});
it("rejects image execution from Site Builder instead of bypassing the designated skill", async () => {
  expect((await create({}, "image")).response.status).toBe(400);
  expect(runAiCore).not.toHaveBeenCalled();
});
it("retains the original instructions in the run-specific Codex package", async () => {
  const made = await create();
  const before = await (
    await req(`/runs/${made.id}/skill.md`, undefined, "GET")
  ).text();
  expect(before).toContain("Upbar compact cu liquid glass");
  expect(before).toContain("snapshotul original");
  await req("/versions", {
    revision: 1,
    summary: "O nouă direcție pentru proiectele viitoare.",
    instructions: "Instrucțiuni complet noi pentru lucrări viitoare. ".repeat(
      4,
    ),
    paused: false,
  });
  expect(
    await (await req(`/runs/${made.id}/skill.md`, undefined, "GET")).text(),
  ).toBe(before);
});
it("revising an approved resource requires approval again and does not overwrite a used snapshot", async () => {
  const id = await resource(
    "O lecție inițială despre componente reutilizabile.",
  );
  await req(`/resources/${id}/state`, { revision: 1, status: "approved" });
  const made = await create();
  const original = db
    .prepare("SELECT context_md FROM avy_skill_runs WHERE id=?")
    .get(made.id)?.context_md;
  expect(
    (
      await req(
        `/resources/${id}`,
        {
          revision: 2,
          title: "Referință revizuită",
          domain: "general",
          body: "O nouă lecție care necesită verificare.",
          sourceUrl: "",
        },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  expect(
    db.prepare("SELECT status FROM avy_skill_resources WHERE id=?").get(id)
      ?.status,
  ).toBe("draft");
  expect(
    db.prepare("SELECT context_md FROM avy_skill_runs WHERE id=?").get(made.id)
      ?.context_md,
  ).toBe(original);
});
it("paginates resources without imposing a total storage count ceiling", async () => {
  const insert = db.prepare(
    "INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES(?,'site-builder',?,'general','Reusable instructions','approved',1,1)",
  );
  for (let i = 0; i < 65; i++) insert.run("paged_" + i, "Paged resource " + i);
  const first = await (await req("?q=Paged", undefined, "GET")).json();
  expect(first.resourceTotal).toBe(65);
  expect(first.resources).toHaveLength(20);
  expect(first.resourceNextOffset).toBe(20);
  const last = await (
    await req("?q=Paged&resourceOffset=60", undefined, "GET")
  ).json();
  expect(last.resources).toHaveLength(5);
  expect(last.resourceNextOffset).toBeNull();
});
it("prices image requests through real AI Core and respects the configured shared quota", async () => {
  const { runAiCore: realCore } = await vi.importActual<
    typeof import("../../cloudflare/workers/api/src/aiCore")
  >("../../cloudflare/workers/api/src/aiCore");
  const infer = vi.fn(async () => ({ image: "synthetic" }));
  env.AI = { run: infer } as Env["AI"];
  const input = {
    env,
    agentSlug: "ai-prod-content",
    operation: "skill_image_generation",
    promptCharacters: 100,
    role: "image" as const,
    imageDimensions: { width: 1920, height: 1088 },
    input: {
      multipart: {
        body: "synthetic",
        contentType: "multipart/form-data; boundary=synthetic",
      },
    },
  };
  const one = await realCore({ ...input, idempotencyKey: "native-image-1" });
  expect(one.estimatedNeurons).toBe(313);
  await realCore({ ...input, idempotencyKey: "native-image-2" });
  await expect(
    realCore({ ...input, idempotencyKey: "native-image-3" }),
  ).rejects.toThrow("ai_role_daily_limit_exceeded");
  expect(infer).toHaveBeenCalledTimes(2);
});
it("keeps project mockup preparation within a bounded D1 request budget", async () => {
  actor = "a";
  grant(actor, "skills.read");
  grant(actor, "skills.use");
  let queries = 0;
  const prepare = env.DB.prepare.bind(env.DB);
  env.DB.prepare = (sql: string) => {
    queries++;
    return prepare(sql);
  };
  expect((await create({ projectId: "pa" })).response.status).toBe(201);
  expect(queries).toBeLessThanOrEqual(45);
});
it("honors an organization's kill switch without sending the client's context to a model", async () => {
  db.exec(
    "INSERT INTO organizations(id,slug,name,created_at,updated_at) VALUES('org_synthetic','synthetic','Organization synthetic',1,1); UPDATE projects SET organization_id='org_synthetic' WHERE id='pa'; INSERT INTO ai_kill_switches(scope_type,scope_id,enabled,reason,changed_at) VALUES('organization','org_synthetic',1,'Synthetic pause',1)",
  );
  const made = await create({ projectId: "pa" }, "ai");
  await drainSkillRuns(env);
  expect(runAiCore).not.toHaveBeenCalled();
  expect(
    db.prepare("SELECT error_code FROM avy_skill_runs WHERE id=?").get(made.id)
      ?.error_code,
  ).toBe("agent_paused");
});
it("rolls back approval when its audit event cannot be recorded", async () => {
  const before = db.prepare("SELECT published_version,revision FROM avy_skills WHERE slug='site-builder'").get()!;
  await req("/versions", {
    revision: Number(before.revision),
    summary: "O nouă configurație de verificat înainte de folosire.",
    instructions: "Instrucțiuni de verificare atomică. ".repeat(8),
    paused: false,
  });
  db.exec(
    "CREATE TRIGGER fixture_fail_approval BEFORE INSERT ON avy_skill_events WHEN NEW.action='version.approved' BEGIN SELECT RAISE(ABORT,'fixture_audit_unavailable'); END",
  );
  expect((await req("/approve", { revision: Number(before.revision) + 1 })).status).toBe(409);
  expect(
    db
      .prepare(
        "SELECT published_version,revision FROM avy_skills WHERE slug='site-builder'",
      )
      .get(),
  ).toMatchObject({ published_version: before.published_version, revision: Number(before.revision) + 1 });
});

it("persists Free-only AI intent and falls back to the registered Free secondary without changing quotas", async () => {
  db.exec(
    "UPDATE ai_model_registry SET requires_billing=0,status='configured'; UPDATE ai_model_registry SET daily_neuron_limit=1 WHERE role='primary'",
  );
  const selected = await freeTextModel(env, 300);
  expect(selected.role).toBe("secondary");
  const response = await req("/runs", {
    brief: brief(),
    mode: "ai",
    freeOnly: true,
  });
  expect(response.status).toBe(201);
  const made = await response.json();
  expect(
    db.prepare("SELECT free_only FROM avy_skill_runs WHERE id=?").get(made.id)!
      .free_only,
  ).toBe(1);
  await processSkillRun(env, made.id);
  const executed=db.prepare("SELECT status,error_code FROM avy_skill_runs WHERE id=?").get(made.id)!;
  expect(executed, JSON.stringify(executed)).toMatchObject({status:'ready',error_code:null});
  expect(vi.mocked(runAiCore).mock.calls[0][0]).toMatchObject({
    role: "secondary",
    freeOnly: true,
    requestedMaxTokens: 256,
  });
  expect(
    db
      .prepare(
        "SELECT daily_neuron_limit FROM ai_model_registry WHERE role='primary'",
      )
      .get()!.daily_neuron_limit,
  ).toBe(1);
  expect(
    (await req("/runs", { brief: brief(), mode: "template", freeOnly: true }))
      .status,
  ).toBe(400);
});
it("never selects paid or exhausted models for a Free-only request and accepts both text response formats", async () => {
  db.exec(
    "UPDATE ai_model_registry SET requires_billing=1 WHERE role='primary'; UPDATE ai_model_registry SET daily_neuron_limit=1 WHERE role='secondary'",
  );
  await expect(freeTextModel(env, 300)).rejects.toThrow(
    "ai_free_budget_exhausted",
  );
  expect(runAiCore).not.toHaveBeenCalled();
  expect(
    freeTextOutput({
      choices: [
        { message: { content: " Ciornă Gemma ", reasoning_content: "secret" } },
      ],
    }),
  ).toBe("Ciornă Gemma");
  expect(freeTextOutput({ response: " Ciornă " })).toBe("Ciornă");
  expect(
    freeTextOutput({ choices: [{ message: { reasoning_content: "only" } }] }),
  ).toBe("");
});
it("exports agent-specific approved handoffs and marks demos distinctly from integrations",async()=>{
 const knowledge=await(await req('/knowledge',undefined,'GET')).json();expect(knowledge.domains.length).toBeGreaterThanOrEqual(14);expect(knowledge.examples.some(e=>e.kind==='mockup')).toBe(true);expect(knowledge.library.some(s=>s.effects.some(e=>e.state==='demo'))).toBe(true);
 for(const agent of ['codex','claude','lovable']){const response=await req(`/agents/${agent}.md?domain=medical`,undefined,'GET');expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(response.headers.get('etag')).toMatch(/^"[A-Za-z0-9_-]{43}"$/);const text=await response.text();expect(text).toContain('medical');expect(text).toContain('Orientare calmă spre consultație');expect(text).toContain('https://www.w3.org/WAI/tutorials/forms/');expect(text).not.toContain('Textură, variante și decizie');expect(text).not.toContain('Client B');}
 actor='client';expect((await req('/knowledge',undefined,'GET')).status).toBe(403);expect((await req('/agents/codex.md',undefined,'GET')).status).toBe(403);
});
it("builds distinct visual directions into new HTML concepts without script dependencies", () => {
  const transport = renderSkillPreview("site-builder", brief({ domain: "transport" }));
  const medical = renderSkillPreview("site-builder", brief({ domain: "medical" }));
  expect(transport).toContain('<body data-look="route"');
  expect(medical).toContain('<body data-look="calm"');
  expect(transport).toContain('content="noindex,nofollow"');
  expect(transport).not.toMatch(/<script\b|<iframe\b/);
  expect(medical).toContain("prefers-reduced-motion:reduce");
});
it("synchronizes published examples into idempotent drafts and removes hidden sources from future context",async()=>{
 const first=await(await req('/sources/sync',{},'POST')).json();expect(first.created).toBeGreaterThan(0);expect((await(await req('/sources/sync',{},'POST')).json()).created).toBe(0);
 expect(db.prepare("SELECT count(*) n FROM avy_skill_resources WHERE source_kind='carousel' AND status='approved'").get()!.n).toBe(0);
 const resource=db.prepare("SELECT id,revision FROM avy_skill_resources WHERE source_kind='carousel' LIMIT 1").get()!;expect((await req(`/resources/${resource.id}/state`,{revision:resource.revision,status:'approved'},'POST')).status).toBe(200);
 const {DEFAULT_EXAMPLE_CAROUSEL}=await import('../shared/exampleCarousels');const content={...DEFAULT_EXAMPLE_CAROUSEL,enabled:false};
 db.exec("INSERT INTO example_carousel_configs(page_key,revision,draft_json,updated_by,updated_at) VALUES('premium-website',1,'{}','owner',1)");db.prepare("INSERT INTO example_carousel_versions(page_key,revision,content_json,actor_user_id,created_at) VALUES('premium-website',1,?,'owner',1)").run(JSON.stringify(content));db.exec("UPDATE example_carousel_configs SET published_revision=1 WHERE page_key='premium-website'");
 const second=await(await req('/sources/sync',{},'POST')).json();expect(second.archived).toBe(first.examples);expect(db.prepare('SELECT status FROM avy_skill_resources WHERE id=?').get(resource.id)!.status).toBe('archived');expect((await(await req('/knowledge',undefined,'GET')).json()).examples).toHaveLength(0);
});
it("syncs artifact codes and native capabilities as drafts while preserving approval and private isolation",async()=>{
 const first=await(await req('/sources/sync',{},'POST')).json();expect(first.reusable).toBeGreaterThan(0);
 const rows=db.prepare("SELECT id,body,status FROM avy_skill_resources WHERE source_kind='builder-catalog'").all();
 expect(rows.length).toBe(first.reusable);expect(rows.every(r=>r.status==='draft')).toBe(true);expect(rows.some(r=>String(r.body).includes('PRZ-'))).toBe(true);
 const chosen=rows[0];expect((await req(`/resources/${chosen.id}/state`,{revision:1,status:'approved'},'POST')).status).toBe(200);
 expect((await(await req('/sources/sync',{},'POST')).json()).created).toBe(0);
 expect(db.prepare("SELECT status FROM avy_skill_resources WHERE id=?").get(chosen.id)!.status).toBe('approved');
 actor='a';grant(actor,'skills.read');
 const limited=await(await req('/knowledge',undefined,'GET')).json();expect(limited.connections.find(c=>c.id==='core').href).toBeNull();expect(limited.connections.find(c=>c.id==='artifacts').href).toBe('/biblioteca');
 expect(JSON.stringify(limited)).not.toContain('Client B');expect(limited.deliveryGates).toHaveLength(4);
 expect((await req('/sources/sync',{},'POST')).status).toBe(403);
});
it("imports active internal library records as reviewable references, retires archived sources and preserves manual resources",async()=>{
 db.exec("INSERT INTO internal_resources(id,kind,title,description,category,status,created_by,updated_by,created_at,updated_at) VALUES('reuse-fixture','library','Accessible section','Reusable public layout pattern.','UI','active','owner','owner',1,1)");
 const first=await(await req('/sources/sync',{},'POST')).json();expect(first.internal).toBe(1);
 const source=db.prepare("SELECT id,status,source_url FROM avy_skill_resources WHERE source_kind='builder-library' AND source_key='library:reuse-fixture'").get()!;expect(source.status).toBe('draft');expect(source.source_url).toBe('https://app.avyron.ro/profil?tab=library');
 actor='a';grant(actor,'skills.manage');const restricted=await(await req('/knowledge',undefined,'GET')).json();expect(restricted.internalLibrary).toEqual([]);await req('/sources/sync',{},'POST');expect(db.prepare('SELECT status FROM avy_skill_resources WHERE id=?').get(source.id)!.status).toBe('draft');actor='owner';
 db.exec("UPDATE internal_resources SET status='archived',updated_at=2 WHERE id='reuse-fixture'");
 await req('/sources/sync',{},'POST');expect(db.prepare('SELECT status FROM avy_skill_resources WHERE id=?').get(source.id)!.status).toBe('archived');
 expect(db.prepare("SELECT count(*) n FROM avy_skill_resources WHERE source_kind='repository' AND status='approved'").get()!.n).toBeGreaterThan(0);
});
it("includes custom resource domains in selection without exposing unapproved tags to read-only staff",async()=>{
 const response=await req('/resources',{title:'Domeniu nou',domain:'acoperisuri',body:'Referință personalizată pentru proiecte de acoperișuri.',sourceUrl:''});expect(response.status).toBe(201);
 const own=await(await req('',undefined,'GET')).json();expect(own.resourceDomains.some(d=>d.domain==='acoperisuri')).toBe(true);
 actor='a';grant(actor,'skills.read');const limited=await(await req('',undefined,'GET')).json();expect(limited.resourceDomains.some(d=>d.domain==='acoperisuri')).toBe(false);
});
it("keeps full approved instructions but sends a concise Site Builder refinement input",async()=>{
 const made=await create({},'ai');await processSkillRun(env,made.id);const call=vi.mocked(runAiCore).mock.calls[0][0];const input=call.input as {messages:{content:string}[]};const parsed=JSON.parse(input.messages[1].content);expect(parsed.business).toBe('Afacere sintetică');expect(parsed.references.length).toBeLessThanOrEqual(3);expect(input.messages[0].content).toContain('Instrucțiuni aprobate');expect(db.prepare('SELECT output_md FROM avy_skill_runs WHERE id=?').get(made.id)!.output_md).toContain('Contract comun AVYRON');
});
it("rejects a source sync when the published carousel changes before its transaction",async()=>{
 const batch=env.DB.batch.bind(env.DB);
 env.DB.batch=async(statements)=>{
  if(statements.some(s=>(s as unknown as Stmt).sql.includes("'sources.synced'"))){
   db.exec("INSERT INTO example_carousel_configs(page_key,revision,draft_json,updated_by,updated_at) VALUES('fixture-race',1,'{}','owner',1)");
   db.exec("INSERT INTO example_carousel_versions(page_key,revision,content_json,actor_user_id,created_at) VALUES('fixture-race',1,'{}','owner',1); UPDATE example_carousel_configs SET published_revision=1 WHERE page_key='fixture-race'");
  }
  return batch(statements);
 };
 expect((await req('/sources/sync',{},'POST')).status).toBe(409);
 expect(db.prepare("SELECT count(*) n FROM avy_skill_resources WHERE source_kind='carousel'").get()!.n).toBe(0);
 expect(db.prepare("SELECT count(*) n FROM avy_skill_events WHERE action='sources.synced'").get()!.n).toBe(0);
});
it("offers a bounded approved agent digest and respects a paused Site Builder",async()=>{
 const {siteAgentKnowledge}=await import('../../cloudflare/workers/api/src/siteAgentKnowledge');
 expect(await siteAgentKnowledge(env,'campanie social media')).toBe('');
 const digest=await siteAgentKnowledge(env,'website de prezentare');expect(digest).toContain('Tipare aprobate Site Builder');expect(digest.length).toBeLessThan(1800);expect(digest).not.toContain('Client B');
 const medical=await siteAgentKnowledge(env,'website clinica medicala');expect(medical).toContain('medical');
 db.exec("UPDATE avy_skills SET paused=1 WHERE slug='site-builder'");expect(await siteAgentKnowledge(env,'website')).toBe('');
});
it("keeps repository agent entrypoints synchronized with the shared knowledge contract",async()=>{
 const {SITE_AGENT_GUIDES,SITE_QUALITY_CONTRACT,SITE_KNOWLEDGE_VERSION}=await import('../shared/skills/siteKnowledge');
 const common=readFileSync('docs/site-builder/COMMON.md','utf8');expect(common).toContain(SITE_QUALITY_CONTRACT);expect(common).toContain(SITE_KNOWLEDGE_VERSION);
 for(const [agent,instructions] of Object.entries(SITE_AGENT_GUIDES))expect(readFileSync(`docs/site-builder/${agent.toUpperCase()}.md`,'utf8')).toContain(instructions);
});
it("exports logo SVG from its immutable snapshot and enforces resource authorization",async()=>{
 const response=await app.request('https://app.fixture.test/api/skills/logo-engine/runs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({brief:brief({projectId:'pa'}),mode:'template'})},env);expect(response.status).toBe(201);const made=await response.json();
 const path=`https://app.fixture.test/api/skills/logo-engine/runs/${made.id}/export?format=svg&direction=1`;
 const exported=await app.request(path,{},env);expect(exported.status).toBe(200);expect(exported.headers.get('content-type')).toContain('image/svg+xml');expect(exported.headers.get('cache-control')).toBe('private, no-store');const original=await exported.text();expect(original).toContain('Semnătură');
 expect(()=>db.prepare('UPDATE avy_skill_runs SET brief_json=? WHERE id=?').run(JSON.stringify(brief({business:'Changed brand'})),made.id)).toThrow('skill_result_immutable');expect(await(await app.request(path,{},env)).text()).toBe(original);
 expect((await app.request(path.replace('direction=1','direction=99'),{},env)).status).toBe(400);
 actor='b';grant(actor,'skills.read');grant(actor,'skills.use');expect((await app.request(path,{},env)).status).toBe(404);actor='client';expect((await app.request(path,{},env)).status).toBe(403);
});
it("preserves legacy idempotency hashes when new creative controls are left at defaults",async()=>{
 const {sha256}=await import('../../cloudflare/workers/api/src/security');const {logo,media,...legacy}=brief();void logo;void media;
 const key=crypto.randomUUID();const made=await create({},'template',key);const stored=db.prepare('SELECT request_hash FROM avy_skill_runs WHERE id=?').get(made.id)!;
 expect(stored.request_hash).toBe(await sha256(JSON.stringify({slug:'site-builder',brief:legacy,mode:'template'})));
 const retry=await req('/runs',{brief:legacy,mode:'template'},'POST',{'Idempotency-Key':key});expect(retry.status).toBe(200);expect((await retry.json()).id).toBe(made.id);
});
it("includes approved creative references in the compact AI handoff",async()=>{
 db.exec("INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_by,created_at,updated_at) VALUES('logo-reference','logo-engine','Materiale aprobate','general','Tipografie lizibila, contrast si proportii validate pentru concept.','approved','owner',1,1)");
 const response=await app.request('https://app.fixture.test/api/skills/logo-engine/runs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({brief:brief(),mode:'ai'})},env);expect(response.status).toBe(201);const made=await response.json();await processSkillRun(env,made.id);
 const input=vi.mocked(runAiCore).mock.calls[0][0].input as {messages:{content:string}[]};expect(JSON.parse(input.messages[1].content).references.join('\n')).toContain('Materiale aprobate');expect(input.messages[0].content).toContain('Standard creativ AVYRON');
});

it("retains approved creative references in Free-only runs without widening model budgets", async () => {
  db.exec("UPDATE ai_model_registry SET requires_billing=0,status='configured'");
  db.exec("INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_by,created_at,updated_at) VALUES('release-logo-reference','logo-engine','Referinta aprobata pentru release','general','Contrast si lizibilitate validate pentru studiul vizual.','approved','owner',1,1)");
  const response = await app.request('https://app.fixture.test/api/skills/logo-engine/runs', {
    method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},
    body:JSON.stringify({brief:brief(),mode:'ai',freeOnly:true}),
  }, env);
  expect(response.status).toBe(201);
  const made=await response.json();await processSkillRun(env,made.id);
  const call=vi.mocked(runAiCore).mock.calls[0][0];
  expect(call.freeOnly).toBe(true);expect(call.requestedMaxTokens).toBeLessThanOrEqual(256);
  const input=call.input as {messages:{content:string}[]};
  expect(input.messages[0].content).toContain('Standard creativ AVYRON');
  const context=JSON.parse(input.messages[1].content);
  expect(context.references.join('\n')).toContain('Referinta aprobata pentru release');
  expect(context.logo).toBeDefined();
});

it("seeds all eight stage workflows as reviewable drafts without changing existing resource classifications", async () => {
  const rows = db
    .prepare(
      "SELECT stage_key,title,body,status FROM avy_skill_resources WHERE stage_key IS NOT NULL AND source_revision='2026-11-10.2' ORDER BY stage_key",
    )
    .all();
  expect(rows).toHaveLength(8);
  for (const stage of SITE_STAGES) {
    const saved = rows.find((r) => r.stage_key === stage.key)!;
    expect(saved.status).toBe("draft");
    expect(saved.body).toBe(stage.workflow);
  }
  expect((await req("?stage=visual", undefined, "GET")).status).toBe(200);
  expect((await req("?stage=unknown", undefined, "GET")).status).toBe(400);
  actor = "a";
  grant(actor, "skills.read");
  const limited = await (await req("?stage=visual", undefined, "GET")).json();
  expect(limited.resources).toEqual([]);
  expect(limited.resourceStages).toEqual([]);
  actor = "client";
  expect((await req("?stage=visual", undefined, "GET")).status).toBe(403);
});
it("stage editing uses native revision checks, preserves classification for legacy editors and requires reapproval", async () => {
  const id = "site_workflow_visual",
    original = SITE_STAGES[0];
  expect(
    (await req(`/resources/${id}/state`, { revision: 1, status: "approved" }))
      .status,
  ).toBe(200);
  const patch = {
    title: "Workflow vizual revizuit",
    domain: "beauty",
    body: original.workflow,
    sourceUrl: "",
    revision: 2,
  };
  expect((await req(`/resources/${id}`, patch, "PATCH")).status).toBe(200);
  let saved = db
    .prepare(
      "SELECT stage_key,status,revision FROM avy_skill_resources WHERE id=?",
    )
    .get(id)!;
  expect(saved).toMatchObject({
    stage_key: "visual",
    status: "draft",
    revision: 3,
  });
  expect((await req(`/resources/${id}`, patch, "PATCH")).status).toBe(409);
  expect(
    (
      await req(
        `/resources/${id}`,
        { ...patch, revision: 3, stageKey: "refinement" },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  const detail = await (
    await req("?stage=refinement", undefined, "GET")
  ).json();
  expect(detail.resources.some((r) => r.id === id)).toBe(true);
  expect(
    (
      await req(
        `/resources/${id}`,
        { ...patch, revision: 4, stageKey: null },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  saved = db
    .prepare("SELECT stage_key FROM avy_skill_resources WHERE id=?")
    .get(id)!;
  expect(saved.stage_key).toBeNull();
  actor = "a";
  grant(actor, "skills.read");
  expect(
    (await req(`/resources/${id}`, { ...patch, revision: 5 }, "PATCH")).status,
  ).toBe(403);
});
it("exports only approved stage instructions, excludes them from unrelated mockup context, and revalidates revocation", async () => {
  const id = "site_workflow_20261110_security";
  expect((await req("/stages/security.md", undefined, "GET")).status).toBe(409);
  expect(
    (await req(`/resources/${id}/state`, { revision: 1, status: "approved" }))
      .status,
  ).toBe(200);
  actor = "a";
  grant(actor, "skills.read");
  const exported = await req("/stages/security.md", undefined, "GET");
  expect(exported.status).toBe(200);
  expect(exported.headers.get("Cache-Control")).toBe("private, no-store");
  const text = await exported.text();
  expect(text).toContain(
    SITE_STAGES.find((s) => s.key === "security")!.workflow,
  );
  expect(text).not.toContain(SITE_STAGES[0].workflow);
  const generic = await (await req("/context", undefined, "GET")).json();
  expect(generic.references).not.toContain("Raport de securitate");
  expect(generic.references).not.toContain("Fișierele externe se eliberează");
  db.prepare("DELETE FROM user_capabilities WHERE user_id='a'").run();
  expect((await req("/stages/security.md", undefined, "GET")).status).toBe(403);
  actor = "owner";
  expect(
    (await req(`/resources/${id}/state`, { revision: 2, status: "archived" }))
      .status,
  ).toBe(200);
  expect((await req("/stages/security.md", undefined, "GET")).status).toBe(409);
});
it("validates stage assignment in API and database and keeps pagination stage-scoped", async () => {
  expect(
    (
      await req("/resources", {
        title: "Prompt",
        body: "Instrucțiune pentru o etapă",
        stageKey: "not-a-stage",
      })
    ).status,
  ).toBe(400);
  const result = await req("/resources", {
    title: "Prompt test",
    body: "Instrucțiune pentru exemplul vizual",
    stageKey: "visual",
  });
  expect(result.status).toBe(201);
  const { id } = await result.json();
  expect(
    db.prepare("SELECT stage_key FROM avy_skill_resources WHERE id=?").get(id)!
      .stage_key,
  ).toBe("visual");
  expect(
    (
      await app.request(
        "https://app.fixture.test/api/skills/logo-engine/resources",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Nu este site",
            body: "Resursă într-un alt skill",
            stageKey: "visual",
          }),
        },
        env,
      )
    ).status,
  ).toBe(400);
  expect(() =>
    db
      .prepare(
        "UPDATE avy_skill_resources SET skill_slug='logo-engine' WHERE id=?",
      )
      .run(id),
  ).toThrow();
  for (let i = 0; i < 25; i++)
    db.prepare(
      "INSERT INTO avy_skill_resources(id,skill_slug,title,body,stage_key,created_at,updated_at) VALUES(?,'site-builder',?,'Instrucțiuni de test','visual',1,1)",
    ).run("stage_page_" + i, "Stage page " + i);
  const first = await (
    await req("?stage=visual&q=Stage%20page", undefined, "GET")
  ).json();
  expect(first.resourceTotal).toBe(25);
  expect(first.resources).toHaveLength(20);
  const last = await (
    await req(
      "?stage=visual&q=Stage%20page&resourceOffset=20",
      undefined,
      "GET",
    )
  ).json();
  expect(last.resources).toHaveLength(5);
  expect(last.resourceNextOffset).toBeNull();
  const other = await (
    await req("?stage=launch&q=Stage%20page", undefined, "GET")
  ).json();
  expect(other.resourceTotal).toBe(0);
});

it("paginates approved stage handoffs explicitly without imposing a library ceiling", async () => {
  for (let i = 0; i < 25; i++)
    db.prepare(
      "INSERT INTO avy_skill_resources(id,skill_slug,title,body,stage_key,status,created_at,updated_at) VALUES(?,'site-builder',?,'Prompt aprobat de test','launch','approved',1,1)",
    ).run("handoff_" + String(i).padStart(2, "0"), "Handoff " + i);
  const first = await (await req("/stages/launch.md", undefined, "GET")).text();
  expect(first).toContain("offset=20");
  expect(first).toContain("Handoff 0");
  expect(first).not.toContain("## Handoff 24");
  const last = await (
    await req("/stages/launch.md?offset=20", undefined, "GET")
  ).text();
  expect(last).toContain("Handoff 24");
  expect(last).not.toContain("## Continuare");
  expect(
    (await req("/stages/launch.md?offset=-1", undefined, "GET")).status,
  ).toBe(400);
});
