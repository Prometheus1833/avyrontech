import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3, Bell, BookOpen, Bot, BriefcaseBusiness, ChevronLeft, Command,
  CreditCard, FolderKanban, Globe, Image as ImageIcon, LayoutDashboard, Lock,
  LogOut, Megaphone, MessageSquare, MessagesSquare, PanelLeftClose, PanelLeftOpen,
  Receipt, Search, Settings, ShieldCheck, ShoppingCart, Sparkles, Target, User,
  Users, Wallet, Wrench, BadgePercent,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection, defaultSection, sectionsFor, type SectionId } from "@/lib/access";
import logo from "@/assets/avyron-logo.webp";

const ProfileTab = lazy(() => import("@/components/dashboard/ProfileTab").then((m) => ({ default: m.ProfileTab })));
const SubscriptionsTab = lazy(() => import("@/components/dashboard/SubscriptionsTab").then((m) => ({ default: m.SubscriptionsTab })));
const StatsTab = lazy(() => import("@/components/dashboard/StatsTab").then((m) => ({ default: m.StatsTab })));
const InvoicesTab = lazy(() => import("@/components/dashboard/InvoicesTab").then((m) => ({ default: m.InvoicesTab })));
const TicketsTab = lazy(() => import("@/components/dashboard/TicketsTab").then((m) => ({ default: m.TicketsTab })));
const StaffClientsTab = lazy(() => import("@/components/dashboard/StaffClientsTab").then((m) => ({ default: m.StaffClientsTab })));
const StaffAnnouncementsTab = lazy(() => import("@/components/dashboard/StaffAnnouncementsTab").then((m) => ({ default: m.StaffAnnouncementsTab })));
const CloudflareProjects = lazy(() => import("@/pages/intern/InternHome"));
const StaffMaintenanceTab = lazy(() => import("@/components/dashboard/StaffMaintenanceTab").then((m) => ({ default: m.StaffMaintenanceTab })));
const StaffChatTab = lazy(() => import("@/components/dashboard/StaffChatTab").then((m) => ({ default: m.StaffChatTab })));
const StaffResourcesTab = lazy(() => import("@/components/dashboard/StaffResourcesTab").then((m) => ({ default: m.StaffResourcesTab })));
const StaffDomainStatsTab = lazy(() => import("@/components/dashboard/StaffDomainStatsTab").then((m) => ({ default: m.StaffDomainStatsTab })));
const StaffExampleRequestsTab = lazy(() => import("@/components/dashboard/StaffExampleRequestsTab").then((m) => ({ default: m.StaffExampleRequestsTab })));
const SettingsTab = lazy(() => import("@/components/dashboard/SettingsTab").then((m) => ({ default: m.SettingsTab })));
const CartTab = lazy(() => import("@/components/dashboard/CartTab").then((m) => ({ default: m.CartTab })));
const StaffFinanceTab = lazy(() => import("@/components/dashboard/StaffFinanceTab").then((m) => ({ default: m.StaffFinanceTab })));
const StaffPaymentsTab = lazy(() => import("@/components/dashboard/StaffPaymentsTab").then((m) => ({ default: m.StaffPaymentsTab })));
const StaffMediaTab = lazy(() => import("@/components/dashboard/StaffMediaTab").then((m) => ({ default: m.StaffMediaTab })));
const StaffLeadsTab = lazy(() => import("@/components/dashboard/StaffLeadsTab").then((m) => ({ default: m.StaffLeadsTab })));
const StaffPromotionsTab = lazy(() => import("@/components/dashboard/StaffPromotionsTab").then((m) => ({ default: m.StaffPromotionsTab })));
const AiOsConsole = lazy(() => import("@/pages/intern/AiOs"));
const AiProductionEntryCard = lazy(() => import("@/components/dashboard/AiProductionEntryCard"));
const EngineEntryCard = lazy(() => import("@/components/dashboard/EngineEntryCard"));
const AvyronOverview = lazy(() => import("@/components/dashboard/AvyronOverview"));
const TeamStaffTab = lazy(() => import("@/components/dashboard/TeamStaffTab"));
const OsCentersTab = lazy(() => import("@/components/dashboard/OsCentersTab"));
const CommandCenter = lazy(() => import("@/components/dashboard/CommandCenter"));

