import { useMemo, useRef, useState } from "react";
import { Check, Copy, Download, RotateCcw, Sparkles, Upload } from "lucide-react";
import { ParticleCanvas, type LabHandle } from "./ParticleLab";
import { DEFAULT_CONFIG, type Formation, type LabConfig } from "./labConfig";

/**
 * Laboratorul complet: configuratorul din stânga + scena din dreapta.
 * Panoul e un drawer pe mobil, ca scena să rămână vizibilă pe telefon.
 */

type Lang = "ro" | "en";

const FORMATIONS: Array<{ id: Formation; ro: string; en: string }> = [
  { id: "sphere", ro: "Sferă", en: "Sphere" },
  { id: "cube", ro: "Cub", en: "Cube" },
  { id: "helix", ro: "Helix", en: "Helix" },
  { id: "torus", ro: "Tor", en: "Torus" },
  { id: "text", ro: "Text", en: "Text" },
  { id: "image", ro: "Imagine", en: "Image" },
];

const STYLES: Array<{ id: LabConfig["style"]; ro: string; en: string }> = [
  { id: "soft", ro: "Moale", en: "Soft" },
  { id: "points", ro: "Punct", en: "Point" },
  { id: "sparks", ro: "Scânteie", en: "Spark" },
];

const PALETTES: Array<[string, string]> = [
  ["#8b5cf6", "#22d3ee"],
  ["#f472b6", "#8b5cf6"],
  ["#34d399", "#a3e635"],
  ["#fbbf24", "#f97316"],
  ["#e5e7eb", "#94a3b8"],
];

function codeFor(config: LabConfig): string {
  return `// Avyron Particle Lab — configurație exportată
// npm i three
import * as THREE from "three";

export const config = ${JSON.stringify(config, null, 2)};

/* Montează scena într-un container:
   1. creează un WebGLRenderer și o PerspectiveCamera (fov 50, z = 7.5);
   2. generează pozițiile formației "${config.formation}" pentru ${config.count} particule;
   3. folosește ShaderMaterial cu AdditiveBlending, uSize = ${config.size},
      uTurb = ${config.turbulence}, uAttract = ${config.attraction};
   4. în bucla de randare rotește cu ${config.autoRotate ? "auto-rotire activă" : "rotire manuală"}.
   Pachetul descărcat conține fișierele complete (React + varianta vanilla). */
`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="pa-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/45">{label}</span>
      {children}
    </label>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[hsl(264_90%_68%)] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    />
  );
}

