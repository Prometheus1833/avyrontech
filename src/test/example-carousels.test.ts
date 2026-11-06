// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { Hono } from "hono";
import { beforeEach, afterEach, it, expect } from "vitest";
import { exampleCarouselsRouter } from "../../cloudflare/workers/api/src/exampleCarousels";
import { readApprovalCenter } from "../../cloudflare/workers/api/src/approvalCenter";
import {
  DEFAULT_EXAMPLE_CAROUSEL,
  blankCarousel,
  publicExampleUrl,
  type CarouselConfig,
} from "../shared/exampleCarousels";
import {
  publicBootstrapJson,
  renderCarouselStatic,
  defaultCarouselHeading,
} from "../shared/exampleCarouselRendering";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";
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
  app: Hono<AppBindings>,
  actor: string,
  mfa: boolean,
  env: AppBindings["Bindings"],
  beforeBatch: (() => void) | null;
const root = "/api/admin/example-carousels",
  website = "premium-website";
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const f of readdirSync("cloudflare/d1/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
  for (const [id, email] of [
    ["owner", "prometheus@avyron.ro"],
    ["staff", "staff@fixture.test"],
    ["client", "client@fixture.test"],
    ["editor", "editor@fixture.test"],
    ["reviewer", "reviewer@fixture.test"],
    ["publisher", "publisher@fixture.test"],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)",
    ).run(id, email, "synthetic");
    db.prepare("INSERT INTO user_roles VALUES(?,?)").run(
      id,
      id === "owner" ? "admin" : id === "client" ? "user" : "staff",
    );
  }
  for (const [id, permissions] of [
    ["editor", ["examples.read", "examples.edit"]],
    ["reviewer", ["examples.read", "examples.approve"]],
    ["publisher", ["examples.read", "examples.publish"]],
  ] as const)
    for (const p of permissions)
      db.prepare(
        "INSERT INTO user_capabilities(id,user_id,capability,reason,granted_by,created_at) VALUES(?,?,?,'Test','owner',1)",
      ).run(crypto.randomUUID(), id, p);
  const binding = {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => {
      const hook = beforeBatch;
      beforeBatch = null;
      hook?.();
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({
          meta: db.prepare(s.sql).run(...s.values),
        }));
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  env = {
    DB: binding,
    MFA_AUTH_ENABLED: "false",
  } as unknown as AppBindings["Bindings"];
  actor = "owner";
  mfa = false;
  beforeBatch = null;
  app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("userId", actor);
    c.set("roles", [
      actor === "owner" ? "admin" : actor === "client" ? "user" : "staff",
    ]);
    c.set("mfaVerified", mfa);
    await next();
  });
  app.route("/", exampleCarouselsRouter);
});
afterEach(() => db.close());
const request = (
  path: string,
  body?: unknown,
  method = "POST",
  id = crypto.randomUUID(),
) =>
  app.request(
    path,
    body === undefined
      ? {}
      : {
          method,
          headers: {
            "content-type": "application/json",
            "idempotency-key": id,
          },
          body: JSON.stringify(body),
        },
    env,
  );
const config = () => structuredClone(DEFAULT_EXAMPLE_CAROUSEL);
const save = (
  revision = 0,
  value = config(),
  key = website,
  id = crypto.randomUUID(),
) => request(`${root}/${key}`, { revision, config: value }, "PUT", id);
const stage = (
  action: string,
  revision = 1,
  key = website,
  id = crypto.randomUUID(),
) =>
  request(
    `${root}/${key}/${action}`,
    { revision, confirmed: true },
    "POST",
    id,
  );
const publicConfig = async (key = website) =>
  (await (await request(`/api/public/example-carousels/${key}`)).json())
    .config as CarouselConfig | null;
