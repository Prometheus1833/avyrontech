import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  FileText,
  FolderOpen,
  Plus,
  Search,
  Pencil,
  Archive,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  documentsApi,
  type DocumentBootstrap,
  type DocumentClientWorkspace,
  type DocumentClientWorkspaceSummary,
  type DocumentContext,
  type DocumentPlan,
  type DocumentPlanInput,
  type DocumentPlanMutation,
  type DocumentSummary,
} from "@/lib/documentsApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateClientDialog from "@/components/dashboard/clients/CreateClientDialog";
import { useClientMutation } from "@/components/dashboard/clients/useClientMutation";
import { documentState } from "./presentation";
import "@/components/dashboard/clients/clientWorkspace.css";

const emptyPlan = (): DocumentPlanInput => ({
  title: "",
  series: "",
  dueDate: null,
  notes: "",
  projectId: null,
  templateId: null,
});
const date = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("ro-RO");

export default function ClientDocumentWorkspaces({
  clientId,
  bootstrap,
  context,
  onClient,
  onGenerate,
  onOpen,
}: {
  clientId: string;
  bootstrap: DocumentBootstrap;
  context: DocumentContext;
  onClient: (id: string) => void;
  onGenerate: (id: string, plan?: DocumentPlan) => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [clients, setClients] = useState<DocumentClientWorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<DocumentClientWorkspace | null>(
    null,
  );
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentOffset, setDocumentOffset] = useState(0);
  const [documentTotal, setDocumentTotal] = useState(0);
  const [state, setState] = useState("");
  const [archive, setArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [creatingClient, setCreatingClient] = useState(false);
  const [editing, setEditing] = useState<DocumentPlan | "new" | null>(null);
  const [form, setForm] = useState<DocumentPlanInput>(emptyPlan);
  const mutation = useClientMutation();
  const active = useRef(true);
  const loadVersion = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setOffset(0);
      setDocumentOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    setQuery("");
    setSearch("");
    setDocumentOffset(0);
    setState("");
    setArchive(false);
    setWorkspace(null);
    setDocuments([]);
    setEditing(null);
  }, [clientId]);
  useEffect(() => {
    let current = true;
    const sequence = ++loadVersion.current;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        if (!clientId) {
          const result = await documentsApi.clientWorkspaces(search, offset);
          if (!current) return;
          setClients(result.data);
          setNextOffset(result.nextOffset);
        } else {
          const params = new URLSearchParams({
            workspace: "1",
            client: clientId,
            archived: archive ? "1" : "0",
            state,
            q: search,
            offset: String(documentOffset),
          });
          const [file, list] = await Promise.all([
            documentsApi.clientWorkspace(clientId),
            documentsApi.list(params),
          ]);
          if (!current) return;
          setWorkspace(file);
          setDocuments(list.data);
          setDocumentTotal(list.total);
        }
      } catch (cause) {
        if (current) {
          setError((cause as Error).message);
          setWorkspace(null);
          setDocuments([]);
          setClients([]);
        }
      } finally {
        if (current && sequence === loadVersion.current) setLoading(false);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [clientId, search, offset, documentOffset, state, archive, refresh]);
  const reload = useCallback(() => setRefresh((v) => v + 1), []);
  const perform = async (action: () => Promise<unknown>) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      if (active.current) setError((cause as Error).message);
    } finally {
      if (active.current) setLoading(false);
    }
  };
  const edit = (plan?: DocumentPlan) => {
    mutation.setError("");
    setEditing(plan || "new");
    setForm(
      plan
        ? {
            title: plan.title,
            series: plan.series,
            dueDate: plan.due_date,
            notes: plan.notes,
            projectId: plan.project_id,
            templateId: plan.template_id,
          }
        : emptyPlan(),
    );
  };
  const savePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const body: DocumentPlanMutation =
      editing === "new"
        ? { action: "create", plan: form }
        : {
            action: "update",
            id: editing.id,
            revision: editing.revision,
            plan: form,
          };
    void mutation.run(
      body,
      (key) => documentsApi.savePlan(clientId, body, key),
      () => {
        setEditing(null);
        reload();
      },
    );
  };
  const archivePlan = (plan: DocumentPlan) => {
    const body: DocumentPlanMutation = {
      action: "archive",
      id: plan.id,
      revision: plan.revision,
    };
    void mutation.run(
      body,
      (key) => documentsApi.savePlan(clientId, body, key),
      reload,
    );
  };
  return (
    <section
      className="dc-grid dc-client-workspaces"
      aria-label="Documente clienți"
    >
      <header className="dc-heading-row">
        <div>
          {clientId && (
            <button className="dc-client-back" onClick={() => onClient("")}>
              <ArrowLeft size={15} />
              Toți clienții
            </button>
          )}
          <h2 className="text-xl font-semibold">
            {workspace?.client.company_name ||
              (clientId ? "Dosarul clientului" : "Documente clienți")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {clientId
              ? "De la prima ofertă la predare. Urmărește documentele și continuă de unde ai rămas."
              : "Un dosar pentru fiecare client. Vezi ce ai pregătit și ce urmează să livrezi."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!clientId && bootstrap.canCreateClient && (
            <button
              className="dc-button dc-primary"
              onClick={() => setCreatingClient(true)}
            >
              <Plus size={16} />
              Client nou
            </button>
          )}
          {workspace?.canPlan && (
            <>
              <button
                className="dc-button"
                disabled={loading}
                onClick={() => edit()}
              >
                <CalendarDays size={16} />
                Planifică document
              </button>
              <button
                className="dc-button dc-primary"
                disabled={loading}
                onClick={() => void perform(() => onGenerate(clientId))}
              >
                <Plus size={16} />
                Creează documente
              </button>
            </>
          )}
          <button
            className="dc-button"
            disabled={loading}
            onClick={reload}
            aria-label="Actualizează dosarele"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>
      {error && (
        <p className="dc-notice" role="alert">
          {error}{" "}
          <button className="underline" onClick={reload}>
            Reîncearcă
          </button>
        </p>
      )}
      {mutation.error && !editing && (
        <p className="dc-notice" role="alert">
          {mutation.error}{" "}
          <button className="underline" onClick={reload}>
            Actualizează fișa
          </button>
        </p>
      )}
      {!clientId ? (
        <>
          <label className="dc-client-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Caută clientul</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută după client, CUI sau e-mail…"
            />
          </label>
          {loading ? (
            <p role="status" className="dc-panel">
              Se încarcă dosarele…
            </p>
          ) : (
            <div className="dc-client-grid">
              {clients.map((client) => (
                <button
                  className="dc-client-card"
                  key={client.id}
                  onClick={() => onClient(client.id)}
                >
                  <div className="dc-heading-row">
                    <FolderOpen className="text-violet-300" size={20} />
                    <span className="text-xs text-slate-400">
                      {client.entity_type || "Client"}
                      {client.status === "archived" ? " · arhivat" : ""}
                    </span>
                  </div>
                  <h3>{client.company_name}</h3>
                  <div className="dc-client-card-counts">
                    <span>
                      <strong>{client.document_count}</strong> documente
                    </span>
                    <span>
                      <strong>{client.planned_count}</strong> planificate
                    </span>
                  </div>
                  <span className="dc-client-card-link">
                    Deschide dosarul
                    <ArrowUpRight size={16} />
                  </span>
                </button>
              ))}
              {!clients.length && !error && (
                <p className="dc-panel text-sm text-slate-400">
                  {search
                    ? "Nu am găsit un client pentru această căutare."
                    : "Adaugă un client sau deschide dosarul unui client existent pentru a pregăti primele documente."}
                </p>
              )}
            </div>
          )}
          {(offset > 0 || nextOffset !== null) && (
            <nav className="dc-heading-row" aria-label="Paginare dosare">
              <button
                className="dc-button"
                disabled={loading || !offset}
                onClick={() => setOffset((v) => Math.max(0, v - 25))}
              >
                Înapoi
              </button>
              <button
                className="dc-button"
                disabled={loading || nextOffset === null}
                onClick={() => {
                  if (nextOffset !== null) setOffset(nextOffset);
                }}
              >
                Următorii clienți
              </button>
            </nav>
          )}
        </>
      ) : (
        workspace && (
          <>
            <div
              className="dc-client-progress"
              aria-label="Situația documentelor"
            >
              {(
                [
                  ["În lucru", workspace.counts.drafts],
                  ["Aprobate", workspace.counts.approved],
                  ["Publicate", workspace.counts.published],
                  ["Planificate", workspace.plans.length],
                ] as const
              ).map(([label, count]) => (
                <div key={label}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <section
              className="dc-panel dc-grid"
              aria-labelledby="dc-plans-title"
            >
              <div className="dc-heading-row">
                <h3 id="dc-plans-title" className="font-semibold">
                  Ce urmează
                </h3>
                <span className="text-xs text-slate-400">
                  Documente și serii planificate
                </span>
              </div>
              {workspace.plans.length ? (
                <ul className="dc-grid">
                  {workspace.plans.map((plan) => (
                    <li key={plan.id} className="dc-client-row">
                      <div className="min-w-0">
                        <h4 className="font-medium break-words">
                          {plan.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {[plan.series, plan.project_name, plan.template_name]
                            .filter(Boolean)
                            .join(" · ") || "Document independent de proiect"}
                        </p>
                        {plan.due_date && (
                          <p className="dc-client-due">
                            <CalendarDays size={13} />
                            {date(plan.due_date)}
                          </p>
                        )}
                        {plan.notes && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
                            {plan.notes}
                          </p>
                        )}
                      </div>
                      {workspace.canPlan && (
                        <div className="dc-client-row-actions">
                          <button
                            className="dc-button dc-primary"
                            disabled={loading || mutation.busy}
                            onClick={() =>
                              void perform(() => onGenerate(clientId, plan))
                            }
                          >
                            Pregătește
                            <ArrowUpRight size={14} />
                          </button>
                          <button
                            className="dc-button"
                            disabled={mutation.busy}
                            onClick={() => edit(plan)}
                            aria-label={"Modifică planificarea " + plan.title}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="dc-button"
                            disabled={mutation.busy}
                            onClick={() => archivePlan(plan)}
                            aria-label={"Retrage planificarea " + plan.title}
                          >
                            <Archive size={15} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">
                  {workspace.canPlan
                    ? "Adaugă următorul document, un termen și seria din care face parte. Poți începe fără un proiect asociat."
                    : "Nu sunt documente planificate pentru acest client."}
                </p>
              )}
            </section>
            <section
              className="dc-grid"
              aria-labelledby="dc-client-documents-title"
            >
              <div className="dc-heading-row">
                <h3 id="dc-client-documents-title" className="font-semibold">
                  Documentele pregătite
                  <span className="ml-2 text-sm text-slate-400">
                    {documentTotal}
                  </span>
                </h3>
                <label className="dc-check text-sm">
                  <input
                    type="checkbox"
                    checked={archive}
                    onChange={(e) => {
                      setArchive(e.target.checked);
                      setDocumentOffset(0);
                      setState("");
                    }}
                  />
                  Arhivă ({workspace.counts.archived})
                </label>
              </div>
              <div className="dc-client-tools">
                <label className="dc-client-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="sr-only">Caută în dosar</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Titlu, număr, serie sau proiect…"
                  />
                </label>
                {!archive && (
                  <label className="dc-label">
                    <span className="sr-only">Starea documentului</span>
                    <select
                      aria-label="Starea documentului"
                      className="dc-input"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        setDocumentOffset(0);
                      }}
                    >
                      <option value="">Toate stările</option>
                      {["Ciornă", "Aprobat", "Publicat"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {loading ? (
                <p role="status">Se actualizează documentele…</p>
              ) : (
                <ul className="dc-grid">
                  {documents.map((doc) => (
                    <li key={doc.id} className="dc-panel dc-client-row">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText
                            size={17}
                            className="shrink-0 text-violet-300"
                          />
                          <h4 className="break-words font-medium">
                            {doc.title}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {doc.number} · {documentState(doc)} ·{" "}
                          {new Date(doc.updated_at).toLocaleDateString("ro-RO")}
                        </p>
                        {(doc.workspace_series || doc.workspace_projects) && (
                          <p className="mt-1 break-words text-xs text-violet-200">
                            {[doc.workspace_series, doc.workspace_projects]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="dc-client-row-actions">
                        <button
                          className="dc-button"
                          onClick={() => onOpen(doc.id)}
                        >
                          Deschide
                          <ArrowUpRight size={14} />
                        </button>
                        {bootstrap.permissions["documents.export"] && (
                          <button
                            className="dc-button"
                            disabled={loading}
                            aria-label={"Descarcă PDF " + doc.title}
                            onClick={() =>
                              void perform(() =>
                                documentsApi.download(
                                  "/" +
                                    doc.id +
                                    "/export/pdf?version=" +
                                    doc.current_version_id,
                                  doc.number + ".pdf",
                                ),
                              )
                            }
                          >
                            <Download size={15} />
                            PDF
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && !documents.length && (
                <p className="dc-panel text-sm text-slate-400">
                  {search || state || archive
                    ? "Niciun document pentru selecția curentă."
                    : "Primul document al clientului va apărea aici. Poți genera o ofertă, un contract sau mai multe documente împreună."}
                </p>
              )}
              {documentTotal > 50 && (
                <nav
                  className="dc-heading-row"
                  aria-label="Paginare documente client"
                >
                  <button
                    className="dc-button"
                    disabled={loading || !documentOffset}
                    onClick={() =>
                      setDocumentOffset((v) => Math.max(0, v - 50))
                    }
                  >
                    Înapoi
                  </button>
                  <span className="text-xs text-slate-400">
                    {documentOffset + 1}–
                    {Math.min(documentOffset + 50, documentTotal)} din{" "}
                    {documentTotal}
                  </span>
                  <button
                    className="dc-button"
                    disabled={loading || documentOffset + 50 >= documentTotal}
                    onClick={() => setDocumentOffset((v) => v + 50)}
                  >
                    Următoarele
                  </button>
                </nav>
              )}
            </section>
          </>
        )
      )}
      {clientId && loading && !workspace && (
        <p role="status" className="dc-panel">
          Se deschide dosarul…
        </p>
      )}
      {creatingClient && (
        <CreateClientDialog
          onClose={() => setCreatingClient(false)}
          onCreated={(id) => {
            setCreatingClient(false);
            onClient(id);
            reload();
          }}
        />
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !mutation.busy) setEditing(null);
        }}
      >
        <DialogContent className="dc-dialog sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing === "new"
                ? "Planifică un document"
                : "Modifică planificarea"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Stabilește ce pregătești pentru client. Data, proiectul și seria
              sunt opționale.
            </DialogDescription>
          </DialogHeader>
          <form className="dc-grid" onSubmit={savePlan}>
            <label className="dc-label">
              Denumire document
              <input
                className="dc-input"
                required
                maxLength={240}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <div className="dc-grid sm:grid-cols-2">
              <label className="dc-label">
                Serie / colaborare
                <input
                  className="dc-input"
                  maxLength={120}
                  placeholder="Ex. Website · lansare"
                  value={form.series}
                  onChange={(e) => setForm({ ...form, series: e.target.value })}
                />
              </label>
              <label className="dc-label">
                Data pregătirii
                <input
                  type="date"
                  className="dc-input"
                  value={form.dueDate || ""}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value || null })
                  }
                />
              </label>
            </div>
            <label className="dc-label">
              Proiect
              <select
                className="dc-input"
                value={form.projectId || ""}
                onChange={(e) =>
                  setForm({ ...form, projectId: e.target.value || null })
                }
              >
                <option value="">Fără proiect / proiect viitor</option>
                {workspace?.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dc-label">
              Tipizat
              <select
                className="dc-input"
                value={form.templateId || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    templateId: e.target.value || null,
                    title:
                      form.title ||
                      context.templates.find((t) => t.id === e.target.value)
                        ?.name ||
                      "",
                  })
                }
              >
                <option value="">Aleg ulterior / document de la zero</option>
                {context.templates
                  .filter(
                    (t) =>
                      t.visibility !== "private_proposal" &&
                      t.review_status !== "retired",
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="dc-label">
              Detalii pentru pregătire
              <textarea
                className="dc-input"
                rows={3}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            {mutation.error && (
              <p role="alert" className="dc-notice">
                {mutation.error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="dc-button"
                disabled={mutation.busy}
                onClick={() => setEditing(null)}
              >
                Renunță
              </button>
              <button
                className="dc-button dc-primary"
                disabled={mutation.busy || !form.title.trim()}
              >
                {mutation.busy ? "Se salvează…" : "Salvează planificarea"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
