import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Star, Trash2 } from "lucide-react";
import type { LeadListRow, LeadStage } from "@/lib/leadsApi";

export const LEAD_STAGES = [
  ["new_lead", "Lead nou"],
  ["contacted", "Contactat"],
  ["discussion", "Discuție"],
  ["potential_client", "Potențial client"],
  ["offer", "Ofertă"],
  ["accepted", "Acceptat"],
  ["rejected", "Respins"],
  ["converted", "Proiect"],
] as const;
const activeStages = LEAD_STAGES.slice(0, 5);
const nextSteps: Record<string, string> = {
  new_lead: "Verifică solicitarea și stabilește primul contact.",
  contacted: "Confirmă nevoia și programează revenirea.",
  discussion: "Clarifică obiectivele, bugetul și condițiile.",
  potential_client: "Pregătește soluția și oferta potrivită.",
  offer: "Urmărește răspunsul la ofertă.",
  accepted: "Deschide fișa pentru predarea către proiect.",
  rejected: "Păstrează contextul deciziei în fișă.",
  converted: "Consultă proiectul asociat din fișă.",
};
const nextStage: Partial<Record<LeadStage, LeadStage>> = {
  new_lead: "contacted",
  contacted: "discussion",
  discussion: "potential_client",
  potential_client: "offer",
};
const date = (value: number) =>
  new Date(value).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
  });
