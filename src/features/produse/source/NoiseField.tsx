import { useEffect, useRef } from "react";

/**
 * NoiseField — Avyron Products (avyron.ro/produse)
 * Fundal organic desenat pe canvas 2D: zgomot valoric interpolat, animat lent.
 * Nu cere WebGL, deci merge pe orice telefon vechi, și se oprește singur când
 * nu e pe ecran sau când utilizatorul a cerut mai puțină mișcare.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

const hash = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const smooth = (t: number) => t * t * (3 - 2 * t);

const noise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

export function NoiseField({ colorA = "#8b5cf6", colorB = "#22d3ee", scale = 0.012, speed = 0.12 }: { colorA?: string; colorB?: string; scale?: number; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let time = 0;
    let visible = true;

    const parse = (value: string) => {
      const hex = value.replace("#", "");
      const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
      return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
    };
    const [ar, ag, ab] = parse(colorA);
    const [br, bg, bb] = parse(colorB);

    const draw = () => {
      // Rezoluție mică plus blur: costă puțin și arată ca un gradient viu.
      const width = (canvas.width = Math.max(60, Math.min(220, canvas.clientWidth)));
      const height = (canvas.height = Math.max(40, Math.min(160, canvas.clientHeight)));
      const image = context.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const value = noise(x * scale * 8 + time, y * scale * 8 - time * 0.6);
          const shade = Math.min(1, Math.max(0, value));
          const index = (y * width + x) * 4;
          image.data[index] = ar + (br - ar) * shade;
          image.data[index + 1] = ag + (bg - ag) * shade;
          image.data[index + 2] = ab + (bb - ab) * shade;
          image.data[index + 3] = 235;
        }
      }
      context.putImageData(image, 0, 0);
    };

    const loop = () => {
      if (visible) {
        time += speed * 0.02;
        draw();
      }
      frame = requestAnimationFrame(loop);
    };

    draw();
    if (!still) frame = requestAnimationFrame(loop);

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [colorA, colorB, scale, speed]);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", filter: "blur(18px) saturate(1.2)" }} />;
}

export default NoiseField;
