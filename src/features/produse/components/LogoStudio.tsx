import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Lock, RotateCcw } from "lucide-react";
import { detectTier } from "../lib/capability";
import { DEFAULT_LOGO, type LogoConfig, type LogoMaterial, type LogoSymbol } from "./logoConfig";

/**
 * Avyron Logo Studio — generator de logo 3D în browser.
 *
 * Extrudarea e făcută din straturi: textul (plus simbolul) se desenează o dată
 * pe un canvas, textura rezultată se repetă pe 22 de plane suprapuse pe axa Z,
 * fiecare cu propria nuanță. E ieftin (o textură, 22 de quad-uri), rulează pe
 * orice telefon și se rotește liber — iar materialele sunt doar rampe de
 * culoare și moduri de amestecare peste aceleași straturi.
 *
 * Previzualizarea e gratuită și are filigran. Pachetul descărcabil (PNG/SVG,
 * GLB, animație, favicon) se plătește — butonul trimite produsul în coș.
 */

export type { LogoConfig, LogoMaterial, LogoSymbol } from "./logoConfig";

const MATERIALS: Array<{ id: LogoMaterial; ro: string; en: string }> = [
  { id: "glass", ro: "Sticlă", en: "Glass" },
  { id: "metal", ro: "Metal", en: "Metal" },
  { id: "neon", ro: "Neon", en: "Neon" },
  { id: "matte", ro: "Mat", en: "Matte" },
  { id: "particles", ro: "Particule", en: "Particles" },
];

const SYMBOLS: Array<{ id: LogoSymbol; ro: string; en: string }> = [
  { id: "none", ro: "Fără", en: "None" },
  { id: "dot", ro: "Punct", en: "Dot" },
  { id: "ring", ro: "Inel", en: "Ring" },
  { id: "triangle", ro: "Triunghi", en: "Triangle" },
  { id: "monogram", ro: "Monogramă", en: "Monogram" },
];

function drawArtwork(config: LogoConfig, watermark: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = (config.text || "AVYRON").slice(0, 16).toUpperCase();
  let size = 190;
  const font = (s: number) => `800 ${s}px "Avenir Next", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`;
  ctx.font = font(size);
  ctx.letterSpacing = `${config.letterSpacing}px`;
  while (ctx.measureText(text).width > 840 && size > 40) {
    size -= 6;
    ctx.font = font(size);
  }
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const symbolOffset = config.symbol === "none" ? 0 : 70;
  ctx.fillText(text, cx + symbolOffset * 0.5, cy);

  if (config.symbol !== "none") {
    const r = size * 0.32;
    const sx = cx - ctx.measureText(text).width / 2 - r * 1.2 + symbolOffset * 0.5;
    ctx.beginPath();
    if (config.symbol === "dot") ctx.arc(sx, cy, r * 0.55, 0, Math.PI * 2);
    else if (config.symbol === "ring") {
      ctx.lineWidth = r * 0.28;
      ctx.strokeStyle = "#fff";
      ctx.arc(sx, cy, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
    } else if (config.symbol === "triangle") {
      ctx.moveTo(sx, cy - r);
      ctx.lineTo(sx + r * 0.92, cy + r * 0.7);
      ctx.lineTo(sx - r * 0.92, cy + r * 0.7);
      ctx.closePath();
    } else {
      ctx.font = font(size * 1.25);
      ctx.fillText(text[0] ?? "A", sx, cy);
    }
    ctx.fill();
  }

  if (watermark) {
    ctx.font = '600 26px ui-monospace, monospace';
    ctx.fillStyle = "rgba(255,255,255,.30)";
    ctx.letterSpacing = "6px";
    ctx.fillText("PREVIZUALIZARE AVYRON", cx, canvas.height - 34);
  }
  return canvas;
}

function LogoScene({ config, active }: { config: LogoConfig; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const tier = useMemo(() => detectTier(), []);
  const refs = useRef<{ group?: THREE.Group; texture?: THREE.Texture; renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; rotX: number; rotY: number; velX: number; velY: number }>({
    rotX: 0,
    rotY: -0.25,
    velX: 0,
    velY: 0,
  });

  useEffect(() => {
    const el = host.current;
    if (!el || tier === "none") return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / Math.max(1, el.clientHeight), 0.1, 100);
    camera.position.set(0, 0, 6.2);
    const group = new THREE.Group();
    scene.add(group);
    Object.assign(refs.current, { renderer, scene, camera, group });

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    let dragging = false;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      refs.current.velY = (e.clientX - lx) * 0.006;
      refs.current.velX = (e.clientY - ly) * 0.005;
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = () => (dragging = false);
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!active || document.visibilityState !== "visible") return;
      const state = refs.current;
      state.rotY += state.velY + (config.spin ? 0.0022 : 0);
      state.rotX = THREE.MathUtils.clamp(state.rotX + state.velX, -0.6, 0.6);
      state.velX *= 0.9;
      state.velY *= 0.93;
      if (state.group) {
        state.group.rotation.set(state.rotX + Math.sin((now - start) / 2600) * 0.04, state.rotY, 0);
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [tier, active, config.spin]);

  // Straturile: se refac la fiecare schimbare de conținut sau material.
  useEffect(() => {
    const { group } = refs.current;
    if (!group) return;
    group.clear();
    refs.current.texture?.dispose();

    const canvas = drawArtwork(config, true);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    refs.current.texture = texture;

    const layers = Math.max(4, Math.round(config.depth));
    const aspect = canvas.width / canvas.height;
    const height = 1.25;
    const geometry = new THREE.PlaneGeometry(height * aspect, height);
    const colorA = new THREE.Color(config.colorA);
    const colorB = new THREE.Color(config.colorB);

    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const color = colorA.clone().lerp(colorB, t);
      let material: THREE.Material;
      if (config.material === "neon") {
        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color: color.multiplyScalar(0.5 + t * 0.9), blending: THREE.AdditiveBlending, depthWrite: false });
      } else if (config.material === "glass") {
        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color, opacity: 0.16 + t * 0.5, depthWrite: i === layers - 1 });
      } else if (config.material === "metal") {
        const shade = 0.25 + Math.pow(t, 1.6) * 0.95;
        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color: color.clone().lerp(new THREE.Color("#ffffff"), shade * 0.55).multiplyScalar(shade) });
      } else if (config.material === "particles") {
        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color, opacity: 0.1 + t * 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
      } else {
        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color: color.multiplyScalar(0.35 + t * 0.65) });
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = (t - 0.5) * (config.depth / 60);
      if (config.material === "particles") mesh.position.x += (Math.random() - 0.5) * 0.02;
      group.add(mesh);
    }
  }, [config]);

  if (tier === "none") {
    return (
      <div className="grid h-full place-items-center">
        <p className="max-w-[24ch] px-4 text-center text-xs text-white/50">
          Generatorul 3D are nevoie de WebGL. Îți putem trimite logo-ul desenat de echipă.
        </p>
      </div>
    );
  }
  return <div ref={host} className="h-full w-full" />;
}

