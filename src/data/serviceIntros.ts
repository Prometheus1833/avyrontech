export const SERVICE_INTRO_DURATION_MS = 1900;
export const SERVICE_INTRO_REPEAT_MS = 620;
export const SERVICE_INTRO_EXIT_MS = 380;
export const SERVICE_INTRO_GUARD_MS = 180;
export const SERVICE_INTRO_MAX_MS = SERVICE_INTRO_DURATION_MS + SERVICE_INTRO_GUARD_MS + SERVICE_INTRO_EXIT_MS;

export type ServiceIntroKey =
  | "premium-website"
  | "social-identity"
  | "online-store"
  | "apps"
  | "ai-agent"
  | "qa-testing";

export type ServiceIntroMotif = "browser" | "network" | "commerce" | "devices" | "neural" | "scan";

type IntroCopy = { ro: string; en: string };

export type ServiceIntroSpec = {
  label: IntroCopy;
  micro: IntroCopy;
  sequence: { ro: string[]; en: string[] };
  motif: ServiceIntroMotif;
  primary: string;
  secondary: string;
};

export const SERVICE_INTRO_KEYS: ServiceIntroKey[] = [
  "premium-website",
  "social-identity",
  "online-store",
  "apps",
  "ai-agent",
  "qa-testing",
];

export const SERVICE_INTRO_SPECS: Record<ServiceIntroKey, ServiceIntroSpec> = {
  "premium-website": {
    label: { ro: "Site Prezentare Profesional", en: "Professional Presentation Website" },
    micro: { ro: "Structură, claritate, conversie.", en: "Structure, clarity, conversion." },
    sequence: { ro: ["structură", "interfață", "prezență"], en: ["structure", "interface", "presence"] },
    motif: "browser",
    primary: "56 189 248",
    secondary: "37 99 235",
  },
  "social-identity": {
    label: { ro: "Identitate Social Media", en: "Social Media Identity" },
    micro: { ro: "Un brand, toate punctele de contact.", en: "One brand, every touchpoint." },
    sequence: { ro: ["semnal", "rețea", "comunitate"], en: ["signal", "network", "community"] },
    motif: "network",
    primary: "244 114 182",
    secondary: "168 85 247",
  },
  "online-store": {
    label: { ro: "Magazin Online", en: "Online Store" },
    micro: { ro: "Produsul intră în mișcare.", en: "The product moves into market." },
    sequence: { ro: ["produs", "plată", "livrare"], en: ["product", "payment", "delivery"] },
    motif: "commerce",
    primary: "52 211 153",
    secondary: "20 184 166",
  },
  apps: {
    label: { ro: "Aplicații Mobile & Web", en: "Mobile & Web Apps" },
    micro: { ro: "Un singur sistem, pe orice ecran.", en: "One system, on every screen." },
    sequence: { ro: ["logică", "interfață", "experiență"], en: ["logic", "interface", "experience"] },
    motif: "devices",
    primary: "129 140 248",
    secondary: "139 92 246",
  },
  "ai-agent": {
    label: { ro: "Agenți AI Personalizați", en: "Custom AI Agents" },
    micro: { ro: "Procese clare, acțiuni controlate.", en: "Clear workflows, controlled actions." },
    sequence: { ro: ["context", "aprobare", "acțiune"], en: ["context", "approval", "action"] },
    motif: "neural",
    primary: "217 70 239",
    secondary: "147 51 234",
  },
  "qa-testing": {
    label: { ro: "Testare QA Web & Mobile", en: "Web & Mobile QA Testing" },
    micro: { ro: "Fiecare flux, verificat.", en: "Every flow, verified." },
    sequence: { ro: ["scanare", "validare", "încredere"], en: ["scan", "validation", "confidence"] },
    motif: "scan",
    primary: "163 230 53",
    secondary: "16 185 129",
  },
};

export const isServiceIntroKey = (key: string): key is ServiceIntroKey =>
  SERVICE_INTRO_KEYS.includes(key as ServiceIntroKey);
