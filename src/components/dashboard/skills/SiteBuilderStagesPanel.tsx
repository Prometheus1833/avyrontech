import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus, RefreshCw, Route } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { skillsApi } from "@/lib/skillsApi";
import { SITE_STAGES, type SiteStageKey } from "@/shared/skills/siteStages";
import type {
  SkillDetail,
  SkillPermissions,
  SkillResource,
} from "@/shared/skills/model";
import SkillResourceCard from "./SkillResourceCard";

export default function SiteBuilderStagesPanel({
  permissions,
  uploadBlock,
  initialCounts,
  busy,
  onCreate,
  onEdit,
  onDownload,
  onState,
}: {
  permissions: SkillPermissions;
  initialCounts: SkillDetail["resourceStages"];
  uploadBlock: string | null;
  busy: boolean;
  onCreate: (stage: SiteStageKey) => void;
  onEdit: (resource: SkillResource) => void;
  onDownload: (resource: SkillResource) => void;
  onState: (resource: SkillResource, status: "approved" | "archived") => void;
}) {
  const [stageKey, setStageKey] = useState<SiteStageKey>("visual");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const [exporting, setExporting] = useState(false);
  const stage = SITE_STAGES.find((s) => s.key === stageKey)!;
  const info = useQuery({
    queryKey: ["skills", "site-builder", "stage", stageKey, offset, search],
    queryFn: ({ signal }) =>
      skillsApi.detail("site-builder", signal, offset, search, stageKey),
  });
  const counts = info.data?.resourceStages || initialCounts || [];
  return (
    <section className="min-w-0 space-y-4" aria-label="Etapele Site Builder">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Route className="size-5 text-violet-300" />
            Workflow de dezvoltare
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Opt etape, cu instrucțiuni, prompturi și materiale reutilizabile.
            Selectează etapa pentru a-i organiza resursele.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={info.isFetching}
          aria-label="Actualizează etapele"
          onClick={() => void info.refetch()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </header>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="min-w-0 xl:hidden">
          <p className="mb-1.5 text-xs text-slate-300">Etapa de dezvoltare</p>
          <Select
            value={stageKey}
            onValueChange={(value) => {
              setStageKey(value as SiteStageKey);
              setOffset(0);
              setQuery("");
              setSearch("");
            }}
          >
            <SelectTrigger
              aria-label="Selectează etapa de dezvoltare"
              className="min-h-12 border-white/15 bg-white/[.025] text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITE_STAGES.map((item, i) => (
                <SelectItem key={item.key} value={item.key}>
                  {String(i + 1).padStart(2, "0")} · {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <nav
          aria-label="Etape de dezvoltare"
          className="hidden grid-cols-1 gap-1 rounded-2xl border border-white/10 bg-white/[.025] p-2 xl:grid"
        >
          {SITE_STAGES.map((item, i) => {
            const count = counts.find((c) => c.stage_key === item.key);
            return (
              <button
                key={item.key}
                type="button"
                aria-current={stageKey === item.key ? "step" : undefined}
                onClick={() => {
                  setStageKey(item.key);
                  setOffset(0);
                  setQuery("");
                  setSearch("");
                }}
                className={`flex min-h-12 min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${stageKey === item.key ? "bg-violet-500/20 text-violet-100" : "text-slate-300 hover:bg-white/5"}`}
              >
                <span className="font-mono text-[10px] text-violet-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 break-words">{item.title}</span>
                <span
                  className="shrink-0 rounded-md bg-white/5 px-1.5 py-1 text-[10px]"
                  aria-label={`${count?.total || 0} resurse`}
                >
                  {count?.total || 0}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 space-y-3">
          <article className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4">
            <p className="text-[10px] uppercase tracking-widest text-violet-300">
              Etapa {SITE_STAGES.findIndex((s) => s.key === stageKey) + 1} / 8 ·
              bibliotecă de workflow
            </p>
            <h3 className="mt-1 text-xl font-semibold">{stage.title}</h3>
            <p className="mt-1 text-sm text-slate-300">{stage.summary}</p>
            <dl className="mt-3 grid gap-3 border-t border-white/10 pt-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Rezultat urmărit</dt>
                <dd className="mt-1 text-slate-200">{stage.output}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Punct de control uman</dt>
                <dd className="mt-1 text-slate-200">{stage.gate}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Biblioteca descrie procesul; progresul unui client se urmărește în
              proiectul său. Aprobarea unui prompt nu pornește execuția sau
              publicarea.
            </p>
          </article>
          <div className="flex flex-wrap gap-2">
            {permissions.manage && (
              <Button disabled={busy} onClick={() => onCreate(stageKey)}>
                <Plus className="mr-1.5 size-4" />
                Adaugă prompt / resursă
              </Button>
            )}
            <Button
              variant="outline"
              disabled={
                exporting ||
                !counts.find((c) => c.stage_key === stageKey)?.approved
              }
              onClick={async () => {
                setExporting(true);
                try {
                  await skillsApi.download(
                    `/api/skills/site-builder/stages/${stageKey}.md`,
                    `AVYRON-Site-Builder-${stageKey}.md`,
                  );
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Exportul nu a reușit.",
                  );
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download className="mr-1.5 size-4" />
              {exporting ? "Se descarcă…" : "Instrucțiuni pentru agent"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Exportul include numai resurse aprobate ale etapei; peste 20,
            documentul indică pagina următoare. Prompturile editate revin în
            ciornă pentru verificare.
          </p>
          {uploadBlock && (
            <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100">
              {uploadBlock} Notele și prompturile se pot salva. Fișierele
              externe folosesc scanarea existentă.
            </p>
          )}
          <label
            className="block text-xs text-slate-300"
            htmlFor="stage-resource-search"
          >
            Caută în etapa selectată
          </label>
          <Input
            id="stage-resource-search"
            type="search"
            maxLength={100}
            value={query}
            placeholder="Titlu, instrucțiune sau domeniu…"
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
            className="min-h-11 text-base sm:text-sm"
          />
          {info.isPending ? (
            <p role="status" className="py-4 text-sm text-slate-300">
              Se încarcă resursele etapei…
            </p>
          ) : info.isError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/20 p-4 text-sm"
            >
              {info.error.message}
              <Button
                variant="outline"
                className="ml-2"
                onClick={() => void info.refetch()}
              >
                Reîncearcă
              </Button>
            </div>
          ) : (
            <>
              <p role="status" className="text-xs text-slate-400">
                {info.data.resourceTotal} resurse în această selecție
              </p>
              <div className="grid min-w-0 items-start gap-3 min-[1500px]:grid-cols-2">
                {info.data.resources.map((resource) => (
                  <SkillResourceCard
                    key={resource.id}
                    item={resource}
                    canApprove={permissions.approve}
                    canManage={permissions.manage}
                    busy={busy}
                    onEdit={() => onEdit(resource)}
                    onDownload={() => onDownload(resource)}
                    onState={(status) => onState(resource, status)}
                  />
                ))}
              </div>
              {!info.data.resources.length && (
                <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-300">
                  {query
                    ? "Nicio resursă nu corespunde căutării."
                    : "Nu există resurse vizibile în această etapă. Un responsabil poate adăuga și aproba instrucțiunile."}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>Pagina {Math.floor(offset / 20) + 1}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!offset || info.isFetching}
                    onClick={() => setOffset((o) => Math.max(0, o - 20))}
                  >
                    Înapoi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      info.data.resourceNextOffset == null || info.isFetching
                    }
                    onClick={() => setOffset(info.data.resourceNextOffset!)}
                  >
                    Înainte
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
