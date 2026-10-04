import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("cloudflare/d1/migrations/0049_lead_agent_conversation_sync.sql", "utf8");

describe("AVY Leads agent synchronization", () => {
  it("promotes an approved, private version aligned with the conversation skill", () => {
    expect(migration).toContain("'agent_version_leads_2'");
    expect(migration).toContain("'approved'");
    expect(migration).toContain("'active'");
    expect(migration).toContain("'private'");
    expect(migration).toContain("'semi'");
    expect(migration).toContain("'@cf/meta/llama-3.1-8b-instruct-fast'");
    expect(migration).toContain("maximum una-două întrebări");
    expect(migration).toContain("soliciți intervenția echipei");
    expect(migration).toContain("2026-10-03 18:57:16 Europe/Bucharest");
    expect(migration).toContain("avyrontech@gmail.com");
    expect(migration).toContain("'[\"knowledge_search\",\"capture_lead\",\"qualify_lead\",\"handoff\"]'");
    expect(migration).not.toContain("ofertă scrisă în aceeași zi");
  });

  it("keeps write and handoff tools behind approval with bounded calls", () => {
    expect(migration).toContain("'knowledge_search','read','[\"approved_knowledge\"]',4");
    expect(migration).toContain("'capture_lead','approval','[\"qualified_leads\"]',1");
    expect(migration).toContain("'qualify_lead','approval','[\"qualified_leads\"]',2");
    expect(migration).toContain("'handoff','approval','[\"super_admin_notification\",\"avyrontech@gmail.com\"]',1");
  });
});
