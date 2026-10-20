/** Lightweight service identities shared with the API Worker; keep aligned with SERVICES. */
export const SERVICE_COMMERCIAL_SOURCES = [
  { entity_key: "premium-website", display_name: "Site Prezentare Profesional", category: "presence", base_price_minor: 145_000 },
  { entity_key: "logo-3d", display_name: "Logo Profesional 3D", category: "brand", base_price_minor: 50_000 },
  { entity_key: "social-identity", display_name: "Identitate Social Media", category: "presence", base_price_minor: 130_000 },
  { entity_key: "online-store", display_name: "Magazin Online", category: "commerce", base_price_minor: 525_000 },
  { entity_key: "apps", display_name: "Aplicații Web și Mobile", category: "software", base_price_minor: 790_000 },
  { entity_key: "ai-agent", display_name: "Agenți AI personalizați", category: "software", base_price_minor: 265_000 },
  { entity_key: "audit", display_name: "Audit Website / Soft Actual", category: "quality", base_price_minor: null },
  { entity_key: "qa-testing", display_name: "Testare QA Web & Mobile", category: "quality", base_price_minor: 160_000 },
  { entity_key: "blog-profesional", display_name: "Blog profesional și content hub", category: "presence", base_price_minor: 150_000 },
] as const;
