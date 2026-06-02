import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wallet, TrendingUp, Clock, CheckCircle2, AlertTriangle, Wrench,
  FolderKanban, Users, ShieldCheck, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stats = {
  revenuePaidCents: number;
  pendingCents: number;
  overdueCount: number;
  projectsActive: number;
  projectsDelivered: number;
  maintenanceCount: number;
  subsActive: number;
};

type Row = {
  id: string;
  invoice_number?: string;
  amount_cents: number;
  status: string;
  issued_at: string;
  user_id: string;
};

type ProjRow = {
  id: string;
  project_number: number;
  title: string;
  status: string;
  client_first_name: string | null;
  client_last_name: string | null;
  staff_members: string[] | null;
  assignee_id: string | null;
  budget_cents: number;
  updated_at: string;
};

type Profile = { id: string; display_name: string | null; pseudonym: string | null; staff_role: string | null };

const fmtRON = (cents: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(cents / 100);

const STATUS_LABEL: Record<string, string> = {
  todo: "În așteptare", started: "În lucru", in_progress: "În lucru",
  refining: "Rafinare", delivered: "Livrat", paid: "Plătit", maintenance: "Mentenanță", done: "Finalizat",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  started: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  in_progress: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  refining: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  maintenance: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export const StaffFinanceTab = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Row[]>([]);
  const [projects, setProjects] = useState<ProjRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    (async () => {
      const [inv, proj, maint, subs] = await Promise.all([
        supabase.from("invoices").select("id,invoice_number,amount_cents,status,issued_at,user_id").order("issued_at", { ascending: false }).limit(20),
        supabase.from("projects").select("*").order("updated_at", { ascending: false }).limit(15),
        supabase.from("maintenance_sites").select("id,status").limit(500),
        supabase.from("subscriptions").select("id,status").limit(500),
      ]);

      const invoices = (inv.data ?? []) as Row[];
      const projectsAll = (proj.data ?? []) as ProjRow[];

      const revenuePaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount_cents, 0);
      const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount_cents, 0);
      const overdue = invoices.filter(i => i.status === "overdue" || i.status === "unpaid").length;

      setStats({
        revenuePaidCents: revenuePaid,
        pendingCents: pending,
        overdueCount: overdue,
        projectsActive: projectsAll.filter(p => !["delivered", "paid", "done"].includes(p.status)).length,
        projectsDelivered: projectsAll.filter(p => ["delivered", "paid", "done"].includes(p.status)).length,
        maintenanceCount: (maint.data ?? []).length,
        subsActive: (subs.data ?? []).filter((s: { status: string }) => s.status === "active").length,
      });
      setRecentInvoices(invoices.slice(0, 8));
      setProjects(projectsAll);

      const ids = new Set<string>();
      invoices.forEach(i => i.user_id && ids.add(i.user_id));
      projectsAll.forEach(p => {
        if (p.assignee_id) ids.add(p.assignee_id);
        (p.staff_members ?? []).forEach(s => ids.add(s));
      });
      if (ids.size) {
        const { data: pf } = await supabase.from("profiles")
          .select("id,display_name,pseudonym,staff_role").in("id", [...ids]);
        if (pf) setProfiles(Object.fromEntries(pf.map(p => [p.id, p as Profile])));
      }
    })();
  }, []);

  const nameOf = (id: string) => profiles[id]?.pseudonym || profiles[id]?.display_name || id.slice(0, 6);
  const isStaffProf = (id: string) => !!profiles[id]?.staff_role || ["dev", "designer", "marketing", "support", "admin"].includes(profiles[id]?.staff_role || "");

  const kpis = [
    { label: "Venituri încasate", value: stats ? fmtRON(stats.revenuePaidCents) : "—", icon: TrendingUp, tone: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" },
    { label: "În așteptare", value: stats ? fmtRON(stats.pendingCents) : "—", icon: Clock, tone: "from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400" },
    { label: "Facturi restante", value: stats?.overdueCount ?? "—", icon: AlertTriangle, tone: "from-red-500/20 to-red-500/0 text-red-600 dark:text-red-400" },
    { label: "Abonamente active", value: stats?.subsActive ?? "—", icon: Wallet, tone: "from-primary/20 to-primary/0 text-primary" },
    { label: "Proiecte active", value: stats?.projectsActive ?? "—", icon: FolderKanban, tone: "from-cyan-500/20 to-cyan-500/0 text-cyan-600 dark:text-cyan-400" },
    { label: "Livrate", value: stats?.projectsDelivered ?? "—", icon: CheckCircle2, tone: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" },
    { label: "În mentenanță", value: stats?.maintenanceCount ?? "—", icon: Wrench, tone: "from-violet-500/20 to-violet-500/0 text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Situație financiară</h2>
        <p className="text-sm text-muted-foreground">
          Privire de ansamblu asupra veniturilor, proiectelor finalizate, mentenanței active și echipei alocate.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", k.tone.split(" ").filter(c => c.startsWith("from-") || c.startsWith("to-")).join(" "))} />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{k.label}</span>
                <k.icon className={cn("size-4", k.tone.split(" ").filter(c => c.startsWith("text-")).join(" "))} />
              </div>
              <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent invoices */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="size-4" /> Istoric comenzi recente</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              <div className="space-y-1">
                {recentInvoices.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nicio factură.</p>}
                {recentInvoices.map(i => (
                  <div key={i.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50">
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center"><Wallet className="size-4 text-muted-foreground" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">#{i.invoice_number ?? i.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {nameOf(i.user_id)} · {new Date(i.issued_at).toLocaleDateString("ro-RO")}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_COLOR[i.status] || "")}>{STATUS_LABEL[i.status] || i.status}</Badge>
                    <span className="text-sm font-semibold tabular-nums">{fmtRON(i.amount_cents)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Project admin / staff alloc */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="size-4" /> Administrare proiecte & echipă</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              <div className="space-y-2">
                {projects.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Niciun proiect.</p>}
                {projects.map(p => {
                  const client = [p.client_first_name, p.client_last_name].filter(Boolean).join(" ") || "Client neasignat";
                  const team = [
                    ...(p.assignee_id ? [p.assignee_id] : []),
                    ...((p.staff_members ?? []).filter(s => s !== p.assignee_id)),
                  ];
                  return (
                    <div key={p.id} className="rounded-lg border border-border/70 p-3 space-y-2 hover:border-primary/40 transition">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">#{String(p.project_number).padStart(3, "0")}</span>
                        <span className="font-medium text-sm truncate flex-1">{p.title}</span>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_COLOR[p.status] || "")}>{STATUS_LABEL[p.status] || p.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>👤 {client}</span>
                        <span className="tabular-nums">{fmtRON(p.budget_cents || 0)}</span>
                      </div>
                      {team.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                          {team.map(uid => (
                            <span key={uid} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                              {isStaffProf(uid) && <ShieldCheck className="size-2.5 text-primary" />}
                              {nameOf(uid)}
                              {profiles[uid]?.staff_role && (
                                <span className="text-muted-foreground">· {profiles[uid].staff_role}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <ArrowUpRight className="size-3" /> Date sincronizate din facturi, proiecte, mentenanță și abonamente.
      </p>
    </div>
  );
};

export default StaffFinanceTab;
