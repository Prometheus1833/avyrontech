// Model central de acces pentru platforma internă.
// Un singur loc definește cine vede ce: butoane, secțiuni și date sensibile.
export type AppRole = "user" | "staff" | "admin";

/** Conturile cu control total (facturare, plăți, date personale complete). */
export const SUPERADMIN_EMAILS = ["prometheus@avyron.ro", "avyrontech@gmail.com"] as const;

export const isSuperAdminEmail = (email?: string | null) =>
  !!email && (SUPERADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());

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
    isSuperAdmin: isAdmin && (input.superadmin === true || isSuperAdminEmail(input.email)),
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
  | "profile" | "settings" | "projects" | "subscriptions" | "invoices" | "cart"
  | "stats" | "tickets" | "maintenance" | "clients" | "domains" | "payments"
  | "finance" | "media" | "staff-tickets" | "demo-requests" | "intern"
  | "announcements" | "resources" | "promotions";

export type SectionDef = {
  id: SectionId;
  group: "account" | "work" | "billing" | "activity" | "team" | "control";
  audience: Audience;
  /** Cuvinte pentru căutarea rapidă. */
  keywords: string[];
};

/**
 * Ordinea dictează ordinea afișării. Secțiunile financiare sunt rezervate
 * conturilor de super admin — restul echipei nu le vede deloc.
 */
export const SECTIONS: readonly SectionDef[] = [
  { id: "profile", group: "account", audience: "everyone", keywords: ["cont", "profil", "date", "account"] },
  { id: "settings", group: "account", audience: "everyone", keywords: ["setari", "preferinte", "settings", "tema", "limba"] },

  { id: "projects", group: "work", audience: "everyone", keywords: ["proiecte", "site", "projects", "livrare"] },
  { id: "maintenance", group: "work", audience: "staff", keywords: ["mentenanta", "uptime", "maintenance"] },
  { id: "clients", group: "work", audience: "staff", keywords: ["clienti", "clients", "companii"] },
  { id: "domains", group: "work", audience: "staff", keywords: ["domenii", "dns", "domains"] },
  { id: "media", group: "work", audience: "staff", keywords: ["media", "imagini", "fisiere"] },

  { id: "subscriptions", group: "billing", audience: "client", keywords: ["abonament", "plan", "subscriptions"] },
  { id: "cart", group: "billing", audience: "client", keywords: ["cos", "comanda", "cart"] },
  { id: "invoices", group: "billing", audience: "client", keywords: ["facturi", "invoices", "plata"] },

  { id: "stats", group: "activity", audience: "client", keywords: ["statistici", "vizite", "stats"] },
  { id: "tickets", group: "activity", audience: "client", keywords: ["suport", "tichete", "tickets", "mesaje"] },

  { id: "staff-tickets", group: "team", audience: "staff", keywords: ["suport", "tichete clienti", "tickets"] },
  { id: "demo-requests", group: "team", audience: "staff", keywords: ["demo", "solicitari", "leaduri"] },
  { id: "intern", group: "team", audience: "staff", keywords: ["chat", "echipa", "intern"] },
  { id: "announcements", group: "team", audience: "staff", keywords: ["anunturi", "noutati"] },
  { id: "resources", group: "team", audience: "staff", keywords: ["resurse", "documente", "ghid"] },

  { id: "payments", group: "control", audience: "superadmin", keywords: ["plati", "payments", "incasari"] },
  { id: "finance", group: "control", audience: "superadmin", keywords: ["financiar", "facturare", "venituri", "finance"] },
  { id: "promotions", group: "control", audience: "superadmin", keywords: ["promotii", "reduceri", "campanii"] },
];

export const sectionsFor = (a: Access) => SECTIONS.filter((s) => canSee(s.audience, a));

export const canOpenSection = (id: string, a: Access) => {
  const s = SECTIONS.find((x) => x.id === id);
  return !!s && canSee(s.audience, a);
};

export const defaultSection = (a: Access): SectionId => (a.isStaff ? "projects" : "projects");
