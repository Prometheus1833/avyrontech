import { useCallback, useEffect, useState } from "react";
import { Archive, RefreshCw, RotateCcw } from "lucide-react";
import { leadsApi, type LeadListRow } from "@/lib/leadsApi";
import { LEAD_ARCHIVE_REASONS, type LeadArchiveReason } from "@/shared/leadArchive";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export function LeadArchiveDialog({ lead, onClose, onDone, restore = false }: { lead: LeadListRow | null; onClose: () => void; onDone: () => void; restore?: boolean }) {
  const [reason, setReason] = useState<LeadArchiveReason | "">(""), [note, setNote] = useState(""), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { setReason(""); setNote(""); setConfirmed(false); setError(""); }, [lead?.id,restore]);
  return <Dialog open={!!lead} onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
    <DialogHeader><DialogTitle>{restore ? "Restaurează leadul" : "Arhivează leadul"}</DialogTitle><DialogDescription>{lead?.name || lead?.business || "Lead fără nume"} · {restore ? "Leadul revine în etapa și lista activă păstrate." : "Fișa și istoricul se păstrează. Leadul este mutat din pipeline în lista de arhivate."}</DialogDescription></DialogHeader>
    {!restore && <><label className="space-y-1 text-sm"><span>Motivul arhivării *</span><select className="w-full rounded-xl border bg-background p-3" value={reason} onChange={e => setReason(e.target.value as LeadArchiveReason)}><option value="">Selectează motivul</option>{LEAD_ARCHIVE_REASONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}</select></label><label className="space-y-1 text-sm"><span>Detalii interne</span><textarea className="w-full rounded-xl border bg-background p-3" rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label></>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Confirm {restore ? "restaurarea" : "arhivarea"} acestei fișe.</label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <Button disabled={busy || !confirmed || (!restore && !reason)} onClick={async () => {
      if (!lead || (!restore && !reason) || busy) return; setBusy(true); setError("");
      try { if (restore) await leadsApi.restore(lead); else await leadsApi.archive(lead, reason as LeadArchiveReason, note); onClose(); onDone(); }
      catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Se salvează…" : restore ? "Confirmă restaurarea" : "Confirmă arhivarea"}</Button>
  </DialogContent></Dialog>;
}
export function LeadArchiveList({ onOpen, onChanged }: { onOpen: (id: string) => void; onChanged: () => void }) {
  const [nextOffset, setNextOffset] = useState<number|null>(null);
  const [rows, setRows] = useState<LeadListRow[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(""), [query, setQuery] = useState(""), [restoring, setRestoring] = useState<LeadListRow | null>(null);
  const load = useCallback(async (offset = 0) => { setBusy(true); setError(""); try { const result = await leadsApi.archived(offset); setRows(old => offset ? [...old, ...result.data] : result.data); setNextOffset(result.nextOffset); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = rows.filter(r => [r.name,r.business,r.phone,r.email,r.archive_note,LEAD_ARCHIVE_REASONS.find(reason => reason.code === r.archive_reason)?.label].filter(Boolean).join(" ").toLocaleLowerCase("ro").includes(query.toLocaleLowerCase("ro")));
  return <section aria-label="Leaduri arhivate" className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><Archive className="size-4" />Leaduri arhivate · {rows.length}</h3><Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}><RefreshCw className="size-4" />Actualizează arhiva</Button></div>
    <label className="block text-sm">Caută în înregistrările încărcate<input className="mt-1 w-full rounded-xl border bg-background p-2.5" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nume, firmă, telefon sau detalii" /></label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {busy && <p role="status" className="text-sm text-muted-foreground">Se încarcă arhiva…</p>}
    <div className="grid gap-2 md:grid-cols-2">{filtered.map(lead => <article className="min-w-0 rounded-xl border border-border/60 p-3" key={lead.id}><h4 className="break-words text-sm font-semibold">{lead.name || lead.business || "Lead fără nume"}</h4><p className="mt-1 text-xs text-muted-foreground">{LEAD_ARCHIVE_REASONS.find(r=>r.code===lead.archive_reason)?.label} · {lead.archived_at ? new Date(lead.archived_at).toLocaleDateString("ro-RO") : ""}</p>{lead.archive_note && <p className="mt-2 break-words whitespace-pre-wrap text-xs">{lead.archive_note}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => onOpen(lead.id)}>Deschide fișa leadului</Button><Button variant="outline" size="sm" disabled={lead.can_archive === 0} onClick={() => setRestoring(lead)}><RotateCcw className="size-3.5" />Restaurează</Button></div></article>)}</div>
    {!busy && !error && !filtered.length && <p className="text-sm text-muted-foreground">Nu există leaduri arhivate pentru căutarea curentă.</p>}
    {nextOffset != null && <Button variant="outline" disabled={busy} onClick={() => void load(nextOffset)}>Încarcă mai multe din arhivă</Button>}
    <LeadArchiveDialog restore lead={restoring} onClose={() => setRestoring(null)} onDone={() => { void load(); onChanged(); }} />
  </section>;
}
