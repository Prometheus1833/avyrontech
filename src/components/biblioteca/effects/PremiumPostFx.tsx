import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/** Post-procesare rezervată treptei ultra; este un chunk separat și lazy. */
export default function PremiumPostFx() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.18} luminanceThreshold={0.78} mipmapBlur />
      <Vignette eskil={false} offset={0.16} darkness={0.62} />
    </EffectComposer>
  );
}