export default function ParticleLabStudio({ lang, active = true, compact = false }: { lang: Lang; active?: boolean; compact?: boolean }) {
  const ro = lang === "ro";
  const [config, setConfig] = useState<LabConfig>(DEFAULT_CONFIG);
  const [openPanel, setOpenPanel] = useState(!compact);
  const [copied, setCopied] = useState(false);
  const handle = useRef<LabHandle | null>(null);
  const setImage = useRef<((file: File) => Promise<void>) | null>(null);

  const set = <K extends keyof LabConfig>(key: K, value: LabConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));
  const code = useMemo(() => codeFor(config), [config]);

  const onImage = async (file?: File | null) => {
    if (!file) return;
    await setImage.current?.(file);
    set("formation", "image");
    // Dacă formația era deja „image”, forțăm regenerarea cu noul eșantion.
    setConfig((c) => ({ ...c, formation: "image", count: c.count }));
  };

  const savePng = () => {
    const url = handle.current?.snapshot();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "avyron-particles.png";
    a.click();
  };

  const saveJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "avyron-particle-lab.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07080d]">
      <div className={compact ? "h-[320px] sm:h-[380px]" : "h-[420px] sm:h-[560px]"}>
        <ParticleCanvas config={config} active={active} className="h-full w-full" handleRef={handle} setImageRef={setImage} />
      </div>

      {/* Panoul din stânga */}
      <div
        className={`pa-glass absolute left-3 top-3 z-10 w-[248px] max-w-[calc(100%-1.5rem)] rounded-2xl p-3 transition-all duration-500 ${
          openPanel ? "translate-x-0 opacity-100" : "-translate-x-[110%] opacity-0"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Particle Lab</p>
          <button type="button" onClick={() => setOpenPanel(false)} aria-label={ro ? "Ascunde panoul" : "Hide panel"} className="rounded-lg p-1 text-white/45 hover:bg-white/10 hover:text-white">
            ×
          </button>
        </div>
        <div className="grid max-h-[300px] gap-2.5 overflow-y-auto pr-1 sm:max-h-[420px]">
          <Row label={ro ? "Formație" : "Formation"}>
            <div className="grid grid-cols-3 gap-1">
              {FORMATIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set("formation", f.id)}
                  aria-pressed={config.formation === f.id}
                  className={`rounded-lg px-1.5 py-1 text-[11px] transition ${config.formation === f.id ? "bg-gradient-to-br from-brand to-brand-2 text-white" : "bg-white/[0.06] text-white/65 hover:text-white"}`}
                >
                  {ro ? f.ro : f.en}
                </button>
              ))}
            </div>
          </Row>

          {config.formation === "text" && (
            <Row label={ro ? "Textul" : "Text"}>
              <input
                value={config.text}
                maxLength={14}
                onChange={(e) => set("text", e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1.5 text-xs text-white"
              />
            </Row>
          )}

          {config.formation === "image" && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 px-2 py-2 text-[11px] text-white/70 hover:border-white/40">
              <Upload className="size-3.5" aria-hidden />
              {ro ? "Încarcă imagine (PNG/SVG)" : "Upload image (PNG/SVG)"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void onImage(e.target.files?.[0])} />
            </label>
          )}

          <Row label={`${ro ? "Particule" : "Particles"} — ${config.count.toLocaleString(ro ? "ro-RO" : "en-GB")}`}>
            <Slider value={config.count} min={2000} max={100000} step={1000} onChange={(v) => set("count", v)} />
          </Row>
          <Row label={`${ro ? "Viteză" : "Speed"} — ${config.speed.toFixed(1)}×`}>
            <Slider value={config.speed} min={0.1} max={3} step={0.1} onChange={(v) => set("speed", v)} />
          </Row>
          <Row label={`${ro ? "Strălucire" : "Glow"} — ${Math.round(config.glow * 100)}%`}>
            <Slider value={config.glow} min={0} max={1.4} step={0.05} onChange={(v) => set("glow", v)} />
          </Row>
          <Row label={`${ro ? "Mărime" : "Size"} — ${config.size.toFixed(1)}`}>
            <Slider value={config.size} min={0.4} max={4} step={0.1} onChange={(v) => set("size", v)} />
          </Row>
          <Row label={`${ro ? "Turbulență" : "Turbulence"} — ${Math.round(config.turbulence * 100)}%`}>
            <Slider value={config.turbulence} min={0} max={1.2} step={0.05} onChange={(v) => set("turbulence", v)} />
          </Row>
          <Row label={`${ro ? "Atracție la cursor" : "Cursor attraction"} — ${Math.round(config.attraction * 100)}%`}>
            <Slider value={config.attraction} min={0} max={2} step={0.05} onChange={(v) => set("attraction", v)} />
          </Row>
          <Row label={ro ? "Stil" : "Style"}>
            <div className="grid grid-cols-3 gap-1">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("style", s.id)}
                  aria-pressed={config.style === s.id}
                  className={`rounded-lg px-1.5 py-1 text-[11px] transition ${config.style === s.id ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/65 hover:text-white"}`}
                >
                  {ro ? s.ro : s.en}
                </button>
              ))}
            </div>
          </Row>
          <Row label={ro ? "Paletă" : "Palette"}>
            <div className="flex items-center gap-1.5">
              {PALETTES.map(([a, b]) => (
                <button
                  key={a + b}
                  type="button"
                  aria-label={`${a} ${b}`}
                  onClick={() => setConfig((c) => ({ ...c, colorA: a, colorB: b }))}
                  className={`size-5 rounded-full ring-1 transition ${config.colorA === a ? "ring-white" : "ring-white/20"}`}
                  style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
                />
              ))}
              <input type="color" value={config.colorA} onChange={(e) => set("colorA", e.target.value)} aria-label={ro ? "Culoare 1" : "Colour 1"} className="size-5 cursor-pointer border-0 bg-transparent p-0" />
              <input type="color" value={config.colorB} onChange={(e) => set("colorB", e.target.value)} aria-label={ro ? "Culoare 2" : "Colour 2"} className="size-5 cursor-pointer border-0 bg-transparent p-0" />
            </div>
          </Row>
          <label className="flex items-center justify-between text-[11px] text-white/70">
            {ro ? "Auto-rotire" : "Auto-rotate"}
            <input type="checkbox" checked={config.autoRotate} onChange={(e) => set("autoRotate", e.target.checked)} className="accent-[hsl(264_90%_68%)]" />
          </label>

          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={savePng} className="flex items-center justify-center gap-1 rounded-lg bg-white/[0.08] px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/15">
              <Download className="size-3" aria-hidden /> PNG
            </button>
            <button type="button" onClick={saveJson} className="flex items-center justify-center gap-1 rounded-lg bg-white/[0.08] px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/15">
              <Download className="size-3" aria-hidden /> JSON
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
              className="col-span-2 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-2 py-1.5 text-[11px] font-semibold text-white"
            >
              {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
              {copied ? (ro ? "Copiat" : "Copied") : ro ? "Copiază configurația" : "Copy configuration"}
            </button>
            <button
              type="button"
              onClick={() => setConfig(DEFAULT_CONFIG)}
              className="col-span-2 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/45 hover:text-white"
            >
              <RotateCcw className="size-3" aria-hidden /> {ro ? "Resetează" : "Reset"}
            </button>
          </div>
        </div>
      </div>

      {!openPanel && (
        <button
          type="button"
          onClick={() => setOpenPanel(true)}
          className="pa-glass absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          <Sparkles className="size-3.5" aria-hidden /> {ro ? "Configurează" : "Configure"}
        </button>
      )}

      <p className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/55 backdrop-blur">
        {ro ? "Trage ca să rotești · rotița pentru zoom" : "Drag to rotate · wheel to zoom"}
      </p>
    </div>
  );
}
