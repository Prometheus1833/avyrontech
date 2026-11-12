import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { workspaceApi, type WorkItem } from "@/lib/workspaceApi";
import { cfAuth } from "@/lib/cfAuth";
import { Button } from "@/components/ui/button";

const kinds = { task: "Activitate", deliverable: "Livrabil", onboarding: "Pornire", offboarding: "Predare", maintenance: "Mentenanță" };
const statuses = { open: "Deschis", in_progress: "În lucru", blocked: "Blocat", done: "Finalizat", cancelled: "Anulat" };
const inputClass = "min-w-0 rounded-lg border border-border bg-background p-2 text-sm";

export function ProjectWorkItems({ projectId, onlyKind, projectPage = false }: {
  projectId: string;
  onlyKind?: WorkItem["kind"];
  projectPage?: boolean;
}) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(!projectPage);
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [kind, setKind] = useState<WorkItem["kind"]>(onlyKind ?? "task");
  const titleInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const query = onlyKind === "maintenance" ? "?kind=maintenance" : "";
      const result = await cfAuth.request<{ data: WorkItem[]; canWrite: boolean }>(`/api/workspace/work-items/${encodeURIComponent(projectId)}${query}`);
      setItems(result.data);
      setCanWrite(result.canWrite);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Activitățile nu au putut fi încărcate.");
    } finally { setLoading(false); }
  }, [projectId, onlyKind]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (projectPage && formOpen) titleInput.current?.focus();
  }, [projectPage, formOpen, editing]);

  function reset() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDue("");
    setKind(onlyKind ?? "task");
    if (projectPage) setFormOpen(false);
  }

  function edit(item: WorkItem) {
    setFormOpen(true);
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setKind(item.kind);
    setDue(item.due_at ? new Date(item.due_at - new Date(item.due_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    try {
      const body = {
        kind, title: title.trim(), description: description || null,
        due_at: due ? new Date(due).getTime() : null,
        status: editing?.status ?? "open",
        ...(editing ? { revision: editing.revision } : {}),
      };
      await workspaceApi.write(`work-items/${projectId}${editing ? `/${editing.id}` : ""}`, body, editing ? "PATCH" : "POST");
      reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Activitatea nu a putut fi salvată.");
    } finally { setBusy(false); }
  }

  async function changeStatus(item: WorkItem, status: WorkItem["status"]) {
    if (busy) return;
    setBusy(true);
    try {
      await workspaceApi.write(`work-items/${projectId}/${item.id}`, {
        kind: item.kind, title: item.title, description: item.description,
        due_at: item.due_at, status, revision: item.revision,
      }, "PATCH");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Starea nu a putut fi actualizată.");
    } finally {
      await load();
      setBusy(false);
    }
  }

  const rows = onlyKind ? items.filter((item) => item.kind === onlyKind) : items;
  const form = canWrite && formOpen && (
    <form onSubmit={save} className={projectPage ? "project-form grid gap-3 rounded-xl p-3 sm:grid-cols-2" : "grid gap-3 border-t pt-4 sm:grid-cols-2"}>
      <label className="grid min-w-0 gap-1 text-sm">Titlu
        <input ref={titleInput} required maxLength={200} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
      </label>
      <label className="grid min-w-0 gap-1 text-sm">Tip
        <select disabled={!!onlyKind || busy} value={kind} onChange={(event) => setKind(event.target.value as WorkItem["kind"])} className={inputClass}>
          {Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="grid min-w-0 gap-1 text-sm">Termen
        <input type="datetime-local" disabled={busy} value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} />
      </label>
      <label className="grid min-w-0 gap-1 text-sm">Detalii
        <textarea maxLength={4000} disabled={busy} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !title.trim()}>{busy ? "Se salvează…" : editing ? "Salvează" : "Adaugă"}</Button>
        {(editing || projectPage) && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={reset}>Anulează</Button>}
      </div>
    </form>
  );

  return (
    <section id={projectPage ? "livrare" : undefined} aria-labelledby={projectPage ? "project-delivery-title" : undefined}
      className={projectPage ? "project-panel project-section space-y-3 p-4 sm:p-5" : "my-4 space-y-4 rounded-xl border bg-card p-4"}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={projectPage ? "project-delivery-title" : undefined} className={projectPage ? "project-heading" : "text-lg font-semibold"}>
            {projectPage && <ClipboardList aria-hidden="true" />}
            {onlyKind ? kinds[onlyKind] : projectPage ? "Livrare și activități" : "Livrare și checklisturi"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectPage && rows.length ? `${rows.filter((item) => item.status === "done").length} din ${rows.length} finalizate` : "Termene, progres și responsabilități pentru acest proiect."}
          </p>
        </div>
        {projectPage && canWrite && !formOpen && <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}><Plus className="size-4" />Adaugă activitate</Button>}
      </header>
      {projectPage && form}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Se încarcă activitățile…</p>}
      {!loading && !error && !rows.length && <p className="text-sm text-muted-foreground">Nu există activități planificate.</p>}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((item) => (
            <article key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-xs text-muted-foreground">{kinds[item.kind]}</p>
                <p className="break-words font-medium">{item.title}</p>
                {item.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.description}</p>}
                <p className={`text-xs ${item.due_at && item.due_at < Date.now() && !["done", "cancelled"].includes(item.status) ? "text-rose-500" : "text-muted-foreground"}`}>
                  {item.due_at ? `Termen: ${new Date(item.due_at).toLocaleString("ro-RO")}` : "Fără termen"}
                </p>
              </div>
              {canWrite ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label={`Stare ${item.title}`} disabled={busy} value={item.status} onChange={(event) => void changeStatus(item, event.target.value as WorkItem["status"])} className={inputClass}>
                    {Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => edit(item)}>Editează</Button>
                </div>
              ) : <span className="rounded-md bg-muted px-2 py-1 text-xs">{statuses[item.status]}</span>}
            </article>
          ))}
        </div>
      )}
      {!projectPage && form}
    </section>
  );
}
