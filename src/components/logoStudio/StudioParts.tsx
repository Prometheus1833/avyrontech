import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import Turnstile from "@/components/site/Turnstile";
import { apiUrl } from "@/lib/apiBase";
import { trackEvent } from "@/lib/analytics";
import type { LogoBrief, LogoConcept, StudioKind } from "@/data/logoStudio";
import { STUDIO_PRICES } from "@/data/logoStudio";
import { STUDIO_UI } from "@/data/logoStudioCopy";
import { LogoView, useStage } from "@/components/logo3d/StageProvider";
import { MATERIAL_WEIGHTS } from "@/components/logo3d/marks";
import { composeWithFonts, drawMask, svgToPng, toSvg, type Composition } from "./render";

/** Compose a concept once its fonts are loaded. Returns null while loading. */
export function useComposition(concept: LogoConcept | null, brief: LogoBrief | null) {
  const [comp, setComp] = useState<Composition | null>(null);
  const key = concept && brief ? JSON.stringify([concept, brief.name, brief.tagline]) : "";
  useEffect(() => {
    if (!concept || !brief) {
      setComp(null);
      return;
    }
    let alive = true;
    composeWithFonts(concept, brief)
      .then((c) => alive && setComp(c))
      .catch(() => alive && setComp(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return comp;
}

type PreviewProps = {
  concept: LogoConcept;
  brief: LogoBrief;
  background?: "paper" | "dark";
  watermark?: string | null;
  className?: string;
  label: string;
};

/** Vector preview. The watermark is part of the SVG, so a screenshot is not a clean file. */
export function LogoPreview({ concept, brief, background = "paper", watermark, className, label }: PreviewProps) {
  const comp = useComposition(concept, brief);
  const svg = useMemo(() => (comp ? toSvg(comp, { background, watermark }) : ""), [comp, background, watermark]);
  return (
    <div
      role="img"
      aria-label={label}
      className={`ls-preview ${className ?? ""}`}
      data-bg={background}
      style={{ background: background === "dark" ? "#0b0a12" : concept.palette.paper }}
    >
      {svg ? <div className="ls-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : <Loader2 className="size-5 animate-spin opacity-50" aria-hidden />}
    </div>
  );
}

let studioMarkSeq = 0;

/** The user's logo, extruded by the page's 3D engine. Colours update live; the shape is rebuilt only when it changes. */
export function StudioLogo3D({ concept, brief, label }: { concept: LogoConcept; brief: LogoBrief; label: string }) {
  const { stage } = useStage();
  const comp = useComposition(concept, brief);
  const keyRef = useRef(`studio:${++studioMarkSeq}`);
  const geometry = comp ? `${comp.name.length}:${comp.tagline.length}:${JSON.stringify(comp.symbol)}:${comp.name.slice(0, 64)}` : "";

  useEffect(() => {
    if (!stage || !comp) return;
    const aspect = Math.min(3.6, Math.max(1, comp.width / comp.height));
    stage.defineMark(keyRef.current, (ctx) => drawMask(comp, ctx), aspect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, geometry]);

  // Lift the face a little: a dark brand colour on a dark stage would read as a silhouette.
  const face = concept.material === "neon" ? "#0b1220" : shade(concept.palette.primary, 0.22);
  const side = concept.material === "neon" ? "#0b1220" : shade(concept.palette.primary, -0.4);
  return (
    <LogoView
      className="ls-3d"
      interactive
      label={label}
      mark={keyRef.current}
      material={MATERIAL_WEIGHTS[concept.material]}
      face={face}
      side={side}
      glow={concept.palette.accent}
      rotation="pointer"
      depth={0.16}
      bevel={0.04}
      scale={0.8}
      fallback={<LogoPreview concept={concept} brief={brief} background="dark" label={label} className="h-full w-full" />}
    />
  );
}

/** Darken (negative) or lighten (positive) a hex colour. */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, Math.max(0, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ------------------------------------------------------------------ order form

type OrderProps = {
  lang: "ro" | "en";
  brief: LogoBrief;
  concept: LogoConcept;
  kind: StudioKind;
  priceLabel: string;
  termsPath: string;
};

export function OrderForm({ lang, brief, concept, kind, priceLabel, termsPath }: OrderProps) {
  const t = STUDIO_UI[lang];
  const [fields, setFields] = useState({ name: "", email: "", phone: "", company: "", cui: "" });
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const onToken = useCallback((v: string) => setToken(v), []);
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setState("sending");
    try {
      const res = await fetch(apiUrl("/api/logo-studio/orders"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, brief, concept, kind, consent, turnstileToken: token }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      trackEvent("logo_studio_order", { kind, price: STUDIO_PRICES[kind] });
    } catch {
      setState("error");
      setResetKey((k) => k + 1);
    }
  };

  if (state === "done") {
    return (
      <div className="ls-done" role="status">
        <CheckCircle2 className="size-8 text-[var(--l3d-lime)]" aria-hidden />
        <h3 className="mt-3 text-xl font-semibold">{t.doneTitle}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--l3d-muted)]">{t.doneText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="text-lg font-semibold">{t.formTitle}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="ls-field">
          <span>{t.fullName}</span>
          <input className="l3d-input ls-input" required minLength={2} autoComplete="name" value={fields.name} onChange={set("name")} />
        </label>
        <label className="ls-field">
          <span>{t.emailLabel}</span>
          <input className="l3d-input ls-input" type="email" required autoComplete="email" value={fields.email} onChange={set("email")} />
        </label>
        <label className="ls-field">
          <span>{t.phone}</span>
          <input className="l3d-input ls-input" type="tel" required minLength={5} autoComplete="tel" value={fields.phone} onChange={set("phone")} />
        </label>
        <label className="ls-field">
          <span>{t.company}</span>
          <input className="l3d-input ls-input" autoComplete="organization" value={fields.company} onChange={set("company")} />
        </label>
        <label className="ls-field sm:col-span-2">
          <span>{t.cui}</span>
          <input className="l3d-input ls-input" value={fields.cui} onChange={set("cui")} />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-[var(--l3d-muted)]">
        <input type="checkbox" className="ls-check" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>
          {t.consent}{" "}
          <a className="l3d-link" href={termsPath} target="_blank" rel="noopener noreferrer">
            {t.terms}
          </a>
        </span>
      </label>
      <Turnstile action="logo-studio-order" onToken={onToken} resetKey={resetKey} />
      <button type="submit" className="l3d-btn l3d-btn-primary w-full" disabled={state === "sending" || !consent}>
        {state === "sending" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {state === "sending" ? t.sending : `${t.submit} · ${priceLabel}`}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-rose-300">
          {t.error}
        </p>
      )}
    </form>
  );
}

// ------------------------------------------------------------------ staff export

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function StaffExport({ concept, brief, lang }: { concept: LogoConcept; brief: LogoBrief; lang: "ro" | "en" }) {
  const comp = useComposition(concept, brief);
  const icon = useComposition(useMemo(() => ({ ...concept, layout: "icon-only" as const }), [concept]), brief);
  const slug = brief.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "logo";
  if (!comp) return null;
  const svg = (mono: "black" | "white" | null) => new Blob([toSvg(comp, { mono })], { type: "image/svg+xml" });
  const png = async (w: number, c: Composition, name: string, background: "none" | "paper" = "none") =>
    download(await svgToPng(toSvg(c, { background }), w), name);
  return (
    <div className="ls-staff">
      <h3 className="text-sm font-semibold">{STUDIO_UI[lang].staffTitle}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="l3d-chip" onClick={() => download(svg(null), `${slug}.svg`)}>SVG</button>
        <button type="button" className="l3d-chip" onClick={() => download(svg("black"), `${slug}-negru.svg`)}>SVG negru</button>
        <button type="button" className="l3d-chip" onClick={() => download(svg("white"), `${slug}-alb.svg`)}>SVG alb</button>
        <button type="button" className="l3d-chip" onClick={() => png(1024, comp, `${slug}-1024.png`)}>PNG 1024</button>
        <button type="button" className="l3d-chip" onClick={() => png(2048, comp, `${slug}-2048.png`)}>PNG 2048</button>
        {icon && (
          <>
            <button type="button" className="l3d-chip" onClick={() => png(512, icon, `${slug}-favicon-512.png`)}>Favicon 512</button>
            <button type="button" className="l3d-chip" onClick={() => png(1080, icon, `${slug}-profil-1080.png`, "paper")}>Profil 1080</button>
          </>
        )}
      </div>
    </div>
  );
}
