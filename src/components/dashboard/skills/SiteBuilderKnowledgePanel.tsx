import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cfAuth } from "@/lib/cfAuth";
import { skillsApi } from "@/lib/skillsApi";
import {
  SITE_DOMAIN_PLAYBOOKS,
  SITE_FEATURES,
  SITE_MARKET_SOURCES,
  type SiteAgent,
} from "@/shared/skills/siteKnowledge";
type Knowledge = {
  version: string;
  domains: typeof SITE_DOMAIN_PLAYBOOKS;
  features: typeof SITE_FEATURES;
  marketSources: typeof SITE_MARKET_SOURCES;
  examples: {
    key: string;
    name: string;
    url: string;
    description: string;
    page: string;
    revision: number;
    domain: string;
    kind: string;
  }[];
  library: {
    id: string;
    name: string;
    effects: {
      code: string;
      name: string;
      description: string;
      demo: string | null;
      webgl: boolean;
      state: string;
    }[];
  }[];
  agents: {
    agent_slug: string;
    status: string;
    agent_status: string;
    bindings: number;
  }[];
  resourceDomains: { domain: string; total: number; approved: number }[];
};
const panel = "min-w-0 rounded-2xl border border-white/10 bg-white/[.025] p-4";
export default function SiteBuilderKnowledgePanel({
  canManage,
  onUse,
}: {
  canManage: boolean;
  onUse: (domain: string) => void;
}) {
  const client = useQueryClient(),
    [domain, setDomain] = useState("general"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  const info = useQuery({
    queryKey: ["site-builder-knowledge"],
    queryFn: ({ signal }) =>
      cfAuth.request<Knowledge>("/api/skills/site-builder/knowledge", {
        signal,
      }),
    staleTime: 60000,
  });
  const sync = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await cfAuth.request<{
        created: number;
        references: number;
        archived: number;
      }>("/api/skills/site-builder/sources/sync", {
        method: "POST",
        body: "{}",
      });
      toast.success(
        `${r.created} referințe noi pentru revizuire · ${r.archived} referințe retrase.`,
      );
      await Promise.all([
        info.refetch(),
        client.invalidateQueries({ queryKey: ["skills", "site-builder"] }),
      ]);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Sursele nu au fost sincronizate.",
      );
    } finally {
      setBusy(false);
    }
  };
  const download = async (agent: SiteAgent) => {
    try {
      await skillsApi.download(
        `/api/skills/site-builder/agents/${agent}.md?domain=${encodeURIComponent(domain)}`,
        `AVYRON-Site-Builder-${agent}-${domain}.md`,
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Documentul nu poate fi descărcat.",
      );
    }
  };
  if (!info.data)
    return (
      <div className={panel}>
        {info.error ? (
          <div role="alert">
            <p>{info.error.message}</p>
            <Button onClick={() => void info.refetch()}>Reîncearcă</Button>
          </div>
        ) : (
          <p role="status">Se citesc biblioteca și sursele aprobate…</p>
        )}
      </div>
    );
  const data = info.data,
    playbook = data.domains.find((d) => d.id === domain) || data.domains[0],
    needle = query.trim().toLocaleLowerCase("ro");
  const matches = (value: string) =>
    !needle || value.toLocaleLowerCase("ro").includes(needle);
  return (
    <section
      className="space-y-4"
      aria-label="Site Builder · cunoștințe și agenți"
    >
      <header className={panel}>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-violet-300">
              Cunoștințe comune · {data.version}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Mai puțin context repetat. Aceeași calitate a produsului.
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Brief minim, profil de nișă și referințe selectate. Masterele
              vizuale și personalizarea se păstrează la calitatea aprobată;
              optimizarea pentru web produce variante separate.
            </p>
          </div>
          {canManage && (
            <Button
              variant="outline"
              className="h-auto min-h-11 max-w-full whitespace-normal"
              disabled={busy}
              onClick={() => void sync()}
            >
              <RefreshCw className="mr-2 size-4" />
              {busy
                ? "Se sincronizează…"
                : "Sincronizează sursele"}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Sursele sincronizate intră la Resurse pentru revizuire. Numai cele
          aprobate sunt folosite de agenți; nu sunt copiate fișierele sau
          identitatea altui client.
        </p>
      </header>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className={panel}>
          <h3 className="text-sm font-semibold">Domeniu / nișă</h3>
          <label className="mt-3 block text-xs">
            Profil de lucru
            <select
              aria-label="Domeniu Site Builder"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#10162a] px-3 text-base sm:text-sm"
            >
              {data.domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <h4 className="mt-4 text-sm font-semibold">Handoff pentru agenți</h4>
          <div className="mt-2 grid gap-2">
            {(["codex", "claude", "lovable"] as const).map((agent) => (
              <Button
                key={agent}
                variant="outline"
                className="justify-start"
                onClick={() => void download(agent)}
              >
                <Download className="mr-2 size-4" />
                {agent === "codex"
                  ? "Codex"
                  : agent === "claude"
                    ? "Claude"
                    : "Lovable"}{" "}
                · instrucțiuni
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Versiuni și checksum în exportul privat. Exportul Lovable pregătește
            instrucțiunile; nu pornește agentul și nu consumă credite.
          </p>
          <Button className="mt-4 w-full" onClick={() => onUse(domain)}>
            Folosește în brief
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </aside>
        <article className={panel}>
          <h3 className="text-lg font-semibold">{playbook.label}</h3>
          <p className="mt-1 text-sm text-cyan-100">{playbook.job}</p>
          <ol className="mt-3 grid list-inside list-decimal gap-2 sm:grid-cols-2">
            {playbook.sections.map((s, i) => (
              <li key={i} className="rounded-lg bg-white/[.035] p-2 text-xs">
                {s}
              </li>
            ))}
          </ol>
          <h4 className="mt-4 text-sm font-semibold">Funcții de evaluat</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {playbook.features.map((f) => (
              <span
                key={f}
                className="rounded-lg border border-violet-400/20 px-2 py-1 text-xs text-violet-100"
              >
                {f}
              </span>
            ))}
          </div>
          <details className="mt-4 rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-sm">
              Brief minim și ipoteză de lucru
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {playbook.questions.map((q) => (
                <li key={q}>{q.endsWith("?") ? q : q + "?"}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {playbook.hypothesis}
            </p>
          </details>
        </article>
      </div>
      <Input
        aria-label="Caută exemple și funcții Site Builder"
        placeholder="Caută un exemplu, o funcție sau un cod din bibliotecă…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-h-11 text-base sm:text-sm"
      />
      <section className={panel}>
        <h3 className="text-sm font-semibold">
          Exemple din caruselele publicate
        </h3>
        <div className="mt-3 grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.examples
            .filter(
              (e) =>
                (domain === "general" || e.domain === domain) &&
                matches(`${e.name} ${e.description}`),
            )
            .map((e) => (
              <article
                key={e.key}
                className="rounded-xl border border-white/10 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="break-words text-sm font-semibold">
                    {e.name}
                  </h4>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px]">
                    {e.kind === "mockup" ? "Mockup" : "Portofoliu"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {e.description}
                </p>
                <p className="mt-2 text-[10px] text-slate-500">
                  Catalog: {e.page} · revizia {e.revision}. Starea funcțiilor se
                  verifică separat.
                </p>
                <a
                  className="mt-3 inline-flex min-h-10 items-center gap-1 text-xs text-violet-200 underline"
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Deschide exemplul
                  <ExternalLink className="size-3" />
                </a>
              </article>
            ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La Resurse poți adăuga documente și imagini cu proveniență și drepturi
          confirmate, în domenii existente sau noi.
        </p>
      </section>
      <section className={panel}>
        <h3 className="text-sm font-semibold">
          Funcții și integrări cu scop clar
        </h3>
        <div className="mt-3 grid items-start gap-2 sm:grid-cols-2">
          {data.features
            .filter((f) => matches(`${f.name} ${f.purpose}`))
            .map((f) => (
              <article
                key={f.id}
                className="rounded-xl border border-white/10 p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h4 className="text-sm font-semibold">{f.name}</h4>
                  <span className="text-xs text-cyan-200">
                    {f.state === "demo"
                      ? "Demo de interfață"
                      : "Implementare în repository"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{f.purpose}</p>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-violet-200">
                    Implementare și criterii
                  </summary>
                  <p className="mt-2 break-all font-mono text-[11px]">
                    {f.implementation}
                  </p>
                  <p className="mt-2 leading-relaxed text-slate-400">
                    {f.acceptance}
                  </p>
                </details>
              </article>
            ))}
        </div>
        <div className="mt-4 space-y-2">
          {data.library.map((group) => {
            const effects = group.effects.filter((e) =>
              matches(`${e.code} ${e.name} ${e.description}`),
            );
            return effects.length ? (
              <details
                key={group.id}
                className="rounded-xl border border-white/10 p-3"
              >
                <summary className="cursor-pointer text-sm">
                  {group.name} · {effects.length} efecte
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {effects.map((e) => (
                    <article
                      key={e.code}
                      className="rounded-lg bg-white/[.025] p-2 text-xs"
                    >
                      <strong>
                        {e.code} · {e.name}
                      </strong>
                      <p className="mt-1 text-slate-400">{e.description}</p>
                      <p className="mt-1 text-[10px] text-cyan-200">
                        {e.demo ? "Demo disponibil" : "Referință de catalog"}
                        {e.webgl ? " · WebGL cu fallback" : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </details>
            ) : null;
          })}
        </div>
      </section>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <section className={panel}>
          <h3 className="text-sm font-semibold">
            Cercetare și analiză de piață
          </h3>
          <div className="mt-3 space-y-3">
            {data.marketSources.map((s) => (
              <article key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-200 underline"
                >
                  {s.title}
                </a>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {s.insight}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Consultate la 8 noiembrie 2026. Ipotezele pe domenii se validează
            pentru fiecare beneficiar.
          </p>
        </section>
        <section className={panel}>
          <h3 className="text-sm font-semibold">Consumatori AI și Leads</h3>
          <div className="mt-3 space-y-2">
            {data.agents.map((a, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 p-3 text-xs"
              >
                <strong>
                  {a.agent_slug === "leads" ? "AVY Leads" : "AVY Prod"}
                </strong>
                <p className="mt-1 text-slate-400">
                  Legătură operator: {a.status} · agent: {a.agent_status}
                </p>
              </div>
            ))}
            {!data.agents.length && (
              <p className="text-xs text-slate-400">
                Nu există legături de operator vizibile în aria acestui cont.
              </p>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Fluxurile eligibile citesc un rezumat scurt din resursele aprobate.
            Contextul complet se citește progresiv, cu autentificarea existentă.
            Briefurile și fișierele altor beneficiari nu devin cunoștințe
            comune.
          </p>
        </section>
      </div>
    </section>
  );
}