const GROUP_LABELS: Record<string, string> = {
  overview: "Principal", work: "Clienți și livrare", activity: "Activitate",
  team: "Echipă și cunoaștere", control: "Control AVYRON OS",
  billing: "Facturare", account: "Cont",
};
const GROUP_ORDER = ["overview", "work", "activity", "team", "control", "billing", "account"];

export default function Profile() {
  const { user, profile, roles, isSuperAdmin, isStaff, isAdmin, signOut } = useAuth();
  const access = useMemo(() => buildAccess({ roles, email: user?.email, superadmin: isSuperAdmin }), [roles, user?.email, isSuperAdmin]);
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") ?? "";
  const [tab, setTab] = useState<SectionId>(canOpenSection(requested, access) ? requested as SectionId : defaultSection(access));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const meta: Record<SectionId, { label: string; icon: typeof User }> = useMemo(() => ({
    overview: { label: "Prezentare generală", icon: LayoutDashboard },
    profile: { label: "Profil", icon: User }, settings: { label: "Setări", icon: Settings },
    projects: { label: access.isStaff ? "Proiecte" : "Proiectele mele", icon: FolderKanban },
    maintenance: { label: "Mentenanță", icon: Wrench }, clients: { label: "Clienți", icon: Users },
    domains: { label: "Domenii", icon: Globe }, media: { label: "Media", icon: ImageIcon }, leads: { label: "Leaduri & CRM", icon: Target },
    subscriptions: { label: "Abonamente", icon: CreditCard }, cart: { label: "Coș", icon: ShoppingCart }, invoices: { label: "Facturi", icon: Receipt },
    stats: { label: "Vizite și statistici", icon: BarChart3 }, tickets: { label: "Suport", icon: MessageSquare },
    "staff-tickets": { label: "Solicitări clienți", icon: MessageSquare }, "demo-requests": { label: "Solicitări demo", icon: MessageSquare },
    intern: { label: "Chat intern", icon: MessagesSquare }, announcements: { label: "Anunțuri", icon: Megaphone },
    resources: { label: "Documente și resurse", icon: BookOpen }, "team-staff": { label: "Echipă și personal", icon: Users },
    payments: { label: "Plăți", icon: Wallet }, finance: { label: "Financiar", icon: Wallet }, promotions: { label: "Promoții", icon: BadgePercent },
    "ai-os": { label: "Agenți AI", icon: Sparkles }, "os-centers": { label: "Centre AVYRON OS", icon: BriefcaseBusiness },
  }), [access.isStaff]);

  const allowed = useMemo(() => sectionsFor(access), [access]);
  const groups = GROUP_ORDER.map((group) => ({ id: group, label: GROUP_LABELS[group], items: allowed.filter((section) => section.group === group) })).filter((group) => group.items.length);
  const displayName = profile?.display_name || user?.display_name || user?.email?.split("@")[0] || "utilizator";
  const roleLabel = isSuperAdmin ? "Super administrator" : isAdmin ? "Administrator" : isStaff ? "Membru al echipei" : "Client";

  useEffect(() => {
    if (!canOpenSection(tab, access)) setTab(defaultSection(access));
  }, [tab, access]);
  useEffect(() => {
    if (params.get("tab") !== tab) setParams({ tab }, { replace: true });
  }, [tab, params, setParams]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    void import("@/lib/seo").then(({ setPageMeta }) => setPageMeta({
      title: "Dashboard — AVYRON OS", description: "Sistemul operațional intern AVYRON.", path: "/profil", robots: "noindex, nofollow",
    }));
  }, []);

  const openSection = (section: SectionId) => {
    if (canOpenSection(section, access)) setTab(section);
    else if (["security", "automations"].includes(String(section)) && access.isStaff) setTab("os-centers");
  };

  const NavButton = ({ section, mobile = false }: { section: SectionId; mobile?: boolean }) => {
    const Icon = meta[section].icon;
    const active = tab === section;
    return <button type="button" role="tab" aria-selected={active} aria-label={meta[section].label} title={sidebarCollapsed ? meta[section].label : undefined} onClick={() => setTab(section)} className={`${mobile ? "flex min-w-0 flex-1 flex-col" : "w-full flex-row"} group flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition lg:justify-start ${active ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/80 text-white shadow-[0_10px_30px_-16px_rgba(124,58,237,.9)]" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"}`}>
      <Icon className="size-4 shrink-0" strokeWidth={2.1} />
      {mobile ? <span className="max-w-full truncate text-[9px]">{meta[section].label.replace("Prezentare generală", "Acasă")}</span> : !sidebarCollapsed && <span className="truncate">{meta[section].label}</span>}
    </button>;
  };

  const contentFallback = <div className="min-h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]" aria-label="Se încarcă secțiunea" />;

  return <main className="dark min-h-screen bg-[#060a14] text-slate-100 selection:bg-violet-500/35">
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(79,70,229,.15),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(124,58,237,.10),transparent_35%)]" />
    <Tabs value={tab} onValueChange={(value) => setTab(value as SectionId)} className="relative flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#090e1d]/95 px-3 py-4 backdrop-blur-xl transition-[width] duration-200 lg:flex ${sidebarCollapsed ? "w-[76px]" : "w-[248px]"}`}>
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/[0.04]">
            <img src={logo} alt="Avyron" className="size-9 rounded-xl ring-1 ring-white/10" />
            {!sidebarCollapsed && <div className="min-w-0"><p className="font-display text-sm font-bold tracking-[0.08em] text-white">AVYRON <span className="text-violet-300">OS</span></p><p className="text-[9px] text-slate-600">Sistem operațional intern</p></div>}
          </Link>
          {!sidebarCollapsed && <button type="button" onClick={() => setSidebarCollapsed(true)} aria-label="Restrânge meniul" className="rounded-lg p-2 text-slate-600 hover:bg-white/[0.05] hover:text-slate-300"><PanelLeftClose className="size-4" /></button>}
        </div>
        {sidebarCollapsed && <button type="button" onClick={() => setSidebarCollapsed(false)} aria-label="Extinde meniul" className="mx-auto mt-2 rounded-lg p-2 text-slate-600 hover:bg-white/[0.05] hover:text-slate-300"><PanelLeftOpen className="size-4" /></button>}

        <nav className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pb-4" aria-label="Navigare AVYRON OS">
          {groups.map((group) => <div key={group.id}>
            {!sidebarCollapsed && <p className="mb-1.5 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-700">{group.label}</p>}
            <div className="space-y-1">{group.items.map((section) => <NavButton key={section.id} section={section.id} />)}</div>
          </div>)}
          {access.isSuperAdmin && <div className="space-y-1 border-t border-white/[0.06] pt-4">
            <Link to="/intern/ai-projects" title="Proiecte AI" className={`flex items-center rounded-xl px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200 ${sidebarCollapsed ? "justify-center" : "gap-2"}`}><Bot className="size-4" />{!sidebarCollapsed && "Proiecte AI"}</Link>
            <Link to="/intern/avy-engine" title="AVY Engine" className={`flex items-center rounded-xl px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200 ${sidebarCollapsed ? "justify-center" : "gap-2"}`}><Command className="size-4" />{!sidebarCollapsed && "AVY Engine"}</Link>
          </div>}
        </nav>

        <div className="border-t border-white/[0.07] pt-3"><div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-500/15 text-xs font-semibold text-violet-200">{user?.avatar_url ? <img src={user.avatar_url} alt="" className="size-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}</span>{!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-300">{displayName}</p><p className="truncate text-[10px] text-slate-600">{roleLabel}</p></div>}</div></div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080d1b]/85 px-3 py-3 backdrop-blur-xl sm:px-5 lg:px-6"><div className="mx-auto flex max-w-[1500px] items-center gap-3">
          <Link to="/" aria-label="Înapoi la site" data-testid="page-back-link" className="rounded-xl p-2 text-slate-600 hover:bg-white/[0.05] hover:text-slate-300"><ChevronLeft className="size-5" /></Link>
          <button type="button" onClick={() => setCommandOpen(true)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-left text-xs text-slate-600 transition hover:border-violet-400/25 hover:text-slate-400 sm:max-w-xl"><Search className="size-4 shrink-0" /><span className="truncate">Caută clienți, proiecte, leaduri, facturi…</span><kbd className="ml-auto hidden rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd></button>
          {access.isSuperAdmin && <button type="button" onClick={() => setTab("ai-os")} className="hidden items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 sm:inline-flex"><Sparkles className="size-4" /> Întreabă AVY</button>}
          <button type="button" aria-label="Notificări" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"><Bell className="size-4" />{access.isSuperAdmin && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-400" />}</button>
          <button type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} aria-label="Deconectare" title="Deconectare" className="rounded-xl p-2.5 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300"><LogOut className="size-4" /></button>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-slate-500 xl:inline-flex">{isSuperAdmin ? <Lock className="size-3" /> : <ShieldCheck className="size-3" />}{roleLabel}</span>
        </div></header>

        <div className="mx-auto max-w-[1500px] p-3 sm:p-5 lg:p-6">
          {access.isSuperAdmin && (tab === "overview" || tab === "profile") && <Suspense fallback={contentFallback}><div className="mb-4 grid gap-3 lg:grid-cols-2"><AiProductionEntryCard /><EngineEntryCard /></div></Suspense>}
          <Suspense fallback={contentFallback}>
          <TabsContent value="overview" className="mt-0"><AvyronOverview access={access} displayName={displayName} onOpenSection={openSection} onOpenCommand={() => setCommandOpen(true)} /></TabsContent>
          <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent><TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent><TabsContent value="projects" className="mt-0"><CloudflareProjects embedded /></TabsContent>
          {access.isClient && <><TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab /></TabsContent><TabsContent value="invoices" className="mt-0"><InvoicesTab /></TabsContent><TabsContent value="cart" className="mt-0"><CartTab /></TabsContent><TabsContent value="stats" className="mt-0"><StatsTab /></TabsContent><TabsContent value="tickets" className="mt-0"><TicketsTab /></TabsContent></>}
          {access.isStaff && <><TabsContent value="maintenance" className="mt-0"><StaffMaintenanceTab /></TabsContent><TabsContent value="clients" className="mt-0"><StaffClientsTab /></TabsContent><TabsContent value="domains" className="mt-0"><StaffDomainStatsTab /></TabsContent><TabsContent value="media" className="mt-0"><StaffMediaTab /></TabsContent><TabsContent value="leads" className="mt-0"><StaffLeadsTab /></TabsContent><TabsContent value="staff-tickets" className="mt-0"><TicketsTab staffMode /></TabsContent><TabsContent value="demo-requests" className="mt-0"><StaffExampleRequestsTab /></TabsContent><TabsContent value="intern" className="mt-0"><StaffChatTab /></TabsContent><TabsContent value="announcements" className="mt-0"><StaffAnnouncementsTab /></TabsContent><TabsContent value="resources" className="mt-0"><StaffResourcesTab /></TabsContent><TabsContent value="team-staff" className="mt-0"><TeamStaffTab /></TabsContent><TabsContent value="os-centers" className="mt-0"><OsCentersTab /></TabsContent></>}
          {access.isSuperAdmin && <><TabsContent value="payments" className="mt-0"><StaffPaymentsTab /></TabsContent><TabsContent value="finance" className="mt-0"><StaffFinanceTab /></TabsContent><TabsContent value="promotions" className="mt-0"><StaffPromotionsTab /></TabsContent><TabsContent value="ai-os" className="mt-0"><AiOsConsole embedded /></TabsContent></>}
          </Suspense>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.08] bg-[#080d1b]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigare mobilă">
        <NavButton section="overview" mobile /><NavButton section="projects" mobile />{access.isStaff ? <NavButton section="leads" mobile /> : <NavButton section="invoices" mobile />}{access.isSuperAdmin ? <NavButton section="ai-os" mobile /> : <NavButton section="profile" mobile />}{access.isStaff && <NavButton section="os-centers" mobile />}
      </nav>
    </Tabs>
    <Suspense fallback={null}><CommandCenter open={commandOpen} onOpenChange={setCommandOpen} access={access} onNavigate={openSection} /></Suspense>
  </main>;
}
