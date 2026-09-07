import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

/**
 * BlogPreloader — cinematic intro for the Blog Profesional page.
 *
 * Concept: IDEA -> CONTENT -> STRUCTURE -> CONNECTION -> ARTICLE.
 * Information particles drift in on several depth planes and organise
 * themselves into an abstract article skeleton, connect to a small
 * ecosystem of nodes, then converge into the hero.
 *
 * Implementation notes: plain Canvas 2D with a hand-rolled perspective
 * projection (no WebGL dependency), one rAF loop, device-aware particle
 * budget, and full teardown on unmount. If anything fails the page is
 * still fully rendered underneath — the loader is decorative only.
 */

const SESSION_KEY = "avyron:blogpro:intro";

type Kind = "dot" | "seg" | "node";

type Particle = {
  sx: number; sy: number; sz: number;
  tx: number; ty: number; tz: number;
  x: number; y: number; z: number;
  size: number;
  kind: Kind;
  accent: number; // 0 neutral, 1 violet, 2 blue
  delay: number;
  curve: number;
};

type Segment = { x1: number; y1: number; x2: number; y2: number; z: number; step: number; size: number; accent?: number };

/* Abstract article skeleton in world units (origin = optical centre). */
const SKELETON: Segment[] = [
  { x1: -122, y1: -150, x2: -96, y2: -150, z: 26, step: 13, size: 2.2, accent: 1 }, // category indicator
  { x1: -122, y1: -104, x2: 96, y2: -104, z: 34, step: 15, size: 2.6 }, // title line
  { x1: -122, y1: -80, x2: 22, y2: -80, z: 34, step: 15, size: 2.4 }, // title line 2
  { x1: -124, y1: -34, x2: 124, y2: -34, z: 14, step: 18, size: 1.7 }, // visual block frame
  { x1: -124, y1: 40, x2: 124, y2: 40, z: 14, step: 18, size: 1.7 },
  { x1: -124, y1: -34, x2: -124, y2: 40, z: 14, step: 18, size: 1.7 },
  { x1: 124, y1: -34, x2: 124, y2: 40, z: 14, step: 18, size: 1.7 },
  { x1: -60, y1: 3, x2: 60, y2: 3, z: 22, step: 22, size: 1.6, accent: 2 }, // visual block hint
  { x1: -122, y1: 78, x2: 92, y2: 78, z: -6, step: 16, size: 1.8 }, // body lines
  { x1: -122, y1: 98, x2: 60, y2: 98, z: -6, step: 16, size: 1.8 },
  { x1: -122, y1: 118, x2: 18, y2: 118, z: -6, step: 16, size: 1.8 },
];

/* Ecosystem nodes: SEO, search, analytics, AI, newsletter — symbols only. */
const NODES = [
  { x: -196, y: -168, z: -70, accent: 1 },
  { x: 190, y: -126, z: -84, accent: 0 },
  { x: 214, y: 46, z: -60, accent: 2 },
  { x: -206, y: 106, z: -78, accent: 0 },
  { x: 24, y: 190, z: -92, accent: 1 },
];

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const readVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

function buildParticles(budget: number, rand: () => number): Particle[] {
  const points: Array<{ x: number; y: number; z: number; size: number; kind: Kind; accent: number }> = [];

  for (const s of SKELETON) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const count = Math.max(2, Math.round(len / s.step));
    for (let i = 0; i <= count; i++) {
      const k = i / count;
      points.push({
        x: s.x1 + (s.x2 - s.x1) * k,
        y: s.y1 + (s.y2 - s.y1) * k,
        z: s.z + (rand() - 0.5) * 10,
        size: s.size,
        kind: len > 40 ? "seg" : "dot",
        accent: s.accent ?? 0,
      });
    }
  }
  for (const n of NODES) points.push({ ...n, size: 2.8, kind: "node", accent: n.accent });

  // Device-aware budget: thin the structure evenly, never randomly gut it.
  let sampled = points;
  if (points.length > budget) {
    const keep = budget / points.length;
    let acc = 0;
    sampled = points.filter((p) => {
      if (p.kind === "node") return true;
      acc += keep;
      if (acc >= 1) { acc -= 1; return true; }
      return false;
    });
  }

  return sampled.map((p, i) => {
    const angle = rand() * Math.PI * 2;
    const dist = 300 + rand() * 380;
    return {
      sx: Math.cos(angle) * dist,
      sy: Math.sin(angle) * dist * 0.72,
      sz: -220 + rand() * 460,
      tx: p.x, ty: p.y, tz: p.z,
      x: 0, y: 0, z: 0,
      size: p.size,
      kind: p.kind,
      accent: p.accent,
      delay: p.kind === "node" ? 0.44 + rand() * 0.05 : 0.02 + (i / sampled.length) * 0.24 + rand() * 0.04,
      curve: (rand() - 0.5) * 240,
    };
  });
}

