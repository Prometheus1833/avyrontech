import type { L, LList } from "./types";

export type PlanId = "free" | "pro" | "studio";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: L;
  priceRon: number;
  priceEur: number;
  /** Prețul „de listă”, afișat tăiat doar dacă e mai mare decât cel curent. */
  listRon?: number;
  listEur?: number;
  access: L;
  limits: { components: number; sections: number; templates: number };
  perks: LList;
  recommended?: boolean;
  cta: L;
};

/**
 * Parteneriatele AVY. Prețurile sunt anuale, în lei, cu echivalent fix în
 * euro. Sursa de adevăr pentru bani rămâne catalogul de comerț al Worker-ului
 * (`src/data/commerceCatalog.ts`); aici e doar prezentarea.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "AVY Partener Free",
    tagline: { ro: "Începi gratuit, cu cont", en: "Start free, with an account" },
    priceRon: 0,
    priceEur: 0,
    access: { ro: "Limitat", en: "Limited" },
    limits: { components: 3, sections: 2, templates: 1 },
    perks: {
      ro: ["Toate produsele marcate Gratuit", "Particle Lab: export cod și JSON", "Colecția mea: favorite și istoric", "Kituri de logo gratuite"],
      en: ["Every product marked Free", "Particle Lab: code and JSON export", "My collection: favourites and history", "Free logo kits"],
    },
    cta: { ro: "Creează cont gratuit", en: "Create a free account" },
  },
  {
    id: "pro",
    name: "AVY Partener Pro",
    tagline: { ro: "Biblioteca completă, pentru freelanceri", en: "The full library, for freelancers" },
    priceRon: 270,
    priceEur: 50,
    listRon: 390,
    listEur: 75,
    access: { ro: "Biblioteca completă", en: "Full library" },
    limits: { components: 10, sections: 5, templates: 3 },
    perks: {
      ro: ["Tot ce e în Free", "Produsele Pro, inclusiv cele noi după 60 de zile", "Exporturi GLB și PNG 4K în Particle Lab", "Licență comercială pentru proiecte de clienți", "Suport pe e-mail în 2 zile lucrătoare"],
      en: ["Everything in Free", "Pro products, including new ones after 60 days", "GLB and 4K PNG exports in Particle Lab", "Commercial licence for client projects", "Email support within 2 business days"],
    },
    recommended: true,
    cta: { ro: "Alege Pro", en: "Choose Pro" },
  },
  {
    id: "studio",
    name: "AVY Studio",
    tagline: { ro: "Pentru agenții și echipe care livrează des", en: "For agencies and teams that ship often" },
    priceRon: 520,
    priceEur: 100,
    listRon: 790,
    listEur: 150,
    access: { ro: "Biblioteca completă + lansări din prima zi", en: "Full library + day-one releases" },
    limits: { components: 25, sections: 10, templates: 5 },
    perks: {
      ro: ["Tot ce e în Pro", "Produsele noi din ziua lansării", "Produsele Studio (hero-uri 3D, template-uri spațiale)", "3 exporturi Logo Studio incluse lunar", "Prioritate la cererile de funcții", "Suport prioritar în 1 zi lucrătoare"],
      en: ["Everything in Pro", "New products from launch day", "Studio products (3D heroes, spatial templates)", "3 Logo Studio exports included monthly", "Priority on feature requests", "Priority support within 1 business day"],
    },
    cta: { ro: "Alege Studio", en: "Choose Studio" },
  },
];

export const PLAN_BY_ID = new Map(PLANS.map((plan) => [plan.id, plan]));

/** Regulile de trecere progresivă a produselor în parteneriate (plan §7). */
export const PROGRESSION = {
  proAfterDays: 60,
  freeAfterDays: 365,
};
