import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("cloudflare/d1/migrations/0060_lead_agent_consultative_sales.sql", "utf8");

describe("AVY Leads agent synchronization", () => {
  it("promotes an approved, private version aligned with the conversation skill", () => {
    expect(migration).toContain("'agent_version_leads_3'");
    expect(migration).toContain("'approved'");
    expect(migration).toContain("'active'");
    expect(migration).toContain("'private'");
    expect(migration).toContain("'semi'");
    expect(migration).toContain("'@cf/meta/llama-3.1-8b-instruct-fast'");
    expect(migration).toContain("maximum una-două întrebări de continuare");
    expect(migration).toContain("first_contact, replied_neutral, discovery, confirmed_need");
    expect(migration).toContain("fiecare capabilitate în valoare practică");
    expect(migration).toContain("acuratețea, specificitatea, relevanța, naturalețea");
    expect(migration).toContain("soliciți intervenția echipei");
    expect(migration).toContain("Fiecare cerere din fluxul curent Necesit este lead nou");
    expect(migration).not.toContain("2026-10-03 18:57:16 Europe/Bucharest");
    expect(migration).toContain("avyrontech@gmail.com");
    expect(migration).toContain("'[\"knowledge_search\",\"capture_lead\",\"qualify_lead\",\"handoff\"]'");
    expect(migration).not.toContain("ofertă scrisă în aceeași zi");
  });

  it("keeps write and handoff tools behind approval with bounded calls", () => {
    expect(migration).toContain("'agent_version_leads_3','knowledge_search','read','[\"approved_knowledge\"]',4");
    expect(migration).toContain("'agent_version_leads_3','capture_lead','approval','[\"qualified_leads\"]',1");
    expect(migration).toContain("'agent_version_leads_3','qualify_lead','approval','[\"qualified_leads\"]',2");
    expect(migration).toContain("'agent_version_leads_3','handoff','approval','[\"super_admin_notification\",\"avyrontech@gmail.com\"]',1");
  });

  it("synchronizes the AVYRON project assignment without granting external send", () => {
    expect(migration).toContain("WHERE project_id='aip_avyron_web' AND agent_slug='leads'");
    expect(migration).toContain("'ready'");
    expect(migration).toContain("Nu trimite extern");
  });
});
