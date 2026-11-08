import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Copy,
  FilePlus2,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { aiProjectsApi, type AiProjectListRow } from "@/lib/aiProjectsApi";
import {
  socialManagerApi,
  type SocialActivity,
  type SocialContent,
  type SocialSnapshot,
} from "@/lib/socialManagerApi";
import {
  socialChannels,
  socialDateEpoch,
  socialDateInput,
  socialDraftSchema,
  socialStatusLabels as labels,
  type SocialDraftInput,
  type SocialView,
} from "@/shared/socialEditorial";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const field =
  "w-full min-h-10 min-w-0 rounded-xl border border-white/15 bg-[#090f20] px-3 py-2.5 text-base text-slate-100 sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-400";
const date = (at: number | null | undefined) =>
  at
    ? new Intl.DateTimeFormat("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(at)
    : "Fără dată";
const strings = (raw: string) => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const metadata = (item: SocialContent) => {
  try {
    return JSON.parse(item.source_metadata_json || "{}") as {
      variants?: {
        channel: string;
        account?: string;
        placement?: string;
        caption: string;
      }[];
      assetIds?: string[];
      qa?: string;
      assetState?: string;
      pendingAssets?: { id: string }[];
      placements?: {
        account: string;
        placement: string;
        status: string;
        evidence?: string;
      }[];
    };
  } catch {
    return {};
  }
};
const blocked = (code: string | null | undefined) =>
  ({
    stale_generation_attempts_exhausted:
      "Pregătirea anterioară s-a întrerupt. Poți reutiliza un material sau relua activitatea.",
    free_model_route_unavailable:
      "Resursa gratuită nu este disponibilă. Continuă cu materialele existente sau pregătirea Codex.",
    preparation_failed: "Pregătirea a eșuat. Verifică resursele și reîncearcă.",
    codex_review_required:
      "Analiză read-only pentru Codex; nu există încă propuneri de aprobat.",
  })[code || ""] || "Resursa AI sau bugetul existent necesită verificare.";
type Decision = "draft" | "pending_approval" | "approved" | "rejected";
type Command = {
  type:
    | "approved"
    | "rejected"
    | "retry"
    | "sync"
    | "plan"
    | "archive"
    | "reuse"
    | "reschedule";
  title: string;
  job?: SocialActivity;
  item?: SocialContent;
  returnToUpcoming?: boolean;
  key: string;
};
const views: { id: SocialView; label: string }[] = [
  { id: "focus", label: "Acum · 24h" },
  { id: "upcoming", label: "Viitoare" },
  { id: "library", label: "Reutilizabile" },
  { id: "history", label: "Istoric" },
];
export default function SocialMediaManagerTab() {
  const [projects, setProjects] = useState<AiProjectListRow[]>([]),
    [slug, setSlug] = useState("avyron-web");
  const [view, setView] = useState<SocialView>("focus"),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [data, setData] = useState<SocialSnapshot | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<SocialContent | null>(null),
    [decision, setDecision] = useState<Decision | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  const [upcoming, setUpcoming] = useState(false),
    [toolsOpen, setToolsOpen] = useState(false),
    [strategy, setStrategy] = useState(false),
    [command, setCommand] = useState<Command | null>(null),
    [commandConfirmed, setCommandConfirmed] = useState(false),
    [rescheduleAt, setRescheduleAt] = useState("");
  const [editor, setEditor] = useState<{
    item?: SocialContent;
    initial?: SocialDraftInput;
    key: string;
  } | null>(null);
  const sequence = useRef(0),
    alive = useRef(true),
    upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void aiProjectsApi
      .list()
      .then((r) => {
        if (!active) return;
        setProjects(r.data);
        if (r.data.length && !r.data.some((p) => p.slug === "avyron-web"))
          setSlug(r.data[0].slug);
      })
      .catch(() => {
        if (active) setError("Lista proiectelor nu a putut fi încărcată.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    async (offset = 0) => {
      const current = ++sequence.current;
      setLoading(true);
      setError("");
      try {
        const next = await socialManagerApi.snapshot(
          slug,
          filter,
          offset,
          view,
          query,
        );
        if (alive.current && current === sequence.current)
          setData((old) =>
            offset && old
              ? { ...next, content: [...old.content, ...next.content] }
              : next,
          );
      } catch (e) {
        if (alive.current && current === sequence.current)
          setError(
            e instanceof Error
              ? e.message
              : "Datele editoriale nu pot fi încărcate.",
          );
      } finally {
        if (alive.current && current === sequence.current) setLoading(false);
      }
    },
    [slug, filter, view, query],
  );
  useEffect(() => {
    alive.current = true;
    setData(null);
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("avyron:approvals-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("avyron:approvals-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  useEffect(() => {
    setSelected(null);
    setCommand(null);
    setEditor(null);
    setUpcoming(false);
  }, [slug]);
  const changed = async () => {
    window.dispatchEvent(new Event("avyron:approvals-changed"));
    await load();
  };
  const review = (item: SocialContent, next: Decision | null) => {
    setUpcoming(false);
    setSelected(item);
    setDecision(next);
    setConfirmed(false);
  };
  const save = async () => {
    if (!data || !selected || !decision || !confirmed || busy) return;
    setBusy(true);
    try {
      await aiProjectsApi.updateContent(
        data.project.id,
        selected.id,
        decision,
        selected.updated_at,
      );
      setSelected(null);
      toast.success(
        decision === "approved"
          ? "Aprobarea versiunii a fost salvată."
          : "Decizia editorială a fost salvată.",
      );
      await changed();
    } catch (e) {
      toast.error((e as Error).message);
      await load();
    } finally {
      setBusy(false);
    }
  };
  const requestCommand = (next: Omit<Command, "key" | "returnToUpcoming">) => {
    setCommand({
      ...next,
      key: crypto.randomUUID(),
      returnToUpcoming: upcoming,
    });
    setCommandConfirmed(false);
    setRescheduleAt(socialDateInput(Date.now() + 86400000));
    setUpcoming(false);
    setSelected(null);
  };
  const executeCommand = async () => {
    if (!data || !command || !commandConfirmed || busy) return;
    setBusy(true);
    try {
      if (command.type === "sync") await socialManagerApi.sync(data.project.id);
      if (command.type === "plan")
        await aiProjectsApi.runSocialPlan(data.project.id);
      if (command.type === "archive")
        await socialManagerApi.archive(data.project.id);
      if (command.type === "retry" && command.job)
        await aiProjectsApi.retrySocialJob(
          data.project.id,
          command.job.id,
          command.job.updated_at,
        );
      if (
        (command.type === "approved" || command.type === "rejected") &&
        command.job
      )
        await socialManagerApi.reviewPlan(
          data.project.id,
          command.job.id,
          command.type,
          command.job.updated_at,
        );
      if (command.type === "reschedule" && command.job) {
        const at = socialDateEpoch(rescheduleAt);
        if (!at || at <= Date.now())
          throw Error(
            "Alege o dată viitoare validă, în fusul Europe/Bucharest.",
          );
        await socialManagerApi.reschedule(
          data.project.id,
          command.job.id,
          at,
          command.job.updated_at,
        );
      }
      if (command.type === "reuse" && command.item) {
        await socialManagerApi.reuse(
          data.project.id,
          command.item,
          command.key,
        );
        setView("focus");
        setFilter("all");
      }
      const reopen = command.returnToUpcoming;
      setCommand(null);
      if (reopen) setUpcoming(true);
      toast.success("Comanda a fost salvată în proiect.");
      await changed();
    } catch (e) {
      toast.error((e as Error).message);
      await load();
    } finally {
      setBusy(false);
    }
  };
  const saveDraft = async (draft: SocialDraftInput) => {
    if (!data || !editor) throw Error("Proiect indisponibil.");
    if (editor.item) {
      await socialManagerApi.edit(
        data.project.id,
        editor.item.id,
        draft,
        editor.item.updated_at,
      );
    } else await socialManagerApi.create(data.project.id, draft, editor.key);
    setEditor(null);
    setView("focus");
    setFilter("all");
    toast.success(
      draft.requestApproval
        ? "Material salvat pentru aprobare."
        : "Ciorna a fost salvată.",
    );
    await changed();
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 196608)
        throw Error(
          "Pachetul JSON este prea mare. Importă metadatele, cu resursele păstrate în biblioteca privată.",
        );
      const raw: unknown = JSON.parse(await file.text());
      const payload =
        raw && typeof raw === "object" && "draft" in raw
          ? (raw as { draft: unknown }).draft
          : raw;
      const parsed = socialDraftSchema.safeParse(payload);
      if (!parsed.success)
        throw Error(
          "Pachet editorial invalid. Folosește formatul de handoff Codex al proiectului.",
        );
      setEditor({ initial: parsed.data, key: crypto.randomUUID() });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (upload.current) upload.current.value = "";
    }
  };
  const contentById = new Map(
    [...(data?.activityContent || []), ...(data?.content || [])].map((item) => [
      item.id,
      item,
    ]),
  );
  const jobs = (data?.activities || []).filter(
    (job) =>
      !job.content_id ||
      !data?.content.some((item) => item.id === job.content_id),
  );
  const pending =
    (data?.counts.draft || 0) + (data?.counts.pending_approval || 0);
  const contentActions = (item: SocialContent) => {
    const fresh =
      item.expires_at > Date.now() &&
      !item.archived_at &&
      (data?.project.slug !== "avyron-web" ||
        item.created_at > Date.now() - 3 * 86400000);
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => review(item, null)}>
          Previzualizează
        </Button>
        {data?.permission.canCreate &&
          ["draft", "pending_approval", "rejected"].includes(item.status) &&
          fresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelected(null);
                setUpcoming(false);
                setEditor({ item, key: crypto.randomUUID() });
              }}
            >
              Editează
            </Button>
          )}
        {data?.permission.canCreate && item.status === "draft" && fresh && (
          <Button size="sm" onClick={() => review(item, "pending_approval")}>
            Trimite la aprobare
          </Button>
        )}
        {data?.permission.canReview &&
          item.status === "pending_approval" &&
          fresh && (
            <Button size="sm" onClick={() => review(item, "approved")}>
              <CheckCircle2 className="mr-1 size-4" />
              Aprobă
            </Button>
          )}
        {data?.permission.canReview &&
          ["draft", "pending_approval"].includes(item.status) &&
          fresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => review(item, "rejected")}
            >
              <XCircle className="mr-1 size-4" />
              Respinge
            </Button>
          )}
        {data?.permission.canCreate && item.status === "rejected" && fresh && (
          <Button size="sm" onClick={() => review(item, "draft")}>
            Reia ciorna
          </Button>
        )}
        {data?.permission.canCreate &&
          !["published", "scheduled"].includes(item.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                requestCommand({
                  type: "reuse",
                  title: "Reutilizează materialul",
                  item,
                })
              }
            >
              <Copy className="mr-1 size-4" />
              Reutilizează
            </Button>
          )}
      </div>
    );
  };
  const jobCard = (job: SocialActivity) => {
    const item = job.content_id ? contentById.get(job.content_id) : null;
    const noMaterial = !job.content_id && !job.blog_post_id;
    return (
      <article
        key={job.id}
        className="min-w-0 rounded-xl border border-white/10 bg-white/[.025] p-3.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold">{job.topic}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {date(job.due_at)} ·{" "}
              {job.primary_channel === "multi"
                ? "Mai multe canale"
                : job.primary_channel}
            </p>
          </div>
          <Status value={job.status} />
        </div>
        {noMaterial && (
          <p className="mt-2 text-xs text-slate-400">
            {job.kind === "engagement_review"
              ? "Analiză Codex read-only; propunerile reale se verifică separat."
              : "Temă planificată. Materialul nu a fost încă pregătit."}
          </p>
        )}
        {job.last_error_code && (
          <p className="mt-2 text-xs text-amber-200">
            {blocked(job.last_error_code)}
          </p>
        )}
        {job.plan_review_state === "approved" && (
          <p className="mt-2 text-xs text-emerald-300">
            Plan aprobat · materialul necesită decizie separată.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {item && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => review(item, null)}
            >
              Vezi materialul
            </Button>
          )}
          {item?.status === "pending_approval" &&
            data?.permission.canReview && (
              <Button size="sm" onClick={() => review(item, "approved")}>
                Aprobă materialul
              </Button>
            )}
          {item &&
            ["draft", "pending_approval"].includes(item.status) &&
            data?.permission.canReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => review(item, "rejected")}
              >
                Respinge materialul
              </Button>
            )}
          {item?.status === "draft" && data?.permission.canCreate && (
            <Button size="sm" onClick={() => review(item, "pending_approval")}>
              Trimite materialul la aprobare
            </Button>
          )}
          {noMaterial &&
            job.kind !== "engagement_review" &&
            job.plan_review_state !== "rejected" &&
            !job.archived_at &&
            ["queued", "awaiting_budget", "failed"].includes(job.status) &&
            data?.permission.canReview && (
              <>
                {job.plan_review_state !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      requestCommand({
                        type: "approved",
                        title: job.topic,
                        job,
                      })
                    }
                  >
                    Aprobă planul
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    requestCommand({ type: "rejected", title: job.topic, job })
                  }
                >
                  Respinge planul
                </Button>
              </>
            )}
          {noMaterial &&
            job.status !== "generating" &&
            data?.permission.canReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  requestCommand({
                    type: "reschedule",
                    title: "Mută activitatea",
                    job,
                  })
                }
              >
                Schimbă data
              </Button>
            )}
          {noMaterial &&
            !job.archived_at &&
            ["failed", "awaiting_budget"].includes(job.status) &&
            data?.permission.canReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  requestCommand({ type: "retry", title: job.topic, job })
                }
              >
                Reîncearcă pregătirea
              </Button>
            )}
          {job.blog_post_id && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/intern/ai-projects/${encodeURIComponent(slug)}`}>
                Revizuiește articolul în studio
              </Link>
            </Button>
          )}
        </div>
      </article>
    );
  };
  return (
    <div className="space-y-4 text-slate-100">
      <header className="rounded-2xl border border-violet-300/15 bg-gradient-to-r from-violet-500/10 via-[#101629] to-cyan-400/5 p-3 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-violet-200/70">
              AVYRON · studio editorial
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold">
              Manager Social Media
            </h1>
            <p className="mt-1 hidden text-sm text-slate-400 sm:block">
              Materiale reale, decizii clare și următorul pas al fiecărei
              activități.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => void load()}
              aria-label="Actualizează"
            >
              <RefreshCw
                className={`mr-1 size-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualizează</span>
            </Button>
            {data?.permission.canCreate && (
              <Button onClick={() => setEditor({ key: crypto.randomUUID() })}>
                <FilePlus2 className="mr-1 size-4" />
                Adaugă material
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
          <label className="text-xs text-slate-300">
            Proiect social
            <select
              className={field + " mt-1"}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {projects.length ? (
                projects.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}
                  </option>
                ))
              ) : (
                <option value="avyron-web">AVYRON WEB</option>
              )}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            <span className="sm:hidden">Caută material</span>
            <span className="hidden sm:inline">
              Caută în materiale și activități
            </span>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" />
              <input
                aria-label="Caută în materiale și activități"
                className={field + " pl-9"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titlu, subiect sau text…"
              />
            </div>
          </label>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/20 p-3 text-sm text-amber-200"
        >
          {error}{" "}
          <button className="underline" onClick={() => void load()}>
            Reîncearcă
          </button>
        </div>
      )}
      {!data && loading && (
        <p role="status" className="p-3 text-sm text-slate-400">
          Se încarcă agenda editorială…
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="De revizuit" value={pending} />
            <Metric label="Aprobate" value={data.counts.approved || 0} />
            <button
              className="min-w-0 rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-left hover:bg-cyan-400/10"
              aria-expanded={upcoming}
              aria-label="Activități viitoare"
              onClick={() => setUpcoming(true)}
            >
              <span className="flex flex-wrap items-center gap-1 text-xs text-cyan-200">
                <CalendarClock className="hidden size-4 sm:block" />
                <span className="sm:hidden">Viitoare</span>
                <span className="hidden sm:inline">Activități viitoare</span>
              </span>
              <span className="mt-1 block text-xl font-semibold">
                {data.activities.length + (data.scheduled?.length || 0)}
              </span>
            </button>
          </div>
          <section
            aria-label="Agenda editorială"
            className="rounded-2xl border border-white/10 bg-[#10162a]/70 p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Vizualizare editorială"
                className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto pb-1 sm:w-auto"
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const current = views.findIndex((v) => v.id === view),
                    index =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? views.length - 1
                          : (current +
                              (e.key === "ArrowRight" ? 1 : -1) +
                              views.length) %
                            views.length;
                  setView(views[index].id);
                  setFilter("all");
                  const tabs = e.currentTarget.querySelectorAll<HTMLButtonElement>("button[role=tab]");
                  tabs[index]?.focus();
                }}
              >
                {views.map((v) => (
                  <button
                    key={v.id}
                    role="tab"
                    tabIndex={view === v.id ? 0 : -1}
                    aria-selected={view === v.id}
                    className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl px-3 text-sm ${view === v.id ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/30" : "text-slate-400 hover:bg-white/5"}`}
                    onClick={() => {
                      setView(v.id);
                      setFilter("all");
                    }}
                  >
                    {v.label}
                    {v.id === "library" && data.summary?.reusable
                      ? ` · ${data.summary.reusable}`
                      : ""}
                  </button>
                ))}
              </div>
              <label className="flex w-full items-center gap-2 text-xs text-slate-300 sm:w-auto">
                Stare editorială
                <select
                  className={field + " flex-1 sm:w-auto"}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Toate stările</option>
                  {[
                    "draft",
                    "pending_approval",
                    "approved",
                    "scheduled",
                    "published",
                    "rejected",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {labels[s]} · {data.counts[s] || 0}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
              <p className="text-xs text-slate-400">
                {view === "focus"
                  ? "Neaprobate și viitoare · 24h"
                  : view === "library"
                    ? "Surse păstrate pentru reutilizare; fiecare reluare primește o ciornă nouă."
                    : view === "history"
                      ? "Activități retrase din lista activă și rezultate anterioare."
                      : "Activități și materiale cu o dată viitoare."}{" "}
                <span className="hidden sm:inline">· Europe/Bucharest</span>
              </p>
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                Actualizat {date(data.generatedAt)}
              </span>
            </div>
            <Button
              className="mt-2 sm:hidden"
              size="sm"
              variant="outline"
              aria-expanded={toolsOpen}
              aria-controls="social-editorial-tools"
              onClick={() => setToolsOpen((v) => !v)}
            >
              Instrumente și sincronizare
            </Button>
            <div
              id="social-editorial-tools"
              className={`mt-3 ${toolsOpen ? "flex" : "hidden"} flex-wrap gap-2 sm:flex`}
            >
              {data.permission.canReview && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    requestCommand({
                      type: "sync",
                      title: "Sincronizează stările proiectului",
                    })
                  }
                >
                  Sincronizează stările
                </Button>
              )}
              {data.permission.canPlan && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    requestCommand({
                      type: "plan",
                      title: "Actualizează planul editorial",
                    })
                  }
                >
                  Actualizează planul
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStrategy(true)}
              >
                <Sparkles className="mr-1 size-4" />
                Strategie și agent
              </Button>
              {data.permission.canCreate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => upload.current?.click()}
                >
                  <Upload className="mr-1 size-4" />
                  Importă pachet Codex
                </Button>
              )}
              {data.permission.canReview && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    requestCommand({
                      type: "archive",
                      title: "Curăță activitățile trecute",
                    })
                  }
                >
                  <Archive className="mr-1 size-4" />
                  Curăță lista
                </Button>
              )}
              <input
                ref={upload}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-label="Pachet editorial JSON"
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </div>
            {!data.permission.canReview && (
              <p className="mt-3 text-xs text-amber-200">
                Decizia finală aparține responsabilului autorizat al
                proiectului.
              </p>
            )}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.content.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-xl border border-white/10 bg-white/[.025] p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-violet-200/70">
                        {item.format} ·{" "}
                        {strings(item.channels_json).join(" · ")}
                        {item.source_revision
                          ? ` · ${item.source_revision}`
                          : ""}
                      </p>
                      <h3 className="mt-1 break-words font-semibold">
                        {item.title}
                      </h3>
                    </div>
                    <Status value={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-400">
                    {item.caption}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.scheduled_at
                      ? `Țintă: ${date(item.scheduled_at)}`
                      : `Pregătit: ${date(item.created_at)}`}
                    {item.reusable ? " · Păstrat în Reutilizabile" : ""}
                  </p>
                  {contentActions(item)}
                </article>
              ))}
            </div>
            {!data.content.length && !error && (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                <p>Nu există materiale pentru starea selectată.</p>
                <p className="mt-1 text-xs">
                  {data.activities.length
                    ? "Planificarea apare mai jos. O temă fără material nu este o ciornă aprobată."
                    : "Adaugă un material real sau importă pachetul Codex pentru a începe."}
                </p>
              </div>
            )}
            {data.nextOffset !== null && (
              <Button
                className="mt-3"
                variant="outline"
                disabled={loading}
                onClick={() => void load(data.nextOffset!)}
              >
                Încarcă următoarele
              </Button>
            )}
            {!!jobs.length && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <h2 className="mb-3 text-sm font-semibold">
                  Planificare și producție{" "}
                  <span className="text-slate-500">· {jobs.length}</span>
                </h2>
                <div className="grid gap-2 lg:grid-cols-2">
                  {jobs.map(jobCard)}
                </div>
              </div>
            )}
            <Button asChild variant="link" className="mt-3">
              <Link to={`/intern/ai-projects/${encodeURIComponent(slug)}`}>
                Deschide studioul proiectului
                <ArrowUpRight className="ml-1 size-4" />
              </Link>
            </Button>
          </section>
        </>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.title || "Revizuire material"}</DialogTitle>
            <DialogDescription>
              {selected && labels[selected.status]} ·{" "}
              {selected && strings(selected.channels_json).join(" · ")} ·{" "}
              {selected && date(selected.scheduled_at || selected.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {selected.caption}
              </div>
              {selected.visual_direction && (
                <p className="whitespace-pre-wrap break-words text-sm text-slate-400">
                  Direcție vizuală: {selected.visual_direction}
                </p>
              )}
              {selected.cta && (
                <p className="break-words text-sm">Îndemn: {selected.cta}</p>
              )}
              <p className="break-words text-xs text-slate-400">
                {strings(selected.hashtags_json).join(" · ")}
              </p>
              <MaterialResources
                projectId={data?.project.id || ""}
                item={selected}
              />
              {!decision && contentActions(selected)}
            </>
          )}
          {decision && (
            <div className="space-y-3 border-t border-white/10 pt-3">
              <p className="text-xs text-slate-400">
                Decizia vizează această versiune editorială. Programarea și
                publicarea se verifică separat, pentru conturile și
                placement-urile aprobate.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  className="mt-1 size-4 accent-violet-500"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Am verificat textul, canalele și versiunea prezentată.
              </label>
              <Button disabled={!confirmed || busy} onClick={() => void save()}>
                {busy
                  ? "Se salvează…"
                  : decision === "approved"
                    ? "Confirmă aprobarea"
                    : decision === "rejected"
                      ? "Confirmă respingerea"
                      : decision === "draft"
                        ? "Reia ciorna"
                        : "Confirmă trimiterea la aprobare"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={upcoming} onOpenChange={setUpcoming}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Activități viitoare și în lucru</DialogTitle>
            <DialogDescription>
              Agenda reală a proiectului. Tema, materialul, aprobarea și
              publicarea au stări distincte.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              Actualizează lista
            </Button>
            {data?.permission.canReview && (
              <Button
                variant="outline"
                onClick={() =>
                  requestCommand({
                    type: "sync",
                    title: "Sincronizează stările proiectului",
                  })
                }
              >
                Sincronizează stările
              </Button>
            )}
            {data?.permission.canPlan && (
              <Button
                onClick={() =>
                  requestCommand({
                    type: "plan",
                    title: "Actualizează planul editorial",
                  })
                }
              >
                Actualizează planul
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {data?.activities.map(jobCard)}
            {!data?.activities.length && (
              <p className="text-sm text-slate-400">
                Nu există activități în coada curentă.
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Până la 60 de activități în vizualizarea curentă; istoricul este
            separat.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!command}
        onOpenChange={(open) => {
          if (!open && !busy) setCommand(null);
        }}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{command?.title}</DialogTitle>
            <DialogDescription>
              {command?.type === "archive"
                ? "Activitățile mai vechi de 24h ies din coada activă. Materialele și istoricul rămân disponibile."
                : command?.type === "reuse"
                  ? "Se creează o ciornă nouă din materialul existent, fără regenerare sau copierea fișierelor. Necesită o decizie nouă."
                  : command?.type === "approved"
                    ? "Confirmă tema și calendarul. Materialul rezultat va fi revizuit separat."
                    : command?.type === "rejected"
                      ? "Activitatea va fi oprită."
                      : command?.type === "retry"
                        ? "Activitatea revine în coada existentă; bugetul gratuit și aprobările sunt reverificate."
                        : "Se actualizează doar planul sau stările, fără publicare și fără generare AI din această comandă."}
            </DialogDescription>
          </DialogHeader>
          {command?.job && (
            <p className="text-sm">
              {command.job.primary_channel} · {date(command.job.due_at)}
            </p>
          )}
          {command?.type === "reschedule" && (
            <label className="text-sm">
              Data nouă · Europe/Bucharest
              <input
                type="datetime-local"
                className={field + " mt-1"}
                value={rescheduleAt}
                onChange={(e) => setRescheduleAt(e.target.value)}
              />
            </label>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-violet-500"
              checked={commandConfirmed}
              onChange={(e) => setCommandConfirmed(e.target.checked)}
            />
            Am verificat activitatea și confirm comanda.
          </label>
          <Button
            disabled={!commandConfirmed || busy}
            onClick={() => void executeCommand()}
          >
            {busy ? "Se salvează…" : "Confirmă comanda"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.item ? "Editează materialul" : "Material editorial nou"}
            </DialogTitle>
            <DialogDescription>
              Completează textul și canalele. Păstrează resursele existente și
              trimite versiunea exactă la aprobare.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <DraftEditor
              key={editor.key}
              item={editor.item}
              initial={editor.initial}
              onSave={saveDraft}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={strategy} onOpenChange={setStrategy}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Strategie și agent</DialogTitle>
            <DialogDescription>
              Politica și starea citite din proiect. O configurație activă nu
              confirmă o publicare sau o sesiune Codex online.
            </DialogDescription>
          </DialogHeader>
          {data?.integration ? (
            <>
              <p className="text-sm font-semibold">
                {data.integration.policy?.strategy.objective ||
                  "Strategia se configurează în studioul proiectului."}
              </p>
              <p className="text-sm text-slate-400">
                {data.integration.policy?.strategy.cadence}
              </p>
              <div className="flex flex-wrap gap-2">
                {data.integration.policy?.strategy.pillars?.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-300">
                Următorul pas:{" "}
                {data.integration.policy?.strategy.nextAction ||
                  "Pregătește și salvează materialul real."}
              </p>
              <p className="text-sm text-slate-400">
                Măsurare:{" "}
                {data.integration.policy?.strategy.measurement ||
                  "Rezultatele se înregistrează numai când există dovezi."}
              </p>
              <div className="rounded-xl border border-white/10 p-3 text-sm">
                <p>
                  {data.integration.agent?.name || "Agent neconfigurat"} · v
                  {data.integration.agent?.current_version || "—"} ·{" "}
                  {data.integration.agent?.status || "necunoscut"}
                </p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  {data.integration.agent?.model}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Ultimul handoff salvat:{" "}
                  {date(data.integration.handoff.lastHandoffAt)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Operator Codex:{" "}
                  {data.integration.operators.some((o) => o.status === "active")
                    ? "asociere activă; sesiunea se verifică separat"
                    : "neasociat"}
                </p>
              </div>
              <div className="space-y-1">
                {data.integration.channels.map((ch) => (
                  <p
                    className="flex flex-wrap justify-between gap-2 text-xs text-slate-400"
                    key={ch.provider}
                  >
                    <span>
                      {ch.provider} · {ch.account_label || "cont neprecizat"}
                    </span>
                    <span>
                      {ch.verified_status === "connected" &&
                      ch.connection_status === "connected"
                        ? "Conexiune verificată"
                        : "Publicare manuală / conexiune neverificată"}
                    </span>
                  </p>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Aprobarea din Codex și cea din dashboard folosesc același ID și
                aceeași revizie. Operatorul nu își aprobă singur materialele.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Datele agentului nu sunt disponibile. Reîncarcă sau consultă
              studioul proiectului.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${value === "pending_approval" ? "border-amber-300/20 bg-amber-400/10 text-amber-200" : value === "approved" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-300"}`}
    >
      {labels[value] || value}
    </span>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-[#10162a]/70 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
function DraftEditor({
  item,
  initial,
  onSave,
}: {
  item?: SocialContent;
  initial?: SocialDraftInput;
  onSave: (draft: SocialDraftInput) => Promise<void>;
}) {
  const meta = item ? metadata(item) : {};
  const [draft, setDraft] = useState<SocialDraftInput>(
    () =>
      initial || {
        title: item?.title || "",
        caption: item?.caption || "",
        format: item?.format || "post",
        objective: item?.objective || "visibility",
        channels: item
          ? (strings(item.channels_json) as SocialDraftInput["channels"])
          : ["instagram", "facebook"],
        visualDirection: item?.visual_direction || "",
        cta: item?.cta || "",
        hashtags: item ? strings(item.hashtags_json) : [],
        reusable: item ? !!item.reusable : true,
        variants: meta.variants as SocialDraftInput["variants"],
      },
  );
  const [at, setAt] = useState(() =>
      socialDateInput(item?.scheduled_at || initial?.scheduledAt || Date.now()),
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const submit = async (requestApproval: boolean) => {
    const scheduledAt = socialDateEpoch(at);
    const parsed = socialDraftSchema.safeParse({
      ...draft,
      scheduledAt,
      requestApproval,
    });
    if (!parsed.success || !scheduledAt) {
      setError(
        "Completează titlul, cel puțin 10 caractere de text, canalele și o dată validă.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(parsed.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
    >
      <label className="block text-sm">
        Titlu
        <input
          required
          maxLength={180}
          className={field + " mt-1"}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Format
          <select
            className={field + " mt-1"}
            value={draft.format}
            onChange={(e) =>
              setDraft({
                ...draft,
                format: e.target.value as SocialDraftInput["format"],
              })
            }
          >
            {["post", "carousel", "story", "reel", "article", "message"].map(
              (v) => (
                <option key={v} value={v}>
                  {
                    {
                      post: "Postare",
                      carousel: "Carusel",
                      story: "Story / Status",
                      reel: "Reel",
                      article: "Articol",
                      message: "Mesaj",
                    }[v]
                  }
                </option>
              ),
            )}
          </select>
        </label>
        <label className="text-sm">
          Data vizată · Europe/Bucharest
          <input
            required
            type="datetime-local"
            className={field + " mt-1"}
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm">Canale</legend>
        <div className="flex flex-wrap gap-2">
          {socialChannels.map((channel) => (
            <label
              key={channel}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs"
            >
              <input
                type="checkbox"
                className="accent-violet-500"
                checked={draft.channels.includes(channel)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    channels: e.target.checked
                      ? [...draft.channels, channel]
                      : draft.channels.filter((c) => c !== channel),
                  })
                }
              />
              {channel}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        Text / caption
        <textarea
          required
          minLength={10}
          rows={7}
          maxLength={8000}
          className={field + " mt-1 resize-y"}
          value={draft.caption}
          onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Îndemn / CTA
        <input
          className={field + " mt-1"}
          maxLength={500}
          value={draft.cta || ""}
          onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Direcție vizuală / resurse
        <textarea
          rows={2}
          maxLength={4000}
          className={field + " mt-1"}
          value={draft.visualDirection || ""}
          onChange={(e) =>
            setDraft({ ...draft, visualDirection: e.target.value })
          }
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-violet-500"
          checked={draft.reusable ?? true}
          onChange={(e) => setDraft({ ...draft, reusable: e.target.checked })}
        />
        Păstrează în materialele reutilizabile
      </label>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Editarea redeschide ciorna și elimină aprobarea versiunii curente. Nu
        publică automat.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Se salvează…" : "Salvează pentru aprobare"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void submit(false)}
        >
          Salvează ciorna
        </Button>
      </div>
    </form>
  );
}
function MaterialResources({
  projectId,
  item,
}: {
  projectId: string;
  item: SocialContent;
}) {
  const meta = metadata(item),
    [images, setImages] = useState<{ id: string; url: string }[]>([]),
    [visibleFrames, setVisibleFrames] = useState(3);
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    setImages([]);
    void Promise.all(
      (metadata(item).assetIds || [])
        .slice(0, visibleFrames)
        .map(async (id) => {
          try {
            const response = await socialManagerApi.asset(projectId, id);
            if (
              !response.ok ||
              !response.headers.get("content-type")?.startsWith("image/")
            )
              return null;
            const url = URL.createObjectURL(await response.blob());
            urls.push(url);
            return { id, url };
          } catch {
            return null;
          }
        }),
    ).then((rows) => {
      if (active)
        setImages(rows.filter((x): x is { id: string; url: string } => !!x));
      else urls.forEach((url) => URL.revokeObjectURL(url));
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [projectId, item, visibleFrames]);
  return (
    <div className="space-y-3">
      {meta.assetState === "awaiting_r2_authorization" && (
        <p
          role="status"
          className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-xs text-amber-200"
        >
          {meta.pendingAssets?.length || 0} fișiere vizuale verificate rămân
          locale. Sincronizarea imaginilor necesită autorizarea scrierii în R2;
          aici este disponibil textul editorial.
        </p>
      )}
      {!!images.length && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image, i) => (
            <a
              key={image.id}
              href={image.url}
              download={`avyron-cadru-${i + 1}.png`}
              className="rounded-xl border border-white/10 p-2 text-xs text-violet-200"
            >
              <img
                src={image.url}
                alt={`Material AVYRON, cadrul ${i + 1}`}
                className="mb-2 max-h-60 w-full rounded-lg object-contain"
              />
              Descarcă cadrul {i + 1}
            </a>
          ))}
        </div>
      )}
      {(meta.assetIds?.length || 0) > visibleFrames && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setVisibleFrames((n) => n + 3)}
        >
          Arată următoarele cadre
        </Button>
      )}
      {meta.variants?.map((v, i) => (
        <details key={i} className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-sm">
            {v.channel} · {v.account || "cont de verificat"} ·{" "}
            {v.placement || "feed"}
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
            {v.caption}
          </p>
        </details>
      ))}
      {meta.placements?.map((p, i) => (
        <p key={i} className="break-words text-xs text-slate-400">
          {p.account} · {p.placement} · {p.status}
          {p.evidence ? ` — ${p.evidence}` : ""}
        </p>
      ))}
      {meta.qa && <p className="text-xs text-slate-400">QA: {meta.qa}</p>}
    </div>
  );
}
