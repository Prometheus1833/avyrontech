import { ShieldCheck, ArrowRight } from "lucide-react";
import { useAntivirus } from "@/hooks/useAntivirus";
export default function AntivirusSummary({ onOpen }: { onOpen: () => void }) {
  const query = useAntivirus(),
    d = query.data;
  const status = query.isError
    ? "Monitorizare indisponibilă"
    : !d
      ? "Se verifică starea…"
      : !d.configured
        ? "Bouncer neconfigurat"
        : !d.storageVerified
          ? "Stocare privată neverificată"
          : !d.enabled
            ? "Scanare dezactivată"
            : !d.sensitiveApproved
              ? "Uploaduri sensibile blocate"
              : "Control antivirus configurat";
  const blocked = d
    ? Object.entries(d.counts)
        .filter(([state]) => !["clean", "purged"].includes(state))
        .reduce((n, [, v]) => n + v, 0) + d.legacyCount
    : 0;
  return (
    <section
      aria-label="Monitorizare antivirus"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.05] px-4 py-3"
    >
      <ShieldCheck className="size-5 shrink-0 text-violet-300" />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-white">
          Antivirus{" "}
          <span className="ml-2 text-xs font-normal text-slate-300">
            {status}
          </span>
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {d?.quota
            ? `${Math.max(d.quota.reserved, d.quota.provider_used)} / 500 scanări în luna curentă`
            : "Plan Free · maximum 500 scanări/lună"}{" "}
          · {blocked} blocate · uploaduri externe, acces după CLEAN
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
      >
        Monitorizare
        <ArrowRight className="size-4" />
      </button>
    </section>
  );
}
