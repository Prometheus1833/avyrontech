import {useAccountCart} from "@/hooks/useAccountCart";
import {clientSectionDestination} from "@/lib/clientPortalNavigation";
import IconHint from "@/components/ui/icon-hint";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import ActivityBadge from "@/components/dashboard/ActivityBadge";
import { useDashboardActivity } from "@/hooks/useDashboardActivity";
import StaffWorkspaceActions from "@/components/site/StaffWorkspaceActions";
import { capabilityRank, staffRankLabel } from "@/shared/staffAccess";
import logo from "@/assets/avyron-logo.webp";
import {
dashboardSectionMeta,dashboardGroupLabel,
DASHBOARD_GROUP_ORDER,
DASHBOARD_SECTION_META,
} from "@/components/dashboard/dashboardNavigation";
import MfaEnrollBanner from "@/components/dashboard/MfaEnrollBanner";
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from "@/components/ui/sheet";
import { Tabs,TabsContent } from "@/components/ui/tabs";
import { flushDocumentEditors } from "@/features/documents/navigation";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess,canOpenSection,defaultSection,sectionsFor,type SectionId } from "@/lib/access";
import { publicSiteHref } from "@/lib/appHost";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { flushServicePageEdits } from "@/lib/servicePageNavigation";
import { SERVICE_PAGES } from "@/shared/servicePagePolicy";
import {
ChevronDown,ChevronLeft,Ellipsis,Lock,LogOut,Menu,
MessagesSquare,
PanelLeftClose,PanelLeftOpen,Search,ShieldCheck,Sparkles,
Wrench,
} from "lucide-react";
import { Suspense,useEffect,useMemo,useState,useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

const UserMenu = lazyWithRetry(() => import("@/components/auth/UserMenu"));
const InternalSubscriptionsTab = lazyWithRetry(() => import("@/components/dashboard/subscriptions/InternalSubscriptionsTab"));
const ProfileTab = lazyWithRetry(() => import("@/components/dashboard/ProfileTab").then((m) => ({ default: m.ProfileTab })));
const SubscriptionsTab = lazyWithRetry(() => import("@/components/dashboard/ClientRecurringTab"));
const StatsTab = lazyWithRetry(() => import("@/components/dashboard/StatsTab").then((m) => ({ default: m.StatsTab })));
const ClientBillingTab=lazyWithRetry(()=>import("@/components/dashboard/ClientBillingTab"));
const ClientSupportTab=lazyWithRetry(()=>import("@/components/dashboard/ClientSupportTab"));
const InvoicesTab = lazyWithRetry(() => import("@/components/dashboard/InvoicesTab").then((m) => ({ default: m.InvoicesTab })));
const TicketsTab = lazyWithRetry(() => import("@/components/dashboard/TicketsTab").then((m) => ({ default: m.TicketsTab })));
const StaffClientsTab = lazyWithRetry(() => import("@/components/dashboard/StaffClientsTab").then((m) => ({ default: m.StaffClientsTab })));
const StaffReviewsTab = lazyWithRetry(() => import("@/components/dashboard/StaffReviewsTab"));
const StaffAnnouncementsTab = lazyWithRetry(() => import("@/components/dashboard/StaffAnnouncementsTab").then((m) => ({ default: m.StaffAnnouncementsTab })));
const CloudflareProjects = lazyWithRetry(() => import("@/pages/intern/InternHome"));
const ClientMaintenanceTab = lazyWithRetry(() => import("@/components/dashboard/ClientMaintenanceTab"));
const StaffMaintenanceTab = lazyWithRetry(() => import("@/components/dashboard/StaffMaintenanceTab").then((m) => ({ default: m.StaffMaintenanceTab })));
const StaffChatTab = lazyWithRetry(() => import("@/components/dashboard/StaffChatTab").then((m) => ({ default: m.StaffChatTab })));
const DocumentCenter = lazyWithRetry(() => import("@/features/documents/DocumentCenter"));
const StaffDomainStatsTab = lazyWithRetry(() => import("@/components/dashboard/StaffDomainStatsTab").then((m) => ({ default: m.StaffDomainStatsTab })));
const StaffExampleRequestsTab = lazyWithRetry(() => import("@/components/dashboard/StaffExampleRequestsTab").then((m) => ({ default: m.StaffExampleRequestsTab })));
const SettingsTab = lazyWithRetry(() => import("@/components/dashboard/SettingsTab").then((m) => ({ default: m.SettingsTab })));
const CartTab = lazyWithRetry(() => import("@/components/dashboard/CartTab").then((m) => ({ default: m.CartTab })));
const StaffFinanceTab = lazyWithRetry(() => import("@/components/dashboard/StaffFinanceTab").then((m) => ({ default: m.StaffFinanceTab })));
const StaffMediaTab = lazyWithRetry(() => import("@/components/dashboard/StaffMediaTab").then((m) => ({ default: m.StaffMediaTab })));
const StaffLeadsTab = lazyWithRetry(() => import("@/components/dashboard/StaffLeadsTab").then((m) => ({ default: m.StaffLeadsTab })));
const StaffPromotionsTab = lazyWithRetry(() => import("@/components/dashboard/StaffPromotionsTab").then((m) => ({ default: m.StaffPromotionsTab })));
const AvyChatbotTab = lazyWithRetry(() => import("@/components/dashboard/AvyChatbotTab"));
const AiProductionEntryCard = lazyWithRetry(() => import("@/components/dashboard/AiProductionEntryCard"));
const AvyEngine = lazyWithRetry(() => import("@/pages/intern/AvyEngine"));
const CollaboratorsTab = lazyWithRetry(() => import("@/components/dashboard/collaborators/CollaboratorsTab"));
const AvySkillsTab = lazyWithRetry(() => import("@/components/dashboard/skills/AvySkillsTab"));
const AntivirusTab = lazyWithRetry(() => import("@/components/dashboard/AntivirusTab"));
const AvyronOverview = lazyWithRetry(() => import("@/components/dashboard/AvyronOverview"));
const CustomerHomeTab = lazyWithRetry(() => import("@/components/dashboard/CustomerHomeTab").then((m) => ({ default: m.CustomerHomeTab })));
const CustomerCatalogTab = lazyWithRetry(() => import("@/components/dashboard/CustomerCatalogTab").then((m) => ({ default: m.CustomerCatalogTab })));
const OrdersTab = lazyWithRetry(() => import("@/components/dashboard/OrdersTab").then((m) => ({ default: m.OrdersTab })));
const TeamStaffTab = lazyWithRetry(() => import("@/components/dashboard/TeamStaffTab"));
const OsCentersTab = lazyWithRetry(() => import("@/components/dashboard/OsCentersTab"));
const ProductCollectionTab = lazyWithRetry(() => import("@/components/dashboard/ProductCollectionTab").then((m) => ({ default: m.ProductCollectionTab })));
const StaffProduseTab = lazyWithRetry(() => import("@/components/dashboard/StaffProduseTab").then((m) => ({ default: m.StaffProduseTab })));
const StaffServicesTab = lazyWithRetry(() => import("@/components/dashboard/StaffServicesTab").then((m) => ({ default: m.StaffServicesTab })));
const StaffNewsletterTab = lazyWithRetry(() => import("@/components/dashboard/StaffNewsletterTab"));
const AiProjects = lazyWithRetry(() => import("@/pages/intern/AiProjects"));
const LogoOperationsTab = lazyWithRetry(() => import("@/components/dashboard/LogoOperationsTab"));
const PlatformLeadTab = lazyWithRetry(() => import("@/components/dashboard/PlatformLeadTab"));
const SurveysTab = lazyWithRetry(() => import("@/components/dashboard/SurveysTab"));
const CommercialCodesTab = lazyWithRetry(() => import("@/components/dashboard/CommercialCodesTab"));
const OtherModulesTab = lazyWithRetry(() => import("@/components/dashboard/OtherModulesTab"));
const ExampleCarouselsTab = lazyWithRetry(() => import("@/components/dashboard/ExampleCarouselsTab"));
const NotificationCenter = lazyWithRetry(() => import("@/components/dashboard/NotificationCenter"));
const SocialMediaManagerTab = lazyWithRetry(() => import("@/components/dashboard/SocialMediaManagerTab"));
const StaffSubscriptionsAdminTab = lazyWithRetry(() => import("@/components/dashboard/StaffSubscriptionsAdminTab"));
const ResourceSurfaceTab = lazyWithRetry(() => import("@/components/dashboard/ResourceSurfaceTab"));

export default function Profile() {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><ProfileDashboard /></QueryClientProvider>;
}

function ProfileDashboard() {
  const { user, profile, roles, capabilities,
    platformRole, hasCollaborations,
    isSuperAdmin, isStaff, isAdmin, signOut } = useAuth();
  const access = useMemo(() => buildAccess({ roles, capabilities, email: user?.email, superadmin: isSuperAdmin,hasCollaborations }), [roles, capabilities, user?.email, isSuperAdmin,hasCollaborations]);
  const {items:cartItems}=useAccountCart();
  const activityCounts = useDashboardActivity(user?.id, access.isStaff, `${platformRole||""}:${[...capabilities].sort().join(",")}`);
  const [params, setParams] = useSearchParams();
  const legacyMaintenance = !access.isClient && params.get("tab") === "maintenance" && (!access.isSuperAdmin || (params.has("project") && params.get("core") !== "system"));
  const clientTarget=access.isClient?clientSectionDestination(params.get("tab")||""):null;
  useEffect(()=>{const target=access.isClient?clientSectionDestination(params.get("tab")||""):null;if(target){const next=new URLSearchParams(params);next.set("tab",target.section);for(const [key,value] of Object.entries(target.params))next.set(key,value);setParams(next,{replace:true});}},[access.isClient,params,setParams]);
  const requested = clientTarget?clientTarget.section:legacyMaintenance ? "client-maintenance" : params.get("tab") === "workflows" ? "projects" : params.get("tab") === "platform-control" ? "os-centers" : (params.get("tab") ?? "");
  const [tab, setTab] = useState<SectionId>(canOpenSection(requested, access) ? (requested as SectionId)
      : defaultSection(access));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [servicesExpanded,setServicesExpanded]=useState(requested==="servicii-avyron");
  const [commandOpen, setCommandOpen] = useState(false);
  const searchInput=useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("avyron-os-open-groups") || "{}") as Record<string, boolean>; }
    catch { return {}; }
  });

  const allowed = useMemo(() => sectionsFor(access), [access]);
  const groups = DASHBOARD_GROUP_ORDER.map((group) => ({ id: group, label: dashboardGroupLabel(group,access.isClient), items: allowed.filter((section) => section.group === group && section.navigation !== false && !(access.isStaff && section.id === "collection") && (access.isStaff || !["stats"].includes(section.id))) })).filter((group) => group.items.length);
  const mobilePrimary = new Set<SectionId>(access.isStaff ? ["overview", "projects", "leads", ...(access.isSuperAdmin ? ["ai-os" as SectionId] : ["client-maintenance" as SectionId])] : ["overview", "catalog", "cart", "collection"]);
  const mobileMoreGroups = access.isClient?groups:groups
    .map((group) => ({ ...group, items: group.items.filter((section) => !mobilePrimary.has(section.id)) }))
    .filter((group) => group.items.length);
  const displayName = profile?.display_name || user?.display_name || user?.email?.split("@")[0] || "utilizator";
  const currentRank = capabilityRank(capabilities, platformRole);
  const roleLabel = currentRank
    ? staffRankLabel(currentRank)
    : isSuperAdmin ? "Super administrator" : isAdmin ? "Administrator" : isStaff ? "Membru al echipei" : "Client";
  const activeGroup = groups.find((group) => group.items.some((section) => section.id === tab))?.id;

  useEffect(() => {
    if (!canOpenSection(tab, access)) setTab(defaultSection(access));
  }, [tab, access]);
  useEffect(() => {
    if (canOpenSection(requested, access)) setTab((current) => current === requested ? current : (requested as SectionId),
      );
  }, [requested, access]);
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
      title: access.isClient ? "Contul meu — AVYRON" : "Dashboard — AVYRON OS", description: access.isClient ? "Servicii, comenzi și documentele contului AVYRON." : "Sistemul operațional intern AVYRON.", path: "/profil", robots: "noindex, nofollow",
    }));
  }, [access.isClient]);

  const openSection = async (section: SectionId,extraParams?:Record<string,string>) => {
    if(!(await flushDocumentEditors()) || !(await flushServicePageEdits()))return;
    const clientTarget=access.isClient?clientSectionDestination(section):null;
    const canonical=clientTarget?.section||section;
    const destination = canOpenSection(canonical, access) ? canonical : ["security", "automations"].includes(String(section)) && access.isStaff ? "os-centers" : null;
    if (destination) {
      setTab(destination);
      const next = new URLSearchParams(params);
      next.set("tab", destination);
      if(destination!=="subscriptions")next.delete("recurringView");if(destination!=="tickets")next.delete("supportView");if(destination!=="payments")next.delete("billingView");if(clientTarget)for(const [key,value] of Object.entries(clientTarget.params))next.set(key,value);
      next.delete("core");
      if (destination === "maintenance") next.delete("project");
      if(destination!=="documents")for(const key of ["documentView","documentTemplate","template","document","version"])next.delete(key);
      if(destination!=="servicii-avyron"){next.delete("service");next.delete("serviceGroup");}
      if(extraParams)for(const [key,value] of Object.entries(extraParams)){if(value)next.set(key,value);else next.delete(key);}
      if (destination !== "example-carousels") next.delete("carousel");
      if (destination !== "intern") {next.delete("dm");next.delete("chatProject");}
      if (destination !== "projects") next.delete("scope");
      setParams(next, { replace: false });
      const group = allowed.find((item) => item.id === destination)?.group;
      if (group) setOpenGroups((current) => ({ ...current, [group]: true }));
    }
    setMobileMenuOpen(false);
  };

  const toggleGroup = (group: string) => setOpenGroups((current) => ({ ...current, [group]: !(current[group] ?? true) }));

  const NavButton = ({ section, mobile = false }: { section: SectionId; mobile?: boolean;
  }) => {
    if (!canOpenSection(section, access)) return null;
    const sectionMeta = dashboardSectionMeta(section,access.isClient);
    const Icon = sectionMeta.icon;
    const label = section === "projects" && !access.isStaff ? "Proiectele mele" : section === "intern" && !access.isStaff ? "Mesaje proiecte" : sectionMeta.label;
    const active = tab === section;
    const count=section==="cart"&&access.isClient?cartItems.length:section==="tickets"&&access.isClient?(activityCounts.tickets||0)+(activityCounts.intern||0):activityCounts[section];
    const countLabel=section==="cart"&&access.isClient?(count===1?"produs în coș":"produse în coș"):"activități de văzut";
    return (
      <><button type="button" data-os-section={section} aria-current={active?"page":undefined} aria-label={`${label}${count ? `, ${count} ${countLabel}` : ""}`} title={sidebarCollapsed ? label : undefined} aria-expanded={section==="servicii-avyron"?servicesExpanded:undefined} onClick={() => {if(section==="servicii-avyron"){setServicesExpanded((current) =>tab===section?!current:true);if(tab!==section)void openSection(section);}else void openSection(section);}} className={`${mobile ? "flex min-w-0 flex-1 flex-col" : "w-full flex-row"} group flex items-center justify-center gap-1.5 rounded-xl ${mobile && access.isClient ? "px-0" : "px-3"} py-2.5 text-left text-xs font-medium transition lg:justify-start ${active ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/80 text-white shadow-[0_10px_30px_-16px_rgba(124,58,237,.9)]" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"}`}>
      <span className={`relative inline-flex shrink-0 ${count ? "mr-1.5" : ""}`}><Icon className="size-4 shrink-0" strokeWidth={2.1} /><ActivityBadge count={count} label={section === "intern" || section === "announcements" ? "necitite" : countLabel} /></span>
      {mobile ? (
            <span className="max-w-full truncate text-[9px]">{sectionMeta.mobileLabel || label}</span>
          ) : (
            !sidebarCollapsed && <span className="truncate">{label}</span>
          )}
    {section==="servicii-avyron"&&!sidebarCollapsed&& (
            <ChevronDown className={`ml-auto size-3 ${servicesExpanded?"rotate-180":""}`}/>
          )}
    </button>{section==="servicii-avyron"&&servicesExpanded&&!sidebarCollapsed&&!mobile&& (
            <nav aria-label="Mini-listă servicii" className="ml-3 mt-1 space-y-1 border-l border-white/10 pl-2">{SERVICE_PAGES.map((page) => (
                <button key={page.key} type="button" aria-current={tab===section&&(page.key==="overview"?!params.get("service"):params.get("service")===page.key)?"page":undefined} onClick={()=>void openSection(section,{service:page.key==="overview"?"":page.key,serviceGroup:""})} className="block min-h-9 w-full rounded-lg px-2 py-2 text-left text-[11px] leading-relaxed text-slate-400 hover:bg-white/5 hover:text-white aria-[current=page]:bg-violet-500/10 aria-[current=page]:text-violet-200">{page.name}</button>))}</nav>
          )}</>
    );
  };

  const contentFallback = (
    <div className="min-h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]" aria-label="Se încarcă secțiunea" />
  );

  return (
    <main data-avyron-os className="dark min-h-screen bg-[#060a14] text-slate-100 selection:bg-violet-500/35">
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(79,70,229,.15),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(124,58,237,.10),transparent_35%)]" />
    <Tabs value={tab} onValueChange={(value) => openSection(value as SectionId)} className="relative flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#090e1d]/95 px-3 py-4 backdrop-blur-xl transition-[width] duration-200 lg:flex ${sidebarCollapsed ? "w-[76px]" : "w-[248px]"}`}>
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          <a href={publicSiteHref()} className="flex min-w-0 items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/[0.04]">
            <img src={logo} alt="Avyron" className="size-9 rounded-xl ring-1 ring-white/10" />
            {!sidebarCollapsed && (
                <div className="min-w-0"><p className="font-display text-sm font-bold tracking-[0.04em] text-white">{access.isClient?"Avyron Tech":<>AVYRON <span className="text-violet-300">OS</span></>}</p><p className={access.isClient?"mt-1 text-[11px] leading-4 text-slate-400":"text-[9px] text-slate-400"}>{access.isClient?"Serviciile, produsele și anexele într-un singur loc":"Sistem operațional intern"}</p></div>
              )}
          </a>
          {!sidebarCollapsed && (
              <button type="button" onClick={() => setSidebarCollapsed(true)} aria-label="Restrânge meniul" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-300"><PanelLeftClose className="size-4" /></button>
            )}
        </div>
        {sidebarCollapsed && (
            <button type="button" onClick={() => setSidebarCollapsed(false)} aria-label="Extinde meniul" className="mx-auto mt-2 rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-300"><PanelLeftOpen className="size-4" /></button>
          )}

        <nav className="avyron-sidebar-scroll mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-1" aria-label={access.isClient?"Navigare cont":"Navigare AVYRON OS"}>
          <div aria-label={access.isClient?"Secțiunile contului":"Secțiuni AVYRON OS"} onKeyDown={event=>{if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const targets=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-os-section]')).filter(el=>el.offsetParent!==null);if(!targets.length)return;const index=targets.indexOf(document.activeElement as HTMLButtonElement);const next=event.key==='Home'?0:event.key==='End'?targets.length-1:(index+(event.key==='ArrowDown'||event.key==='ArrowRight'?1:-1)+targets.length)%targets.length;event.preventDefault();targets[next].focus()}}>
          {groups.map((group) => {
            const expanded = sidebarCollapsed || (openGroups[group.id] ?? true);
            return (
                <div key={group.id} className="rounded-xl">
              {!sidebarCollapsed && (
                    <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={expanded} className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 transition hover:bg-white/[0.035] hover:text-slate-400"><span>{group.label}</span><ChevronDown className={`size-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} /></button>
                  )}
              <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60"}`}><div className="min-h-0 overflow-hidden"><div className="space-y-1">{expanded && group.items.map((section) => (
                            <NavButton key={section.id} section={section.id} />))}</div></div></div>
            </div>
              );
          })}
          </div>
        </nav>

        <div className="border-t border-white/[0.07] pt-3"><div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-500/15 text-xs font-semibold text-violet-200">{user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}</span>{!sidebarCollapsed && (
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-300">{displayName}</p><p className="truncate text-[10px] text-slate-400">{roleLabel}</p></div>
              )}</div></div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080d1b]/90 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2.5 lg:flex-nowrap">
            {access.isClient ? <>
              <div className="order-1 flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
                <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Deschide toate secțiunile" className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white/5 lg:hidden"><Menu className="size-5" /></button>
                <a href={publicSiteHref()} aria-label="Avyron Web — Acasă" data-testid="page-back-link" className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-white hover:text-violet-200"><img src={logo} alt="" className="size-7 rounded-lg" /><span>Avyron Web</span></a>
              </div>
              <div className="order-5 flex basis-full items-center gap-2 lg:order-2 lg:basis-auto lg:flex-1">
                <button type="button" onClick={() => void openSection("overview")} aria-label="Deschide Avy Cont" aria-current={tab === "overview" ? "page" : undefined} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 text-xs font-semibold text-violet-100 hover:bg-violet-500/20">Avy Cont</button>
                <DashboardSearch access={access} userId={user?.id||""} current={tab} open={commandOpen} onOpenChange={setCommandOpen} onNavigate={openSection} inputRef={searchInput}/>
              </div>
            </> : <>            <IconHint label={"Toate secțiunile AVYRON OS"}><button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Deschide toate secțiunile" className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 lg:hidden"><Menu className="size-5" /></button></IconHint>
            <IconHint label="Înapoi la site-ul public"><a href={publicSiteHref()} aria-label="Înapoi la site" data-testid="page-back-link" className="hidden rounded-xl p-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-300 lg:inline-flex"><ChevronLeft className="size-5" /></a></IconHint>
            <IconHint label="Prezentare generală"><button type="button" onClick={() => openSection("overview")} className="mr-auto flex items-center gap-2 lg:hidden" aria-label="Deschide prezentarea generală">
              <img src={logo} alt="" className="size-7 rounded-lg ring-1 ring-white/10" />
              <span className="hidden font-display text-xs font-bold tracking-[0.08em] text-white">AVYRON {" "}
                  <span className="text-violet-300">{access.isClient ? "CONT" : "OS"}</span></span>
            </button></IconHint>

              <DashboardSearch access={access} userId={user?.id||""} current={tab} open={commandOpen} onOpenChange={setCommandOpen} onNavigate={openSection} inputRef={searchInput}/>
            </>}
            {access.isStaff&&<StaffWorkspaceActions counts={activityCounts} compact className="staff-dashboard-actions-desktop"/>}
            <div className={access.isClient ? "order-3 shrink-0" : "contents"}><Suspense fallback={<span className="size-10" />}><NotificationCenter access={access} onNavigate={openSection} autoOpen={params.get("notifications") === "1"} /></Suspense></div>
            {access.isClient ? <div className="order-4 shrink-0"><Suspense fallback={<span className="size-10" />}><UserMenu /></Suspense></div> : <IconHint label="Profilul și datele contului"><button type="button" onClick={() => openSection("profile")} aria-label="Deschide profilul" className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-violet-500/15 text-[10px] font-semibold text-violet-100 ring-1 ring-white/10">{user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}</button></IconHint>}
            <IconHint label="Deconectare din cont"><button type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} aria-label="Deconectare" title="Deconectare" className={`${access.isClient ? "order-5" : ""} hidden rounded-xl p-2.5 text-slate-400 hover:bg-rose-400/10 hover:text-rose-300 lg:inline-flex`}><LogOut className="size-4" /></button></IconHint>
            <span className="order-6 hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-slate-500 xl:inline-flex">{isSuperAdmin ? (
                  <Lock className="size-3" />
                ) : (
                  <ShieldCheck className="size-3" />
                )}{roleLabel}</span>
          </div>
          {access.isStaff&&<StaffWorkspaceActions counts={activityCounts} compact className="staff-dashboard-actions-mobile"/>}
        </header>

        <div className="mx-auto max-w-[1500px] p-3 sm:p-5 lg:p-6">
          <MfaEnrollBanner onOpenSettings={() => openSection("settings")} />
          <Suspense fallback={contentFallback}>
          <TabsContent value="overview" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["overview"].label} className="mt-0">{access.isClient ? (
                  <CustomerHomeTab displayName={displayName} onOpenSection={openSection} />
                ) : (
                  <AvyronOverview access={access} displayName={displayName} onOpenSection={openSection} onOpenCommand={() => setCommandOpen(true)} />
                )}</TabsContent>
          {canOpenSection("client-maintenance", access) && <TabsContent value="client-maintenance" role="region" aria-label="Mentenanță Clienți" className="mt-0"><ClientMaintenanceTab /></TabsContent>}
          {canOpenSection("maintenance", access) && (
                <TabsContent value="maintenance" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["maintenance"].label} className="mt-0"><StaffMaintenanceTab /></TabsContent>
              )}
          {canOpenSection("social-manager", access) && (
                <TabsContent value="social-manager" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["social-manager"].label} className="mt-0"><SocialMediaManagerTab /></TabsContent>
              )}
          <TabsContent value="profile" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["profile"].label} className="mt-0"><ProfileTab /></TabsContent><TabsContent value="settings" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["settings"].label} className="mt-0"><SettingsTab /></TabsContent><TabsContent value="collection" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["collection"].label} className="mt-0"><ProductCollectionTab key={user?.id} /></TabsContent><TabsContent value="projects" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["projects"].label} className="mt-0"><CloudflareProjects embedded /></TabsContent>
          {access.isClient && (
                <><TabsContent value="catalog" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["catalog"].label} className="mt-0"><CustomerCatalogTab /></TabsContent><TabsContent value="orders" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["orders"].label} className="mt-0"><OrdersTab /></TabsContent><TabsContent value="subscriptions" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["subscriptions"].label} className="mt-0"><SubscriptionsTab /></TabsContent><TabsContent value="payments" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["payments"].label} className="mt-0"><ClientBillingTab /></TabsContent><TabsContent value="invoices" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["invoices"].label} className="mt-0"><InvoicesTab /></TabsContent><TabsContent value="cart" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["cart"].label} className="mt-0"><CartTab /></TabsContent><TabsContent value="stats" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["stats"].label} className="mt-0"><StatsTab /></TabsContent><TabsContent value="tickets" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["tickets"].label} className="mt-0"><ClientSupportTab /></TabsContent></>
              )}
            {canOpenSection("my-collaborations",access)&&<TabsContent value="my-collaborations" role="region" aria-label="Colaborările mele" className="mt-0"><CollaboratorsTab portal /></TabsContent>}
          {canOpenSection("intern",access)&&<TabsContent value="intern" role="region" aria-label="Mesaje"><StaffChatTab /></TabsContent>}
          <TabsContent value="documents" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["documents"].label} className="mt-0"><DocumentCenter /></TabsContent>
          {canOpenSection("skill-site-builder",access)&&<TabsContent value="skill-site-builder" role="region" aria-label="Site Builder" className="mt-0"><AvySkillsTab slug="site-builder"/></TabsContent>}
          {canOpenSection("skill-logo-engine",access)&&<TabsContent value="skill-logo-engine" role="region" aria-label="Logo Engine" className="mt-0"><AvySkillsTab slug="logo-engine"/></TabsContent>}
          {canOpenSection("skill-media-generate",access)&&<TabsContent value="skill-media-generate" role="region" aria-label="Media Generate" className="mt-0"><AvySkillsTab slug="media-generate"/></TabsContent>}
          {canOpenSection("ai-projects", access) && (
                <TabsContent value="ai-projects" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["ai-projects"].label} className="mt-0"><AiProjects embedded /></TabsContent>
              )}
          {canOpenSection("leads", access) && (
                <TabsContent value="leads" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["leads"].label} className="mt-0"><StaffLeadsTab /></TabsContent>
              )}
          {access.isStaff && (
                <>
            <TabsContent value="servicii-avyron" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["servicii-avyron"].label} className="mt-0"><StaffServicesTab /></TabsContent>

            <TabsContent value="clients" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["clients"].label} className="mt-0"><StaffClientsTab /></TabsContent>
            {access.isAdmin && (
                    <TabsContent value="reviews" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["reviews"].label} className="mt-0"><StaffReviewsTab /></TabsContent>
                  )}
            <TabsContent value="domains" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["domains"].label} className="mt-0"><StaffDomainStatsTab /></TabsContent>
            <TabsContent value="media" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["media"].label} className="mt-0"><StaffMediaTab /></TabsContent>
            <TabsContent value="staff-tickets" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["staff-tickets"].label} className="mt-0"><TicketsTab staffMode /></TabsContent>
            <TabsContent value="demo-requests" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["demo-requests"].label} className="mt-0"><StaffExampleRequestsTab /></TabsContent>

            <TabsContent value="announcements" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["announcements"].label} className="mt-0"><StaffAnnouncementsTab /></TabsContent>
            <TabsContent value="resources" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["resources"].label} className="mt-0"><DocumentCenter initialView="staff" /></TabsContent>
            {canOpenSection("collaborators",access)&&<TabsContent value="collaborators" role="region" aria-label="Colaboratori și parteneri" className="mt-0"><CollaboratorsTab /></TabsContent>}
            {canOpenSection("antivirus", access) && <TabsContent value="antivirus" role="region" aria-label="Antivirus" className="mt-0"><AntivirusTab /></TabsContent>}
            {canOpenSection("example-carousels", access) && <TabsContent value="example-carousels" role="region" aria-label="Carusele Exemple" className="mt-0"><ExampleCarouselsTab /></TabsContent>}
            <TabsContent value="careers" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["careers"].label} className="mt-0"><ResourceSurfaceTab kind="career" /></TabsContent>
            <TabsContent value="library" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["library"].label} className="mt-0"><ResourceSurfaceTab kind="library" /></TabsContent>
            <TabsContent value="team-staff" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["team-staff"].label} className="mt-0"><TeamStaffTab /></TabsContent>
            <TabsContent value="logo-2d-simulations" role="region" aria-label="Simulări Logo 2D" className="mt-0"><LogoOperationsTab mode="2d" /></TabsContent>
            <TabsContent value="logo-simulations" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["logo-simulations"].label} className="mt-0"><LogoOperationsTab mode="3d" /></TabsContent>
            <TabsContent value="surveys" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["surveys"].label} className="mt-0"><SurveysTab /></TabsContent>
            <TabsContent value="configurator" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["configurator"].label} className="mt-0"><PlatformLeadTab kind="configurator" /></TabsContent>
            <TabsContent value="os-centers" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["os-centers"].label} className="mt-0"><OsCentersTab access={access} onNavigate={openSection} /></TabsContent>
            <TabsContent value="other-hub" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["other-hub"].label} className="mt-0"><OtherModulesTab onNavigate={openSection} /></TabsContent>
          </>
              )}
              {canOpenSection("finance", access) && (
                <TabsContent value="finance" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["finance"].label} className="mt-0">
                  <StaffFinanceTab />
                </TabsContent>
              )}
              {canOpenSection("newsletter", access) && (
                <TabsContent value="newsletter" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["newsletter"].label} className="mt-0">
                  <StaffNewsletterTab />
                </TabsContent>
              )}
          {access.isStaff && (
                <TabsContent value="internal-subscriptions" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["internal-subscriptions"].label} className="mt-0"><InternalSubscriptionsTab /></TabsContent>
              )}
          {access.isSuperAdmin && (
                <><TabsContent value="avy-engine" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["avy-engine"].label} className="mt-0"><AvyEngine embedded /></TabsContent><TabsContent value="commercial-codes" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["commercial-codes"].label} className="mt-0"><CommercialCodesTab /></TabsContent><TabsContent value="promotions" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["promotions"].label} className="mt-0"><StaffPromotionsTab /></TabsContent><TabsContent value="produse-avyron" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["produse-avyron"].label} className="mt-0"><StaffProduseTab /></TabsContent><TabsContent value="subscriptions-admin" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["subscriptions-admin"].label} className="mt-0"><StaffSubscriptionsAdminTab /></TabsContent><TabsContent value="ai-os" role="region" aria-labelledby={undefined} aria-label={DASHBOARD_SECTION_META["ai-os"].label} className="mt-0"><AvyChatbotTab /></TabsContent></>
              )}
          </Suspense>
          {access.isSuperAdmin && tab === "overview" && (
                <Suspense fallback={contentFallback}><div className="mt-4 grid gap-3 lg:grid-cols-2"><AiProductionEntryCard /></div></Suspense>
              )}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.08] bg-[#080d1b]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigare mobilă">
      <div className="contents">
        <NavButton section="overview" mobile />
        {access.isStaff ? (
            <NavButton section={
                canOpenSection("leads", access)
                  ? "leads"
                  : canOpenSection("finance", access)
                    ? "finance"
                    : "intern"
              }
              mobile
            />
          ) : (
            <NavButton section="catalog" mobile />
          )}
        {access.isStaff &&
          (access.isSuperAdmin || canOpenSection("client-maintenance", access)) ? (
            <button type="button" aria-label={access.isSuperAdmin ? "Deschide AVY" : "Deschide mentenanța clienților"} aria-pressed={tab === (access.isSuperAdmin ? "ai-os" : "client-maintenance")} onClick={() => openSection(access.isSuperAdmin ? "ai-os" : "client-maintenance")} className="group -mt-5 flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-medium text-violet-100">
          <span className="grid size-12 place-items-center rounded-full border border-violet-300/30 bg-gradient-to-br from-violet-500 to-indigo-700 shadow-[0_0_28px_rgba(124,58,237,.55)] ring-4 ring-[#080d1b]">{access.isSuperAdmin? (
                  <Sparkles className="size-5" />
                ) : (
                  <Wrench className="size-5" />
                )}</span>
          <span>{access.isSuperAdmin ? "AVY" : "Mentenanță"}</span>
        </button>
          ) : access.isStaff ? (
            <NavButton section="intern" mobile />
          ) : (
            <NavButton section="cart" mobile />
          )}
        {access.isStaff ? (
            <NavButton section={
                canOpenSection("projects", access) ? "projects" : "team-staff"
              }
              mobile
            />
          ) : (
            <NavButton section="collection" mobile />
          )}
        <button type="button" aria-label="Deschide mai multe secțiuni" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className={`group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[9px] font-medium transition ${mobilePrimary.has(tab) ? "text-slate-500" : "bg-gradient-to-r from-violet-600/90 to-indigo-600/80 text-white"}`}><Ellipsis className="size-4" /><span>Mai multe</span></button>
      </div>
      </nav>
    </Tabs>
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent onCloseAutoFocus={event=>{if(commandOpen){event.preventDefault();searchInput.current?.focus();}}} side="left" className="dark w-[88vw] max-w-sm overflow-y-auto border-white/[0.08] bg-[#090e1d] p-0 text-slate-100">
        <SheetHeader className="border-b border-white/[0.07] p-5 text-left">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="size-10 rounded-xl ring-1 ring-white/10" />
            <div><SheetTitle className="font-display text-base text-white">{access.isClient?"Avyron Tech":<>AVYRON <span className="text-violet-300">OS</span></>}</SheetTitle><SheetDescription className="text-xs text-slate-500">{access.isClient ? "Serviciile, produsele și anexele într-un singur loc" : "Toate funcțiile autorizate, într-un singur loc."}</SheetDescription></div>
          </div>
        </SheetHeader>
        <nav className="space-y-5 p-4 pb-28" aria-label={access.isClient?"Secțiunile contului":"Toate secțiunile AVYRON OS"}>
          <button type="button" onClick={() => { setMobileMenuOpen(false); setCommandOpen(true); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-4 text-left text-sm text-slate-200"><Search className="size-4 text-violet-300" /> {access.isClient?"Caută un proiect sau document":"Caută o secțiune sau un flux"}</button>
          {access.isStaff && (
              <section aria-label="Scurtături pentru echipă"><p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Acces rapid</p><div className="grid grid-cols-2 gap-2">{([ ["projects", "Proiecte"], ["intern", "Chat intern"], ["os-centers", "Centre OS"], ["announcements", "Anunțuri"] ] as const).filter(([section]) => canOpenSection(section, access)).map(([section, label]) => (
                      <button key={section} type="button" onClick={() => openSection(section)} className="relative min-h-12 rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 text-left text-xs font-semibold text-slate-200 hover:border-violet-400/30">{label}<ActivityBadge count={activityCounts[section]} label="activități de văzut" /></button>))}</div></section>
            )}
          {mobileMoreGroups.map((group) => (
              <section key={group.id}>
            <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={openGroups[group.id] ?? true} className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 hover:bg-white/[0.04]"><span>{group.label}</span><ChevronDown className={`size-3 transition-transform ${(openGroups[group.id] ?? true) ? "rotate-180" : ""}`} /></button>
            <div className={`${(openGroups[group.id] ?? true) ? "grid" : "hidden"} grid-cols-2 gap-2`}>
              {group.items.map((section) => {
                const sectionMeta = dashboardSectionMeta(section.id,access.isClient);
                const Icon = sectionMeta.icon;
                const active = tab === section.id;
                return (
                      <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-current={active ? "page" : undefined} className={`flex min-h-20 flex-col items-start justify-between rounded-xl border p-3 text-left transition ${active ? "border-violet-400/35 bg-violet-500/15 text-white" : "border-white/[0.07] bg-white/[0.025] text-slate-300 hover:border-violet-400/25"}`}><span className="relative inline-flex"><Icon className="size-4 text-violet-300" /><ActivityBadge count={activityCounts[section.id]} label="activități de văzut" /></span><span className="mt-3 text-xs font-medium leading-tight">{sectionMeta.label}</span></button>
                    );
              })}
            </div>
          </section>
            ))}
          <button type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-4 py-3 text-xs font-semibold text-rose-200"><LogOut className="size-4" /> Deconectare</button>
        </nav>
      </SheetContent>
    </Sheet>
  </main>
  );
}
