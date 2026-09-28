import type React from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { reducedMotion } from "../lib/capability";

/**
 * Bucătăria de tranziții a paginii: un singur observator pentru toate
 * elementele care trebuie să apară la scroll, plus separatorul de secțiune.
 * Tranzițiile sunt intenționat subtile — 16px de urcare, 6px de ceață — ca
 * pagina să curgă, nu să sară.
 */

let observer: IntersectionObserver | null = null;

function ensureObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return null;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // Prag 0: un bloc mai înalt decât ecranul nu atinge niciodată un prag
        // procentual, iar al doilea test prinde elementele pe lângă care
        // utilizatorul a trecut deja (scroll rapid, ancoră, revenire).
        // `boundingClientRect` lipseşte în stub-ul din prerender, deci îl citim defensiv.
        const rect = entry.boundingClientRect;
        const passed = rect ? rect.top < window.innerHeight * 0.95 : true;
        if (!entry.isIntersecting && !passed) continue;
        (entry.target as HTMLElement).dataset.in = "1";
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -4% 0px", threshold: 0 },
  );
  return observer;
}

export function Reveal({
  children,
  as: Tag = "div",
  index = 0,
  className = "",
  ...rest
}: {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  index?: number;
  className?: string;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.dataset.in = "1";
      return;
    }
    ensureObserver()?.observe(el);
    return () => observer?.unobserve(el);
  }, []);
  const Component = Tag as unknown as React.ElementType;
  return (
    <Component ref={ref} className={`pa-reveal ${className}`} style={{ "--i": index } as never} {...rest}>
      {children}
    </Component>
  );
}

/** Linia de lumină dintre secțiuni. Pur decorativă. */
export function Seam() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    ensureObserver()?.observe(el);
    return () => observer?.unobserve(el);
  }, []);
  return <div ref={ref} className="pa-seam my-10 sm:my-14" aria-hidden="true" />;
}

/**
 * Secțiune de pagină. Când intră în ecran, își anunță nuanța: fundalul WebGL o
 * citește din variabila CSS și interpolează spre ea, deci trecerea dintre
 * secțiuni se simte ca o schimbare de lumină, nu ca un salt.
 */
export function Section({
  id,
  hue,
  children,
  className = "",
  label,
}: {
  id: string;
  hue: number;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          document.querySelector<HTMLElement>(".pa-root")?.style.setProperty("--pa-hue", String(hue));
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hue]);

  return (
    <section ref={ref} id={id} aria-label={label} className={`scroll-mt-24 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  right,
  /** Prima secțiune a unei pagini primește h1; restul rămân h2. */
  titleAs: TitleTag = "h2",
}: {
  /** Poate fi și un link — colecțiile pun aici drumul înapoi. */
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  right?: ReactNode;
  titleAs?: "h1" | "h2";
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <Reveal className="max-w-2xl">
        <p className="pa-mono text-[11px] uppercase tracking-[0.24em] text-brand">{eyebrow}</p>
        <TitleTag className="mt-2.5 font-display text-2xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-3xl lg:text-[2.6rem]">{title}</TitleTag>
        {lead && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{lead}</p>}
      </Reveal>
      {right && (
        <Reveal index={1} className="shrink-0">
          {right}
        </Reveal>
      )}
    </div>
  );
}

/** Insignă mică, folosită pentru acces, stare și tehnologii. */
export function Pill({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "free" | "pro" | "studio" | "new" | "price";
  title?: string;
}) {
  // Fiecare ton are o variantă pentru tema deschisă și una pentru cea închisă,
  // ca textul mic să treacă pragul de contrast 4,5:1 în ambele.
  const tones: Record<string, string> = {
    neutral: "border-foreground/15 bg-foreground/[0.05] text-foreground/75",
    free: "border-lime-600/40 bg-lime-500/12 text-lime-700 dark:border-lime-400/30 dark:text-lime-200",
    pro: "border-brand/40 bg-brand/12 text-violet-700 dark:text-violet-200",
    studio: "border-pink-500/35 bg-pink-500/12 text-pink-700 dark:text-pink-200",
    new: "border-cyan-600/40 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200",
    price: "border-amber-600/40 bg-amber-500/12 text-amber-700 dark:text-amber-100",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Buton de copiere cu confirmare vizuală, fără dependențe. */
export function CopyButton({
  value,
  label,
  copiedLabel,
  className = "",
  onCopied,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          // Fallback pentru contexte fără permisiune pe clipboard.
          const area = document.createElement("textarea");
          area.value = value;
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        setCopied(true);
        onCopied?.();
        window.setTimeout(() => setCopied(false), 1800);
      }}
      className={className}
      data-ripple
    >
      {copied ? copiedLabel : label}
    </button>
  );
}


/**
 * Accordion de pagină pentru întrebări frecvente.
 *
 * Varianta din `source/FaqAccordion.tsx` e produsul livrat clienților (scris
 * pentru fundal întunecat, cu JSON-LD propriu). Aici ne trebuie una care
 * respectă tema site-ului, pentru că stă direct în pagină; datele structurate
 * le pune deja `applySeo`.
 */
export function PageFaq({ items }: { items: Array<{ id: string; q: string; a: string }> }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && items.some((item) => item.id === hash)) setOpen(hash);
  }, [items]);

  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} id={item.id} className="overflow-hidden rounded-2xl border border-foreground/10 bg-card/45">
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-foreground/[0.03]"
              >
                {item.q}
                <span aria-hidden className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
            </h3>
            <div
              id={`${item.id}-panel`}
              className="grid transition-[grid-template-rows] duration-500 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="m-0 px-4 pb-4 text-[13.5px] leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
