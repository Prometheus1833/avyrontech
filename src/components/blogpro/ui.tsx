import type { ReactNode } from "react";

/**
 * Shared editorial primitives for the Blog Profesional landing page.
 * Kept intentionally thin so future GSAP/Motion work can target
 * `data-scroll-scene` / `data-reveal` boundaries without refactoring markup.
 */

export const Section = ({
  id,
  scene,
  tone = "light",
  className = "",
  children,
  labelledBy,
}: {
  id: string;
  /** Future GSAP ScrollTrigger scene marker. */
  scene?: string;
  tone?: "light" | "soft" | "graphite";
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) => {
  const tones: Record<string, string> = {
    light: "bg-background text-foreground",
    soft: "bg-muted/40 text-foreground",
    graphite: "bg-foreground text-background",
  };
  return (
    <section
      id={id}
      data-scroll-scene={scene}
      aria-labelledby={labelledBy}
      className={`relative scroll-mt-24 overflow-hidden py-10 sm:py-14 ${tones[tone]} ${className}`}
    >
      {tone !== "graphite" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
      )}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
};

export const Eyebrow = ({ children, invert = false }: { children: ReactNode; invert?: boolean }) => (
  <p
    className={`text-[11px] font-bold uppercase tracking-[0.22em] ${
      invert ? "text-background/60" : "text-brand"
    }`}
  >
    {children}
  </p>
);

export const SectionHead = ({
  id,
  eyebrow,
  title,
  lead,
  invert = false,
  align = "left",
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  invert?: boolean;
  align?: "left" | "center";
  className?: string;
}) => (
  <header
    className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}
    data-reveal
  >
    {eyebrow && <Eyebrow invert={invert}>{eyebrow}</Eyebrow>}
    <h2
      id={id}
      className={`mt-2.5 font-display text-[1.65rem] font-bold leading-[1.12] tracking-tight sm:text-4xl ${
        invert ? "text-background" : ""
      }`}
    >
      {title}
    </h2>
    {lead && (
      <p
        className={`mt-3 text-sm leading-relaxed sm:text-[0.95rem] ${
          invert ? "text-background/70" : "text-muted-foreground"
        }`}
      >
        {lead}
      </p>
    )}
  </header>
);

export const Chip = ({
  children,
  invert = false,
  className = "",
}: {
  children: ReactNode;
  invert?: boolean;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      invert
        ? "border-background/20 bg-background/10 text-background/80"
        : "border-border/70 bg-card/70 text-muted-foreground"
    } ${className}`}
  >
    {children}
  </span>
);

export const Panel = ({
  children,
  className = "",
  invert = false,
}: {
  children: ReactNode;
  className?: string;
  invert?: boolean;
}) => (
  <div
    className={`rounded-2xl border ${
      invert ? "border-background/15 bg-background/[0.06]" : "border-border/70 bg-card/70 shadow-soft"
    } ${className}`}
  >
    {children}
  </div>
);

/** Thin grid backdrop used sparingly for editorial depth. */
export const GridBackdrop = ({ className = "" }: { className?: string }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] ${className}`}
  />
);