it("preserves all 18 public examples while rejecting every client administration route", async () => {
  expect((await publicConfig())!.items).toHaveLength(18);
  actor = "client";
  for (const path of [
    root,
    `${root}/${website}`,
    `${root}/${website}/versions/1`,
  ])
    expect((await request(path)).status).toBe(403);
  expect((await save()).status).toBe(403);
  expect((await stage("approve")).status).toBe(403);
  actor = "staff";
  expect((await request(root)).status).toBe(200);
  expect((await save()).status).toBe(403);
});
it("publishes only the reviewed version and excludes hidden archived and deleted examples from the public payload", async () => {
  const c = config();
  c.items[0].visibility = "hidden";
  c.items[1].visibility = "archived";
  c.items.splice(2, 1);
  const id = crypto.randomUUID();
  expect((await save(0, c, website, id)).status).toBe(200);
  expect((await save(0, c, website, id)).status).toBe(200);
  expect((await publicConfig())!.items).toHaveLength(18);
  expect((await stage("publish")).status).toBe(409);
  const submitted = crypto.randomUUID();
  expect((await stage("submit", 1, website, submitted)).status).toBe(200);
  expect((await stage("submit", 1, website, submitted)).status).toBe(200);
  const inbox = await readApprovalCenter(env, "owner", { source: "carousel" });
  expect(inbox?.data[0]).toMatchObject({
    source: "carousel",
    revision: 1,
    canDecide: false,
    href: "/profil?tab=example-carousels&carousel=premium-website",
  });
  expect(
    db.prepare("SELECT count(*) n FROM operation_notifications").get()!.n,
  ).toBe(1);
  expect((await stage("approve")).status).toBe(200);
  const published = crypto.randomUUID();
  expect((await stage("publish", 1, website, published)).status).toBe(200);
  expect((await stage("publish", 1, website, published)).status).toBe(200);
  const response = await request(`/api/public/example-carousels/${website}`),
    body = await response.text();
  expect(JSON.parse(body).config.items).toHaveLength(15);
  expect(body).not.toContain("Cutiutamagica.eu");
  expect(body).not.toContain("Ruller.eu");
  expect(body).not.toContain("Clarlumanari.ro");
  expect(body).not.toContain("actor_user_id");
  expect(response.headers.get("cache-control")).toBe(
    "public, max-age=0, must-revalidate",
  );
});
it("separates edit approve publish and MFA authority and immediately revokes cached mutation access", async () => {
  actor = "editor";
  const id = crypto.randomUUID();
  expect((await save(0, config(), website, id)).status).toBe(200);
  expect((await stage("submit")).status).toBe(200);
  expect((await stage("approve")).status).toBe(403);
  actor = "reviewer";
  expect((await save(1)).status).toBe(403);
  expect((await stage("approve")).status).toBe(200);
  expect((await stage("publish")).status).toBe(403);
  actor = "publisher";
  expect((await stage("publish")).status).toBe(200);
  actor = "editor";
  db.prepare(
    "UPDATE user_capabilities SET revoked_at=1 WHERE user_id='editor' AND capability='examples.edit'",
  ).run();
  expect((await save(0, config(), website, id)).status).toBe(403);
  actor = "owner";
  env.MFA_AUTH_ENABLED = "true";
  expect((await save(1)).status).toBe(403);
  mfa = true;
  expect((await save(1)).status).toBe(200);
});
it("invalidates approval after edits preserves immutable history and restores through a new draft", async () => {
  expect((await save()).status).toBe(200);
  await stage("submit");
  await stage("approve");
  await stage("publish");
  const edited = config();
  edited.items[0].name = "New title";
  expect((await save(1, edited)).status).toBe(200);
  expect((await stage("publish", 1)).status).toBe(409);
  expect((await stage("publish", 2)).status).toBe(409);
  expect((await publicConfig())!.items[0].name).not.toBe("New title");
  const historic = await (
    await request(`${root}/${website}/versions/1`)
  ).json();
  expect(historic.config.items[0].name).toBe("Cutiutamagica.eu");
  expect((await save(2, historic.config)).status).toBe(200);
  expect(
    db.prepare("SELECT count(*) n FROM example_carousel_versions").get()!.n,
  ).toBe(3);
  expect(() =>
    db.exec("UPDATE example_carousel_versions SET content_json='{}'"),
  ).toThrow("immutable_example_version");
  expect(() => db.exec("DELETE FROM example_carousel_versions")).toThrow(
    "immutable_example_version",
  );
});
it("rejects unsafe URLs schema expansion duplicates oversized input and unconfirmed publication", async () => {
  for (const href of [
    "javascript:alert(1)",
    "//evil.example",
    "http://example.com",
    "https://127.0.0.1/a",
    "/api/documents/secret",
    "https://app.avyron.ro/profil",
    "https://example.com/?token=secret",
  ]) {
    const c = config();
    c.items[0].href = href;
    expect((await save(0, c)).status).toBe(400);
  }
  const duplicate = config();
  duplicate.items.push(duplicate.items[0]);
  expect((await save(0, duplicate)).status).toBe(400);
  expect(
    (
      await request(
        `${root}/${website}`,
        { revision: 0, config: { ...config(), unsafeCode: "<script>" } },
        "PUT",
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await request(
        `${root}/${website}`,
        { revision: 0, config: { ...config(), padding: "x".repeat(220000) } },
        "PUT",
      )
    ).status,
  ).toBe(413);
  await save();
  expect(
    (await request(`${root}/${website}/publish`, { revision: 1 })).status,
  ).toBe(400);
  expect((await request(`${root}/unknown`)).status).toBe(404);
});
it("rejects stale concurrent writes atomically and never mixes service carousels", async () => {
  await save();
  beforeBatch = () =>
    db.exec(
      "UPDATE example_carousel_configs SET revision=2 WHERE page_key='premium-website'",
    );
  const id = crypto.randomUUID();
  expect((await save(1, config(), website, id)).status).toBe(409);
  expect(
    db.prepare("SELECT count(*) n FROM example_carousel_versions").get()!.n,
  ).toBe(1);
  expect(
    db
      .prepare(
        "SELECT count(*) n FROM idempotency_keys WHERE idempotency_key=?",
      )
      .get(id)!.n,
  ).toBe(0);
  expect(await publicConfig("seo-ai")).toBeNull();
  const seo = blankCarousel();
  seo.enabled = false;
  expect((await save(0, seo, "seo-ai")).status).toBe(200);
  await stage("submit", 1, "seo-ai");
  await stage("approve", 1, "seo-ai");
  await stage("publish", 1, "seo-ai");
  expect((await publicConfig("seo-ai"))!.enabled).toBe(false);
  expect((await publicConfig())!.items).toHaveLength(18);
});
it("deduplicates retries with a body hash and rejects changed payloads with the same key", async () => {
  const id = crypto.randomUUID();
  await save(0, config(), website, id);
  const changed = config();
  changed.speed = 75;
  expect((await save(0, changed, website, id)).status).toBe(409);
  expect(
    db.prepare("SELECT count(*) n FROM example_carousel_versions").get()!.n,
  ).toBe(1);
});
it("escapes public HTML and bootstrap and never renders a hidden example", () => {
  const c = config();
  c.items[0].name = "<script>alert(1)</script>";
  c.items[1].visibility = "hidden";
  c.heading.title.ro = "</script><img src=x onerror=alert(1)>";
  const assets = Object.fromEntries(
    c.items.map((i) => [i.image.slice(8), "/assets/" + i.key + ".jpg"]),
  );
  const html = renderCarouselStatic(
    c,
    "ro",
    assets,
    defaultCarouselHeading("ro"),
  );
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("Ruller.eu");
  const json = publicBootstrapJson(website, c);
  expect(json).not.toContain("</script>");
  expect(JSON.parse(json)[website].heading.title.ro).toBe(c.heading.title.ro);
  expect(publicExampleUrl("/api/visual-assets/id/content", true)).toBe(false);
});
