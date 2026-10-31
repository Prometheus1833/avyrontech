import { commerceItemBySku } from "./commerceCatalog";

export type GrowthOffer = {
  sku: string;
  accountingCode: string;
  name: string;
  priceCents: number;
  startingAt?: boolean;
  features: { ro: string; en: string }[];
};

const offer = (sku: string, accountingCode: string, name: string, features: GrowthOffer["features"], startingAt = false, minimumPriceCents?: number): GrowthOffer => {
  const item = commerceItemBySku(sku);
  if (!item || item.currency !== "RON" || (item.unitPriceCents === null && minimumPriceCents === undefined)) throw new Error(`Missing growth offer: ${sku}`);
  return { sku, accountingCode, name, priceCents: minimumPriceCents ?? item.unitPriceCents!, startingAt, features };
};

export const SEO_MONTHLY_OFFERS = [
  offer("sub-seo-essential", "AVY-SEO-ESS", "Essential", [
    { ro: "Audit inițial și plan de priorități", en: "Initial audit and prioritized plan" },
    { ro: "SEO tehnic și verificarea indexării Google", en: "Technical SEO and Google indexing review" },
    { ro: "Monitorizare și raportare lunară", en: "Monthly monitoring and reporting" },
  ]),
  offer("sub-seo-growth", "AVY-SEO-GRW", "Growth", [
    { ro: "Tot din Essential", en: "Everything in Essential" },
    { ro: "Performanță website, SEO local și conținut optimizat", en: "Website performance, local SEO and optimized content" },
    { ro: "Analiză AI Visibility și recomandări lunare", en: "AI Visibility review and monthly recommendations" },
  ]),
  offer("sub-seo-premium", "AVY-SEO-PRM", "Premium", [
    { ro: "Tot din Growth", en: "Everything in Growth" },
    { ro: "Prioritizare extinsă pentru conținut și performanță", en: "Extended content and performance prioritization" },
    { ro: "Monitorizare aprofundată și raport strategic", en: "Deeper monitoring and strategic reporting" },
  ]),
] as const;

export const SEO_ONE_TIME_OFFERS = [
  offer("seo-opt-5-15", "AVY-SEO-015", "5–15", [{ ro: "Optimizare unică pentru 5–15 pagini", en: "One-time optimization for 5–15 pages" }]),
  offer("seo-opt-15-30", "AVY-SEO-030", "15–30", [{ ro: "Optimizare unică pentru 15–30 pagini", en: "One-time optimization for 15–30 pages" }]),
  offer("seo-opt-30-50", "AVY-SEO-050", "30–50", [{ ro: "Optimizare unică pentru 30–50 pagini", en: "One-time optimization for 30–50 pages" }]),
] as const;

export const ADS_MONTHLY_OFFERS = [
  offer("sub-ads-start", "AVY-ADS-STR", "Ads Start", [
    { ro: "1 platformă · 2 campanii · 2 materiale creative", en: "1 platform · 2 campaigns · 2 creative assets" },
    { ro: "Optimizare săptămânală", en: "Weekly optimization" },
    { ro: "Monitorizare AI și raportare", en: "AI-assisted monitoring and reporting" },
  ]),
  offer("sub-ads-growth", "AVY-ADS-GRW", "Ads Growth", [
    { ro: "2 platforme · 4 campanii · 4 postări social media", en: "2 platforms · 4 campaigns · 4 social posts" },
    { ro: "Teste A/B", en: "A/B tests" },
    { ro: "Monitorizare AI și raportare", en: "AI-assisted monitoring and reporting" },
  ]),
  offer("sub-ads-performance", "AVY-ADS-PRF", "Ads Performance", [
    { ro: "3 platforme · 8 campanii · 8 postări", en: "3 platforms · 8 campaigns · 8 posts" },
    { ro: "Remarketing și optimizarea conversiilor (CRO)", en: "Remarketing and conversion optimization (CRO)" },
    { ro: "Analiză avansată, monitorizare AI și raportare", en: "Advanced analysis, AI-assisted monitoring and reporting" },
  ], true, 299_000),
] as const;

export const ADS_SETUP = offer("ads-setup", "AVY-ADS-SET", "Configurare inițială Ads", [], true, 59_000);
export const GROWTH_BUNDLE_DISCOUNT_PERCENT = 10;
