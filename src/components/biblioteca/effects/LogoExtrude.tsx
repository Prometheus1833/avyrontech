import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import { dprFor, type QualityTier } from "@/lib/stage/capability";
import type { StageEffectProps } from "@/components/biblioteca/StageSlot";
import StudioEnv from "@/components/biblioteca/effects/StudioEnv";
import { useLang } from "@/i18n/LanguageContext";

type Finish = "metal" | "sticla" | "mat";

const COPY = {
  ro: { finishes: { metal: "metal", sticla: "sticlă", mat: "mat" }, hint: "Trage ca să rotești marca." },
  en: { finishes: { metal: "metal", sticla: "glass", mat: "matte" }, hint: "Drag to rotate the mark." },
};

/** Marca desenată ca formă vectorială, apoi extrudată — același drum ca la un SVG de client. */
function markShapes(): THREE.Shape[] {
  const outer = new THREE.Shape();
  outer.moveTo(-1.35, -1.2);
  outer.lineTo(-0.35, 1.3);
  outer.lineTo(0.35, 1.3);
  outer.lineTo(1.35, -1.2);
  outer.lineTo(0.72, -1.2);
  outer.lineTo(0.44, -0.42);
  outer.lineTo(-0.44, -0.42);
  outer.lineTo(-0.72, -1.2);
  outer.closePath();

  const bar = new THREE.Path();
  bar.moveTo(-0.24, 0.12);
  bar.lineTo(0.24, 0.12);
  bar.lineTo(0.06, -0.34);
  bar.lineTo(-0.06, -0.34);
  bar.closePath();
  outer.holes.push(bar);

  const ring = new THREE.Shape();
  ring.absarc(0, 0, 1.92, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, 1.74, 0, Math.PI * 2, true);
  ring.holes.push(inner);

  return [outer, ring];
}

function Mark({
  finish,
  spin,
  tier,
}: {
  finish: Finish;
  spin: { current: number; velocity: number };
  tier: QualityTier;
}) {
  const group = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const shapes = markShapes();
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.045,
      bevelSegments: tier === "usor" ? 1 : 4,
      curveSegments: tier === "usor" ? 8 : 24,
    });
    geo.center();
    return geo;
  }, [tier]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    spin.velocity *= Math.exp(-2.8 * delta);
    spin.current += spin.velocity * delta;
    if (!group.current) return;
    // Legănare, nu rotire completă: o marcă privită din profil nu mai e o marcă.
    const idle = Math.sin(state.clock.elapsedTime * 0.45) * 0.52;
    group.current.rotation.y = spin.current + idle;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
  });

  const glass = finish === "sticla" && tier !== "usor";

  return (
    <group ref={group}>
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial
          color={finish === "metal" ? "#e6a94f" : finish === "sticla" ? "#bcd8ff" : "#d8dce4"}
          metalness={finish === "metal" ? 1 : 0.05}
          roughness={finish === "mat" ? 0.82 : glass ? 0.06 : 0.22}
          transmission={glass ? 1 : 0}
          thickness={glass ? 0.8 : 0}
          ior={1.5}
          transparent={finish === "sticla" && tier === "usor"}
          opacity={finish === "sticla" && tier === "usor" ? 0.55 : 1}
          clearcoat={finish === "metal" ? 0.6 : 0}
        />
      </mesh>
    </group>
  );
}

/**
 * LGO-S1 — morph SVG → 3D extrudat.
 *
 * Aceeași formă vectorială cu care lucrăm în identitate, ridicată din plan cu
 * bevel și randată în trei materiale. E cel mai direct mod de a arăta unui
 * client că marca lui rezistă și dincolo de hârtie.
 */
export default function LogoExtrude({ tier, active, onReady }: StageEffectProps) {
  const { lang } = useLang();
  const t = COPY[lang];
  const [finish, setFinish] = useState<Finish>("metal");
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
          spin.velocity = (event.clientX - lastX.current) * 0.14;
          lastX.current = event.clientX;
        }}
      >
        <Canvas
          dpr={dprFor(tier)}
          frameloop={active ? "always" : "never"}
          gl={{ antialias: tier !== "usor", powerPreference: "high-performance" }}
          camera={{ position: [0, 0.3, 8.6], fov: 40 }}
          onCreated={() => onReady?.()}
        >
          <color attach="background" args={["#080a10"]} />
          <StudioEnv intensity={1.1} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[5, 6, 5]} intensity={2} color="#fff1da" />
          <directionalLight position={[-6, 1, -4]} intensity={0.9} color="#7fb2ff" />
          <Mark finish={finish} spin={spin} tier={tier} />
          <ContactShadows position={[0, -2.4, 0]} opacity={0.5} scale={12} blur={2.6} far={5} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <div className="pointer-events-auto flex gap-1.5 rounded-full border border-white/12 bg-[#0a0c12]/85 p-1.5 backdrop-blur">
          {(["metal", "sticla", "mat"] as Finish[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFinish(option)}
              aria-pressed={finish === option}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                finish === option ? "bg-white text-black" : "text-white/55 hover:text-white"
              }`}
            >
              {t.finishes[option]}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">{t.hint}</p>
      </div>
    </div>
  );
}
