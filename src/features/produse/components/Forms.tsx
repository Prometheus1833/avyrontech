import { useMemo, useState } from "react";
import { Check, Loader2, Send, Sparkles } from "lucide-react";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import Turnstile from "@/components/site/Turnstile";
import type { Lang } from "@/i18n/translations";
import { OFFER, OFFER_GROUPS, type OfferGroup } from "../data/offer";
import { CATEGORIES } from "../data/taxonomy";
import { submitProductRequest } from "../lib/api";
import { Reveal } from "./Primitives";

/**
 * Cele două formulare ale paginii. Amândouă trimit în același loc (Worker →
 * D1 `leads` + e-mail SMTP), deci cererile apar direct în Leaduri & CRM din
 * AVYRON OS, fără pas manual.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Ghicește categoria cerută din ce scrie utilizatorul — sugestii, nu reguli. */
function guessCategories(text: string): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];
  const rules: Array<[string, RegExp]> = [
    ["hero", /hero|prima secțiune|first section|banner/],
    ["auth", /login|autentificare|sign in|cont|account|parol/],
    ["notifications", /notific|toast|alert|mesaj/],
    ["loading", /loader|loading|încărcare|incarcare|preload/],
    ["pricing", /pre[țt]|pricing|abonament|plan/],
    ["backgrounds", /fundal|background|gradient|aurora|shader/],
    ["spatial", /3d|particule|particles|three|spa[țt]ial/],
    ["import", /csv|json|import|export|excel/],
    ["seo", /seo|schema|meta|sitemap|indexare/],
    ["email", /e-?mail|smtp|routing|newsletter/],
    ["cursor", /cursor|mouse/],
    ["text", /text|titlu|typograph|font/],
    ["footer", /subsol|footer/],
    ["data", /grafic|chart|statistic|contor|counter/],
  ];
  for (const [key, re] of rules) if (re.test(t)) hits.push(key);
  return hits.slice(0, 3);
}

function Status({ state, lang }: { state: "ok" | "error" | null; lang: Lang }) {
  if (!state) return null;
  const ro = lang === "ro";
  return (
    <p className={`mt-2 flex items-center gap-1.5 text-xs ${state === "ok" ? "text-lime-300" : "text-red-300"}`} role="status">
      {state === "ok" ? <Check className="size-3.5" aria-hidden /> : null}
      {state === "ok"
        ? ro
          ? "Am primit cererea. Îți răspundem pe e-mail."
          : "Request received. We'll reply by email."
        : ro
          ? "Nu am putut trimite cererea. Încearcă din nou sau scrie-ne pe WhatsApp."
          : "We couldn't send the request. Try again or message us on WhatsApp."}
    </p>
  );
}

