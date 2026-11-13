import type { MotionProfile } from "@/lib/stage/capability";

const turn = Math.PI * 2;
const colors = {
  home: ["#dcc7ff", "#a987ff", "#a0f0ee"],
  maintenance: ["#c8fff1", "#56bab9", "#a394ff"],
} as const;

/** Short perspective-rendered scene. Geometry is projected onto a 2D canvas
 * so the homepage needs neither a WebGL context nor a 3D engine for the intro. */
export function runHomeIntroScene(canvas: HTMLCanvasElement, profile: MotionProfile, duration: number, theme: keyof typeof colors) {
  const enhanced = profile.enhancedMotion;
  const palette = colors[theme];
  const maintenance = theme === "maintenance";
  const context = canvas.getContext("2d");
  if (!context) return;
  const interval = 1000 / (profile.targetFps || 24);
  const count = Math.max(32, Math.round(144 * profile.particleScale));
  const particles = Array.from({ length: count }, (_, i) => ({
    angle: i * 2.399963,
    radius: 72 + ((i * 97) % 330),
    depth: ((i * 139) % 650) - 225,
    size: (i % 11 === 0 ? 1.7 : .8) + (i % 5) * .13,
    color: palette[i % palette.length],
  }));
  const slices = enhanced ? 68 : 32;
  const paths = Array.from({ length: slices }, (_, i) => {
    const angle = i / slices * turn;
    return [Math.cos(angle), Math.sin(angle)] as const;
  });

  let width = 0;
  let height = 0;
  let frame = 0;
  let previous = -Infinity;
  let dpr = 1;
  const start = performance.now();
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    if (!width || !height) return;
    // Keep capable desktop screens crisp up to 4K. Mobile budgets bound both
    // particle work and bitmap memory, including in landscape orientation.
    const pixels = profile.tier === "ultra" ? 3840 * 2160 : enhanced ? 2560 * 1440 : 1280 * 900;
    dpr = Math.min(devicePixelRatio || 1, profile.maxDpr, Math.sqrt(pixels / (width * height)));
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    previous = -Infinity;
  };
  resize();

  const draw = (now: number) => {
    const elapsed = now - start;
    if (elapsed >= duration || document.hidden) return;
    frame = requestAnimationFrame(draw);
    if (now - previous < interval - 1 || !width || !height) return;
    previous = now;

    const phase = Math.min(elapsed / duration, 1);
    const ease = 1 - (1 - phase) ** 3;
    const scale = Math.min(width, height) / 540;
    const spread = Math.min(1.75, Math.max(1, width / height));
    const centerX = width / 2;
    const centerY = height * .475;
    const angle = maintenance ? .65 - ease * 1.35 : -.45 + ease * .84;
    const camera = 73 + ease * 90;
    const yawSin = Math.sin(angle);
    const yawCos = Math.cos(angle);
    const alpha = Math.min(1, phase * 7);
    const project = (x: number, y: number, z: number) => {
      const rotatedX = x * yawCos - z * yawSin;
      const depth = z * yawCos + x * yawSin + camera;
      const perspective = 520 / Math.max(220, 520 + depth);
      return [centerX + rotatedX * perspective * scale, centerY + y * perspective * scale, perspective] as const;
    };

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      const orbit = particle.angle + ease * .27;
      const [x, y, perspective] = project(
        Math.cos(orbit) * particle.radius * spread,
        Math.sin(orbit) * particle.radius * .88,
        particle.depth - ease * 88,
      );
      context.globalAlpha = Math.min(.85, alpha * perspective * .57);
      context.fillStyle = particle.color;
      const radius = Math.max(.6, particle.size * perspective * Math.min(scale, 2));
      context.fillRect(x, y, radius, radius);
      if (enhanced && particle.size > 1.65) {
        context.globalAlpha *= .28;
        context.fillRect(x - radius * (4 + ease * 8), y + radius * .25, radius * (4 + ease * 8), Math.max(.5, radius * .4));
      }
    }

    const orbitCount = enhanced ? 5 : 2;
    const revealed = Math.min(slices, Math.ceil(slices * (.25 + ease * .82)));
    for (let orbit = 0; orbit < orbitCount; orbit++) {
      context.beginPath();
      const radius = 122 + orbit * 31;
      const tilt = .5 + orbit * .15;
      const offset = Math.floor(orbit * slices / orbitCount);
      for (let i = 0; i <= revealed; i++) {
        const [cosine, sine] = paths[(i + offset) % slices];
        const [x, y] = project(
          cosine * radius,
          maintenance ? sine * radius * .26 + (orbit - orbitCount / 2) * 36 : sine * radius * tilt,
          sine * radius * .84 - orbit * 12,
        );
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineWidth = Math.max(.7, Math.min(1.5, scale));
      context.globalAlpha = alpha * (orbit === 0 ? .46 : .25);
      context.strokeStyle = palette[orbit % palette.length];
      context.stroke();
      if (maintenance && revealed > 5) {
        const [cosine, sine] = paths[(revealed + offset) % slices];
        const [x, y] = project(cosine * radius, sine * radius * .26 + (orbit - orbitCount / 2) * 36, sine * radius * .84 - orbit * 12);
        context.globalAlpha = alpha * .8;
        context.fillStyle = palette[orbit % palette.length];
        context.beginPath();
        context.arc(x, y, Math.max(1.6, scale * 2.3), 0, turn);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  };

  frame = requestAnimationFrame(draw);
  window.addEventListener("resize", resize, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    canvas.width = canvas.height = 1;
  };
}