export default function LeadPipeline({
  rows,
  saving,
  onOpen,
  onRemove,
  onUpdate,
}: {
  rows: LeadListRow[];
  saving: string | null;
  onOpen: (id: string) => void;
  onRemove: (lead: LeadListRow) => void;
  onUpdate: (
    lead: LeadListRow,
    patch: { lifecycleStage?: LeadStage; urgent?: boolean },
  ) => void;
}) {
  const [focus, setFocus] = useState<LeadStage | "active" | "all">("active");
  const [sort, setSort] = useState("priority");
  const now = Date.now();
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (sort === "newest") return b.created_at - a.created_at;
        if (sort === "followup")
          return (
            (a.next_follow_up_at ?? Infinity) -
              (b.next_follow_up_at ?? Infinity) || b.created_at - a.created_at
          );
        return (
          b.urgent - a.urgent ||
          Number(!!b.next_follow_up_at && b.next_follow_up_at < now) -
            Number(!!a.next_follow_up_at && a.next_follow_up_at < now) ||
          (a.next_follow_up_at ?? Infinity) -
            (b.next_follow_up_at ?? Infinity) ||
          b.created_at - a.created_at
        );
      }),
    [rows, sort, now],
  );
  const stages =
    focus === "active"
      ? activeStages
      : focus === "all"
        ? LEAD_STAGES
        : LEAD_STAGES.filter(([stage]) => stage === focus);
  const overdue = rows.filter(
    (row) =>
      row.next_follow_up_at &&
      row.next_follow_up_at < now &&
      !["accepted", "rejected", "converted"].includes(row.lifecycle_stage),
  ).length;
  const closed = rows.filter((row) =>
    ["accepted", "rejected", "converted"].includes(row.lifecycle_stage),
  ).length;
  return (
    <section className="min-w-0 space-y-4" aria-label="Pipeline leaduri">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.05] p-4">
        <div>
          <h3 className="text-sm font-semibold">
            Următoarea acțiune, la vedere
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {overdue} reveniri depășite · {closed} finalizate. Urgențele și
            revenirile apropiate apar primele.
          </p>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Ordonează
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-10 rounded-xl border bg-background px-3 text-foreground"
          >
            <option value="priority">Prioritate și revenire</option>
            <option value="followup">Următoarea revenire</option>
            <option value="newest">Cele mai noi</option>
          </select>
        </label>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Etapele pipeline-ului"
      >
        {(
          [
            ["active", "În lucru"],
            ...LEAD_STAGES,
            ["all", "Toate etapele"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={focus === key}
            onClick={() => setFocus(key)}
            className={`min-h-10 rounded-xl border px-3 py-2 text-xs ${focus === key ? "border-primary/40 bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
          >
            {label}{" "}
            <span className="ml-1 opacity-60">
              {
                rows.filter(
                  (row) =>
                    key === "all" ||
                    (key === "active"
                      ? activeStages.some(
                          ([stage]) => stage === row.lifecycle_stage,
                        )
                      : row.lifecycle_stage === key),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div
        className={`grid min-w-0 items-start gap-3 ${stages.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}
      >
        {stages.map(([stage, label]) => {
          const leads = sorted.filter((row) => row.lifecycle_stage === stage);
          return (
            <section
              key={stage}
              aria-label={`Etapa ${label}`}
              className="min-w-0 rounded-2xl border border-border/60 bg-card/30 p-3"
            >
              <header className="mb-3">
                <h4 className="flex items-center justify-between text-sm font-semibold">
                  {label}
                  <span className="rounded-full bg-muted px-2 py-1 text-xs">
                    {leads.length}
                  </span>
                </h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {nextSteps[stage]}
                </p>
              </header>
              <div className="space-y-2">
                {leads.map((lead) => {
                  const name = lead.name || lead.business || "Lead fără nume";
                  const late =
                    !!lead.next_follow_up_at && lead.next_follow_up_at < now;
                  return (
                    <article
                      key={lead.id}
                      className={`min-w-0 space-y-3 rounded-xl border bg-card p-3 ${lead.urgent ? "border-amber-400/40" : "border-border/60"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpen(lead.id)}
                          className="min-w-0 text-left"
                        >
                          <strong className="block break-words text-sm">
                            {name}
                          </strong>
                          <span className="mt-1 block break-words text-xs text-muted-foreground">
                            {lead.business && lead.name
                              ? lead.business
                              : lead.product || "Interes de clarificat"}
                          </span>
                        </button>
                        <div className="flex shrink-0">
                          <button
                            type="button"
                            disabled={saving === lead.id}
                            aria-label={`${lead.urgent ? "Elimină urgența" : "Marchează urgent"}: ${name}`}
                            onClick={() =>
                              onUpdate(lead, { urgent: !lead.urgent })
                            }
                            className="rounded-lg p-2 text-amber-500"
                          >
                            <Star
                              className="size-4"
                              fill={lead.urgent ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            type="button"
                            disabled={saving === lead.id}
                            aria-label={`Elimină lead-ul: ${name}`}
                            onClick={() => onRemove(lead)}
                            className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lead.product || "Serviciu neclasificat"} ·{" "}
                        {lead.source || "Sursă necompletată"}
                      </p>
                      <p
                        className={`flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-2 text-[11px] ${late ? "text-amber-500" : "text-muted-foreground"}`}
                      >
                        <Clock3 className="size-3.5" />
                        {lead.next_follow_up_at
                          ? `${late ? "Revenire depășită" : "Revenire"} · ${date(lead.next_follow_up_at)}`
                          : "Revenire nesetată"}
                      </p>
                      <select
                        aria-label={`Etapa pentru ${name}`}
                        value={lead.lifecycle_stage}
                        disabled={saving === lead.id || stage === "converted"}
                        onChange={(e) =>
                          onUpdate(lead, {
                            lifecycleStage: e.target.value as LeadStage,
                          })
                        }
                        className="min-h-10 w-full min-w-0 rounded-lg border bg-background px-2 text-xs"
                      >
                        {LEAD_STAGES.filter(
                          ([value]) =>
                            value !== "converted" || stage === "converted",
                        ).map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onOpen(lead.id)}
                          className="min-h-10 flex-1 rounded-lg border px-3 text-xs font-medium"
                        >
                          Deschide fișa
                        </button>
                        {nextStage[stage] && (
                          <button
                            type="button"
                            disabled={saving === lead.id}
                            onClick={() =>
                              onUpdate(lead, {
                                lifecycleStage: nextStage[stage],
                              })
                            }
                            className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-primary/10 px-3 text-xs text-primary"
                          >
                            {
                              LEAD_STAGES.find(
                                ([value]) => value === nextStage[stage],
                              )?.[1]
                            }
                            <ArrowRight className="size-3" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!leads.length && (
                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Niciun lead în această etapă.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
