import { createRequire } from "node:module";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync as Sqlite, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import type { AppBindings, Env } from "../../cloudflare/workers/api/src/types";
import { leadsAgencyRouter } from "../../cloudflare/workers/api/src/leadsAgency";
import { futureLeadsRouter } from "../../cloudflare/workers/api/src/futureLeads";
import { projectsRouter } from "../../cloudflare/workers/api/src/projects";
import { leadsRouter } from "../../cloudflare/workers/api/src/leads";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
let snapshot: string | undefined;
export function closeAgencySchemas() {
  if (snapshot) rmSync(snapshot, { recursive: true, force: true });
  snapshot = undefined;
}
class Statement {
  values: SQLInputValue[] = [];
  constructor(
    readonly db: Sqlite,
    readonly sql: string,
  ) {}
  bind(...values: SQLInputValue[]) {
    this.values = values;
    return this;
  }
  async first<T>() {
    return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null;
  }
  async all<T>() {
    return { results: this.db.prepare(this.sql).all(...this.values) as T[] };
  }
  async run() {
    return { meta: this.db.prepare(this.sql).run(...this.values) };
  }
}
/** Synthetic auth at the boundary; real Hono handlers and a migrated persistent SQLite file. No provider calls. */
export function createAgencyBackend() {
  if (!snapshot) {
    snapshot = mkdtempSync(join(tmpdir(), "agency-browser-schema-"));
    const base = new DatabaseSync(join(snapshot, "base.sqlite"));
    for (const f of readdirSync("cloudflare/d1/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      base.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
    base.close();
  }
  const folder = mkdtempSync(join(tmpdir(), "agency-browser-"));
  const file = join(folder, "data.sqlite");
  copyFileSync(join(snapshot, "base.sqlite"), file);
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys=ON");
  for (const [id, email, role] of [
    ["owner", "prometheus@avyron.ro", "admin"],
    ["reader", "reader@example.test", "staff"],
    ["client", "client@example.test", "user"],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,password_hash,email_verified,display_name,created_at,updated_at) VALUES(?,?, 'synthetic',1,'Operator de test',1,1)",
    ).run(id, email);
    db.prepare("INSERT INTO user_roles(user_id,role) VALUES(?,?)").run(
      id,
      role,
    );
  }
  db.prepare(
    "INSERT INTO user_capabilities(id,user_id,capability,granted_by,reason,created_at) VALUES('reader-grant','reader','leads_agency.read','owner','fixture',1)",
  ).run();
  let actor = "owner";
  let beforeBatch: (() => void) | undefined;
  const DB = {
    prepare: (sql: string) => new Statement(db, sql),
    batch: async (ss: Statement[]) => {
      const hook=beforeBatch;beforeBatch=undefined;hook?.();
      db.exec("BEGIN");
      try {
        const rows = [];
        for (const s of ss) rows.push(await s.run());
        db.exec("COMMIT");
        return rows;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const env = { DB, MFA_AUTH_ENABLED: "false" } as unknown as Env;
  const app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("userId", actor);
    c.set(
      "roles",
      db
        .prepare("SELECT role FROM user_roles WHERE user_id=?")
        .all(actor)
        .map((r) => r.role) as ("user" | "staff" | "admin")[],
    );
    c.set("requestId", "browser-fixture");
    await next();
  });
  app.route("/", leadsAgencyRouter);
  app.route("/", leadsRouter);
  app.route("/", futureLeadsRouter);
  app.route("/", projectsRouter);
  return {
    db,
    env,
    beforeBatch: (hook:()=>void)=>{beforeBatch=hook;},
    get actor() {
      return actor;
    },
    set actor(v: string) {
      actor = v;
    },
    request: (path: string, init: RequestInit = {}) =>
      app.request("https://fixture.example.test" + path, init, env),
    close: () => {
      db.close();
      rmSync(folder, { recursive: true, force: true });
    },
  };
}
export type AgencyBackend = ReturnType<typeof createAgencyBackend>;
