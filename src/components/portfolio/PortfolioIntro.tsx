import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Decorative, bounded intro. Never waits for assets or blocks scrolling. */
export default function PortfolioIntro({ ro }: { ro: boolean }) {
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (/jsdom/i.test(navigator.userAgent) || window.location.hash) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    // Small screens go directly to the cinematic hero. A fullscreen loader
    // would postpone reading and interaction on constrained mobile connections.
    if (
      motion.matches ||
      nav.connection?.saveData ||
      matchMedia("(max-width: 639px)").matches
    )
      return;
    // The prerendered page is already readable. Never replay a loading screen
    // after a slow initial download; keep the cinematic intro for fast loads
    // and in-app navigation instead of delaying content on constrained devices.
    const navigation = performance.getEntriesByType("navigation")[0];
    if (
      navigation &&
      new URL(navigation.name).pathname === location.pathname &&
      performance.now() > 2500
    )
      return;
    try {
      if (sessionStorage.getItem("avyron:portfolio:intro")) return;
      sessionStorage.setItem("avyron:portfolio:intro", "1");
    } catch {
      /* The intro still has a fixed lifetime without storage. */
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1250);
    const changed = () => {
      if (motion.matches) setVisible(false);
    };
    motion.addEventListener("change", changed);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", changed);
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!visible || !canvas || !ctx) return;
    // Actual XYZ geometry with perspective projection. Canvas 2D avoids a
    // second WebGL context or downloading a 3D engine for a 1.25-second intro.
    const width = Math.min(innerWidth - 16, 520),
      height = 340;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const scale = Math.min(width / 390, 1.3);
    let frame = 0,
      started = 0,
      last = 0;
    type Point = { x: number; y: number; z: number };
    const tick = (time: number) => {
      if (document.hidden) {
        setVisible(false);
        return;
      }
      if (!started) started = time;
      if (time - last < 1000 / 30) {
        frame = requestAnimationFrame(tick);
        return;
      }
      last = time;
      const t = Math.min((time - started) / 1100, 1),
        ease = 1 - Math.pow(1 - t, 3);
      const angle = -0.8 + ease * 1.1,
        tilt = -0.28;
      const project = (x: number, y: number, z: number): Point => {
        const rx = x * Math.cos(angle) + z * Math.sin(angle);
        const rz = -x * Math.sin(angle) + z * Math.cos(angle);
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const p = 640 / (640 + depth + 150);
        return {
          x: width / 2 + rx * p * scale,
          y: height / 2 + ry * p * scale,
          z: depth,
        };
      };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const faces: {
        points: Point[];
        depth: number;
        color: string;
        alpha: number;
      }[] = [];
      for (let layer = 0; layer < 3; layer++) {
        const z = 100 - layer * 90,
          x = (layer - 1) * 14,
          y = (layer - 1) * 15;
        const points = [
          [-135, -85, -10],
          [135, -85, -10],
          [135, 85, -10],
          [-135, 85, -10],
          [-135, -85, 10],
          [135, -85, 10],
          [135, 85, 10],
          [-135, 85, 10],
        ].map(([px, py, pz]) => project(px + x, py + y, pz + z));
        for (const [index, face] of [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 4, 7, 3],
          [1, 5, 6, 2],
          [0, 1, 5, 4],
          [3, 2, 6, 7],
        ].entries()) {
          const vertices = face.map((i) => points[i]);
          faces.push({
            points: vertices,
            depth: vertices.reduce((n, p) => n + p.z, 0) / 4,
            color: layer === 1 ? "145,219,210" : "195,177,237",
            alpha: index < 2 ? 0.06 : 0.12,
          });
        }
      }
      faces.sort((a, b) => b.depth - a.depth);
      for (const face of faces) {
        ctx.beginPath();
        face.points.forEach((p, i) =>
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(${face.color},${face.alpha * ease})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${face.color},${0.6 * ease})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = project(
          Math.cos(a) * 190,
          105 + Math.sin(a) * 18,
          Math.sin(a) * 160,
        );
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(145,219,210,${0.28 * ease})`;
      ctx.stroke();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  if (!visible) return null;
  // The app route transition uses transforms. A body portal keeps this fixed
  // scene anchored to the viewport throughout that animation.
  return createPortal(
    <div className="pf-intro" data-testid="portfolio-intro">
      <canvas ref={canvasRef} className="pf-intro-canvas" aria-hidden="true" />
      <div className="pf-intro-copy">
        <span>AVYRON / SELECTED WORK</span>
        <p>{ro ? "O perspectivă nouă." : "A new perspective."}</p>
        <span>
          {ro
            ? "Identitate · experiență · tehnologie"
            : "Identity · experience · technology"}
        </span>
      </div>
      <button type="button" onClick={() => setVisible(false)}>
        {ro ? "Omite introducerea" : "Skip introduction"} ↗
      </button>
    </div>,
    document.body,
  );
}
