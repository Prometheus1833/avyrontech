import DisplacementImage from "../source/DisplacementImage";
import mockup from "@/assets/premium-website-mockup-704.webp";
import type { DemoProps } from "./registry";

export default function DisplacementDemo({ lang }: DemoProps) {
  return (
    <div className="relative h-full w-full">
      <DisplacementImage src={mockup} alt={lang === "ro" ? "Exemplu de site Avyron" : "Avyron website example"} className="h-full w-full" />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur">
        {lang === "ro" ? "Mișcă cursorul peste imagine" : "Move the cursor over the image"}
      </p>
    </div>
  );
}
