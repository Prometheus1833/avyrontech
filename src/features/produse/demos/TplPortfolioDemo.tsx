import type { DemoProps } from "./registry";

/** Galeria curbată a template-ului de portofoliu, sugerată în CSS 3D. */
export default function TplPortfolioDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const cards = Array.from({ length: 7 });
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(60%_60%_at_50%_30%,#2e1065,#05060a)]">
      <div className="relative h-[150px] w-full" style={{ perspective: "700px" }}>
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {cards.map((_, index) => {
            const angle = (index - (cards.length - 1) / 2) * 16;
            return (
              <div
                key={index}
                className="absolute left-1/2 top-1/2 h-[96px] w-[70px] rounded-lg border border-white/12"
                style={{
                  transform: `translate(-50%,-50%) rotateY(${angle}deg) translateZ(180px)`,
                  background: `linear-gradient(160deg, hsl(${265 + index * 12} 70% 55% / .5), hsl(${200 + index * 10} 80% 45% / .2))`,
                  boxShadow: "0 18px 40px -22px #000",
                }}
              />
            );
          })}
        </div>
      </div>
      <p className="pb-3 text-center text-[11px] text-white/55">{ro ? "Galerie curbată în spațiu · proiectele vin din JSON" : "Curved gallery in space · projects come from JSON"}</p>
    </div>
  );
}
