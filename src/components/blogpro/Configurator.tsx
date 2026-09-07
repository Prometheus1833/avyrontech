import { useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useLang } from "@/i18n/LanguageContext";
import { apiUrl } from "@/lib/apiBase";
import Turnstile from "@/components/site/Turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_BUNDLED_IDS,
  AI_GROUP_ID,
  AI_PACK_ID,
  BASE_PRICE,
  CONFIG_STEPS,
  ORIGINAL_PRICE,
  type ConfigGroup,
  type Selection,
  computeEstimate,
  defaultSelection,
  formatLei,
  levelFor,
} from "@/data/blogProfessional";
import { Section, SectionHead } from "./ui";

/* SCENE 15 — pricing + configurator + lead capture. */

const copy = {
  ro: {
    eyebrow: "Configurator",
    title: "Construiește-ți blogul și vezi estimarea în timp real",
    lead: "Alege doar ce ai nevoie. Prețul se actualizează instant, fără surprize și fără costuri ascunse.",
    from: "de la",
    was: "în loc de",
    base: "Pachet de bază",
    included: "Inclus",
    summary: "Configurația ta",
    level: "Nivel configurație",
    addons: "Opțiuni adăugate",
    total: "Estimare totală",
    none: "Nicio opțiune suplimentară selectată.",
    custom: "Configurația include opțiuni care necesită ofertă personalizată. Îți trimitem prețul final după o scurtă discuție.",
    disclaimer:
      "Estimarea este orientativă și se confirmă după discuția inițială. Prețul nu include costuri externe de tip domeniu, găzduire terță, licențe sau consum API.",
    reset: "Resetează",
    cta: "Trimite configurația",
    formTitle: "Primește oferta pentru configurația ta",
    formLead: "Îți răspundem cu propunerea detaliată și pașii următori.",
    name: "Nume",
    business: "Companie / proiect",
    phone: "Telefon",
    email: "Email",
    website: "Website (opțional)",
    message: "Detalii despre proiect",
    send: "Trimite cererea",
    sending: "Se trimite…",
    successTitle: "Am primit configurația ta",
    successDesc: "Revenim cu oferta detaliată și cu recomandările noastre.",
    errName: "Introdu numele complet.",
    errBusiness: "Introdu numele companiei sau al proiectului.",
    errPhone: "Introdu un număr de telefon valid.",
    errEmail: "Introdu o adresă de email validă.",
    captcha: "Confirmă verificarea de securitate.",
    error: "Trimiterea a eșuat. Încearcă din nou.",
    configLabel: "Configurație blog profesional",
    customQuote: "Ofertă personalizată",
  },
  en: {
    eyebrow: "Configurator",
    title: "Build your blog and see the estimate in real time",
    lead: "Pick only what you need. The price updates instantly, with no surprises and no hidden costs.",
    from: "from",
    was: "instead of",
    base: "Base package",
    included: "Included",
    summary: "Your configuration",
    level: "Configuration level",
    addons: "Selected options",
    total: "Total estimate",
    none: "No extra options selected yet.",
    custom: "Your configuration includes options that need a custom quote. We send the final price after a short conversation.",
    disclaimer:
      "The estimate is indicative and confirmed after the initial conversation. It excludes external costs such as domains, third-party hosting, licences or API usage.",
    reset: "Reset",
    cta: "Send configuration",
    formTitle: "Get the offer for your configuration",
    formLead: "We reply with a detailed proposal and the next steps.",
    name: "Name",
    business: "Company / project",
    phone: "Phone",
    email: "Email",
    website: "Website (optional)",
    message: "Project details",
    send: "Send request",
    sending: "Sending…",
    successTitle: "We received your configuration",
    successDesc: "We will get back with a detailed offer and our recommendations.",
    errName: "Enter your full name.",
    errBusiness: "Enter your company or project name.",
    errPhone: "Enter a valid phone number.",
    errEmail: "Enter a valid email address.",
    captcha: "Please complete the security check.",
    error: "Sending failed. Please try again.",
    configLabel: "Professional blog configuration",
    customQuote: "Custom quote",
  },
} as const;

const optionClass = (active: boolean) =>
  `flex h-full cursor-pointer flex-col rounded-xl border p-3 text-left transition-colors duration-200 focus-within:ring-2 focus-within:ring-brand ${
    active ? "border-brand bg-brand/5" : "border-border/70 bg-card/60 hover:border-brand/40"
  }`;

