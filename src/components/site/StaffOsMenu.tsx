import {
  ArrowUpRight,
  Bell,
  Bot,
  ChevronDown,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";

type QuickLink = {
  label: string;
  detail: string;
  to: string;
  icon: typeof LayoutDashboard;
};

const StaffOsMenu = () => {
  const { profile, user, isStaff, isAdmin, isSuperAdmin } = useAuth();
  const { lang } = useLang();
  const ro = lang === "ro";

  if (!user || !isStaff) return null;

  const quickLinks: QuickLink[] = [
    {
      label: ro ? "Privire de ansamblu" : "Overview",
      detail: ro ? "Priorități și starea sistemului" : "Priorities and system status",
      to: "/profil?tab=overview",
      icon: LayoutDashboard,
    },
    {
      label: ro ? "Proiecte" : "Projects",
      detail: ro ? "Livrări și progres" : "Delivery and progress",
      to: "/profil?tab=projects",
      icon: FolderKanban,
    },
    {
      label: ro ? "Notificări" : "Notifications",
      detail: ro ? "Evenimente și anunțuri" : "Events and announcements",
      to: "/profil?tab=overview&notifications=1",
      icon: Bell,
    },
    {
      label: ro ? "Fluxuri și pipeline" : "Workflows and pipeline",
      detail: ro ? "Cereri, vânzări și livrare" : "Requests, sales and delivery",
      to: "/profil?tab=workflows",
      icon: GitBranch,
    },
    {
      label: ro ? "Chat intern" : "Team chat",
      detail: ro ? "Canale și mesaje directe" : "Channels and direct messages",
      to: "/profil?tab=intern",
      icon: MessagesSquare,
    },
    {
      label: ro ? "Leaduri & CRM" : "Leads & CRM",
      detail: ro ? "Oportunități și răspunsuri" : "Opportunities and replies",
      to: "/profil?tab=leads",
      icon: Target,
    },
    ...(isSuperAdmin
      ? [
          {
            label: ro ? "Agenți AI" : "AI agents",
            detail: ro ? "Aprobări și activitate" : "Approvals and activity",
            to: "/profil?tab=ai-os",
            icon: Bot,
          },
          {
            label: ro ? "Financiar" : "Finance",
            detail: ro ? "Venituri, costuri și bugete" : "Revenue, costs and budgets",
            to: "/profil?tab=finance",
            icon: Wallet,
          },
        ]
      : []),
  ];

  const displayName = profile?.display_name || user.display_name || user.email.split("@")[0];
  const roleLabel = isSuperAdmin
    ? "Super administrator"
    : isAdmin ? "Administrator" : ro ? "Membru staff" : "Staff member";

  return (
    <div className="inline-flex h-10 shrink-0 items-center rounded-full border border-violet-500/25 bg-violet-500/[0.08] text-violet-700 shadow-sm dark:text-violet-200">
    <Link to="/profil?tab=overview" className="inline-flex h-full items-center rounded-l-full pl-3 pr-1.5 text-[10px] font-bold tracking-[0.1em] transition hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-white" aria-label={ro ? "Deschide AVYRON OS" : "Open AVYRON OS"}>AVYRON OS</Link>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ro ? "Deschide accesul rapid AVYRON OS" : "Open AVYRON OS quick access"}
          className="group relative inline-flex h-full w-8 shrink-0 items-center justify-center rounded-r-full transition hover:bg-violet-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={10}
        collisionPadding={12}
        className="z-[70] flex max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border-violet-500/20 bg-background/95 p-0 shadow-[0_24px_70px_-26px_rgba(76,29,149,.55)] backdrop-blur-2xl"
      >
        <DropdownMenuLabel className="relative shrink-0 overflow-hidden px-4 pb-3 pt-4">
          <span className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full bg-violet-500/15 blur-3xl" aria-hidden="true" />
          <span className="relative flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{roleLabel} · AVYRON OS</span>
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="m-0 bg-violet-500/10" />
        <div className="grid min-h-0 gap-1 overflow-y-auto overscroll-contain p-2" aria-label={ro ? "Acces rapid OS" : "OS quick access"}>
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.to} asChild className="cursor-pointer rounded-xl p-0 focus:bg-violet-500/10">
                <Link to={item.to} className="group/item flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition group-hover/item:bg-violet-500/10 group-hover/item:text-violet-600 dark:group-hover/item:text-violet-300">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground">{item.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{item.detail}</span>
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground/60 transition group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:text-violet-500" aria-hidden="true" />
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="m-0 bg-violet-500/10" />
        <div className="shrink-0 p-2">
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl bg-foreground p-0 text-background focus:bg-foreground/90 focus:text-background">
            <Link to="/profil?tab=overview" className="flex items-center justify-between gap-3 px-3.5 py-3 text-xs font-semibold">
              <span>{ro ? "Către Panoul de comandă" : "Go to Command Dashboard"}</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};

export default StaffOsMenu;
