import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import { dprFor, type QualityTier } from "@/lib/stage/capability";
import type { StageEffectProps } from "@/components/biblioteca/StageSlot";
import StudioEnv from "@/components/biblioteca/effects/StudioEnv";
import { useLang } from "@/i18n/LanguageContext";

type Finish = "metal" | "mat" | "sticla";

const COLORS = ["#e0a24a", "#c9ccd4", "#2f9e8f", "#b8452f", "#1b1e27"];

const COPY = {
  ro: {
    finish: "Finisaj",
    color: "Culoare",
    engrave: "Gravură",
    finishes: { metal: "metal", mat: "mat", sticla: "sticlă" },
    hint: "Trage ca să rotești.",
  },
  en: {
    finish: "Finish",
    color: "Color",
    engrave: "Engraving",
    finishes: { metal: "metal", mat: "matte", sticla: "glass" },
    hint: "Drag to rotate.",
  },
};

function engravingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#3a3a3a";
  ctx.font = '700 46px "Inter", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "10px";
  ctx.fillText("AVYRON", 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

function Lamp({
  finish,
  color,
  engraved,
  spin,
  tier,
}: {
  finish: Finish;
  color: string;
  engraved: boolean;
  spin: { current: number; velocity: number };
  tier: QualityTier;
}) {
  const group = useRef<THREE.Group>(null);
  const engraving = useMemo(engravingTexture, []);

  // Sticla adevărată (transmission) e scumpă: pe treapta ușoară o aproximăm.
  const material = useMemo(() => {
    if (finish === "metal") return { metalness: 1, roughness: 0.18, transmission: 0, opacity: 1 };
    if (finish === "mat") return { metalness: 0, roughness: 0.85, transmission: 0, opacity: 1 };
    if (tier === "usor") return { metalness: 0.1, roughness: 0.1, transmission: 0, opacity: 0.45 };
    return { metalness: 0, roughness: 0.05, transmission: 1, opacity: 1 };
  }, [finish, tier]);

  useFrame((_, delta) => {
    if (!group.current) return;
    spin.velocity *= Math.exp(-3 * delta);
    spin.current += spin.velocity * delta + delta * 0.18;
    group.current.rotation.y = spin.current;
  });

  const body = (
    <meshPhysicalMaterial
      color={color}
      metalness={material.metalness}
      roughness={material.roughness}
      transmission={material.transmission}
      thickness={material.transmission ? 0.6 : 0}
      ior={1.45}
      transparent={material.opacity < 1}
      opacity={material.opacity}
      map={engraved ? engraving : undefined}
    />
  );

  return (
    <group ref={group} position={[0, -0.9, 0]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.78, 0.92, 0.24, 48]} />
        {body}
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.8, 20]} />
        <meshPhysicalMaterial color={color} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <coneGeometry args={[0.95, 0.95, 44, 1, true]} />
        <meshPhysicalMaterial
          color={color}
          metalness={material.metalness}
          roughness={material.roughness}
          transmission={material.transmission}
          thickness={material.transmission ? 0.4 : 0}
          side={THREE.DoubleSide}
          transparent={material.opacity < 1}
          opacity={material.opacity}
        />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color="#fff3d6" emissive="#ffcf8a" emissiveIntensity={2.4} />
      </mesh>
      <pointLight position={[0, 1.95, 0]} intensity={5} distance={6} color="#ffd9a0" />
    </group>
  );
}

/**
 * SHP-S1 — configurator 3D de produs.
 *
 * Materialul, culoarea și gravura sunt parametri, nu poze diferite. Într-un
 * magazin real asta înseamnă un singur model 3D în loc de câteva zeci de
 * fotografii de studio pentru fiecare variantă.
 */
export default function ProductConfigurator({ tier, active, onReady }: StageEffectProps) {
  const { lang } = useLang();
  const t = COPY[lang];
  const [finish, setFinish] = useState<Finish>("metal");
  const [color, setColor] = useState(COLORS[0]);
  const [engraved, setEngraved] = useState(false);
  const spin = useRef({ current: 0, velocity: 0 }).current;
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const stop = () => (dragging.current = false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          dragging.current = true;
          lastX.current = event.clientX;
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          spin.velocity = (event.clientX - lastX.current) * 0.12;
          lastX.current = event.clientX;
        }}
      >
        <Canvas
          dpr={dprFor(tier)}
          frameloop={active ? "always" : "never"}
          gl={{ antialias: tier !== "usor", powerPreference: "high-performance" }}
          camera={{ position: [0, 1.7, 8.2], fov: 40 }}
          onCreated={({ camera }) => {
            camera.lookAt(0, 0.55, 0);
            onReady?.();
          }}
        >
          <color attach="background" args={["#080a10"]} />
          <StudioEnv intensity={1} />
          <ambientLight intensity={0.3} />
          <directionalLight position={[4, 6, 4]} intensity={1.5} color="#fff0d8" />
          <directionalLight position={[-5, 2, -3]} intensity={0.7} color="#6f9bff" />
          <Lamp finish={finish} color={color} engraved={engraved} spin={spin} tier={tier} />
          <ContactShadows position={[0, -1.02, 0]} opacity={0.55} scale={9} blur={2.4} far={4} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto flex flex-wrap gap-4 rounded-xl border border-white/12 bg-[#0a0c12]/85 p-3 backdrop-blur">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{t.finish}</p>
            <div className="mt-1.5 flex gap-1.5">
              {(["metal", "mat", "sticla"] as Finish[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFinish(option)}
                  aria-pressed={finish === option}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    finish === option ? "border-white bg-white text-black" : "border-white/20 text-white/55"
                  }`}
                >
                  {t.finishes[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{t.color}</p>
            <div className="mt-1.5 flex gap-1.5">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  aria-label={option}
                  aria-pressed={color === option}
                  className={`size-5 rounded-full border-2 transition-transform ${
                    color === option ? "scale-110 border-white" : "border-white/20"
                  }`}
                  style={{ background: option }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEngraved((v) => !v)}
            aria-pressed={engraved}
            className={`self-end rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              engraved ? "border-amber-300 text-amber-300" : "border-white/20 text-white/55"
            }`}
          >
            {t.engrave}
          </button>
        </div>

        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/35">{t.hint}</p>
      </div>
    </div>
  );
}
