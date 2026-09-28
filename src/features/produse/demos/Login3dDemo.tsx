import { useState } from "react";
import type { DemoProps } from "./registry";

/** Card 3D cu trei fețe: login, cont nou, resetare. Focusul urmează rotirea. */
type Face = 0 | 1 | 2;

export default function Login3dDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [face, setFace] = useState<Face>(0);

  const titles = ro ? ["Intră în cont", "Cont nou", "Resetare parolă"] : ["Sign in", "Create account", "Reset password"];
  const submits = ro ? ["Continuă", "Creează contul", "Trimite linkul"] : ["Continue", "Create account", "Send the link"];

  const field = "w-full rounded-xl border border-white/14 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus-visible:border-brand/60";

  return (
    <div className="grid h-full w-full place-items-center overflow-hidden p-4" style={{ background: "radial-gradient(70% 60% at 30% 20%, #3b0764, transparent 65%), #06070d" }}>
      <div className="w-full max-w-[300px]" style={{ perspective: "1000px" }}>
        <div
          className="relative h-[268px] w-full"
          style={{ transformStyle: "preserve-3d", transition: "transform .8s cubic-bezier(.22,1,.36,1)", transform: `rotateY(${face * -120}deg)` }}
        >
          {([0, 1, 2] as Face[]).map((index) => (
            <form
              key={index}
              aria-hidden={face !== index}
              onSubmit={(e) => e.preventDefault()}
              className="absolute inset-0 rounded-3xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl"
              style={{ transform: `rotateY(${index * 120}deg) translateZ(180px)`, backfaceVisibility: "hidden" }}
            >
              <h3 className="text-base font-bold text-white">{titles[index]}</h3>
              <div className="mt-4 grid gap-2.5">
                <input type="email" placeholder="email@exemplu.ro" aria-label="E-mail" className={field} tabIndex={face === index ? 0 : -1} />
                {index !== 2 && <input type="password" placeholder="••••••••" aria-label={ro ? "Parolă" : "Password"} className={field} tabIndex={face === index ? 0 : -1} />}
                {index === 1 && <input type="text" placeholder={ro ? "Numele tău" : "Your name"} aria-label={ro ? "Nume" : "Name"} className={field} tabIndex={face === index ? 0 : -1} />}
                <button type="submit" tabIndex={face === index ? 0 : -1} className="mt-1 w-full rounded-full bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white">
                  {submits[index]}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/55">
                {index !== 0 && (
                  <button type="button" onClick={() => setFace(0)} className="underline underline-offset-4">
                    {ro ? "am deja cont" : "I have an account"}
                  </button>
                )}
                {index !== 1 && (
                  <button type="button" onClick={() => setFace(1)} className="underline underline-offset-4">
                    {ro ? "cont nou" : "new account"}
                  </button>
                )}
                {index !== 2 && (
                  <button type="button" onClick={() => setFace(2)} className="ml-auto underline underline-offset-4">
                    {ro ? "am uitat parola" : "forgot password"}
                  </button>
                )}
              </div>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
