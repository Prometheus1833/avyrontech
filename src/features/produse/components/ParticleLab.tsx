import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { detectTier, particleBudget, reducedMotion } from "../lib/capability";
import { DEFAULT_CONFIG, type Formation, type LabConfig } from "./labConfig";

/**
 * Avyron Particle Lab — configurator de particule 3D, construit de la zero.
 *
 * Cum funcționează: un singur `THREE.Points` cu două seturi de poziții —
 * cea curentă și cea țintă a formației alese. La fiecare cadru interpolăm
 * pozițiile (morfare) și lăsăm shaderul să adauge derivă, atracție la cursor și
 * scânteiere. Formațiile geometrice sunt calculate analitic; textul și imaginea
 * sunt eșantionate dintr-un canvas ascuns, deci orice siglă devine nor de
 * particule fără fișiere externe.
 *
 * Buget: numărul de particule e plafonat de treapta de calitate a
 * dispozitivului; pe „none” (fără WebGL2 sau mișcare redusă) nu pornim deloc.
 */

export type { Formation, LabConfig } from "./labConfig";


const VERT = `
precision highp float;
attribute vec3 target;
attribute float seed;
uniform float uTime, uMorph, uSize, uTurb, uAttract, uSpeed, uPixelRatio;
uniform vec3 uPointer;
varying float vSeed;
varying float vDepth;

// Zgomot ieftin, suficient pentru derivă organică.
vec3 drift(vec3 p, float t){
  return vec3(
    sin(p.y * 1.7 + t) * cos(p.z * 1.3 - t * .7),
    sin(p.z * 1.5 - t * .8) * cos(p.x * 1.9 + t * .6),
    sin(p.x * 1.6 + t * .9) * cos(p.y * 1.4 - t * .5)
  );
}

void main(){
  vSeed = seed;
  vec3 p = mix(position, target, uMorph);
  float t = uTime * uSpeed;
  p += drift(p * .6, t * .35 + seed * 6.2831) * uTurb * .35;

  // Atracția spre cursor: cădere pătratică, ca să nu deformeze toată forma.
  vec3 toPointer = uPointer - p;
  float d = length(toPointer);
  p += normalize(toPointer + 1e-5) * uAttract * .9 / (1. + d * d * 2.5);

  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
  float twinkle = .75 + .25 * sin(t * 2.2 + seed * 40.);
  gl_PointSize = uSize * uPixelRatio * twinkle * (26. / max(.1, -mv.z));
}
`;

const FRAG = `
precision highp float;
uniform vec3 uColorA, uColorB;
uniform float uGlow, uStyle;
varying float vSeed;
varying float vDepth;

void main(){
  vec2 c = gl_PointCoord - .5;
  float r = length(c) * 2.;
  if (r > 1.) discard;
  // 0 = punct tăios, 1 = scânteie, 2 = pată moale
  float alpha = uStyle < .5 ? step(r, .9)
              : uStyle < 1.5 ? pow(1. - r, 1.6) * (abs(c.x) < .08 || abs(c.y) < .08 ? 1.3 : .55)
              : pow(1. - r, 2.2);
  vec3 col = mix(uColorA, uColorB, clamp(vSeed * .6 + smoothstep(2., 9., vDepth) * .6, 0., 1.));
  col *= .55 + uGlow;
  gl_FragColor = vec4(col, alpha * (.35 + uGlow * .65));
  #ifdef GL_ES
  #endif
}
`;

