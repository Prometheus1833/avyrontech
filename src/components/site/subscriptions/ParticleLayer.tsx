import { useEffect, useRef } from "react";

type Props = {
  /** Nuanța secțiunii, în formatul „190 92% 55%". */
  hue: string;
  /** Numărul de particule; se reduce automat pe ecrane mici. */
  density?: number;
  className?: string;
};

type Particle = { x: number; y: number; z: number; r: number; drift: number; phase: number };

/**
 * Praf luminos care plutește în spatele secțiunii, în culoarea ei. Animația
 * pornește doar când secțiunea e pe ecran și se oprește complet pentru
 * vizitatorii care preferă mișcare redusă.
 */
const ParticleLayer = ({ hue, density = 46, className = "" }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef(hue);
  hueRef.current = hue;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let visible = false;
    let frame = 0;
    let last = performance.now();

    const seed = () => {
      const count = Math.max(14, Math.round(density * Math.min(1, width / 1100)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: 0.25 + Math.random() * 0.75,
        r: 0.6 + Math.random() * 1.9,
        drift: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const render = (now: number) => {
      const delta = Math.min(48, now - last);
      last = now;
      context.clearRect(0, 0, width, height);
      const time = now / 1000;
      for (const particle of particles) {
        particle.y -= (delta / 1000) * 0.012 * particle.drift;
        if (particle.y < -0.05) {
          particle.y = 1.05;
          particle.x = Math.random();
        }
        const sway = Math.sin(time * 0.35 * particle.drift + particle.phase) * 0.012;
        const x = (particle.x + sway) * width;
        const y = particle.y * height;
        const radius = particle.r * particle.z;
        const alpha = 0.12 + particle.z * 0.4;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `hsl(${hueRef.current} / ${alpha.toFixed(3)})`;
        context.fill();
        if (particle.r > 2) {
          context.beginPath();
          context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
          context.fillStyle = `hsl(${hueRef.current} / ${(alpha * 0.12).toFixed(3)})`;
          context.fill();
        }
      }
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(render);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);

    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible && !document.hidden) start();
      else stop();
    }, { rootMargin: "160px 0px" });
    intersection.observe(wrap);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};

export default ParticleLayer;
