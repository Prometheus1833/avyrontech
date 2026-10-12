import { useEffect, useRef, useState } from "react";
import { Search, MapPinOff, Instagram, Bot, ShieldCheck, TrendingUp } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const icons = [Search, MapPinOff, Instagram, Bot, ShieldCheck, TrendingUp];
const pairs = [[0, 3], [1, 5], [2, 4]] as const;

const Problem = () => {
  const { t } = useLang();
  const cards = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState<number[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setActive((current) => {
        const next = new Set(current);
        entries.forEach((entry) => {
          const index = cards.current.indexOf(entry.target as HTMLElement);
          if (index < 0) return;
          if (entry.isIntersecting) next.add(index);
          else next.delete(index);
        });
        return [...next];
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    cards.current.forEach((card) => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, []);
  return (
    <section id="de-ce" className="relative py-10 md:py-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(600px 400px at 20% 10%, hsl(var(--brand)/0.15), transparent 60%), radial-gradient(500px 350px at 80% 90%, hsl(var(--brand-2)/0.15), transparent 60%)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" aria-hidden />


      <div className="relative mx-auto max-w-6xl px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            <span className="text-gradient">{t.problem.title1}</span>{" "}
            {t.problem.title2.split(/(WEBSITE|website)/).map((part, i) =>
              /WEBSITE|website/.test(part) ? (
                <span
                  key={i}
                  className="font-extrabold uppercase tracking-wide"
                  style={{ color: "hsl(265 45% 48%)" }}
                >
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </h2>
          <p className="mt-4 font-display text-base md:text-lg font-medium leading-snug text-foreground/90">
            {t.problem.desc.replace("{pct}", "80%")}
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3" data-testid="problem-reasons">
          {pairs.map(([first, second], i) => {
            const primary = t.problem.items[first];
            const secondary = t.problem.items[second];
            const Icon = icons[first];
            const SecondaryIcon = icons[second];
            return (
              <article
                key={primary.t}
                ref={(node) => { cards.current[i] = node; }}
                data-active={active.includes(i)}
                className="problem-pair rounded-2xl bg-cardgrad p-5 md:p-6 border border-border/60 text-center"
              >
                <div className="mb-3 flex items-center justify-center gap-2 text-brand" aria-hidden="true">
                  <Icon className="size-5" /><span className="h-px w-6 bg-current/30" /><SecondaryIcon className="size-5" />
                </div>
                <h3 className="font-display font-semibold text-base leading-tight">{primary.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">{primary.d}</p>
                <div className="my-4 h-px bg-border/70" aria-hidden="true" />
                <h4 className="font-display font-semibold text-base leading-tight">{secondary.t}</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">{secondary.d}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Problem;
