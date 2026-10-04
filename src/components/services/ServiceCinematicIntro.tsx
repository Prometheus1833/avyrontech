import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import {
  SERVICE_INTRO_DURATION_MS,
  SERVICE_INTRO_EXIT_MS,
  SERVICE_INTRO_GUARD_MS,
  SERVICE_INTRO_REPEAT_MS,
  SERVICE_INTRO_SPECS,
  type ServiceIntroKey,
  type ServiceIntroMotif,
} from "@/data/serviceIntros";
import { motionProfile } from "@/lib/stage/capability";

type Vec3 = { x: number; y: number; z: number };
type Edge = [number, number];
type Geometry = { points: Vec3[]; edges: Edge[] };
type Particle = {
  angle: number;
  radius: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  target: number;
  accent: boolean;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const addPath = (geometry: Geometry, path: Vec3[], close = false) => {
  const offset = geometry.points.length;
  geometry.points.push(...path);
  for (let index = 1; index < path.length; index += 1) geometry.edges.push([offset + index - 1, offset + index]);
  if (close && path.length > 2) geometry.edges.push([offset + path.length - 1, offset]);
};

const addRect = (geometry: Geometry, cx: number, cy: number, z: number, width: number, height: number) => {
  addPath(
    geometry,
    [
      { x: cx - width / 2, y: cy - height / 2, z },
      { x: cx + width / 2, y: cy - height / 2, z },
      { x: cx + width / 2, y: cy + height / 2, z },
      { x: cx - width / 2, y: cy + height / 2, z },
    ],
    true,
  );
};

const addBox = (geometry: Geometry, cx: number, cy: number, cz: number, width: number, height: number, depth: number) => {
  const offset = geometry.points.length;
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  geometry.points.push(
    { x: cx - x, y: cy - y, z: cz - z }, { x: cx + x, y: cy - y, z: cz - z },
    { x: cx + x, y: cy + y, z: cz - z }, { x: cx - x, y: cy + y, z: cz - z },
    { x: cx - x, y: cy - y, z: cz + z }, { x: cx + x, y: cy - y, z: cz + z },
    { x: cx + x, y: cy + y, z: cz + z }, { x: cx - x, y: cy + y, z: cz + z },
  );
  const edges: Edge[] = [
    [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  geometry.edges.push(...edges.map(([a, b]) => [a + offset, b + offset] as Edge));
};

const addRing = (geometry: Geometry, radius: number, tilt: number, zOffset = 0, segments = 28) => {
  const path = Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * Math.cos(tilt),
      z: zOffset + Math.sin(angle) * radius * Math.sin(tilt),
    };
  });
  addPath(geometry, path, true);
};

const addCircle = (geometry: Geometry, cx: number, cy: number, z: number, radius: number, segments = 10) => {
  addPath(
    geometry,
    Array.from({ length: segments }, (_, index) => {
      const angle = (index / segments) * Math.PI * 2;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, z };
    }),
    true,
  );
};

const addSphere = (geometry: Geometry, radius: number) => {
  [-0.72, -0.36, 0, 0.36, 0.72].forEach((latitude) => {
    const ringRadius = radius * Math.cos(latitude);
    const y = radius * Math.sin(latitude);
    const path = Array.from({ length: 18 }, (_, index) => {
      const angle = (index / 18) * Math.PI * 2;
      return { x: Math.cos(angle) * ringRadius, y, z: Math.sin(angle) * ringRadius };
    });
    addPath(geometry, path, true);
  });
  [0, Math.PI / 3, (Math.PI * 2) / 3].forEach((longitude) => {
    const path = Array.from({ length: 20 }, (_, index) => {
      const angle = (index / 20) * Math.PI * 2;
      return {
        x: Math.cos(longitude) * Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.sin(longitude) * Math.cos(angle) * radius,
      };
    });
    addPath(geometry, path, true);
  });
};

