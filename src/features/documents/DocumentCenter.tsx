import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Library,
  Wand2,
  Users,
  Layers,
  Building2,
  ArrowLeft,
  Download,
  Share2,
  History,
  Archive,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  documentsApi,
  type DocumentBootstrap,
  type DocumentContext,
  type DocumentDetail,
  type DocumentSummary,
  type DocumentTemplate,
} from "@/lib/documentsApi";
import { cfAuth } from "@/lib/cfAuth";
import { useAuth } from "@/hooks/useAuth";
import { documentIssues, type DocumentPayload } from "@/shared/documents/model";
import "./documents.css";
const DocumentEditor = lazy(() => import("./DocumentEditor"));
const DocumentGenerator = lazy(() => import("./DocumentGenerator"));
const ServiceProfiles = lazy(() => import("./ServiceProfiles"));
type View = "library" | "generator" | "staff" | "hub" | "company";
const labels: Record<View, string> = {
  library: "Bibliotecă",
  generator: "Tipizate și generator",
  staff: "Documente staff",
  hub: "Documents Hub",
  company: "Documentele firmei",
};
const icons = {
  library: Library,
  generator: Wand2,
  staff: Users,
  hub: Layers,
  company: Building2,
};
const states = (item: DocumentSummary) =>
  item.archived_at
    ? "Arhivat"
    : item.published_version_id === item.current_version_id
      ? "Publicat"
      : item.approved
        ? "Aprobat"
        : "Ciornă";
