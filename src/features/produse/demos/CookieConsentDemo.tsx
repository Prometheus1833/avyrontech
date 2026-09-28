import { useState } from "react";
import CookieConsent, { type Consent } from "../source/CookieConsent";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function CookieConsentDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const [decision, setDecision] = useState<Consent | null>(null);
  const [round, setRound] = useState(0);

  return (
    <Stage pad={false}>
      <div className="relative h-full w-full overflow-hidden">
        <div className="grid h-full place-items-center px-6 text-center">
          {decision ? (
            <div>
              <p className="pa-mono text-[11px] uppercase tracking-[0.22em] text-brand">{ro ? "decizie salvată" : "choice saved"}</p>
              <p className="mt-2 text-[12.5px] text-white/75">
                {ro ? "Necesare: da" : "Necessary: yes"} · {ro ? "Analiză" : "Analytics"}: {decision.analytics ? "da" : "nu"} · Marketing:{" "}
                {decision.marketing ? "da" : "nu"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDecision(null);
                  setRound((value) => value + 1);
                }}
                className="mt-3 rounded-full border border-white/15 px-3 py-1.5 text-[11.5px] text-white"
              >
                {ro ? "Arată din nou bannerul" : "Show the banner again"}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-white/55">{ro ? "Conținutul paginii, în spatele bannerului." : "The page content, behind the banner."}</p>
          )}
        </div>
        {!decision && <CookieConsent key={round} forceOpen onDecision={setDecision} />}
      </div>
    </Stage>
  );
}
