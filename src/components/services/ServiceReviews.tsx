import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Turnstile from "@/components/site/Turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import { getPublicReviews, submitReview, WEBSITE_REVIEW_SURFACE, type PublicReview, type ReviewSubmission } from "@/lib/reviews";
import "./service-reviews.css";

type Props = { lang: "ro" | "en" };
type EntityType = ReviewSubmission["entityType"];

const initialForm = {
  displayName: "",
  email: "",
  entityType: "individual" as EntityType,
  brandName: "",
  rating: 0,
  reviewText: "",
  publishConsent: false,
  website: "",
};

const copy = {
  ro: {
    eyebrow: "Experiențe reale", title: "Ce spun clienții noștri", lead: "Păreri trimise de clienți și publicate după aprobare.",
    empty: "Primele recenzii aprobate vor apărea aici.", loadError: "Recenziile nu pot fi încărcate acum.", retry: "Reîncearcă",
    cta: "Lasă o recenzie", noAccount: "Nu ai nevoie de cont pentru a ne spune cum a fost colaborarea.",
    dialogTitle: "Experiența ta cu AVYRON", dialogLead: "Câteva detalii, apoi recenzia ajunge la echipa noastră pentru aprobare.",
    name: "Numele tău", email: "Email de contact", entity: "Reprezinți", brand: "Numele brandului sau firmei",
    rating: "Cum a fost experiența?", review: "Recenzia ta", reviewPlaceholder: "Spune-ne concret ce am realizat împreună și ce ți-a fost util.",
    consent: "Sunt de acord ca numele, brandul (dacă este cazul), ratingul și textul recenziei să fie publicate după aprobare.",
    privacy: "Emailul rămâne privat și poate fi folosit doar pentru clarificări despre recenzie.",
    send: "Trimite recenzia", sending: "Se trimite...", successTitle: "Mulțumim pentru recenzie!", success: "A fost salvată și va apărea pe site numai după aprobarea unui administrator.",
    close: "Închide", validation: "Completează câmpurile și scrie cel puțin 20 de caractere.", captcha: "Confirmă verificarea anti-spam.",
    rate: "Ai trimis deja recenzii recent. Revino mai târziu.", error: "Recenzia nu a putut fi trimisă. Încearcă din nou.",
    source: "Trimisă prin AVYRON", individual: "Persoană fizică", srl: "Firmă / SRL", pfa: "PFA", ii: "Întreprindere individuală", other: "Alt tip",
  },
  en: {
    eyebrow: "Real experiences", title: "What our clients say", lead: "Feedback submitted by clients and published after approval.",
    empty: "The first approved reviews will appear here.", loadError: "Reviews are unavailable right now.", retry: "Try again",
    cta: "Leave a review", noAccount: "You don't need an account to tell us about your experience.",
    dialogTitle: "Your experience with AVYRON", dialogLead: "A few details, then our team will review your submission.",
    name: "Your name", email: "Contact email", entity: "You represent", brand: "Brand or company name",
    rating: "How was your experience?", review: "Your review", reviewPlaceholder: "Tell us what we built together and what was most useful.",
    consent: "I agree to publish my name, brand (if applicable), rating and review text after approval.",
    privacy: "Your email stays private and may only be used to clarify your review.",
    send: "Submit review", sending: "Submitting...", successTitle: "Thank you for your review!", success: "It has been saved and will appear on the site only after an administrator approves it.",
    close: "Close", validation: "Complete the fields and write at least 20 characters.", captcha: "Complete the anti-spam check.",
    rate: "You've submitted reviews recently. Please return later.", error: "We couldn't submit your review. Please try again.",
    source: "Submitted on AVYRON", individual: "Individual", srl: "Company / SRL", pfa: "Sole trader / PFA", ii: "Individual enterprise", other: "Other",
  },
};