/** Pozițiile țintă ale unei formații, în spațiu normalizat (~[-2,2]). */
function formationPositions(formation: Formation, count: number, extras: { text: string; image?: ImageData | null }): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (1 + Math.sqrt(5));

  if (formation === "sphere") {
    for (let i = 0; i < count; i++) {
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / count);
      const theta = golden * k;
      out[i * 3] = Math.cos(theta) * Math.sin(phi) * 2;
      out[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * 2;
      out[i * 3 + 2] = Math.cos(phi) * 2;
    }
    return out;
  }
  if (formation === "cube") {
    for (let i = 0; i < count; i++) {
      const face = i % 6;
      const u = Math.random() * 2 - 1;
      const v = Math.random() * 2 - 1;
      const s = 1.6;
      const p = face === 0 ? [u, v, 1] : face === 1 ? [u, v, -1] : face === 2 ? [u, 1, v] : face === 3 ? [u, -1, v] : face === 4 ? [1, u, v] : [-1, u, v];
      out[i * 3] = p[0] * s;
      out[i * 3 + 1] = p[1] * s;
      out[i * 3 + 2] = p[2] * s;
    }
    return out;
  }
  if (formation === "helix") {
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 12;
      const strand = i % 2 === 0 ? 0 : Math.PI;
      const radius = 1.1 + (Math.random() - 0.5) * 0.12;
      out[i * 3] = Math.cos(t + strand) * radius;
      out[i * 3 + 1] = (i / count - 0.5) * 4.2;
      out[i * 3 + 2] = Math.sin(t + strand) * radius;
    }
    return out;
  }
  if (formation === "torus") {
    for (let i = 0; i < count; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const R = 1.5;
      const r = 0.55;
      out[i * 3] = (R + r * Math.cos(v)) * Math.cos(u);
      out[i * 3 + 1] = r * Math.sin(v);
      out[i * 3 + 2] = (R + r * Math.cos(v)) * Math.sin(u);
    }
    return out;
  }

  // Text și imagine: eșantionăm pixelii opaci dintr-un canvas ascuns.
  const source = extras.image ?? sampleText(extras.text || "AVYRON");
  if (!source) return formationPositions("sphere", count, extras);
  const pixels: Array<[number, number, number]> = [];
  const { width, height, data } = source;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < 100) continue;
      const luminance = (data[idx] + data[idx + 1] + data[idx + 2]) / 765;
      pixels.push([x / width - 0.5, 0.5 - y / height, luminance]);
    }
  }
  if (!pixels.length) return formationPositions("sphere", count, extras);
  const aspect = width / height;
  for (let i = 0; i < count; i++) {
    const [px, py, lum] = pixels[Math.floor((i / count) * pixels.length)];
    out[i * 3] = px * 4.2 * Math.min(1.6, aspect);
    out[i * 3 + 1] = py * 4.2;
    out[i * 3 + 2] = (lum - 0.5) * 0.5 + (Math.random() - 0.5) * 0.12;
  }
  return out;
}

function sampleText(text: string): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 120;
  do {
    ctx.font = `800 ${size}px "Avenir Next", "Segoe UI", system-ui, sans-serif`;
    size -= 4;
  } while (ctx.measureText(text).width > 390 && size > 18);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export type LabHandle = {
  snapshot: () => string | null;
};

