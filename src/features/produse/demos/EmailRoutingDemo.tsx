import { useEffect, useState } from "react";
import type { DemoProps } from "./registry";

/** Traseul unui e-mail pe domeniu propriu, explicat pas cu pas. */
const STEPS = [
  { ro: "E-mail trimis către contact@firma.ro", en: "Email sent to contact@company.ro", detail: { ro: "Expeditorul nu știe nimic despre infrastructura din spate.", en: "The sender knows nothing about the infrastructure behind." } },
  { ro: "DNS: MX → serverul de rutare", en: "DNS: MX → routing server", detail: { ro: "Înregistrările MX, SPF, DKIM și DMARC decid cine poate trimite în numele domeniului.", en: "MX, SPF, DKIM and DMARC records decide who may send on behalf of the domain." } },
  { ro: "Filtre anti-spam și verificări", en: "Spam filters and checks", detail: { ro: "Se verifică semnătura, reputația IP-ului și conținutul.", en: "Signature, IP reputation and content are checked." } },
  { ro: "Reguli de rutare", en: "Routing rules", detail: { ro: "contact@ → echipa, facturi@ → contabilitate, restul → catch-all.", en: "contact@ → the team, invoices@ → accounting, the rest → catch-all." } },
  { ro: "Worker: salvare și notificare", en: "Worker: store and notify", detail: { ro: "Mesajul devine lead în bază, cu atașamentele în stocare privată.", en: "The message becomes a lead in the database, attachments in private storage." } },
  { ro: "Ajunge în căsuța ta", en: "Lands in your inbox", detail: { ro: "În Gmail sau Outlook, cu răspuns de pe adresa de domeniu.", en: "In Gmail or Outlook, replying from the domain address." } },
];

export default function EmailRoutingDemo({ lang, active }: DemoProps) {
  const ro = lang === "ro";
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2200);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div className="h-full w-full overflow-auto p-4">
      <ol className="relative grid gap-1.5 pl-6">
        <span aria-hidden className="absolute bottom-2 left-[9px] top-2 w-px bg-white/10" />
        <span
          aria-hidden
          className="absolute left-[9px] top-2 w-px bg-gradient-to-b from-brand to-brand-2 transition-all duration-700"
          style={{ height: `${((step + 1) / STEPS.length) * 100}%` }}
        />
        {STEPS.map((s, i) => {
          const on = i <= step;
          return (
            <li key={i} className="relative">
              <span
                aria-hidden
                className={`absolute -left-6 top-1.5 size-2.5 rounded-full border transition-all duration-500 ${
                  i === step ? "scale-125 border-brand bg-brand shadow-[0_0_14px_hsl(264_90%_68%)]" : on ? "border-brand/60 bg-brand/50" : "border-white/20 bg-transparent"
                }`}
              />
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`block w-full text-left text-[12.5px] transition-colors ${i === step ? "text-white" : "text-white/55 hover:text-white/80"}`}
              >
                <span className="font-medium">{ro ? s.ro : s.en}</span>
                {i === step && <span className="mt-0.5 block text-[11.5px] leading-relaxed text-white/50">{ro ? s.detail.ro : s.detail.en}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
