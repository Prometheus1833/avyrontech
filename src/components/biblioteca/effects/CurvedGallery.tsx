import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { dprFor, type QualityTier } from "@/lib/stage/capability";
import type { StageEffectProps } from "@/components/biblioteca/StageSlot";
import { useLang } from "@/i18n/LanguageContext";

const ITEMS = [
  { name: "Lampă Nord", price: "349 lei", hue: 34 },
  { name: "Scaun Fold", price: "890 lei", hue: 200 },
  { name: "Vază Lut", price: "129 lei", hue: 12 },
  { name: "Aplică Arc", price: "259 lei", hue: 265 },
  { name: "Masă Pin", price: "1 240 lei", hue: 150 },
  { name: "Ramă Mat", price: "99 lei", hue: 320 },
  { name: "Bandă LED", price: "179 lei", hue: 48 },
  { name: "Raft Cub", price: "540 lei", hue: 180 },
  { name: "Covor Ic", price: "690 lei", hue: 20 },
  { name: "Oglindă Ov", price: "420 lei", hue: 220 },
  { name: "Pled Lână", price: "230 lei", hue: 340 },
  { name: "Ceas Mira", price: "310 lei", hue: 90 },
];

function cardTexture(item: (typeof ITEMS)[number]): THREE.CanvasTexture {
  const w = 384;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, h, w, 0);
  gradient.addColorStop(0, `hsl(${item.hue} 45% 9%)`);
  gradient.addColorStop(1, `hsl(${item.hue} 60% 26%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(28, 40, w - 56, h * 0.52);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = '700 30px "Inter", system-ui, sans-serif';
  ctx.fillText(item.name, 28, h * 0.72);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = '500 24px "Inter", system-ui, sans-serif';
  ctx.fillText(item.price, 28, h * 0.78);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function Ring({ offset, tier }: { offset: { value: number; velocity: number }; tier: QualityTier }) {
  const group = useRef<THREE.Group>(null);
  const textures = useMemo(() => ITEMS.map(cardTexture), []);
  const radius = 7.5;
  const step = (Math.PI * 2) / ITEMS.length;

  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);

  useFrame((_, delta) => {
    offset.velocity *= Math.exp(-2.6 * delta);
    offset.value += offset.velocity * delta + delta * 0.06;
    if (group.current) group.current.rotation.y = offset.value;
  });

  return (
    <group ref={group}>
      {ITEMS.map((item, index) => {
        const angle = index * step;
        return (
          <mesh
            key={item.name}
            position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
            rotation={[0, angle, 0]}
          >
            <planeGeometry args={[2.5, 3.3, tier === "usor" ? 1 : 8, 1]} />
            <meshBasicMaterial map={textures[index]} side={THREE.FrontSide} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * SHP-S4 — galerie infinită curbată.
 *
 * Produsele stau pe un inel, nu într-o listă: te învârți prin ele cu degetul
 * sau cu rotița și nu ajungi niciodată la capăt. Pentru cataloage mari, asta
 * schimbă percepția — pare o vitrină, nu o pagină 7 din 42.
 */
export default function CurvedGallery({ tier, active, onReady }: StageEffectProps) {
  const { lang } = useLang();
  const offset = useRef({ value: 0, velocity: 0 }).current;
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const stop = () => (dragging.current = false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  return (
    <div
      className="relative h-full w-full cursor-grab active:cursor-grabbing"
      onPointerDown={(event) => {
        dragging.current = true;
        lastX.current = event.clientX;
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        offset.velocity = (event.clientX - lastX.current) * 0.06;
        lastX.current = event.clientX;
      }}
      onWheel={(event) => {
        offset.velocity += event.deltaY * 0.0025;
      }}
    >
      <Canvas
        dpr={dprFor(tier)}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: tier !== "usor", powerPreference: "high-performance" }}
        camera={{ position: [0, 0.3, 11.6], fov: 42 }}
        onCreated={() => onReady?.()}
      >
        <color attach="background" args={["#080a10"]} />
        <fogExp2 attach="fog" args={["#080a10", 0.055]} />
        <Ring offset={offset} tier={tier} />
      </Canvas>

      <p className="pointer-events-none absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-wider text-white/35">
        {lang === "ro" ? "trage sau derulează" : "drag or scroll"}
      </p>
    </div>
  );
}
