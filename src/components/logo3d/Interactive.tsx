import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, MessageCircle, Sparkles, Wand2 } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { trackFunnel } from "@/lib/siteAnalytics";
import {
  LOGO3D_GALLERY,
  LOGO3D_GENESIS,
  LOGO3D_HERO,
  LOGO3D_NAME,
  LOGO3D_TIERS,
  MATERIAL_LABELS,
  NAME_SWATCHES,
  SEGMENT_LABELS,
  whatsappUrl,
} from "@/data/logo3d";
import type { ViewHandle } from "./engine/engine";
import FlatMark from "./FlatMark";
import { CONCEPTS, MATERIAL_WEIGHTS, STUDIO_MARK, type MaterialKey, type SegmentKey } from "./marks";
import { LogoView, useStage } from "./StageProvider";
import { ripple, useLeiPrice } from "./utils";

const MATERIALS: MaterialKey[] = ["metal", "glass", "neon", "matte"];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ------------------------------------------------------------------ hero

export function Hero({ onPreview, heroDelay }: { onPreview: () => void; heroDelay: number }) {
  const { lang } = useLang();
  const c = LOGO3D_HERO[lang];
  const lei = useLeiPrice(lang);
  const { paused } = useStage();
  const [index, setIndex] = useState(0);
  const [material, setMaterial] = useState<MaterialKey | null>(null);
  const handle = useRef<ViewHandle | null>(null);
  const concept = CONCEPTS[index];
  const mat = material ?? concept.material;
  const weights = material ? MATERIAL_WEIGHTS[material] : concept.mix ?? MATERIAL_WEIGHTS[concept.material];

  // Every few seconds the mark melts into the next concept (distance-field morph).
  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let swap = 0;
    const t = window.setInterval(() => {
      const next = (index + 1) % CONCEPTS.length;
      const n = CONCEPTS[next];
      handle.current?.set({
        markB: n.key,
        morph: 1,
        face: n.face,
        side: n.side,
        glow: n.glow,
        material: material ? MATERIAL_WEIGHTS[material] : n.mix ?? MATERIAL_WEIGHTS[n.material],
      });
      swap = window.setTimeout(() => {
        handle.current?.set({ mark: n.key, markB: null, morph: 0 }, true);
        setIndex(next);
      }, 1500);
    }, 4600);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(swap);
    };
  }, [index, material, paused]);

  const lines = lang === "ro" ? ["Logo", "dinamic 3D"] : ["Dynamic", "3D logo"];
  const price = lei(LOGO3D_TIERS[lang][0].priceRon);

  return (
    <section id="prezentare" className="l3d-hero" data-palette="#8b5cf6,#38bdf8" style={{ ["--hero-delay" as string]: `${heroDelay}ms` }}>
      <div className="l3d-wrap l3d-hero-grid">
        <div>
          <h1 className="l3d-h1">
            {lines.map((l, i) => (
              <span key={l} className="l3d-line">
                <span style={{ ["--i" as string]: i }}>{l}</span>
              </span>
            ))}
          </h1>
          <p className="l3d-lead l3d-fade" style={{ ["--i" as string]: 2 }}>
            {c.lead}
          </p>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 l3d-fade" style={{ ["--i" as string]: 3 }}>
            <span className="text-sm text-[var(--l3d-muted)]">{c.from}</span>
            <span className="l3d-price">{price}</span>
            <span className="text-sm text-[var(--l3d-muted)]">{c.delivery}</span>
          </p>
          <div className="mt-7 flex flex-wrap gap-3 l3d-fade" style={{ ["--i" as string]: 4 }}>
            <button
              type="button"
              className="l3d-btn l3d-btn-primary"
              onClick={(e) => {
                ripple(e);
                onPreview();
              }}
            >
              <Sparkles className="size-4" aria-hidden />
              {c.primary}
            </button>
            <a className="l3d-btn l3d-btn-ghost" href="#numele-tau" onClick={ripple}>
              <Wand2 className="size-4" aria-hidden />
              {c.secondary}
            </a>
          </div>
        </div>

        <div className="l3d-fade" style={{ ["--i" as string]: 2 }}>
          <LogoView
            className="l3d-hero-view"
            label={`${c.conceptLabel}: ${concept.name}, ${concept.industry[lang]}, ${MATERIAL_LABELS[lang][mat]}`}
            mark={concept.key}
            material={weights}
            face={concept.face}
            side={concept.side}
            glow={concept.glow}
            rotation="pointer"
            depth={0.22}
            bevel={0.055}
            onHandle={(h) => (handle.current = h)}
            fallback={<FlatMark draw={concept.draw} face={concept.face} side={concept.side} />}
          />
          <div className="mt-3 flex flex-col items-center gap-3">
            <p className="text-sm text-[var(--l3d-muted)]" aria-live="polite">
              {c.conceptLabel}: <span className="text-[var(--l3d-text)]">{concept.name}</span> · {concept.industry[lang]}
            </p>
            <div role="group" aria-label={c.materialsLabel} className="flex flex-wrap justify-center gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="l3d-chip"
                  aria-pressed={mat === m}
                  onClick={() => {
                    setMaterial(m);
                    trackEvent("logo3d_material", { material: m, location: "hero" });
                  }}
                >
                  {MATERIAL_LABELS[lang][m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ genesis

export function Genesis() {
  const { lang } = useLang();
  const g = LOGO3D_GENESIS[lang];
  const section = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const grid = useRef<SVGSVGElement>(null);
  const handle = useRef<ViewHandle | null>(null);
  const [active, setActive] = useState(0);
  const updateRef = useRef<() => void>(() => undefined);
  const fluxa = CONCEPTS[0];

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = clamp01(-r.top / span);
      const fill = clamp01((p - 0.2) / 0.22);
      const extrude = clamp01((p - 0.45) / 0.22);
      const motion = clamp01((p - 0.72) / 0.28);
      const glassy = clamp01((motion - 0.35) / 0.4);
      handle.current?.set({
        fill,
        extrude,
        rotation: "manual",
        yaw: -0.55 * extrude + motion * Math.PI * 1.35,
        pitch: 0.18 * extrude - 0.08 * motion,
        material: [1 - glassy, glassy, 0, 0],
        scale: 1 - 0.08 * extrude,
      });
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (grid.current) grid.current.style.opacity = String(1 - fill * 0.85 - extrude * 0.15);
      setActive(Math.min(3, Math.floor(p * 4 + 0.08)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    updateRef.current = update;
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={section} id="cum-se-naste" className="l3d-genesis" data-palette="#a78bfa,#bef264" aria-labelledby="genesis-title">
      <div className="l3d-genesis-sticky">
        <div className="l3d-wrap l3d-genesis-grid">
          <div>
            <h2 id="genesis-title" className="l3d-h2">
              {g.title}
            </h2>
            <p className="l3d-lead">{g.lead}</p>
            <ol className="mt-8">
              {g.steps.map((s, i) => (
                <li key={s.title} className="l3d-step" data-active={i === active}>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--l3d-muted)]">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="l3d-genesis-stage">
            <svg ref={grid} className="l3d-grid-overlay" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="38" />
              <circle cx="50" cy="50" r="24" />
              <line x1="0" y1="50" x2="100" y2="50" />
              <line x1="50" y1="0" x2="50" y2="100" />
              <line x1="12" y1="12" x2="88" y2="88" />
              <line x1="88" y1="12" x2="12" y2="88" />
              <line x1="0" y1="26" x2="100" y2="26" />
              <line x1="0" y1="74" x2="100" y2="74" />
              <line x1="26" y1="0" x2="26" y2="100" />
              <line x1="74" y1="0" x2="74" y2="100" />
            </svg>
            <LogoView
              className="absolute inset-0"
              label={lang === "ro" ? "Logo-ul Fluxa trecând de la schiță la volum și mișcare" : "The Fluxa logo moving from sketch to volume and motion"}
              mark={fluxa.key}
              face={fluxa.face}
              side={fluxa.side}
              glow={fluxa.glow}
              fill={0}
              extrude={0}
              rotation="manual"
              depth={0.22}
              bevel={0.055}
              onHandle={(h) => {
                handle.current = h;
                if (h) updateRef.current();
              }}
              fallback={<FlatMark draw={fluxa.draw} face={fluxa.face} side={fluxa.side} />}
            />
            <div className="l3d-progress" aria-hidden>
              <i ref={bar as React.RefObject<HTMLElement>} style={{ transform: "scaleX(0)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ gallery

export function Gallery() {
  const { lang } = useLang();
  const g = LOGO3D_GALLERY[lang];
  const [filter, setFilter] = useState<SegmentKey | "all">("all");
  const segments = useMemo(() => {
    const present = new Set(CONCEPTS.map((c) => c.segment));
    return (["all", "personal", "small", "medium", "brand", "startup"] as const).filter((s) => s === "all" || present.has(s));
  }, []);

  return (
    <section id="exemple" className="l3d-section" data-palette="#38bdf8,#8b5cf6" aria-labelledby="gallery-title">
      <div className="l3d-wrap">
        <h2 id="gallery-title" className="l3d-h2 l3d-wipe">
          {g.title}
        </h2>
        <p className="l3d-lead" data-reveal>
          {g.lead}
        </p>
        <div role="group" aria-label={g.filterLabel} className="mt-6 flex flex-wrap gap-2" data-reveal style={{ ["--i" as string]: 1 }}>
          {segments.map((s) => (
            <button key={s} type="button" className="l3d-chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {SEGMENT_LABELS[lang][s]}
            </button>
          ))}
        </div>
        <ul className="l3d-gallery">
          {CONCEPTS.map((c, i) => (
            <li
              key={c.key}
              className="l3d-card"
              hidden={filter !== "all" && c.segment !== filter}
              data-reveal="scale"
              style={{ ["--i" as string]: i }}
            >
              <LogoView
                className="l3d-card-view"
                interactive
                label={`${c.name}: ${c.idea[lang]}`}
                mark={c.key}
                material={c.mix ?? MATERIAL_WEIGHTS[c.material]}
                face={c.face}
                side={c.side}
                glow={c.glow}
                rotation="pointer"
                depth={0.2}
                bevel={0.05}
                fallback={<FlatMark draw={c.draw} face={c.face} side={c.side} />}
              />
              <h3>{c.name}</h3>
              <p className="text-xs text-[var(--l3d-dim)]">
                {c.industry[lang]} · {MATERIAL_LABELS[lang][c.material]}
              </p>
              <p className="l3d-idea">{c.idea[lang]}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--l3d-dim)]">{g.note}</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ your name in 3D

export function NameStudio({ onPreview }: { onPreview: (name: string) => void }) {
  const { lang } = useLang();
  const n = LOGO3D_NAME[lang];
  const { stage, status } = useStage();
  const [name, setName] = useState("");
  const [shown, setShown] = useState("Avyron");
  const [material, setMaterial] = useState<MaterialKey>("metal");
  const [swatch, setSwatch] = useState(NAME_SWATCHES[0]);
  const viewEl = useRef<HTMLDivElement | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(name.trim() || "Avyron"), 160);
    return () => window.clearTimeout(t);
  }, [name]);

  const onType = (v: string) => {
    setName(v);
    if (!tracked.current && v.trim()) {
      tracked.current = true;
      trackFunnel("view_configurator", "logo3d", { product: "logo_dinamic_3d", tool: "name_3d" });
    }
  };

  const download = useCallback(() => {
    if (!stage || !viewEl.current) return;
    const shot = stage.snapshot(viewEl.current);
    if (!shot) return;
    const ctx = shot.getContext("2d");
    if (ctx) {
      const s = Math.max(12, Math.round(shot.width / 52));
      ctx.font = `600 ${s}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(244,241,250,0.6)";
      ctx.textAlign = "right";
      ctx.fillText(lang === "ro" ? "avyron.ro · previzualizare" : "avyron.ro · preview", shot.width - s, shot.height - s);
    }
    shot.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${shown.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "logo"}-3d-avyron.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
    trackEvent("logo3d_download_preview", { material });
  }, [stage, shown, lang, material]);

  return (
    <section id="numele-tau" className="l3d-section" data-palette="#8b5cf6,#bef264" aria-labelledby="name-title">
      <div className="l3d-wrap l3d-name">
        <div>
          <h2 id="name-title" className="l3d-h2 l3d-wipe">
            {n.title}
          </h2>
          <p className="l3d-lead" data-reveal>
            {n.lead}
          </p>
          <div className="mt-7 space-y-5" data-reveal style={{ ["--i" as string]: 1 }}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--l3d-muted)]">{n.inputLabel}</span>
              <input
                className="l3d-input"
                value={name}
                maxLength={18}
                placeholder={n.placeholder}
                autoComplete="organization"
                onChange={(e) => onType(e.target.value)}
              />
            </label>
            <div role="group" aria-label={LOGO3D_HERO[lang].materialsLabel} className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <button key={m} type="button" className="l3d-chip" aria-pressed={material === m} onClick={() => setMaterial(m)}>
                  {MATERIAL_LABELS[lang][m]}
                </button>
              ))}
            </div>
            <div role="group" aria-label={n.colorLabel} className="flex flex-wrap gap-2">
              {NAME_SWATCHES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="l3d-swatch"
                  aria-pressed={swatch.key === s.key}
                  aria-label={s.label[lang]}
                  title={s.label[lang]}
                  onClick={() => setSwatch(s)}
                >
                  <span style={{ background: `linear-gradient(135deg, ${s.face}, ${s.side})` }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div data-reveal="scale">
          <div ref={viewEl}>
            <LogoView
              className="l3d-name-view"
              interactive
              label={`${shown}, ${MATERIAL_LABELS[lang][material]}`}
              mark={`text:${shown}`}
              material={MATERIAL_WEIGHTS[material]}
              face={material === "neon" ? "#0b1220" : swatch.face}
              side={material === "neon" ? "#0b1220" : swatch.side}
              glow={swatch.glow}
              rotation="pointer"
              depth={0.16}
              bevel={0.04}
              fallback={
                <span className="text-4xl font-extrabold tracking-tight" style={{ color: swatch.face, textShadow: `3px 4px 0 ${swatch.side}` }}>
                  {shown}
                </span>
              }
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              className="l3d-btn l3d-btn-primary"
              href={whatsappUrl(n.whatsapp(shown, MATERIAL_LABELS[lang][material]))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                ripple(e);
                trackEvent("contact_click", { method: "whatsapp", location: "logo3d_name", product: "logo-dinamic-3d" });
              }}
            >
              <MessageCircle className="size-4" aria-hidden />
              {n.want}
            </a>
            <button type="button" className="l3d-btn l3d-btn-ghost" onClick={() => onPreview(shown)}>
              <Sparkles className="size-4" aria-hidden />
              {n.preview}
            </button>
            {status === "on" && (
              <button type="button" className="l3d-btn l3d-btn-ghost" onClick={download}>
                <Download className="size-4" aria-hidden />
                {n.download}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-[var(--l3d-dim)]">{n.downloadNote}</p>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ closing mark

export function ClosingMark({ label }: { label: string }) {
  const el = useRef<HTMLDivElement>(null);
  const handle = useRef<ViewHandle | null>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([e]) => {
        // Re-assemble every time the section comes back into view.
        if (e.isIntersecting) handle.current?.set({ reveal: 1 });
        else handle.current?.set({ reveal: 0 }, true);
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={el}>
      <LogoView
        className="l3d-final-view"
        label={label}
        mark="studio"
        material={[0.55, 0.45, 0, 0]}
        face="#ddd6fe"
        side="#5b21b6"
        glow="#38bdf8"
        rotation="idle"
        reveal={0}
        depth={0.2}
        bevel={0.06}
        onHandle={(h) => (handle.current = h)}
        fallback={<FlatMark draw={STUDIO_MARK} face="#ddd6fe" side="#5b21b6" />}
      />
    </div>
  );
}
