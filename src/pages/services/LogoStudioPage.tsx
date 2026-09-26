import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Lock, Mail, Share2, Sparkles, Wand2, Zap } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/apiBase";
import { trackEvent } from "@/lib/analytics";
import { trackFunnel } from "@/lib/siteAnalytics";
import LangSwitch from "@/components/site/LangSwitch";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
import Footer from "@/components/site/Footer";
import FloatingWhatsApp from "@/components/site/FloatingWhatsApp";
import logo from "@/assets/avyron-logo.jpg";
import { StageProvider } from "@/components/logo3d/StageProvider";
import { ripple, useLeiPrice } from "@/components/logo3d/utils";
import {
  CASES,
  FONTS,
  INDUSTRIES,
  LAYOUTS,
  MATERIALS,
  SHAPES,
  STUDIO_PRICES,
  STYLES,
  cleanBrief,
  decodeDesign,
  localConcepts,
  type Industry,
  type LogoBrief,
  type LogoConcept,
  type StudioKind,
  type Style,
} from "@/data/logoStudio";
import {
  FONT_LABELS,
  INDUSTRY_LABELS,
  KIND_COPY,
  LAYOUT_LABELS,
  SHAPE_LABELS,
  STUDIO_FAQ,
  STUDIO_META,
  STUDIO_PATHS,
  STUDIO_UI,
  STYLE_LABELS,
} from "@/data/logoStudioCopy";
import { LOGO3D_PATHS, MATERIAL_LABELS } from "@/data/logo3d";
import { LogoPreview, OrderForm, StaffExport, StudioLogo3D } from "@/components/logoStudio/StudioParts";
import "@/components/logo3d/logo3d.css";
import "@/components/logoStudio/studio.css";

type Source = "ai" | "local" | "limit" | null;

