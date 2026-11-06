import { STAFF_MANAGED, STAFF_SECTION_PERMISSIONS } from "../shared/staffAccess";
// Model central de acces pentru platforma internă.
// Un singur loc definește cine vede ce: butoane, secțiuni și date sensibile.
export type AppRole = "user" | "staff" | "admin";

export type Access = {
  roles: AppRole[];
  isClient: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOperator: boolean;
  capabilities: string[];
  hasCollaborations?: boolean;
};

export const buildAccess = (input: {
  roles: AppRole[];
  email?: string | null;
  superadmin?: boolean;
  capabilities?: string[];
  hasCollaborations?: boolean;
}): Access => {
  const roles = input.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isStaff = isAdmin || roles.includes("staff");
  const capabilities = input.capabilities ?? [];
  const isOperator = capabilities.length > 0;
  return {
    roles,
    isClient: !isStaff && !isOperator,
    isStaff,
    isAdmin,
    // Elevated access is asserted only by the server after a fresh D1 lookup.
    // Email addresses are identity attributes, never authorization rules.
    isSuperAdmin: isAdmin && input.superadmin === true,
    isOperator,
    capabilities,
    hasCollaborations:input.hasCollaborations===true,
  };
};

/** Nivelul minim necesar pentru o secțiune. */
export type Audience = "client" | "everyone" | "staff" | "admin" | "superadmin";

export const canSee = (audience: Audience, a: Access) => {
  switch (audience) {
    case "everyone":
      return true;
    case "client":
      return a.isClient;
    case "staff":
      return a.isStaff;
    case "admin":
      return a.isAdmin;
    case "superadmin":
      return a.isSuperAdmin;
  }
};

export type SectionId =
  | "documents" | "overview" | "profile" | "settings" | "projects" | "subscriptions" | "invoices" | "payments" | "cart" | "orders" | "catalog" | "collection"
  | "stats" | "tickets" | "maintenance" | "client-maintenance" | "clients" | "domains"
  | "finance" | "media" | "leads" | "staff-tickets" | "demo-requests" | "intern"
  | "announcements" | "resources" | "promotions" | "ai-os" | "team-staff" | "os-centers" | "servicii-avyron" | "produse-avyron"
  | "newsletter" | "ai-projects" | "logo-simulations" | "logo-2d-simulations" | "surveys" | "configurator"
  | "collaborators" | "my-collaborations" | "antivirus" | "example-carousels" | "commercial-codes" | "other-hub" | "social-manager" | "subscriptions-admin" | "internal-subscriptions" | "careers" | "library" | "reviews" | "avy-engine";

export type SectionDef = {
  id: SectionId;
  group:
    | "overview" | "account" | "projects" | "billing" | "recurring" | "documents" | "servicii" | "produse" | "activity" | "platform" | "os" | "other";
  audience: Audience;
  /** Secțiunile false rămân accesibile din huburi și căutare, fără duplicate în sidebar. */
  navigation?: boolean;
  /** Cuvinte pentru căutarea rapidă. */
  keywords: string[];
  requiredCapability?: string;
};

/**
 * Ordinea dictează ordinea afișării. Secțiunile financiare sunt rezervate
 * conturilor de super admin — restul echipei nu le vede deloc.
 */
