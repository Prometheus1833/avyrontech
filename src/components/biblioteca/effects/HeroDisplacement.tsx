import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import fragmentShader from "@/shaders/heroDisplacement.frag";
import vertexShader from "@/shaders/heroDisplacement.vert";
import { dprFor, intensityFor, type QualityTier } from "@/lib/stage/capability";
import type { StageEffectProps } from "@/components/biblioteca/StageSlot";
import heroImage from "@/assets/avyron-brand-bg.jpg";

const PremiumPostFx = lazy(() => import("@/components/biblioteca/effects/PremiumPostFx"));

type PlaneProps = {
  tier: QualityTier;
  hovered: boolean;
  onReady?: () => void;
};

function DisplacedPlane({ tier, hovered, onReady }: PlaneProps) {
  // Încărcătorul din R3F, nu ajutorul din biblioteca de utilitare: același
  // rezultat, o dependință mai puțin în chunk-ul 3D.
  const texture = useLoader(THREE.TextureLoader, heroImage);
  const { viewport, size } = useThree();
  const smoothPointer = useRef(new THREE.Vector2(0, 0));

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uPlaneSize: { value: new THREE.Vector2(1, 1) },
      uImageSize: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uIntensity: { value: intensityFor(tier) },
    }),
    [texture, tier],
  );

  useEffect(() => {
    // Fără conversie de spațiu de culoare: shaderul scrie exact valorile din
    // imagine, deci schimbul poster -> efect nu se vede ca o săritură de ton.
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    const image = texture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image?.height) {
      uniforms.uImageSize.value.set(image.width, image.height);
    }
    onReady?.();
  }, [texture, uniforms, onReady]);

  useEffect(() => {
    uniforms.uPlaneSize.value.set(size.width, size.height);
  }, [size.width, size.height, uniforms]);

  useFrame((state, delta) => {
    // Amortizare independentă de rata de cadre: același răspuns la 30 și la 120 fps.
    const step = 1 - Math.exp(-7 * delta);
    const pointer = state.pointer ?? state.mouse;
    smoothPointer.current.lerp(pointer, step);

    uniforms.uPointer.value.copy(smoothPointer.current);
    uniforms.uTime.value += delta;
    uniforms.uHover.value += ((hovered ? 1 : 0) - uniforms.uHover.value) * step;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/**
 * PRZ-S2 — hero cu displacement.
 *
 * Efectul-pilot al Bibliotecii: verifică pe dispozitive reale tot lanțul —
 * chunk 3D asincron, treaptă de calitate, oprirea buclei la ieșirea din ecran
 * și schimbul fără salt între posterul static și randarea WebGL.
 */
export default function HeroDisplacement({ tier, active, onReady }: StageEffectProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Canvas
      dpr={dprFor(tier)}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 2.2], fov: 45 }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Suspense fallback={null}>
        <DisplacedPlane tier={tier} hovered={hovered} onReady={onReady} />
        {tier === "ultra" && <PremiumPostFx />}
      </Suspense>
    </Canvas>
  );
}
