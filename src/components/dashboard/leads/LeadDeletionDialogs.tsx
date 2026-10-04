import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  leadsApi,
  type LeadDeletionLog,
  type LeadDeletionReasonCode,
  type LeadListRow,
} from "@/lib/leadsApi";

const reasons: Array<{ code: LeadDeletionReasonCode; label: string; hint: string }> = [
  { code: "duplicate", label: "Înregistrare duplicată", hint: "Același contact există deja într-o fișă activă." },
  { code: "spam", label: "Spam sau solicitare abuzivă", hint: "Mesaj automat, irelevant sau rău intenționat." },
  { code: "test_entry", label: "Înregistrare de test", hint: "Date create doar pentru verificarea platformei." },
  { code: "invalid_contact", label: "Date de contact nevalide", hint: "Contactul nu poate fi identificat sau verificat." },
  { code: "withdrawn", label: "Solicitare retrasă", hint: "Persoana a cerut închiderea solicitării comerciale." },
  { code: "outside_scope", label: "În afara serviciilor AVYRON", hint: "Cererea nu poate fi preluată în pipeline-ul comercial." },
  { code: "other", label: "Alt motiv", hint: "Descrie clar motivul pentru jurnalul de audit." },
];

const leadDeletionReasonLabel = (code: string | null) => reasons.find((item) => item.code === code)?.label || "Motiv indisponibil";

const suggestLeadDeletionReason = (lead: Pick<LeadListRow, "name" | "business" | "email" | "phone" | "source" | "lifecycle_stage">): LeadDeletionReasonCode => {
  const searchable = [lead.name, lead.business, lead.email, lead.source].filter(Boolean).join(" ").toLowerCase();
  if (/\b(test|demo|fixture|exemplu)\b/.test(searchable)) return "test_entry";
  if (!lead.email && !lead.phone) return "invalid_contact";
  if (lead.lifecycle_stage === "rejected") return "withdrawn";
  return "duplicate";
};

export function LeadDeleteDialog({ lead, open, busy, onOpenChange, onConfirm }: {
  lead: LeadListRow | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonCode: LeadDeletionReasonCode, reasonDetail: string) => Promise<void>;
}) {
  const suggested = useMemo(() => lead ? suggestLeadDeletionReason(lead) : "duplicate", [lead]);
  const [reasonCode, setReasonCode] = useState<LeadDeletionReasonCode>(suggested);
  const [reasonDetail, setReasonDetail] = useState("");

  useEffect(() => { if (open) { setReasonCode(suggested); setReasonDetail(""); } }, [open, suggested]);
  const label = lead?.name || lead?.business || "acest lead";
  const detailRequired = reasonCode === "other";

  return <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
    <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Trash2 className="size-5 text-destructive" /> Elimină lead-ul din pipeline</DialogTitle>
        <DialogDescription>
          {label} va dispărea din liste și din sumarul CRM. Fișa rămâne ca înregistrare restricționată, iar motivul și autorul sunt păstrate în jurnalul vizibil super-adminilor.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
        Motiv recomandat pe baza fișei: <strong>{leadDeletionReasonLabel(suggested)}</strong>. Verifică alegerea înainte de confirmare.
      </div>
      <RadioGroup value={reasonCode} onValueChange={(value) => setReasonCode(value as LeadDeletionReasonCode)} className="gap-2">
        {reasons.map((reason) => <label key={reason.code} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${reasonCode === reason.code ? "border-primary/45 bg-primary/[0.06]" : "border-border/60 hover:bg-muted/50"}`}>
          <RadioGroupItem value={reason.code} className="mt-0.5" />
          <span><span className="block text-sm font-medium">{reason.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{reason.hint}</span></span>
        </label>)}
      </RadioGroup>
      <label className="grid gap-1.5 text-xs text-muted-foreground">
        Detalii {detailRequired ? "obligatorii" : "opționale"}
        <textarea value={reasonDetail} onChange={(event) => setReasonDetail(event.target.value)} maxLength={500} placeholder="Context scurt, fără date sensibile suplimentare…" className="min-h-20 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
        <span className="text-right">{reasonDetail.length}/500</span>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Anulează</Button>
        <Button type="button" variant="destructive" disabled={busy || (detailRequired && reasonDetail.trim().length < 5)} onClick={() => void onConfirm(reasonCode, reasonDetail.trim())}>
          {busy && <LoaderCircle className="animate-spin" />} Confirmă eliminarea
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}

export function LeadDeletionLogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [rows, setRows] = useState<LeadDeletionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true; setLoading(true); setError("");
    void leadsApi.deletionLog().then((result) => { if (active) setRows(result.data); }).catch(() => { if (active) setError("Jurnalul nu a putut fi încărcat."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-600" /> Jurnal leaduri eliminate</DialogTitle><DialogDescription>Acces restricționat super-adminilor. Intrările sunt recuperabile din D1 și nu reapar în pipeline.</DialogDescription></DialogHeader>
      {loading && <div className="grid min-h-32 place-items-center"><LoaderCircle className="size-6 animate-spin" /></div>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!loading && !error && <div className="space-y-2">
        {rows.map((row) => <article key={row.id} className="rounded-xl border border-border/60 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{row.lead_label}</p>{row.business && row.business !== row.lead_label && <p className="text-xs text-muted-foreground">{row.business}</p>}</div><time className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</time></div>
          <p className="mt-2 text-xs"><strong>{leadDeletionReasonLabel(row.reason_code)}</strong>{row.reason_detail ? ` · ${row.reason_detail}` : ""}</p>
          <p className="mt-1 break-all text-[11px] text-muted-foreground">Autor: {row.actor_email || row.actor_user_id || "necunoscut"} · ID: {row.lead_id}</p>
        </article>)}
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">Nu există leaduri eliminate.</p>}
      </div>}
    </DialogContent>
  </Dialog>;
}
