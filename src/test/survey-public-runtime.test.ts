// @vitest-environment node
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from "node:sqlite";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { surveyPublic } from "../../cloudflare/workers/api/src/surveys/public";
import type { Env } from "../../cloudflare/workers/api/src/types";

vi.mock("../../cloudflare/workers/api/src/antispam", () => ({
  checkRateLimit: async () => ({ ok: true }),
  clientIp: () => "fixture",
  hashKey: async (value: string) => value,
  verifyTurnstile: async () => ({ ok: true }),
}));
vi.mock("../../cloudflare/workers/api/src/surveys/tasks", () => ({
  processSurveyEvents: async () => {},
  suggestSurveyText: async () => ({ available: false }),
}));

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe("Smart Surveys public runtime", () => {
  let db: SqliteDatabase;
  let app: Hono;
  let env: Env;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys=ON");
    for (const migration of readdirSync("cloudflare/d1/migrations").filter((file) => file.endsWith(".sql")).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${migration}`, "utf8"));
    }
    env = {
      DB: {
        prepare: (sql: string) => new Statement(db, sql),
        batch: async (statements: Statement[]) => {
          db.exec("BEGIN");
          try {
            const results = [];
            for (const statement of statements) results.push(await statement.run());
            db.exec("COMMIT");
            return results;
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
        },
      },
      JWT_SECRET: "test-secret-never-production",
      TURNSTILE_SECRET: "fixture",
      TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
      ALLOWED_ORIGINS: "http://localhost:8080",
      FILES: { put: async () => {}, delete: async () => {}, get: async () => null },
    } as unknown as Env;
    app = new Hono();
    app.route("/", surveyPublic);
  });

  afterEach(() => db.close());

  const request = (
    path: string,
    body?: unknown,
    method = body === undefined ? "GET" : "POST",
    token?: string,
  ) => app.request(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-survey-token": token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, env, { waitUntil: () => {}, passThroughOnException: () => {}, props: {} });

  it("publishes exactly the synchronized nine-template catalog", async () => {
    const response = await request("/api/surveys/templates");
    expect(response.status).toBe(200);
    const payload = await response.json() as { data: Array<{ id: string; presentation: { features: string[] } }> };
    expect(payload.data).toHaveLength(9);
    expect(payload.data.map((item) => item.id)).not.toEqual(expect.arrayContaining(["seo", "onboarding", "feedback", "content"]));
    expect(payload.data.find((item) => item.id === "website")?.presentation.features).toHaveLength(3);
  });

  it("starts, resumes, autosaves and submits a public brief without stale overwrites", async () => {
    const started = await request("/api/surveys/start", {
      template: "website",
      requestKey: crypto.randomUUID(),
      turnstileToken: "fixture",
    });
    expect(started.status).toBe(201);
    const session = await started.json() as { id: string; token: string };

    const opened = await request("/api/surveys/session", undefined, "GET", session.token);
    expect(opened.status).toBe(200);
    expect((await opened.json() as { revision: number }).revision).toBe(1);

    const answers = {
      business: "Companie",
      activity: "Servicii profesionale",
      objectives: ["Prezentare profesională"],
      page_topics: "Acasă și Servicii",
      name: "Client",
      email: "client@example.test",
      privacy: true,
    };
    expect((await request("/api/surveys/session", { revision: 1, patch: answers }, "PATCH", session.token)).status).toBe(200);
    expect((await request("/api/surveys/session", { revision: 1, patch: { business: "Suprascris" } }, "PATCH", session.token)).status).toBe(409);

    const submitted = await request("/api/surveys/submit", { revision: 2 }, "POST", session.token);
    expect(submitted.status).toBe(200);
    expect(db.prepare("SELECT COUNT(*) AS total FROM survey_briefs").get()!.total).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS total FROM outbox_events WHERE event_type='survey.completed'").get()!.total).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS total FROM outbox_events WHERE event_type='survey.ai_requested'").get()!.total).toBe(1);
  });
});
