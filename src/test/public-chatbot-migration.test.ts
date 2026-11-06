// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it, expect } from "vitest";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
const migration = readFileSync(
  "cloudflare/d1/migrations/0097_public_chatbot_conversation.sql",
  "utf8",
);
function fixture() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync("cloudflare/d1/migrations")
    .filter((f) => f.endsWith(".sql") && f < "0097")
    .sort())
    db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
  return db;
}
describe("Public chatbot defaults migration", () => {
  it("creates an immutable new approved snapshot, preserves tool policies and is idempotent", () => {
    const db = fixture();
    try {
      const previous = db
        .prepare(
          "SELECT * FROM ai_agent_versions WHERE agent_slug='avy' AND version=1",
        )
        .get()!;
      db.exec(migration);
      expect(
        db
          .prepare("SELECT current_version FROM ai_agents WHERE slug='avy'")
          .get()!.current_version,
      ).toBe(2);
      expect(
        db
          .prepare(
            "SELECT * FROM ai_agent_versions WHERE agent_slug='avy' AND version=1",
          )
          .get(),
      ).toEqual(previous);
      expect(
        db
          .prepare(
            "SELECT system_prompt,guardrails FROM ai_agent_versions WHERE agent_slug='avy' AND version=2",
          )
          .get(),
      ).toMatchObject({
        system_prompt: expect.stringContaining("conversații generale"),
        guardrails: expect.not.stringContaining("300 EUR"),
      });
      const original = db
        .prepare(
          "SELECT tool_slug,mode,allowed_scopes_json,max_calls_per_run FROM ai_agent_tool_policies WHERE agent_version_id=? ORDER BY tool_slug",
        )
        .all(previous.id!);
      expect(
        db
          .prepare(
            "SELECT tool_slug,mode,allowed_scopes_json,max_calls_per_run FROM ai_agent_tool_policies WHERE agent_version_id='agent_version_avy_general_0097' ORDER BY tool_slug",
          )
          .all(),
      ).toEqual(original);
      db.exec(migration);
      expect(
        db
          .prepare(
            "SELECT COUNT(*) n FROM ai_agent_versions WHERE agent_slug='avy'",
          )
          .get()!.n,
      ).toBe(2);
    } finally {
      db.close();
    }
  });
  it("does not overwrite custom instructions, greetings, provider policy or quota", () => {
    const db = fixture();
    try {
      db.exec(
        "UPDATE ai_agents SET system_prompt='Personalizat',greeting_ro='Bună de la echipă' WHERE slug='avy'",
      );
      const policy = db
          .prepare("SELECT * FROM financial_agent_provider_policies")
          .all(),
        quota = db.prepare("SELECT * FROM financial_provider_quotas").all();
      db.exec(migration);
      expect(
        db
          .prepare(
            "SELECT system_prompt,greeting_ro,current_version FROM ai_agents WHERE slug='avy'",
          )
          .get(),
      ).toMatchObject({
        system_prompt: "Personalizat",
        greeting_ro: "Bună de la echipă",
        current_version: 1,
      });
      expect(
        db.prepare("SELECT * FROM financial_agent_provider_policies").all(),
      ).toEqual(policy);
      expect(
        db.prepare("SELECT * FROM financial_provider_quotas").all(),
      ).toEqual(quota);
    } finally {
      db.close();
    }
  });
});