export const SECTIONS: readonly SectionDef[] = [
  { id: "overview", group: "overview", audience: "everyone", keywords: ["acasa", "azi", "overview", "dashboard", "briefing", "atentie"] },
  { id: "finance", group: "overview", audience: "superadmin", keywords: ["financiar", "facturare", "venituri", "plati", "incasari", "finance"] },
  { id: "social-manager", group: "activity", audience: "superadmin", requiredCapability: "ai_projects.read", keywords: ["social media", "publicare", "aprobari", "continut ai", "facebook", "instagram"] },
  { id: "antivirus", group: "os", audience: "superadmin", keywords: ["antivirus", "bouncer", "malware", "carantina", "scanare", "cote"] },
  { id:"collaborators",group:"overview",audience:"staff",requiredCapability:"collaborators.read",keywords:["colaboratori","parteneri","juridic","economic","financiar"] },
  { id:"my-collaborations",group:"account",audience:"everyone",navigation:false,keywords:["colaborarile mele","parteneriat"] },
  { id: "profile", group: "account", audience: "everyone", keywords: ["cont", "profil", "date", "account"] },
  { id: "settings", group: "account", audience: "everyone", keywords: ["setari", "preferinte", "settings", "tema", "limba"] },

  { id: "projects", group: "projects", audience: "everyone", keywords: ["proiecte", "site", "projects", "livrare", "vanzari"] },
  { id: "ai-projects", group: "projects", audience: "staff", requiredCapability: "ai_projects.read", keywords: ["proiecte ai", "productie ai", "continut"] },
  { id: "maintenance", group: "os", audience: "superadmin", keywords: ["avy core", "sistem", "diagnostice"] },
  { id: "client-maintenance", group: "recurring", audience: "everyone", keywords: ["mentenanta clienti", "activitati", "abonamente", "maintenance"] },
  { id: "leads", group: "projects", audience: "staff", requiredCapability: "leads.read", keywords: ["leads", "crm", "vanzari", "oferta", "prospecti"] },
  { id: "media", group: "projects", audience: "staff", keywords: ["media", "imagini", "fisiere"] },

  { id: "subscriptions", group: "billing", audience: "client", keywords: ["abonament", "plan", "subscriptions"] },
  { id: "payments", group: "billing", audience: "client", keywords: ["metode de plata", "card", "stripe", "revolut", "facturare"] },
  { id: "catalog", group: "servicii", audience: "client", keywords: ["catalog", "servicii", "produse", "oferta"] },
  { id: "cart", group: "billing", audience: "client", keywords: ["cos", "comanda", "cart"] },
  { id: "orders", group: "billing", audience: "client", keywords: ["istoric", "comenzi", "plata", "orders"] },
  { id: "invoices", group: "billing", audience: "client", keywords: ["facturi", "invoices", "plata"] },


  { id: "documents", group: "documents", audience: "everyone", keywords: ["documente", "contracte", "oferte", "tipizate", "generator", "staff"] },

  // Serviciile sunt angajamente personalizate pentru clienți; produsele sunt
  // artefacte digitale reutilizabile. Categoriile rămân deliberat separate.
  { id: "servicii-avyron", group: "servicii", audience: "staff", keywords: ["servicii avyron", "website", "magazin", "blog", "aplicatii", "automatizari", "qa", "logo", "oferta"] },

  // Produsele digitale au categoria lor: clientul își vede colecția, iar
  // super adminul centrul magazinului — două fețe ale aceluiași lucru.
  { id: "collection", group: "produse", audience: "everyone", keywords: ["colectia mea", "produse avyron", "componente", "parteneriat", "avy", "collection", "artefacte"] },
  { id: "produse-avyron", group: "produse", audience: "superadmin", keywords: ["produse avyron", "artefacte", "catalog", "parteneriate", "magazin", "componente"] },
  { id: "subscriptions-admin", group: "recurring", audience: "superadmin", keywords: ["abonamente", "mentenanta", "preturi", "clienti abonati", "trafic"] },
  { id: "internal-subscriptions", group: "recurring", audience: "staff", keywords: ["abonamente avyron", "conturi interne", "lovable", "codex", "cloudflare", "github", "reinnoiri"] },

  { id: "stats", group: "activity", audience: "client", keywords: ["statistici", "vizite", "stats"] },
  { id: "tickets", group: "activity", audience: "client", keywords: ["suport", "tichete", "tickets", "mesaje"] },
  { id: "staff-tickets", group: "activity", audience: "staff", keywords: ["suport", "tichete clienti", "tickets"] },
  { id: "intern", group: "activity", audience: "everyone", keywords: ["chat", "echipa", "intern", "mesaje"] },
  { id: "announcements", group: "activity", audience: "staff", keywords: ["anunturi", "noutati"] },

  { id: "team-staff", group: "platform", audience: "staff", keywords: ["echipa", "staff", "roluri", "permisiuni", "acces"] },
  { id: "clients", group: "platform", audience: "staff", keywords: ["clienti", "clients", "companii"] },
  { id: "ai-os", group: "platform", audience: "superadmin", keywords: ["ai", "avy", "agenti", "chatbot", "automatizare"] },
  { id: "reviews", group: "platform", audience: "admin", keywords: ["recenzii", "review", "testimoniale", "aprobari", "rating"] },
  { id: "demo-requests", group: "platform", audience: "staff", keywords: ["demo", "solicitari", "leaduri"] },
  { id: "logo-2d-simulations", group: "platform", audience: "staff", requiredCapability: "leads.read", keywords: ["logo", "2d", "gratuit", "simulator", "ai"] },
  { id: "logo-simulations", group: "produse", audience: "staff", keywords: ["logo", "simulari", "3d", "logo studio"] },
  { id: "domains", group: "platform", audience: "staff", keywords: ["domenii", "dns", "domains"] },
  { id: "surveys", group: "platform", audience: "staff", keywords: ["surveys", "chestionare", "brief", "rezultate"] },
  { id: "configurator", group: "platform", audience: "staff", keywords: ["configurator", "estimari", "oferte", "rezultate"] },
  { id: "example-carousels", group: "platform", audience: "staff", keywords: ["carusele", "exemple", "portofoliu", "galerie", "publicare" ] },
  { id: "careers", group: "os", audience: "staff", keywords: ["cariere", "joburi", "roluri", "recrutare"] },
  { id: "library", group: "os", audience: "staff", keywords: ["biblioteca", "resurse", "surse", "referinte"] },

  { id: "commercial-codes", group: "os", audience: "superadmin", keywords: ["coduri", "sku", "contabilitate", "servicii", "produse", "tva", "plata"] },
  { id: "newsletter", group: "os", audience: "superadmin", keywords: ["newsletter", "abonati", "email", "campanii", "consimtamant"] },
  { id: "avy-engine", group: "os", audience: "superadmin", keywords: ["avy engine", "surse", "capabilitati", "conectori", "fluxuri", "documentatie"] },
  { id: "os-centers", group: "os", audience: "staff", keywords: ["securitate", "automatizari", "integrari", "backup", "erori", "agenti ai", "programari", "comentarii", "pluginuri"] },
  { id: "promotions", group: "os", audience: "superadmin", navigation: false, keywords: ["promotii", "reduceri", "campanii"] },

  { id: "other-hub", group: "other", audience: "staff", keywords: ["altele", "module", "rapoarte", "functii", "roadmap"] },
  { id: "resources", group: "documents", audience: "staff", navigation: false, keywords: ["resurse", "documente", "ghid", "siteuri", "campuri"] },
];