const Configurator = () => {
  const { lang } = useLang();
  const c = copy[lang];
  const [selection, setSelection] = useState<Selection>(() => defaultSelection());
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", business: "", phone: "", email: "", website: "", message: "" });

  const estimate = useMemo(() => computeEstimate(selection), [selection]);
  const level = useMemo(() => levelFor(estimate.addons), [estimate.addons]);
  const aiPackOn = (selection[AI_GROUP_ID] ?? []).includes(AI_PACK_ID);

  const toggle = (group: ConfigGroup, optionId: string) => {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];
      if (group.kind === "single") return { ...prev, [group.id]: [optionId] };
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      // Selecting the AI bundle clears the individual AI modules it covers.
      if (group.id === AI_GROUP_ID && optionId === AI_PACK_ID && next.includes(AI_PACK_ID)) {
        return { ...prev, [group.id]: [AI_PACK_ID] };
      }
      return { ...prev, [group.id]: next };
    });
  };

  const configurationText = useMemo(() => {
    const lines: string[] = [`${c.configLabel}:`];
    for (const step of CONFIG_STEPS) {
      for (const group of step.groups) {
        const chosen = selection[group.id] ?? [];
        if (!chosen.length) continue;
        const labels = group.options
          .filter((o) => chosen.includes(o.id))
          .map((o) => o.label[lang])
          .join(", ");
        lines.push(`- ${group.title[lang]}: ${labels}`);
      }
    }
    lines.push(`- ${c.total}: ${formatLei(estimate.total)}${estimate.hasCustomQuote ? ` (+ ${c.customQuote})` : ""}`);
    return lines.join("\n");
  }, [selection, lang, estimate, c]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schema = z.object({
      name: z.string().trim().min(2, c.errName).max(80),
      business: z.string().trim().min(2, c.errBusiness).max(80),
      phone: z.string().trim().min(6, c.errPhone).max(30),
      email: z.string().trim().email(c.errEmail).max(120),
      website: z.string().trim().max(200).optional(),
      message: z.string().trim().max(2000).optional(),
    });
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      toast.error(c.captcha);
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", parsed.data.name);
      fd.append("business", parsed.data.business);
      fd.append("phone", parsed.data.phone);
      fd.append("email", parsed.data.email);
      fd.append("website", parsed.data.website ?? "");
      fd.append(
        "description",
        `${parsed.data.message ?? ""}\n\n${configurationText}`.trim().slice(0, 2000),
      );
      fd.append("lang", lang);
      fd.append("company_url", honeypot.current?.value ?? "");
      if (token) fd.append("cf-turnstile-response", token);

      const res = await fetch(apiUrl("/api/contact/demo"), { method: "POST", body: fd });
      if (res.status === 429 || res.status === 403 || !res.ok) {
        setToken("");
        setResetKey((k) => k + 1);
        throw new Error(`HTTP ${res.status}`);
      }
      setSent(true);
      setForm({ name: "", business: "", phone: "", email: "", website: "", message: "" });
      setToken("");
      setResetKey((k) => k + 1);
    } catch (err) {
      console.error("blog configurator submit failed", err);
      toast.error(c.error);
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Section id="configurator-blog" scene="configurator" labelledBy="configurator-title">
      <SectionHead id="configurator-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      <div className="mt-7 flex flex-wrap items-end gap-x-4 gap-y-2" data-reveal>
        <p className="flex items-baseline gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{c.from}</span>
          <span className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{formatLei(BASE_PRICE)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {c.was} <span className="line-through">{formatLei(ORIGINAL_PRICE)}</span>
        </p>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-4">
          {CONFIG_STEPS.map((step) => (
            <div key={step.id} className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-soft sm:p-5" data-reveal>
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-bold tracking-[0.2em] text-brand">{step.num}</span>
                <h3 className="font-display text-lg font-bold tracking-tight">{step.title[lang]}</h3>
              </div>
              {step.lead && <p className="mt-1.5 text-sm text-muted-foreground">{step.lead[lang]}</p>}

              {step.groups.map((group) => (
                <fieldset key={group.id} className="mt-4">
                  <legend className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.title[lang]}
                  </legend>
                  {group.hint && <p className="mt-1 text-xs text-muted-foreground">{group.hint[lang]}</p>}
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.options.map((option) => {
                      const chosen = (selection[group.id] ?? []).includes(option.id);
                      const covered = aiPackOn && AI_BUNDLED_IDS.includes(option.id);
                      const priceLabel = option.customQuote
                        ? option.display?.[lang] ?? c.customQuote
                        : option.included || option.price === 0
                          ? c.included
                          : covered
                            ? c.included
                            : option.display?.[lang] ?? `+${formatLei(option.price)}`;
                      return (
                        <label key={option.id} className={optionClass(chosen)}>
                          <span className="flex items-start gap-2.5">
                            <input
                              type={group.kind === "single" ? "radio" : "checkbox"}
                              name={group.id}
                              value={option.id}
                              checked={chosen}
                              disabled={covered && !chosen}
                              onChange={() => toggle(group, option.id)}
                              className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--brand))]"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{option.label[lang]}</span>
                              {option.desc && (
                                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                  {option.desc[lang]}
                                </span>
                              )}
                            </span>
                          </span>
                          <span
                            className={`mt-2.5 text-xs font-semibold ${
                              priceLabel === c.included ? "text-muted-foreground" : "text-brand"
                            }`}
                          >
                            {priceLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              {step.note && <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">{step.note[lang]}</p>}
            </div>
          ))}
        </div>

        {/* Live summary */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold tracking-tight">{c.summary}</h3>
              <button
                type="button"
                onClick={() => setSelection(defaultSelection())}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <RotateCcw className="size-3" aria-hidden />
                {c.reset}
              </button>
            </div>

            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>{c.level}</span>
                <span className="text-brand">{level.label[lang]}</span>
              </div>
              <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-500"
                  style={{ width: `${Math.max(8, level.progress * 100)}%` }}
                />
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-sm" aria-live="polite">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{c.base}</dt>
                <dd className="font-semibold">{formatLei(BASE_PRICE)}</dd>
              </div>
              {estimate.items.length === 0 && <p className="text-xs text-muted-foreground">{c.none}</p>}
              {estimate.items.map((item) => (
                <div key={item.id} className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0 text-muted-foreground">{item.label[lang]}</dt>
                  <dd className="shrink-0 font-medium">
                    {item.customQuote ? c.customQuote : `+${formatLei(item.price)}`}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-border/60 pt-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {c.total}
                </span>
                <span className="font-display text-2xl font-bold tracking-tight">{formatLei(estimate.total)}</span>
              </div>
              {estimate.hasCustomQuote && (
                <p className="mt-2 rounded-lg bg-brand/10 p-2.5 text-xs leading-relaxed text-brand">{c.custom}</p>
              )}
              <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">{c.disclaimer}</p>
            </div>

            <a
              href="#configurator-lead"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {c.cta}
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </aside>
      </div>

      {/* Lead capture */}
      <div id="configurator-lead" className="mt-10 scroll-mt-24 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft sm:p-6">
        {sent ? (
          <div role="status" aria-live="polite" className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight">{c.successTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.successDesc}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                <Sparkles className="size-3.5" aria-hidden />
                {c.eyebrow}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl">{c.formTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.formLead}</p>
              <pre className="mt-4 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {configurationText}
              </pre>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="bp-name">{c.name}</Label>
                <Input id="bp-name" value={form.name} onChange={set("name")} autoComplete="name" required />
              </div>
              <div>
                <Label htmlFor="bp-business">{c.business}</Label>
                <Input id="bp-business" value={form.business} onChange={set("business")} autoComplete="organization" required />
              </div>
              <div>
                <Label htmlFor="bp-phone">{c.phone}</Label>
                <Input id="bp-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" required />
              </div>
              <div>
                <Label htmlFor="bp-email">{c.email}</Label>
                <Input id="bp-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bp-website">{c.website}</Label>
                <Input id="bp-website" value={form.website} onChange={set("website")} inputMode="url" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bp-message">{c.message}</Label>
                <Textarea id="bp-message" rows={3} value={form.message} onChange={set("message")} />
              </div>

              <input
                ref={honeypot}
                type="text"
                name="company_url"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div className="sm:col-span-2">
                <Turnstile onToken={setToken} resetKey={resetKey} action="blog-configurator" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
                {loading ? c.sending : c.send}
              </button>
            </div>
          </form>
        )}
      </div>
    </Section>
  );
};

export default Configurator;
