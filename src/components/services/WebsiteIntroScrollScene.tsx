import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  paragraphs: string[];
};

/** Fraction of each paragraph's scroll segment used to fade out / in at a hand-off. */
const FADE = 0.18;

/**
 * Each paragraph owns an equal slice of the scroll range and is fully opaque for most
 * of it. At a hand-off the outgoing paragraph fades out before the incoming one fades in,
 * so two paragraphs are never legible on top of each other.
 */
export const paragraphVisibility = (progress: number, index: number, count: number) => {
  if (count <= 1) return 1;
  const segment = 1 / count;
  const start = index * segment;
  const end = start + segment;
  const fade = segment * FADE;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const fadeIn = index === 0 ? 1 : clamp((progress - start) / fade);
  const fadeOut = index === count - 1 ? 1 : clamp((end - progress) / fade);
  return Math.min(fadeIn, fadeOut);
};

const WebsiteIntroScrollScene = ({ title, paragraphs }: Props) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
      setProgress(Math.min(1, Math.max(0, -rect.top / travel)));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} data-testid="website-intro-scene" data-progress={progress.toFixed(2)} className="relative mt-14 h-[280vh] border-t border-foreground/10" aria-labelledby="website-intro-title">
      <div data-testid="website-intro-sticky" className="sticky top-0 flex h-[100svh] min-h-[32rem] items-center pb-10 pt-20">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 id="website-intro-title" className="font-display text-2xl font-extrabold md:text-3xl">
            {title}
          </h2>
          <div className="mt-6 grid place-items-center md:mt-8">
            {paragraphs.map((paragraph, index) => {
              const visibility = paragraphVisibility(progress, index, paragraphs.length);
              const offset = visibility >= 1 ? 0 : (1 - visibility) * (progress < (index + 0.5) / paragraphs.length ? 18 : -18);
              return (
                <p
                  key={paragraph.slice(0, 40)}
                  data-testid="website-intro-paragraph"
                  aria-hidden={visibility < 0.5}
                  className="col-start-1 row-start-1 max-w-2xl text-[1.0625rem] leading-relaxed text-foreground/90 transition-[opacity,transform] duration-150 ease-linear sm:text-xl md:text-2xl"
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    opacity: visibility,
                    transform: `translateY(${offset}px)`,
                    visibility: visibility <= 0 ? "hidden" : "visible",
                  }}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
          <div className="mx-auto mt-3 flex max-w-32 gap-1" aria-hidden>
            {paragraphs.map((paragraph, index) => {
              const threshold = paragraphs.length === 1 ? 0 : index / (paragraphs.length - 1);
              return <span key={paragraph.slice(0, 18)} className={`h-0.5 flex-1 rounded-full transition-colors ${progress + 0.08 >= threshold ? "bg-primary" : "bg-foreground/15"}`} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebsiteIntroScrollScene;