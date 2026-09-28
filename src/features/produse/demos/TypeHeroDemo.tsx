import TypeHero from "../source/TypeHero";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function TypeHeroDemo({ values, lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-auto">
      <TypeHero
        headingAs="h2"
        eyebrow={ro ? "Site de prezentare" : "Business website"}
        title={str(values.title, ro ? "Site-uri care se simt" : "Websites that feel")}
        highlight={ro ? "vii" : "alive"}
        lead={ro ? "Fără imagini grele: primul ecran se desenează instant, iar textul rămâne complet pentru Google." : "No heavy images: the first screen paints instantly and the text stays complete for Google."}
        primary={{ label: ro ? "Vreau ofertă" : "Get a quote", href: "#" }}
        secondary={{ label: ro ? "Vezi exemple" : "See examples", href: "#" }}
        trust={ro ? ["Lighthouse 95+", "Livrare 2–5 zile", "SEO inclus"] : ["Lighthouse 95+", "2–5 day delivery", "SEO included"]}
      />
    </div>
  );
}
