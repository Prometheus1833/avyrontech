type Props = {
  /** Nuanța secțiunii de deasupra. */
  from: string;
  /** Nuanța secțiunii de dedesubt. */
  to: string;
};

/**
 * Trecerea dintre două secțiuni: culoarea secțiunii de sus se stinge într-un
 * val fin care preia nuanța secțiunii următoare.
 */
const SectionBlend = ({ from, to }: Props) => (
  <div aria-hidden className="relative h-24 w-full overflow-hidden sm:h-32">
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(180deg, hsl(${from} / 0.10), hsl(${to} / 0.10))` }}
    />
    <svg className="absolute inset-x-0 bottom-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 120" fill="none">
      <defs>
        <linearGradient id={`blend-${from}-${to}`.replace(/[^a-z0-9-]/gi, "")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${from} / 0.45)`} />
          <stop offset="100%" stopColor={`hsl(${to} / 0.45)`} />
        </linearGradient>
      </defs>
      <path
        d="M0 78 C 180 26, 320 108, 520 68 S 900 18, 1200 76"
        stroke={`url(#${`blend-${from}-${to}`.replace(/[^a-z0-9-]/gi, "")})`}
        strokeWidth="1.25"
      />
      <path
        d="M0 96 C 220 52, 400 122, 640 88 S 980 44, 1200 92"
        stroke={`hsl(${to} / 0.22)`}
        strokeWidth="1"
      />
    </svg>
    <div
      className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      style={{ background: `hsl(${to} / 0.12)` }}
    />
  </div>
);

export default SectionBlend;
