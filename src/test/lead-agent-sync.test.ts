import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("cloudflare/d1/migrations/0062_lead_agent_staff_review.sql", "utf8");
const scheduler = readFileSync("cloudflare/workers/api/src/leadFollowUps.ts", "utf8");
const router = readFileSync("cloudflare/workers/api/src/leads.ts", "utf8");
const dashboard = readFileSync("src/components/dashboard/leads/LeadDetailDialog.tsx", "utf8");

describe("AVY Leads agent synchronization", () => {
  it("promotes an approved, private version aligned with the conversation skill", () => {
    expect(migration).toContain("'agent_version_leads_5'");
    expect(migration).toContain("'approved'");
    expect(migration).toContain("'active'");
    expect(migration).toContain("'private'");
    expect(migration).toContain("'semi'");
    expect(migration).toContain("'@cf/qwen/qwen3-30b-a3b-fp8'");
    expect(migration).toContain("prima la aproximativ 48 de ore și ultima în ziua 7");
    expect(migration).toContain("oportunități publice, prospectare și cercetare");
    expect(migration).toContain("Workers AI rulează numai prin AI Core cu plafon gratuit");
    expect(migration).toContain("revizie AI modifică exclusiv secțiunea selectată");
    expect(migration).not.toContain("2026-10-03 18:57:16 Europe/Bucharest");
    expect(migration).toContain("draft_follow_up");
  });

  it("keeps write and handoff tools behind approval with bounded calls", () => {
    expect(migration).toContain("'agent_version_leads_5','knowledge_search','read'");
    expect(migration).toContain("'agent_version_leads_5','draft_follow_up','execute'");
    expect(migration).toContain("'agent_version_leads_5','handoff','approval'");
    expect(migration).not.toContain("'draft_follow_up','write'");
  });

  it("synchronizes the AVYRON project assignment without granting external send", () => {
    expect(migration).toContain("WHERE project_id='aip_avyron_web' AND agent_slug='leads'");
    expect(migration).toContain("'ready'");
    expect(migration).toContain("Nicio aprobare internă nu execută automat trimiterea externă");
    expect(migration).toContain("'public_lead_research'");
    expect(migration).toContain("'outreach_window_plan'");
    expect(migration).toContain("'necesit_follow_up_generation'");
    expect(migration).toContain("'staff_task_handoff'");
    expect(migration).toContain("'leads','fin_vendor_cloudflare_ai','active',0,0,0");
    expect(migration).toContain("hard_stop_before_paid=1");
  });

  it("orchestrates bounded, idempotent 48h and day-7 drafts without browser polling", () => {
    expect(scheduler).toContain("const FIRST_FOLLOW_UP_DELAY = 48 * HOUR");
    expect(scheduler).toContain("const FINAL_FOLLOW_UP_DELAY = 7 * DAY");
    expect(scheduler).toContain("priority: \"important\"");
    expect(scheduler).toContain("deterministic_free_fallback");
    expect(scheduler).toContain("LIMIT 3");
    expect(scheduler).toContain('draft.sequence === 1 ? "48h" : "day_7"');
    expect(scheduler).toContain("first_draft.status='sent'");
    expect(scheduler).toContain("direction='inbound'");
  });

  it("exposes staff review, exact-section revision and task handoff without auto-send", () => {
    expect(migration).toContain("lead_follow_up_draft_revisions");
    expect(router).toContain("lead.follow_up.revise");
    expect(router).toContain("approval_status='pending'");
    expect(router).toContain("lead.claim");
    expect(router).toContain("sent_confirmed_by_staff");
    expect(scheduler).toContain("DELETE FROM lead_follow_up_draft_revisions");
    expect(dashboard).toContain("Aprobă");
    expect(dashboard).toContain("Propune modificare");
    expect(dashboard).toContain("Preia sarcina");
    expect(dashboard).toContain("modifică numai secțiunea selectată");
  });
});
