import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { SECTIONS } from "@/lib/access";

/**
 * Testele de legătură: pagina publică, Worker-ul, D1 și AVYRON OS trebuie să
 * rămână un singur sistem. Aici nu se testează comportamentul, ci cablajul —
 * exact lucrurile care se rup tăcut la o refactorizare: o rută scoasă de sub
 * autentificare, un tab dispărut din dashboard, un endpoint nedocumentat.
 */

const read = (path: string) => readFileSync(resolve(__dirname, "../..", path), "utf8");

describe("cablajul dintre pagină și Worker", () => {
  const index = read("cloudflare/workers/api/src/index.ts");

  it("montează cele trei routere ale magazinului", () => {
    for (const router of ["produseRouter", "produseShopRouter", "produseCheckoutRouter", "produseAdminRouter"]) {
      expect(index, `router nemontat: ${router}`).toContain(`app.route("/", ${router});`);
    }
  });

  it("ține rutele de cont în spatele autentificării", () => {
    expect(index).toContain('app.use("/api/produse/account/*", requireAuth);');
  });

  it("cere autentificare și MFA privilegiat pentru centrul din OS", () => {
    expect(index).toContain('app.use("/api/produse/admin/*", requireAuth);');
    expect(index).toContain('app.use("/api/produse/admin/*", requirePrivilegedMfa);');
  });

  it("lasă webhook-urile providerilor publice, dar semnate", () => {
    const billing = read("cloudflare/workers/api/src/billing.ts");
    expect(billing).toContain('"/api/billing/webhooks/stripe"');
    expect(billing).toContain('"/api/billing/webhooks/revolut"');
    expect(billing).toContain("stripeSignatureValid");
    expect(billing).toContain("revolutSignatureValid");
    expect(billing).toContain('code:"invalid_signature"');
    expect(billing).toContain("previous.status===\"processed\"||previous.status===\"ignored\"");
    expect(billing.match(/INSERT OR IGNORE INTO billing_webhook_events/g)).toHaveLength(3);
    expect(billing).toContain('event.type==="invoice.paid"');
    expect(billing).toContain('event.type.startsWith("customer.subscription.")');
    expect(billing).toContain("/cycles?limit=100");
    expect(index).toContain('enqueueAsyncJobs(env, ["billing_reconcile"])');
    expect(read("cloudflare/workers/api/src/asyncJobs.ts")).toContain("runBillingReconciliation(env)");
  });

  it("documentează în gateway rutele noi", () => {
    const gateway = read("cloudflare/workers/api/src/apiGateway.ts");
    for (const path of ["/produse/account/state", "/produse/account/copy", "/produse/account/collection", "/produse/account/checkout"]) {
      expect(gateway, `rută nedocumentată: ${path}`).toContain(`"${path}"`);
    }
  });

  it("scrie cererile publice tot în `leads`, ca să apară în CRM", () => {
    const produse = read("cloudflare/workers/api/src/produse.ts");
    expect(produse).toContain("INSERT INTO leads");
    expect(produse).toContain("avyron-products");
  });
});

