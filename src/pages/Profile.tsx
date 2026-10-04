import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MfaEnrollBanner from "@/components/dashboard/MfaEnrollBanner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ChevronDown, ChevronLeft, Ellipsis, Lock, LogOut, Menu,
  PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection, defaultSection, sectionsFor, type SectionId } from "@/lib/access";
import logo from "@/assets/avyron-logo.webp";
import { publicSiteHref } from "@/lib/appHost";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DASHBOARD_GROUP_LABELS,
  DASHBOARD_GROUP_ORDER,
  DASHBOARD_SECTION_META,
} from "@/components/dashboard/dashboardNavigation";

const ProfileTab = lazyWithRetry(() => import("@/components/dashboard/ProfileTab").then((m) => ({ default: m.ProfileTab })));
const SubscriptionsTab = lazyWithRetry(() => import("@/components/dashboard/SubscriptionsTab").then((m) => ({ default: m.SubscriptionsTab })));
const StatsTab = lazyWithRetry(() => import("@/components/dashboard/StatsTab").then((m) => ({ default: m.StatsTab })));
const InvoicesTab = lazyWithRetry(() => import("@/components/dashboard/InvoicesTab").then((m) => ({ default: m.InvoicesTab })));
const TicketsTab = lazyWithRetry(() => import("@/components/dashboard/TicketsTab").then((m) => ({ default: m.TicketsTab })));
const StaffClientsTab = lazyWithRetry(() => import("@/components/dashboard/StaffClientsTab").then((m) => ({ default: m.StaffClientsTab })));
const StaffAnnouncementsTab = lazyWithRetry(() => import("@/components/dashboard/StaffAnnouncementsTab").then((m) => ({ default: m.StaffAnnouncementsTab })));
const CloudflareProjects = lazyWithRetry(() => import("@/pages/intern/InternHome"));
const StaffMaintenanceTab = lazyWithRetry(() => import("@/components/dashboard/StaffMaintenanceTab").then((m) => ({ default: m.StaffMaintenanceTab })));
const StaffChatTab = lazyWithRetry(() => import("@/components/dashboard/StaffChatTab").then((m) => ({ default: m.StaffChatTab })));
const StaffResourcesTab = lazyWithRetry(() => import("@/components/dashboard/StaffResourcesTab").then((m) => ({ default: m.StaffResourcesTab })));
const StaffDomainStatsTab = lazyWithRetry(() => import("@/components/dashboard/StaffDomainStatsTab").then((m) => ({ default: m.StaffDomainStatsTab })));
const StaffExampleRequestsTab = lazyWithRetry(() => import("@/components/dashboard/StaffExampleRequestsTab").then((m) => ({ default: m.StaffExampleRequestsTab })));
const SettingsTab = lazyWithRetry(() => import("@/components/dashboard/SettingsTab").then((m) => ({ default: m.SettingsTab })));
const CartTab = lazyWithRetry(() => import("@/components/dashboard/CartTab").then((m) => ({ default: m.CartTab })));
const StaffFinanceTab = lazyWithRetry(() => import("@/components/dashboard/StaffFinanceTab").then((m) => ({ default: m.StaffFinanceTab })));
const StaffMediaTab = lazyWithRetry(() => import("@/components/dashboard/StaffMediaTab").then((m) => ({ default: m.StaffMediaTab })));
const StaffLeadsTab = lazyWithRetry(() => import("@/components/dashboard/StaffLeadsTab").then((m) => ({ default: m.StaffLeadsTab })));
const StaffPromotionsTab = lazyWithRetry(() => import("@/components/dashboard/StaffPromotionsTab").then((m) => ({ default: m.StaffPromotionsTab })));
const AiOsConsole = lazyWithRetry(() => import("@/pages/intern/AiOs"));
const AiProductionEntryCard = lazyWithRetry(() => import("@/components/dashboard/AiProductionEntryCard"));
const EngineEntryCard = lazyWithRetry(() => import("@/components/dashboard/EngineEntryCard"));
const AvyronOverview = lazyWithRetry(() => import("@/components/dashboard/AvyronOverview"));
const TeamStaffTab = lazyWithRetry(() => import("@/components/dashboard/TeamStaffTab"));
const OsCentersTab = lazyWithRetry(() => import("@/components/dashboard/OsCentersTab"));
const CommandCenter = lazyWithRetry(() => import("@/components/dashboard/CommandCenter"));
const ProductCollectionTab = lazyWithRetry(() => import("@/components/dashboard/ProductCollectionTab").then((m) => ({ default: m.ProductCollectionTab })));
const StaffProduseTab = lazyWithRetry(() => import("@/components/dashboard/StaffProduseTab").then((m) => ({ default: m.StaffProduseTab })));
const StaffServicesTab = lazyWithRetry(() => import("@/components/dashboard/StaffServicesTab").then((m) => ({ default: m.StaffServicesTab })));
const StaffNewsletterTab = lazyWithRetry(() => import("@/components/dashboard/StaffNewsletterTab"));
const AiProjects = lazyWithRetry(() => import("@/pages/intern/AiProjects"));
const PlatformLeadTab = lazyWithRetry(() => import("@/components/dashboard/PlatformLeadTab"));
const SurveysTab = lazyWithRetry(() => import("@/components/dashboard/SurveysTab"));
const CommercialCodesTab = lazyWithRetry(() => import("@/components/dashboard/CommercialCodesTab"));
const OtherModulesTab = lazyWithRetry(() => import("@/components/dashboard/OtherModulesTab"));
const NotificationCenter = lazyWithRetry(() => import("@/components/dashboard/NotificationCenter"));
const SocialMediaManagerTab = lazyWithRetry(() => import("@/components/dashboard/SocialMediaManagerTab"));
const StaffSubscriptionsAdminTab = lazyWithRetry(() => import("@/components/dashboard/StaffSubscriptionsAdminTab"));
const ResourceSurfaceTab = lazyWithRetry(() => import("@/components/dashboard/ResourceSurfaceTab"));

