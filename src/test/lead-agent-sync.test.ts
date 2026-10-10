import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("cloudflare/d1/migrations/0061_necesit_follow_up_orchestration.sql", "utf8");
const scheduler = readFileSync("cloudflare/workers/api/src/leadFollowUps.ts", "utf8");

describe("AVY Leads agent synchronization", () => {
  it("promotes an approved, private version aligned with the conversation skill", () => {
    expect(migration).toContain("'agent_version_leads_4'");
    expect(migration).toContain("'approved'");
    expect(migration).toContain("'active'");
    expect(migration).toContain("'private'");
    expect(migration).toContain("'semi'");
    expect(migration).toContain("'@cf/meta/llama-3.1-8b-instruct-fast'");
    expect(migration).toContain("prima revenire este la aproximativ 48 de ore");
    expect(migration).toContain("platforma Necesit");
    expect(migration).toContain("Workers AI rulează numai prin AI Core cu plafon gratuit");
    expect(migration).toContain("Ciornele sunt temporare");
    expect(migration).not.toContain("2026-10-03 18:57:16 Europe/Bucharest");
    expect(migration).toContain("draft_follow_up");
  });

  it("keeps write and handoff tools behind approval with bounded calls", () => {
    expect(migration).toContain("'agent_version_leads_4','knowledge_search','read','[\"approved_knowledge\"]',4");
    expect(migration).toContain("'agent_version_leads_4','draft_follow_up','write','[\"necesit_follow_up_draft\",\"lead_history_summary\"]',1");
    expect(migration).toContain("'agent_version_leads_4','handoff','approval','[\"super_admin_notification\",\"avyrontech@gmail.com\"]',1");
  });

  it("synchronizes the AVYRON project assignment without granting external send", () => {
    expect(migration).toContain("WHERE project_id='aip_avyron_web' AND agent_slug='leads'");
    expect(migration).toContain("'ready'");
    expect(migration).toContain("Nu trimite extern");
  });

  it("orchestrates a bounded, idempotent 48h draft without browser polling", () => {
    expect(migration).toContain("UNIQUE (lead_id, sequence)");
    expect(scheduler).toContain("const FIRST_FOLLOW_UP_DELAY = 48 * HOUR");
    expect(scheduler).toContain("priority: \"background\"");
    expect(scheduler).toContain("deterministic_free_fallback");
    expect(scheduler).toContain("LIMIT 3");
    expect(scheduler).toContain("follow_up_48h_ready");
    expect(scheduler).toContain("direction='inbound'");
  });
});
