import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut, User, CreditCard, BarChart3, Receipt, MessageSquare, Users, Megaphone, ShieldCheck, FolderKanban, Wrench, BookOpen, MessagesSquare, Settings, ShoppingCart, Globe, Sparkles } from "lucide-react";
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
import { StaffDomainStatsTab } from "@/components/dashboard/StaffDomainStatsTab";
import { StaffExampleRequestsTab } from "@/components/dashboard/StaffExampleRequestsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { CartTab } from "@/components/dashboard/CartTab";

const Profile = () => {
  const { t } = useLang();
  const { signOut, isStaff, isAdmin } = useAuth();
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
        { value: "staff-tickets", label: t.auth.dash.tabs.staffTickets, icon: MessageSquare },
        { value: "demo-requests", label: "Solicitări demo", icon: Sparkles },
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
              <TabsContent value="domains" className="mt-0"><StaffDomainStatsTab /></TabsContent>
              <TabsContent value="demo-requests" className="mt-0"><StaffExampleRequestsTab /></TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </main>
  );
};

export default Profile;