export function FeatureRequest({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"ok" | "error" | null>(null);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const suggestions = useMemo(() => guessCategories(text), [text]);

  const valid = text.trim().length > 8 && EMAIL.test(email) && (!TURNSTILE_SITE_KEY || token);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const result = await submitProductRequest({
      kind: "feature",
      email: email.trim(),
      message: text.trim(),
      category: [...new Set([...suggestions, ...picked])].join(", "),
      urgency,
      lang,
      turnstileToken: token,
    });
    setBusy(false);
    setState(result.ok ? "ok" : "error");
    if (result.ok) {
      setText("");
      setPicked([]);
    } else {
      setToken("");
      setResetKey((k) => k + 1);
    }
  };

  return (
    <form onSubmit={submit} className="pa-glass pa-edge rounded-3xl p-4 sm:p-5" style={{ "--pa-hue": 200 } as never}>
      <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-brand">{ro ? "Solicită o funcție" : "Request a feature"}</p>
      <h3 className="mt-1.5 font-display text-lg font-bold text-foreground">
        {ro ? "Nu găsești ce ai nevoie? Scrie-ne și îl construim." : "Can't find what you need? Tell us and we'll build it."}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {ro ? "Cererile cu cele mai multe voturi intră primele în lucru; partenerii Studio au prioritate." : "The most-voted requests are built first; Studio partners get priority."}
      </p>

      <textarea
        id="cerere-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1200}
        placeholder={ro ? "Ex: un hero cu hartă 3D și pini animați pentru o agenție imobiliară…" : "e.g. a hero with a 3D map and animated pins for a real-estate agency…"}
        className="mt-3 w-full resize-y rounded-xl border border-foreground/12 bg-foreground/[0.04] p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-brand/50"
      />

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="pa-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{ro ? "Categorii detectate" : "Detected categories"}</span>
          {suggestions.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={picked.includes(key)}
              onClick={() => setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]))}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${picked.includes(key) ? "border-brand bg-brand/15 text-foreground" : "border-foreground/12 text-muted-foreground"}`}
            >
              {CATEGORIES[key]?.[lang] ?? key}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={ro ? "E-mailul tău" : "Your email"}
          aria-label={ro ? "E-mail" : "Email"}
          className="min-w-[180px] flex-1 rounded-xl border border-foreground/12 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus-visible:border-brand/50"
        />
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          aria-label={ro ? "Cât de urgent" : "How urgent"}
          className="rounded-xl border border-foreground/12 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground"
        >
          <option value="normal" className="bg-background">
            {ro ? "Când se poate" : "Whenever"}
          </option>
          <option value="weeks" className="bg-background">
            {ro ? "În câteva săptămâni" : "In a few weeks"}
          </option>
          <option value="urgent" className="bg-background">
            {ro ? "Am nevoie acum (proiect activ)" : "I need it now (live project)"}
          </option>
        </select>
        <button
          type="submit"
          disabled={!valid || busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          data-ripple
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {ro ? "Trimite cererea" : "Send the request"}
        </button>
      </div>
      {TURNSTILE_SITE_KEY && (
        <div className="mt-2">
          <Turnstile onToken={setToken} resetKey={resetKey} action="produse-feature" />
        </div>
      )}
      <Status state={state} lang={lang} />
    </form>
  );
}

export function OfferSelector({ lang }: { lang: Lang }) {
  const ro = lang === "ro";
  const [picked, setPicked] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"ok" | "error" | null>(null);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const groups: OfferGroup[] = ["services", "integrations", "products"];
  const valid = picked.length > 0 && EMAIL.test(email) && (!TURNSTILE_SITE_KEY || token);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const labels = picked.map((id) => OFFER.find((o) => o.id === id)?.name[lang] ?? id);
    const result = await submitProductRequest({
      kind: "brief",
      email: email.trim(),
      message: note.trim() || (ro ? "Brief din selectorul universal." : "Brief from the universal selector."),
      selection: labels,
      lang,
      turnstileToken: token,
    });
    setBusy(false);
    setState(result.ok ? "ok" : "error");
    if (result.ok) {
      setPicked([]);
      setNote("");
    } else {
      setToken("");
      setResetKey((k) => k + 1);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {groups.map((group, index) => (
          <Reveal key={group} index={index}>
            <div className="pa-glass h-full rounded-2xl p-3.5">
              <p className="pa-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{OFFER_GROUPS[group][lang]}</p>
              <ul className="mt-2 grid list-none gap-1 p-0">
                {OFFER.filter((o) => o.group === group).map((option) => {
                  const on = picked.includes(option.id);
                  return (
                    <li key={option.id}>
                      <label className={`flex cursor-pointer gap-2 rounded-xl border p-2 transition ${on ? "border-brand/45 bg-brand/10" : "border-transparent hover:bg-foreground/[0.04]"}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setPicked((p) => (on ? p.filter((x) => x !== option.id) : [...p, option.id]))}
                          className="mt-0.5 size-3.5 shrink-0 accent-[hsl(264_90%_68%)]"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium leading-snug text-foreground">{option.name[lang]}</span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{option.spec[lang]}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="pa-glass rounded-2xl p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-brand" aria-hidden />
            {ro ? `${picked.length} selectate` : `${picked.length} selected`}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ro ? "E-mailul tău" : "Your email"}
            aria-label={ro ? "E-mail" : "Email"}
            className="min-w-[180px] flex-1 rounded-xl border border-foreground/12 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus-visible:border-brand/50"
          />
          <button
            type="submit"
            disabled={!valid || busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            data-ripple
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            {ro ? "Trimite selecția" : "Send the selection"}
          </button>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={400}
          placeholder={ro ? "Opțional: un rând despre proiectul tău" : "Optional: one line about your project"}
          className="mt-2 w-full rounded-xl border border-foreground/12 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {TURNSTILE_SITE_KEY && (
          <div className="mt-2">
            <Turnstile onToken={setToken} resetKey={resetKey} action="produse-brief" />
          </div>
        )}
        <Status state={state} lang={lang} />
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          {ro
            ? "Fără cont, fără costuri: primești pe e-mail specificațiile fiecărei opțiuni bifate și un singur răspuns cu ce recomandăm."
            : "No account, no cost: you get the specs of each option you ticked and one reply with what we recommend."}
        </p>
      </div>
    </form>
  );
}
