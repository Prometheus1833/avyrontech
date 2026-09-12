import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, Clock3, ExternalLink, LoaderCircle, Mail, MessageCircle, Phone, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  leadsApi,
  type LeadChannel,
  type LeadDetailResponse,
  type LeadStage,
} from "@/lib/leadsApi";

const field = "w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const stageOptions: Array<[LeadStage, string]> = [
  ["new_lead", "Inițiat"], ["contacted", "Contactat"], ["discussion", "Discutat"],
  ["potential_client", "Potențial client"], ["offer", "Ofertă"],
  ["accepted", "Acceptat"], ["rejected", "Pierdut"], ["converted", "Proiect"],
];
const activityOptions = [
  ["note", "Notă internă"], ["call", "Telefon"], ["whatsapp", "WhatsApp"],
  ["email", "Email"], ["sms", "SMS"], ["social", "Social"], ["offer", "Ofertă"],
] as const;
type ActivityKind = (typeof activityOptions)[number][0];

const dateTimeLocal = (value: number | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(value - offset).toISOString().slice(0, 16);
};

const whatsAppHref = (phone: string) => {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `40${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
};

const formatDate = (value: number) => new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest",
}).format(value);

export function LeadDetailDialog({ leadId, onOpenChange, onChanged }: {
  leadId: string | null; onOpenChange: (open: boolean) => void; onChanged: () => void;
}) {
  const [detail, setDetail] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<LeadStage>("new_lead");
  const [urgent, setUrgent] = useState(false);
  const [channel, setChannel] = useState<LeadChannel | "">("");
  const [followUp, setFollowUp] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [activityKind, setActivityKind] = useState<ActivityKind>("note");
  const [activityText, setActivityText] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderNote, setReminderNote] = useState("");

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const result = await leadsApi.detail(leadId);
      setDetail(result);
      setStage(result.data.lifecycle_stage);
      setUrgent(result.data.urgent === 1);
      setChannel(result.data.preferred_channel ?? "");
      setFollowUp(dateTimeLocal(result.data.next_follow_up_at));
      setLostReason(result.data.lost_reason ?? "");
    } catch {
      toast.error("Fișa lead-ului nu a putut fi încărcată.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { void load(); }, [load]);
  const pendingReminders = useMemo(() => detail?.reminders.filter((item) => item.status === "pending") ?? [], [detail]);

  const save = async () => {
    if (!leadId || !detail?.canEdit) return;
    setSaving(true);
    try {
      await leadsApi.update(leadId, {
        lifecycleStage: stage,
        urgent,
        preferredChannel: channel || null,
        nextFollowUpAt: followUp ? new Date(followUp).getTime() : null,
        lostReason: stage === "rejected" ? lostReason : null,
      });
      toast.success("Fișa lead-ului a fost actualizată.");
      await load();
      onChanged();
    } catch {
      toast.error("Actualizarea nu a putut fi salvată.");
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async (kind: ActivityKind = activityKind, content = activityText) => {
    if (!leadId || !content.trim()) return;
    setSaving(true);
    try {
      const external = ["call", "email", "whatsapp", "sms", "social"].includes(kind);
      await leadsApi.addActivity(leadId, {
        kind, direction: external ? "outbound" : "internal", outcome: external ? "contacted" : "recorded", content,
      });
      if (external && detail?.data.lifecycle_stage === "new_lead") {
        await leadsApi.update(leadId, { lifecycleStage: "contacted" });
      }
      setActivityText("");
      toast.success("Activitatea a fost adăugată în istoric.");
      await load();
      onChanged();
    } catch {
      toast.error("Activitatea nu a putut fi înregistrată.");
    } finally {
      setSaving(false);
    }
  };

  const addReminder = async () => {
    if (!leadId || !reminderAt || !reminderNote.trim()) return;
    setSaving(true);
    try {
      await leadsApi.addReminder(leadId, { dueAt: new Date(reminderAt).getTime(), note: reminderNote });
      setReminderAt(""); setReminderNote("");
      toast.success("Reminderul a fost programat.");
      await load();
      onChanged();
    } catch {
      toast.error("Alege o dată viitoare și completează nota reminderului.");
    } finally {
      setSaving(false);
    }
  };

  const closeReminder = async (id: string) => {
    if (!leadId) return;
    await leadsApi.closeReminder(leadId, id, "done");
    await load();
    onChanged();
  };

  const recordContact = (kind: ActivityKind, label: string) => void addActivity(kind, `Contactare ${label} confirmată manual.`);
  const lead = detail?.data;

  return (
    <Dialog open={leadId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{lead?.name || lead?.business || "Fișă lead"}</DialogTitle>
          <DialogDescription>{lead?.business && lead?.name ? lead.business : "Istoric, contactări, responsabilitate și următorul pas."}</DialogDescription>
        </DialogHeader>
        {loading && <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-6 animate-spin" /></div>}
        {!loading && lead && detail && (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">Stare și follow-up</h3>
                  <button type="button" disabled={!detail.canEdit} onClick={() => setUrgent((value) => !value)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${urgent ? "border-amber-500/50 text-amber-600" : "border-border/60 text-muted-foreground"}`}>
                    <Star className="size-3.5" fill={urgent ? "currentColor" : "none"} /> {urgent ? "Urgent" : "Marchează urgent"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">Etapă
                    <select className={field} value={stage} disabled={!detail.canEdit || stage === "converted"} onChange={(e) => setStage(e.target.value as LeadStage)}>
                      {stageOptions.filter(([value]) => value !== "converted" || stage === "converted").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">Canal preferat
                    <select className={field} value={channel} disabled={!detail.canEdit} onChange={(e) => setChannel(e.target.value as LeadChannel | "")}>
                      <option value="">Nespecificat</option><option value="phone">Telefon</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option><option value="social">Social</option>
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground sm:col-span-2">Următorul follow-up
                    <input type="datetime-local" className={field} value={followUp} disabled={!detail.canEdit} onChange={(e) => setFollowUp(e.target.value)} />
                  </label>
                </div>
                {stage === "rejected" && <label className="block text-xs text-muted-foreground">Motiv pierdere<textarea className={`${field} mt-1 min-h-20`} value={lostReason} onChange={(e) => setLostReason(e.target.value)} maxLength={1000} /></label>}
                {detail.canEdit && <Button type="button" onClick={() => void save()} disabled={saving} size="sm" className="rounded-xl"><Save /> Salvează</Button>}
              </section>

              <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <h3 className="font-medium">Contact</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.phone && <><Button asChild variant="outline" size="sm"><a href={`tel:${lead.phone}`}><Phone /> Sună</a></Button><Button asChild variant="outline" size="sm"><a href={whatsAppHref(lead.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button><Button asChild variant="outline" size="sm"><a href={`sms:${lead.phone}`}><MessageCircle /> SMS</a></Button></>}
                  {lead.email && <Button asChild variant="outline" size="sm"><a href={`mailto:${lead.email}`}><Mail /> Email</a></Button>}
                  {lead.website && <Button asChild variant="outline" size="sm"><a href={lead.website} target="_blank" rel="noopener noreferrer"><ExternalLink /> Website</a></Button>}
                </div>
                {detail.canEdit && <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3 text-xs">
                  <span className="w-full text-muted-foreground">După contactarea reală, înregistrează canalul:</span>
                  {lead.phone && <><button type="button" onClick={() => recordContact("call", "telefonică")} className="rounded-lg border px-2 py-1">Telefon ✓</button><button type="button" onClick={() => recordContact("whatsapp", "WhatsApp")} className="rounded-lg border px-2 py-1">WhatsApp ✓</button><button type="button" onClick={() => recordContact("sms", "SMS")} className="rounded-lg border px-2 py-1">SMS ✓</button></>}
                  {lead.email && <button type="button" onClick={() => recordContact("email", "prin email")} className="rounded-lg border px-2 py-1">Email ✓</button>}
                </div>}
                {lead.message && <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{lead.message}</p>}
              </section>

              <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <h3 className="font-medium">Istoric</h3>
                {detail.canEdit && <div className="grid gap-2 sm:grid-cols-[150px,1fr,auto]">
                  <select className={field} value={activityKind} onChange={(e) => setActivityKind(e.target.value as typeof activityKind)}>{activityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <input className={field} value={activityText} onChange={(e) => setActivityText(e.target.value)} placeholder="Rezumat scurt și factual…" maxLength={4000} />
                  <Button type="button" variant="outline" onClick={() => void addActivity()} disabled={saving || !activityText.trim()}>Adaugă</Button>
                </div>}
                <ol className="space-y-2">
                  {detail.activities.map((item) => <li key={item.id} className="rounded-xl border border-border/50 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium capitalize">{item.kind.replace("_", " ")}</span><time className="text-xs text-muted-foreground">{formatDate(item.occurred_at)}</time></div>{item.content && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.content}</p>}</li>)}
                  {detail.activities.length === 0 && <li className="text-sm text-muted-foreground">Nu există activități înregistrate.</li>}
                </ol>
              </section>
            </div>

            <div className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <h3 className="flex items-center gap-2 font-medium"><Bell className="size-4" /> Remindere</h3>
                {detail.canEdit && <div className="space-y-2"><input type="datetime-local" className={field} value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} /><textarea className={`${field} min-h-20`} value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} placeholder="Ce trebuie urmărit?" maxLength={1000} /><Button type="button" variant="outline" onClick={() => void addReminder()} disabled={saving || !reminderAt || !reminderNote.trim()}><Clock3 /> Programează</Button></div>}
                <ul className="space-y-2">{pendingReminders.map((item) => <li key={item.id} className={`rounded-xl border p-3 text-sm ${item.due_at < Date.now() ? "border-red-500/40 bg-red-500/5" : "border-border/50"}`}><p>{item.note}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(item.due_at)}</p>{detail.canEdit && <button type="button" onClick={() => void closeReminder(item.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Check className="size-3" /> Finalizat</button>}</li>)}</ul>
                {pendingReminders.length === 0 && <p className="text-sm text-muted-foreground">Niciun reminder activ.</p>}
              </section>

              <section className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4">
                <h3 className="font-medium">Responsabili</h3>
                <ul className="space-y-2">{detail.assignments.map((item) => <li key={item.user_id} className="rounded-xl bg-muted/50 px-3 py-2 text-sm"><span className="font-medium">{item.display_name || item.email}</span><span className="block text-xs text-muted-foreground">{item.assignment_role}</span></li>)}</ul>
              </section>

              <section className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-sm">
                <h3 className="font-medium">Context comercial</h3>
                <dl className="grid grid-cols-[120px,1fr] gap-2 text-muted-foreground"><dt>Sursă</dt><dd className="text-foreground">{lead.source || "—"}</dd><dt>Produs</dt><dd className="text-foreground">{lead.product || "—"}</dd><dt>Estimare</dt><dd className="text-foreground">{lead.estimate_ron !== null ? `${lead.estimate_ron.toLocaleString("ro-RO")} RON` : "—"}</dd><dt>Eligibilitate</dt><dd className="text-foreground">{lead.outreach_eligibility}</dd><dt>Creat</dt><dd className="text-foreground">{formatDate(lead.created_at)}</dd></dl>
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
