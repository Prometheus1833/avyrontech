import ProjectSummaryCard from "@/components/intern/ProjectSummaryCard";
import {PROJECT_KIND_LABELS,type ProjectSummary} from "@/shared/projectSummary";
import { PROJECT_STAGES, projectStage, type ProjectStage } from "@/shared/projectLifecycle";
import { clientWorkspaceApi } from "@/lib/clientWorkspaceApi";
import { CLIENT_ENTITY_TYPES, type ClientEntityType } from "@/shared/clientWorkspace";
import { STAFF_MANAGED } from "@/shared/staffAccess";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { internApi, type AccountOption, type BannerStatus, type ClientOption, type ProjectKind, type ProjectPurchase, type ProjectSale } from "@/lib/internApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ExternalLink, FolderKanban, CheckCircle2, Receipt, TrendingUp, Columns3, List } from "lucide-react";
import { toast } from "sonner";
import ContactRail from "@/components/intern/ContactRail";
import PageBackLink from "@/components/site/PageBackLink";


type Row = ProjectSummary & {favicon_url?:string|null};

const BANNER: Record<BannerStatus, { label: string; cls: string }> = {
  proposed: { label: "Propus", cls: "bg-slate-500/15 text-muted-foreground" },
  online:      { label: "Online / Finalizat", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  testing:     { label: "Testare",             cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  in_progress: { label: "În dezvoltare",       cls: "bg-primary/15 text-primary" },
  revizuire:   { label: "Revizuire",           cls: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  offline:     { label: "Offline",             cls: "bg-muted text-muted-foreground" },
};

const KINDS=Object.entries(PROJECT_KIND_LABELS).map(([value,label])=>({value:value as ProjectKind,label}));

export default function InternHome({ embedded = false }: { embedded?: boolean;
}) {
  const { user, isStaff, isSuperAdmin, capabilities, loading: authLoading } = useAuth();
  const [params,setParams]=useSearchParams();
  const mine=params.get("scope")==="mine";
  const canCreate =
    isStaff &&
    (!capabilities.includes(STAFF_MANAGED) ||
      capabilities.includes("projects.create"));
  const [rows, setRows] = useState<Row[]>([]);
  const [purchases, setPurchases] = useState<ProjectPurchase[]>([]);
  const [sales, setSales] = useState<ProjectSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectView, setProjectView] = useState<"pipeline" | "list">("pipeline");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [form, setForm] = useState({ name: "", stage: "proposed" as ProjectStage, kind: "website_prezentare" as ProjectKind, url: "", description: "", client_id: "none", owner_user_id: "", recurring_enabled: false, recurring_name: "Mentenanță AVYRON", recurring_price: "", recurring_cycle: "monthly" as "monthly" | "yearly", next_billing_date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) });

  const [newClient, setNewClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientDraft, setClientDraft] = useState({ name: "", email: "", phone: "", contact: "", type: "Altă formă" as ClientEntityType });
  const projectKey = useRef(crypto.randomUUID());
  const clientKey = useRef(crypto.randomUUID());
  const canCreateClient = isSuperAdmin || capabilities.includes("clients.write");
  const createClient = async () => {
    if (savingClient) return;
    setSavingClient(true);
    try {
      const name = clientDraft.name.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientDraft.email.trim())) throw new Error("Completează numele și un e-mail valid.");
      const result = await clientWorkspaceApi.create({ identity: { companyName: name, legalName: name, email: clientDraft.email.trim(), phone: clientDraft.phone.trim(), contactName: clientDraft.contact.trim(), entityType: clientDraft.type, status: "active", taxId: "", registrationNumber: "", address: "", representative: "", notes: "" }, account: { mode: "none" } }, clientKey.current);
      setClients(old => [...old, { id: result.id, company_name: name, email: clientDraft.email.trim(), contact_name: clientDraft.contact.trim() || null, status: "active" }]);
      setForm(old => ({ ...old, client_id: result.id, owner_user_id: "" }));
      setNewClient(false); setClientDraft({ name: "", email: "", phone: "", contact: "", type: "Altă formă" }); clientKey.current = crypto.randomUUID();
      toast.success("Clientul a fost adăugat în CRM și selectat pentru proiect.");
    } catch (e) { toast.error((e as Error).message); } finally { setSavingClient(false); }
  };
  const loadSeq=useRef(0);
  const load = useCallback(async () => {
    const seq=++loadSeq.current;
    setLoading(true);
    try {
      const res = await internApi.listProjects(mine);
      if(seq!==loadSeq.current)return;
      setRows(res.data as Row[]);
      setPurchases(res.purchases ?? []);
      setSales(res.sales ?? []);
    } catch (e) {
      if(seq===loadSeq.current){setRows([]);setPurchases([]);setSales([]);toast.error((e as Error).message);}
    } finally { if(seq===loadSeq.current)setLoading(false); }
  }, [mine]);
  const userId=user?.id;
  useEffect(() => {
    if (!userId) return;
    const counter=loadSeq;
    setRows([]);setPurchases([]);setSales([]);void load();
    const update=()=>{if(document.visibilityState==="visible")void load()};
    const timer=setInterval(update,30000);
    window.addEventListener("focus",update);window.addEventListener("avyron:projects-changed",update);
    return()=>{++counter.current;clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("avyron:projects-changed",update)};
  }, [userId,load]);
  useEffect(() => {
    if (!user || !canCreate) return;
    Promise.allSettled([internApi.listClients(), internApi.listAccounts()])
      .then(([clientResult, accountResult]) => {
        setClients(clientResult.status === "fulfilled" ? clientResult.value.data : []);
        setAccounts(accountResult.status === "fulfilled" ? accountResult.value.data.filter((account) => !/(^|,)(staff|admin)(,|$)/.test(account.roles || "")) : []);
      })
      .catch(() => {
        setClients([]);
        setAccounts([]);
      });
  }, [user, canCreate]);

  const handleCreate = async () => {
    if (creating) return;
    if (!form.name.trim()) {
      toast.error("Completează numele proiectului.");
      return;
    }
    setCreating(true);
    try {
      await internApi.createProject({
        name: form.name.trim(),
        stage: form.stage,
        kind: form.kind,
        url: form.url || undefined,
        description: form.description || undefined,
        client_id: form.client_id === "none" ? null : form.client_id,
        owner_user_id: form.owner_user_id.trim() || undefined,
        recurring_service: form.recurring_enabled ? {
          enabled: true, service_name: form.recurring_name.trim(), price: Number(form.recurring_price),
          billing_cycle: form.recurring_cycle, next_billing_date: new Date(`${form.next_billing_date}T12:00:00`).getTime(), subscription_status: "active",
        } : undefined,
      }, projectKey.current);
      projectKey.current = crypto.randomUUID();
      window.dispatchEvent(new Event("avyron:projects-changed"));
      toast.success("Proiect creat în etapa selectată");
      setOpenCreate(false);
      setForm({ name: "", stage: "proposed" as ProjectStage, kind: "website_prezentare", url: "", description: "", client_id: "none", owner_user_id: "", recurring_enabled: false, recurring_name: "Mentenanță AVYRON", recurring_price: "", recurring_cycle: "monthly", next_billing_date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setCreating(false); }
  };

  if (authLoading) return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Se încarcă…</div>
    );

  const activeRows = isStaff
    ? rows.filter((project) => !["archived", "cancelled", "done", "completed"].includes(project.status) && project.banner_status !== "online")
    : rows;
  const workflowRows = rows.filter((project) => !["archived", "cancelled"].includes(project.status));

  return (
    <div className={embedded ? "space-y-6" : "max-w-5xl mx-auto p-4 sm:p-6 space-y-6"}>
      {!embedded && (
        <PageBackLink to="/profil" label="Înapoi" title="Înapoi la profil" />
      )}
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FolderKanban className="size-5 text-primary" />
            {isStaff && !mine ? "Platformă internă — Proiecte" : "Proiectele mele"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStaff && mine ? "Proiectele în care ești implicat, cu progresul și materialele lor." : isStaff
              ? "Proiecte în desfășurare și vânzări concretizate, fără date editoriale sau trafic."
              : "Aici vezi proiectele tale, statusul lor și poți propune modificări."}
          </p>
        </div>

        {canCreate && (
          <Dialog open={openCreate} onOpenChange={value => { if (!creating) setOpenCreate(value); }}>
            <DialogTrigger asChild>
              <button className="group relative inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-all hover:bg-zinc-900 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:ring-zinc-900/10 dark:hover:bg-zinc-100">
                <span className="relative flex size-5 items-center justify-center rounded-full bg-white/10 dark:bg-zinc-950/10">
                  <Plus className="size-3.5" strokeWidth={2.5} />
                </span>
                <span>Creează proiect</span>
                <ArrowUpRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" /> Proiect nou</DialogTitle>
                <DialogDescription>Alege etapa și beneficiarul. Adresa internă se generează automat; clientul poate fi asociat și ulterior din fișa sa.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label htmlFor="project-name">Nume *</Label><Input id="project-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Clar Lumânări" /></div>
                <div><Label htmlFor="project-stage">Etapă</Label><Select value={form.stage} onValueChange={value => setForm({ ...form, stage: value as ProjectStage })}><SelectTrigger id="project-stage"><SelectValue /></SelectTrigger><SelectContent>{PROJECT_STAGES.map(stage => <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>)}</SelectContent></Select></div>
                <div>
                  <Label>Tip</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as ProjectKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label>URL live</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://clarlumanari.ro" /></div>
                <div><Label>Descriere</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div>
                  <Label htmlFor="project-client">Client</Label>
                  <Select
                    value={form.client_id}
                    onValueChange={(clientId) => {
                      if (clientId === "new") { setNewClient(true); return; }
                      setForm({ ...form, client_id: clientId, owner_user_id: "", recurring_enabled: clientId === "none" ? false : form.recurring_enabled });
                    }}
                  >
                    <SelectTrigger id="project-client"><SelectValue placeholder="Selectează clientul" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fără client încă</SelectItem>
                      {canCreateClient && <SelectItem value="new">+ Client nou</SelectItem>}
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.company_name} · {client.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cont client asociat</Label>
                  <Select disabled={form.client_id === "none"} value={form.owner_user_id || "unassigned"} onValueChange={(value) => setForm({ ...form, owner_user_id: value === "unassigned" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="Selectează contul" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Fără cont asociat</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.display_name || account.company_name || account.email}{" "}
                          · {account.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {clients.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Poți crea un client nou aici sau poți continua fără client.</p>
                )}
                <fieldset className="rounded-xl border border-border/60 p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" disabled={form.client_id === "none"} checked={form.recurring_enabled} onChange={(event) => setForm({ ...form, recurring_enabled: event.target.checked })} />{" "}
                    Pornește proiectul cu mentenanță și abonament</label><p className="mt-1 text-[11px] text-muted-foreground">Proiectul, serviciul recurent și abonamentul clientului sunt create atomic și rămân sincronizate.</p>{form.recurring_enabled && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Label>Serviciu recurent</Label><Input value={form.recurring_name} onChange={(event) => setForm({ ...form, recurring_name: event.target.value })} /></div><div><Label>Preț RON</Label><Input type="number" min="0" step="1" value={form.recurring_price} onChange={(event) => setForm({ ...form, recurring_price: event.target.value })} /></div><div><Label>Ciclu</Label><Select value={form.recurring_cycle} onValueChange={(value) => setForm({ ...form, recurring_cycle: value as "monthly" | "yearly" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Lunar</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select></div><div className="sm:col-span-2"><Label>Prima facturare</Label><Input type="date" value={form.next_billing_date} onChange={(event) => setForm({ ...form, next_billing_date: event.target.value })} /></div></div>
                  )}</fieldset>
              </div>
              <DialogFooter>
                <Button variant="ghost" disabled={creating} onClick={() => setOpenCreate(false)}>Anulează</Button>
                <Button onClick={handleCreate} disabled={creating}>{creating ? "Se creează…" : "Creează"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {isStaff && (
        <div className="flex flex-wrap gap-2" aria-label="Afișare proiecte">
        {isStaff&&mine&&<Button type="button" size="sm" variant="outline" onClick={()=>setParams(current=>{const next=new URLSearchParams(current);next.delete('scope');return next},{replace:true})}>Vezi toate proiectele autorizate</Button>}
        <Button type="button" size="sm" variant={projectView === "pipeline" ? "default" : "outline"} aria-pressed={projectView === "pipeline"} onClick={() => setProjectView("pipeline")}><Columns3 className="mr-1.5 size-4" />Pipeline</Button>
        <Button type="button" size="sm" variant={projectView === "list" ? "default" : "outline"} aria-pressed={projectView === "list"} onClick={() => setProjectView("list")}><List className="mr-1.5 size-4" />Listă</Button>
      </div>
      )}

      <Dialog open={newClient} onOpenChange={value => { if (!savingClient) setNewClient(value); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Client nou</DialogTitle><DialogDescription>Datele minime se salvează în CRM-ul existent. Contul de acces și datele de facturare se pot completa din fișa clientului.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="new-client-name">Nume / denumire *</Label><Input id="new-client-name" maxLength={180} value={clientDraft.name} onChange={e => setClientDraft({ ...clientDraft, name: e.target.value })} /></div>
            <div><Label htmlFor="new-client-email">E-mail *</Label><Input id="new-client-email" type="email" maxLength={254} value={clientDraft.email} onChange={e => setClientDraft({ ...clientDraft, email: e.target.value })} /></div>
            <div><Label htmlFor="new-client-type">Tip client</Label><select id="new-client-type" className="w-full rounded-md border bg-background p-2 text-sm" value={clientDraft.type} onChange={e => setClientDraft({ ...clientDraft, type: e.target.value as ClientEntityType })}>{CLIENT_ENTITY_TYPES.map(type => <option key={type}>{type}</option>)}</select></div>
            <div><Label htmlFor="new-client-contact">Persoană de contact</Label><Input id="new-client-contact" maxLength={180} value={clientDraft.contact} onChange={e => setClientDraft({ ...clientDraft, contact: e.target.value })} /></div>
            <div><Label htmlFor="new-client-phone">Telefon</Label><Input id="new-client-phone" type="tel" maxLength={40} value={clientDraft.phone} onChange={e => setClientDraft({ ...clientDraft, phone: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" disabled={savingClient} onClick={() => setNewClient(false)}>Renunță</Button><Button disabled={savingClient} onClick={() => void createClient()}>{savingClient ? "Se salvează…" : "Salvează și selectează clientul"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {loading ? (
        <div className="text-sm text-muted-foreground">Se încarcă proiectele…</div>
      ) : (isStaff ? rows.length === 0 : activeRows.length === 0 && purchases.length === 0 && sales.length === 0) ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {canCreate
              ? "Nu există proiecte încă. Folosește butonul „Creează proiect”." : "Nu ai încă proiecte asignate. Vei fi anunțat când unul e disponibil."}
        </CardContent></Card>
      ) : (
        <>
          {/* Client hero-banner: statusul proiectului lor principal (primul) */}
          {!isStaff && rows[0] && (() => {
            const p = rows[0];
            const B = BANNER[p.banner_status] ?? BANNER.in_progress;
            return (
              <Link
                to={`/intern/projects/${p.slug}`}
                className={`block rounded-2xl border-2 p-5 sm:p-6 transition hover:shadow-lg ${B.cls}`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
                  <span className="size-2 rounded-full bg-current animate-pulse" />
                  Status proiect
                </div>
                <p className="mt-1 text-3xl sm:text-4xl font-semibold">{B.label}</p>
                <p className="mt-2 text-sm opacity-90">{p.name} · dă click pentru detalii, propuneri și abonament</p>
              </Link>
            );
          })()}

          {isStaff && projectView === "pipeline" && (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4" aria-label="Pipeline proiecte">
            {PROJECT_STAGES.map((stage) => {
              const status = stage.banner;
              const projects = workflowRows.filter((project) => projectStage(project) === stage.id);
              return (
                  <details open key={status} aria-label={stage.label} className="min-w-0 rounded-2xl border border-border/60 bg-card/40 p-3">
                <summary className="mb-3 flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold"><span>{stage.label}</span><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{projects.length} ▾</span></summary>
                <div className="space-y-2">{projects.map((project) => (
                        <ProjectSummaryCard key={project.id} project={project}/>))}{projects.length === 0 && (
                        <p className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">Niciun proiect.</p>
                      )}</div>
              </details>
                );
            })}
          </div>
          )}

          {isStaff && projectView === "list" && activeRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">Nu există proiecte active în listă. Verifică pipeline-ul pentru cele finalizate sau online.</p>
          )}
          {(!isStaff || projectView === "list") && (
            <div className="grid gap-3 sm:grid-cols-2">
            {[...new Set(activeRows.map((row) =>row.kind))].map(
                (category) => (
                  <details open key={category} className="min-w-0 rounded-xl border bg-card/30 p-3"><summary className="mb-3 cursor-pointer text-sm font-semibold">{KINDS.find((kind) =>kind.value===category)?.label||category}{" "}
                      ·{" "}
                      {activeRows.filter((row) =>row.kind===category).length}</summary><div className="space-y-3">{activeRows.filter((row) =>row.kind===category).map((p) => <ProjectSummaryCard key={p.id} project={p}/>)}</div></details>),
              )}
          </div>
          )}

          {isStaff && sales.length > 0 && (
            <section className="space-y-3" aria-labelledby="confirmed-sales-title">
              <div>
                <h2 id="confirmed-sales-title" className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="size-4 text-emerald-500" /> Vânzări concretizate</h2>
                <p className="text-xs text-muted-foreground">Încasări confirmate sau parțial confirmate pentru website-uri, aplicații, identitate, logo și alte servicii.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sales.map((sale) => (
                  <article key={sale.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><h3 className="truncate font-medium">{sale.project_name || sale.name}</h3><p className="mt-1 text-xs text-muted-foreground">{sale.name} · {sale.revenue_type.replace(/_/g, " ")}</p></div>
                      <Badge variant="secondary" className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">{sale.status === "paid" ? "Încasat" : "Parțial"}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-emerald-500/10 pt-3 text-xs"><span className="text-muted-foreground">{new Date(sale.updated_at).toLocaleDateString("ro-RO")}</span><span className="font-semibold">{new Intl.NumberFormat("ro-RO", { style: "currency", currency: sale.currency }).format(sale.total_cents / 100)}</span></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!isStaff && purchases.length > 0 && (
            <section className="space-y-3" aria-labelledby="activated-purchases-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="activated-purchases-title" className="text-lg font-semibold">Produse și servicii activate</h2>
                  <p className="text-xs text-muted-foreground">Achizițiile confirmate sunt sincronizate automat cu contul și rămân vizibile aici.</p>
                </div>
                <Link to="/profil?tab=subscriptions" className="text-xs font-medium text-primary hover:underline">Facturi și abonamente</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {purchases.map((purchase) => (
                  <article key={purchase.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-500"><CheckCircle2 className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium leading-snug">{purchase.name}</h3>
                          <Badge variant="secondary" className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">Plătit</Badge>
                        </div>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">{purchase.kind === "subscription" ? "Abonament" : purchase.kind === "product" ? "Produs" : "Serviciu"}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/10 pt-3 text-xs">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Receipt className="size-3.5" /> {" "}
                            {purchase.id.slice(0, 8).toUpperCase()}</span>
                          <span className="font-semibold">{new Intl.NumberFormat("ro-RO", { style: "currency", currency: purchase.currency }).format(purchase.total_cents / 100)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!embedded && <ContactRail />}
    </div>
  );
}
