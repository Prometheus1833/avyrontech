import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migratedDatabase = () => {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync("cloudflare/d1/migrations").filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
  }
  return db;
};

describe("AVY Leads agent synchronization", () => {
  it("promotes an approved, private version aligned with the conversation skill", () => {
    const db = migratedDatabase();
    const agent = db.prepare(`SELECT status,visibility,current_version,autonomy,model,max_tokens,
      system_prompt,guardrails,handoff_email,tools_json FROM ai_agents WHERE slug='leads'`).get() as Record<string, unknown>;

    expect(agent).toMatchObject({
      status: "active",
      visibility: "private",
      current_version: 2,
      autonomy: "semi",
      model: "@cf/meta/llama-3.1-8b-instruct-fast",
      max_tokens: 500,
      handoff_email: "avyrontech@gmail.com",
    });
    expect(String(agent.system_prompt)).toContain("maximum una-două întrebări");
    expect(String(agent.guardrails)).toContain("soliciți intervenția echipei");
    expect(String(agent.guardrails)).toContain("2026-10-03 18:57:16 Europe/Bucharest");
    expect(String(agent.system_prompt)).not.toContain("ofertă scrisă în aceeași zi");
    expect(JSON.parse(String(agent.tools_json))).toEqual([
      "knowledge_search", "capture_lead", "qualify_lead", "handoff",
    ]);

    const version = db.prepare("SELECT status,autonomy,change_note FROM ai_agent_versions WHERE id='agent_version_leads_2'").get();
    expect(version).toMatchObject({ status: "approved", autonomy: "semi" });

    const policies = db.prepare("SELECT tool_slug,mode,max_calls_per_run FROM ai_agent_tool_policies WHERE agent_version_id='agent_version_leads_2' ORDER BY tool_slug").all();
    expect(policies).toEqual([
      { tool_slug: "capture_lead", mode: "approval", max_calls_per_run: 1 },
      { tool_slug: "handoff", mode: "approval", max_calls_per_run: 1 },
      { tool_slug: "knowledge_search", mode: "read", max_calls_per_run: 4 },
      { tool_slug: "qualify_lead", mode: "approval", max_calls_per_run: 2 },
    ]);
    db.close();
  });
});
