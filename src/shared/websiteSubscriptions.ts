/** Public discovery is intentionally limited to the website chooser, not /servicii. */
export const WEBSITE_SUBSCRIPTION_PATH = {
  ro: "/servicii/website-prin-abonament",
  en: "/en/services/website-subscription",
} as const;
export const WEBSITE_PLAN_DEFAULTS = [
  {
    id: "start",
    name: "Site Start",
    sku: "AVY-WEB-SUB-START",
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
        "Formular de contact și profiluri sociale",
        "Optimizare inițială pentru căutare",
        "Hosting, SSL și mentenanță",
        "Acces în platformă și monitorizare de bază",
      ],
      en: [
        "Custom responsive design",
        "Contact form and social profiles",
        "Initial search optimisation",
        "Hosting, SSL and maintenance",
        "Platform access and basic monitoring",
      ],
    },
  },
  {
    id: "business",
    name: "Site Business",
    sku: "AVY-WEB-SUB-BUSINESS",
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
        "Integrare socială și rapoarte extinse",
      ],
      en: [
        "Extended service architecture",
        "Additional forms and calls to action",
        "Initial technical and local SEO",
        "Analytics and interactive sections",
        "Extended social links and reports",
      ],
    },
  },
  {
    id: "premium",
    name: "Site Premium",
    sku: "AVY-WEB-SUB-PREMIUM",
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
        "Personalizare și integrări extinse",
        "Rapoarte detaliate și suport prioritar",
      ],
      en: [
        "Optimised motion and selective 3D",
        "Smart forms and complex service structures",
        "Advanced launch SEO",
        "Extended customisation and integrations",
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
    features: { ro: [...p.features.ro], en: [...p.features.en] },
    priceMinor: null,
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
