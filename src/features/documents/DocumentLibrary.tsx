import { useState } from "react";
import {
  FileText,
  Search,
  List,
  LayoutGrid,
  Download,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import type { DocumentContext, DocumentSummary } from "@/lib/documentsApi";
import { documentState, TEMPLATE_META } from "./presentation";
export default function DocumentLibrary({
  items,
  total,
  offset,
  busy,
  error,
  query,
  onQuery,
  scope,
  onScope,
  state,
  onState,
  sort,
  onSort,
  archive,
  onArchive,
  onPage,
  onOpen,
  onDownload,
  canExport,
  context,
  family,
  onFamily,
  client,
  onClient,
  lockedScope = false,
}: {
  items: DocumentSummary[];
  total: number;
  offset: number;
  busy: boolean;
  error: string;
  query: string;
  onQuery: (s: string) => void;
  scope: string;
  onScope: (s: string) => void;
  state: string;
  onState: (s: string) => void;
  sort: string;
  onSort: (s: string) => void;
  archive: boolean;
  onArchive: (v: boolean) => void;
  onPage: (offset: number) => void;
  onOpen: (id: string) => void;
  onDownload: (item: DocumentSummary) => void;
  canExport: boolean;
  context: DocumentContext | null;
  family: string;
  onFamily: (s: string) => void;
  client: string;
  onClient: (s: string) => void;
  lockedScope?: boolean;
}) {
  const [layout, setLayout] = useState<"list" | "cards">("list");
  const active = !!(scope || state || archive || family || client);
  return (
    <section className="dc-grid" aria-label="Bibliotecă Agenție">
      <div className="dc-search-panel">
        <label className="dc-label dc-search-main">
          <span>
            <Search className="size-4" />
            Caută în documentele autorizate
          </span>
          <input
            className="dc-input"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Titlu, număr, client, proiect, serviciu sau conținut…"
          />
        </label>
        <label className="dc-label">
          Ordine
          <select
            aria-label="Ordinea documentelor"
            className="dc-input"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
          >
            <option value="recent">Recent actualizate</option>
            <option value="title">Titlu A–Z</option>
            <option value="number">Număr document</option>
          </select>
        </label>
        <div
          className="dc-layout-switch"
          role="group"
          aria-label="Prezentarea documentelor"
        >
          <button
            className="dc-button"
            aria-label="Listă compactă"
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
          >
            <List className="size-4" />
          </button>
          <button
            className="dc-button"
            aria-label="Carduri documente"
            aria-pressed={layout === "cards"}
            onClick={() => setLayout("cards")}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>
      <div className="dc-heading-row">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Stările documentelor"
        >
          {[
            ["", "Toate"],
            ["Ciornă", "Ciorne"],
            ["Aprobat", "Aprobate"],
            ["Publicat", "Publicate"],
            ["Arhivat", "Arhivă"],
          ].map(([value, label]) => (
            <button
              key={label}
              className="dc-filter-chip"
              aria-pressed={state === value}
              onClick={() => {
                onState(value);
                onArchive(value === "Arhivat");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400" role="status">
          {busy
            ? "Se actualizează…"
            : `${total} ${total === 1 ? "document" : "documente"}`}
        </span>
      </div>
      <details className="dc-filter-panel" open={active || undefined}>
        <summary>
          <SlidersHorizontal className="size-4" />
          Filtrează după context{active ? " · filtre active" : ""}
        </summary>
        <div className="dc-filter-grid">
          {!lockedScope && context && (
            <label className="dc-label">
              Vizibilitate
              <select
                aria-label="Vizibilitatea documentelor"
                className="dc-input"
                value={scope}
                onChange={(e) => onScope(e.target.value)}
              >
                <option value="">Toate vizibilitățile</option>
                <option value="client">Documente clienți</option>
                <option value="internal">Interne / independente</option>
                <option value="staff">Documente STAFF</option>
              </select>
            </label>
          )}
          {context && !lockedScope && (
            <label className="dc-label">
              Client
              <select
                aria-label="Clientul documentelor"
                className="dc-input"
                value={client}
                onChange={(e) => onClient(e.target.value)}
              >
                <option value="">Toți clienții autorizați</option>
                {context.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="dc-label">
            Tip document
            <select
              aria-label="Tipul documentului"
              className="dc-input"
              value={family}
              onChange={(e) => onFamily(e.target.value)}
            >
              <option value="">Toate tipurile</option>
              {Object.entries(TEMPLATE_META).map(([id, m]) => (
                <option key={id} value={id}>
                  {context?.templates.find((t) => t.family === id)?.name ||
                    (
                      {
                        brief: "Brief",
                        audit: "Audit",
                        offer: "Ofertă",
                        framework: "Contract",
                        annex: "Anexă",
                        access: "Acord de acces",
                        privacy: "Confidențialitate",
                        implementation: "Plan",
                        report: "Raport",
                        handover: "Recepție",
                        sla: "Mentenanță / SLA",
                      } as Record<string, string>
                    )[id]}{" "}
                  · {m.group}
                </option>
              ))}
              <option value="custom">Documente de la zero</option>
            </select>
          </label>
          {active && (
            <button
              className="dc-button self-end"
              onClick={() => {
                onScope("");
                onFamily("");
                onClient("");
                onState("");
                onArchive(false);
              }}
            >
              Resetează filtrele
            </button>
          )}
        </div>
      </details>
      {busy && !items.length && (
        <p role="status" className="dc-panel">
          Se încarcă documentele…
        </p>
      )}
      <div
        className={layout === "list" ? "dc-document-list" : "dc-template-grid"}
      >
        {items.map((item) => (
          <article
            key={item.id}
            className={
              layout === "list" ? "dc-document-row" : "dc-document-card"
            }
          >
            <div className="dc-document-icon" aria-hidden>
              <FileText className="size-5" />
            </div>
            <div className="dc-document-main">
              <button
                className="dc-document-title"
                onClick={() => onOpen(item.id)}
              >
                {item.title}
              </button>
              <p className="mt-1 text-xs text-slate-400">
                {item.company_name ||
                  (item.scope === "company"
                    ? "Arhivă corporativă"
                    : item.scope === "staff"
                      ? "Echipa AVYRON"
                      : "Document independent")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.number} ·{" "}
                {new Date(item.updated_at).toLocaleDateString("ro-RO")}
                {item.template_family
                  ? ` · ${TEMPLATE_META[item.template_family]?.group || "Personalizat"}`
                  : ""}
              </p>
            </div>
            <span
              className={`dc-status dc-status-${item.archived_at ? "archived" : item.published_version_id === item.current_version_id ? "published" : item.approved ? "approved" : "draft"}`}
            >
              {documentState(item)}
            </span>
            <div className="flex gap-2">
              {canExport && (
                <button
                  className="dc-button"
                  aria-label={`Descarcă PDF · ${item.title}`}
                  disabled={busy}
                  onClick={() => onDownload(item)}
                >
                  <Download className="size-4" />
                  <span>PDF</span>
                </button>
              )}
              <button
                className="dc-button"
                aria-label={`Deschide documentul · ${item.title}`}
                onClick={() => onOpen(item.id)}
              >
                <ArrowUpRight className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!busy && !error && !items.length && (
        <div className="dc-empty">
          <FileText className="size-8" />
          <h3>
            {query || active
              ? "Niciun document pentru această selecție"
              : "Documentele tale, organizate într-un singur loc"}
          </h3>
          <p>
            {query || active
              ? "Modifică termenii de căutare sau resetează filtrele."
              : "Folosește un tipizat sau creează un document nou. Documentele publicate apar în contul beneficiarului autorizat."}
          </p>
        </div>
      )}
      {total > 50 && (
        <div className="dc-heading-row">
          <span className="text-xs text-slate-500">
            {offset + 1}–{Math.min(offset + 50, total)} din {total}
          </span>
          <div className="flex gap-2">
            <button
              className="dc-button"
              disabled={offset === 0 || busy}
              onClick={() => onPage(Math.max(0, offset - 50))}
            >
              Anterioară
            </button>
            <button
              className="dc-button"
              disabled={offset + 50 >= total || busy}
              onClick={() => onPage(offset + 50)}
            >
              Următoare
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
