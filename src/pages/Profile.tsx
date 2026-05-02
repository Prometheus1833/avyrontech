import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut, User, CreditCard, BarChart3, Receipt, MessageSquare, Users, Megaphone, ShieldCheck, FolderKanban, Wrench, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { SubscriptionsTab } from "@/components/dashboard/SubscriptionsTab";
import { StatsTab } from "@/components/dashboard/StatsTab";
import { InvoicesTab } from "@/components/dashboard/InvoicesTab";
import { TicketsTab } from "@/components/dashboard/TicketsTab";
import { StaffClientsTab } from "@/components/dashboard/StaffClientsTab";
import { StaffAnnouncementsTab } from "@/components/dashboard/StaffAnnouncementsTab";
import { Card, CardContent } from "@/components/ui/card";

const ComingSoonCard = ({ title }: { title: string }) => (
  <Card>
    <CardContent className="p-10 text-center space-y-2">
      <h3 className="text-xl font-display font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">În curând — această secțiune este în lucru.</p>
    </CardContent>
  </Card>
);

const Profile = () => {
  const { t } = useLang();
  const { signOut, isStaff, isAdmin } = useAuth();
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
    { value: "tickets", label: t.auth.dash.tabs.tickets, icon: MessageSquare },
  ];
  const staffTabs = [
    { value: "profile", label: t.auth.dash.tabs.profile, icon: User },
    { value: "projects", label: t.auth.dash.tabs.projects, icon: FolderKanban },
    { value: "maintenance", label: t.auth.dash.tabs.maintenance, icon: Wrench },
    { value: "clients", label: t.auth.dash.tabs.clients, icon: Users },
    { value: "invoices", label: t.auth.dash.tabs.invoices, icon: Receipt },
    { value: "staff-tickets", label: t.auth.dash.tabs.staffTickets, icon: MessageSquare },
    { value: "announcements", label: t.auth.dash.tabs.announcements, icon: Megaphone },
    { value: "resources", label: t.auth.dash.tabs.resources, icon: BookOpen },
  ];

  const tabs = isStaff ? staffTabs : clientTabs;

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
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => (window.location.href = "/"))}>
              <LogOut className="size-4 mr-2" />
              {t.auth.logout}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto h-auto p-1 bg-muted/60">
              {tabs.map((tb) => (
                <TabsTrigger key={tb.value} value={tb.value} className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
                  <tb.icon className="size-4" />
                  <span className="hidden sm:inline">{tb.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent>
          {!isStaff && (
            <>
              <TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab /></TabsContent>
              <TabsContent value="stats" className="mt-0"><StatsTab /></TabsContent>
              <TabsContent value="tickets" className="mt-0"><TicketsTab /></TabsContent>
            </>
          )}
          <TabsContent value="invoices" className="mt-0"><InvoicesTab /></TabsContent>
          {isStaff && (
            <>
              <TabsContent value="projects" className="mt-0">
                <ComingSoonCard title={t.auth.dash.tabs.projects} />
              </TabsContent>
              <TabsContent value="maintenance" className="mt-0">
                <ComingSoonCard title={t.auth.dash.tabs.maintenance} />
              </TabsContent>
              <TabsContent value="clients" className="mt-0"><StaffClientsTab /></TabsContent>
              <TabsContent value="staff-tickets" className="mt-0"><TicketsTab staffMode /></TabsContent>
              <TabsContent value="announcements" className="mt-0"><StaffAnnouncementsTab /></TabsContent>
              <TabsContent value="resources" className="mt-0">
                <ComingSoonCard title={t.auth.dash.tabs.resources} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </main>
  );
};

export default Profile;
