import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import fragmentShader from "@/shaders/backdrop.frag";
import vertexShader from "@/shaders/backdrop.vert";
import { stageScroll } from "@/lib/stage/scrollState";
import type { QualityTier } from "@/lib/stage/capability";

function qualityFor(tier: QualityTier): number {
  if (tier === "ultra") return 1;
  if (tier === "standard") return 0.6;
  return 0;
}

/** Fundalul e o imagine moale: îl randăm sub rezoluția ecranului, fără pierdere vizibilă. */
function dprForBackdrop(tier: QualityTier): number {
  if (tier === "ultra") return 1.25;
  if (tier === "standard") return 1;
  return 0.7;
}

function Field({ tier }: { tier: QualityTier }) {
  const { viewport, size } = useThree();

  const uniforms = useMemo(
    () => ({
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uHue: { value: stageScroll.hue },
      uProgress: { value: 0 },
      uWarp: { value: 0 },
      uQuality: { value: qualityFor(tier) },
    }),
    [tier],
  );

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size.width, size.height, uniforms]);

  useFrame((_, delta) => {
    const step = 1 - Math.exp(-2.2 * delta);

    // Schimbarea de secțiune e progresivă, nu o tăietură.
    stageScroll.hue += (stageScroll.targetHue - stageScroll.hue) * step;
    stageScroll.warp *= Math.exp(-2.6 * delta);

    uniforms.uTime.value += delta;
    uniforms.uHue.value = stageScroll.hue;
    uniforms.uProgress.value = stageScroll.progress;
    uniforms.uWarp.value = stageScroll.warp;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}

/**
 * Fundalul 3D persistent al paginii.
 *
 * Un singur context WebGL pentru toată Biblioteca. Nu montăm o scenă per
 * secțiune — schimbăm nuanța și trimitem un impuls de refracție la fiecare
 * trecere, ceea ce dă continuitate spațială: pagina pare un singur spațiu, nu
 * opt camere separate.
 */
export default function Backdrop({ tier, onReady }: { tier: QualityTier; onReady?: () => void }) {
  const notified = useRef(false);

  return (
    <Canvas
      dpr={dprForBackdrop(tier)}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 2.2], fov: 45 }}
      onCreated={() => {
        if (notified.current) return;
        notified.current = true;
        onReady?.();
      }}
    >
      <Field tier={tier} />
    </Canvas>
  );
}