export function ParticleCanvas({
  config,
  active,
  onReady,
  className = "",
  handleRef,
  setImageRef,
}: {
  config: LabConfig;
  active: boolean;
  onReady?: () => void;
  className?: string;
  handleRef?: { current: LabHandle | null };
  /** Primește funcția de încărcare a unei imagini, folosită de panou. */
  setImageRef?: { current: ((file: File) => Promise<void>) | null };
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    points?: THREE.Points;
    material?: THREE.ShaderMaterial;
    geometry?: THREE.BufferGeometry;
    camera?: THREE.PerspectiveCamera;
    scene?: THREE.Scene;
    imageData?: ImageData | null;
    morph: number;
    rotX: number;
    rotY: number;
    velX: number;
    velY: number;
    zoom: number;
  }>({ morph: 1, rotX: 0.2, rotY: 0, velX: 0, velY: 0.0015, zoom: 7.5 });
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const tier = useMemo(() => detectTier(), []);

  // Inițializarea scenei — o singură dată per montare.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || tier === "none") return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, tier === "high" ? 2 : 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100);
    camera.position.set(0, 0, stateRef.current.zoom);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 1 },
        uSize: { value: config.size },
        uTurb: { value: config.turbulence },
        uAttract: { value: 0 },
        uSpeed: { value: config.speed },
        uPixelRatio: { value: pixelRatio },
        uPointer: { value: new THREE.Vector3(0, 0, 0) },
        uColorA: { value: new THREE.Color(config.colorA) },
        uColorB: { value: new THREE.Color(config.colorB) },
        uGlow: { value: config.glow },
        uStyle: { value: 2 },
      },
    });

    const geometry = new THREE.BufferGeometry();
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    Object.assign(stateRef.current, { renderer, scene, camera, material, geometry, points });
    onReady?.();

    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Rotire liberă cu inerție, zoom cu rotița, pinch pe touch.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const el = renderer.domElement;
    const down = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      el.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      (material.uniforms.uPointer.value as THREE.Vector3).set(nx * 2.4, ny * 2.0, 0.6);
      if (!dragging) return;
      stateRef.current.velY = (event.clientX - lastX) * 0.004;
      stateRef.current.velX = (event.clientY - lastY) * 0.004;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const up = () => (dragging = false);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      stateRef.current.zoom = THREE.MathUtils.clamp(stateRef.current.zoom + event.deltaY * 0.004, 3.2, 16);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });

    if (handleRef) {
      handleRef.current = {
        snapshot: () => {
          try {
            renderer.render(scene, camera);
            return renderer.domElement.toDataURL("image/png");
          } catch {
            return null;
          }
        },
      };
    }

    return () => {
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      el.remove();
      if (handleRef) handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  // Numărul de particule și formația: reconstruim atributele doar când se schimbă.
  const count = Math.min(config.count, particleBudget(tier) || config.count);
  useEffect(() => {
    const { geometry, material } = stateRef.current;
    if (!geometry || !material) return;
    const targets = formationPositions(config.formation, count, { text: config.text, image: stateRef.current.imageData });
    const existing = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;

    if (!existing || existing.count !== count) {
      const seeds = new Float32Array(count);
      for (let i = 0; i < count; i++) seeds[i] = Math.random();
      geometry.setAttribute("position", new THREE.BufferAttribute(targets.slice(), 3));
      geometry.setAttribute("target", new THREE.BufferAttribute(targets, 3));
      geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
      stateRef.current.morph = 1;
      material.uniforms.uMorph.value = 1;
    } else {
      // Morfare: pozițiile curente devin punctul de plecare, țintele se schimbă.
      const current = existing.array as Float32Array;
      const previousTarget = geometry.getAttribute("target") as THREE.BufferAttribute;
      const previous = previousTarget.array as Float32Array;
      const morph = stateRef.current.morph;
      for (let i = 0; i < current.length; i++) current[i] = current[i] + (previous[i] - current[i]) * morph;
      existing.needsUpdate = true;
      previousTarget.copyArray(targets);
      previousTarget.needsUpdate = true;
      stateRef.current.morph = 0;
      material.uniforms.uMorph.value = 0;
    }
    geometry.computeBoundingSphere();
  }, [config.formation, config.text, count]);

  // Uniformele care se pot schimba din panou fără reconstrucție.
  useEffect(() => {
    const material = stateRef.current.material;
    if (!material) return;
    material.uniforms.uSize.value = config.size;
    material.uniforms.uTurb.value = config.turbulence;
    material.uniforms.uSpeed.value = config.speed;
    material.uniforms.uGlow.value = config.glow;
    material.uniforms.uStyle.value = config.style === "points" ? 0 : config.style === "sparks" ? 1 : 2;
    (material.uniforms.uColorA.value as THREE.Color).set(config.colorA);
    (material.uniforms.uColorB.value as THREE.Color).set(config.colorB);
  }, [config.size, config.turbulence, config.speed, config.glow, config.style, config.colorA, config.colorB]);

  // Bucla de randare: oprită când demo-ul nu e vizibil sau tabul e ascuns.
  useEffect(() => {
    if (tier === "none") return;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const state = stateRef.current;
      const { renderer, scene, camera, material, points } = state;
      if (!renderer || !scene || !camera || !material || !points) return;
      if (!active || document.visibilityState !== "visible") return;

      const cfg = cfgRef.current;
      state.morph = Math.min(1, state.morph + 0.02 * cfg.speed);
      material.uniforms.uMorph.value = 1 - state.morph;
      material.uniforms.uTime.value = (now - start) / 1000;
      material.uniforms.uAttract.value = cfg.attraction;

      state.rotY += state.velY + (cfg.autoRotate ? 0.0015 : 0);
      state.rotX = THREE.MathUtils.clamp(state.rotX + state.velX, -1.2, 1.2);
      state.velX *= 0.92;
      state.velY *= 0.94;
      points.rotation.set(state.rotX, state.rotY, 0);
      camera.position.z += (state.zoom - camera.position.z) * 0.08;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, tier]);

  const setImage = useCallback(async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const maxSide = 240;
    const scale = Math.min(maxSide / bitmap.width, maxSide / bitmap.height, 1);
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    stateRef.current.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (!setImageRef) return;
    setImageRef.current = setImage;
    return () => {
      setImageRef.current = null;
    };
  }, [setImage, setImageRef]);

  if (tier === "none") {
    return (
      <div className={`grid place-items-center bg-[radial-gradient(60%_60%_at_50%_40%,hsl(264_70%_30%/.5),transparent_70%)] ${className}`}>
        <p className="max-w-[26ch] px-4 text-center text-xs text-white/55">
          {reducedMotion()
            ? "Ai cerut mai puțină mișcare, așa că laboratorul rămâne oprit."
            : "Dispozitivul nu are WebGL2 disponibil — laboratorul rămâne oprit, restul paginii funcționează normal."}
        </p>
      </div>
    );
  }

  return <div ref={hostRef} className={className} />;
}
