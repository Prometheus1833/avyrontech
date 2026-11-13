/** Lightweight service identities shared with the API Worker; keep aligned with SERVICES. */
import { COMMERCE_CATALOG } from "./commerceCatalog";
import { WEBSITE_PLAN_DEFAULTS } from "../shared/websiteSubscriptions";
import { ADS_MONTHLY_OFFERS, ADS_SETUP, SEO_MONTHLY_OFFERS, SEO_ONE_TIME_OFFERS } from "./growthOffers";

const growthCode = (entity_key: string, display_name: string, category: string, base_price_minor: number | null, sku: string, accounting_code: string, price_model: "fixed" | "starting_at" | "quote", billing_cycle: "monthly" | "one_time") =>
  ({ entity_key, display_name, category, base_price_minor, sku, accounting_code, price_model, billing_cycle });

const CORE_SERVICE_SOURCES = [
  ...WEBSITE_PLAN_DEFAULTS.map(p => growthCode("website-sub-" + p.id, "Website prin abonament — " + p.name, "website-subscription", p.priceMinor, p.sku, p.sku, "fixed", "monthly")),
  { entity_key: "premium-website", display_name: "Site Prezentare Profesional", category: "presence", base_price_minor: 145_000 },
  { entity_key: "logo-3d", display_name: "Logo Profesional 3D", category: "brand", base_price_minor: 50_000 },
  { entity_key: "social-identity", display_name: "Identitate Social Media", category: "presence", base_price_minor: 130_000 },
  { entity_key: "online-store", display_name: "Magazin Online", category: "commerce", base_price_minor: 525_000 },
  { entity_key: "apps", display_name: "Aplicații Web și Mobile", category: "software", base_price_minor: 790_000 },
  { entity_key: "ai-agent", display_name: "Agenți AI personalizați", category: "software", base_price_minor: 265_000 },
  { entity_key: "audit", display_name: "Audit Website / Soft Actual", category: "quality", base_price_minor: null },
  { entity_key: "qa-testing", display_name: "Testare QA Web & Mobile", category: "quality", base_price_minor: 160_000 },
  { entity_key: "blog-profesional", display_name: "Blog profesional și content hub", category: "presence", base_price_minor: 150_000 },
  growthCode("seo-ai", "SEO & AI Performance and Visibility", "growth", null, "svc-seo-ai", "AVY-SEO-SVC", "quote", "monthly"),
  growthCode("marketing-ads", "Digital Marketing & Ads", "growth", null, "svc-marketing-ads", "AVY-ADS-SVC", "quote", "monthly"),
  growthCode("seo-ai-audit", "Audit SEO & AI inițial", "growth", 0, "seo-ai-audit", "AVY-SEO-AUD", "fixed", "one_time"),
  ...SEO_MONTHLY_OFFERS.map((item) => growthCode(item.sku, `SEO & AI Performance and Visibility — ${item.name}`, "growth", item.priceCents, item.sku, item.accountingCode, "fixed", "monthly")),
  ...SEO_ONE_TIME_OFFERS.map((item) => growthCode(item.sku, `Optimizare SEO unică — ${item.name} pagini`, "growth", item.priceCents, item.sku, item.accountingCode, "fixed", "one_time")),
  ...ADS_MONTHLY_OFFERS.map((item) => growthCode(item.sku, `Digital Marketing & Ads — ${item.name}`, "growth", item.priceCents, item.sku, item.accountingCode, item.startingAt ? "starting_at" : "fixed", "monthly")),
  growthCode(ADS_SETUP.sku, ADS_SETUP.name, "growth", ADS_SETUP.priceCents, ADS_SETUP.sku, ADS_SETUP.accountingCode, "starting_at", "one_time"),
] as const;

export const SERVICE_COMMERCIAL_SOURCES = CORE_SERVICE_SOURCES;

/** The checkout catalogue includes maintenance subscriptions and legacy packages too. Keep its SKUs and currencies. */
export const COMMERCIAL_REFERENCE_SOURCES = [
  ...CORE_SERVICE_SOURCES,
  ...COMMERCE_CATALOG.filter(item => item.sku !== "custom-request" && !CORE_SERVICE_SOURCES.some(source => source.entity_key === item.sku || ("sku" in source && source.sku === item.sku))).map(item => ({
    entity_key: item.sku, display_name: item.name, category: item.type === "subscription" ? "maintenance" : "commercial-package",
    base_price_minor: item.unitPriceCents, sku: item.sku, currency: item.currency,
    price_model: item.unitPriceCents === null ? "quote" as const : "fixed" as const,
    billing_cycle: item.billing,
  })),
];