const BlogPreloader = ({ onDone }: { onDone: () => void }) => {
  const { lang } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const repeat = sessionStorage.getItem(SESSION_KEY) === "1";
    const duration = reduced ? 700 : repeat ? 460 : 1650;
    const startProgress = reduced ? 0.62 : repeat ? 0.55 : 0;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    const mobile = window.innerWidth < 768;
    const budget = mobile ? 62 : 148;

    let seed = 20260907;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const particles = buildParticles(reduced ? Math.min(budget, 48) : budget, rand);

    const brand = readVar("--brand", "262 83% 58%");
    const accents = [`hsl(0 0% 96%`, `hsl(${brand}`, `hsl(220 90% 70%`];

    let width = 0, height = 0, dpr = 1;
    const resize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Very small cursor parallax, desktop only.
    let px = 0, py = 0, tpx = 0, tpy = 0;
    const onPointer = (e: PointerEvent) => {
      tpx = (e.clientX / window.innerWidth - 0.5) * 26;
      tpy = (e.clientY / window.innerHeight - 0.5) * 16;
    };
    if (!mobile && !reduced) window.addEventListener("pointermove", onPointer, { passive: true });

    // Scroll lock for the duration of the intro only.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let raf = 0;
    let start = 0;
    const focal = 620;

    const draw = (p: number) => {
      if (!ctx || !canvas) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const scale = Math.min(width, height) / (mobile ? 460 : 620);
      const cx = width / 2;
      const cy = height / 2;

      // Camera: slow push-in plus a very small lateral drift; then through.
      const push = reduced ? 0 : easeInOut(clamp01(p / 0.9)) * 150;
      const through = p > 0.88 ? easeOut((p - 0.88) / 0.12) * 520 : 0;
      const camZ = 220 - push - through;
      px += (tpx - px) * 0.06;
      py += (tpy - py) * 0.06;
      const driftX = reduced ? 0 : Math.sin(p * Math.PI) * 16 + px;
      const driftY = reduced ? 0 : Math.cos(p * Math.PI * 0.8) * 8 + py;

      const converge = p > 0.88 ? easeInOut((p - 0.88) / 0.12) : 0;
      const globalAlpha = p > 0.94 ? 1 - (p - 0.94) / 0.06 : 1;

      const project = (x: number, y: number, z: number) => {
        const s = focal / Math.max(80, focal + z + camZ);
        return { sx: cx + (x + driftX) * s * scale, sy: cy + (y + driftY) * s * scale, s };
      };

      // Structure first, so connection lines can reference projected nodes.
      const projected: Array<{ sx: number; sy: number; s: number; p: Particle; form: number }> = [];
      for (const q of particles) {
        const form = easeOut(clamp01((p - q.delay) / 0.3));
        const arc = Math.sin(form * Math.PI) * q.curve * (1 - form * 0.4);
        let x = q.sx + (q.tx - q.sx) * form + arc * 0.12;
        let y = q.sy + (q.ty - q.sy) * form - arc * 0.06;
        let z = q.sz + (q.tz - q.sz) * form;
        if (converge > 0) {
          x += (0 - x) * converge;
          y += (0 - y) * converge;
          z += (120 - z) * converge;
        }
        const pr = project(x, y, z);
        projected.push({ ...pr, p: q, form });
      }

      // Connection lines — restrained, only while the ecosystem settles.
      const linkAlpha = p > 0.7 ? Math.min(1, (p - 0.7) / 0.12) * (1 - converge) * 0.5 : 0;
      if (linkAlpha > 0.01) {
        ctx.lineWidth = 1;
        for (const item of projected) {
          if (item.p.kind !== "node" || item.form < 0.2) continue;
          const c = project(0, 0, 20);
          ctx.strokeStyle = `${accents[item.p.accent]} / ${(linkAlpha * 0.5 * globalAlpha).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(item.sx, item.sy);
          ctx.lineTo(c.sx, c.sy);
          ctx.stroke();
        }
      }

      for (const item of projected) {
        const { p: q, s, form } = item;
        if (form <= 0 && p < q.delay) continue;
        const depth = clamp01((s - 0.55) / 0.9);
        const alpha = clamp01(0.28 + form * 0.72) * (0.55 + depth * 0.45) * globalAlpha;
        if (alpha <= 0.01) continue;
        const size = q.size * s * scale * (mobile ? 1.9 : 1.7);
        ctx.fillStyle = `${accents[q.accent]} / ${alpha.toFixed(3)})`;
        if (q.kind === "seg" && form > 0.35) {
          const w = size * 3.4;
          ctx.fillRect(item.sx - w / 2, item.sy - size / 2, w, Math.max(0.8, size));
        } else if (q.kind === "node") {
          ctx.beginPath();
          ctx.arc(item.sx, item.sy, Math.max(0.8, size * 0.9), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(item.sx, item.sy, Math.max(0.6, size * 0.7), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      sessionStorage.setItem(SESSION_KEY, "1");
      setLeaving(true);
      onDone();
    };

    const frame = (now: number) => {
      if (!start) start = now;
      const raw = (now - start) / duration;
      const p = Math.min(1, startProgress + raw * (1 - startProgress));
      draw(p);
      if (p >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Safety net: never trap the visitor if a frame loop stalls.
    const guard = window.setTimeout(finish, duration + 1200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(guard);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.body.style.overflow = prevOverflow;
      if (ctx) ctx.clearRect(0, 0, width, height);
    };
  }, [onDone]);

  const brandLine = lang === "ro" ? "Blog profesional" : "Content hub";
  const micro = lang === "ro" ? "Ideile prind structură." : "Ideas take shape.";

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-state={leaving ? "leaving" : "active"}
      className="blogpro-loader fixed inset-0 z-[90] overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="blogpro-loader-brand absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-2 px-6 text-center">
        <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.6em] text-background">AVYRON</p>
        <p className="text-[0.62rem] uppercase tracking-[0.32em] text-background/45">{brandLine}</p>
        <p className="mt-1 text-[0.68rem] tracking-wide text-background/35">{micro}</p>
      </div>
    </div>
  );
};

export default BlogPreloader;
