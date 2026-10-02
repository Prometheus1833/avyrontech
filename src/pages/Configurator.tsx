import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { apiUrl } from "@/lib/apiBase";
import { trackEvent } from "@/lib/analytics";
import Turnstile from "@/components/site/Turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import PageBackLink from "@/components/site/PageBackLink";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Footer from "@/components/site/Footer";
import { cn } from "@/lib/utils";

type L = { ro: string; en: string };
type Svc = { key: string; title: L; types: L[]; features: L[] };

// Doar servicii (fără produse) — tipuri + caracteristici, scurt.
const SERVICES: Svc[] = [
  { key: "website", title: { ro: "Website prezentare", en: "Presentation website" },
    types: [{ ro: "Profesional", en: "Professional" }, { ro: "Cinematic 3D", en: "Cinematic 3D" }, { ro: "Landing page", en: "Landing page" }],
    features: [{ ro: "Bilingv", en: "Bilingual" }, { ro: "Formular contact", en: "Contact form" }, { ro: "Programări online", en: "Online booking" }, { ro: "SEO avansat", en: "Advanced SEO" }, { ro: "Animații", en: "Animations" }] },
  { key: "shop", title: { ro: "Magazin online", en: "Online store" },
    types: [{ ro: "Sub 100 produse", en: "Under 100 products" }, { ro: "100–1000 produse", en: "100–1000 products" }, { ro: "Peste 1000", en: "Over 1000" }],
    features: [{ ro: "Plăți card", en: "Card payments" }, { ro: "Curierat integrat", en: "Courier integration" }, { ro: "Facturare automată", en: "Auto invoicing" }, { ro: "Import produse", en: "Product import" }, { ro: "Multi-monedă", en: "Multi-currency" }] },
  { key: "apps", title: { ro: "Aplicație mobilă", en: "Mobile app" },
    types: [{ ro: "iOS + Android", en: "iOS + Android" }, { ro: "Web app / PWA", en: "Web app / PWA" }, { ro: "Platformă internă", en: "Internal platform" }],
    features: [{ ro: "Conturi utilizatori", en: "User accounts" }, { ro: "Notificări push", en: "Push notifications" }, { ro: "Plăți in-app", en: "In-app payments" }, { ro: "Panou admin", en: "Admin panel" }, { ro: "API extern", en: "External API" }] },
  { key: "blog", title: { ro: "Blog profesional", en: "Professional blog" },
    types: [{ ro: "Blog nou", en: "New blog" }, { ro: "Integrat în site", en: "Added to site" }],
    features: [{ ro: "Articole scrise de noi", en: "Articles written by us" }, { ro: "SEO pe articol", en: "Per-article SEO" }, { ro: "Newsletter", en: "Newsletter" }] },
  { key: "logo", title: { ro: "Logo 3D dinamic", en: "Dynamic 3D logo" },
    types: [{ ro: "Logo nou", en: "New logo" }, { ro: "Animare logo existent", en: "Animate existing logo" }],
    features: [{ ro: "Variante video", en: "Video variants" }, { ro: "Manual de brand", en: "Brand guide" }] },
  { key: "social", title: { ro: "Identitate social media", en: "Social media identity" },
    types: [{ ro: "Set vizual", en: "Visual kit" }, { ro: "Administrare lunară", en: "Monthly management" }],
    features: [{ ro: "Instagram", en: "Instagram" }, { ro: "Facebook", en: "Facebook" }, { ro: "TikTok", en: "TikTok" }, { ro: "LinkedIn", en: "LinkedIn" }] },
  { key: "ai", title: { ro: "Automatizări AI", en: "AI automation" },
    types: [{ ro: "Chatbot site", en: "Website chatbot" }, { ro: "Asistent WhatsApp", en: "WhatsApp assistant" }, { ro: "Fluxuri interne", en: "Internal workflows" }],
    features: [{ ro: "Răspuns lead-uri", en: "Lead replies" }, { ro: "Integrare CRM", en: "CRM integration" }, { ro: "Bază de cunoștințe", en: "Knowledge base" }] },
  { key: "qa", title: { ro: "QA Testing Web/Mobile", en: "QA Testing Web/Mobile" },
    types: [{ ro: "Manual", en: "Manual" }, { ro: "Automat", en: "Automated" }, { ro: "Mixt", en: "Mixed" }],
    features: [{ ro: "Performanță", en: "Performance" }, { ro: "Securitate", en: "Security" }, { ro: "Accesibilitate", en: "Accessibility" }, { ro: "Multi-device", en: "Multi-device" }] },
];

const TIMELINES: L[] = [{ ro: "Urgent (sub 2 săpt.)", en: "Urgent (< 2 weeks)" }, { ro: "1–2 luni", en: "1–2 months" }, { ro: "Flexibil", en: "Flexible" }];
const BUDGETS: L[] = [{ ro: "Sub 1.000 €", en: "Under €1,000" }, { ro: "1.000–3.000 €", en: "€1,000–3,000" }, { ro: "3.000–10.000 €", en: "€3,000–10,000" }, { ro: "Peste 10.000 €", en: "Over €10,000" }, { ro: "Nu știu încă", en: "Not sure yet" }];