export default function LogoStudio({ lang, active = true, onBuy }: { lang: "ro" | "en"; active?: boolean; onBuy?: () => void }) {
  const ro = lang === "ro";
  const [config, setConfig] = useState<LogoConfig>(DEFAULT_LOGO);
  const set = <K extends keyof LogoConfig>(key: K, value: LogoConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="pa-glass rounded-2xl p-3.5">
        <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Logo Studio</p>
        <div className="mt-2.5 grid gap-2.5">
          <label className="block">
            <span className="pa-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/45">{ro ? "Numele brandului" : "Brand name"}</span>
            <input
              value={config.text}
              maxLength={16}
              onChange={(e) => set("text", e.target.value)}
              className="w-full rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-2 text-sm text-white"
            />
          </label>
          <div>
            <span className="pa-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/45">{ro ? "Simbol" : "Symbol"}</span>
            <div className="grid grid-cols-3 gap-1">
              {SYMBOLS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={config.symbol === s.id}
                  onClick={() => set("symbol", s.id)}
                  className={`rounded-lg px-1.5 py-1 text-[11px] transition ${config.symbol === s.id ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/65 hover:text-white"}`}
                >
                  {ro ? s.ro : s.en}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="pa-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/45">{ro ? "Material" : "Material"}</span>
            <div className="grid grid-cols-3 gap-1">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={config.material === m.id}
                  onClick={() => set("material", m.id)}
                  className={`rounded-lg px-1.5 py-1 text-[11px] transition ${config.material === m.id ? "bg-gradient-to-br from-brand to-brand-2 text-white" : "bg-white/[0.06] text-white/65 hover:text-white"}`}
                >
                  {ro ? m.ro : m.en}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="pa-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/45">
              {ro ? "Adâncime" : "Depth"} — {config.depth}
            </span>
            <input type="range" min={6} max={40} step={1} value={config.depth} onChange={(e) => set("depth", Number(e.target.value))} className="h-1 w-full accent-[hsl(264_90%_68%)]" />
          </label>
          <label className="block">
            <span className="pa-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/45">
              {ro ? "Spațiere litere" : "Letter spacing"} — {config.letterSpacing}
            </span>
            <input type="range" min={0} max={26} step={1} value={config.letterSpacing} onChange={(e) => set("letterSpacing", Number(e.target.value))} className="h-1 w-full accent-[hsl(264_90%_68%)]" />
          </label>
          <div className="flex items-center gap-2">
            <input type="color" value={config.colorA} onChange={(e) => set("colorA", e.target.value)} aria-label={ro ? "Culoare față" : "Front colour"} className="size-6 cursor-pointer border-0 bg-transparent p-0" />
            <input type="color" value={config.colorB} onChange={(e) => set("colorB", e.target.value)} aria-label={ro ? "Culoare spate" : "Back colour"} className="size-6 cursor-pointer border-0 bg-transparent p-0" />
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-white/70">
              {ro ? "Rotire" : "Spin"}
              <input type="checkbox" checked={config.spin} onChange={(e) => set("spin", e.target.checked)} className="accent-[hsl(264_90%_68%)]" />
            </label>
          </div>
          <button type="button" onClick={() => setConfig(DEFAULT_LOGO)} className="flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/45 hover:text-white">
            <RotateCcw className="size-3" aria-hidden /> {ro ? "Resetează" : "Reset"}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(70%_70%_at_50%_30%,hsl(264_60%_18%),#05060a)]">
        <div className="h-[280px] sm:h-[360px]">
          <LogoScene config={config} active={active} />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/30 p-3">
          <p className="mr-auto text-[11px] leading-snug text-white/55">
            {ro ? "Previzualizarea e gratuită. Pachetul de descărcare are filigranul scos." : "The preview is free. The download pack comes without the watermark."}
          </p>
          <button
            type="button"
            onClick={onBuy}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_-12px_hsl(264_90%_60%)]"
          >
            <Lock className="size-3.5" aria-hidden />
            {ro ? "Descarcă pachetul — 75 lei" : "Download the pack — 75 lei"}
          </button>
        </div>
      </div>
    </div>
  );
}
