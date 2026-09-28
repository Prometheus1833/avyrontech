import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * LiquidGlass — Avyron Products (avyron.ro/produse)
 * Refracție reală prin filtru SVG de displacement (Chromium), cu fallback
 * automat pe sticlă mată (backdrop-filter) în celelalte browsere.
 */

type Props = {
  children: ReactNode;
  blur?: number;
  refraction?: number;
  radius?: number;
  style?: CSSProperties;
};

const supportsSvgBackdrop = () =>
  typeof navigator !== "undefined" && /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent);

export function LiquidGlass({ children, blur = 14, refraction = 40, radius = 28, style }: Props) {
  const id = useId().replace(/:/g, "");
  const filterId = `lg-${id}`;
  const useSvg = supportsSvgBackdrop() && refraction > 0;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: radius,
        isolation: "isolate",
        overflow: "hidden",
        boxShadow: "0 20px 60px -20px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(255,255,255,.08)",
        ...style,
      }}
    >
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id={filterId} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale={refraction} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          backdropFilter: useSvg ? `url(#${filterId}) blur(${blur}px) saturate(160%)` : `blur(${blur}px) saturate(160%)`,
          WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
          background: "linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.04))",
        }}
      />
      {/* Muchia luminoasă: un gradient pe 1px care imită lumina prinsă în sticlă. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          padding: 1,
          background: "linear-gradient(140deg, rgba(255,255,255,.7), rgba(255,255,255,.05) 40%, rgba(255,255,255,.3))",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export default LiquidGlass;
