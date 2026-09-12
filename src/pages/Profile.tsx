import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User, CreditCard, BarChart3, Receipt, MessageSquare, Users, Megaphone, ShieldCheck,
  FolderKanban, Wrench, BookOpen, MessagesSquare, Settings, ShoppingCart, Globe, Wallet,
  Image as ImageIcon, BadgePercent, Search, Lock, Sparkles, Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import ContactRail from "@/components/intern/ContactRail";
import PageBackLink from "@/components/site/PageBackLink";
import { buildAccess, canOpenSection, sectionsFor, type SectionId } from "@/lib/access";

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

const GROUP_LABELS: Record<string, string> = {
  account: "Cont",
  work: "Operațional",
  billing: "Abonamente & facturi",
  activity: "Activitate",
  team: "Echipă",
  control: "Control financiar",
};

const GROUP_ORDER = ["work", "billing", "activity", "team", "control", "account"];

const Profile = () => {
  const { t } = useLang();
  const { user, roles, isSuperAdmin, isStaff, isAdmin } = useAuth();
  const access = useMemo(
    () => buildAccess({ roles, email: user?.email, superadmin: isSuperAdmin }),
    [roles, user?.email, isSuperAdmin],
  );

  const meta: Record<SectionId, { label: string; icon: typeof User }> = useMemo(() => ({
    profile: { label: t.auth.dash.tabs.profile, icon: User },
    settings: { label: "Setări", icon: Settings },
    projects: { label: access.isStaff ? t.auth.dash.tabs.projects : "Proiectele mele", icon: FolderKanban },
    maintenance: { label: t.auth.dash.tabs.maintenance, icon: Wrench },
    clients: { label: t.auth.dash.tabs.clients, icon: Users },
    domains: { label: "Domenii", icon: Globe },
    media: { label: "Media", icon: ImageIcon },
    leads: { label: "Leads", icon: Target },
    subscriptions: { label: t.auth.dash.tabs.subscriptions, icon: CreditCard },
    cart: { label: t.auth.dash.tabs.cart, icon: ShoppingCart },
    invoices: { label: t.auth.dash.tabs.invoices, icon: Receipt },
    stats: { label: t.auth.dash.tabs.stats, icon: BarChart3 },
    tickets: { label: t.auth.dash.tabs.tickets, icon: MessageSquare },
    "staff-tickets": { label: t.auth.dash.tabs.staffTickets, icon: MessageSquare },
    "demo-requests": { label: "Solicitări demo", icon: MessageSquare },
    intern: { label: "Chat intern", icon: MessagesSquare },
    announcements: { label: t.auth.dash.tabs.announcements, icon: Megaphone },
    resources: { label: t.auth.dash.tabs.resources, icon: BookOpen },
    payments: { label: "Plăți", icon: Wallet },
    finance: { label: "Situație financiară", icon: Wallet },
    promotions: { label: "Promoții", icon: BadgePercent },
    "ai-os": { label: "AI OS AVY", icon: Sparkles },
  }), [t, access.isStaff]);

  const allowed = useMemo(() => sectionsFor(access), [access]);
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") ?? "";
  const [tab, setTab] = useState<string>(
    canOpenSection(requested, access) ? requested : "projects",
  );
  const [query, setQuery] = useState("");

  // Nicio secțiune interzisă nu rămâne deschisă dacă rolul se schimbă.
  useEffect(() => {
    if (!canOpenSection(tab, access)) setTab("projects");
  }, [tab, access]);

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: `${t.auth.profile.title} — Avyron`,
        description: "Panoul tău Avyron: proiecte, abonamente, facturi și mesaje cu echipa.",
        path: "/profil",
        robots: "noindex, nofollow",
      })
    );
  }, [t.auth.profile.title]);

  useEffect(() => {
    if (params.get("tab") !== tab) setParams({ tab }, { replace: true });
  }, [tab, params, setParams]);

  const q = query.trim().toLowerCase();
  const matches = (id: SectionId, keywords: string[]) =>
    !q || meta[id].label.toLowerCase().includes(q) || keywords.some((k) => k.includes(q));

  const groups = GROUP_ORDER.map((g) => ({
    id: g,
    label: GROUP_LABELS[g],
    items: allowed.filter((s) => s.group === g && matches(s.id, s.keywords)),
  })).filter((g) => g.items.length > 0);

  const roleLabel = isSuperAdmin ? "Super admin" : isAdmin ? "Admin" : isStaff ? "Staff" : "Client";

  return (
    <main className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PageBackLink to="/" label="Înapoi" />
          <Badge variant={isStaff ? "default" : "secondary"} className="gap-1">
            {isSuperAdmin ? <Lock className="size-3" /> : <ShieldCheck className="size-3" />}
            {roleLabel}
          </Badge>
        </div>

        {access.isSuperAdmin && (
          <Suspense fallback={<div className="h-36 animate-pulse rounded-2xl bg-card/50" aria-label="Se încarcă instrumentele AVYRON OS" />}>
            <div className="grid gap-4 lg:grid-cols-2">
              <AiProductionEntryCard />
              <EngineEntryCard />
            </div>
          </Suspense>
        )}

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3 sm:p-4 shadow-sm space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Caută o secțiune…"
                aria-label="Caută o secțiune din panou"
                className="w-full rounded-xl border border-border/70 bg-background/70 py-2.5 pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4" role="tablist" aria-orientation="horizontal">
              {groups.map((group, gi) => (
                <div key={group.id} className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground/80 px-1">
                    {String(gi + 1).padStart(2, "0")} · {group.label}
                  </span>
                  <div className="inline-flex flex-wrap w-auto rounded-lg p-1 bg-muted/60 gap-1">
                    {group.items.map((s) => {
                      const Icon = meta[s.id].icon;
                      const active = tab === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setTab(s.id)}
                          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition ${
                            active
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                          }`}
                        >
                          <Icon className="size-4 shrink-0" strokeWidth={2.25} />
                          <span>{meta[s.id].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground px-1">Nicio secțiune nu corespunde căutării.</p>
              )}
            </div>
          </div>

          <Suspense fallback={<div className="min-h-48 rounded-2xl bg-muted/40 animate-pulse" aria-label="Se încarcă" />}>
            <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent>
            <TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent>
            <TabsContent value="projects" className="mt-0"><CloudflareProjects embedded /></TabsContent>

            {access.isClient && (
              <>
                <TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab /></TabsContent>
                <TabsContent value="invoices" className="mt-0"><InvoicesTab /></TabsContent>
                <TabsContent value="cart" className="mt-0"><CartTab /></TabsContent>
                <TabsContent value="stats" className="mt-0"><StatsTab /></TabsContent>
                <TabsContent value="tickets" className="mt-0"><TicketsTab /></TabsContent>
              </>
            )}

            {access.isStaff && (
              <>
                <TabsContent value="maintenance" className="mt-0"><StaffMaintenanceTab /></TabsContent>
                <TabsContent value="clients" className="mt-0"><StaffClientsTab /></TabsContent>
                <TabsContent value="domains" className="mt-0"><StaffDomainStatsTab /></TabsContent>
                <TabsContent value="media" className="mt-0"><StaffMediaTab /></TabsContent>
                <TabsContent value="leads" className="mt-0"><StaffLeadsTab /></TabsContent>
                <TabsContent value="staff-tickets" className="mt-0"><TicketsTab staffMode /></TabsContent>
                <TabsContent value="demo-requests" className="mt-0"><StaffExampleRequestsTab /></TabsContent>
                <TabsContent value="intern" className="mt-0"><StaffChatTab /></TabsContent>
                <TabsContent value="announcements" className="mt-0"><StaffAnnouncementsTab /></TabsContent>
                <TabsContent value="resources" className="mt-0"><StaffResourcesTab /></TabsContent>
              </>
            )}

            {access.isSuperAdmin && (
              <>
                <TabsContent value="payments" className="mt-0"><StaffPaymentsTab /></TabsContent>
                <TabsContent value="finance" className="mt-0"><StaffFinanceTab /></TabsContent>
                <TabsContent value="promotions" className="mt-0"><StaffPromotionsTab /></TabsContent>
                <TabsContent value="ai-os" className="mt-0"><AiOsConsole embedded /></TabsContent>
              </>
            )}
          </Suspense>
        </Tabs>
        <ContactRail />
      </div>
    </main>
  );
};

export default Profile;
