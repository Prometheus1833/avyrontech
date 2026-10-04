import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CreditCard,
  FolderKanban,
  Globe,
  Image,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  User,
  Users,
  Wallet,
  Wrench,
  BadgePercent,
  Calculator,
  ClipboardList,
  FileCode2,
  PackageSearch,
  ScanSearch,
} from "lucide-react";
import type { SectionId } from "@/lib/access";

export type DashboardSectionMeta = {
  label: string;
  mobileLabel?: string;
  commandLabel: string;
  hint: string;
  icon: LucideIcon;
};

export const DASHBOARD_GROUP_LABELS: Record<string, string> = {
  overview: "Principal",
  projects: "Proiecte",
  activity: "Activitate",
  platform: "Platformă",
  os: "AVYRON OS",
  other: "Altele",
  billing: "Facturare",
  servicii: "Servicii AVYRON",
  produse: "Produse AVYRON",
  account: "Cont",
};

export const DASHBOARD_GROUP_ORDER = [
  "overview",
  "projects",
  "servicii",
  "produse",
  "activity",
  "platform",
  "os",
  "other",
  "billing",
  "account",
];

export const DASHBOARD_SECTION_META: Record<SectionId, DashboardSectionMeta> = {
  overview: { label: "Prezentare generală", mobileLabel: "Acasă", commandLabel: "Deschide prezentarea generală", hint: "Priorități, indicatori și starea sistemului", icon: LayoutDashboard },
  profile: { label: "Profil", commandLabel: "Deschide profilul", hint: "Date personale și identitatea contului", icon: User },
  settings: { label: "Setări", commandLabel: "Deschide setările", hint: "Preferințe și configurarea contului", icon: Settings },
  projects: { label: "Proiecte", commandLabel: "Deschide proiectele", hint: "Livrări, termene și progres", icon: FolderKanban },
  "ai-projects": { label: "Proiecte AI", commandLabel: "Deschide proiectele AI", hint: "Strategie, agenți și producție controlată", icon: Bot },
  maintenance: { label: "Mentenanță", commandLabel: "Deschide mentenanța", hint: "Monitorizare, intervenții și continuitate", icon: Wrench },
  clients: { label: "Clienți", commandLabel: "Deschide clienții", hint: "Companii, contacte și relații active", icon: Users },
  domains: { label: "Domenii", commandLabel: "Deschide domeniile", hint: "DNS, SSL și active digitale", icon: Globe },
  media: { label: "Media", commandLabel: "Deschide biblioteca media", hint: "Fișiere, imagini și livrabile", icon: Image },
  leads: { label: "Leaduri & CRM", mobileLabel: "Leaduri", commandLabel: "Arată leadurile", hint: "Pipeline, oportunități și răspunsuri", icon: Target },
  subscriptions: { label: "Abonamente", commandLabel: "Deschide abonamentele", hint: "Planuri și servicii recurente", icon: CreditCard },
  cart: { label: "Coș", commandLabel: "Deschide coșul", hint: "Produse și servicii pregătite pentru comandă", icon: ShoppingCart },
  invoices: { label: "Facturi", commandLabel: "Deschide facturile", hint: "Documente, scadențe și plăți", icon: Receipt },
  collection: { label: "Colecția mea", commandLabel: "Deschide colecția", hint: "Produsele și artefactele tale digitale", icon: Boxes },
  "servicii-avyron": { label: "Servicii AVYRON", commandLabel: "Deschide serviciile AVYRON", hint: "Pagini publice, oferte și livrare", icon: BriefcaseBusiness },
  "produse-avyron": { label: "Produse AVYRON", commandLabel: "Deschide produsele AVYRON", hint: "Catalog, parteneriate și comenzi", icon: Boxes },
  stats: { label: "Vizite și statistici", commandLabel: "Deschide statisticile", hint: "Trafic și activitatea proprietăților", icon: BarChart3 },
  tickets: { label: "Suport", commandLabel: "Deschide suportul", hint: "Solicitări și conversații de suport", icon: MessageSquare },
  "staff-tickets": { label: "Solicitări clienți", commandLabel: "Deschide solicitările clienților", hint: "Tichete care necesită răspuns", icon: MessageSquare },
  "demo-requests": { label: "Solicitări demo", commandLabel: "Deschide solicitările demo", hint: "Cereri noi și calificarea interesului", icon: MessageSquare },
  intern: { label: "Chat intern", commandLabel: "Deschide chatul intern", hint: "Conversațiile echipei AVYRON", icon: MessagesSquare },
  announcements: { label: "Anunțuri", commandLabel: "Deschide anunțurile", hint: "Actualizări și comunicări interne", icon: Megaphone },
  resources: { label: "Documente și resurse", commandLabel: "Deschide documentele", hint: "Cunoaștere și materiale interne", icon: BookOpen },
  "team-staff": { label: "STAFF", commandLabel: "Deschide STAFF", hint: "Echipă, roluri, permisiuni și acces", icon: Users },
  finance: { label: "Financiar", commandLabel: "Deschide situația financiară", hint: "Costuri, venituri, plăți și bugete", icon: Wallet },
  "commercial-codes": { label: "Coduri servicii și produse", commandLabel: "Deschide nomenclatorul comercial", hint: "Coduri, TVA și trasee de plată", icon: FileCode2 },
  promotions: { label: "Promoții", commandLabel: "Deschide promoțiile", hint: "Campanii și reguli comerciale", icon: BadgePercent },
  newsletter: { label: "Newsletter", commandLabel: "Deschide newsletterul", hint: "Abonați, campanii și consimțământ", icon: Mail },
  "ai-os": { label: "Agenți AI", mobileLabel: "AVY", commandLabel: "Deschide agenții AVY", hint: "Agenți, activitate și cunoaștere din Centre AVYRON OS", icon: Sparkles },
  "os-centers": { label: "Centre AVYRON OS", mobileLabel: "Mai multe", commandLabel: "Vezi toate centrele AVYRON OS", hint: "Integrări, automatizări și operațiuni", icon: ShieldCheck },
  "logo-simulations": { label: "Simulări Logo 3D", commandLabel: "Deschide simulările Logo 3D", hint: "Cereri Logo Studio, configurații și rezultate", icon: ScanSearch },
  surveys: { label: "Surveys", commandLabel: "Deschide Surveys", hint: "Chestionare, pipeline și briefuri", icon: ClipboardList },
  configurator: { label: "Configurator", commandLabel: "Deschide Configurator", hint: "Estimări, cereri și rezultate comerciale", icon: Calculator },
  "other-hub": { label: "Altele", commandLabel: "Deschide inventarul de module", hint: "Funcții, statistici și rapoarte fără secțiune dedicată", icon: PackageSearch },
};