function StudioBody() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const t = STUDIO_UI[lang];
  const lei = useLeiPrice(lang);
  const { isStaff } = useAuth();

  const [kind, setKind] = useState<StudioKind>("static");
  const [form, setForm] = useState({ name: "", tagline: "", industry: "other" as Industry, style: "modern" as Style, color: "", notes: "" });
  const [useColor, setUseColor] = useState(false);
  const [concepts, setConcepts] = useState<LogoConcept[]>([]);
  const [source, setSource] = useState<Source>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [edit, setEdit] = useState<LogoConcept | null>(null);
  const [bg, setBg] = useState<"paper" | "dark">("paper");
  const [ordering, setOrdering] = useState(false);
  const [salt, setSalt] = useState(0);
  const resultsRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);

  const brief: LogoBrief | null = useMemo(
    () => cleanBrief({ ...form, color: useColor ? form.color : "", kind, lang }),
    [form, useColor, kind, lang],
  );

  // Prefill from ?name= (coming from the service page) or reopen a design from ?design=.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const design = q.get("design");
    if (design) {
      const d = decodeDesign(design);
      if (d) {
        setForm({ name: d.brief.name, tagline: d.brief.tagline, industry: d.brief.industry, style: d.brief.style, color: d.brief.color, notes: d.brief.notes });
        setUseColor(Boolean(d.brief.color));
        setKind(d.brief.kind);
        setConcepts([d.concept]);
        setPicked(0);
        setEdit(d.concept);
        setSource("local");
        window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
        return;
      }
    }
    const name = q.get("name");
    if (name) setForm((f) => ({ ...f, name: name.slice(0, 28) }));
    const k = q.get("tip") || q.get("kind");
    if (k === "dinamic" || k === "dynamic") setKind("dynamic");
  }, []);

  const show = useCallback((list: LogoConcept[], src: Source) => {
    setConcepts(list);
    setSource(src);
    setPicked(null);
    setEdit(null);
    setOrdering(false);
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);

  const quick = () => {
    if (!brief) return;
    const next = salt + 1;
    setSalt(next);
    show(localConcepts(brief, 6, String(next)), "local");
    trackEvent("logo_studio_generate", { source: "local", kind });
  };

  const generate = async () => {
    if (!brief || busy) return;
    setBusy(true);
    trackFunnel("view_configurator", "logo_studio", { product: "logo_studio", kind });
    try {
      const res = await fetch(apiUrl("/api/logo-studio/generate"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (res.status === 429) {
        show(localConcepts(brief, 6, String(salt)), "limit");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { concepts?: LogoConcept[] };
      if (!data.concepts?.length) throw new Error("empty");
      show(data.concepts, "ai");
      trackEvent("logo_studio_generate", { source: "ai", kind });
    } catch {
      show(localConcepts(brief, 6, String(salt)), "local");
    } finally {
      setBusy(false);
    }
  };

  const choose = (i: number) => {
    setPicked(i);
    setEdit({ ...concepts[i] });
    setOrdering(false);
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const patch = (p: Partial<LogoConcept>) => setEdit((e) => (e ? { ...e, ...p } : e));
  const patchPalette = (k: keyof LogoConcept["palette"], v: string) => setEdit((e) => (e ? { ...e, palette: { ...e.palette, [k]: v } } : e));

  const price = lei(STUDIO_PRICES[kind]);
  const openOrder = (via: string) => {
    setOrdering(true);
    trackEvent("logo_studio_checkout", { via, kind });
    window.setTimeout(() => document.getElementById("comanda")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  const note = source === "ai" ? t.aiNote : source === "limit" ? t.limitNote : source === "local" ? t.localNote : "";

  return (
    <div className="l3d-content">
      <header className="l3d-wrap flex items-center justify-between gap-3 pt-6 sm:pt-8">
        <PageBackLink to={LOGO3D_PATHS[lang]} label={ro ? "Înapoi" : "Back"} title={t.back} />
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 backdrop-blur">
            <LangSwitch />
          </div>
          <a href={ro ? "/#hero" : "/en#hero"} aria-label={ro ? "Acasă" : "Home"} className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-white/5">
            <img src={logo} alt="" width={32} height={32} className="size-7 rounded-md ring-1 ring-white/15 sm:size-8" />
            <span className="font-display text-xs tracking-[0.2em] sm:text-sm">AVYRON</span>
          </a>
        </div>
      </header>
      <div className="l3d-wrap">
        <Breadcrumbs
          className="mt-5"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Logo Dinamic 3D" : "Dynamic 3D Logo", path: LOGO3D_PATHS[lang] },
            { name: ro ? "Creează-ți logo-ul" : "Create your logo", path: STUDIO_PATHS[lang] },
          ]}
        />
      </div>

      {/* ---------------------------------------------------------- hero + kind */}
      <section id="studio" className="l3d-section ls-hero" data-palette="#8b5cf6,#bef264" aria-labelledby="studio-title">
        <div className="l3d-wrap">
          <p className="ls-kicker">Avyron Logo Studio · AI</p>
          <h1 id="studio-title" className="l3d-h2 ls-h1">
            {t.h1}
          </h1>
          <p className="l3d-lead">{t.lead}</p>
          <ol className="ls-how">
            {t.how.map((h, i) => (
              <li key={h}>
                <span aria-hidden>{i + 1}</span>
                {h}
              </li>
            ))}
          </ol>
          <div role="radiogroup" aria-label={t.kindLabel} className="ls-kinds">
            {(["static", "dynamic"] as const).map((k) => {
              const c = KIND_COPY[lang][k];
              return (
                <button key={k} type="button" role="radio" aria-checked={kind === k} className="ls-kind" onClick={() => setKind(k)}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{c.title}</span>
                    <span className="text-sm text-[var(--l3d-muted)]">
                      {t.from} <b className="text-[var(--l3d-text)]">{lei(STUDIO_PRICES[k])}</b>
                    </span>
                  </span>
                  <span className="mt-1 block text-left text-sm text-[var(--l3d-muted)]">{c.lead}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- brief */}
      <section id="brief" className="l3d-section pt-0" data-palette="#8b5cf6,#38bdf8" aria-labelledby="brief-title">
        <div className="l3d-wrap">
          <div className="ls-card">
            <h2 id="brief-title" className="text-2xl font-semibold tracking-tight">
              {t.briefTitle}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="ls-field">
                <span>{t.name} *</span>
                <input className="l3d-input" value={form.name} maxLength={28} placeholder={t.namePh} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="organization" />
              </label>
              <label className="ls-field">
                <span>{t.tagline}</span>
                <input className="l3d-input" value={form.tagline} maxLength={40} placeholder={t.taglinePh} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </label>
              <label className="ls-field">
                <span>{t.industry}</span>
                <select className="l3d-input ls-select" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value as Industry })}>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {INDUSTRY_LABELS[lang][i]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ls-field">
                <span>{t.color}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    className="ls-color"
                    aria-label={t.color}
                    value={form.color || "#6d5dfc"}
                    onChange={(e) => {
                      setForm({ ...form, color: e.target.value });
                      setUseColor(true);
                    }}
                  />
                  <button type="button" className="l3d-chip" aria-pressed={!useColor} onClick={() => setUseColor(false)}>
                    {t.noColor}
                  </button>
                </div>
              </div>
              <div className="ls-field md:col-span-2">
                <span id="style-label">{t.style}</span>
                <div role="radiogroup" aria-labelledby="style-label" className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={form.style === s} className="l3d-chip ls-radio" onClick={() => setForm({ ...form, style: s })}>
                      {STYLE_LABELS[lang][s]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="ls-field md:col-span-2">
                <span>{t.notes}</span>
                <textarea className="l3d-input ls-textarea" rows={2} maxLength={240} value={form.notes} placeholder={t.notesPh} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="l3d-btn l3d-btn-primary"
                disabled={!brief || busy}
                onClick={(e) => {
                  ripple(e);
                  void generate();
                }}
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                {busy ? t.generating : t.generate}
              </button>
              <button type="button" className="l3d-btn l3d-btn-ghost" disabled={!brief || busy} onClick={quick}>
                <Zap className="size-4" aria-hidden />
                {t.quick}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- results */}
      {(busy || concepts.length > 0) && brief && (
        <section ref={resultsRef} id="concepte" className="l3d-section pt-0" data-palette="#38bdf8,#8b5cf6" aria-labelledby="results-title" aria-busy={busy}>
          <div className="l3d-wrap">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="results-title" className="text-2xl font-semibold tracking-tight">
                  {t.resultsTitle}
                </h2>
                {note && !busy && (
                  <p className="mt-1 text-sm text-[var(--l3d-muted)]" aria-live="polite">
                    {note}
                  </p>
                )}
              </div>
              {!busy && (
                <button type="button" className="l3d-chip" onClick={source === "ai" ? () => void generate() : quick}>
                  <Wand2 className="size-4" aria-hidden />
                  {t.again}
                </button>
              )}
            </div>
            <ul className="ls-grid">
              {busy
                ? Array.from({ length: 4 }, (_, i) => <li key={i} className="ls-skeleton" aria-hidden />)
                : concepts.map((c, i) => (
                    <li key={`${i}-${c.symbol}-${c.font}`} className="ls-result" data-picked={picked === i}>
                      <LogoPreview concept={c} brief={brief} watermark={t.preview} label={`${brief.name} — ${c.idea}`} className="ls-result-preview" />
                      <p className="mt-3 min-h-[2.8rem] text-sm leading-relaxed text-[var(--l3d-muted)]">{c.idea}</p>
                      <button type="button" className={`l3d-btn ${picked === i ? "l3d-btn-primary" : "l3d-btn-ghost"} mt-3 w-full`} aria-pressed={picked === i} onClick={() => choose(i)}>
                        {picked === i ? t.chosen : t.choose}
                      </button>
                    </li>
                  ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- editor + checkout */}
      {edit && brief && (
        <section ref={editorRef} id="editor" className="l3d-section pt-0" data-palette="#7c3aed,#38bdf8" aria-labelledby="editor-title">
          <div className="l3d-wrap ls-editor">
            <div>
              <h2 id="editor-title" className="text-2xl font-semibold tracking-tight">
                {t.editorTitle}
              </h2>
              {kind === "dynamic" ? (
                <div className="ls-stage mt-4">
                  <StudioLogo3D concept={edit} brief={brief} label={`${brief.name}, 3D, ${MATERIAL_LABELS[lang][edit.material]}`} />
                </div>
              ) : null}
              <LogoPreview
                concept={edit}
                brief={brief}
                background={bg}
                watermark={t.preview}
                label={`${brief.name} — ${t.editorTitle}`}
                className={`ls-big ${kind === "dynamic" ? "ls-big-sub" : ""} mt-4`}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="l3d-chip" aria-pressed={bg === "paper"} onClick={() => setBg("paper")}>{t.bgLight}</button>
                <button type="button" className="l3d-chip" aria-pressed={bg === "dark"} onClick={() => setBg("dark")}>{t.bgDark}</button>
              </div>

              <div className="ls-controls mt-6">
                <label className="ls-field">
                  <span>{t.symbol}</span>
                  <select className="l3d-input ls-select" value={edit.symbol} onChange={(e) => patch({ symbol: e.target.value as LogoConcept["symbol"] })}>
                    {SHAPES.map((s) => <option key={s} value={s}>{SHAPE_LABELS[lang][s]}</option>)}
                  </select>
                </label>
                <label className="ls-field">
                  <span>{t.layout}</span>
                  <select className="l3d-input ls-select" value={edit.layout} onChange={(e) => patch({ layout: e.target.value as LogoConcept["layout"] })}>
                    {LAYOUTS.map((s) => <option key={s} value={s}>{LAYOUT_LABELS[lang][s]}</option>)}
                  </select>
                </label>
                <label className="ls-field">
                  <span>{t.font}</span>
                  <select className="l3d-input ls-select" value={edit.font} onChange={(e) => patch({ font: e.target.value as LogoConcept["font"] })}>
                    {FONTS.map((s) => <option key={s} value={s}>{FONT_LABELS[lang][s]}</option>)}
                  </select>
                </label>
                <label className="ls-field">
                  <span>{t.caseLabel}</span>
                  <select className="l3d-input ls-select" value={edit.caseStyle} onChange={(e) => patch({ caseStyle: e.target.value as LogoConcept["caseStyle"] })}>
                    {CASES.map((c, i) => <option key={c} value={c}>{t.cases[i]}</option>)}
                  </select>
                </label>
                <label className="ls-field">
                  <span>{t.tracking}</span>
                  <input type="range" min={-0.04} max={0.3} step={0.01} value={edit.tracking} onChange={(e) => patch({ tracking: Number(e.target.value) })} className="ls-range" />
                </label>
                <label className="ls-field ls-inline">
                  <input
                    type="checkbox"
                    className="ls-check"
                    checked={Boolean(edit.monogram)}
                    onChange={(e) => patch({ monogram: e.target.checked ? [...brief.name].filter((ch) => /\p{L}|\p{N}/u.test(ch)).slice(0, 1).join("").toUpperCase() : "" })}
                  />
                  <span>{t.monogram}</span>
                </label>
                <div className="ls-field sm:col-span-2">
                  <span>{t.colors}</span>
                  <div className="flex flex-wrap gap-4">
                    {(["primary", "accent", "ink"] as const).map((k) => (
                      <label key={k} className="flex items-center gap-2 text-sm text-[var(--l3d-muted)]">
                        <input type="color" className="ls-color" value={edit.palette[k]} onChange={(e) => patchPalette(k, e.target.value)} />
                        {t[k]}
                      </label>
                    ))}
                  </div>
                </div>
                {kind === "dynamic" && (
                  <div className="ls-field sm:col-span-2">
                    <span id="mat-label">{t.material}</span>
                    <div role="radiogroup" aria-labelledby="mat-label" className="flex flex-wrap gap-2">
                      {MATERIALS.map((m) => (
                        <button key={m} type="button" role="radio" aria-checked={edit.material === m} className="l3d-chip ls-radio" onClick={() => patch({ material: m })}>
                          {MATERIAL_LABELS[lang][m]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {isStaff && <StaffExport concept={edit} brief={brief} lang={lang} />}
            </div>

            <aside className="ls-checkout" aria-labelledby="checkout-title">
              <h2 id="checkout-title" className="text-xl font-semibold">
                {t.checkoutTitle}
              </h2>
              <div role="radiogroup" aria-label={t.kindLabel} className="mt-4 grid grid-cols-2 gap-2">
                {(["static", "dynamic"] as const).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} className="l3d-chip ls-radio justify-center" onClick={() => setKind(k)}>
                    {KIND_COPY[lang][k].title}
                  </button>
                ))}
              </div>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="l3d-price">{price}</span>
              </p>
              <ul className="l3d-list mt-3">
                {KIND_COPY[lang][kind].gets.map((g) => (
                  <li key={g}>
                    <span className="mt-1.5 size-1.5 rounded-full bg-[var(--l3d-lime)]" aria-hidden />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { k: "download", Icon: Download, label: t.download },
                  { k: "email", Icon: Mail, label: t.email },
                  { k: "share", Icon: Share2, label: t.share },
                ].map(({ k, Icon, label }) => (
                  <button key={k} type="button" className="ls-locked" onClick={() => openOrder(k)} aria-label={`${label} — ${t.locked}`}>
                    <Icon className="size-4" aria-hidden />
                    <span>{label}</span>
                    <Lock className="ls-lock size-3" aria-hidden />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-[var(--l3d-dim)]">{t.locked}</p>
              {!ordering ? (
                <button
                  type="button"
                  className="l3d-btn l3d-btn-primary mt-5 w-full"
                  onClick={(e) => {
                    ripple(e);
                    openOrder("buy");
                  }}
                >
                  {t.buy(price)}
                </button>
              ) : (
                <div id="comanda" className="mt-5">
                  <OrderForm lang={lang} brief={brief} concept={edit} kind={kind} priceLabel={price} termsPath={ro ? "/termeni" : "/en/terms"} />
                </div>
              )}
              <p className="mt-6 border-t border-[var(--l3d-line)] pt-4 text-sm text-[var(--l3d-muted)]">
                {t.pro}{" "}
                <Link className="l3d-link" to={`${LOGO3D_PATHS[lang]}#preturi`}>
                  {t.proLink}
                </Link>
              </p>
            </aside>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- FAQ */}
      <section id="faq" className="l3d-section" data-palette="#a78bfa,#38bdf8" aria-labelledby="studio-faq">
        <div className="l3d-wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 id="studio-faq" className="l3d-h2">
            {ro ? "Întrebări frecvente" : "Frequently asked questions"}
          </h2>
          <div className="l3d-faq">
            {STUDIO_FAQ[lang].map((it) => (
              <details key={it.q}>
                <summary>{it.q}</summary>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const LogoStudioPage = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const m = STUDIO_META[lang];

  useEffect(() => {
    window.scrollTo(0, 0);
    const path = STUDIO_PATHS[lang];
    const url = `https://avyron.ro${path}`;
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, faqPageLd }]) => {
        setPageMeta({ title: m.title, description: m.description, path, alternates: { ...STUDIO_PATHS } });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-service", {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "@id": `${url}#app`,
          name: m.name,
          url,
          description: m.description,
          applicationCategory: "DesignApplication",
          operatingSystem: "Web",
          inLanguage: ro ? "ro" : "en",
          provider: { "@id": "https://avyron.ro/#organization" },
          offers: (["static", "dynamic"] as const).map((k) => ({
            "@type": "Offer",
            name: `${KIND_COPY[lang][k].title} — ${m.name}`,
            price: STUDIO_PRICES[k],
            priceCurrency: "RON",
            availability: "https://schema.org/InStock",
            url,
          })),
        });
        setJsonLd("ld-faq", faqPageLd([...STUDIO_FAQ[lang]]));
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Logo Dinamic 3D" : "Dynamic 3D Logo", path: LOGO3D_PATHS[lang] },
            { name: ro ? "Creează-ți logo-ul" : "Create your logo", path },
          ]),
        );
      },
    );
    trackFunnel("page_view", "logo_studio", { product: "logo_studio" });
  }, [lang, ro, m]);

  return (
    <main className="l3d ls dark" lang={lang}>
      <div className="l3d-root-bg" aria-hidden />
      <StageProvider>
        <StudioBody />
        <FloatingWhatsApp />
        <div className="relative z-[1]">
          <Footer />
        </div>
      </StageProvider>
    </main>
  );
};

export default LogoStudioPage;
