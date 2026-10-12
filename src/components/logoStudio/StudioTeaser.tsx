import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { cleanBrief, localConcepts } from "@/data/logoStudio";
import { STUDIO_PATHS } from "@/data/logoStudioCopy";
import { LogoPreview } from "./StudioParts";

const COPY = {
  ro: {
    title: "Sau creează-l rapid în Logo Studio",
    lead: "Explorează patru direcții 2D pentru numele sau inițialele brandului, apoi ajustează-le în editor. Pentru volum și animație, lucrăm împreună la un logo dinamic 3D.",
    label: "Numele afacerii",
    placeholder: "ex. Brava Coffee",
    open: "Deschide Logo Studio",
    from: "Export",
    note: "Previzualizări vectoriale pentru numele scris, adaptabile pentru web, social media, print și favicon.",
  },
  en: {
    title: "Or create it quickly in Logo Studio",
    lead: "Explore four 2D directions for your brand name or initials, then refine them in the editor. For volume and animation, we work together on a dynamic 3D logo.",
    label: "Business name",
    placeholder: "e.g. Brava Coffee",
    open: "Open Logo Studio",
    from: "Export",
    note: "Vector previews for the name you entered, adaptable for web, social media, print and favicons.",
  },
};

export default function StudioTeaser() {
  const { lang } = useLang();
  const c = COPY[lang];
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
  const href = (source: "standard" | "ai") => `${STUDIO_PATHS[lang]}?name=${encodeURIComponent(name.trim())}&source=${source}`;

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
            {(["standard", "ai"] as const).map((k) => {
              const Icon = k === "standard" ? Layers : Sparkles;
              return (
                <Link key={k} to={href(k)} className="ls-kind block" onClick={() => trackEvent("logo_studio_teaser", { kind: k })}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon className="size-4 text-[var(--l3d-violet)]" aria-hidden />
                      {k === "standard" ? (lang === "ro" ? "Logo 2D standard" : "Standard 2D logo") : (lang === "ro" ? "Logo 2D cu AI" : "AI 2D logo")}
                    </span>
                    <ArrowRight className="size-4 text-[var(--l3d-muted)]" aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm text-[var(--l3d-muted)]">
                    {k === "standard" ? (lang === "ro" ? "Export standard gratuit cu cont" : "Free standard export with an account") : (lang === "ro" ? "Explorează concepte asistate de AI" : "Explore AI-assisted concepts")}
                  </span>
                </Link>
              );
            })}
          </div>
          <Link to={href("standard")} className="l3d-btn l3d-btn-primary mt-6" data-reveal style={{ ["--i" as string]: 3 }}>
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