function ReviewCard({ review, lang }: { review: PublicReview; lang: Props["lang"] }) {
  const t = copy[lang];
  return <article className="service-review-card flex h-full w-[min(82vw,23rem)] shrink-0 flex-col rounded-[1.75rem] border border-violet-400/20 bg-card/95 p-6 shadow-[0_24px_65px_-38px_rgba(93,57,181,.45)] sm:w-[23rem]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-0.5 text-amber-400" aria-label={`${review.rating}/5`}>
        {Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}
      </div>
      <Quote className="size-7 text-violet-400/35" aria-hidden />
    </div>
    <blockquote className="mt-5 flex-1 text-sm leading-relaxed text-foreground/80">“{review.review_text}”</blockquote>
    <div className="mt-6 border-t border-foreground/10 pt-4">
      <p className="font-display text-sm font-bold">{review.display_name}</p>
      {review.brand_name && <p className="mt-0.5 text-xs text-violet-500 dark:text-violet-300">{review.brand_name}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">{review.source_type === "external" ? review.source_platform : t.source}</p>
    </div>
  </article>;
}

export default function ServiceReviews({ lang }: Props) {
  const t = copy[lang];
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try { setReviews(await getPublicReviews()); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.displayName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email.trim()) ||
      (form.entityType !== "individual" && form.brandName.trim().length < 2) ||
      form.rating < 1 || form.reviewText.trim().length < 20 || !form.publishConsent) {
      setError(t.validation); return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) { setError(t.captcha); return; }
    setSending(true); setError("");
    try {
      await submitReview({ ...form, surfaceKey: WEBSITE_REVIEW_SURFACE, turnstileToken });
      setDone(true);
      setForm(initialForm);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "rate_limited" ? t.rate : t.error);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally { setSending(false); }
  };

  return <section id="recenzii" className="relative mt-16 scroll-mt-28 overflow-hidden rounded-[2rem] border border-violet-400/15 bg-gradient-to-br from-violet-500/[.08] via-background to-cyan-500/[.05] py-10 sm:py-12">
    <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />
    <div className="relative px-5 text-center sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[.24em] text-violet-500 dark:text-violet-300">{t.eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{t.lead}</p>
    </div>
    {loading ? <div className="mx-5 mt-8 h-48 animate-pulse rounded-[1.75rem] bg-foreground/[.05] sm:mx-8" aria-label="Loading reviews" /> : loadError ?
      <div className="mx-5 mt-8 rounded-2xl border border-foreground/10 bg-background/65 p-7 text-center text-sm sm:mx-8"><p>{t.loadError}</p><Button variant="outline" className="mt-4 rounded-full" onClick={() => void load()}>{t.retry}</Button></div> :
      reviews.length ? <div className="service-reviews-window mt-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label={t.title}>
        <div className={`service-reviews-track ${reviews.length > 1 ? "service-reviews-moving" : "justify-center"}`} style={{ "--review-duration": `${Math.max(26, reviews.length * 12)}s` } as React.CSSProperties}>
          <div className="service-reviews-group">{reviews.map((review) => <ReviewCard key={review.id} review={review} lang={lang} />)}</div>
          {reviews.length > 1 && <div className="service-reviews-group" aria-hidden="true">{reviews.map((review) => <ReviewCard key={`copy-${review.id}`} review={review} lang={lang} />)}</div>}
        </div>
      </div> : <div className="mx-5 mt-8 rounded-[1.5rem] border border-dashed border-violet-400/25 bg-background/65 px-6 py-9 text-center sm:mx-8"><Star className="mx-auto size-7 text-violet-400" aria-hidden /><p className="mt-3 text-sm text-muted-foreground">{t.empty}</p></div>}
    <div className="relative mt-8 px-5 text-center sm:px-8">
      <Button className="h-12 gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-7 text-white shadow-lg shadow-violet-800/15 hover:from-violet-500 hover:to-indigo-500" onClick={() => { setOpen(true); setDone(false); setError(""); }}>
        {t.cta}<ArrowRight className="size-4" aria-hidden />
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">{t.noAccount}</p>
    </div>

    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setDone(false); setError(""); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-violet-400/20 sm:max-w-2xl">
        {done ? <div className="py-9 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500"><Check className="size-7" /></div><h2 className="mt-5 font-display text-2xl font-bold">{t.successTitle}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t.success}</p><Button className="mt-6 rounded-full" onClick={() => setOpen(false)}>{t.close}</Button></div> : <>
          <DialogHeader><DialogTitle className="font-display text-2xl">{t.dialogTitle}</DialogTitle><DialogDescription>{t.dialogLead}</DialogDescription></DialogHeader>
          <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/[.12] to-cyan-400/[.06] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[.19em] text-violet-600 dark:text-violet-300">AVYRON · {lang === "ro" ? "Website de prezentare profesional" : "Professional presentation website"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{lang === "ro" ? "Fără cont · date minime · publicare după aprobare" : "No account · minimal details · published after approval"}</p>
          </div>
          <form onSubmit={(event) => void submit(event)} className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="review-name">{t.name}</Label><Input id="review-name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} maxLength={80} autoComplete="name" required /></div>
            <div className="space-y-1.5"><Label htmlFor="review-email">{t.email}</Label><Input id="review-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={254} autoComplete="email" required /></div>
            <div className="space-y-1.5"><Label htmlFor="review-entity">{t.entity}</Label><Select value={form.entityType} onValueChange={(value) => setForm({ ...form, entityType: value as EntityType, brandName: value === "individual" ? "" : form.brandName })}><SelectTrigger id="review-entity"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="individual">{t.individual}</SelectItem><SelectItem value="srl">{t.srl}</SelectItem><SelectItem value="pfa">{t.pfa}</SelectItem><SelectItem value="ii">{t.ii}</SelectItem><SelectItem value="other">{t.other}</SelectItem></SelectContent></Select></div>
            {form.entityType !== "individual" && <div className="space-y-1.5"><Label htmlFor="review-brand">{t.brand}</Label><Input id="review-brand" value={form.brandName} onChange={(event) => setForm({ ...form, brandName: event.target.value })} maxLength={120} autoComplete="organization" required /></div>}
            <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">{t.rating}</legend><div className="mt-2 flex gap-1" role="group" aria-label={t.rating}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={form.rating === value} aria-label={`${value}/5`} onClick={() => setForm({ ...form, rating: value })} className="grid size-10 place-items-center rounded-lg text-amber-400 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><Star className="size-6" fill={value <= form.rating ? "currentColor" : "none"} /></button>)}</div></fieldset>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="review-text">{t.review}</Label><Textarea id="review-text" value={form.reviewText} onChange={(event) => setForm({ ...form, reviewText: event.target.value })} minLength={20} maxLength={1200} rows={5} placeholder={t.reviewPlaceholder} required /><p className="text-right text-[11px] text-muted-foreground">{form.reviewText.length}/1200</p></div>
            <label className="flex items-start gap-3 text-xs leading-relaxed text-foreground/80 sm:col-span-2"><input type="checkbox" checked={form.publishConsent} onChange={(event) => setForm({ ...form, publishConsent: event.target.checked })} required className="mt-0.5 accent-violet-600" />{t.consent}</label>
            <p className="text-xs text-muted-foreground sm:col-span-2">{t.privacy} <a href={lang === "ro" ? "/gdpr" : "/en/privacy"} className="underline underline-offset-2 hover:text-foreground">{lang === "ro" ? "Politica de confidențialitate" : "Privacy policy"}</a></p>
            <div className="absolute -left-[9999px]" aria-hidden="true"><label htmlFor="review-website">Website</label><input id="review-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></div>
            {TURNSTILE_SITE_KEY && <div className="sm:col-span-2"><Turnstile action="service-review" onToken={onTurnstileToken} resetKey={turnstileReset} /></div>}
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive sm:col-span-2">{error}</p>}
            <Button type="submit" disabled={sending} className="h-11 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white sm:col-span-2">{sending ? t.sending : t.send}</Button>
          </form>
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
