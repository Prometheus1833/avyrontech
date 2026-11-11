import { documentCompanyIdentity } from "@/shared/documents/autofill";
import AgencyGeneratorContext from "@/features/leads-agency/AgencyGeneratorContext";
import CompanySummary from "./CompanySummary";
import DocumentLibrary from "./DocumentLibrary";
import {
  DOCUMENT_VIEWS,
  allowedDocumentViews,
  companyFieldLabels,
  type DocumentView,
} from "./presentation";
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
  ShieldCheck,
  Library,
  Wand2,
  BookOpen,
  Users,
  Layers,
  Building2,
  ArrowLeft,
  Download,
  Receipt,
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
const DocumentBilling = lazy(() => import("./DocumentBilling"));
const DocumentTemplates = lazy(() => import("./DocumentTemplates"));
const ServiceProfiles = lazy(() => import("./ServiceProfiles"));
type View = DocumentView;
const labels = Object.fromEntries(
  Object.entries(DOCUMENT_VIEWS).map(([key, value]) => [key, value.label]),
) as Record<View, string>;
const icons = {
  library: Library,
  generator: Wand2,
  templates: BookOpen,
  staff: Users,
  hub: Layers,
  company: Building2,
};
export default function AgencyDocumentCenter({
  projectId,
  clientId,
  serviceId,
  subscriptionId,
  initialView,
  embedded = false,
}: {
  projectId?: string;
  clientId?: string;
  serviceId?: string;
  subscriptionId?: string;
  initialView?: View;
  embedded?: boolean;
}) {
  const defaultView = initialView ?? (embedded ? "library" : "generator");
  const { user } = useAuth();
  const [generatorClient, setGeneratorClient] = useState<string>();
  const [generatorScope, setGeneratorScope] = useState<
    "company" | "staff" | undefined
  >();
  const [params, setParams] = useSearchParams();
  const [bootstrap, setBootstrap] = useState<DocumentBootstrap | null>(null),
    [context, setContext] = useState<DocumentContext | null>(null),
    [view, setView] = useState<View>(() =>
      !embedded &&
      params.get("documentView") &&
      Object.prototype.hasOwnProperty.call(
        DOCUMENT_VIEWS,
        params.get("documentView")!,
      )
        ? (params.get("documentView") as View)
        : defaultView,
    ),
    [items, setItems] = useState<DocumentSummary[]>([]),
    [total, setTotal] = useState(0),
    [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [archive, setArchive] = useState(false),
    [scopeFilter, setScopeFilter] = useState(""),
    [stateFilter, setStateFilter] = useState(""),
    [sort, setSort] = useState("recent"),
    [familyFilter, setFamilyFilter] = useState(""),
    [clientFilter, setClientFilter] = useState(""),
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
      | "billing"
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
  const requestedTemplate = params.get("template");
  const handledTemplate = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedTemplate) {
      handledTemplate.current = null;
      return;
    }
    if (
      embedded ||
      !context ||
      !bootstrap?.permissions["documents.templates.manage"] ||
      handledTemplate.current === requestedTemplate
    )
      return;
    handledTemplate.current = requestedTemplate;
    const template = context.templates.find((t) => t.id === requestedTemplate);
    if (!template) {
      setError("Model indisponibil sau acces neautorizat.");
      return;
    }
    setView("templates");
    setTemplateEdit(template);
    setLegalReference("");
    setAction("template");
  }, [requestedTemplate, embedded, context, bootstrap]);
  const requestedView = params.get("documentView") || defaultView;
  useEffect(() => {
    if (embedded || !bootstrap) return;
    const allowed = allowedDocumentViews(bootstrap);
    if (allowed.includes(requestedView as View)) {
      setView(requestedView as View);
    } else {
      setView(allowed.includes("generator") ? "generator" : "library");
      setItems([]);
      if (params.get("documentView")) setError("Secțiune indisponibilă pentru accesul curent.");
    }
  }, [requestedView, bootstrap, embedded, params]);
  const requestedSubscription = !embedded
    ? params.get("subscription") || undefined
    : undefined;
  const contextualFilters = embedded
    ? ""
    : new URLSearchParams(
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
        return data;
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
    setError("");
  }, []);
  const initialize = useCallback(async () => {
    setError("");
    try {
      const data = await documentsApi.bootstrap();
      if (!mounted.current) return;
      setBootstrap(data);
      if (data.staff) await refreshContext();
    } catch (cause) {
      if (mounted.current) setError((cause as Error).message);
    }
  }, [refreshContext]);
  useEffect(() => {
    void initialize();
  }, [initialize]);
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
    if (
      !bootstrap ||
      ["generator", "templates"].includes(view) ||
      !allowedDocumentViews(bootstrap).includes(view)
    )
      return;
    const sequence = ++listSequence.current;
    setBusy(true);
    setError("");
    const p = new URLSearchParams({
      q: debounced,
      archived: archive ? "1" : "0",
      offset: String(offset),
      sort,
      state: stateFilter,
      family: familyFilter,
    });
    if (view !== "company" && view !== "staff") {
      for (const [key, value] of new URLSearchParams(contextualFilters))
        p.set(key, value);
      if (projectId) p.set("project", projectId);
      if (clientId) p.set("client", clientId);
      if (serviceId) p.set("service", serviceId);
      if (subscriptionId || requestedSubscription)
        p.set("subscription", subscriptionId || requestedSubscription!);
      if (clientFilter && !p.has("client")) p.set("client", clientFilter);
    }
    if (view === "company") p.set("scope", "company");
    else if (view === "staff") p.set("scope", "staff");
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
    familyFilter,
    clientFilter,
  ]);
  useEffect(() => {
    if (!detail) void load();
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
  const switchView = async (next: View, templateVersion?: string) => {
    if (detail && !(await save.current())) {
      setError("Salvează ciorna înainte de navigare.");
      return;
    }
    ++openSequence.current;
    opening.current = null;
    suppressUrlOpen.current = true;
    setDetail(null);
    setTemplateEdit(null);
    if (next === "generator") {
      setGeneratorClient(
        clientFilter ||
          clientId ||
          (!embedded ? params.get("client") || undefined : undefined),
      );
      setGeneratorScope(
        view === "company" ? "company" : view === "staff" ? "staff" : undefined,
      );
    }
    setView(next);
    setItems([]);
    setQuery("");
    setDebounced("");
    setFamilyFilter("");
    setClientFilter("");
    setOffset(0);
    setScopeFilter("");
    setStateFilter("");
    if (!embedded)
      setParams(
        (current) => {
          const nextParams = new URLSearchParams(current);
          nextParams.delete("document");
          nextParams.delete("version");
          nextParams.set("documentView", next);
          if (next === "generator" && templateVersion)
            nextParams.set("documentTemplate", templateVersion);
          else nextParams.delete("documentTemplate");
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
  const prepareAction = async (next: typeof action, source = detail) => {
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
    if (source && source === detail && !(await save.current())) {
      setError("Salvează ciorna înainte de continuare.");
      return;
    }
    if (detail && next === "billing") {
      try {
        const fresh = await documentsApi.get(detail.document.id);
        if (
          !fresh.actions["billing.prepare"] ||
          !fresh.approvals.length ||
          !fresh.version.payload.lines.length
        ) {
          setError(
            "Aprobă versiunea curentă și verifică devizul înainte de pregătirea facturii.",
          );
          return;
        }
        setDetail(fresh);
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    if (source && (next === "publish" || next === "share")) {
      try {
        setRecipients((await documentsApi.recipients(source.document.id)).data);
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
    if (next === "settings") {
      const company = documentCompanyIdentity(context?.company || {});
      setCompanyDraft(
        Object.fromEntries(
          [
            "legal_name",
            "tax_id",
            "registration_number",
            "address",
            "registered_address",
            "representative",
            "contact_email",
            "share_capital",
          ].map((key) => [key, company[key] || ""]),
        ),
      );
    }
    setAction(next);
  };
  const download = async (format: "pdf" | "docx", asPreview = false, source = detail) => {
    if (!source) return;
    setBusy(true);
    setError("");
    try {
      if (source === detail && !(await save.current()))
        throw new Error("Documentul nu a putut fi salvat.");
      const data = await documentsApi.get(source.document.id, source === detail ? requestVersion : source.version.id);
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
    <div className="document-center dc-grid" aria-label="Centru Documente">
      {!embedded && (
        <header className="dc-center-header">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-violet-300">
                AVYRON OS · Documente
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold">
                Centru Documente
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
        <nav className="dc-section-nav" aria-label="Zone Document Center">
          {allowedDocumentViews(bootstrap)
            .filter((v) => v !== "hub")
            .map((v) => {
              const Icon = icons[v];
              return (
                <button
                  key={v}
                  className="dc-section-link"
                  aria-current={view === v && !detail ? "page" : undefined}
                  onClick={() => void switchView(v)}
                >
                  <Icon className="size-4" />
                  <span>
                    <strong>{labels[v]}</strong>
                    <small>{DOCUMENT_VIEWS[v].description}</small>
                  </span>
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
              !bootstrap
                ? void initialize()
                : detail
                  ? void open(detail.document.id)
                  : bootstrap.staff && !context
                    ? void refreshContext().catch((e) =>
                        setError((e as Error).message),
                      )
                    : void load()
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
          {detail.actions.export && <p className="dc-notice text-xs">Descarcă PDF sau Word editabil pentru utilizare externă. {detail.approvals.length ? "Exportul corespunde versiunii aprobate." : "Exporturile acestei versiuni sunt marcate CIORNĂ NEAPROBATĂ; revizuirea și aprobarea se fac separat."}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="dc-button" onClick={() => void close()}>
              <ArrowLeft className="size-4" />{" "}
              {embedded && clientId
                ? "Documentele clientului"
                : "Bibliotecă Agenție"}
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
                    <Download className="size-4" /> Descarcă PDF
                  </button>
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() => void download("docx")}
                  >
                    Descarcă Word (.docx)
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
              {detail.actions["billing.prepare"] &&
                detail.approvals.length > 0 &&
                detail.version.payload.lines.length > 0 &&
                detail.version.id === detail.document.current_version_id && (
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() => void prepareAction("billing")}
                  >
                    <Receipt className="size-4" />
                    {detail.billingPreparation
                      ? "Ciorna de factură"
                      : "Pregătește factura"}
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
              <label
                className="dc-button cursor-pointer"
                title="PDF, DOCX, TXT, PNG sau JPEG, maximum 15 MiB. Importurile sunt izolate până la scanarea antimalware."
              >
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
                        const imported=await documentsApi.import(detail.document.id, file);
                        setMessage(
                          imported.status === "clean_scanned" ? "Fișier verificat CLEAN și importat privat." : "Fișier în carantină, fără acces până la verificare.",
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
              Import: PDF, DOCX, TXT, PNG sau JPEG · maximum 15 MiB. Fișierele
              încărcate necesită verdict CLEAN. Fără furnizor configurat sau verificarea
              conformității, importurile reale sunt blocate. PDF și Word generate pot fi descărcate separat.
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
                  {["clean_generated", "clean_scanned"].includes(f.scan_status) && (
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
      ) : bootstrap && ["templates", "generator"].includes(view) && !context ? (
        <p role="status" className="dc-panel">
          {error
            ? "Contextul documentelor nu a putut fi încărcat. Folosește Reîncearcă încărcarea."
            : "Se încarcă datele și modelele autorizate…"}
        </p>
      ) : bootstrap && view === "templates" && context ? (
        <Suspense fallback={<p>Se încarcă tipizatele…</p>}>
          <DocumentTemplates
            context={context}
            canCreate={!!bootstrap.permissions["documents.create"]}
            canManage={!!bootstrap.permissions["documents.templates.manage"]}
            onUse={(version) => void switchView("generator", version)}
            onEdit={(t) => {
              setTemplateEdit(t);
              setLegalReference("");
              setAction("template");
            }}
          />
          {bootstrap.permissions["documents.templates.manage"] && (
            <details className="dc-panel mt-4">
              <summary className="cursor-pointer text-sm">
                Configurări pentru documentele activităților
              </summary>
              <ServiceProfiles context={context} onSaved={refreshContext} />
            </details>
          )}
        </Suspense>
      ) : bootstrap && view === "generator" && context ? (
        <Suspense fallback={<p>Se încarcă generatorul…</p>}>
          <AgencyGeneratorContext id={!embedded ? params.get("agencyOpportunity") : null}>{agencySeed => <DocumentGenerator
            agencySeed={agencySeed}
            key={
              ((!embedded && params.get("documentTemplate")) || "blank-generator") + (agencySeed ? ":agency:" + agencySeed.opportunityId + ":" + agencySeed.revision : "")
            }
            initialTemplateVersion={
              !embedded
                ? params.get("documentTemplate") || (agencySeed ? context.templates.find(t=>t.family==="offer")?.version_id : undefined)
                : undefined
            }
            initialClientId={
              generatorClient ||
              clientId ||
              (!embedded ? params.get("client") || undefined : undefined)
            }
            initialServiceId={
              serviceId ||
              (!embedded ? params.get("service") || undefined : undefined)
            }
            initialSubscriptionId={subscriptionId || requestedSubscription}
            context={context}
            projectId={
              projectId ||
              (!embedded ? params.get("project") || undefined : undefined)
            }
            company={
              !embedded && !!bootstrap.permissions["documents.company.owner"]
            }
            lockedClientId={embedded ? clientId : undefined}
            initialScope={generatorScope}
            canExport={!!bootstrap.permissions["documents.export"]}
            canShare={!!bootstrap.permissions["documents.share"]}
            onCreated={(id, action) => void (async () => {
              const data = await open(id);
              if (!data) return;
              if (action === "pdf" || action === "docx") await download(action, false, data);
              else if (action === "share") await prepareAction("share", data);
            })()}
            onCancel={() => void switchView("library")}
            onContextRefresh={refreshContext}
          />}</AgencyGeneratorContext>
        </Suspense>
      ) : (
        bootstrap && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="size-5" />
                {embedded
                  ? clientId && !projectId
                    ? "Documentele clientului"
                    : "Documentele proiectului"
                  : labels[
                      bootstrap &&
                      allowedDocumentViews(bootstrap).includes(view)
                        ? view
                        : "library"
                    ]}{" "}
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
                {!!bootstrap.platformRole && !embedded && view !== "company" && (
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
            {view === "company" && context && bootstrap.permissions["documents.company.owner"] && <CompanySummary company={context.company} onEdit={() => void prepareAction("settings")} />}
            <DocumentLibrary
              items={items}
              total={total}
              offset={offset}
              busy={busy}
              error={error}
              query={query}
              onQuery={setQuery}
              scope={scopeFilter}
              onScope={(v) => {
                setScopeFilter(v);
                setOffset(0);
              }}
              state={stateFilter}
              onState={(v) => {
                setStateFilter(v);
                setOffset(0);
              }}
              sort={sort}
              onSort={(v) => {
                setSort(v);
                setOffset(0);
              }}
              archive={archive}
              onArchive={(v) => {
                setArchive(v);
                setOffset(0);
              }}
              onPage={setOffset}
              onOpen={(id) => void open(id)}
              canExport={
                !bootstrap.staff || !!bootstrap.permissions["documents.export"]
              }
              context={context}
              family={familyFilter}
              onFamily={(v) => {
                setFamilyFilter(v);
                setOffset(0);
              }}
              client={clientFilter}
              onClient={(v) => {
                setClientFilter(v);
                setOffset(0);
              }}
              lockedScope={
                !!(embedded && clientId) ||
                view === "company" ||
                view === "staff"
              }
              onDownload={async (item) => {
                setBusy(true);
                setError("");
                try {
                  await documentsApi.download(
                    `/${item.id}/export/pdf?version=${item.current_version_id}`,
                    `${item.number}.pdf`,
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            {view === "staff" && (
              <>
                <StaffGuides query={query} />
                <button
                  className="dc-button justify-self-start"
                  onClick={() => void switchView("hub")}
                >
                  Deschide Documents Hub · arhiva existentă
                </button>
              </>
            )}
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
            if (params.has("template"))
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  next.delete("template");
                  return next;
                },
                { replace: true },
              );
          }
        }}
      >
        <DialogContent
          className={`dc-dialog ${templateEdit ? "sm:max-w-6xl" : "sm:max-w-2xl"}`}
        >
          <DialogHeader>
            <DialogTitle>
              {action === "billing"
                ? "Pregătire factură"
                : action === "approve"
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
          {action === "billing" && detail && (
            <Suspense
              fallback={<p role="status">Se încarcă datele de facturare…</p>}
            >
              <DocumentBilling
                detail={detail}
                onSaved={async () => {
                  await open(detail.document.id);
                  setAction(null);
                  setMessage(
                    "Ciorna de factură este disponibilă în Financiar pentru verificare.",
                  );
                }}
              />
            </Suspense>
          )}
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
              {!detail.approvals.length && <p className="dc-notice">Poți pregăti mesajul, dar documentul trebuie verificat și aprobat înainte de trimitere. Publicarea pentru client se face separat.</p>}
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
                  !detail.approvals.length || !share.confirmed ||
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
              <p className="dc-notice text-xs">Folosește Bd. Independenței pentru corespondență. Completează sediul social separat, conform documentelor societății.</p>
              {Object.keys(companyDraft).map((key) => (
                <label className="dc-label" key={key}>
                  {companyFieldLabels[key] || key}
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
function StaffGuides({ query = "" }: { query?: string }) {
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
        Ghiduri operaționale pentru echipă
      </h2>
      <p className="text-sm text-slate-400">
        {guides.length} ghiduri. Pentru tarife și pachete, consultați catalogul
        comercial AVYRON.
      </p>
      {error && (
        <p role="alert" className="dc-notice">
          {error}
        </p>
      )}
      <div className="dc-grid md:grid-cols-2">
        {guides
          .filter(
            (g) =>
              !query.trim() ||
              [g.title, g.subtitle, ...g.paragraphs]
                .join(" ")
                .toLocaleLowerCase("ro")
                .includes(query.trim().toLocaleLowerCase("ro")),
          )
          .map((g, i) => (
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
