import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { Node } from "@tiptap/core";
import { documentsApi, type DocumentDetail } from "@/lib/documentsApi";
import {
  documentIssues,
  replaceVariables,
  type DocumentPayload,
  type DocumentNode,
} from "@/shared/documents/model";
import { FIELD_LABELS, templateFields } from "@/shared/documents/templates";
import { registerDocumentSave } from "./navigation";
import { sanitizeDocumentPaste } from "./sanitizePaste";

const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: () => [
    "div",
    { "data-page-break": "true", "aria-label": "Sfârșit de pagină" },
  ],
});
export default function DocumentEditor({
  detail,
  required,
  readonly = false,
  localOnly = false,
  onSaved,
  onChange,
  onSaveReady,
}: {
  detail: DocumentDetail;
  required: string[];
  readonly?: boolean;
  localOnly?: boolean;
  onSaved: (value: {
    revision: number;
    versionId: string;
    payload?: DocumentPayload;
  }) => void;
  onChange: (payload: DocumentPayload, dirty: boolean) => void;
  onSaveReady: (save: () => Promise<boolean>) => void;
}) {
  const [draft, setDraft] = useState(detail.version.payload),
    [saved, setSaved] = useState(JSON.stringify(detail.version.payload)),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(""),
    [zoom, setZoom] = useState(100),
    [contextOpen, setContextOpen] = useState(true);
  const latest = useRef(draft),
    revision = useRef(detail.document.revision),
    flight = useRef(false),
    attempt = useRef<{
      payload: DocumentPayload;
      revision: number;
      key: string;
    } | null>(null),
    mounted = useRef(true);
  latest.current = draft;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: {} }),
      TableKit.configure({ table: { resizable: false } }),
      Image.configure({ allowBase64: true, inline: false }),
      PageBreakNode,
    ],
    content: detail.version.payload.body,
    editable: !readonly,
    onUpdate: ({ editor: e }) =>
      setDraft((v) => ({ ...v, body: e.getJSON() as DocumentNode })),
    editorProps: {
      transformPastedHTML: sanitizeDocumentPaste,
      handlePaste: (_view, event) => !!event.clipboardData?.files.length,
      handleDrop: (_view, event) => !!event.dataTransfer?.files.length,
      attributes: {
        "aria-label": "Conținutul documentului",
        "aria-multiline": "true",
        role: "textbox",
      },
    },
  });
  const dirty = JSON.stringify(draft) !== saved;
  const save = useCallback(async () => {
    if (readonly || localOnly) return true;
    if (flight.current) return false;
    if (!attempt.current && JSON.stringify(latest.current) === saved)
      return true;
    flight.current = true;
    setSaving(true);
    setSaveError("");
    const request = attempt.current || {
      payload: latest.current,
      revision: revision.current,
      key: crypto.randomUUID(),
    };
    attempt.current = request;
    try {
      const result = await documentsApi.save(
        detail.document.id,
        request.payload,
        request.revision,
        request.key,
      );
      revision.current = result.revision;
      attempt.current = null;
      if (mounted.current) {
        setSaved(JSON.stringify(request.payload));
        onSaved({ ...result, payload: request.payload });
      }
      return JSON.stringify(latest.current) === JSON.stringify(request.payload);
    } catch (e) {
      if (mounted.current) setSaveError((e as Error).message);
      return false;
    } finally {
      flight.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [detail.document.id, onSaved, readonly, localOnly, saved]);
  useEffect(() => {
    onSaveReady(save);
  }, [save, onSaveReady]);
  useEffect(
    () => (localOnly ? undefined : registerDocumentSave(save)),
    [save, localOnly],
  );
  useEffect(() => {
    onChange(draft, dirty);
  }, [draft, dirty, onChange]);
  useEffect(() => {
    if (!dirty || readonly || localOnly || saveError || saving) return;
    const timer = setTimeout(() => void save(), 2000);
    return () => clearTimeout(timer);
  }, [dirty, draft, readonly, localOnly, saveError, saving, save]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== saved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [saved]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const issues = documentIssues(draft, required),
    fields = [
      ...new Set([
        ...required,
        ...Object.keys(draft.fields),
        ...templateFields(draft),
      ]),
    ];
  const tool = (name: string, run: () => void, active = false) => (
    <button
      type="button"
      className="dc-button"
      aria-label={name}
      title={name}
      aria-pressed={active}
      onClick={run}
      disabled={readonly}
    >
      {name}
    </button>
  );
  const materialize = () => {
    const value = replaceVariables(latest.current, latest.current.fields);
    setDraft(value);
    editor?.commands.setContent(value.body);
  };
  return (
    <div className="dc-grid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="status"
          aria-live="polite"
          className="text-xs text-slate-400"
        >
          {localOnly
            ? "Model în editare · salvarea creează o versiune nouă"
            : readonly
              ? "Document protejat · numai citire"
              : saving
                ? "Se salvează…"
                : saveError
                  ? "Salvare întreruptă"
                  : dirty
                    ? "Modificări în curs de salvare"
                    : "Toate modificările sunt salvate"}
        </div>
        <div className="flex gap-2">
          <button
            className="dc-button"
            type="button"
            aria-expanded={contextOpen}
            onClick={() => setContextOpen(!contextOpen)}
          >
            Variabile și verificări
          </button>
          {!readonly && !localOnly && (
            <button
              className="dc-button"
              disabled={saving}
              type="button"
              onClick={() => void save()}
            >
              Salvează acum
            </button>
          )}
        </div>
      </div>
      {saveError && (
        <div role="alert" className="dc-notice dc-editor-error">
          {saveError}. Textul rămâne în editor.{" "}
          <button className="underline" onClick={() => void save()}>
            Reîncearcă salvarea
          </button>{" "}
          ·{" "}
          <button
            className="underline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(latest.current, null, 2)], {
                  type: "application/json",
                }),
                url = URL.createObjectURL(blob),
                a = document.createElement("a");
              a.href = url;
              a.download = "avyron-ciorna-privata.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Salvează o copie locală privată
          </button>
        </div>
      )}
      {draft.lines.length > 0 && (
        <details className="dc-panel">
          <summary className="cursor-pointer text-sm font-semibold">
            Devizul documentului · {draft.lines.length} poziții
          </summary>
          <div className="mt-4 dc-grid">
            {draft.lines.map((line, index) => (
              <div
                key={`${line.catalogId}:${index}`}
                className="dc-panel dc-grid sm:grid-cols-3"
              >
                <p className="sm:col-span-3 text-sm font-semibold">
                  {line.label}
                </p>
                <p className="sm:col-span-3 text-xs text-slate-400">
                  Catalog:{" "}
                  {line.catalogPriceMinor === null
                    ? "La ofertare"
                    : `${(line.catalogPriceMinor / 100).toLocaleString("ro-RO")} ${line.currency}`}{" "}
                  ·{" "}
                  {line.taxVerified
                    ? "Fiscalitate verificată"
                    : "Fiscalitate de verificat"}{" "}
                  · {line.billingCycle}
                </p>
                {(
                  ["quantity", "offeredPriceMinor", "discountReason"] as const
                ).map((key) => (
                  <label key={key} className="dc-label">
                    {key === "quantity"
                      ? "Cantitate"
                      : key === "offeredPriceMinor"
                        ? "Preț ofertat / unitate"
                        : "Motivul modificării"}
                    <input
                      className="dc-input"
                      disabled={readonly}
                      type={key === "discountReason" ? "text" : "number"}
                      min={key === "quantity" ? 1 : 0}
                      step={key === "offeredPriceMinor" ? ".01" : "1"}
                      value={
                        key === "offeredPriceMinor"
                          ? line[key] / 100
                          : line[key]
                      }
                      onChange={(e) =>
                        setDraft((value) => ({
                          ...value,
                          lines: value.lines.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  ...(key === "offeredPriceMinor"
                                    ? { priceConfirmed: true }
                                    : {}),
                                  [key]:
                                    key === "quantity"
                                      ? Number(e.target.value)
                                      : key === "offeredPriceMinor"
                                        ? Math.round(
                                            Number(e.target.value) * 100,
                                          )
                                        : e.target.value,
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Modificările se aplică exclusiv acestei oferte. Catalogul și
            celelalte documente își păstrează valorile.
          </p>
        </details>
      )}
      <div className={contextOpen ? "dc-editor-shell" : "dc-grid"}>
        {contextOpen && (
          <aside
            className="dc-panel dc-context space-y-4"
            aria-label="Variabilele documentului"
          >
            <div>
              <h3 className="font-semibold text-sm">Verificare</h3>
              {issues.length ? (
                <ul className="mt-2 space-y-1 text-xs text-amber-200">
                  {issues.map((issue) => (
                    <li key={issue}>
                      {issue.replace(
                        /Completează: (.+)/,
                        (_, key) =>
                          `Completează: ${draft.labels?.[key] || FIELD_LABELS[key] || key}`,
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-emerald-300">
                  Câmpurile automate sunt complete. Revizuirea umană rămâne
                  necesară.
                </p>
              )}
            </div>
            {fields.map((key) => (
              <label key={key} className="dc-label">
                {draft.labels?.[key] || FIELD_LABELS[key] || key}
                {required.includes(key) ? " *" : ""}
                <textarea
                  aria-label={draft.labels?.[key] || FIELD_LABELS[key] || key}
                  disabled={readonly}
                  className="dc-input"
                  rows={key.includes("name") || key === "date" ? 1 : 2}
                  value={draft.fields[key] || ""}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      fields: { ...v.fields, [key]: e.target.value },
                    }))
                  }
                />
                {!readonly && (
                  <button
                    className="mt-1 text-[11px] text-violet-300 underline"
                    type="button"
                    onClick={() =>
                      editor?.chain().focus().insertContent(`{{${key}}}`).run()
                    }
                  >
                    Inserează în text
                  </button>
                )}
              </label>
            ))}
            {!readonly && (
              <button
                type="button"
                className="dc-button w-full"
                onClick={materialize}
              >
                Completează variabilele din text
              </button>
            )}
            <p className="text-[11px] text-slate-500">
              Valorile modificate nu rescriu textul personalizat. Completează
              variabilele sau adaptează textul înainte de aprobare.
            </p>
            <p className="text-[11px] text-slate-400">
              Copierea din Word păstrează textul și tabelele. Imaginile se
              încarcă separat și rămân în carantină până la scanare.
            </p>
          </aside>
        )}
        <div className="min-w-0">
          <div className="dc-toolbar" aria-label="Instrumente de editare">
            {tool(
              "Aldin",
              () => editor?.chain().focus().toggleBold().run(),
              editor?.isActive("bold"),
            )}
            {tool(
              "Italic",
              () => editor?.chain().focus().toggleItalic().run(),
              editor?.isActive("italic"),
            )}
            {tool(
              "Subliniat",
              () => editor?.chain().focus().toggleUnderline().run(),
              editor?.isActive("underline"),
            )}
            {tool("Titlu", () =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run(),
            )}
            {tool("Listă", () =>
              editor?.chain().focus().toggleBulletList().run(),
            )}
            {tool("Numerotare", () =>
              editor?.chain().focus().toggleOrderedList().run(),
            )}
            {tool("Tabel", () =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
            )}
            {editor?.isActive("table") && (
              <>
                {tool("+ rând", () =>
                  editor?.chain().focus().addRowAfter().run(),
                )}
                {tool("+ coloană", () =>
                  editor?.chain().focus().addColumnAfter().run(),
                )}
                {tool("Șterge rând", () =>
                  editor?.chain().focus().deleteRow().run(),
                )}
                {tool("Șterge tabel", () =>
                  editor?.chain().focus().deleteTable().run(),
                )}
              </>
            )}
            {tool("Pagină nouă", () =>
              editor
                ?.chain()
                .focus()
                .insertContent({ type: "pageBreak" })
                .run(),
            )}
            {tool("Anulează", () => editor?.chain().focus().undo().run())}
            {tool("Refă", () => editor?.chain().focus().redo().run())}
            <label className="dc-label ml-auto">
              Zoom
              <select
                className="dc-input !mt-0 !py-1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                {[75, 90, 100, 110, 125].map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="overflow-auto rounded-lg bg-slate-950/50 p-2 sm:p-4"
            style={{ maxHeight: "78vh" }}
          >
            <div className="dc-page" style={{ zoom: `${zoom}%` }}>
              <label className="dc-label !text-slate-500">
                Antet
                <input
                  className="mb-6 w-full border-b border-slate-200 py-2 text-xs text-slate-500"
                  disabled={readonly}
                  value={draft.header}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, header: e.target.value }))
                  }
                />
              </label>
              <input
                aria-label="Titlul documentului"
                className="mb-3 w-full border-0 border-b border-slate-200 bg-transparent py-2 text-2xl font-bold text-slate-900"
                disabled={readonly}
                value={draft.title}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, title: e.target.value }))
                }
              />
              <p className="mb-6 text-xs text-slate-500">
                {detail.document.number} · v{detail.version.version} ·{" "}
                {detail.approvals.length ? "Aprobat" : "Ciornă"}
              </p>
              <EditorContent editor={editor} />
              <label className="dc-label !text-slate-500">
                Subsol
                <input
                  className="mt-6 w-full border-t border-slate-200 py-2 text-xs text-slate-500"
                  disabled={readonly}
                  value={draft.footer}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, footer: e.target.value }))
                  }
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
