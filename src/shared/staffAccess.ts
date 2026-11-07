/** Registered permissions map to enforced API operations; rank labels never authorize requests. */
export const STAFF_PERMISSIONS = [
  ["skills.read", "Avy Skills", "Citire skilluri", "Instrucțiuni și resurse reutilizabile aprobate; fără acces implicit la briefurile altor clienți."],
  ["skills.use", "Avy Skills", "Utilizare skilluri", "Pregătire mockupuri și briefuri interne în limitele existente."],
  ["skills.manage", "Avy Skills", "Configurare skilluri", "Ciorne de instrucțiuni și resurse; nu aprobă sau publică automat."],
  ["skills.approve", "Avy Skills", "Aprobare skilluri", "Aprobă versiuni, resurse și rezultate interne; nu publică pe site."],
  ["collaborators.read", "Comercial", "Citire colaboratori / parteneri", "Registrul profesional, fișe și documente autorizate."],
  ["collaborators.manage", "Comercial", "Administrare colaboratori / parteneri", "Fișe, asocieri explicite de cont și vizibilitatea documentelor; nu acordă acces la produse."],
  ["examples.read", "Platformă", "Citire carusele exemple", "Configurări, ciorne și istoric pentru exemplele publice."],
  ["examples.edit", "Platformă", "Editare carusele exemple", "Exemple, ordine, imagini și setări; nu publică automat."],
  ["examples.approve", "Platformă", "Aprobare exemple", "Verificare sau respingere a versiunii trimise."],
  ["examples.publish", "Platformă", "Publicare exemple", "Publicare explicită a versiunii aprobate."],
  [
    "dashboard.read",
    "Echipă",
    "Prezentare generală",
    "Indicatori operaționali potriviți accesului.",
  ],
  [
    "team.read",
    "Echipă",
    "Directorul agenției",
    "Nume și ranguri, fără administrarea conturilor.",
  ],
  [
    "chat.read",
    "Echipă",
    "Citire chat intern",
    "Canale comune și propriile conversații directe.",
  ],
  [
    "chat.write",
    "Echipă",
    "Trimitere mesaje",
    "Mesaje în canale și către colegii activi.",
  ],
  [
    "announcements.read",
    "Echipă",
    "Anunțuri interne",
    "Citire anunțuri ale echipei.",
  ],
  [
    "announcements.write",
    "Echipă",
    "Publicare anunțuri",
    "Creare și arhivare anunțuri.",
  ],
  [
    "projects.read",
    "Proiecte",
    "Vizualizare proiecte",
    "Proiectele alocate sau autorizate explicit.",
  ],
  [
    "projects.write",
    "Proiecte",
    "Editare și activități",
    "Modificări, etape, materiale și livrabile în proiectele autorizate.",
  ],
  [
    "projects.create",
    "Proiecte",
    "Proiecte noi",
    "Creare în registrul existent, cu beneficiar identificat.",
  ],
  [
    "projects.all",
    "Proiecte",
    "Toate proiectele",
    "Extinde aria de proiecte dincolo de alocările individuale.",
  ],
  [
    "maintenance.read",
    "Mentenanță",
    "Acces AVY Core",
    "Vizualizare mentenanță în aria autorizată.",
  ],
  [
    "maintenance.work",
    "Mentenanță",
    "Intervenții și activități",
    "Lucru pe proiectele sau abonamentele de mentenanță alocate.",
  ],
  [
    "maintenance.manage",
    "Mentenanță",
    "Configurare mentenanță",
    "Planuri, specificații și alocări; nu inițiază încasări.",
  ],
  [
    "clients.read",
    "Comercial",
    "Fișe clienți",
    "Consultare CRM și date de contact.",
  ],
  [
    "clients.write",
    "Comercial",
    "Administrare clienți",
    "Creare și actualizare fișe în CRM-ul existent.",
  ],
  [
    "leads.read",
    "Comercial",
    "Citire leaduri",
    "Acces la leadurile autorizate.",
  ],
  [
    "leads.write",
    "Comercial",
    "Pipeline și calificare",
    "Actualizare leaduri și etape comerciale.",
  ],
  [
    "leads.create",
    "Comercial",
    "Leaduri noi",
    "Creare oportunități în registrul existent.",
  ],
  [
    "leads.delete",
    "Comercial",
    "Retragere leaduri",
    "Eliminare comercială cu motiv și audit.",
  ],
  [
    "services.read",
    "Dezvoltare",
    "Catalog servicii",
    "Servicii și configurații existente.",
  ],
  [
    "services.pages.manage",
    "Dezvoltare",
    "Configurare pagini servicii",
    "Editare ciorne și publicare prin fluxul existent, cu confirmare.",
  ],
  [
    "documents.read",
    "Documente",
    "Citire documente",
    "Respectă beneficiarul, publicarea și aria documentului.",
  ],
  [
    "documents.create",
    "Documente",
    "Creare documente",
    "Instanțe din tipizate sau de la zero.",
  ],
  [
    "documents.edit",
    "Documente",
    "Editare documente",
    "Ciorne și versiuni noi, fără rescrierea istoricului.",
  ],
  [
    "documents.export",
    "Documente",
    "Export PDF / Word",
    "Exporturi private autorizate.",
  ],
  [
    "documents.share",
    "Documente",
    "Distribuire documente",
    "Destinatari verificați și confirmare înainte de trimitere.",
  ],
  [
    "documents.approve",
    "Documente",
    "Aprobare documente",
    "Verificare umană a versiunii curente.",
  ],
  [
    "documents.publish",
    "Documente",
    "Publicare la client",
    "Numai pentru beneficiarul și destinatarii autorizați.",
  ],
  [
    "documents.templates.manage",
    "Documente",
    "Administrare tipizate",
    "Modele originale și versiuni, cu verificările juridice existente.",
  ],
  [
    "documents.backups.manage",
    "Documente",
    "Backup și restaurare",
    "În limita accesului documentului; SC rămâne pentru rangurile platformei.",
  ],
  [
    "marketing.read",
    "Marketing",
    "Activități marketing",
    "Fluxuri, programări și raportare marketing.",
  ],
  [
    "marketing.write",
    "Marketing",
    "Gestionare fluxuri",
    "Pregătire activități și ciorne, fără trimitere implicită.",
  ],
  [
    "ai_projects.read",
    "Marketing",
    "Proiecte AI / Social",
    "Proiectele AI alocate explicit.",
  ],
  [
    "ai_content.create",
    "Marketing",
    "Creare conținut",
    "Ciorne în proiectele AI autorizate.",
  ],
  [
    "social.approve",
    "Marketing",
    "Aprobare editorială",
    "Aprobare sau respingere în proiectele AI alocate.",
  ],
  [
    "blog.manage",
    "Marketing",
    "Blog editorial",
    "Ciorne și fluxul editorial al articolelor.",
  ],
  [
    "newsletter.manage",
    "Marketing",
    "Newsletter",
    "Pregătire campanii; trimiterea cere confirmarea existentă.",
  ],
  [
    "finance.read",
    "Financiar",
    "Vizualizare financiară",
    "Situații, venituri, cheltuieli și facturi.",
  ],
  [
    "finance.write",
    "Financiar",
    "Operare financiară",
    "Înregistrări financiare, cu MFA pentru modificări.",
  ],
  [
    "finance.accounts.read",
    "Financiar",
    "Conturi și furnizori",
    "Datele financiare permise de politica existentă.",
  ],
  [
    "finance.documents.read",
    "Financiar",
    "Documente financiare",
    "Acces la documentele financiare autorizate.",
  ],
  [
    "finance.audit.read",
    "Financiar",
    "Jurnal financiar",
    "Consultarea trasabilității financiare.",
  ],
  [
    "finance.budget.approve",
    "Financiar",
    "Aprobare bugete",
    "Decizii de buget cu audit.",
  ],
  [
    "finance.settings",
    "Financiar",
    "Configurări financiare",
    "Setări financiare, fără activarea implicită a furnizorilor.",
  ],
  [
    "support.read",
    "Suport",
    "Citire suport",
    "Tichete și conversații de suport.",
  ],
  [
    "support.write",
    "Suport",
    "Operare suport",
    "Răspunsuri și actualizări de tichete.",
  ],
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number][0];
export const STAFF_PERMISSION_KEYS: string[] =
  /* @__PURE__ */ STAFF_PERMISSIONS.map((p) => p[0]);
