import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Mail, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import Turnstile from "@/components/site/Turnstile";
import { apiUrl } from "@/lib/apiBase";
import { readCookieConsent } from "@/lib/cookieConsent";

type NewsletterConfig = {
  enabled: boolean;
  promptEnabled: boolean;
  delaySeconds: number;
  minPageViews: number;
  scrollPercent: number;
  cooldownDays: number;
  title: { ro: string; en: string };
  body: { ro: string; en: string };
  cta: { ro: string; en: string };
  frequency: { ro: string; en: string };
  consentPolicyVersion: string;
};

const STATE_KEY = "avyron-newsletter-prompt-v1";
const SESSION_KEY = "avyron-newsletter-pages-v1";
const excluded = /^\/(auth|autentificare|profil|intern|finance|gdpr|en\/privacy|termeni|en\/terms|politica-cookies|en\/cookie-policy|unsubscribe|403|500|offline|mentenanta|exemple|examples|demo)(\/|$)/;

type PromptState = { lastShownAt?: number; subscribedAt?: number };

const isLocalizedCopy = (value: unknown): value is { ro: string; en: string } => {
  if (!value || typeof value !== "object") return false;
  const copy = value as Record<string, unknown>;
  return typeof copy.ro === "string" && typeof copy.en === "string";
};

const isNewsletterConfig = (value: unknown): value is NewsletterConfig => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.enabled === "boolean"
    && typeof item.promptEnabled === "boolean"
    && ["delaySeconds", "minPageViews", "scrollPercent", "cooldownDays"].every((key) => Number.isFinite(item[key]))
    && isLocalizedCopy(item.title)
    && isLocalizedCopy(item.body)
    && isLocalizedCopy(item.cta)
    && isLocalizedCopy(item.frequency)
    && typeof item.consentPolicyVersion === "string";
};

const readState = (): PromptState => {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") as PromptState; }
  catch { return {}; }
};

const interestForPath = (path: string) => {
  if (/logo/.test(path)) return "logo-3d";
  if (/magazin|online-store/.test(path)) return "ecommerce";
  if (/automatizari|automation|ai/.test(path)) return "ai-automation";
  if (/blog/.test(path)) return "content";
  if (/social/.test(path)) return "social-media";
  if (/website|presentation/.test(path)) return "website";
  return "digital-growth";
};

const pageViews = (pathname: string) => {
  try {
    const visited = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]") as string[];
    const normalized = pathname.replace(/\/$/, "") || "/";
    const next = visited.includes(normalized) ? visited : [...visited, normalized].slice(-20);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next.length;
  } catch { return 1; }
};

