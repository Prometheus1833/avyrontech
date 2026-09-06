import { useId } from "react";

/**
 * The single source of truth for the Avyron logo.
 *
 * The mark is a faceted "A" monogram lit from the upper right, so the two limbs
 * read as separate planes with an extruded side wall behind them. Around it sit
 * two things: an elliptical orbit carrying a shaded sphere — the one moving
 * part — and a broken containment ring holding four discipline glyphs (web,
 * mobile, code, launch).
 *
 * The ring and its glyphs only render above `RING_MIN_SIZE`. At nav size four
 * 3px glyphs collapse into noise, so small instances show the mark alone; the
 * silhouette, colours and wordmark stay identical at every size.
 *
 * Motion is CSS-only and limited to transform/opacity so it stays on the
 * compositor; `prefers-reduced-motion` parks the sphere and stills everything.
 * Colors come from the theme tokens, so the mark follows light/dark.
 */

/** The orbit ellipse. Shared by the visible stroke and the sphere's offset-path. */
export const AVYRON_ORBIT_PATH =
  "M 57.84 18.83 A 29 12 -27 1 0 6.16 45.17 A 29 12 -27 1 0 57.84 18.83";

/** Below this rendered size the containment ring and its glyphs are dropped. */
const RING_MIN_SIZE = 44;

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
  /**
   * Force the containment ring on or off. Defaults to size-driven: on at
   * {@link RING_MIN_SIZE} and above, off below it.
   */
  ring?: boolean;
  className?: string;
};

export default function AvyronLogo({
  size = 28,
  showTagline = false,
  markOnly = false,
  tone = "auto",
  ring,
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

  const showRing = ring ?? size >= RING_MIN_SIZE;

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

          {/* Shadowed face — ink-tinted so it inverts with the theme. */}
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

        {showRing && (
          <g className="avyron-logo__ring" stroke="hsl(var(--brand))" fill="none">
            {/* Containment ring: four arcs on r=28, broken on the diagonals
                where the four discipline glyphs sit. */}
            <g strokeWidth="1.1" strokeOpacity="0.5" strokeLinecap="round">
              <path d="M 19.3 7.05 A 28 28 0 0 1 44.7 7.05" />
              <path d="M 56.95 19.3 A 28 28 0 0 1 56.95 44.7" />
              <path d="M 44.7 56.95 A 28 28 0 0 1 19.3 56.95" />
              <path d="M 7.05 44.7 A 28 28 0 0 1 7.05 19.3" />
            </g>

            <g strokeWidth="1.6" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round">
              {/* Web */}
              <g transform="translate(12.2 12.2) scale(0.58)">
                <circle cx="0" cy="0" r="5.4" />
                <path d="M-5.4 0 H5.4 M0 -5.4 C2.9 -2.4 2.9 2.4 0 5.4 C-2.9 2.4 -2.9 -2.4 0 -5.4" />
              </g>
              {/* Mobile */}
              <g transform="translate(51.8 12.2) scale(0.58)">
                <rect x="-3.6" y="-5.6" width="7.2" height="11.2" rx="1.6" />
                <path d="M-1.1 3.6 H1.1" />
              </g>
              {/* Code */}
              <g transform="translate(12.2 51.8) scale(0.58)">
                <path d="M-1.8 -4.6 L-6 0 L-1.8 4.6 M1.8 -4.6 L6 0 L1.8 4.6" />
              </g>
              {/* Launch */}
              <g transform="translate(51.8 51.8) scale(0.58)">
                <path d="M-1.5 3.2 C-5.6 -0.6 -4.3 -5.2 0 -6.6 C4.3 -5.2 5.6 -0.6 1.5 3.2 Z" />
                <path d="M-1.5 3.2 L-3.6 5.8 M1.5 3.2 L3.6 5.8" />
              </g>
            </g>
          </g>
        )}

        {/* When the ring is on, the monogram shrinks to sit inside it. */}
        <g transform={showRing ? "translate(32 32) scale(0.66) translate(-32 -32)" : undefined}>
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
        </g>
      </svg>

      {!markOnly && (
        <span className="min-w-0 leading-none">
          <span
            className="avyron-logo__wordmark block font-bold uppercase leading-none"
            style={{
              // The serif wordmark the nav has always used — kept verbatim.
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: size * 0.68,
              letterSpacing: "0.18em",
            }}
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
