import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  aiProjectsApi,
  type AiContentItem,
  type AiProjectListRow,
} from "@/lib/aiProjectsApi";
import { socialManagerApi, type SocialSnapshot } from "@/lib/socialManagerApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const labels: Record<string, string> = {
  draft: "Ciornă",
  pending_approval: "Așteaptă aprobarea",
  approved: "Aprobat",
  scheduled: "Programat",
  published: "Publicat",
  rejected: "Respins",
  queued: "În coadă",
  generating: "În pregătire",
  draft_ready: "Ciornă pregătită",
  awaiting_budget: "Așteaptă buget autorizat",
  awaiting_approval: "Așteaptă aprobarea",
  failed: "Eșuat",
  completed: "Finalizat",
  skipped: "Oprit",
};
const field =
  "w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2 text-sm text-slate-100";
const values = (raw: string) => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string").join(" · ")
      : "";
  } catch {
    return "";
  }
};
type Decision = "draft" | "pending_approval" | "approved" | "rejected";
export default function SocialMediaManagerTab() {
  const [projects, setProjects] = useState<AiProjectListRow[]>([]),
    [slug, setSlug] = useState("avyron-web"),
    [filter, setFilter] = useState("review");
  const [data, setData] = useState<SocialSnapshot | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<AiContentItem | null>(null),
    [decision, setDecision] = useState<Decision | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [upcoming, setUpcoming] = useState(false);
  const sequence = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    let active = true;
    void aiProjectsApi
      .list()
      .then((r) => {
        if (active) {
          setProjects(r.data);
          if (r.data.length && !r.data.some((p) => p.slug === "avyron-web"))
            setSlug(r.data[0].slug);
        }
      })
      .catch(() => {
        if (active) setError("Lista proiectelor nu a putut fi încărcată.");
      });
    return () => {
      active = false;
    };
  }, []);
  const load = useCallback(
    async (offset = 0) => {
      const current = ++sequence.current;
      setLoading(true);
      setError("");
      try {
        const next = await socialManagerApi.snapshot(slug, filter, offset);
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
    [slug, filter],
  );
  useEffect(() => {
    alive.current = true;
    setData(null);
    setSelected(null);
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
  const review = (item: AiContentItem, next: Decision | null) => {
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
          ? "Aprobarea a fost salvată. Publicarea se verifică separat."
          : "Starea editorială a fost actualizată.",
      );
      window.dispatchEvent(new Event("avyron:approvals-changed"));
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Decizia nu a fost salvată.",
      );
      await load();
    } finally {
      setBusy(false);
    }
  };
  const scheduled = new Set(data?.scheduled.map((item) => item.id));
  const activities = [
    ...(data?.activities
      .filter((job) => !job.content_id || !scheduled.has(job.content_id))
      .map((job) => ({
        id: "job-" + job.id,
        title: job.topic,
        status: job.status,
        at: job.due_at,
        channel: job.primary_channel,
        error: job.last_error_code,
      })) || []),
    ...(data?.scheduled.map((item) => ({
      id: "content-" + item.id,
      title: item.title,
      status: item.status,
      at: item.scheduled_at || 0,
      channel: values(item.channels_json),
      error: null,
    })) || []),
  ].sort((a, b) => a.at - b.at);
  const pending =
    (data?.counts.draft || 0) + (data?.counts.pending_approval || 0);
  return (
    <div className="space-y-4 text-slate-100">
      <header className="rounded-2xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-500/[0.13] via-[#11182d] to-cyan-400/[0.07] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/70">
              AI AVY Prod · control editorial
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold">
              Manager Social Media
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Revizuiește materialele, confirmă deciziile și urmărește
              activitățile proiectului.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw
              className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualizează
          </Button>
        </div>
        <label className="mt-4 block max-w-lg text-xs text-slate-300">
          Proiect social
          <select
            className={field + " mt-1"}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            {projects.length ? (
              projects.map((project) => (
                <option key={project.id} value={project.slug}>
                  {project.name}
                </option>
              ))
            ) : (
              <option value="avyron-web">AVYRON WEB</option>
            )}
          </select>
        </label>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-400/20 p-3 text-sm text-amber-200"
        >
          {error}{" "}
          <button className="underline" onClick={() => void load()}>
            Reîncearcă
          </button>
        </p>
      )}
      {!data && loading && (
        <p role="status">Se sincronizează datele proiectului…</p>
      )}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="De revizuit" value={pending} />
            <Metric label="Aprobate" value={data.counts.approved || 0} />
            <button
              type="button"
              aria-expanded={upcoming}
              aria-controls="social-upcoming"
              onClick={() => setUpcoming(true)}
              className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] p-4 text-left hover:bg-cyan-400/10"
            >
              <p className="flex items-center gap-2 text-xs text-cyan-200">
                <CalendarClock className="size-4" />
                Activități viitoare
              </p>
              <p className="mt-2 text-2xl font-semibold">{activities.length}</p>
              <p className="mt-1 text-xs text-slate-400">
                Deschide planul și activitățile în lucru
              </p>
            </button>
          </div>
          <section className="rounded-2xl border border-white/10 bg-[#10162a]/90 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Materiale și decizii
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Citit {new Date(data.generatedAt).toLocaleTimeString("ro-RO")}{" "}
                  · actualizare la 30 secunde
                </p>
              </div>
              <label className="text-xs">
                Stare editorială
                <select
                  aria-label="Stare editorială"
                  className={field + " mt-1"}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="review">Ciorne și aprobări</option>
                  {[
                    "draft",
                    "pending_approval",
                    "approved",
                    "scheduled",
                    "published",
                    "rejected",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {labels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!data.permission.canReview && (
              <p className="mb-3 text-xs text-amber-200">
                Aprobarea și respingerea sunt disponibile responsabilului
                autorizat al proiectului.
              </p>
            )}
            <div className="space-y-3">
              {data.content.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-fuchsia-200/70">
                        {item.format} · {values(item.channels_json)}
                      </p>
                      <h3 className="mt-1 break-words font-medium">
                        {item.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300">
                      {labels[item.status]}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-400">
                    {item.caption}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review(item, null)}
                    >
                      Previzualizează
                    </Button>
                    {data.permission.canCreate && item.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => review(item, "pending_approval")}
                      >
                        Trimite la aprobare
                      </Button>
                    )}
                    {data.permission.canReview &&
                      ["draft", "pending_approval"].includes(item.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => review(item, "rejected")}
                        >
                          <XCircle className="mr-1 size-4" />
                          Respinge
                        </Button>
                      )}
                    {data.permission.canReview &&
                      item.status === "pending_approval" && (
                        <Button
                          size="sm"
                          onClick={() => review(item, "approved")}
                        >
                          <CheckCircle2 className="mr-1 size-4" />
                          Aprobă
                        </Button>
                      )}
                    {data.permission.canCreate &&
                      item.status === "rejected" && (
                        <Button size="sm" onClick={() => review(item, "draft")}>
                          Reia ciorna
                        </Button>
                      )}
                  </div>
                </article>
              ))}
            </div>
            {!data.content.length && !error && (
              <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                Nu există materiale pentru starea selectată.
              </p>
            )}
            {data.nextOffset !== null && (
              <Button
                className="mt-3"
                disabled={loading}
                variant="outline"
                onClick={() => void load(data.nextOffset!)}
              >
                Încarcă următoarele
              </Button>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title || "Revizuire material"}</DialogTitle>
            <DialogDescription>
              {selected && labels[selected.status]} ·{" "}
              {selected && values(selected.channels_json)}
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {selected?.caption}
          </div>
          {selected?.visual_direction && (
            <p className="whitespace-pre-wrap break-words text-sm text-slate-400">
              Direcție vizuală: {selected.visual_direction}
            </p>
          )}
          {selected?.cta && (
            <p className="break-words text-sm">Îndemn: {selected.cta}</p>
          )}
          {selected && (
            <p className="break-words text-xs text-slate-400">
              {values(selected.hashtags_json)}
            </p>
          )}
          {decision && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
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
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={upcoming} onOpenChange={setUpcoming}>
        <DialogContent
          id="social-upcoming"
          className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>Activități viitoare și în lucru</DialogTitle>
            <DialogDescription>
              Coada de producție și programările reale ale proiectului.
              Aprobarea, programarea și publicarea au stări distincte.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric
              label="În pregătire"
              value={
                activities.filter((a) =>
                  ["queued", "generating"].includes(a.status),
                ).length
              }
            />
            <Metric
              label="Necesită decizie"
              value={
                activities.filter((a) =>
                  [
                    "draft_ready",
                    "awaiting_approval",
                    "awaiting_budget",
                  ].includes(a.status),
                ).length
              }
            />
            <Metric
              label="Blocaje"
              value={activities.filter((a) => a.status === "failed").length}
            />
          </div>
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="rounded-xl border border-white/10 p-3"
            >
              <h3 className="break-words text-sm font-medium">
                {activity.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {activity.channel} ·{" "}
                {activity.at
                  ? new Date(activity.at).toLocaleString("ro-RO")
                  : "Fără dată confirmată"}
              </p>
              <p className="mt-1 text-xs text-cyan-200">
                {labels[activity.status] || activity.status}
              </p>
              {activity.error && (
                <p className="mt-1 break-words text-xs text-amber-200">
                  Necesită verificare: {activity.error}
                </p>
              )}
              {activity.at > 0 &&
                activity.at < Date.now() &&
                activity.status !== "failed" && (
                  <p className="mt-1 text-xs text-amber-200">
                    Termen trecut; execuția sau publicarea nu sunt confirmate.
                  </p>
                )}
            </article>
          ))}
          {!activities.length && (
            <p className="text-sm text-slate-400">
              Nu există activități în coada curentă.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Sunt afișate până la 60 de activități de producție și 60 de
            programări.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#10162a]/90 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
