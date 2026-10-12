import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Download, Loader2, Lock, PenTool, Sparkles, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";
import { trackEvent } from "@/lib/analytics";
import { cleanBrief, encodeDesign, localConcepts, type LogoConcept } from "@/data/logoStudio";
import { STUDIO_PATHS } from "@/data/logoStudioCopy";
import { LogoPreview } from "@/components/logoStudio/StudioParts";
import "@/components/logo3d/logo3d.css";
import "@/components/logoStudio/studio.css";

type ResultSource = "standard" | "ai" | null;

export default function LogoStudioIntro() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [mark, setMark] = useState("");
  const [notes, setNotes] = useState("");
  const [concepts, setConcepts] = useState<LogoConcept[]>([]);
  const [source, setSource] = useState<ResultSource>(null);
  const [busy, setBusy] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [salt, setSalt] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const brief = useMemo(
    () => cleanBrief({ name, tagline: mark, notes, industry: "other", style: "modern", kind: "static", lang }),
    [name, mark, notes, lang],
  );

  const show = (next: LogoConcept[], nextSource: ResultSource) => {
    setConcepts(next.slice(0, 4));
    setSource(nextSource);
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };

  const showStandard = () => {
    if (!brief) return;
    const nextSalt = salt + 1;
    setSalt(nextSalt);
    show(localConcepts(brief, 4, `landing-${nextSalt}`), "standard");
    trackEvent("landing_logo_preview", { source: "standard" });
  };

  const showAi = async () => {
    if (!brief || busy) return;
    if (!user) {
      setAuthPrompt(true);
      return;
    }
    setBusy(true);
    setAuthPrompt(false);
    try {
      const response = await cfAuth.requestResponse("/api/logo-studio/generate", {
        method: "POST",
        body: JSON.stringify({ brief }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as { concepts?: LogoConcept[] };
      if (!payload.concepts?.length) throw new Error("empty");
      show(payload.concepts, "ai");
      trackEvent("landing_logo_preview", { source: "ai" });
    } catch {
      show(localConcepts(brief, 4, `ai-fallback-${salt}`), "standard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="logo-studio" aria-labelledby="logo-studio-title" className="relative overflow-hidden bg-[#07100f] py-14 text-white sm:py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(190,242,100,.13),transparent_32%),radial-gradient(circle_at_90%_100%,rgba(125,211,252,.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="grid items-start gap-8 lg:grid-cols-[.92fr_1.08fr] lg:gap-12">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-lime-200"><PenTool className="size-4" />Logo Studio</p>
            <h2 id="logo-studio-title" className="mt-3 max-w-[12ch] font-display text-3xl font-bold leading-[.98] tracking-[-.045em] sm:text-5xl">
              {ro ? "Numele tău. Patru direcții de logo, în câteva clipe." : "Your name. Four logo directions in moments."}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/62 sm:text-base">
              {ro
                ? "Creezi rapid un logo 2D personalizat din numele, inițialele sau semnul brandului tău. Alegi o direcție, o ajustezi și pregătești fișierele potrivite pentru site, social media, print și favicon."
                : "Quickly create a personalised 2D logo from your brand name, initials or symbol. Choose a direction, refine it and prepare files for web, social, print and favicons."}
            </p>
            <div className="mt-6 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><span className="flex items-center gap-2 font-bold"><Download className="size-4 text-lime-200" />{ro ? "Logo standard · export gratuit" : "Standard logo · free export"}</span><p className="mt-1.5 leading-relaxed text-white/48">{ro ? "Cont Avyron gratuit necesar pentru descărcare." : "A free Avyron account is required to download."}</p></div>
              <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[.055] p-4"><span className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-sky-200" />{ro ? "Logo cu AI · export 150 lei" : "AI logo · 150 lei export"}</span><p className="mt-1.5 leading-relaxed text-white/48">{ro ? "Patru concepte propuse de AI-ul intern Cloudflare." : "Four concepts proposed by the internal Cloudflare AI."}</p></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[.04] p-4 shadow-[0_30px_90px_-45px_rgba(0,0,0,.95)] backdrop-blur sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-white/70"><span>{ro ? "Numele brandului *" : "Brand name *"}</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={28} autoComplete="organization" placeholder={ro ? "ex. Nord Atelier" : "e.g. North Studio"} className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-lime-200/50" /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-white/70"><span>{ro ? "Inițiale / semn" : "Initials / symbol"}</span><input value={mark} onChange={(event) => setMark(event.target.value)} maxLength={40} placeholder={ro ? "ex. NA · frunză · arc" : "e.g. NS · leaf · arch"} className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-lime-200/50" /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-white/70 sm:col-span-2"><span>{ro ? "Cum vrei să fie transformat" : "How it should be transformed"}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={240} rows={2} placeholder={ro ? "ex. minimal, cald, geometric; fără efecte încărcate" : "e.g. minimal, warm, geometric; no busy effects"} className="resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-lime-200/50" /></label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={!brief || busy} onClick={showStandard} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-lime-300 px-4 text-xs font-black text-[#07100f] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"><Wand2 className="size-4" />{ro ? "Vezi logo-ul tău" : "See your logo"}</button>
              <button type="button" disabled={!brief || busy} onClick={() => void showAi()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sky-200/30 bg-sky-200/10 px-4 text-xs font-black text-sky-100 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{busy ? (ro ? "AI-ul pregătește…" : "AI is preparing…") : ro ? "Vezi logo-ul cu AI" : "See your AI logo"}</button>
            </div>
            <AnimatePresence initial={false}>
              {authPrompt && !user && !authLoading && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-200/20 bg-sky-200/[.06] p-4"><Lock className="mt-0.5 size-4 shrink-0 text-sky-200" /><div><p className="text-sm font-bold">{ro ? "AI-ul este disponibil în contul gratuit" : "AI is available with a free account"}</p><p className="mt-1 text-xs leading-relaxed text-white/48">{ro ? "Autentifică-te pentru generare; plata de 150 lei se aplică numai dacă alegi exportul unui concept AI." : "Sign in to generate; the 150 lei payment applies only when you choose to export an AI concept."}</p><Link to="/auth" state={{ from: "/#logo-studio" }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-sky-200">{ro ? "Autentificare / cont nou" : "Sign in / create account"}<ArrowUpRight className="size-3.5" /></Link></div></div></motion.div>}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {brief && concepts.length > 0 && <motion.div ref={resultsRef} data-testid="landing-logo-results" initial={{ height: 0, opacity: 0, y: 14 }} animate={{ height: "auto", opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-8 border-t border-white/10 pt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/40">{source === "ai" ? (ro ? "4 direcții create cu AI" : "4 AI-created directions") : ro ? "4 variante standard" : "4 standard options"}</p><h3 className="mt-1 text-xl font-bold">{ro ? "Alege direcția care te reprezintă" : "Choose the direction that fits you"}</h3></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold text-white/55">{source === "ai" ? (ro ? "Export · 150 lei" : "Export · 150 lei") : ro ? "Export · gratuit cu cont" : "Export · free with account"}</span></div><ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{concepts.map((concept, index) => { const design = encodeDesign(brief, concept); const href = `${STUDIO_PATHS[lang]}?design=${encodeURIComponent(design)}&source=${source ?? "standard"}`; return <li key={`${concept.symbol}-${concept.font}-${index}`} data-testid="landing-logo-option" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-2"><LogoPreview concept={concept} brief={brief} background={index % 2 ? "dark" : "paper"} watermark={ro ? "PREVIZUALIZARE" : "PREVIEW"} label={`${brief.name} — ${concept.idea}`} /><Link to={href} className="mt-2 flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-[10px] font-bold text-white/68 hover:bg-white/[.06] hover:text-white"><span className="line-clamp-1">{concept.idea}</span><ArrowUpRight className="size-3.5 shrink-0" /></Link></li>; })}</ul><div className="mt-4 text-center"><Link to={`${STUDIO_PATHS[lang]}?name=${encodeURIComponent(brief.name)}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/[.06]">{ro ? "Deschide editorul Logo Studio" : "Open the Logo Studio editor"}<ArrowUpRight className="size-3.5" /></Link></div></div></motion.div>}
        </AnimatePresence>
      </div>
    </section>
  );
}