describe("cablajul dintre magazin și D1", () => {
  const seed = read("cloudflare/d1/migrations/0033_produse_catalog_seed.sql");
  const shop = read("cloudflare/workers/api/src/produseShop.ts");

  it("citește accesul și prețul din tabelele migrate, nu din browser", () => {
    expect(shop).toContain("FROM product_items WHERE slug = ?");
    expect(shop).toContain("FROM partnership_plans WHERE id = ?");
    expect(seed).toContain("INSERT INTO product_items");
    expect(seed).toContain("INSERT INTO partnership_plans");
  });

  it("numără limitele pe zile și blochează dublura prin constrângere", () => {
    const migration = read("cloudflare/d1/migrations/0032_produse_catalog.sql");
    expect(migration).toContain("UNIQUE (user_id, slug, day)");
    expect(shop).toContain("FROM product_copy_events");
  });

  it("acordă o singură dată dreptul cumpărat și validează comanda providerului", () => {
    const migration = read("cloudflare/d1/migrations/0034_produse_checkout_idempotency.sql");
    const checkout = read("cloudflare/workers/api/src/billing.ts");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_entitlements_order");
    expect(checkout).toContain("FROM commerce_orders WHERE id=?");
    expect(checkout).toContain('code:"order_mismatch"');
    expect(checkout).toContain("billing_webhook_events");
    expect(checkout).toContain("INSERT OR IGNORE INTO product_entitlements");
  });

  it("nu servește cod plătit din bundle-ul public", () => {
    // Sursele publice sunt doar pentru produse gratuite (verificat în
    // produse.test.ts); aici verificăm că descărcarea plătită trece prin R2.
    expect(shop).toContain("c.env.FILES.get(version.r2_key)");
    expect(shop).toContain("product_versions");
  });
});

describe("cablajul dintre magazin și dashboardul intern", () => {
  const profile = read("src/pages/Profile.tsx");
  const navigation = read("src/components/dashboard/dashboardNavigation.ts");

  it("are o categorie proprie de produse, separată de facturare", () => {
    const produse = SECTIONS.filter((section) => section.group === "produse");
    expect(produse.map((section) => section.id).sort()).toEqual(["collection", "produse-avyron", "subscriptions-admin"]);
    expect(produse.find((section) => section.id === "collection")!.audience).toBe("everyone");
    expect(produse.find((section) => section.id === "produse-avyron")!.audience).toBe("superadmin");
    expect(produse.find((section) => section.id === "subscriptions-admin")!.audience).toBe("superadmin");
  });

  it("ține serviciile într-o categorie OS distinctă de produse", () => {
    const servicii = SECTIONS.filter((section) => section.group === "servicii");
    expect(servicii.map((section) => section.id)).toEqual(["servicii-avyron"]);
    expect(servicii[0].audience).toBe("staff");
  });

  it("randează ambele panouri în dashboard", () => {
    expect(profile).toContain('<TabsContent value="collection"');
    expect(profile).toContain('<TabsContent value="produse-avyron"');
    expect(navigation).toContain('servicii: "Servicii AVYRON"');
    expect(navigation).toContain('produse: "Produse AVYRON"');
    expect(profile).toContain('<TabsContent value="servicii-avyron"');
  });

  it("ține centrul din OS pe datele Worker-ului, nu pe date locale", () => {
    const center = read("src/pages/intern/ProduseAvyron.tsx");
    expect(center).toContain("produseApi.admin.overview()");
    const api = read("src/lib/produseApi.ts");
    expect(api).toContain('"/api/produse/admin/overview"');
    // Nicio cale din modulul de cont nu iese din spațiul /api/produse.
    for (const match of api.matchAll(/"(\/api\/[^"]+)"/g)) expect(match[1].startsWith("/api/produse/")).toBe(true);
  });

  it("leagă colecția din cont de aceleași rute publice ale produselor", () => {
    const tab = read("src/components/dashboard/ProductCollectionTab.tsx");
    expect(tab).toContain("PRODUSE_ITEM_ROUTES");
    expect(tab).toContain("produseApi.collection");
  });
});

describe("indexarea", () => {
  it("publică registrul implicit, fără să suprascrie sursa editorială llms.txt", () => {
    const script = read("scripts/produse-registry.mjs");
    expect(script).toContain('process.env.VITE_PRODUSE_LIVE === "0"');
    expect(script).not.toContain('join(dist, "llms.txt")');
    // Registrul public conține exclusiv produse gratuite.
    expect(script).toContain('item.access !== "free"');
  });

  it("intră în build, înaintea sitemap-ului", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toContain("produse-registry.mjs");
    expect(pkg.scripts.build.indexOf("produse-registry.mjs")).toBeLessThan(pkg.scripts.build.indexOf("generate-sitemap.mjs"));
  });
});
