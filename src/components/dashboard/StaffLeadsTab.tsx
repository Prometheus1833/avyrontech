import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Building2, CalendarDays, Columns3, Clock3, History, List, Mail, Phone, Plus, RefreshCw, Search, Star, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { leadsApi, type LeadDeletionReasonCode, type LeadListRow, type LeadStage } from "@/lib/leadsApi";
import { LeadDetailDialog } from "@/components/dashboard/leads/LeadDetailDialog";
import { NewLeadDialog } from "@/components/dashboard/leads/NewLeadDialog";
import { LeadDeleteDialog, LeadDeletionLogDialog } from "@/components/dashboard/leads/LeadDeletionDialogs";

const STAGES = [
  ["new_lead", "Lead nou"], ["contacted", "Contactat"], ["discussion", "Discuție"],
  ["potential_client", "Potențial client"], ["offer", "Ofertă"],
  ["accepted", "Acceptat"], ["rejected", "Respins"], ["converted", "Proiect"],
] as const;

const field = "rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

type StaffLeadsTabProps = {
  title?: string;
  description?: string;
  sourceFilter?: (lead: LeadListRow) => boolean;
  allowCreate?: boolean;
};

export const StaffLeadsTab = ({
  title = "Leaduri",
  description = "Pipeline unic, surse, priorități și următorul pas comercial.",
  sourceFilter,
  allowCreate = true,
}: StaffLeadsTabProps = {}) => {
  const [rows, setRows] = useState<LeadListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<LeadListRow | null>(null);
  const [deletionLogOpen, setDeletionLogOpen] = useState(false);
  const [platformRole, setPlatformRole] = useState<"platform_owner" | "superadmin" | null>(null);
  const [view, setView] = useState<"list" | "pipeline">("list");
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await leadsApi.list();
      const next = (sourceFilter ? result.data.filter(sourceFilter) : result.data).sort((a, b) => b.created_at - a.created_at);
      setRows(next);
      setPreviewLeadId((current) => current && next.some((lead) => lead.id === current) ? current : next[0]?.id || null);
      setPlatformRole(result.platformRole);
    } catch {
      toast.error("Nu am putut încărca pipeline-ul Leads. Verifică sesiunea MFA.");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => { void load(); }, [load]);

  const update = async (lead: LeadListRow, patch: { lifecycleStage?: LeadStage; urgent?: boolean }) => {
    setSaving(lead.id);
    try {
      await leadsApi.update(lead.id, patch);
      setRows((current) => current.map((row) => row.id === lead.id ? {
        ...row,
        lifecycle_stage: patch.lifecycleStage ?? row.lifecycle_stage,
        urgent: patch.urgent === undefined ? row.urgent : Number(patch.urgent),
      } : row));
    } catch {
      toast.error("Lead-ul nu a putut fi actualizat.");
    } finally {
      setSaving(null);
    }
  };

  const remove = async (reasonCode: LeadDeletionReasonCode, reasonDetail: string) => {
    if (!deletingLead) return;
    const lead = deletingLead;
    setSaving(lead.id);
    try {
      await leadsApi.remove(lead.id, { reasonCode, reasonDetail });
      setRows((current) => current.filter((row) => row.id !== lead.id));
      if (selectedLeadId === lead.id) setSelectedLeadId(null);
      setDeletingLead(null);
      toast.success("Lead-ul a fost șters din pipeline.");
    } catch { toast.error("Lead-ul nu a putut fi șters."); }
    finally { setSaving(null); }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = !needle ? rows : rows.filter((lead) => [lead.name, lead.business, lead.email, lead.phone, lead.product, lead.source]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(needle)));
    return [...matches].sort((a, b) => b.created_at - a.created_at);
  }, [query, rows]);
  const previewLead = filtered.find((lead) => lead.id === previewLeadId) || filtered[0] || null;

  const urgentCount = rows.filter((lead) => lead.urgent === 1).length;
  const waitingCount = rows.filter((lead) => lead.lifecycle_stage === "new_lead").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowCreate && <Button type="button" onClick={() => setNewLeadOpen(true)} className="rounded-xl"><Plus /> Lead nou</Button>}
          {platformRole && <Button type="button" variant="outline" onClick={() => setDeletionLogOpen(true)} className="rounded-xl"><History /> Jurnal ștergeri</Button>}
          <Button type="button" variant="outline" onClick={() => void load()} className="rounded-xl"><RefreshCw /> Reîmprospătează</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total accesibil" value={rows.length} />
        <Metric label="Lead-uri noi" value={waitingCount} />
        <Metric label="Urgente" value={urgentCount} alert={urgentCount > 0} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Caută leaduri</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută după client, contact, serviciu sau sursă…"
            className="w-full rounded-xl border border-border/60 bg-background/80 py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
        </label>
        <div className="inline-flex self-start rounded-xl border border-border/60 bg-card p-1" aria-label="Mod de afișare">
          <button type="button" onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><List className="size-3.5" /> Listă</button>
          <button type="button" onClick={() => setView("pipeline")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${view === "pipeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Columns3 className="size-3.5" /> Pipeline</button>
        </div>
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-2xl bg-muted/50" aria-label="Se încarcă" /> : (
        view === "list" ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.7fr)]">
          <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/50">
            <div className="hidden grid-cols-[minmax(180px,1.3fr)_minmax(130px,.8fr)_120px_130px_84px] gap-3 border-b border-border/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:grid">
              <span>Client</span><span>Interes</span><span>Etapă</span><span>Introdus</span><span>Acțiuni</span>
            </div>
            <div className="divide-y divide-border/50">
              {filtered.map((lead) => <article key={lead.id} className={`grid gap-3 p-3 transition md:grid-cols-[minmax(180px,1.3fr)_minmax(130px,.8fr)_120px_130px_84px] md:items-center md:px-4 ${previewLead?.id === lead.id ? "bg-primary/[0.06]" : "hover:bg-muted/30"}`}>
                <button type="button" onClick={() => setPreviewLeadId(lead.id)} className="min-w-0 text-left">
                  <span className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UserRound className="size-3.5" /></span><span className="min-w-0"><strong className="block truncate text-sm">{lead.name || lead.business || "Lead fără nume"}</strong><span className="block truncate text-[11px] text-muted-foreground">{lead.business || lead.email || lead.phone || "Contact necompletat"}</span></span></span>
                </button>
                <div className="min-w-0"><p className="truncate text-xs font-medium">{lead.product || "Serviciu neclasificat"}</p><p className="truncate text-[10px] text-muted-foreground">{lead.source || "Sursă necunoscută"}</p></div>
                <select value={lead.lifecycle_stage} disabled={saving === lead.id || lead.lifecycle_stage === "converted"} onChange={(event) => void update(lead, { lifecycleStage: event.target.value as LeadStage })} className={field}>
                  {STAGES.filter(([value]) => value !== "converted").map(([value, stageLabel]) => <option key={value} value={value}>{stageLabel}</option>)}
                  {lead.lifecycle_stage === "converted" && <option value="converted">Proiect</option>}
                </select>
                <div className="text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> {new Date(lead.created_at).toLocaleDateString("ro-RO")}</span>{lead.next_follow_up_at && <p className={lead.next_follow_up_at < Date.now() ? "mt-1 text-red-500" : "mt-1"}>Follow-up {new Date(lead.next_follow_up_at).toLocaleDateString("ro-RO")}</p>}</div>
                <div className="flex items-center justify-end gap-1"><button type="button" aria-label="Marchează urgent" onClick={() => void update(lead, { urgent: !lead.urgent })} className={`rounded-lg p-2 ${lead.urgent ? "text-amber-500" : "text-muted-foreground hover:bg-muted"}`}><Star className="size-3.5" fill={lead.urgent ? "currentColor" : "none"} /></button><button type="button" aria-label="Șterge" onClick={() => setDeletingLead(lead)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3.5" /></button></div>
              </article>)}
              {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nu există leaduri pentru filtrul curent.</p>}
            </div>
          </section>
          <aside className="h-fit rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-card p-4 xl:sticky xl:top-20">
            {previewLead ? <div className="space-y-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">Mini-profil client</p><h3 className="mt-1 text-lg font-semibold">{previewLead.name || previewLead.business || "Lead fără nume"}</h3><p className="text-xs text-muted-foreground">{previewLead.business || "Persoană fizică / necompletat"}</p></div>{previewLead.urgent === 1 && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-600">Urgent</span>}</div>
              <div className="grid gap-2 text-xs"><p className="rounded-xl border border-border/60 bg-background/60 p-3"><span className="block text-[10px] uppercase text-muted-foreground">Interes</span>{previewLead.product || "Neclasificat"}</p><p className="rounded-xl border border-border/60 bg-background/60 p-3"><span className="block text-[10px] uppercase text-muted-foreground">Sursă</span>{previewLead.source || "Necunoscută"}</p></div>
              <div className="flex flex-wrap gap-2">{previewLead.email && <a href={`mailto:${previewLead.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-2 text-xs hover:bg-muted"><Mail className="size-3.5" /> Email</a>}{previewLead.phone && <a href={`tel:${previewLead.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-2 text-xs hover:bg-muted"><Phone className="size-3.5" /> Telefon</a>}</div>
              <Button type="button" className="w-full rounded-xl" onClick={() => setSelectedLeadId(previewLead.id)}>Deschide fișa completă <ArrowRight className="size-4" /></Button>
            </div> : <p className="text-sm text-muted-foreground">Selectează un lead pentru mini-profil.</p>}
          </aside>
        </div> : <div className="pb-3 lg:overflow-x-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[1320px] lg:grid-cols-8">
            {STAGES.map(([stage, label]) => {
              const leads = filtered.filter((lead) => lead.lifecycle_stage === stage);
              return (
                <section key={stage} className="min-h-64 rounded-2xl border border-border/60 bg-muted/20 p-2.5">
                  <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-medium">
                    <span>{label}</span><span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground">{leads.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {leads.map((lead) => (
                      <article key={lead.id} className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => setSelectedLeadId(lead.id)} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                            <p className="truncate text-sm font-medium">{lead.name || lead.business || "Lead fără nume"}</p>
                            {lead.business && lead.name && <p className="truncate text-[11px] text-muted-foreground">{lead.business}</p>}
                          </button>
                          <div className="flex items-center gap-1">
                            <button type="button" disabled={saving === lead.id} aria-label={lead.urgent ? "Elimină urgența" : "Marchează urgent"} onClick={() => void update(lead, { urgent: !lead.urgent })} className={`rounded-md p-1 ${lead.urgent ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}><Star className="size-4" fill={lead.urgent ? "currentColor" : "none"} /></button>
                            <button type="button" disabled={saving === lead.id} aria-label="Șterge lead-ul" onClick={() => setDeletingLead(lead)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                          </div>
                        </div>
                        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          <Building2 className="size-3" /> {lead.product || lead.source || "Sursă neclasificată"}
                        </p>
                        <div className="flex gap-1">
                          {lead.email && <a href={`mailto:${lead.email}`} aria-label="Trimite email" className="rounded-md border border-border/60 p-1.5 hover:bg-muted"><Mail className="size-3.5" /></a>}
                          {lead.phone && <a href={`tel:${lead.phone}`} aria-label="Apelează" className="rounded-md border border-border/60 p-1.5 hover:bg-muted"><Phone className="size-3.5" /></a>}
                        </div>
                        <select value={lead.lifecycle_stage} disabled={saving === lead.id || lead.lifecycle_stage === "converted"}
                          onChange={(event) => void update(lead, { lifecycleStage: event.target.value as LeadStage })} className={`w-full ${field}`}>
                          {STAGES.filter(([value]) => value !== "converted").map(([value, stageLabel]) => <option key={value} value={value}>{stageLabel}</option>)}
                          {lead.lifecycle_stage === "converted" && <option value="converted">Proiect</option>}
                        </select>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span>{new Date(lead.created_at).toLocaleDateString("ro-RO")}</span>
                          {lead.next_follow_up_at && <span className={`inline-flex items-center gap-1 ${lead.next_follow_up_at < Date.now() ? "text-red-500" : ""}`}><Clock3 className="size-3" /> {new Date(lead.next_follow_up_at).toLocaleDateString("ro-RO")}</span>}
                        </div>
                        <button type="button" onClick={() => setSelectedLeadId(lead.id)} className="w-full rounded-lg border border-border/60 px-2 py-1.5 text-xs font-medium hover:bg-muted">Deschide fișa</button>
                      </article>
                    ))}
                    {leads.length === 0 && <p className="rounded-xl border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">Niciun lead în această etapă.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {allowCreate && <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onCreated={(id) => { void load(); setSelectedLeadId(id); }} />}
      <LeadDetailDialog leadId={selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)} onChanged={() => void load()} onDeleted={() => { setSelectedLeadId(null); void load(); }} />
      <LeadDeleteDialog lead={deletingLead} open={deletingLead !== null} busy={Boolean(deletingLead && saving === deletingLead.id)} onOpenChange={(open) => !open && setDeletingLead(null)} onConfirm={remove} />
      <LeadDeletionLogDialog open={deletionLogOpen} onOpenChange={setDeletionLogOpen} />
    </div>
  );
};

const Metric = ({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{alert && <AlertCircle className="size-3.5 text-amber-500" />}{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);