export default function DocumentCenter({
  projectId,
  clientId,
  serviceId,
  subscriptionId,
  initialView = "library",
  embedded = false,
}: {
  projectId?: string;
  clientId?: string;
  serviceId?: string;
  subscriptionId?: string;
  initialView?: View;
  embedded?: boolean;
}) {
  const { user } = useAuth();
  const [generatorCompany, setGeneratorCompany] = useState(false);
  const [params, setParams] = useSearchParams();
  const [bootstrap, setBootstrap] = useState<DocumentBootstrap | null>(null),
    [context, setContext] = useState<DocumentContext | null>(null),
    [view, setView] = useState<View>(initialView),
    [items, setItems] = useState<DocumentSummary[]>([]),
    [total, setTotal] = useState(0),
    [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [archive, setArchive] = useState(false),
    [scopeFilter, setScopeFilter] = useState(""),
    [stateFilter, setStateFilter] = useState(""),
    [sort, setSort] = useState("recent"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [detail, setDetail] = useState<DocumentDetail | null>(null),
    [history, setHistory] = useState(false),
    [message, setMessage] = useState(""),
    [action, setAction] = useState<
      | "approve"
      | "publish"
      | "share"
      | "template"
      | "backup"
      | "settings"
      | null
    >(null),
    [recipients, setRecipients] = useState<
      { id: string; email: string; display_name: string | null }[]
    >([]),
    [selectedRecipients, setSelectedRecipients] = useState<string[]>([]),
    [share, setShare] = useState({
      channel: "link",
      subject: "Document AVYRON",
      message: "",
      recipientId: user?.id || "",
      attachment: "none",
      confirmed: false,
      attachmentConfirmed: false,
    }),
    [legalReference, setLegalReference] = useState(""),
    [allowClientShare, setAllowClientShare] = useState(false),
    [allowAttachments, setAllowAttachments] = useState(false),
    [shareResult, setShareResult] = useState<{
      status: string;
      link: string;
      manualUrl: string | null;
    } | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [backups, setBackups] = useState<Awaited<
      ReturnType<typeof documentsApi.backups>
    > | null>(null),
    [templateEdit, setTemplateEdit] = useState<DocumentTemplate | null>(null),
    [companyDraft, setCompanyDraft] = useState<Record<string, string>>({});
  const draft = useRef<DocumentPayload | null>(null),
    dirty = useRef(false),
    save = useRef<() => Promise<boolean>>(async () => true);
  const revisionRef = useRef(0);
  const shareRequestKey = useRef(crypto.randomUUID());
  const openSequence = useRef(0),
    opening = useRef<string | null>(null),
    suppressUrlOpen = useRef(false),
    listSequence = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const requestVersion = params.get("version") || undefined;
  const requestedSubscription = params.get("subscription") || undefined;
  const contextualFilters = new URLSearchParams(
    [
      "client",
      "project",
      "service",
      "subscription",
      "product",
      "catalog",
      "order",
      "entitlement",
      "billing_subscription",
    ].flatMap((key) => (params.get(key) ? [[key, params.get(key)!]] : [])),
  ).toString();
  const open = useCallback(
    async (id: string, version?: string) => {
      const key = id + ":" + (version || "");
      if (opening.current === key) return;
      const sequence = ++openSequence.current;
      opening.current = key;
      suppressUrlOpen.current = false;
      setError("");
      setBusy(true);
      try {
        const data = await documentsApi.get(id, version);
        if (sequence !== openSequence.current || !mounted.current) return;
        setDetail(data);
        revisionRef.current = data.document.revision;
        draft.current = data.version.payload;
        dirty.current = false;
        setHistory(false);
        setTemplateEdit(null);
        if (!embedded)
          setParams(
            (current) => {
              const next = new URLSearchParams(current);
              next.set("document", id);
              if (version) next.set("version", version);
              else next.delete("version");
              return next;
            },
            { replace: true },
          );
      } catch (e) {
        if (sequence === openSequence.current && mounted.current)
          setError((e as Error).message);
      } finally {
        if (sequence === openSequence.current) {
          opening.current = null;
          if (mounted.current) setBusy(false);
        }
      }
    },
    [embedded, setParams],
  );
  const refreshContext = useCallback(async () => {
    const data = await documentsApi.context();
    setContext(data);
  }, []);
  useEffect(() => {
    let active = true;
    void documentsApi
      .bootstrap()
      .then(async (data) => {
        if (!active) return;
        setBootstrap(data);
        if (data.staff) await refreshContext();
      })
      .catch((e) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, [refreshContext]);
  useEffect(() => {
    const id = params.get("document");
    if (!id) suppressUrlOpen.current = false;
    if (id && !embedded && !detail && !suppressUrlOpen.current)
      void open(id, requestVersion);
  }, [params, embedded, detail, open, requestVersion]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(async () => {
    if (!bootstrap || view === "generator") return;
    const sequence = ++listSequence.current;
    setBusy(true);
    setError("");
    const p = new URLSearchParams({
      q: debounced,
      archived: archive ? "1" : "0",
      offset: String(offset),
      sort,
      state: stateFilter,
    });
    for (const [key, value] of new URLSearchParams(contextualFilters))
      p.set(key, value);
    if (projectId) p.set("project", projectId);
    if (clientId) p.set("client", clientId);
    if (serviceId) p.set("service", serviceId);
    if (subscriptionId || requestedSubscription)
      p.set("subscription", subscriptionId || requestedSubscription!);
    if (view === "company") p.set("scope", "company");
    else if (scopeFilter) p.set("scope", scopeFilter);
    if (view === "hub") p.set("collection", "hub");
    try {
      const result = await documentsApi.list(p);
      if (mounted.current && sequence === listSequence.current) {
        setItems(result.data);
        setTotal(result.total);
      }
    } catch (e) {
      if (mounted.current && sequence === listSequence.current)
        setError((e as Error).message);
    } finally {
      if (mounted.current && sequence === listSequence.current) setBusy(false);
    }
  }, [
    bootstrap,
    view,
    debounced,
    archive,
    offset,
    sort,
    scopeFilter,
    projectId,
    clientId,
    serviceId,
    subscriptionId,
    requestedSubscription,
    contextualFilters,
    stateFilter,
  ]);
  useEffect(() => {
    if (!detail && view !== "staff") void load();
  }, [load, detail, view]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const close = async () => {
    if (!(await save.current())) {
      setError("Salvează sau recuperează ciorna înainte de navigare.");
      return;
    }
    ++openSequence.current;
    opening.current = null;
    suppressUrlOpen.current = true;
    setDetail(null);
    setTemplateEdit(null);
    if (!embedded)
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete("document");
          next.delete("version");
          return next;
        },
        { replace: true },
      );
  };
  const switchView = async (next: View) => {
    if (detail && !(await save.current())) {
      setError("Salvează ciorna înainte de navigare.");
      return;
    }
    ++openSequence.current;
    opening.current = null;
    suppressUrlOpen.current = true;
    setDetail(null);
    setTemplateEdit(null);
    if (next === "generator") setGeneratorCompany(view === "company");
    setView(next);
    setOffset(0);
    setScopeFilter("");
    setStateFilter("");
    if (!embedded)
      setParams(
        (current) => {
          const nextParams = new URLSearchParams(current);
          nextParams.delete("document");
          nextParams.delete("version");
          return nextParams;
        },
        { replace: true },
      );
  };
  const onSaved = useCallback(
    (value: {
      revision: number;
      versionId: string;
      payload?: DocumentPayload;
    }) => {
      revisionRef.current = value.revision;
      setDetail((current) =>
        current
          ? {
              ...current,
              document: {
                ...current.document,
                revision: value.revision,
                current_version_id: value.versionId,
              },
              version: {
                ...current.version,
                id: value.versionId,
                version: current.version.version + 1,
                payload: value.payload || current.version.payload,
              },
              approvals: [],
              issues: documentIssues(
                value.payload || current.version.payload,
                context?.templates.find(
                  (t) => t.version_id === current.document.template_version_id,
                )?.required || [],
              ),
            }
          : current,
      );
    },
    [context],
  );
  const onDraftChange = useCallback(
    (payload: DocumentPayload, isDirty: boolean) => {
      draft.current = payload;
      dirty.current = isDirty;
    },
    [],
  );
  const onMasterPayload = useCallback(
    (payload: DocumentPayload) =>
      setTemplateEdit((current) =>
        !current || JSON.stringify(current.payload) === JSON.stringify(payload)
          ? current
          : { ...current, payload },
      ),
    [],
  );
  const onSaveReady = useCallback((fn: () => Promise<boolean>) => {
    save.current = fn;
  }, []);
  const transact = async (fn: () => Promise<unknown>, reload = true) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (detail && !(await save.current()))
        throw new Error(
          "Salvarea ciornei trebuie rezolvată înainte de această acțiune.",
        );
      await fn();
      setAction(null);
      if (detail && reload) await open(detail.document.id);
      else if (reload) await load();
      setMessage("Operațiune înregistrată.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setShare((v) => ({ ...v, confirmed: false, attachmentConfirmed: false }));
  }, [
    share.channel,
    share.recipientId,
    share.subject,
    share.message,
    share.attachment,
  ]);
  const prepareAction = async (next: typeof action) => {
    if (next === "share") {
      shareRequestKey.current = crypto.randomUUID();
      setShare((v) => ({
        ...v,
        recipientId: user?.id || "",
        confirmed: false,
        attachmentConfirmed: false,
      }));
    }
    if (next === "publish") {
      setSelectedRecipients([]);
      setAllowClientShare(false);
      setAllowAttachments(false);
    }
    setShareResult(null);
    setError("");
    if (detail && !(await save.current())) {
      setError("Salvează ciorna înainte de continuare.");
      return;
    }
    if (detail && (next === "publish" || next === "share")) {
      try {
        setRecipients((await documentsApi.recipients(detail.document.id)).data);
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    if (detail && next === "backup") {
      try {
        setBackups(await documentsApi.backups(detail.document.id));
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    if (next === "settings")
      setCompanyDraft(
        Object.fromEntries(
          [
            "legal_name",
            "tax_id",
            "registration_number",
            "address",
            "representative",
            "contact_email",
          ].map((key) => [key, context?.company[key] || ""]),
        ),
      );
    setAction(next);
  };
  const download = async (format: "pdf" | "docx", asPreview = false) => {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      if (!(await save.current()))
        throw new Error("Documentul nu a putut fi salvat.");
      const data = await documentsApi.get(detail.document.id, requestVersion);
      if (asPreview) {
        const blob = await documentsApi.blob(
          `/${data.document.id}/export/pdf?version=${data.version.id}&preview=1`,
        );
        setPreview(URL.createObjectURL(blob));
      } else
        await documentsApi.download(
          `/${data.document.id}/export/${format}?version=${data.version.id}`,
          `${data.document.number}-v${data.version.version}.${format}`,
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const visible = items;
  const readonly =
    !!detail &&
    (!detail.actions.edit ||
      !!detail.document.archived_at ||
      detail.version.id !== detail.document.current_version_id);
  const required =
    context?.templates.find(
      (t) => t.version_id === detail?.document.template_version_id,
    )?.required || [];
  return (
    <div className="document-center dc-grid" aria-label="Document Center">
      {!embedded && (
        <header className="dc-panel bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/5 !p-5 sm:!p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-violet-300">
                AVYRON OS · Document Center
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold">
                Documente
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                De la prima propunere la predare. Conținut, versiuni și acces
                într-un singur loc.
              </p>
            </div>
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="size-4 text-emerald-300" /> Acces privat,
              verificat la deschidere
            </span>
          </div>
        </header>
      )}
      {!embedded && bootstrap && (
        <nav
          className="dc-tabs"
          aria-label="Zone Document Center"
          role="tablist"
        >
          {(Object.keys(labels) as View[])
            .filter(
              (v) =>
                v === "library" ||
                (v === "generator" &&
                  bootstrap.permissions["documents.create"]) ||
                (["staff", "hub"].includes(v) && bootstrap.staff) ||
                (v === "company" &&
                  bootstrap.permissions["documents.company.owner"]),
            )
            .map((v) => {
              const Icon = icons[v];
              return (
                <button
                  key={v}
                  role="tab"
                  className="dc-button"
                  aria-selected={view === v && !detail}
                  onClick={() => void switchView(v)}
                >
                  <Icon className="size-4" />
                  {labels[v]}
                </button>
              );
            })}
        </nav>
      )}
      {bootstrap?.storage === "unverified" && (
        <p className="dc-notice">
          Exportul și încărcarea fișierelor necesită verificarea spațiului de
          stocare privat.
        </p>
      )}
      {error && (
        <div role="alert" className="dc-notice">
          {error}{" "}
          <button
            className="underline"
            type="button"
            onClick={() =>
              detail ? void open(detail.document.id) : void load()
            }
          >
            Reîncearcă încărcarea
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-xs text-emerald-300">
          {message}
        </p>
      )}
      {!bootstrap && !error && (
        <div role="status" className="dc-panel text-sm text-slate-400">
          Se verifică accesul la documente…
        </div>
      )}
      {bootstrap && detail ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="dc-button" onClick={() => void close()}>
              <ArrowLeft className="size-4" /> Bibliotecă
            </button>
            <div className="flex flex-wrap gap-2">
              {detail.actions.export && (
                <>
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() => void download("pdf", true)}
                  >
                    Preview PDF
                  </button>
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() => void download("pdf")}
                  >
                    <Download className="size-4" /> PDF
                  </button>
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() => void download("docx")}
                  >
                    Word
                  </button>
                </>
              )}
              {detail.actions.approve &&
                !detail.approvals.length &&
                !readonly && (
                  <button
                    className="dc-button dc-primary"
                    onClick={() => void prepareAction("approve")}
                  >
                    Verifică și aprobă
                  </button>
                )}
              {detail.actions.publish && detail.document.scope === "client" && (
                <button
                  className="dc-button"
                  onClick={() => void prepareAction("publish")}
                >
                  Publică pentru client
                </button>
              )}
              {detail.actions.share && (
                <button
                  className="dc-button"
                  onClick={() => void prepareAction("share")}
                >
                  <Share2 className="size-4" /> Distribuie
                </button>
              )}
              <button
                className="dc-button"
                aria-expanded={history}
                onClick={() => setHistory(!history)}
              >
                <History className="size-4" /> Istoric
              </button>
            </div>
          </div>
          {detail.document.legal === 1 && (
            <p className="dc-notice">
              Document juridic. Modelul original și versiunea contractuală
              necesită verificare și aprobare umană explicită.
            </p>
          )}
          <Suspense
            fallback={<div className="dc-panel">Se încarcă editorul…</div>}
          >
            <DocumentEditor
              key={
                detail.document.id +
                ":" +
                (readonly ? detail.version.id : "edit")
              }
              detail={detail}
              required={required}
              readonly={readonly}
              onSaved={onSaved}
              onChange={onDraftChange}
              onSaveReady={onSaveReady}
            />
          </Suspense>
          {detail.version.payload.lines.length > 0 && (
            <section className="dc-panel">
              <h3 className="font-semibold">Deviz asociat versiunii</h3>
              <div className="mt-3 space-y-2">
                {detail.version.payload.lines.map((line, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    {line.label} · {line.quantity} ×{" "}
                    {(line.offeredPriceMinor / 100).toLocaleString("ro-RO")}{" "}
                    {line.currency} · {line.billingCycle} · TVA{" "}
                    {line.vatBasisPoints / 100}%
                  </p>
                ))}
              </div>
            </section>
          )}
          {history && (
            <div className="dc-history">
              <section className="dc-panel">
                <h3 className="mb-3 font-semibold">Versiuni</h3>
                {detail.versions.map((v) => (
                  <button
                    key={v.id}
                    className="dc-button mb-2 mr-2"
                    disabled={dirty.current}
                    onClick={() => void open(detail.document.id, v.id)}
                  >
                    v{v.version} · {v.approved_at ? "aprobat" : "ciornă"} ·{" "}
                    {new Date(v.created_at).toLocaleDateString("ro-RO")}
                  </button>
                ))}
              </section>
              <section className="dc-panel">
                <h3 className="mb-3 font-semibold">
                  Operațiuni și distribuiri
                </h3>
                {detail.shares.map((s) => (
                  <p key={s.id} className="mb-2 text-xs text-slate-400">
                    {s.channel} ·{" "}
                    {(
                      {
                        prepared: "Pregătit",
                        sending: "În transmitere",
                        sent: "Transmis",
                        delivered: "Livrat",
                        failed: "Eșuat",
                        unknown: "Necunoscut",
                      } as Record<string, string>
                    )[s.status] || s.status}{" "}
                    · versiunea{" "}
                    {detail.versions.find((v) => v.id === s.version_id)
                      ?.version || "istorică"}{" "}
                    · {s.recipient_email} ·{" "}
                    {new Date(s.created_at).toLocaleString("ro-RO")}
                  </p>
                ))}
                {detail.events.slice(0, 20).map((e) => (
                  <p key={e.id} className="mb-2 text-xs text-slate-500">
                    {e.action} ·{" "}
                    {new Date(e.created_at).toLocaleString("ro-RO")}
                  </p>
                ))}
              </section>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {bootstrap.permissions["documents.create"] && (
              <button
                className="dc-button"
                disabled={busy}
                onClick={() =>
                  void transact(async () => {
                    const result = await documentsApi.write<{ id: string }>(
                      `/${detail.document.id}/duplicate`,
                      {},
                    );
                    await open(result.id);
                  }, false)
                }
              >
                Duplică
              </button>
            )}
            {bootstrap.permissions["documents.templates.manage"] &&
              detail.document.scope !== "company" && (
                <button
                  className="dc-button"
                  onClick={() => void prepareAction("template")}
                >
                  Propune ca tipizat
                </button>
              )}
            {detail.actions.delete && (
              <button
                className="dc-button"
                onClick={() =>
                  void transact(() =>
                    documentsApi.write(`/${detail.document.id}/archive`, {
                      revision: revisionRef.current,
                      archived: !detail.document.archived_at,
                    }),
                  )
                }
              >
                <Archive className="size-4" />
                {detail.document.archived_at
                  ? "Restaurează din arhivă"
                  : "Arhivează"}
              </button>
            )}
            {detail.actions["backups.manage"] && (
              <button
                className="dc-button"
                onClick={() => void prepareAction("backup")}
              >
                Backup și restaurare
              </button>
            )}
            {detail.actions.edit && !readonly && (
              <label className="dc-button cursor-pointer" title="PDF, DOCX, TXT, PNG sau JPEG, maximum 15 MiB. Importurile sunt izolate până la scanarea antimalware.">
                Import fișier
                <input
                  type="file"
                  className="dc-sr"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 15 * 1024 * 1024)
                      setError("Fișierul depășește limita de 15 MiB.");
                    else if (file)
                      void transact(async () => {
                        await documentsApi.import(detail.document.id, file);
                        setMessage(
                          "Fișier încărcat în carantină. Scanarea necesită configurare.",
                        );
                      });
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {detail.actions.edit && !readonly && (
            <p className="text-xs text-slate-400">
              Import: PDF, DOCX, TXT, PNG sau JPEG · maximum 15 MiB.
              Fișierele încărcate rămân în carantină până la scanarea antimalware,
              încă neconfigurată. PDF și Word generate pot fi descărcate separat.
            </p>
          )}
          {detail.files.length > 0 && (
            <section className="dc-panel">
              <h3 className="mb-3 font-semibold">Fișierele versiunii</h3>
              {detail.files.map((f) => (
                <div
                  key={f.id}
                  className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400"
                >
                  <span>
                    {f.file_name} · {Math.ceil(f.size_bytes / 1024)} KB ·{" "}
                    {f.scan_status === "quarantined"
                      ? "Carantină · indisponibil pentru distribuire"
                      : f.scan_status === "clean_generated"
                        ? "Generat securizat"
                        : f.scan_status === "clean_scanned"
                          ? "Scanat și verificat"
                          : "Indisponibil"}
                  </span>
                  {!["quarantined", "rejected"].includes(f.scan_status) && (
                    <button
                      className="dc-button"
                      onClick={() =>
                        void documentsApi
                          .download(
                            `/${detail.document.id}/files/${f.id}`,
                            f.file_name,
                          )
                          .catch((e) => setError((e as Error).message))
                      }
                    >
                      Descarcă
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      ) : bootstrap && view === "generator" && context ? (
        <Suspense fallback={<p>Se încarcă generatorul…</p>}>
          <DocumentGenerator
            context={context}
            projectId={projectId || params.get("project") || undefined}
            company={!!bootstrap.permissions["documents.company.owner"]}
            initialScope={generatorCompany ? "company" : undefined}
            onCreated={(id) => void open(id)}
            onCancel={() => void switchView("library")}
            onContextRefresh={refreshContext}
          />
          {bootstrap.permissions["documents.templates.manage"] && (
            <section className="dc-panel mt-4">
              <h3 className="mb-3 font-semibold">
                Administrarea modelelor originale
              </h3>
              <div className="flex flex-wrap gap-2">
                {context.templates.map((t) => (
                  <button
                    key={t.version_id}
                    className="dc-button"
                    onClick={() => {
                      setTemplateEdit(t);
                      setAction("template");
                    }}
                  >
                    {t.name} · v{t.version}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Modificarea creează o versiune nouă. Documentele existente
                păstrează versiunea lor.
              </p>
            </section>
          )}
          {bootstrap.permissions["documents.templates.manage"] && (
            <ServiceProfiles context={context} onSaved={refreshContext} />
          )}
        </Suspense>
      ) : bootstrap && view === "staff" ? (
        <StaffGuides />
      ) : (
        bootstrap && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="size-5" />
                {embedded ? "Documentele proiectului" : labels[view]}{" "}
                <span className="text-sm text-slate-500">{total}</span>
              </h2>
              <div className="flex gap-2">
                {projectId &&
                  bootstrap.permissions["documents.backups.manage"] && (
                    <button
                      className="dc-button"
                      disabled={busy || bootstrap.backup === "unconfigured"}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          let after = "";
                          let count = 0;
                          do {
                            const result = await documentsApi.write<{
                              data: { status: number }[];
                              nextCursor: string | null;
                            }>("/project-backups", {
                              projectId,
                              after,
                              confirmed: true,
                            });
                            if (result.data.some((r) => r.status !== 200))
                              throw new Error(
                                "Unele backupuri nu au fost verificate. Consultă istoricul documentelor.",
                              );
                            count += result.data.length;
                            after = result.nextCursor || "";
                          } while (after);
                          setMessage(
                            `${count} documente ale proiectului salvate și verificate.`,
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Backup proiect
                    </button>
                  )}
                {bootstrap.permissions["documents.create"] && (
                  <button
                    className="dc-button dc-primary"
                    onClick={() => void switchView("generator")}
                  >
                    <Plus className="size-4" /> Creează document
                  </button>
                )}
                {bootstrap.platformRole === "platform_owner" && !embedded && (
                  <button
                    className="dc-button"
                    onClick={() => void prepareAction("settings")}
                  >
                    Date emitent
                  </button>
                )}
                <button
                  className="dc-button"
                  disabled={busy}
                  aria-label="Reîncarcă documentele"
                  onClick={() => void load()}
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
            </div>
            <div className="dc-panel flex flex-wrap gap-3">
              <label className="dc-label flex-1 min-w-48">
                <span className="flex items-center gap-2">
                  <Search className="size-3" /> Caută documente autorizate
                </span>
                <input
                  className="dc-input"
                  type="search"
                  placeholder="Nume, număr, client, proiect, serviciu sau conținut"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="dc-label">
                Vizualizare
                <select
                  className="dc-input"
                  value={scopeFilter}
                  onChange={(e) => {
                    setScopeFilter(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">Toate</option>
                  <option value="client">Clienți</option>
                  <option value="internal">Interne / independente</option>
                  <option value="staff">Staff</option>
                </select>
              </label>
              <label className="dc-label">
                Stare
                <select
                  className="dc-input"
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">Toate</option>
                  {["Ciornă", "Aprobat", "Publicat", "Arhivat"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="dc-label">
                Ordine
                <select
                  className="dc-input"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="recent">Recent actualizate</option>
                  <option value="title">Titlu</option>
                </select>
              </label>
              <label className="dc-check self-center">
                <input
                  type="checkbox"
                  checked={archive}
                  onChange={(e) => {
                    setArchive(e.target.checked);
                    setOffset(0);
                  }}
                />{" "}
                Arhivă
              </label>
            </div>
            {busy && !items.length && (
              <p role="status" className="dc-panel">
                Se încarcă documentele…
              </p>
            )}
            <div className="dc-card-list">
              {visible.map((item) => (
                <button
                  type="button"
                  className="dc-panel dc-card hover:border-violet-400/40"
                  key={item.id}
                  onClick={() => void open(item.id)}
                >
                  <span className="dc-tag">{states(item)}</span>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p>
                    {item.company_name ||
                      (item.scope === "company" && "Arhivă corporativă") ||
                      "Document independent"}
                  </p>
                  <small className="mt-auto">
                    {item.number} ·{" "}
                    {new Date(item.updated_at).toLocaleDateString("ro-RO")}
                  </small>
                </button>
              ))}
            </div>
            {!busy && !error && !visible.length && (
              <div className="dc-panel py-10 text-center">
                <Library className="mx-auto mb-3 size-8 text-violet-300" />
                <h3 className="font-semibold">
                  {query || stateFilter
                    ? "Niciun rezultat pentru filtrele alese"
                    : "Biblioteca este pregătită"}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {bootstrap.staff
                    ? "Creează o ciornă dintr-un tipizat sau pornește de la un document nou."
                    : "Documentele publicate pentru tine vor apărea aici."}
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <button
                className="dc-button"
                disabled={!offset || busy}
                onClick={() => setOffset((v) => Math.max(0, v - 50))}
              >
                Pagina anterioară
              </button>
              <button
                className="dc-button"
                disabled={offset + 50 >= total || busy}
                onClick={() => setOffset((v) => v + 50)}
              >
                Pagina următoare
              </button>
            </div>
            {view === "hub" && (
              <LegacyHub
                onOpen={(id) => void open(id)}
                canImport={!!bootstrap.platformRole}
              />
            )}
          </>
        )
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(value) => {
          if (!value) {
            setPreview(null);
          }
        }}
      >
        <DialogContent className="dc-dialog sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Previzualizare PDF</DialogTitle>
            <DialogDescription className="text-slate-400">
              Fișierul efectiv generat pentru versiunea selectată.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <iframe
                title="Previzualizare document PDF"
                src={preview}
                className="h-[70vh] w-full rounded-lg bg-white"
              />
              <a
                className="dc-button"
                href={preview}
                target="_blank"
                rel="noreferrer"
              >
                Deschide PDF într-o filă nouă
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!action}
        onOpenChange={(value) => {
          if (!value && !busy) {
            setAction(null);
            setTemplateEdit(null);
          }
        }}
      >
        <DialogContent
          className={`dc-dialog ${templateEdit ? "sm:max-w-6xl" : "sm:max-w-2xl"}`}
        >
          <DialogHeader>
            <DialogTitle>
              {action === "approve"
                ? "Aprobarea versiunii"
                : action === "publish"
                  ? "Publicare în contul clientului"
                  : action === "share"
                    ? "Distribuie documentul"
                    : action === "backup"
                      ? "Backup și restaurare"
                      : action === "settings"
                        ? "Datele emitentului AVYRON"
                        : "Modele originale"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Verifică documentul, versiunea și efectele operațiunii înainte de
              confirmare.
            </DialogDescription>
          </DialogHeader>
          {action === "approve" && detail && (
            <div className="dc-grid">
              <p className="text-sm">
                {detail.version.payload.title} · v{detail.version.version}
              </p>
              {detail.issues.length > 0 && (
                <ul className="dc-notice">
                  {detail.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              {detail.document.legal === 1 && (
                <label className="dc-label">
                  Referința revizuirii juridice efectuate
                  <textarea
                    className="dc-input"
                    value={legalReference}
                    onChange={(e) => setLegalReference(e.target.value)}
                  />
                </label>
              )}
              <button
                className="dc-button dc-primary"
                disabled={
                  busy ||
                  detail.issues.length > 0 ||
                  (detail.document.legal === 1 && !legalReference.trim())
                }
                onClick={() =>
                  void transact(() =>
                    documentsApi.write(`/${detail.document.id}/approve`, {
                      revision: revisionRef.current,
                      legalReviewReference: legalReference,
                    }),
                  )
                }
              >
                Confirm verificarea și aprob versiunea
              </button>
            </div>
          )}
          {action === "publish" && detail && (
            <div className="dc-grid">
              <p className="text-sm">
                Versiunea aprobată va fi disponibilă numai destinatarilor
                selectați și autorizați pentru beneficiarul documentului.
              </p>
              {recipients.map((r) => (
                <label key={r.id} className="dc-check">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(r.id)}
                    onChange={(e) =>
                      setSelectedRecipients((v) =>
                        e.target.checked
                          ? [...v, r.id]
                          : v.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {r.display_name || r.email} · {r.email}
                </label>
              ))}
              <label className="dc-check">
                <input
                  type="checkbox"
                  checked={allowClientShare}
                  onChange={(e) => setAllowClientShare(e.target.checked)}
                />{" "}
                Permite distribuirea de către client
              </label>
              <label className="dc-check">
                <input
                  type="checkbox"
                  checked={allowAttachments}
                  onChange={(e) => setAllowAttachments(e.target.checked)}
                />{" "}
                Permite atașamente externe, cu confirmare la fiecare trimitere
              </label>
              <button
                className="dc-button dc-primary"
                disabled={
                  busy || !selectedRecipients.length || !detail.approvals.length
                }
                onClick={() =>
                  void transact(() =>
                    documentsApi.write(`/${detail.document.id}/publish`, {
                      revision: revisionRef.current,
                      recipients: selectedRecipients,
                      allowClientShare,
                      allowAttachments,
                    }),
                  )
                }
              >
                Publică pentru destinatarii selectați
              </button>
              <p className="text-xs text-slate-400">
                Nicio notificare nu trimite fișierul ca atașament.
              </p>
            </div>
          )}
          {action === "share" && detail && (
            <div className="dc-grid">
              <p className="text-sm font-medium">
                {detail.version.payload.title} · v{detail.version.version}
              </p>
              <label className="dc-label">
                Destinatar autorizat
                <select
                  className="dc-input"
                  value={share.recipientId}
                  onChange={(e) =>
                    setShare((v) => ({ ...v, recipientId: e.target.value }))
                  }
                >
                  <option value="">Selectează destinatarul</option>
                  {[
                    ...recipients,
                    ...(recipients.some((r) => r.id === user?.id)
                      ? []
                      : [
                          {
                            id: user?.id || "",
                            email: user?.email || "",
                            display_name: "Contul meu",
                          },
                        ]),
                  ].map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name || r.email} · {r.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dc-label">
                Canal
                <select
                  className="dc-input"
                  value={share.channel}
                  onChange={(e) =>
                    setShare((v) => ({
                      ...v,
                      channel: e.target.value,
                      confirmed: false,
                    }))
                  }
                >
                  <option value="link">Link privat</option>
                  <option value="email" disabled={!bootstrap?.channels.email}>
                    {bootstrap?.channels.email
                      ? "E-mail"
                      : "E-mail · neconfigurat"}
                  </option>
                  <option value="whatsapp">WhatsApp · partajare manuală</option>
                  <option value="telegram">Telegram · partajare manuală</option>
                  <option value="internal">AVYRON OS</option>
                </select>
              </label>
              <label className="dc-label">
                Subiect
                <input
                  className="dc-input"
                  value={share.subject}
                  onChange={(e) =>
                    setShare((v) => ({ ...v, subject: e.target.value }))
                  }
                />
              </label>
              <label className="dc-label">
                Mesaj
                <textarea
                  className="dc-input"
                  rows={3}
                  value={share.message}
                  onChange={(e) =>
                    setShare((v) => ({ ...v, message: e.target.value }))
                  }
                />
              </label>
              {share.channel === "email" && (
                <label className="dc-label">
                  Atașament
                  <select
                    className="dc-input"
                    value={share.attachment}
                    onChange={(e) =>
                      setShare((v) => ({
                        ...v,
                        attachment: e.target.value,
                        attachmentConfirmed: false,
                      }))
                    }
                  >
                    <option value="none">Numai link privat</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word</option>
                  </select>
                </label>
              )}
              {share.attachment !== "none" && (
                <label className="dc-check">
                  <input
                    type="checkbox"
                    checked={share.attachmentConfirmed}
                    onChange={(e) =>
                      setShare((v) => ({
                        ...v,
                        attachmentConfirmed: e.target.checked,
                      }))
                    }
                  />{" "}
                  Confirm trimiterea unei copii externe care nu mai poate fi
                  revocată.
                </label>
              )}
              <label className="dc-check">
                <input
                  type="checkbox"
                  checked={share.confirmed}
                  onChange={(e) =>
                    setShare((v) => ({ ...v, confirmed: e.target.checked }))
                  }
                />{" "}
                Confirm versiunea, destinatarul și canalul de mai sus.
              </label>
              <button
                className="dc-button dc-primary"
                disabled={
                  busy ||
                  !share.confirmed ||
                  !share.recipientId ||
                  (share.attachment !== "none" && !share.attachmentConfirmed)
                }
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await documentsApi.write<{
                      status: string;
                      link: string;
                      manualUrl: string | null;
                    }>(
                      `/${detail.document.id}/share`,
                      {
                        ...share,
                        versionId: detail.version.id,
                      },
                      "POST",
                      shareRequestKey.current,
                    );
                    setShareResult(result);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirmă distribuirea
              </button>
              {shareResult && (
                <div className="dc-notice">
                  <p>
                    Stare înregistrată:{" "}
                    {shareResult.status === "prepared"
                      ? "Pregătit · transmiterea nu este confirmată"
                      : shareResult.status === "sent"
                        ? "Transmis către furnizor / sistem"
                        : shareResult.status === "unknown"
                          ? "Rezultat necunoscut · verificare necesară"
                          : shareResult.status}
                    .
                  </p>
                  <p className="mt-2 break-all text-xs">{shareResult.link}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="dc-button"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(shareResult.link)
                          .then(() => setMessage("Link privat copiat."))
                      }
                    >
                      Copiază linkul
                    </button>
                    {shareResult.manualUrl && (
                      <a
                        className="dc-button"
                        href={shareResult.manualUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Deschide aplicația de partajare
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {action === "backup" && detail && backups && (
            <div className="dc-grid">
              {!backups.configured && (
                <p className="dc-notice">
                  Destinația privată separată nu este configurată. Nu există
                  protecție de backup Document Center verificată în producție.
                </p>
              )}
              <button
                className="dc-button dc-primary"
                disabled={busy || !backups.configured}
                onClick={() =>
                  void transact(() =>
                    documentsApi.write(`/${detail.document.id}/backups`, {}),
                  )
                }
              >
                Creează și verifică o copie separată
              </button>
              {backups.data.map((b) => (
                <div className="dc-panel" key={b.id}>
                  <p className="text-sm">
                    {new Date(b.created_at).toLocaleString("ro-RO")} ·{" "}
                    {b.status} · {Math.ceil(b.size_bytes / 1024)} KB
                  </p>
                  <button
                    className="dc-button mt-2"
                    disabled={
                      busy || !["verified", "restored"].includes(b.status)
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          "Restaurează conținutul într-o ciornă nouă? Publicarea și accesul actual rămân cele curente.",
                        )
                      )
                        void transact(() =>
                          documentsApi.write(
                            `/${detail.document.id}/backups/${b.id}/restore`,
                            { revision: revisionRef.current, confirmed: true },
                          ),
                        );
                    }}
                  >
                    Restaurează ca versiune nouă
                  </button>
                </div>
              ))}
            </div>
          )}
          {action === "template" && (
            <div className="dc-grid">
              {templateEdit ? (
                <>
                  <p>
                    {templateEdit.name} · v{templateEdit.version} ·{" "}
                    {templateEdit.review_status}
                  </p>
                  <MasterEditor
                    template={templateEdit}
                    onChange={onMasterPayload}
                  />
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() =>
                      void transact(async () => {
                        await documentsApi.write(
                          `/templates/${templateEdit.id}/versions`,
                          {
                            name: templateEdit.name,
                            payload: templateEdit.payload,
                            required: templateEdit.required,
                            legal: !!templateEdit.legal,
                          },
                        );
                        await refreshContext();
                      }, false)
                    }
                  >
                    Creează o versiune nouă a modelului
                  </button>
                  <label className="dc-label">
                    Referință revizuire efectuată
                    <input
                      className="dc-input"
                      value={legalReference}
                      onChange={(e) => setLegalReference(e.target.value)}
                    />
                  </label>
                  <button
                    className="dc-button"
                    disabled={busy || legalReference.trim().length < 8}
                    onClick={() =>
                      void transact(async () => {
                        await documentsApi.write(
                          `/templates/${templateEdit.version_id}/review`,
                          { reference: legalReference },
                        );
                        await refreshContext();
                      }, false)
                    }
                  >
                    Confirmă revizuirea acestei versiuni
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm">
                    Documentul este copiat într-un model nou, în starea
                    „necesită revizuire”. Modelul nu devine aprobat automat.
                  </p>
                  <button
                    className="dc-button dc-primary"
                    disabled={busy || !detail}
                    onClick={() =>
                      detail &&
                      void transact(async () => {
                        await documentsApi.write(
                          `/${detail.document.id}/save-template`,
                          {},
                        );
                        await refreshContext();
                      })
                    }
                  >
                    Propune tipizatul
                  </button>
                </>
              )}
            </div>
          )}
          {action === "settings" && (
            <div className="dc-grid">
              {Object.keys(companyDraft).map((key) => (
                <label className="dc-label" key={key}>
                  {
                    (
                      {
                        legal_name: "Denumire juridică",
                        tax_id: "CUI",
                        registration_number: "Registrul comerțului",
                        address: "Sediu",
                        representative: "Reprezentant",
                        contact_email: "E-mail",
                      } as Record<string, string>
                    )[key]
                  }
                  <input
                    className="dc-input"
                    value={companyDraft[key]}
                    onChange={(e) =>
                      setCompanyDraft((v) => ({ ...v, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
              <button
                className="dc-button dc-primary"
                disabled={busy}
                onClick={() =>
                  void transact(async () => {
                    await documentsApi.write(
                      "/settings/company",
                      companyDraft,
                      "PUT",
                    );
                    await refreshContext();
                  }, false)
                }
              >
                Salvează datele confirmate
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function StaffGuides() {
  const [guides, setGuides] = useState<
      Awaited<ReturnType<typeof documentsApi.staffGuides>>["data"]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    void documentsApi
      .staffGuides()
      .then((r) => setGuides(r.data))
      .catch((e) => setError((e as Error).message));
  }, []);
  return (
    <section className="dc-grid">
      <h2 className="text-lg font-semibold">
        Documentele operaționale pentru staff
      </h2>
      <p className="text-sm text-slate-400">
        {guides.length} documente existente. Prețurile și referințele istorice
        din ghiduri nu înlocuiesc catalogul comercial verificat.
      </p>
      {error && (
        <p role="alert" className="dc-notice">
          {error}
        </p>
      )}
      <div className="dc-grid md:grid-cols-2">
        {guides.map((g, i) => (
          <details className="dc-panel" key={g.id}>
            <summary className="cursor-pointer">
              <strong>
                {String(i + 1).padStart(2, "0")} · {g.title}
              </strong>
              <p className="mt-1 text-xs text-slate-400">{g.subtitle}</p>
            </summary>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
              {g.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
      <details className="dc-panel">
        <summary className="cursor-pointer text-sm">
          Registru de resurse interne
        </summary>
        <ResourceRegistry />
      </details>
    </section>
  );
}
function ResourceRegistry() {
  const Legacy = lazy(() =>
    import("@/components/dashboard/StaffResourcesTab").then((m) => ({
      default: m.StaffResourcesTab,
    })),
  );
  return (
    <Suspense fallback={<p>Se încarcă registrul…</p>}>
      <Legacy registryOnly />
    </Suspense>
  );
}
function LegacyHub({
  onOpen,
  canImport,
}: {
  onOpen: (id: string) => void;
  canImport: boolean;
}) {
  const [rows, setRows] = useState<
      Awaited<ReturnType<typeof documentsApi.legacyHub>>["data"]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (canImport)
      void documentsApi
        .legacyHub()
        .then((r) => setRows(r.data))
        .catch((e) => setError((e as Error).message));
  }, [canImport]);
  return (
    <section className="dc-panel">
      <h3 className="font-semibold">Documents Hub · surse existente</h3>
      <p className="mt-2 text-xs text-slate-400">
        Înregistrările istorice sunt păstrate. Importul creează o instanță
        privată; fișierele neverificate rămân în carantină.
      </p>
      {error && <p role="alert">{error}</p>}
      {!rows.length && (
        <p className="mt-3 text-sm text-slate-500">
          Nicio înregistrare istorică disponibilă pentru acest acces.
        </p>
      )}
      {rows.map((r) => (
        <div
          key={r.id}
          className="mt-3 flex items-center justify-between gap-2"
        >
          <p className="text-sm">
            {r.title} · {r.category}
          </p>
          <button
            className="dc-button"
            onClick={async () => {
              try {
                const id =
                  r.document_id ||
                  (
                    await documentsApi.write<{ id: string }>(
                      `/legacy-hub/${r.id}/import`,
                      {},
                    )
                  ).id;
                onOpen(id);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {r.document_id ? "Deschide" : "Importă privat"}
          </button>
        </div>
      ))}
    </section>
  );
}

const noop = () => {};
function MasterEditor({
  template,
  onChange,
}: {
  template: DocumentTemplate;
  onChange: (payload: DocumentPayload) => void;
}) {
  const detail: DocumentDetail = {
    document: {
      id: "master:" + template.version_id,
      number: "MODEL",
      title: template.name,
      scope: "internal",
      collection: "library",
      beneficiary_id: null,
      company_name: null,
      current_version_id: template.version_id,
      published_version_id: null,
      revision: 1,
      archived_at: null,
      approved: null,
      updated_at: 0,
      legal: template.legal,
    },
    version: {
      id: template.version_id,
      version: template.version,
      payload: template.payload,
      sha256: "",
    },
    versions: [],
    assignments: [],
    files: [],
    events: [],
    shares: [],
    approvals: [],
    grants: [],
    actions: { edit: true },
    issues: [],
  };
  return (
    <Suspense fallback={<p>Se încarcă editorul modelului…</p>}>
      <DocumentEditor
        key={template.version_id}
        detail={detail}
        localOnly
        required={template.required}
        onChange={onChange}
        onSaved={noop}
        onSaveReady={noop}
      />
    </Suspense>
  );
}
