import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { dprFor, type QualityTier } from "@/lib/stage/capability";
import type { StageEffectProps } from "@/components/biblioteca/StageSlot";

type Progress = { current: number };

function softSprite(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.45, "rgba(190,200,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function windowTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, w, h);
  for (let y = 8; y < h - 8; y += 16) {
    for (let x = 8; x < w - 8; x += 18) {
      if (Math.random() > 0.42) {
        ctx.fillStyle = `rgba(255, ${180 + Math.random() * 60}, ${120 + Math.random() * 80}, ${0.35 + Math.random() * 0.5})`;
        ctx.fillRect(x, y, 9, 7);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

function Scene({ progress, tier }: { progress: Progress; tier: QualityTier }) {
  const { camera, scene } = useThree();
  const cityRef = useRef<THREE.InstancedMesh>(null);
  const cloudsRef = useRef<THREE.Group>(null);

  const light = tier === "usor";
  const cityCount = light ? 60 : 150;
  const cloudCount = light ? 7 : 14;
  const starCount = light ? 400 : 1100;

  const cloudTexture = useMemo(softSprite, []);
  const windows = useMemo(windowTexture, []);

  const stars = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 180 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 180 + Math.abs(radius * Math.cos(phi)) * 0.8;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return positions;
  }, [starCount]);

  const clouds = useMemo(
    () =>
      Array.from({ length: cloudCount }, () => ({
        position: [
          (Math.random() - 0.5) * 190,
          46 + Math.random() * 52,
          (Math.random() - 0.5) * 190,
        ] as [number, number, number],
        scale: 70 + Math.random() * 110,
        rotation: Math.random() * Math.PI,
      })),
    [cloudCount],
  );

  // Orașul: o singură geometrie instanțiată, nu o sută de mesh-uri.
  useEffect(() => {
    const mesh = cityRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < cityCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 22 + Math.random() * 88;
      const height = 6 + Math.random() * 38;
      dummy.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      dummy.scale.set(4 + Math.random() * 7, height, 4 + Math.random() * 7);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [cityCount]);

  useEffect(() => {
    scene.fog = new THREE.FogExp2("#05070d", 0.0068);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    // Patru acte pe un singur traseu: orbită, nori, oraș, clădire.
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const eased = p * p * (3 - 2 * p);

    camera.position.y = THREE.MathUtils.lerp(132, 11, eased);
    camera.position.z = THREE.MathUtils.lerp(16, 42, eased);
    camera.position.x = Math.sin(state.clock.elapsedTime * 0.12) * (3 + eased * 7);

    target.set(0, THREE.MathUtils.lerp(52, 26, eased), 0);
    camera.lookAt(target);

    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.012;
  });

  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[40, 90, 30]} intensity={1.1} color="#ffd9a8" />
      <directionalLight position={[-50, 30, -40]} intensity={0.5} color="#7aa2ff" />

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={1.1} color="#cfd8ff" sizeAttenuation transparent opacity={0.85} />
      </points>

      <group ref={cloudsRef}>
        {clouds.map((cloud, index) => (
          <mesh key={index} position={cloud.position} rotation={[-Math.PI / 2, 0, cloud.rotation]}>
            <planeGeometry args={[cloud.scale, cloud.scale]} />
            <meshBasicMaterial
              map={cloudTexture}
              transparent
              depthWrite={false}
              opacity={0.5}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[260, 48]} />
        <meshStandardMaterial color="#080a11" roughness={1} metalness={0} />
      </mesh>

      <instancedMesh ref={cityRef} args={[undefined, undefined, cityCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#11151f" roughness={0.85} metalness={0.1} />
      </instancedMesh>

      {/* Clădirea-țintă: capătul coborârii. */}
      <mesh position={[0, 31, 0]}>
        <boxGeometry args={[13, 62, 13]} />
        <meshStandardMaterial
          color="#0d1119"
          map={windows}
          emissiveMap={windows}
          emissive="#ffb257"
          emissiveIntensity={1.8}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0, 63.5, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 6, 8]} />
        <meshStandardMaterial color="#e0a24a" emissive="#e0a24a" emissiveIntensity={2} />
      </mesh>
    </>
  );
}

/**
 * PRZ-S1 — coborâre cinematică.
 *
 * Un singur traseu de cameră, condus de poziția secțiunii în ecran: orbită →
 * nori → oraș → clădire. Nu sunt patru scene montate una după alta, ci patru
 * acte pe același drum — de aceea nu apare nicio tăietură.
 */
export default function CinematicDescent({ tier, active, onReady }: StageEffectProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let frame = 0;
    const update = () => {
      const rect = host.getBoundingClientRect();
      const total = window.innerHeight + rect.height;
      progress.current = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / total));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={hostRef} className="h-full w-full">
      <Canvas
        dpr={dprFor(tier)}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: tier === "ultra", powerPreference: "high-performance" }}
        camera={{ position: [0, 132, 16], fov: 55, near: 0.5, far: 900 }}
        onCreated={() => onReady?.()}
      >
        <Scene progress={progress} tier={tier} />
      </Canvas>
    </div>
  );
}
