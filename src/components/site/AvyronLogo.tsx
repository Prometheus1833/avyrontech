import { useId } from "react";

/**
 * The single source of truth for the Avyron logo.
 *
 * The mark is a faceted "A" monogram lit from the upper right, so the two limbs
 * read as separate planes with an extruded side wall behind them. An elliptical
 * orbit carries a shaded sphere around it — the one moving part.
 *
 * Motion is CSS-only and limited to transform/opacity so it stays on the
 * compositor; `prefers-reduced-motion` parks the sphere and stills everything.
 * Colors come from the theme tokens, so the mark follows light/dark.
 */

/** The orbit ellipse. Shared by the visible stroke and the sphere's offset-path. */
export const AVYRON_ORBIT_PATH =
  "M 57.84 18.83 A 29 12 -27 1 0 6.16 45.17 A 29 12 -27 1 0 57.84 18.83";

type AvyronLogoProps = {
  /** Rendered size of the mark in pixels. The wordmark scales alongside it. */
  size?: number;
  /** Show the "Innovate. Develop. Elevate." lockup under the wordmark. */
  showTagline?: boolean;
  /** Hide the wordmark and render the mark on its own. */
  markOnly?: boolean;
  /**
   * Which ink the shadowed facet, wordmark and tagline use.
   * "auto" follows the theme; "onDark" is for surfaces that stay dark in both
   * themes, such as the footer. The brand gradient, orbit and sphere are
   * identical either way.
   */
  tone?: "auto" | "onDark";
  className?: string;
};

export default function AvyronLogo({
  size = 28,
  showTagline = false,
  markOnly = false,
  tone = "auto",
  className = "",
}: AvyronLogoProps) {
  // Two of these can share a page (nav + footer); scope the gradient ids so the
  // second instance doesn't inherit the first one's paint servers.
  const uid = useId().replace(/:/g, "");
  const faceLight = `avy-face-light-${uid}`;
  const faceDark = `avy-face-dark-${uid}`;
  const orbitStroke = `avy-orbit-${uid}`;
  const sphere = `avy-sphere-${uid}`;
  const sweep = `avy-sweep-${uid}`;
  const sweepMask = `avy-sweep-mask-${uid}`;

  return (
    <span
      className={`avyron-logo inline-flex items-center gap-2 ${
        tone === "onDark" ? "avyron-logo--on-dark" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        role="img"
        aria-label="Avyron"
        className="avyron-logo__mark shrink-0 overflow-visible"
        style={{ width: size, height: size }}
      >
        <defs>
          {/* Lit face — brand violet into cyan, the same ramp as --gradient-brand. */}
          <linearGradient id={faceLight} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-glow))" />
            <stop offset="55%" stopColor="hsl(var(--brand))" />
            <stop offset="100%" stopColor="hsl(var(--brand-2))" />
          </linearGradient>

          {/* Shadowed face — foreground-tinted so it inverts with the theme. */}
          <linearGradient id={faceDark} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="hsl(var(--avy-ink))" stopOpacity="0.92" />
            <stop offset="100%" stopColor="hsl(var(--avy-ink))" stopOpacity="0.62" />
          </linearGradient>

          <linearGradient id={orbitStroke} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-2))" stopOpacity="0.15" />
            <stop offset="40%" stopColor="hsl(var(--brand))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--brand-3))" stopOpacity="0.25" />
          </linearGradient>

          {/* Off-centre highlight turns the flat disc into a shaded sphere. */}
          <radialGradient id={sphere} cx="0.34" cy="0.3" r="0.78">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="hsl(var(--brand-glow))" />
            <stop offset="72%" stopColor="hsl(var(--brand))" />
            <stop offset="100%" stopColor="hsl(264 70% 32%)" />
          </radialGradient>

          {/* Specular band that travels across the limbs. */}
          <linearGradient id={sweep} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <clipPath id={sweepMask}>
            <path d="M32 7 L5 57 L17.5 57 L32 30 Z M32 7 L59 57 L46.5 57 L32 30 Z" />
          </clipPath>
        </defs>

        {/* Orbit behind the mark. */}
        <path
          d={AVYRON_ORBIT_PATH}
          fill="none"
          stroke={`url(#${orbitStroke})`}
          strokeWidth="2"
          strokeLinecap="round"
          className="avyron-logo__orbit"
        />

        {/* Extruded side wall — the same silhouette pushed down-right. */}
        <g transform="translate(2.2 2.4)" opacity="0.34">
          <path d="M32 7 L5 57 L17.5 57 L32 30 Z" fill="hsl(264 60% 18%)" />
          <path d="M32 7 L59 57 L46.5 57 L32 30 Z" fill="hsl(264 60% 18%)" />
        </g>

        {/* Front faces. */}
        <path d="M32 7 L5 57 L17.5 57 L32 30 Z" fill={`url(#${faceDark})`} />
        <path d="M32 7 L59 57 L46.5 57 L32 30 Z" fill={`url(#${faceLight})`} />

        {/* Bevel along the apex ridge, where the two planes meet. */}
        <path
          d="M32 7 L32 30"
          stroke="hsl(var(--brand-glow))"
          strokeWidth="0.9"
          strokeOpacity="0.55"
          strokeLinecap="round"
        />

        {/* Travelling specular highlight, clipped to the limbs. */}
        <g clipPath={`url(#${sweepMask})`}>
          <rect
            className="avyron-logo__sweep"
            x="-30"
            y="0"
            width="26"
            height="64"
            fill={`url(#${sweep})`}
          />
        </g>

        {/* Orbiting sphere: glow halo behind a shaded body. */}
        <g className="avyron-logo__electron">
          <circle r="7" fill="hsl(var(--brand-glow))" opacity="0.2" />
          <circle r="4" fill={`url(#${sphere})`} />
        </g>
      </svg>

      {!markOnly && (
        <span className="min-w-0 leading-none">
          <span
            className="avyron-logo__wordmark block font-display font-extrabold uppercase leading-none"
            style={{ fontSize: size * 0.62, letterSpacing: "0.16em" }}
          >
            Avyron
          </span>
          {showTagline && (
            <span
              className="avyron-logo__tagline mt-1 block font-display uppercase leading-tight"
              style={{ fontSize: Math.max(8, size * 0.26), letterSpacing: "0.22em" }}
            >
              Innovate. <span className="text-brand">Develop.</span> Elevate.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