export default function Profile() {
  const { user, profile, roles, isSuperAdmin, isStaff, isAdmin, signOut } = useAuth();
  const access = useMemo(() => buildAccess({ roles, email: user?.email, superadmin: isSuperAdmin }), [roles, user?.email, isSuperAdmin]);
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") ?? "";
  const [tab, setTab] = useState<SectionId>(canOpenSection(requested, access) ? requested as SectionId : defaultSection(access));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("avyron-os-open-groups") || "{}") as Record<string, boolean>; }
    catch { return {}; }
  });

  const allowed = useMemo(() => sectionsFor(access), [access]);
  const groups = DASHBOARD_GROUP_ORDER.map((group) => ({ id: group, label: DASHBOARD_GROUP_LABELS[group], items: allowed.filter((section) => section.group === group && section.navigation !== false && !(access.isStaff && section.id === "collection")) })).filter((group) => group.items.length);
  const mobilePrimary = new Set<SectionId>(["overview", "projects", access.isStaff ? "leads" : "invoices", ...(access.isSuperAdmin ? ["ai-os" as SectionId] : [])]);
  const mobileMoreGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((section) => !mobilePrimary.has(section.id)) }))
    .filter((group) => group.items.length);
  const displayName = profile?.display_name || user?.display_name || user?.email?.split("@")[0] || "utilizator";
  const roleLabel = isSuperAdmin ? "Super administrator" : isAdmin ? "Administrator" : isStaff ? "Membru al echipei" : "Client";
  const activeGroup = groups.find((group) => group.items.some((section) => section.id === tab))?.id;

  useEffect(() => {
    if (!canOpenSection(tab, access)) setTab(defaultSection(access));
  }, [tab, access]);
  useEffect(() => {
    if (params.get("tab") !== tab) setParams({ tab }, { replace: true });
  }, [tab, params, setParams]);
  useEffect(() => {
    if (activeGroup && openGroups[activeGroup] === undefined) setOpenGroups((current) => ({ ...current, [activeGroup]: true }));
  }, [activeGroup, openGroups]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("avyron-os-open-groups", JSON.stringify(openGroups)); }, [openGroups]);
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
    if (canOpenSection(section, access)) {
      setTab(section);
      const group = allowed.find((item) => item.id === section)?.group;
      if (group) setOpenGroups((current) => ({ ...current, [group]: true }));
    }
    else if (["security", "automations"].includes(String(section)) && access.isStaff) setTab("os-centers");
    setMobileMenuOpen(false);
  };

  const toggleGroup = (group: string) => setOpenGroups((current) => ({ ...current, [group]: !(current[group] ?? true) }));

  const NavButton = ({ section, mobile = false }: { section: SectionId; mobile?: boolean }) => {
    const sectionMeta = DASHBOARD_SECTION_META[section];
    const Icon = sectionMeta.icon;
    const label = section === "projects" && !access.isStaff ? "Proiectele mele" : sectionMeta.label;
    const active = tab === section;
    return <button type="button" role="tab" aria-selected={active} aria-label={label} title={sidebarCollapsed ? label : undefined} onClick={() => openSection(section)} className={`${mobile ? "flex min-w-0 flex-1 flex-col" : "w-full flex-row"} group flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition lg:justify-start ${active ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/80 text-white shadow-[0_10px_30px_-16px_rgba(124,58,237,.9)]" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"}`}>
      <Icon className="size-4 shrink-0" strokeWidth={2.1} />
      {mobile ? <span className="max-w-full truncate text-[9px]">{sectionMeta.mobileLabel || label}</span> : !sidebarCollapsed && <span className="truncate">{label}</span>}
    </button>;
  };

  const contentFallback = <div className="min-h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]" aria-label="Se încarcă secțiunea" />;

  return <main className="dark min-h-screen bg-[#060a14] text-slate-100 selection:bg-violet-500/35">
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(79,70,229,.15),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(124,58,237,.10),transparent_35%)]" />
    <Tabs value={tab} onValueChange={(value) => setTab(value as SectionId)} className="relative flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#090e1d]/95 px-3 py-4 backdrop-blur-xl transition-[width] duration-200 lg:flex ${sidebarCollapsed ? "w-[76px]" : "w-[248px]"}`}>
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          <a href={publicSiteHref()} className="flex min-w-0 items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/[0.04]">
            <img src={logo} alt="Avyron" className="size-9 rounded-xl ring-1 ring-white/10" />
            {!sidebarCollapsed && <div className="min-w-0"><p className="font-display text-sm font-bold tracking-[0.08em] text-white">AVYRON <span className="text-violet-300">OS</span></p><p className="text-[9px] text-slate-600">Sistem operațional intern</p></div>}
          </a>
          {!sidebarCollapsed && <button type="button" onClick={() => setSidebarCollapsed(true)} aria-label="Restrânge meniul" className="rounded-lg p-2 text-slate-600 hover:bg-white/[0.05] hover:text-slate-300"><PanelLeftClose className="size-4" /></button>}
        </div>
        {sidebarCollapsed && <button type="button" onClick={() => setSidebarCollapsed(false)} aria-label="Extinde meniul" className="mx-auto mt-2 rounded-lg p-2 text-slate-600 hover:bg-white/[0.05] hover:text-slate-300"><PanelLeftOpen className="size-4" /></button>}

        <nav className="avyron-sidebar-scroll mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-1" aria-label="Navigare AVYRON OS">
          {groups.map((group) => {
            const expanded = sidebarCollapsed || (openGroups[group.id] ?? true);
            return <div key={group.id} className="rounded-xl">
              {!sidebarCollapsed && <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={expanded} className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600 transition hover:bg-white/[0.035] hover:text-slate-400"><span>{group.label}</span><ChevronDown className={`size-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} /></button>}
              <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60"}`}><div className="min-h-0 overflow-hidden"><div className="space-y-1">{group.items.map((section) => <NavButton key={section.id} section={section.id} />)}</div></div></div>
            </div>;
          })}
        </nav>

        <div className="border-t border-white/[0.07] pt-3"><div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-500/15 text-xs font-semibold text-violet-200">{user?.avatar_url ? <img src={user.avatar_url} alt="" className="size-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}</span>{!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-300">{displayName}</p><p className="truncate text-[10px] text-slate-600">{roleLabel}</p></div>}</div></div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080d1b]/90 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="mx-auto flex max-w-[1500px] items-center gap-2.5">
            <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Deschide toate secțiunile" className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 lg:hidden"><Menu className="size-5" /></button>
            <a href={publicSiteHref()} aria-label="Înapoi la site" data-testid="page-back-link" className="hidden rounded-xl p-2 text-slate-600 hover:bg-white/[0.05] hover:text-slate-300 lg:inline-flex"><ChevronLeft className="size-5" /></a>
            <button type="button" onClick={() => openSection("overview")} className="mr-auto flex items-center gap-2 lg:hidden" aria-label="Deschide prezentarea generală">
              <img src={logo} alt="" className="size-7 rounded-lg ring-1 ring-white/10" />
              <span className="font-display text-xs font-bold tracking-[0.08em] text-white">AVYRON <span className="text-violet-300">OS</span></span>
            </button>
            <button type="button" onClick={() => setCommandOpen(true)} aria-label="Caută clienți, proiecte, leaduri, facturi" className="rounded-xl p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200 lg:hidden"><Search className="size-4" /></button>
            <button type="button" onClick={() => setCommandOpen(true)} className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-left text-xs text-slate-600 transition hover:border-violet-400/25 hover:text-slate-400 sm:max-w-xl lg:flex"><Search className="size-4 shrink-0" /><span className="truncate">Caută clienți, proiecte, leaduri, facturi…</span><kbd className="ml-auto rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd></button>
            {access.isSuperAdmin && <button type="button" onClick={() => openSection("ai-os")} className="hidden items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 sm:inline-flex"><Sparkles className="size-4" /> Întreabă AVY</button>}
            <Suspense fallback={<span className="size-8" />}><NotificationCenter enabled={access.isSuperAdmin} /></Suspense>
            <button type="button" onClick={() => openSection("profile")} aria-label="Deschide profilul" className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-500/15 text-[10px] font-semibold text-violet-100 ring-1 ring-white/10">{user?.avatar_url ? <img src={user.avatar_url} alt="" className="size-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}</button>
            <button type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} aria-label="Deconectare" title="Deconectare" className="hidden rounded-xl p-2.5 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300 lg:inline-flex"><LogOut className="size-4" /></button>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-slate-500 xl:inline-flex">{isSuperAdmin ? <Lock className="size-3" /> : <ShieldCheck className="size-3" />}{roleLabel}</span>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-3 sm:p-5 lg:p-6">
          <MfaEnrollBanner onOpenSettings={() => openSection("settings")} />
          <Suspense fallback={contentFallback}>
          <TabsContent value="overview" className="mt-0"><AvyronOverview access={access} displayName={displayName} onOpenSection={openSection} onOpenCommand={() => setCommandOpen(true)} /></TabsContent>
          {access.isSuperAdmin && <TabsContent value="social-manager" className="mt-0"><SocialMediaManagerTab /></TabsContent>}
          <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent><TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent><TabsContent value="collection" className="mt-0"><ProductCollectionTab /></TabsContent><TabsContent value="projects" className="mt-0"><CloudflareProjects embedded /></TabsContent>
          {access.isClient && <><TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab /></TabsContent><TabsContent value="invoices" className="mt-0"><InvoicesTab /></TabsContent><TabsContent value="cart" className="mt-0"><CartTab /></TabsContent><TabsContent value="stats" className="mt-0"><StatsTab /></TabsContent><TabsContent value="tickets" className="mt-0"><TicketsTab /></TabsContent></>}
          {access.isStaff && <>
            <TabsContent value="servicii-avyron" className="mt-0"><StaffServicesTab /></TabsContent>
            <TabsContent value="maintenance" className="mt-0"><StaffMaintenanceTab /></TabsContent>
            <TabsContent value="ai-projects" className="mt-0"><AiProjects embedded /></TabsContent>
            <TabsContent value="clients" className="mt-0"><StaffClientsTab /></TabsContent>
            <TabsContent value="domains" className="mt-0"><StaffDomainStatsTab /></TabsContent>
            <TabsContent value="media" className="mt-0"><StaffMediaTab /></TabsContent>
            <TabsContent value="leads" className="mt-0"><StaffLeadsTab /></TabsContent>
            <TabsContent value="staff-tickets" className="mt-0"><TicketsTab staffMode /></TabsContent>
            <TabsContent value="demo-requests" className="mt-0"><StaffExampleRequestsTab /></TabsContent>
            <TabsContent value="intern" className="mt-0"><StaffChatTab /></TabsContent>
            <TabsContent value="announcements" className="mt-0"><StaffAnnouncementsTab /></TabsContent>
            <TabsContent value="resources" className="mt-0"><StaffResourcesTab /></TabsContent>
            <TabsContent value="careers" className="mt-0"><ResourceSurfaceTab kind="career" /></TabsContent>
            <TabsContent value="library" className="mt-0"><ResourceSurfaceTab kind="library" /></TabsContent>
            <TabsContent value="team-staff" className="mt-0"><TeamStaffTab /></TabsContent>
            <TabsContent value="logo-simulations" className="mt-0"><PlatformLeadTab kind="logo" /></TabsContent>
            <TabsContent value="surveys" className="mt-0"><SurveysTab /></TabsContent>
            <TabsContent value="configurator" className="mt-0"><PlatformLeadTab kind="configurator" /></TabsContent>
            <TabsContent value="os-centers" className="mt-0"><OsCentersTab access={access} onNavigate={openSection} /></TabsContent>
            <TabsContent value="other-hub" className="mt-0"><OtherModulesTab onNavigate={openSection} /></TabsContent>
          </>}
          {access.isSuperAdmin && <><TabsContent value="finance" className="mt-0"><StaffFinanceTab /></TabsContent><TabsContent value="commercial-codes" className="mt-0"><CommercialCodesTab /></TabsContent><TabsContent value="promotions" className="mt-0"><StaffPromotionsTab /></TabsContent><TabsContent value="newsletter" className="mt-0"><StaffNewsletterTab /></TabsContent><TabsContent value="produse-avyron" className="mt-0"><StaffProduseTab /></TabsContent><TabsContent value="subscriptions-admin" className="mt-0"><StaffSubscriptionsAdminTab /></TabsContent><TabsContent value="ai-os" className="mt-0"><AiOsConsole embedded /></TabsContent></>}
          </Suspense>
          {access.isSuperAdmin && (tab === "overview" || tab === "profile") && <Suspense fallback={contentFallback}><div className="mt-4 grid gap-3 lg:grid-cols-2"><AiProductionEntryCard /><EngineEntryCard /></div></Suspense>}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.08] bg-[#080d1b]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigare mobilă">
        <NavButton section="overview" mobile />
        {access.isStaff ? <NavButton section="leads" mobile /> : <NavButton section="invoices" mobile />}
        <button type="button" aria-label="Deschide AVY" aria-pressed={tab === "ai-os"} onClick={() => access.isSuperAdmin ? openSection("ai-os") : setCommandOpen(true)} className="group -mt-5 flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-medium text-violet-100">
          <span className="grid size-12 place-items-center rounded-full border border-violet-300/30 bg-gradient-to-br from-violet-500 to-indigo-700 shadow-[0_0_28px_rgba(124,58,237,.55)] ring-4 ring-[#080d1b]"><Sparkles className="size-5" /></span>
          <span>AVY</span>
        </button>
        <NavButton section="projects" mobile />
        <button type="button" aria-label="Deschide mai multe secțiuni" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className={`group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[9px] font-medium transition ${mobilePrimary.has(tab) ? "text-slate-500" : "bg-gradient-to-r from-violet-600/90 to-indigo-600/80 text-white"}`}><Ellipsis className="size-4" /><span>Mai multe</span></button>
      </nav>
    </Tabs>
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="dark w-[88vw] max-w-sm overflow-y-auto border-white/[0.08] bg-[#090e1d] p-0 text-slate-100">
        <SheetHeader className="border-b border-white/[0.07] p-5 text-left">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="size-10 rounded-xl ring-1 ring-white/10" />
            <div><SheetTitle className="font-display text-base text-white">AVYRON <span className="text-violet-300">OS</span></SheetTitle><SheetDescription className="text-xs text-slate-500">Toate funcțiile autorizate, într-un singur loc.</SheetDescription></div>
          </div>
        </SheetHeader>
        <nav className="space-y-5 p-4 pb-28" aria-label="Toate secțiunile AVYRON OS">
          {mobileMoreGroups.map((group) => <section key={group.id}>
            <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={openGroups[group.id] ?? true} className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 hover:bg-white/[0.04]"><span>{group.label}</span><ChevronDown className={`size-3 transition-transform ${(openGroups[group.id] ?? true) ? "rotate-180" : ""}`} /></button>
            <div className={`${(openGroups[group.id] ?? true) ? "grid" : "hidden"} grid-cols-2 gap-2`}>
              {group.items.map((section) => {
                const sectionMeta = DASHBOARD_SECTION_META[section.id];
                const Icon = sectionMeta.icon;
                const active = tab === section.id;
                return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-current={active ? "page" : undefined} className={`flex min-h-20 flex-col items-start justify-between rounded-xl border p-3 text-left transition ${active ? "border-violet-400/35 bg-violet-500/15 text-white" : "border-white/[0.07] bg-white/[0.025] text-slate-300 hover:border-violet-400/25"}`}><Icon className="size-4 text-violet-300" /><span className="mt-3 text-xs font-medium leading-tight">{sectionMeta.label}</span></button>;
              })}
            </div>
          </section>)}
          <button type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-4 py-3 text-xs font-semibold text-rose-200"><LogOut className="size-4" /> Deconectare</button>
        </nav>
      </SheetContent>
    </Sheet>
    <Suspense fallback={null}><CommandCenter open={commandOpen} onOpenChange={setCommandOpen} access={access} onNavigate={openSection} /></Suspense>
  </main>;
}