export const STAFF_MANAGED = "staff.access.managed";
const common: StaffPermission[] = [
  "dashboard.read",
  "team.read",
  "chat.read",
  "chat.write",
  "announcements.read",
];
const docs: StaffPermission[] = [
  "documents.read",
  "documents.create",
  "documents.edit",
  "documents.export",
];
const dev: StaffPermission[] = [
  "projects.read",
  "projects.write",
  "projects.create",
  "projects.all",
  "maintenance.read",
  "maintenance.work",
  "maintenance.manage",
  "services.read",
  "services.pages.manage",
];
const commercial: StaffPermission[] = [
  "clients.read",
  "clients.write",
  "leads.read",
  "leads.write",
  "leads.create",
  "marketing.read",
  "marketing.write",
  "ai_projects.read",
  "ai_content.create",
  "social.approve",
  "blog.manage",
  "support.read",
  "support.write",
];
export const STAFF_RANKS = [
  {
    id: "platform_owner",
    label: "Owner Platform",
    level: 100,
    description: "Acces total și controlul ierarhiei platformei.",
    permissions: STAFF_PERMISSION_KEYS,
  },
  {
    id: "superadmin",
    label: "Super Admin",
    level: 90,
    description:
      "Acces total operațional, inclusiv Documente SC și backupurile firmei.",
    permissions: STAFF_PERMISSION_KEYS,
  },
  {
    id: "ultimate_dev",
    label: "UltimateDev",
    level: 70,
    description:
      "Control complet în aria de dezvoltare, proiecte și mentenanță.",
    permissions: [
      ...common,
      ...dev,
      ...docs,
      "documents.templates.manage",
      "support.read",
      "support.write",
    ],
  },
  {
    id: "avy_consultant",
    label: "AvyConsultant",
    level: 60,
    description:
      "Control comercial, consultanță, marketing și proiectele alocate.",
    permissions: [
      ...common,
      ...commercial,
      ...docs,
      "projects.read",
      "documents.share",
      "documents.approve",
      "documents.publish",
    ],
  },
  {
    id: "senior_dev",
    label: "SeniorDev",
    level: 50,
    description:
      "Control proiecte și dezvoltare; accesurile suplimentare se acordă separat.",
    permissions: [
      ...common,
      ...docs,
      "projects.read",
      "projects.write",
      "projects.create",
      "projects.all",
      "services.read",
      "maintenance.read",
      "maintenance.work",
    ],
  },
  {
    id: "vibe_dev",
    label: "VibeDev",
    level: 40,
    description: "Lucru pe proiectele și mentenanța alocate.",
    permissions: [
      ...common,
      ...docs,
      "projects.read",
      "projects.write",
      "maintenance.read",
      "maintenance.work",
    ],
  },
  {
    id: "avy_contabil",
    label: "AvyContabil",
    level: 30,
    description: "Operațiuni financiare, documente financiare și audit.",
    permissions: [
      ...common,
      "finance.read",
      "finance.write",
      "finance.accounts.read",
      "finance.documents.read",
      "finance.audit.read",
    ],
  },
] as const;
export type StaffRankId = (typeof STAFF_RANKS)[number]["id"];
export type StaffRankProfile = {
  id: StaffRankId;
  label: string;
  level: number;
  description: string;
  permissions: string[];
  revision: number;
};
export const normalizeStaffPermissions = (keys: readonly string[]) =>
  [...new Set(keys)].filter((k) => STAFF_PERMISSION_KEYS.includes(k)).sort();
