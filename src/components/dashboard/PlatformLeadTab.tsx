import { ExternalLink, Settings2 } from "lucide-react";
import { StaffLeadsTab } from "@/components/dashboard/StaffLeadsTab";
import type { LeadListRow } from "@/lib/leadsApi";

type PlatformKind = "logo" | "configurator";

const CONFIG: Record<PlatformKind, {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
  matches: (lead: LeadListRow) => boolean;
}> = {
  logo: {
    eyebrow: "Platformă · Logo Studio",
    title: "Simulări Logo 3D",
    description: "Configurațiile trimise din Logo Studio, contactele asociate și rezultatul comercial rămân în același pipeline CRM.",
    href: "/servicii/creare-logo-3d-dinamic-cinematic/creeaza",
    action: "Deschide Logo Studio",
    matches: (lead) => `${lead.source || ""} ${lead.product || ""}`.toLowerCase().includes("logo"),
  },
  configurator: {
    eyebrow: "Platformă · Configuratoare",
    title: "Configurator",
    description: "Configurații sincronizate din formularul public, cu domenii de activitate, servicii, funcții și preferințe de domeniu. Lista se actualizează automat.",
    href: "/configurator",
    action: "Deschide configuratorul public",
    matches: (lead) => /config|blogpro|horeca|estimate|oferta|premium-website/.test(`${lead.source || ""} ${lead.product || ""}`.toLowerCase()),
  },
};

export default function PlatformLeadTab({ kind }: { kind: PlatformKind }) {
  const config = CONFIG[kind];
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">{config.eyebrow}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="font-display text-2xl font-bold text-white">{config.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{config.description}</p>
          </div>
          <a href={config.href} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-violet-400/30 hover:bg-violet-500/10">
            <ExternalLink className="size-3.5" /> {config.action}
          </a>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2 text-xs text-slate-400">
          <Settings2 className="size-3.5 text-cyan-300" /> Configurația, statusul și istoricul fiecărei cereri se deschid din fișa pipeline-ului.
        </div>
      </header>
      <StaffLeadsTab
        title="Pipeline și rezultate"
        description="Numai intrările provenite din acest modul. Conversia în proiect rămâne sincronizată cu CRM-ul central."
        sourceFilter={config.matches}
        allowCreate={false}
      />
    </div>
  );
}