function buildGeometry(motif: ServiceIntroMotif): Geometry {
  const geometry: Geometry = { points: [], edges: [] };

  if (motif === "browser") {
    addBox(geometry, 0, 0, 0, 230, 142, 24);
    addPath(geometry, [{ x: -115, y: -38, z: 13 }, { x: 115, y: -38, z: 13 }]);
    [-86, -69, -52].forEach((x) => addCircle(geometry, x, -54, 14, 4));
    addRect(geometry, 46, 15, 14, 92, 46);
    addPath(geometry, [{ x: -88, y: 2, z: 14 }, { x: -26, y: 2, z: 14 }]);
    addPath(geometry, [{ x: -88, y: 22, z: 14 }, { x: -38, y: 22, z: 14 }]);
  } else if (motif === "network") {
    addSphere(geometry, 78);
    addRing(geometry, 132, 0.38, 0, 34);
    addRing(geometry, 112, -0.72, 0, 30);
  } else if (motif === "commerce") {
    addBox(geometry, 0, 8, 0, 148, 118, 132);
    addPath(geometry, [{ x: -74, y: -51, z: 66 }, { x: 0, y: -92, z: 15 }, { x: 74, y: -51, z: 66 }]);
    addPath(geometry, [{ x: -42, y: -52, z: 68 }, { x: -42, y: -82, z: 35 }, { x: 42, y: -82, z: 35 }, { x: 42, y: -52, z: 68 }]);
    addRing(geometry, 116, 0.25, 0, 30);
  } else if (motif === "devices") {
    addBox(geometry, -52, 2, 10, 86, 166, 18);
    addBox(geometry, 58, -4, -24, 112, 142, 16);
    addRect(geometry, -52, 0, 20, 63, 122);
    addRect(geometry, 58, -6, -15, 86, 98);
  } else if (motif === "neural") {
    addSphere(geometry, 102);
    addRing(geometry, 136, 0.55, 0, 34);
    addRing(geometry, 126, -0.48, 0, 32);
  } else {
    addBox(geometry, 0, 0, 0, 190, 128, 56);
    for (let x = -63; x <= 63; x += 42) addPath(geometry, [{ x, y: -64, z: 29 }, { x, y: 64, z: 29 }]);
    for (let y = -42; y <= 42; y += 42) addPath(geometry, [{ x: -95, y, z: 29 }, { x: 95, y, z: 29 }]);
    addPath(geometry, [{ x: -45, y: 0, z: 34 }, { x: -12, y: 34, z: 34 }, { x: 54, y: -38, z: 34 }]);
  }

  return geometry;
}

const rotatePoint = (point: Vec3, yaw: number, pitch: number, roll: number): Vec3 => {
  const cosy = Math.cos(yaw);
  const siny = Math.sin(yaw);
  const cosp = Math.cos(pitch);
  const sinp = Math.sin(pitch);
  const cosr = Math.cos(roll);
  const sinr = Math.sin(roll);
  const x1 = point.x * cosy - point.z * siny;
  const z1 = point.x * siny + point.z * cosy;
  const y2 = point.y * cosp - z1 * sinp;
  const z2 = point.y * sinp + z1 * cosp;
  return { x: x1 * cosr - y2 * sinr, y: x1 * sinr + y2 * cosr, z: z2 };
};

const buildParticles = (count: number, pointCount: number, seedStart: number): Particle[] => {
  let seed = seedStart;
  const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: count }, (_, index) => ({
    angle: random() * Math.PI * 2,
    radius: 160 + random() * 250,
    y: (random() - 0.5) * 330,
    z: (random() - 0.5) * 320,
    size: 0.7 + random() * 1.8,
    speed: 0.45 + random() * 0.9,
    target: index % Math.max(1, pointCount),
    accent: random() > 0.68,
  }));
};

const sessionKey = (service: ServiceIntroKey) => `avyron:service-intro:${service}`;