export const staffRankLabel = (rank: string | null | undefined) =>
  STAFF_RANKS.find((r) => r.id === rank)?.label || "Membru al agenției";
export function capabilityRank(
  capabilities: string[],
  platformRole?: string | null,
) {
  return (
    platformRole ||
    capabilities.find((c) => c.startsWith("staff.rank."))?.slice(11) ||
    null
  );
}
/** Navigation and request categories share the same registered permission keys. */
export const STAFF_SECTION_PERMISSIONS: Record<string, string[]> = {
  "skill-site-builder": ["skills.read", "skills.use", "skills.manage", "skills.approve"],
  "skill-logo-engine": ["skills.read", "skills.use", "skills.manage", "skills.approve"],
  "skill-media-generate": ["skills.read", "skills.use", "skills.manage", "skills.approve"],
  collaborators:["collaborators.read","collaborators.manage"],
  overview: ["dashboard.read"],
  projects: ["projects.read"],
  maintenance: [],
  "client-maintenance": ["maintenance.read"],
  intern: ["chat.read"],
  "team-staff": ["team.read"],
  announcements: ["announcements.read"],
  documents: ["documents.read"],
  resources: ["documents.read"],
  clients: ["clients.read"],
  leads: ["leads.read"],
  "servicii-avyron": ["services.read"],
  finance: ["finance.read"],
  "social-manager": ["ai_projects.read"],
  "ai-projects": ["ai_projects.read"],
  newsletter: ["newsletter.manage"],
  "staff-tickets": ["support.read"],
  "demo-requests": ["leads.read"],
  media: ["projects.read"],
  domains: ["services.read"],
  surveys: ["leads.read"],
  configurator: ["leads.read"],
  "logo-simulations": ["leads.read"],
  "logo-2d-simulations": ["leads.read"],
  "other-hub": ["team.read"],
  library: ["services.read"],
  careers: ["services.read"],
  "example-carousels": ["examples.read"],
};
export function staffRequestPermission(
  path: string,
  method: string,
): string | null {
  const write = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (
    path.startsWith("/api/auth/") ||
    path === "/api/profile" ||
    path.startsWith("/api/profile/")
  )
    return null;
  if (path.startsWith("/api/notifications/admin")) return "platform.restricted";
  if (path === "/api/notifications" || path.startsWith("/api/notifications/")) return null; // Own inbox reauthorizes every resource.
  if (path.startsWith("/api/logo-studio/admin")) return "leads.read";
  if (path.startsWith("/api/staff-access")) return "team.read";
  if (path === "/api/workspace/activity-counts") return null;
  if (path === "/api/workspace/staff") return "team.read";
  if (path === "/api/admin/users") return "team.options";
  if (path.startsWith("/api/project-chat")) return path.endsWith("/read") || !write ? "chat.read" : "chat.write";
  if (path.startsWith("/api/workspace/chat"))
    return path.endsWith("/read")
      ? "chat.read"
      : write
        ? "chat.write"
        : "chat.read";
  if (/^\/api\/workspace\/announcements\/[^/]+\/read$/.test(path)) return "announcements.read";
  if (path.startsWith("/api/workspace/announcements"))
    return write ? "announcements.write" : "announcements.read";
  if (
    path.startsWith("/api/workspace/maintenance") ||
    path.startsWith("/api/maintenance")
  )
    return write ? "maintenance.manage" : "maintenance.read";
  if (path.startsWith("/api/workspace/work-items"))
    return write ? "work.write" : "work.read";
  if (
    path.startsWith("/api/projects") ||
    path.startsWith("/api/proposals") ||
    path.startsWith("/api/links") ||
    path.startsWith("/api/media") ||
    path.startsWith("/api/visual-assets") ||
    path.startsWith("/api/metadata")
  )
    return path === "/api/projects" && method === "POST"
      ? "projects.create"
      : write
        ? "projects.write"
        : "projects.read";
  if (path.startsWith("/api/finance") && write) {
    if (/\/(accounts|payment-methods|quotas|agent-policies)(\/|$)/.test(path))
      return "finance.settings";
    if (path.includes("/budgets")) return "finance.budget.approve";
    if (path.includes("/cost-guard/evaluate")) return "finance.read";
  }
  if (path === "/api/clients" && !write) return "clients.options";
  if (
    path.startsWith("/api/finance") ||
    path.startsWith("/api/internal/subscriptions") ||
    path.startsWith("/api/billing/admin")
  )
    return write ? "finance.write" : "finance.read";
  if (path.startsWith("/api/documents")) return "documents.read"; // Existing document policy checks each exact action and resource.
  if (
    path.startsWith("/api/leads") ||
    path.startsWith("/api/admin/leads") ||
    path.startsWith("/api/example-requests") ||
    path.startsWith("/api/logo-studio/admin") ||
    path.startsWith("/api/surveys/admin") ||
    path.startsWith("/api/configurator/admin")
  )
    return write ? "leads.write" : "leads.read";
  if (
    path.startsWith("/api/clients") ||
    path.startsWith("/api/admin/operations/clients")
  )
    return write ? "clients.write" : "clients.read";
  if (
    path.startsWith("/api/admin/service-pages") ||
    path.startsWith("/api/services")
  )
    return write ? "services.pages.manage" : "services.read";
  if (path.startsWith("/api/admin/example-carousels")) {
    if (!write) return "examples.read";
    if (path.endsWith("/publish")) return "examples.publish";
    if (/\/(approve|reject)$/.test(path)) return "examples.approve";
    return "examples.edit";
  }
  if (path.startsWith("/api/collaborators")) return write ? "collaborators.manage" : "collaborators.read";
  if (path.startsWith("/api/ai-projects"))
    return write ? "marketing.write" : "ai_projects.read";
  if (path.startsWith("/api/blog/staff")) return "blog.manage";
  if (path.startsWith("/api/newsletter/admin")) return "newsletter.manage";
  if (path.startsWith("/api/operations/notifications")) return "team.read";
  if (path.startsWith("/api/operations")) return "platform.restricted";
  if (
    path.startsWith("/api/workspace/tickets") ||
    path.startsWith("/api/support")
  )
    return write ? "support.write" : "support.read";
  if (path.startsWith("/api/os/overview")) return "dashboard.read";
  if (
    path.startsWith("/api/os/notifications") ||
    path.startsWith("/api/notifications")
  )
    return "team.read";
  if (path.startsWith("/api/workspace/domains")) return "services.read";
  if (
    path.startsWith("/api/workspace/media") ||
    path.startsWith("/api/workspace/statistics")
  )
    return write ? "projects.write" : "projects.read";
  if (path.startsWith("/api/admin/operations/resources"))
    return "services.read";
  return "platform.restricted"; // Opted-in staff ranks never inherit unrelated legacy administrative routes.
}

