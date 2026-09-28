import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { createStudioEnvironment } from "@/lib/stage/studioEnv";

/** Montează studioul generat în scenă și îl eliberează la demontare. */
export default function StudioEnv({ intensity = 1 }: { intensity?: number }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const environment = createStudioEnvironment(gl);
    scene.environment = environment;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
