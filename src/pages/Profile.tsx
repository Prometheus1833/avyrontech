import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, CreditCard, BarChart3, Receipt, MessageSquare, Users, Megaphone, ShieldCheck, FolderKanban, Wrench, BookOpen, MessagesSquare, Settings, ShoppingCart, Globe, Wallet, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import ContactRail from "@/components/intern/ContactRail";

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

const Profile = () => {
  const { t } = useLang();
  const { isStaff, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") ?? "profile";
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: `${t.auth.profile.title} — Avyron`,
        description:
          "Panoul tău Avyron: gestionează proiectele, abonamentele, facturile și mesajele cu echipa.",
        path: "/profil",
        robots: "noindex, nofollow",
      })
    );
  }, [t.auth.profile.title]);

  useEffect(() => {
    if (params.get("tab") !== tab) setParams({ tab }, { replace: true });
  }, [tab, params, setParams]);

  type TabItem = { value: string; label: string; icon: typeof User };
  type TabGroup = { id: string; label: string; items: TabItem[] };

  const clientGroups: TabGroup[] = [
    {
      id: "projects",
      label: "Proiecte",
      items: [
        { value: "projects", label: "Proiectele mele", icon: FolderKanban },
      ],
    },
    {
      id: "personal",
      label: "Cont",
      items: [
        { value: "profile", label: t.auth.dash.tabs.profile, icon: User },
        { value: "settings", label: "Setări", icon: Settings },
      ],
    },
    {
      id: "billing",
      label: "Abonamente & facturi",
      items: [
        { value: "subscriptions", label: t.auth.dash.tabs.subscriptions, icon: CreditCard },
        { value: "invoices", label: t.auth.dash.tabs.invoices, icon: Receipt },
        { value: "cart", label: t.auth.dash.tabs.cart, icon: ShoppingCart },
      ],
    },
    {
      id: "activity",
      label: "Activitate",
      items: [
        { value: "stats", label: t.auth.dash.tabs.stats, icon: BarChart3 },
        { value: "tickets", label: t.auth.dash.tabs.tickets, icon: MessageSquare },
      ],
    },
  ];

  const staffGroups: TabGroup[] = [
    {
      id: "personal",
      label: "Cont",
      items: [
        { value: "profile", label: t.auth.dash.tabs.profile, icon: User },
        { value: "settings", label: "Setări", icon: Settings },
      ],
    },
    {
      id: "ops",
      label: "Operațional",
      items: [
        { value: "projects", label: t.auth.dash.tabs.projects, icon: FolderKanban },
        { value: "maintenance", label: t.auth.dash.tabs.maintenance, icon: Wrench },
        { value: "clients", label: t.auth.dash.tabs.clients, icon: Users },
        { value: "domains", label: "Domenii", icon: Globe },
      ],
    },
    {
      id: "finance",
      label: "Financiar & Suport",
      items: [
        { value: "invoices", label: t.auth.dash.tabs.invoices, icon: Receipt },
        { value: "payments", label: "Plăți", icon: Wallet },
        { value: "finance", label: "Situație financiară", icon: Wallet },
        { value: "media", label: "Media", icon: ImageIcon },
        { value: "staff-tickets", label: t.auth.dash.tabs.staffTickets, icon: MessageSquare },
        { value: "demo-requests", label: "Solicitări demo", icon: MessageSquare },
      ],
    },
    {
      id: "internal",
      label: "Intern",
      items: [
        { value: "intern", label: "Chat intern", icon: MessagesSquare },
        { value: "announcements", label: t.auth.dash.tabs.announcements, icon: Megaphone },
        { value: "resources", label: t.auth.dash.tabs.resources, icon: BookOpen },
      ],
    },
  ];

  const groups = isStaff ? staffGroups : clientGroups;

  return (
    <main className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Acasă
          </Link>
          <div className="flex items-center gap-2">
            {isStaff && (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="size-3" />
                {isAdmin ? "Admin" : "Staff"}
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-3 sm:p-4 shadow-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {groups.map((group, gi) => (
                <div key={group.id} className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground/80 px-1">
                    {String(gi + 1).padStart(2, "0")} · {group.label}
                  </span>
                  <TabsList className="inline-flex flex-wrap w-auto h-auto p-1 bg-muted/60 gap-1">
                    {group.items.map((tb) => (
                      <TabsTrigger
                        key={tb.value}
                        value={tb.value}
                        className="gap-2 px-3.5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        <tb.icon className="size-4 shrink-0" strokeWidth={2.25} />
                        <span>{tb.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              ))}
            </div>
          </div>



          <Suspense fallback={<div className="min-h-48 rounded-2xl bg-muted/40 animate-pulse" aria-label="Se încarcă" />}>
          <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent>
          <TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent>
          <TabsContent value="projects" className="mt-0"><CloudflareProjects embedded /></TabsContent>
          {!isStaff && (
            <>
              <TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab /></TabsContent>
              <TabsContent value="stats" className="mt-0"><StatsTab /></TabsContent>
              <TabsContent value="cart" className="mt-0"><CartTab /></TabsContent>
              <TabsContent value="tickets" className="mt-0"><TicketsTab /></TabsContent>
            </>
          )}
          <TabsContent value="invoices" className="mt-0"><InvoicesTab /></TabsContent>
          {isStaff && (
            <>
              <TabsContent value="maintenance" className="mt-0"><StaffMaintenanceTab /></TabsContent>
              <TabsContent value="clients" className="mt-0"><StaffClientsTab /></TabsContent>
              <TabsContent value="finance" className="mt-0"><StaffFinanceTab /></TabsContent>
              <TabsContent value="payments" className="mt-0"><StaffPaymentsTab /></TabsContent>
              <TabsContent value="media" className="mt-0"><StaffMediaTab /></TabsContent>
              <TabsContent value="staff-tickets" className="mt-0"><TicketsTab staffMode /></TabsContent>
              <TabsContent value="intern" className="mt-0"><StaffChatTab /></TabsContent>
              <TabsContent value="announcements" className="mt-0"><StaffAnnouncementsTab /></TabsContent>
              <TabsContent value="resources" className="mt-0"><StaffResourcesTab /></TabsContent>
              <TabsContent value="domains" className="mt-0"><StaffDomainStatsTab /></TabsContent>
              <TabsContent value="demo-requests" className="mt-0"><StaffExampleRequestsTab /></TabsContent>
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
