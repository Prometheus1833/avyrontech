import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Globe2, RotateCcw, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";
import { WEBSITE_REVIEW_SURFACE, type AdminReview } from "@/lib/reviews";

type Status = AdminReview["status"];
const statuses: { id: Status; label: string }[] = [
  { id: "pending", label: "În așteptare" },
  { id: "approved", label: "Aprobate" },
  { id: "rejected", label: "Respinse" },
];

const sourceName = (review: AdminReview) => review.source_type === "direct"
  ? "Formular AVYRON"
  : review.source_platform || "Sursă externă";

export default function StaffReviewsTab() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Record<Status, AdminReview[]>>({ pending: [], approved: [], rejected: [] });
  const [status, setStatus] = useState<Status>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, approved, rejected] = await Promise.all(statuses.map(({ id }) =>
        cfAuth.request<{ data: AdminReview[] }>(`/api/admin/reviews?status=${id}`).then((body) => body.data),
      ));
      setItems({ pending, approved, rejected });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recenziile nu au putut fi încărcate.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const moderate = async (review: AdminReview, nextStatus: "approved" | "rejected") => {
    setBusyId(review.id);
    try {
      await cfAuth.request(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: "PATCH", body: JSON.stringify({ status: nextStatus, note: notes[review.id] || "" }),
      });
      toast.success(nextStatus === "approved" ? "Recenzia a fost aprobată pentru publicare." : "Recenzia a fost respinsă.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Starea recenziei nu a putut fi schimbată.");
    } finally { setBusyId(null); }
  };

  const visible = items[status].filter((review) => review.surface_key === WEBSITE_REVIEW_SURFACE);
  return <div className="space-y-6">
    <header className="relative overflow-hidden rounded-[1.75rem] border border-violet-300/15 bg-gradient-to-br from-violet-500/[.16] via-[#10182b] to-cyan-400/[.07] p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border border-violet-400/15" aria-hidden />
      <p className="font-mono text-[10px] uppercase tracking-[.24em] text-violet-200/70">AVYRON · Încredere</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-3xl"><Star className="size-6 text-violet-300" /> Recenzii</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Un loc pentru recenziile serviciilor AVYRON. Momentan este conectată pagina Website de prezentare profesional; sursele externe pot fi adăugate ulterior.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2 border-white/15 bg-white/[.04]"><RotateCcw className="size-4" /> Actualizează</Button>
      </div>
    </header>

    <section aria-label="Sursă conectată" className="flex items-center gap-3 rounded-2xl border border-white/[.09] bg-white/[.035] p-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-200"><Globe2 className="size-5" /></div>
      <div className="min-w-0"><p className="text-sm font-semibold text-white">Website de prezentare profesional</p><p className="text-xs text-slate-500">Formular public · aprobare înainte de afișare</p></div>
      <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300"><Check className="size-3" /> Conectat</span>
    </section>
    <p className="rounded-xl border border-amber-400/15 bg-amber-400/[.05] px-4 py-3 text-xs leading-relaxed text-amber-100/75">Numele și brandul sunt declarate de autor. Verifică experiența și relația comercială înainte de a publica recenzia.</p>

    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Starea recenziilor">
      {statuses.map(({ id, label }) => <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)} className={`rounded-2xl border p-3 text-left transition-colors sm:p-4 ${status === id ? "border-violet-400/40 bg-violet-500/15 text-white" : "border-white/[.07] bg-white/[.025] text-slate-400 hover:bg-white/[.05]"}`}><span className="block text-xl font-bold tabular-nums sm:text-2xl">{items[id].filter((review) => review.surface_key === WEBSITE_REVIEW_SURFACE).length}</span><span className="mt-1 block text-[11px] leading-tight sm:text-xs">{label}</span></button>)}
    </div>

    {loading ? <div className="h-52 animate-pulse rounded-2xl bg-white/[.04]" aria-label="Se încarcă recenziile" /> : !visible.length ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.025] px-6 py-12 text-center"><Clock3 className="mx-auto size-7 text-violet-300/65" /><p className="mt-3 text-sm text-slate-400">Nu există recenzii {status === "pending" ? "în așteptare" : status === "approved" ? "aprobate" : "respinse"} pentru acest serviciu.</p></div> : <div className="grid gap-4 lg:grid-cols-2">
      {visible.map((review) => <article key={review.id} className="flex flex-col rounded-2xl border border-white/[.08] bg-[#101624] p-5 shadow-[0_20px_50px_-35px_rgba(0,0,0,.65)]">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-base font-bold text-white">{review.display_name}</p><p className="mt-1 text-xs text-violet-300">{review.brand_name || (review.entity_type === "individual" ? "Persoană fizică" : review.entity_type.toUpperCase())}</p></div><div className="flex gap-0.5 text-amber-400" aria-label={`${review.rating} din 5 stele`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div></div>
        <p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">“{review.review_text}”</p>
        <div className="mt-5 space-y-1 border-t border-white/[.07] pt-4 text-xs text-slate-500"><p>{sourceName(review)} · {new Date(review.created_at).toLocaleDateString("ro-RO")}</p>{review.contact_email && <p>Email privat: <span className="text-slate-300">{review.contact_email}</span></p>}{review.moderation_note && <p>Notă: {review.moderation_note}</p>}</div>
        {isAdmin && <div className="mt-4 space-y-3"><label className="block text-xs text-slate-400" htmlFor={`review-note-${review.id}`}>Notă internă (opțional)</label><Textarea id={`review-note-${review.id}`} value={notes[review.id] ?? review.moderation_note ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [review.id]: event.target.value }))} maxLength={500} rows={2} className="border-white/10 bg-white/[.035]" /><div className="flex flex-wrap gap-2">{status !== "approved" && <Button size="sm" disabled={busyId === review.id} onClick={() => void moderate(review, "approved")} className="gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-500"><Check className="size-3.5" /> Aprobă și publică</Button>}{status !== "rejected" && <Button size="sm" variant="outline" disabled={busyId === review.id} onClick={() => void moderate(review, "rejected")} className="gap-1.5 rounded-full border-rose-400/20 text-rose-300 hover:bg-rose-400/10"><X className="size-3.5" /> {status === "approved" ? "Retrage" : "Respinge"}</Button>}</div></div>}
      </article>)}
    </div>}
    {!isAdmin && <p className="rounded-xl border border-violet-400/15 bg-violet-500/[.05] p-4 text-xs text-slate-400">Doar administratorii pot aproba, respinge sau retrage recenzii.</p>}
  </div>;
}
