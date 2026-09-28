import { useEffect, useRef, useState } from "react";

type Props = {
  /** Durata animației înainte de estompare, în ms. Total ≤ 2s. */
  duration?: number;
  label?: string;
};

type Particle = { x: number; y: number; z: number; size: number; hue: number };

const PARTICLE_COUNT = 220;
const FADE = 420;

/**
 * Ecran de încărcare spațial: particule proiectate 3D pe canvas, cu marca
 * Avyron în centru. Rulează maximum două secunde, nu blochează interacțiunea
 * și nu apare deloc pentru vizitatorii care preferă mișcare redusă.
 */
const SpaceLoader = ({ duration = 1400, label = "Avyron" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"run" | "fade" | "gone">("run");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fade"), duration);
    const goneTimer = window.setTimeout(() => setPhase("gone"), duration + FADE);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
    };
  }, [duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      size: 0.4 + Math.random() * 1.4,
      hue: Math.random() < 0.65 ? 264 : Math.random() < 0.5 ? 190 : 320,
    }));

    let frame = 0;
    let start = performance.now();
    let last = start;

    const render = (now: number) => {
      const delta = Math.min(48, now - last);
      last = now;
      const elapsed = now - start;
      const centerX = width / 2;
      const centerY = height / 2;

      context.clearRect(0, 0, width, height);

      // Nebuloasă discretă în spatele particulelor.
      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.55);
      halo.addColorStop(0, "hsla(264, 90%, 62%, 0.20)");
      halo.addColorStop(0.55, "hsla(200, 95%, 55%, 0.07)");
      halo.addColorStop(1, "hsla(264, 90%, 30%, 0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      for (const particle of particles) {
        particle.z -= (delta / 1000) * 0.42;
        if (particle.z <= 0.02) {
          particle.z = 1;
          particle.x = (Math.random() - 0.5) * 2;
          particle.y = (Math.random() - 0.5) * 2;
        }
        const scale = 0.6 / particle.z;
        const projectedX = centerX + particle.x * scale * width * 0.55;
        const projectedY = centerY + particle.y * scale * height * 0.55;
        if (projectedX < -40 || projectedX > width + 40 || projectedY < -40 || projectedY > height + 40) continue;
        const depth = 1 - particle.z;
        const radius = Math.max(0.4, particle.size * scale * 0.9);
        context.beginPath();
        context.arc(projectedX, projectedY, radius, 0, Math.PI * 2);
        context.fillStyle = `hsla(${particle.hue}, 95%, ${62 + depth * 18}%, ${0.16 + depth * 0.7})`;
        context.fill();
      }

      // Inel orbital care se închide pe măsură ce se termină încărcarea.
      const progress = Math.min(1, elapsed / duration);
      const ringRadius = Math.min(width, height) * 0.17;
      context.lineWidth = 1.5;
      context.strokeStyle = "hsla(264, 90%, 70%, 0.18)";
      context.beginPath();
      context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "hsla(190, 95%, 62%, 0.85)";
      context.lineCap = "round";
      context.beginPath();
      context.arc(centerX, centerY, ringRadius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      context.stroke();

      frame = requestAnimationFrame(render);
    };

    const onResize = () => {
      resize();
      start = performance.now();
    };

    window.addEventListener("resize", onResize);
    frame = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [duration]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      data-testid="space-loader"
      className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-[#07040f] transition-opacity duration-[420ms] ease-out"
      style={{ opacity: phase === "fade" ? 0 : 1 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div className="relative flex flex-col items-center">
        <div
          className="font-display text-3xl font-extrabold uppercase tracking-[0.34em] text-transparent sm:text-4xl"
          style={{
            backgroundImage: "linear-gradient(100deg, #ffffff 0%, #c4b5fd 45%, #67e8f9 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          {label}
        </div>
        <div className="mt-5 h-0.5 w-48 overflow-hidden rounded-full bg-white/15">
          <span
            className="block h-full w-full origin-left bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-300"
            style={{ animation: `avyron-loader-bar ${duration}ms cubic-bezier(0.4,0,0.2,1) forwards` }}
          />
        </div>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
          Innovate · Develop · Elevate
        </p>
      </div>
    </div>
  );
};

export default SpaceLoader;
