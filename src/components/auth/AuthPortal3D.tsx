import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

function PortalGeometry() {
  const orbit = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);
  const invalidate = useThree((state) => state.invalidate);
  const positions = useMemo(() => {
    const values = new Float32Array(54 * 3);
    for (let i = 0; i < 54; i += 1) {
      const angle = i * 2.39996;
      const radius = 3.75 + (i % 5) * 0.17;
      values[i * 3] = Math.cos(angle) * radius;
      values[i * 3 + 1] = Math.sin(angle) * radius;
      values[i * 3 + 2] = (i % 7) * 0.08 - 0.25;
    }
    return values;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) invalidate();
    }, 34);
    return () => window.clearInterval(timer);
  }, [invalidate]);

  useFrame((_, delta) => {
    if (orbit.current) orbit.current.rotation.z += Math.min(delta, 0.04) * 0.025;
    if (particles.current) particles.current.rotation.z -= Math.min(delta, 0.04) * 0.012;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <group ref={orbit} rotation={[0.17, -0.25, 0]}>
        <mesh>
          <torusGeometry args={[3.49, 0.025, 8, 140]} />
          <meshBasicMaterial color="#48dffe" toneMapped={false} />
        </mesh>
        <mesh rotation={[0.28, -0.38, 0]}>
          <torusGeometry args={[3.61, 0.008, 6, 140]} />
          <meshBasicMaterial color="#745dff" transparent opacity={0.8} toneMapped={false} />
        </mesh>
        <mesh rotation={[-0.3, 0.22, 0]}>
          <torusGeometry args={[3.74, 0.005, 6, 140]} />
          <meshBasicMaterial color="#e476f5" transparent opacity={0.48} toneMapped={false} />
        </mesh>
      </group>
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#8cdbff" size={0.024} transparent opacity={0.7} sizeAttenuation />
      </points>
    </>
  );
}

export default function AuthPortal3D() {
  return (
    <div className="auth-webgl" aria-hidden="true">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 9], zoom: 92 }}
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => gl.setClearColor("#000000", 0)}
      >
        <PortalGeometry />
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.28} intensity={0.55} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
