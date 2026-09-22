import {
  ArrowUpRight,
  Bot,
  FolderKanban,
  LayoutDashboard,
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
import { buildAccess, canOpenSection } from "@/lib/access";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";

type QuickLink = {
  label: string;
  detail: string;
  to: string;
  icon: typeof LayoutDashboard;
};

const StaffOsMenu = () => {
  const { profile, user, roles, staffPolicy, isStaff, isAdmin, isSuperAdmin } = useAuth();
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

  const access=buildAccess({roles,superadmin:isSuperAdmin,department:staffPolicy?.department});
  const visibleLinks=quickLinks.filter(item=>canOpenSection(new URLSearchParams(item.to.split("?")[1]).get("tab")||"",access));

  const displayName = profile?.display_name || user.display_name || user.email.split("@")[0];
  const roleLabel = isSuperAdmin
    ? "Super administrator"
    : isAdmin ? "Administrator" : ro ? "Membru staff" : "Staff member";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ro ? "Deschide accesul rapid AVYRON OS" : "Open AVYRON OS quick access"}
          className="group relative inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-violet-500/25 bg-violet-500/[0.08] px-3 font-mono text-[10px] font-bold tracking-[0.16em] text-violet-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/45 hover:bg-violet-500/15 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-violet-200 dark:hover:text-white"
        >
          <span className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" aria-hidden="true" />
          OS
          <span className="ml-1.5 size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.85)]" aria-hidden="true" />
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
          {visibleLinks.map((item) => {
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
  );
};

export default StaffOsMenu;
