import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAccess, canOpenSection, defaultSection, sectionsFor, SECTIONS } from "@/lib/access";
import { DASHBOARD_SECTION_META } from "@/components/dashboard/dashboardNavigation";

describe("AVYRON OS dashboard", () => {
  it("deschide prezentarea generală pentru toate rolurile", () => {
    const client = buildAccess({ roles: ["user"] });
    const staff = buildAccess({ roles: ["staff"] });
    expect(defaultSection(client)).toBe("overview");
    expect(defaultSection(staff)).toBe("overview");
    expect(canOpenSection("overview", client)).toBe(true);
  });

  it("folosește un singur registru de prezentare pentru toate secțiunile", () => {
    expect(Object.keys(DASHBOARD_SECTION_META).sort()).toEqual(SECTIONS.map((section) => section.id).sort());
    expect(new Set(SECTIONS.map((section) => section.id)).size).toBe(SECTIONS.length);
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
    expect(canOpenSection("social-manager", owner)).toBe(true);
    expect(canOpenSection("subscriptions-admin", owner)).toBe(true);
    expect(canOpenSection("social-manager", staff)).toBe(false);
  });

  it("separă STAFF de clienți și expune resursele solicitate în Altele", () => {
    const staff = buildAccess({ roles: ["staff"] });
    const sections = sectionsFor(staff).map((item) => item.id);
    expect(sections).toContain("team-staff");
    expect(sections).toContain("clients");
    expect(sections).toContain("careers");
    expect(sections).toContain("library");
    expect(sections).toContain("resources");
  });

  it("protejează operațiunile sincronizate ale Super Adminului și registrul de resurse", () => {
    const index = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/index.ts"), "utf8");
    const operations = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/adminOperations.ts"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0054_internal_resource_registry.sql"), "utf8");
    expect(index).toContain('app.use("/api/admin/operations/*", requireAuth, requireRole("staff", "admin"))');
    expect(operations).toContain('c.req.path === "/api/admin/operations/resources"');
    expect(operations).toContain("platformRoleForUser");
    expect(operations).toContain("staff_cannot_be_client");
    expect(operations).toContain("staff.projects.replace");
    expect(operations).toContain("subscription.update");
    expect(operations).toContain("UPDATE subscriptions SET client_id=?");
    expect(operations).toContain("security_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS internal_resources");
    expect(migration).not.toMatch(/\b(password|token|secret)\b/i);
  });

  it("măsoară first-party pagina publică de abonamente doar prin mecanismul de consimțământ existent", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/MaintenancePartnerships.tsx"), "utf8");
    expect(page).toContain('trackFunnel("page_view", "abonamente"');
  });

  it("sincronizează verificările publice de domeniu și configuratorul cu dashboardul", () => {
    const domain = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/domain.ts"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/workspace.ts"), "utf8");
    const contact = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/contact.ts"), "utf8");
    const configurator = readFileSync(resolve(process.cwd(), "src/pages/Configurator.tsx"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "cloudflare/d1/migrations/0055_public_flow_sync.sql"), "utf8");
    expect(domain).toContain('domainRouter.post("/api/public/domain-check"');
    expect(domain).toContain("INSERT INTO public_domain_checks");
    expect(workspace).toContain("FROM public_domain_checks");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public_domain_checks");
    expect(migration).not.toMatch(/\b(ip_hash|email|phone|cookie_id)\b/i);
    expect(configurator).toContain('form.set("product", "configurator-website")');
    expect(configurator).toContain('apiUrl("/api/contact/demo")');
    expect(contact).toContain("config_json");
  });

  it("afișează selectorul principal de website prin portal și păstrează produsele clar denumite", () => {
    const services = readFileSync(resolve(process.cwd(), "src/components/site/AgencyServices.tsx"), "utf8");
    const servicePage = readFileSync(resolve(process.cwd(), "src/pages/services/ServicePage.tsx"), "utf8");
    expect(services).toContain("createPortal");
    expect(services).toContain('mainService: "Serviciu principal"');
    expect(services).toContain('"Produse AVYRON"');
    expect(servicePage).toContain('product.key === "premium-website"');
    expect(servicePage).toContain('"Serviciu principal"');
  });

  it("creează atomic proiectul cu mentenanță și abonament opțional", () => {
    const projects = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/projects.ts"), "utf8");
    expect(projects).toContain("recurring_service");
    expect(projects).toContain("INSERT INTO services");
    expect(projects).toContain("INSERT INTO subscriptions");
    expect(projects).toContain("c.env.DB.batch(statements)");
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

  it("limitează middleware-urile MFA la modulele lor fără a bloca rutele publice sau bootstrap", () => {
    const aiProjects = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/aiProjects.ts"), "utf8");
    const finance = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/finance.ts"), "utf8");
    const seedScript = readFileSync(resolve(process.cwd(), "cloudflare/scripts/seed-superadmins.sh"), "utf8");
    expect(aiProjects).not.toContain('aiProjectsRouter.use("*"');
    expect(aiProjects).toContain('aiProjectsRouter.use("/api/ai-projects"');
    expect(aiProjects).toContain('aiProjectsRouter.use("/api/ai-projects/*"');
    expect(finance).not.toContain('financeRouter.use("*"');
    expect(finance).toContain('financeRouter.use("/api/finance/*"');
    expect(seedScript).toContain("curl -sS --fail-with-body");
  });

  it("publică AVYRON OS pe domeniul dedicat app.avyron.ro", () => {
    const worker = readFileSync(resolve(process.cwd(), "cloudflare/workers/api/src/index.ts"), "utf8");
    const config = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");
    expect(config).toContain('{ "pattern": "app.avyron.ro", "custom_domain": true }');
    expect(config).not.toContain('"app.avyron.ro/api/*"');
    expect(worker).toContain('c.redirect("https://app.avyron.ro/profil", 302)');
    expect(worker).toContain('c.header("X-Robots-Tag", "noindex, nofollow")');
  });

  it("elimină FAQ-ul de pe homepage fără a afecta paginile de produs", () => {
    const homepage = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
    expect(homepage).not.toContain('import("@/components/site/FAQ")');
    expect(homepage).not.toContain('setJsonLd("ld-faq"');
  });
});
