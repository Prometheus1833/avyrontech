import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, CreditCard, BarChart3, Receipt, MessageSquare, Users, Megaphone, ShieldCheck, FolderKanban, Wrench, BookOpen, MessagesSquare, Settings, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { SubscriptionsTab } from "@/components/dashboard/SubscriptionsTab";
import { StatsTab } from "@/components/dashboard/StatsTab";
import { InvoicesTab } from "@/components/dashboard/InvoicesTab";
import { TicketsTab } from "@/components/dashboard/TicketsTab";
import { StaffClientsTab } from "@/components/dashboard/StaffClientsTab";
import { StaffAnnouncementsTab } from "@/components/dashboard/StaffAnnouncementsTab";
import { StaffProjectsTab } from "@/components/dashboard/StaffProjectsTab";
import { StaffMaintenanceTab } from "@/components/dashboard/StaffMaintenanceTab";
import { StaffChatTab } from "@/components/dashboard/StaffChatTab";
import { StaffResourcesTab } from "@/components/dashboard/StaffResourcesTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { CartTab } from "@/components/dashboard/CartTab";

const Profile = () => {
  const { t } = useLang();
  const { isStaff, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") ?? "profile";
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    document.title = `${t.auth.profile.title} — Avyron`;
  }, [t.auth.profile.title]);

  useEffect(() => {
    if (params.get("tab") !== tab) setParams({ tab }, { replace: true });
  }, [tab, params, setParams]);

  const clientTabs = [
    { value: "profile", label: t.auth.dash.tabs.profile, icon: User },
    { value: "subscriptions", label: t.auth.dash.tabs.subscriptions, icon: CreditCard },
    { value: "stats", label: t.auth.dash.tabs.stats, icon: BarChart3 },
    { value: "invoices", label: t.auth.dash.tabs.invoices, icon: Receipt },
    { value: "cart", label: t.auth.dash.tabs.cart, icon: ShoppingCart },
    { value: "tickets", label: t.auth.dash.tabs.tickets, icon: MessageSquare },
    { value: "settings", label: "Setări", icon: Settings },
  ];
  const staffTabs = [
    { value: "profile", label: t.auth.dash.tabs.profile, icon: User },
    { value: "projects", label: t.auth.dash.tabs.projects, icon: FolderKanban },
    { value: "maintenance", label: t.auth.dash.tabs.maintenance, icon: Wrench },
    { value: "clients", label: t.auth.dash.tabs.clients, icon: Users },
    { value: "invoices", label: t.auth.dash.tabs.invoices, icon: Receipt },
    { value: "staff-tickets", label: t.auth.dash.tabs.staffTickets, icon: MessageSquare },
    { value: "intern", label: "Intern", icon: MessagesSquare },
    { value: "announcements", label: t.auth.dash.tabs.announcements, icon: Megaphone },
    { value: "resources", label: t.auth.dash.tabs.resources, icon: BookOpen },
    { value: "settings", label: "Setări", icon: Settings },
  ];

  const tabs = isStaff ? staffTabs : clientTabs;

  return (
    <main className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Acasă
          </Link>
          {isStaff && (
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="size-3" />
              {isAdmin ? "Admin" : "Staff"}
            </Badge>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-thin">
            <TabsList className="inline-flex w-auto h-auto p-1 bg-muted/60 gap-0.5">
              {tabs.map((tb) => {
                const active = tb.value === tab;
                return (
                  <TabsTrigger
                    key={tb.value}
                    value={tb.value}
                    title={tb.label}
                    aria-label={tb.label}
                    className="gap-1.5 px-2.5 py-1.5 text-xs data-[state=active]:px-3"
                  >
                    <tb.icon className="size-4 shrink-0" />
                    <span className={active ? "inline" : "hidden md:hidden"}>{tb.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent>
          <TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent>
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
              <TabsContent value="projects" className="mt-0"><StaffProjectsTab /></TabsContent>
              <TabsContent value="maintenance" className="mt-0"><StaffMaintenanceTab /></TabsContent>
              <TabsContent value="clients" className="mt-0"><StaffClientsTab /></TabsContent>
              <TabsContent value="staff-tickets" className="mt-0"><TicketsTab staffMode /></TabsContent>
              <TabsContent value="intern" className="mt-0"><StaffChatTab /></TabsContent>
              <TabsContent value="announcements" className="mt-0"><StaffAnnouncementsTab /></TabsContent>
              <TabsContent value="resources" className="mt-0"><StaffResourcesTab /></TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </main>
  );
};

export default Profile;
