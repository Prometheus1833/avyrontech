import type { DemoProps } from "./registry";

/** Cortina: pagina alunecă peste subsolul fix, fără listener de scroll. */
export default function FooterRevealDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-y-auto bg-[#06070d]">
      <div className="relative z-10 min-h-[130%] rounded-b-3xl bg-[#0f1220] p-5 shadow-[0_30px_60px_rgba(0,0,0,.6)]">
        <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{ro ? "Conținutul paginii" : "Page content"}</p>
        <p className="mt-2 text-sm text-white/70">{ro ? "Derulează în cadru: pagina se ridică și dedesubt apare subsolul." : "Scroll inside the frame: the page lifts and the footer appears underneath."}</p>
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 grid h-[70%] place-items-center px-5 text-center">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight text-white/90">AVYRON</p>
          <p className="pa-mono mt-2 text-[10px] uppercase tracking-[0.3em] text-white/40">innovate · develop · elevate</p>
        </div>
      </div>
    </div>
  );
}
