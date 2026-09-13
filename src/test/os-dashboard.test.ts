import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAccess, canOpenSection, defaultSection, sectionsFor } from "@/lib/access";

describe("AVYRON OS dashboard", () => {
  it("deschide prezentarea generală pentru toate rolurile", () => {
    const client = buildAccess({ roles: ["user"] });
    const staff = buildAccess({ roles: ["staff"] });
    expect(defaultSection(client)).toBe("overview");
    expect(defaultSection(staff)).toBe("overview");
    expect(canOpenSection("overview", client)).toBe(true);
  });

  it("păstrează centrele operaționale și echipa în afara dashboardului client", () => {
    const client = buildAccess({ roles: ["user"] });
    const staff = buildAccess({ roles: ["staff"] });
    expect(sectionsFor(client).map((item) => item.id)).not.toContain("team-staff");
    expect(sectionsFor(client).map((item) => item.id)).not.toContain("os-centers");
    expect(sectionsFor(staff).map((item) => item.id)).toContain("team-staff");
    expect(sectionsFor(staff).map((item) => item.id)).toContain("os-centers");
  });

  it("rezervă centrul agenților și financiarul pentru Super Admin", () => {
    const staff = buildAccess({ roles: ["staff"] });
    const owner = buildAccess({ roles: ["admin"], superadmin: true });
    expect(canOpenSection("finance", staff)).toBe(false);
    expect(canOpenSection("ai-os", staff)).toBe(false);
    expect(canOpenSection("finance", owner)).toBe(true);
    expect(canOpenSection("ai-os", owner)).toBe(true);
  });

  it("protejează server-side API-ul dashboardului și deciziile AI", () => {
    const index = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/index.ts"), "utf8");
    const dashboard = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/osDashboard.ts"), "utf8");
    expect(index).toContain('app.use("/api/os/*", requireAuth)');
    expect(index).toContain('app.use("/api/os/*", requirePrivilegedMfa)');
    expect(dashboard).toContain("platformRoleForUser");
    expect(dashboard).toContain("status = 'pending' AND expires_at > ?");
    expect(dashboard).toContain("security_events");
  });

  it("protejează schimbarea accesului echipei prin Super Admin, MFA și audit", () => {
    const source = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/index.ts"), "utf8");
    expect(source).toContain('app.patch("/api/admin/users/:userId/roles", requireAuth, requireSuperAdmin');
    expect(source).toContain("platform_principal_protected");
    expect(source).toContain("idempotency_key_required");
    expect(source).toContain("admin.user_roles_updated");
  });

  it("elimină FAQ-ul de pe homepage fără a afecta paginile de produs", () => {
    const homepage = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
    expect(homepage).not.toContain('import("@/components/site/FAQ")');
    expect(homepage).not.toContain('setJsonLd("ld-faq"');
  });
});