export default function NewsletterPrompt() {
  const { pathname, search } = useLocation();
  const language: "ro" | "en" = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ro";
  const [config, setConfig] = useState<NewsletterConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);
  const eligiblePath = !excluded.test(pathname);

  useEffect(() => {
    const state = new URLSearchParams(search).get("newsletter");
    if (state === "confirmed") {
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), subscribedAt: Date.now() }));
      toast.success(language === "en" ? "Subscription confirmed. Welcome!" : "Abonarea a fost confirmată. Bine ai venit!");
      window.history.replaceState({}, "", pathname + window.location.hash);
    } else if (state === "invalid") {
      toast.error(language === "en" ? "This confirmation link is invalid or expired." : "Linkul de confirmare este invalid sau a expirat.");
      window.history.replaceState({}, "", pathname + window.location.hash);
    }
  }, [language, pathname, search]);

  useEffect(() => {
    if (!eligiblePath) return;
    let cancelled = false;
    fetch(apiUrl("/api/newsletter/config"), { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("config_unavailable");
        return response.json() as Promise<{ data?: unknown }>;
      })
      .then(({ data }) => { if (!cancelled && isNewsletterConfig(data)) setConfig(data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [eligiblePath]);

  useEffect(() => {
    if (!eligiblePath || !config?.enabled || !config.promptEnabled || dismissed) return;
    const promptState = readState();
    if (promptState.subscribedAt) return;
    if (promptState.lastShownAt && Date.now() - promptState.lastShownAt < config.cooldownDays * 86400000) return;
    if (pageViews(pathname) < config.minPageViews) return;

    let consentDecided = Boolean(readCookieConsent());
    let elapsed = false;
    let engaged = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) * 100 >= config.scrollPercent;
    const reveal = () => {
      if (!consentDecided || !elapsed || !engaged) return;
      setVisible(true);
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), lastShownAt: Date.now() }));
    };
    const onScroll = () => {
      const scroll = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) * 100;
      if (scroll >= config.scrollPercent) { engaged = true; reveal(); }
    };
    const consentTimer = window.setInterval(() => { consentDecided = Boolean(readCookieConsent()); reveal(); }, 1000);
    const timer = window.setTimeout(() => { elapsed = true; reveal(); }, config.delaySeconds * 1000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearInterval(consentTimer);
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [config, dismissed, eligiblePath, pathname]);

  const copy = useMemo(() => config && ({
    title: config.title[language], body: config.body[language], cta: config.cta[language], frequency: config.frequency[language],
  }), [config, language]);

  const close = () => { setVisible(false); setDismissed(true); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) {
      toast.error(language === "en" ? "Please confirm your newsletter consent." : "Confirmă acordul pentru newsletter.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(apiUrl("/api/newsletter/subscribe"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email, name, language, consent, turnstileToken, company: "", source: `website:${pathname}`,
          interest: interestForPath(pathname), consentPolicyVersion: config?.consentPolicyVersion,
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message || (language === "en" ? "Subscription could not be saved." : "Abonarea nu a putut fi salvată."));
      setDone(true);
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), subscribedAt: Date.now() }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Newsletter indisponibil");
      setResetKey((value) => value + 1);
      setTurnstileToken("");
    } finally { setBusy(false); }
  };

  if (!visible || !config || !copy) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[65] ml-auto max-w-md sm:inset-x-auto sm:bottom-5 sm:right-5" role="dialog" aria-modal="false" aria-labelledby="newsletter-title">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-violet-300/20 bg-[#090d19]/95 p-5 text-white shadow-[0_28px_90px_-25px_rgba(79,70,229,.8)] backdrop-blur-2xl sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-violet-500/20 blur-3xl" />
        <button type="button" onClick={close} className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label={language === "en" ? "Close" : "Închide"}><X className="size-4" /></button>
        {done ? (
          <div className="relative py-4 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Check className="size-6" /></span>
            <h2 id="newsletter-title" className="mt-4 font-display text-xl font-bold">{language === "en" ? "One last step" : "Încă un pas"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{language === "en" ? "Check your inbox and confirm the subscription. The link is valid for 24 hours." : "Verifică inboxul și confirmă abonarea. Linkul este valabil 24 de ore."}</p>
            <button type="button" onClick={close} className="mt-5 text-sm font-medium text-violet-300 hover:text-violet-200">{language === "en" ? "Continue browsing" : "Continuă navigarea"}</button>
          </div>
        ) : (
          <>
            <div className="relative pr-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-violet-200"><Sparkles className="size-3" /> AVYRON / SIGNAL</span>
              <h2 id="newsletter-title" className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">{copy.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy.body}</p>
            </div>
            <form onSubmit={submit} className="relative mt-5 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[.8fr_1.2fr]">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" placeholder={language === "en" ? "Name (optional)" : "Nume (opțional)"} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400/50" />
                <label className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-300" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="email@companie.ro" className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400/50" /></label>
              </div>
              <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-400"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 rounded border-white/20 accent-violet-500" /><span>{language === "en" ? "I agree to receive the AVYRON newsletter and understand that I can unsubscribe at any time." : "Sunt de acord să primesc newsletterul AVYRON și înțeleg că mă pot dezabona oricând."} <a href={language === "en" ? "/en/privacy" : "/gdpr"} className="text-violet-300 hover:underline">{language === "en" ? "Privacy" : "Confidențialitate"}</a></span></label>
              <Turnstile action="newsletter-subscribe" onToken={onTurnstileToken} resetKey={resetKey} />
              <button disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-3 text-sm font-semibold shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:opacity-60">{busy ? (language === "en" ? "Saving…" : "Se salvează…") : copy.cta}<ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></button>
              <p className="text-center text-[10px] text-slate-500">{copy.frequency} · Double opt-in.</p>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}
