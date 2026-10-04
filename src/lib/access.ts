// Model central de acces pentru platforma internă.
// Un singur loc definește cine vede ce: butoane, secțiuni și date sensibile.
export type AppRole = "user" | "staff" | "admin";

export type Access = {
  roles: AppRole[];
  isClient: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export const buildAccess = (input: {
  roles: AppRole[];
  email?: string | null;
  superadmin?: boolean;
}): Access => {
  const roles = input.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isStaff = isAdmin || roles.includes("staff");
  return {
    roles,
    isClient: !isStaff,
    isStaff,
    isAdmin,
    // Elevated access is asserted only by the server after a fresh D1 lookup.
    // Email addresses are identity attributes, never authorization rules.
    isSuperAdmin: isAdmin && input.superadmin === true,
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
  | "overview" | "profile" | "settings" | "projects" | "subscriptions" | "invoices" | "cart" | "collection"
  | "stats" | "tickets" | "maintenance" | "clients" | "domains"
  | "finance" | "media" | "leads" | "staff-tickets" | "demo-requests" | "intern"
  | "announcements" | "resources" | "promotions" | "ai-os" | "team-staff" | "os-centers" | "servicii-avyron" | "produse-avyron"
  | "newsletter" | "ai-projects" | "logo-simulations" | "surveys" | "configurator"
  | "commercial-codes" | "other-hub";

export type SectionDef = {
  id: SectionId;
  group: "overview" | "account" | "projects" | "billing" | "servicii" | "produse" | "activity" | "platform" | "os" | "other";
  audience: Audience;
  /** Secțiunile false rămân accesibile din huburi și căutare, fără duplicate în sidebar. */
  navigation?: boolean;
  /** Cuvinte pentru căutarea rapidă. */
  keywords: string[];
};

/**
 * Ordinea dictează ordinea afișării. Secțiunile financiare sunt rezervate
 * conturilor de super admin — restul echipei nu le vede deloc.
 */
export const SECTIONS: readonly SectionDef[] = [
  { id: "overview", group: "overview", audience: "everyone", keywords: ["acasa", "azi", "overview", "dashboard", "briefing", "atentie"] },
  { id: "profile", group: "account", audience: "everyone", keywords: ["cont", "profil", "date", "account"] },
  { id: "settings", group: "account", audience: "everyone", keywords: ["setari", "preferinte", "settings", "tema", "limba"] },

  { id: "projects", group: "projects", audience: "everyone", keywords: ["proiecte", "site", "projects", "livrare", "vanzari"] },
  { id: "ai-projects", group: "projects", audience: "superadmin", keywords: ["proiecte ai", "productie ai", "continut"] },
  { id: "maintenance", group: "projects", audience: "staff", keywords: ["mentenanta", "uptime", "maintenance"] },
  { id: "leads", group: "projects", audience: "staff", keywords: ["leads", "crm", "vanzari", "oferta", "prospecti"] },
  { id: "domains", group: "projects", audience: "staff", keywords: ["domenii", "dns", "domains"] },
  { id: "media", group: "projects", audience: "staff", keywords: ["media", "imagini", "fisiere"] },

  { id: "subscriptions", group: "billing", audience: "client", keywords: ["abonament", "plan", "subscriptions"] },
  { id: "cart", group: "billing", audience: "client", keywords: ["cos", "comanda", "cart"] },
  { id: "invoices", group: "billing", audience: "client", keywords: ["facturi", "invoices", "plata"] },


  // Serviciile sunt angajamente personalizate pentru clienți; produsele sunt
  // artefacte digitale reutilizabile. Categoriile rămân deliberat separate.
  { id: "servicii-avyron", group: "servicii", audience: "staff", keywords: ["servicii avyron", "website", "magazin", "blog", "aplicatii", "automatizari", "qa", "logo", "oferta"] },

  // Produsele digitale au categoria lor: clientul își vede colecția, iar
  // super adminul centrul magazinului — două fețe ale aceluiași lucru.
  { id: "collection", group: "produse", audience: "everyone", keywords: ["colectia mea", "produse avyron", "componente", "parteneriat", "avy", "collection", "artefacte"] },
  { id: "produse-avyron", group: "produse", audience: "superadmin", keywords: ["produse avyron", "artefacte", "catalog", "parteneriate", "magazin", "componente"] },

  { id: "stats", group: "activity", audience: "client", keywords: ["statistici", "vizite", "stats"] },
  { id: "tickets", group: "activity", audience: "client", keywords: ["suport", "tichete", "tickets", "mesaje"] },

  { id: "team-staff", group: "platform", audience: "staff", keywords: ["echipa", "staff", "roluri", "permisiuni", "acces"] },
  { id: "clients", group: "platform", audience: "staff", keywords: ["clienti", "clients", "companii"] },
  { id: "demo-requests", group: "platform", audience: "staff", keywords: ["demo", "solicitari", "leaduri"] },
  { id: "logo-simulations", group: "platform", audience: "staff", keywords: ["logo", "simulari", "3d", "logo studio"] },
  { id: "surveys", group: "platform", audience: "staff", keywords: ["surveys", "chestionare", "brief", "rezultate"] },
  { id: "configurator", group: "platform", audience: "staff", keywords: ["configurator", "estimari", "oferte", "rezultate"] },

  { id: "finance", group: "os", audience: "superadmin", keywords: ["financiar", "facturare", "venituri", "plati", "incasari", "finance"] },
  { id: "commercial-codes", group: "os", audience: "superadmin", keywords: ["coduri", "sku", "contabilitate", "servicii", "produse", "tva", "plata"] },
  { id: "newsletter", group: "os", audience: "superadmin", keywords: ["newsletter", "abonati", "email", "campanii", "consimtamant"] },
  { id: "os-centers", group: "os", audience: "staff", keywords: ["securitate", "automatizari", "integrari", "backup", "erori", "agenti ai", "programari", "comentarii", "pluginuri"] },
  { id: "ai-os", group: "os", audience: "superadmin", navigation: false, keywords: ["ai", "avy", "agenti", "chatbot", "automatizare"] },
  { id: "promotions", group: "os", audience: "superadmin", navigation: false, keywords: ["promotii", "reduceri", "campanii"] },

  { id: "other-hub", group: "other", audience: "staff", keywords: ["altele", "module", "rapoarte", "functii", "roadmap"] },
  { id: "staff-tickets", group: "other", audience: "staff", navigation: false, keywords: ["suport", "tichete clienti", "tickets"] },
  { id: "intern", group: "other", audience: "staff", navigation: false, keywords: ["chat", "echipa", "intern"] },
  { id: "announcements", group: "other", audience: "staff", navigation: false, keywords: ["anunturi", "noutati"] },
  { id: "resources", group: "other", audience: "staff", navigation: false, keywords: ["resurse", "documente", "ghid"] },
];

export const sectionsFor = (a: Access) => SECTIONS.filter((s) => canSee(s.audience, a));

export const canOpenSection = (id: string, a: Access) => {
  const s = SECTIONS.find((x) => x.id === id);
  return !!s && canSee(s.audience, a);
};

export const defaultSection = (_a: Access): SectionId => "overview";
