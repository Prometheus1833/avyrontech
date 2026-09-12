import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, Clock3, Mail, Phone, Plus, RefreshCw, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { leadsApi, type LeadListRow, type LeadStage } from "@/lib/leadsApi";
import { LeadDetailDialog } from "@/components/dashboard/leads/LeadDetailDialog";
import { NewLeadDialog } from "@/components/dashboard/leads/NewLeadDialog";

const STAGES = [
  ["new_lead", "Lead nou"], ["contacted", "Contactat"], ["discussion", "Discuție"],
  ["potential_client", "Potențial client"], ["offer", "Ofertă"],
  ["accepted", "Acceptat"], ["rejected", "Respins"], ["converted", "Proiect"],
] as const;

const field = "rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export const StaffLeadsTab = () => {
  const [rows, setRows] = useState<LeadListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await leadsApi.list();
      setRows(result.data);
    } catch {
      toast.error("Nu am putut încărca pipeline-ul Leads. Verifică sesiunea MFA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((lead) => [lead.name, lead.business, lead.email, lead.phone, lead.product, lead.source]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(needle)));
  }, [query, rows]);

  const urgentCount = rows.filter((lead) => lead.urgent === 1).length;
  const waitingCount = rows.filter((lead) => lead.lifecycle_stage === "new_lead").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Leads</h2>
          <p className="text-sm text-muted-foreground">Pipeline unic, surse, priorități și următorul pas comercial.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setNewLeadOpen(true)} className="rounded-xl"><Plus /> Lead nou</Button>
          <Button type="button" variant="outline" onClick={() => void load()} className="rounded-xl"><RefreshCw /> Reîmprospătează</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total accesibil" value={rows.length} />
        <Metric label="Lead-uri noi" value={waitingCount} />
        <Metric label="Urgente" value={urgentCount} alert={urgentCount > 0} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută după client, contact, produs sau sursă…"
          className="w-full rounded-xl border border-border/60 bg-background/80 py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-2xl bg-muted/50" aria-label="Se încarcă" /> : (
        <div className="overflow-x-auto pb-3">
          <div className="grid min-w-[1320px] grid-cols-8 gap-3">
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
                          <button type="button" disabled={saving === lead.id} aria-label={lead.urgent ? "Elimină urgența" : "Marchează urgent"}
                            onClick={() => void update(lead, { urgent: !lead.urgent })}
                            className={`rounded-md p-1 ${lead.urgent ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}>
                            <Star className="size-4" fill={lead.urgent ? "currentColor" : "none"} />
                          </button>
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
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onCreated={(id) => { void load(); setSelectedLeadId(id); }} />
      <LeadDetailDialog leadId={selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)} onChanged={() => void load()} />
    </div>
  );
};

const Metric = ({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{alert && <AlertCircle className="size-3.5 text-amber-500" />}{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);
