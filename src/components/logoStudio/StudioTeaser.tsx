import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Box, Layers, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { STUDIO_PRICES, cleanBrief, localConcepts, type StudioKind } from "@/data/logoStudio";
import { KIND_COPY, STUDIO_PATHS } from "@/data/logoStudioCopy";
import { useLeiPrice } from "@/components/logo3d/utils";
import { LogoPreview } from "./StudioParts";

const COPY = {
  ro: {
    title: "Sau creează-l singur, cu AI",
    lead: "Pentru un început rapid: scrii numele, AI-ul îți propune concepte vectoriale, le ajustezi și plătești doar când vrei fișierele. Creația e gratuită.",
    label: "Numele afacerii",
    placeholder: "ex. Brava Coffee",
    open: "Deschide Logo Studio",
    from: "de la",
    note: "Previzualizări rapide pentru numele scris. În Logo Studio primești concepte alese de AI pentru domeniul și stilul tău.",
  },
  en: {
    title: "Or create it yourself, with AI",
    lead: "For a quick start: type the name, the AI proposes vector concepts, you adjust them and pay only when you want the files. Creating is free.",
    label: "Business name",
    placeholder: "e.g. Brava Coffee",
    open: "Open Logo Studio",
    from: "from",
    note: "Quick previews for the name you typed. In Logo Studio you get concepts chosen by the AI for your industry and style.",
  },
};

export default function StudioTeaser() {
  const { lang } = useLang();
  const c = COPY[lang];
  const lei = useLeiPrice(lang);
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [name, setName] = useState("");
  const [shown, setShown] = useState("Brava Coffee");

  // Fonts and the outline library load only when the section approaches the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(name.trim() || "Brava Coffee"), 250);
    return () => window.clearTimeout(t);
  }, [name]);

  const brief = useMemo(() => cleanBrief({ name: shown, industry: "other", style: "modern", kind: "static", lang }), [shown, lang]);
  const concepts = useMemo(() => (brief ? localConcepts(brief, 3, "teaser") : []), [brief]);
  const href = (kind: StudioKind) => `${STUDIO_PATHS[lang]}?name=${encodeURIComponent(name.trim())}&tip=${kind === "dynamic" ? "dinamic" : "static"}`;

  return (
    <section ref={ref} id="creeaza-singur" className="l3d-section" data-palette="#bef264,#8b5cf6" aria-labelledby="teaser-title">
      <div className="l3d-wrap ls ls-teaser">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--l3d-lime)]">
            <Sparkles className="size-4" aria-hidden /> Avyron Logo Studio
          </p>
          <h2 id="teaser-title" className="l3d-h2 mt-3 l3d-wipe">
            {c.title}
          </h2>
          <p className="l3d-lead" data-reveal>
            {c.lead}
          </p>
          <label className="ls-field mt-6 max-w-md" data-reveal style={{ ["--i" as string]: 1 }}>
            <span>{c.label}</span>
            <input className="l3d-input" value={name} maxLength={28} placeholder={c.placeholder} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2" data-reveal style={{ ["--i" as string]: 2 }}>
            {(["static", "dynamic"] as const).map((k) => {
              const Icon = k === "static" ? Layers : Box;
              return (
                <Link key={k} to={href(k)} className="ls-kind block" onClick={() => trackEvent("logo_studio_teaser", { kind: k })}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon className="size-4 text-[var(--l3d-violet)]" aria-hidden />
                      {KIND_COPY[lang][k].title}
                    </span>
                    <ArrowRight className="size-4 text-[var(--l3d-muted)]" aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm text-[var(--l3d-muted)]">
                    {c.from} <b className="text-[var(--l3d-text)]">{lei(STUDIO_PRICES[k])}</b> · {KIND_COPY[lang][k].lead}
                  </span>
                </Link>
              );
            })}
          </div>
          <Link to={href("static")} className="l3d-btn l3d-btn-primary mt-6" data-reveal style={{ ["--i" as string]: 3 }}>
            <Sparkles className="size-4" aria-hidden />
            {c.open}
          </Link>
        </div>
        <div data-reveal="scale">
          {near && brief ? (
            <div className="ls-teaser-grid">
              {concepts.map((concept, i) => (
                <LogoPreview key={`${shown}-${i}`} concept={concept} brief={brief} background={i === 1 ? "dark" : "paper"} label={`${shown} — ${concept.idea}`} />
              ))}
            </div>
          ) : (
            <div className="ls-teaser-grid" aria-hidden>
              <div className="ls-preview" />
              <div className="ls-preview" />
              <div className="ls-preview" />
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--l3d-dim)]">{c.note}</p>
        </div>
      </div>
    </section>
  );
}