const canOpenDefinition = (section: SectionDef, access: Access) => {
  if(section.id==="maintenance")return access.isSuperAdmin;
  if(section.id==="my-collaborations")return access.hasCollaborations===true;
  if(section.id==="collaborators")return access.isSuperAdmin || (access.isStaff&&access.capabilities.some(c=>["collaborators.read","collaborators.manage"].includes(c)));
  if (access.capabilities.includes(STAFF_MANAGED) && !access.isSuperAdmin) {
    if (["profile", "settings"].includes(section.id)) return true;
    return (STAFF_SECTION_PERMISSIONS[section.id] || []).some((key) =>
      access.capabilities.includes(key),
    );
  }
  if (section.id === "finance" && access.capabilities.includes("finance.read"))
    return true;
  if (
    section.id === "newsletter" &&
    access.capabilities.includes("newsletter.manage")
  )
    return true;
  return (
    canSee(section.audience, access)
  || Boolean(section.requiredCapability && access.capabilities.includes(section.requiredCapability))
  );
};

export const sectionsFor = (a: Access) => SECTIONS.filter((s) => canOpenDefinition(s, a));

export const canOpenSection = (id: string, a: Access) => {
  const s = SECTIONS.find((x) => x.id === id);
  return !!s && canOpenDefinition(s, a);
};

export const defaultSection = (a: Access): SectionId =>
  a.capabilities.includes("staff.rank.avy_contabil") &&
  canOpenSection("finance", a)
    ? "finance"
    : a.capabilities.includes(STAFF_MANAGED) && !canOpenSection("overview", a)
      ? "profile"
      : "overview";
