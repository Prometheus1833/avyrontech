/** Public discovery is intentionally limited to the website chooser, not /servicii. */
export const WEBSITE_SUBSCRIPTION_PATH = {
  ro: "/servicii/website-prin-abonament",
  en: "/en/services/website-subscription",
} as const;
const WEBSITE_PLAN_INTEGRATIONS = {
  ro: ["Integrare și sincronizare conturi social media", "Configurare Google Business Profile", "Conectare Google Search Console"],
  en: ["Social media account integration and sync", "Google Business Profile setup", "Google Search Console connection"],
} as const;
export const WEBSITE_PLAN_DEFAULTS = [
  {
    id: "start",
    name: "Site Start",
    sku: "AVY-WEB-SUB-START",
    priceMinor: 19900,
    pages: "10–15",
    changes: 3,
    buttons: 1,
    emails: 1,
    tagline: {
      ro: "Tot ce ai nevoie pentru un început care inspiră încredere.",
      en: "Everything you need for a confident start.",
    },
    features: {
      ro: [
        "Design personalizat și responsive",
        "Formular de contact",
        "SEO tehnic optimizat",
        "Logo 2D profesional",
        "Hosting, SSL și mentenanță",
        "Acces în platformă și monitorizare de bază",
      ],
      en: [
        "Custom responsive design",
        "Contact form",
        "Technical SEO optimisation",
        "Professional 2D logo",
        "Hosting, SSL and maintenance",
        "Platform access and basic monitoring",
      ],
    },
  },
  {
    id: "business",
    name: "Site Business",
    sku: "AVY-WEB-SUB-BUSINESS",
    priceMinor: 29900,
    pages: "15–25",
    changes: 6,
    buttons: 2,
    emails: 2,
    tagline: {
      ro: "Mai multă vizibilitate. Mai multe oportunități. Mai mult spațiu pentru afacerea ta.",
      en: "More visibility. More opportunities. More room to grow.",
    },
    features: {
      ro: [
        "Arhitectură extinsă pentru servicii",
        "Formulare și CTA-uri suplimentare",
        "SEO tehnic și local inițial",
        "Analytics și secțiuni interactive",
        "Panou de administrare (Admin)",
        "Logo 3D profesional",
      ],
      en: [
        "Extended service architecture",
        "Additional forms and calls to action",
        "Initial technical and local SEO",
        "Analytics and interactive sections",
        "Admin dashboard",
        "Professional 3D logo",
      ],
    },
  },
  {
    id: "premium",
    name: "Site Premium",
    sku: "AVY-WEB-SUB-PREMIUM",
    priceMinor: 39900,
    pages: "25+",
    changes: 10,
    buttons: 3,
    emails: 3,
    tagline: {
      ro: "O prezență digitală memorabilă, construită pentru ambiții mari.",
      en: "A memorable digital presence for ambitious businesses.",
    },
    features: {
      ro: [
        "Animații optimizate și 3D selectiv",
        "Formulare inteligente și servicii complexe",
        "SEO avansat la lansare",
        "Panou de administrare (Admin)",
        "Logo 3D cinematic profesional",
        "Ecran de încărcare dinamic și cinematic",
        "Rapoarte detaliate și suport prioritar",
      ],
      en: [
        "Optimised motion and selective 3D",
        "Smart forms and complex service structures",
        "Advanced launch SEO",
        "Admin dashboard",
        "Professional cinematic 3D logo",
        "Dynamic cinematic loading screen",
        "Detailed reports and priority support",
      ],
    },
  },
] as const;
export type WebsitePlanId = (typeof WEBSITE_PLAN_DEFAULTS)[number]["id"];
export type WebsitePlan = {
  id: WebsitePlanId;
  name: string;
  sku: string;
  revision: number;
  pages: string;
  changes: number;
  buttons: number;
  emails: number;
  tagline: { ro: string; en: string };
  features: { ro: string[]; en: string[] };
  priceMinor: number | null;
  currency: string;
  vatBasisPoints: number;
  taxVerified: boolean;
  invoiceProvider: "manual" | "oblio";
  terms: string;
  cancellation: string;
  emailPolicy: string;
  reviewed: boolean;
  available: boolean;
};
export const defaultWebsitePlans = (): WebsitePlan[] =>
  WEBSITE_PLAN_DEFAULTS.map((p) => ({
    ...p,
    features: { ro: [...p.features.ro, ...WEBSITE_PLAN_INTEGRATIONS.ro], en: [...p.features.en, ...WEBSITE_PLAN_INTEGRATIONS.en] },
    currency: "RON",
    revision: 1,
    vatBasisPoints: 0,
    taxVerified: false,
    invoiceProvider: "manual",
    terms: "",
    cancellation: "",
    emailPolicy:
      "Configurarea adreselor depinde de domeniul clientului și de furnizorul de e-mail disponibil. Eventualele costuri sunt confirmate înainte de activare.",
    reviewed: false,
    available: false,
  }));
export function advertisedWebsitePrice(id: WebsitePlanId) {
  return WEBSITE_PLAN_DEFAULTS.find(plan => plan.id === id)!.priceMinor;
}
export function publicWebsitePlanRate(plan: WebsitePlan) {
  if (plan.available && plan.priceMinor !== null) {
    return { priceMinor: plan.priceMinor, currency: plan.currency };
  }
  return { priceMinor: advertisedWebsitePrice(plan.id), currency: "RON" };
}
export function formatWebsitePrice(amount: number, currency: string, ro: boolean) {
  return ro && currency === "RON"
    ? `${(amount / 100).toLocaleString("ro-RO")} lei`
    : `${currency} ${(amount / 100).toLocaleString(ro ? "ro-RO" : "en-GB")}`;
}
export function websitePlanReady(p: WebsitePlan) {
  return (
    p.reviewed &&
    p.taxVerified &&
    Number.isSafeInteger(p.priceMinor) &&
    p.priceMinor! > 0 &&
    p.terms.trim().length >= 80 &&
    p.cancellation.trim().length >= 20 &&
    p.emailPolicy.trim().length >= 20
  );
}
export const WEBSITE_FIRST_PAYMENT_DAYS = 30;
export const WEBSITE_FIRST_PAYMENT_DELAY_MS = WEBSITE_FIRST_PAYMENT_DAYS * 86_400_000;

export type WebsiteSubscriptionProject = {
  project_id: string;
  name: string;
  client_id: string;
  company_name: string;
  owner_user_id: string | null;
  domain: string | null;
  status: string;
  banner_status: string;
  plan_id: WebsitePlanId;
  plan_revision: number;
  subscription_id: string;
  subscription_status: string;
  plan_snapshot_json: string;
  current_order_id: string | null;
  provider_subscription_id: string | null;
  paid_months: number;
  revision: number;
  content_revision: number;
  approved_revision: number | null;
  approved_at: number | null;
  checkoutAvailableAt: number | null;
  transition_requested_at: number | null;
  plan: WebsitePlan;
  period: {
    id: string;
    starts_at: number;
    ends_at: number;
    change_limit: number;
    used: number;
  } | null;
  canWork: boolean;
  canManage: boolean;
  canSubscribe: boolean;
  clientApproval: boolean;
};
export type WebsiteRequest = {
  id: string;
  lead_id: string;
  plan_id: WebsitePlanId;
  project_id: string | null;
  name: string;
  email: string;
  company: string;
  brief_json: string;
  created_at: number;
};
export const WEBSITE_WORKFLOW = [
  "Brief și structură",
  "Design și dezvoltare",
  "Testare și aprobare client",
  "Lansare și onboarding",
  "Mentenanță și raportare",
] as const;