const ServiceCinematicIntro = ({ service }: { service: ServiceIntroKey }) => {
  const { lang } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef(motionProfile());
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined" || /jsdom/i.test(window.navigator.userAgent)) return false;
    return motionProfile().tier !== "none";
  });
  const [leaving, setLeaving] = useState(false);
  const spec = SERVICE_INTRO_SPECS[service];

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) {
      setVisible(false);
      return;
    }

    let repeat = false;
    try {
      repeat = window.sessionStorage.getItem(sessionKey(service)) === "1";
    } catch {
      /* Private mode: play the full intro. */
    }

    const duration = repeat ? SERVICE_INTRO_REPEAT_MS : SERVICE_INTRO_DURATION_MS;
    const geometry = buildGeometry(spec.motif);
    const mobile = window.innerWidth < 768;
    const profile = profileRef.current;
    const baseParticles = mobile ? 52 : 92;
    const particles = buildParticles(Math.max(22, Math.round(baseParticles * profile.particleScale)), geometry.points.length, service.length * 2026 + 17);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrame = 0;
    let start = 0;
    let lastDraw = 0;
    let exitTimer = 0;
    let finished = false;
    let gsapCleanup: (() => void) | undefined;
    const frameInterval = 1000 / Math.max(1, profile.targetFps);
    let vignette: CanvasGradient | null = null;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? Math.min(1.35, profile.maxDpr) : profile.maxDpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      vignette = context.createRadialGradient(width / 2, height * 0.46, Math.min(width, height) * 0.2, width / 2, height * 0.5, Math.max(width, height) * 0.72);
      vignette.addColorStop(0, "rgba(3, 4, 11, 0)");
      vignette.addColorStop(1, "rgba(3, 4, 11, 0.72)");
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        window.sessionStorage.setItem(sessionKey(service), "1");
      } catch {
        /* Storage is optional. */
      }
      setLeaving(true);
      exitTimer = window.setTimeout(() => setVisible(false), SERVICE_INTRO_EXIT_MS);
    };

    const draw = (progress: number) => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";

      const cx = width / 2;
      const cy = height * (mobile ? 0.43 : 0.46);
      const baseScale = Math.min(width, height) / (mobile ? 500 : 690);
      const form = easeOut(progress / (repeat ? 0.48 : 0.34));
      const exit = easeInOut((progress - 0.82) / 0.18);
      const opacity = 1 - exit;
      const yaw = -0.72 + easeInOut(progress) * Math.PI * 2.08;
      const pitch = 0.16 + Math.sin(progress * Math.PI * 2) * 0.12;
      const roll = Math.sin(progress * Math.PI) * 0.04;
      const camera = 580 - exit * 185;
      const objectScale = baseScale * (1 + exit * 1.4);

      const project = (point: Vec3) => {
        const depth = Math.max(140, camera - point.z);
        const perspective = 520 / depth;
        return {
          x: cx + point.x * perspective * objectScale,
          y: cy + point.y * perspective * objectScale,
          scale: perspective,
          depth: point.z,
        };
      };

      const transformed = geometry.points.map((point) => project(rotatePoint(point, yaw, pitch, roll)));

      context.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        const target = geometry.points[particle.target] ?? { x: 0, y: 0, z: 0 };
        const angle = particle.angle + progress * Math.PI * 2 * particle.speed;
        const orbit: Vec3 = {
          x: Math.cos(angle) * particle.radius,
          y: particle.y + Math.sin(angle * 1.4) * 22,
          z: particle.z + Math.sin(angle) * particle.radius * 0.45,
        };
        const settle = form * (0.88 + 0.08 * Math.sin(angle));
        const world = {
          x: orbit.x + (target.x - orbit.x) * settle,
          y: orbit.y + (target.y - orbit.y) * settle,
          z: orbit.z + (target.z - orbit.z) * settle,
        };
        const projected = project(rotatePoint(world, yaw * 0.58, pitch, roll));
        const radius = Math.max(0.5, particle.size * projected.scale * objectScale);
        const color = particle.accent ? spec.secondary : spec.primary;
        const alpha = (0.18 + form * 0.62) * opacity;
        context.fillStyle = `rgba(${color} / ${alpha.toFixed(3)})`;
        context.shadowColor = `rgb(${color})`;
        context.shadowBlur = radius * 4;
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.shadowBlur = 12;
      context.lineWidth = mobile ? 1 : 1.15;
      context.strokeStyle = `rgba(${spec.primary} / ${(0.26 + form * 0.66) * opacity})`;
      for (const [from, to] of geometry.edges) {
        const a = transformed[from];
        const b = transformed[to];
        if (!a || !b) continue;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      context.shadowBlur = 18;
      context.fillStyle = `rgba(${spec.secondary} / ${0.75 * opacity})`;
      for (let index = 0; index < transformed.length; index += Math.max(1, Math.floor(transformed.length / 22))) {
        const point = transformed[index];
        context.beginPath();
        context.arc(point.x, point.y, mobile ? 1.5 : 1.8, 0, Math.PI * 2);
        context.fill();
      }

      if (spec.motif === "scan") {
        const scanY = cy - 92 * baseScale + progress * 184 * baseScale;
        const gradient = context.createLinearGradient(cx - 150, scanY, cx + 150, scanY);
        gradient.addColorStop(0, `rgba(${spec.primary} / 0)`);
        gradient.addColorStop(0.5, `rgba(${spec.primary} / ${0.8 * opacity})`);
        gradient.addColorStop(1, `rgba(${spec.primary} / 0)`);
        context.strokeStyle = gradient;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(cx - 150 * baseScale, scanY);
        context.lineTo(cx + 150 * baseScale, scanY);
        context.stroke();
      }

      if (profile.postProcessing && vignette) {
        context.globalCompositeOperation = "source-over";
        context.fillStyle = vignette;
        context.fillRect(0, 0, width, height);
      }

      context.shadowBlur = 0;
      context.globalCompositeOperation = "source-over";
      if (barRef.current) barRef.current.style.transform = `scaleX(${clamp01(progress)})`;
    };

    const frame = (now: number) => {
      if (!start) start = now;
      if (now - lastDraw < frameInterval) {
        animationFrame = window.requestAnimationFrame(frame);
        return;
      }
      lastDraw = now;
      const progress = Math.min(1, (now - start) / duration);
      draw(progress);
      if (progress >= 1) {
        finish();
        return;
      }
      animationFrame = window.requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    animationFrame = window.requestAnimationFrame(frame);
    const guard = window.setTimeout(finish, duration + SERVICE_INTRO_GUARD_MS);

    // GSAP este cerut dinamic doar pe hardware-ul de top și animează exclusiv
    // copy-ul. Canvas-ul critic pornește imediat, fără să aștepte chunk-ul.
    if (profile.tier === "ultra" && copyRef.current) {
      void import("gsap").then(({ default: gsap }) => {
        if (finished || !copyRef.current) return;
        const tween = gsap.fromTo(
          copyRef.current,
          { autoAlpha: 0, y: 14, filter: "blur(7px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.72, ease: "power3.out", delay: 0.08 },
        );
        gsapCleanup = () => tween.kill();
      });
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(guard);
      window.clearTimeout(exitTimer);
      window.removeEventListener("resize", resize);
      gsapCleanup?.();
      document.body.style.overflow = previousOverflow;
      context.clearRect(0, 0, width, height);
    };
  }, [service, spec, visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label={lang === "ro" ? `Se deschide ${spec.label.ro}` : `Opening ${spec.label.en}`}
      data-service-intro={service}
      data-state={leaving ? "leaving" : "active"}
      data-quality={profileRef.current.tier}
      style={{ transitionDuration: `${SERVICE_INTRO_EXIT_MS}ms` }}
      className={`fixed inset-0 z-[100] overflow-hidden bg-[#050713] text-white transition ease-out ${
        leaving ? "pointer-events-none scale-[1.015] opacity-0 blur-sm" : "opacity-100"
      }`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 42%, rgba(${spec.primary} / .18), transparent 34%), radial-gradient(circle at 58% 54%, rgba(${spec.secondary} / .12), transparent 42%), linear-gradient(145deg, #03040b 0%, #080b1b 52%, #03040b 100%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black, transparent 72%)",
        }}
      />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />

      <div ref={copyRef} className="absolute inset-x-0 bottom-[10%] flex flex-col items-center px-5 text-center sm:bottom-[12%]">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.55em] text-white/45">AVYRON · DIGITAL SYSTEM</p>
        <p className="mt-3 font-display text-base font-bold tracking-[0.06em] text-white sm:text-lg">{spec.label[lang]}</p>
        <p className="mt-1 text-[11px] tracking-[0.12em] text-white/45">{spec.micro[lang]}</p>
        <div aria-hidden className="mt-4 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.24em] text-white/35 sm:text-[9px]">
          {spec.sequence[lang].map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              {index > 0 && <i className="size-1 rounded-full bg-white/20" />}
              {step}
            </span>
          ))}
        </div>
        <span aria-hidden className="mt-4 h-px w-40 overflow-hidden bg-white/10 sm:w-52">
          <span
            ref={barRef}
            className="block h-full origin-left scale-x-0"
            style={{ backgroundImage: `linear-gradient(90deg, rgb(${spec.primary}), rgb(${spec.secondary}))` }}
          />
        </span>
      </div>
    </div>
  );
};

export default ServiceCinematicIntro;
