import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAccess, canOpenSection } from "@/lib/access";

const root = process.cwd();
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Codex operator synchronization", () => {
  it("exposes only the relevant dashboard surfaces through granular capabilities", () => {
    const access = buildAccess({
      roles: ["user"],
      capabilities: ["leads.read", "ai_projects.read", "ai_content.create"],
    });
    expect(access.isOperator).toBe(true);
    expect(access.isClient).toBe(false);
    expect(canOpenSection("leads", access)).toBe(true);
    expect(canOpenSection("ai-projects", access)).toBe(true);
    expect(canOpenSection("social-manager", access)).toBe(true);
    expect(canOpenSection("finance", access)).toBe(false);
    expect(canOpenSection("commercial-codes", access)).toBe(false);
  });

  it("keeps external actions manual and routes routine work to AI Core", () => {
    const migration = source("cloudflare/d1/migrations/0059_agent_operator_sync.sql");
    expect(migration).toContain("'external_send','external','codex_manual',1");
    expect(migration).toContain("'manual_publish','external','codex_manual',1");
    expect(migration).toContain("'copy_and_variants','draft','workers_ai',0");
    expect(migration).not.toContain("'social.publish' capability");
    expect(migration).not.toContain("'leads.delete' capability");
  });

  it("requires a separate delete capability and never promotes the operator to platform admin", () => {
    const leads = source("cloudflare/workers/api/src/leads.ts");
    const api = source("cloudflare/workers/api/src/index.ts");
    expect(leads).toContain('"leads.delete"');
    expect(api).toContain('DELETE FROM user_roles WHERE user_id=?');
    expect(api).toContain("INSERT INTO user_roles(user_id,role) VALUES (?,'user')");
    expect(api).toContain("platform_principal_protected");
  });
});