type Pick = { type?: string; features: string[] };

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-pressed={on}
    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all active:scale-[0.97]",
      on ? "border-brand bg-brand/10 text-foreground shadow-soft" : "border-border bg-card/60 text-muted-foreground hover:border-brand/50 hover:text-foreground")}>
    {on && <Check className="size-3.5 text-brand" aria-hidden />}{children}
  </button>
);

export default function Configurator() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const tx = (l: L) => l[lang as "ro" | "en"] ?? l.ro;
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [c, setC] = useState({ name: "", business: "", phone: "", email: "", website: "", notes: "" });
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = ro ? "Configurator ofertă | AVYRON" : "Quote configurator | AVYRON";
    trackEvent("configurator_view", { lang });
  }, [ro, lang]);

  const chosen = SERVICES.filter((s) => picks[s.key]);
  const steps = ro ? ["Servicii", "Detalii", "Proiect", "Contact"] : ["Services", "Details", "Project", "Contact"];

  const toggleSvc = (k: string) => setPicks((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = { features: [] }; return n; });
  const setType = (k: string, t: string) => setPicks((p) => ({ ...p, [k]: { ...p[k], type: t } }));
  const toggleFeat = (k: string, f: string) => setPicks((p) => {
    const cur = p[k].features; return { ...p, [k]: { ...p[k], features: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f] } };
  });

  const summary = useMemo(() => {
    const lines = chosen.map((s) => `• ${tx(s.title)}${picks[s.key].type ? ` — ${picks[s.key].type}` : ""}${picks[s.key].features.length ? ` (${picks[s.key].features.join(", ")})` : ""}`);
    lines.push(`${ro ? "Termen" : "Timeline"}: ${timeline || "—"}`, `${ro ? "Buget" : "Budget"}: ${budget || "—"}`);
    if (c.notes.trim()) lines.push(`${ro ? "Note" : "Notes"}: ${c.notes.trim()}`);
    return lines.join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, timeline, budget, c.notes, lang]);

  const canNext = step === 0 ? chosen.length > 0 : step === 1 ? chosen.every((s) => picks[s.key].type) : step === 2 ? !!timeline && !!budget : true;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (c.name.trim().length < 2 || c.business.trim().length < 2 || c.phone.trim().length < 6 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) {
      toast.error(ro ? "Completează nume, firmă, telefon și email valid." : "Fill in name, company, phone and a valid email."); return;
    }
    if (TURNSTILE_SITE_KEY && !token) { toast.error(ro ? "Confirmă verificarea anti-spam." : "Please complete the anti-spam check."); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", c.name.trim()); fd.append("business", c.business.trim());
      fd.append("phone", c.phone.trim()); fd.append("email", c.email.trim());
      fd.append("website", c.website.trim()); fd.append("description", `[Configurator]\n${summary}`.slice(0, 2000));
      fd.append("lang", lang); fd.append("product", "configurator");
      fd.append("config", JSON.stringify({ services: picks, timeline, budget }).slice(0, 4000));
      fd.append("company_url", honeypot.current?.value ?? "");
      if (token) fd.append("cf-turnstile-response", token);
      const res = await fetch(apiUrl("/api/contact/demo"), { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { leadId?: string; error?: string };
      if (res.status === 429) { toast.error(ro ? "Prea multe cereri. Încearcă mai târziu." : "Too many requests. Try later."); return; }
      if (res.status === 403) { toast.error(ro ? "Verificarea anti-spam a eșuat." : "Anti-spam check failed."); setToken(""); setResetKey((k) => k + 1); return; }
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      trackEvent("generate_lead", { source: "configurator", services: chosen.map((s) => s.key).join(",") });
      setDone(body.leadId ?? "—");
    } catch {
      toast.error(ro ? "Nu am putut trimite. Încearcă din nou." : "Couldn't send. Please try again.");
    } finally { setLoading(false); }
  };

  const input = "w-full rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-ring/30";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-5">
        <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} />
        <div className="flex items-center gap-2"><LangSwitch /><ThemeToggle /></div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">{ro ? "Configurator" : "Configurator"}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {ro ? "Solicită o ofertă" : "Request a quote"} <span className="text-gradient">{ro ? "personalizată" : "tailored to you"}</span>
        </h1>
        <p className="mt-2 text-muted-foreground">{ro ? "4 pași scurți, sub 2 minute. Primim rezultatul și revenim cu oferta." : "4 short steps, under 2 minutes. We receive the result and reply with a quote."}</p>

        {done ? (
          <div data-testid="configurator-done" className="mt-8 rounded-3xl border border-border bg-card/70 p-6 shadow-soft">
            <div className="flex items-center gap-2 text-lg font-semibold"><Check className="size-5 text-brand" />{ro ? "Cerere trimisă!" : "Request sent!"}</div>
            <p className="mt-1 text-sm text-muted-foreground">{ro ? "Am primit configurația ta. Iată rezumatul:" : "We received your configuration. Summary:"}</p>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-sm">{summary}</pre>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">ID: {done}</p>
            <Link to={ro ? "/" : "/en"} className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">{ro ? "Înapoi acasă" : "Back home"}</Link>
          </div>
        ) : (
          <>
            <ol className="mt-7 grid grid-cols-4 gap-2" aria-label={ro ? "Pași" : "Steps"}>
              {steps.map((s, i) => (
                <li key={s} className="text-center">
                  <div className={cn("h-1.5 rounded-full transition-colors duration-500", i <= step ? "bg-brand" : "bg-border")} />
                  <span className={cn("mt-1.5 block text-[11px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                </li>
              ))}
            </ol>

            <form onSubmit={submit} className="mt-6 rounded-3xl border border-border bg-card/70 p-5 shadow-soft backdrop-blur sm:p-6">
              <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-300">
                {step === 0 && (
                  <>
                    <h2 className="font-semibold">{ro ? "De ce servicii ai nevoie?" : "Which services do you need?"}</h2>
                    <p className="text-sm text-muted-foreground">{ro ? "Poți alege mai multe." : "Pick one or more."}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {SERVICES.map((s) => {
                        const on = !!picks[s.key];
                        return (
                          <button type="button" key={s.key} onClick={() => toggleSvc(s.key)} aria-pressed={on}
                            className={cn("flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all active:scale-[0.98]",
                              on ? "border-brand bg-brand/10" : "border-border hover:border-brand/50")}>
                            {tx(s.title)}
                            <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-brand bg-brand text-primary-foreground" : "border-border")}>{on && <Check className="size-3" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="font-semibold">{ro ? "Alege varianta și caracteristicile" : "Choose type and features"}</h2>
                    {chosen.map((s) => (
                      <div key={s.key} className="border-t border-border pt-4 first-of-type:border-0 first-of-type:pt-0">
                        <p className="text-sm font-semibold">{tx(s.title)}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">{ro ? "Variantă" : "Type"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-2">{s.types.map((t) => <Chip key={t.ro} on={picks[s.key].type === tx(t)} onClick={() => setType(s.key, tx(t))}>{tx(t)}</Chip>)}</div>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{ro ? "Caracteristici (opțional)" : "Features (optional)"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-2">{s.features.map((f) => <Chip key={f.ro} on={picks[s.key].features.includes(tx(f))} onClick={() => toggleFeat(s.key, tx(f))}>{tx(f)}</Chip>)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div><h2 className="font-semibold">{ro ? "Termen dorit" : "Desired timeline"}</h2>
                      <div className="mt-2 flex flex-wrap gap-2">{TIMELINES.map((t) => <Chip key={t.ro} on={timeline === tx(t)} onClick={() => setTimeline(tx(t))}>{tx(t)}</Chip>)}</div></div>
                    <div><h2 className="font-semibold">{ro ? "Buget estimativ" : "Estimated budget"}</h2>
                      <div className="mt-2 flex flex-wrap gap-2">{BUDGETS.map((b) => <Chip key={b.ro} on={budget === tx(b)} onClick={() => setBudget(tx(b))}>{tx(b)}</Chip>)}</div></div>
                    <textarea value={c.notes} maxLength={800} onChange={(e) => setC({ ...c, notes: e.target.value })} rows={3} className={input}
                      placeholder={ro ? "Altceva important? (opțional)" : "Anything else? (optional)"} />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <h2 className="font-semibold">{ro ? "Unde îți trimitem oferta?" : "Where should we send the quote?"}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={input} autoComplete="name" placeholder={ro ? "Nume *" : "Name *"} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} maxLength={80} />
                      <input className={input} autoComplete="organization" placeholder={ro ? "Firmă / domeniu *" : "Company / field *"} value={c.business} onChange={(e) => setC({ ...c, business: e.target.value })} maxLength={80} />
                      <input className={input} type="tel" autoComplete="tel" placeholder={ro ? "Telefon *" : "Phone *"} value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} maxLength={30} />
                      <input className={input} type="email" autoComplete="email" placeholder="Email *" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} maxLength={120} />
                    </div>
                    <input className={input} placeholder={ro ? "Website actual (opțional)" : "Current website (optional)"} value={c.website} onChange={(e) => setC({ ...c, website: e.target.value })} maxLength={200} />
                    <input ref={honeypot} name="company_url" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
                    <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">{summary}</pre>
                    <Turnstile onToken={setToken} resetKey={resetKey} action="contact-demo" />
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0}
                  className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:invisible">
                  <ArrowLeft className="size-4" />{ro ? "Înapoi" : "Back"}
                </button>
                {step < 3 ? (
                  <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-40">
                    {ro ? "Continuă" : "Continue"}<ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-60">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{ro ? "Trimite cererea" : "Send request"}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
