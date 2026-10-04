import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  paragraphs: string[];
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
    <section ref={sectionRef} data-testid="website-intro-scene" data-progress={progress.toFixed(2)} className="relative mt-14 h-[210vh] border-t border-foreground/10" aria-labelledby="website-intro-title">
      <div data-testid="website-intro-sticky" className="sticky top-0 flex min-h-screen items-center py-20">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 id="website-intro-title" className="font-display text-2xl font-extrabold md:text-3xl">
            {title}
          </h2>
          <div className="mt-8 grid min-h-[22rem] place-items-center sm:min-h-[18rem]">
            {paragraphs.map((paragraph, index) => {
              const center = paragraphs.length === 1 ? 0.5 : index / (paragraphs.length - 1);
              const visibility = Math.max(0, 1 - Math.abs(progress - center) * 3.3);
              return (
                <p
                  key={paragraph.slice(0, 40)}
                  aria-hidden={visibility < 0.12}
                  className="col-start-1 row-start-1 max-w-2xl text-lg leading-relaxed text-foreground/80 transition-[opacity,transform,filter] duration-150 ease-linear sm:text-xl md:text-2xl"
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    opacity: visibility,
                    transform: `translateY(${(center - progress) * 42}px)`,
                    filter: `blur(${(1 - visibility) * 3}px)`,
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