export function staffPermissionIssues(keys: readonly string[]) {
  const has = (key: string) => keys.includes(key),
    issues: string[] = [];
  const dependencies: Record<string, string[]> = {
    "chat.write": ["chat.read"],
    "projects.write": ["projects.read"],
    "projects.create": ["projects.read"],
    "projects.all": ["projects.read"],
    "maintenance.work": ["maintenance.read"],
    "maintenance.manage": ["maintenance.read"],
    "clients.write": ["clients.read"],
    "collaborators.manage": ["collaborators.read"],
    "leads.write": ["leads.read"],
    "leads.create": ["leads.read"],
    "leads.delete": ["leads.read"],
    "services.pages.manage": ["services.read"],
    "examples.edit": ["examples.read"],
    "examples.approve": ["examples.read"],
    "examples.publish": ["examples.read"],
    "marketing.write": ["marketing.read"],
    "ai_content.create": ["ai_projects.read", "marketing.write"],
    "social.approve": ["ai_projects.read", "marketing.write"],
  };
  for (const key of keys) {
    const needed =
      dependencies[key] ||
      (key.startsWith("documents.") && key !== "documents.read"
        ? ["documents.read"]
        : key.startsWith("finance.") && key !== "finance.read"
          ? ["finance.read"]
          : []);
    for (const dependency of needed)
      if (!has(dependency)) {
        const label = (k: string) =>
          STAFF_PERMISSIONS.find((p) => p[0] === k)?.[2] || k;
        issues.push(`${label(key)} necesită ${label(dependency)}.`);
      }
  }
  return [...new Set(issues)];
}
