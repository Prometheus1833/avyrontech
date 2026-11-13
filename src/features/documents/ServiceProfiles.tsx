import { useState } from "react";
import { ChevronDown, Plus, Settings2, X } from "lucide-react";
import { documentsApi, type DocumentContext } from "@/lib/documentsApi";
import { serviceDocumentProfile, type ServiceDocumentProfile } from "@/shared/documents/services";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("ro");
type EditableProfile = Omit<ServiceDocumentProfile, "legalNotes">;

export default function ServiceProfiles({ context, onSaved }: { context: DocumentContext; onSaved: () => Promise<void> }) {
  const [id, setId] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<EditableProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);
  const services = context.catalog.filter(item => item.entity_type === "service");
  const configured = new Map(context.serviceProfiles.map(profile => [profile.catalog_id, profile.configuration_json]));
  const selected = services.find(item => item.id === id);
  const visible = services.filter(item => item.id === id || normalize([item.display_name, item.sku, item.category].join(" ")).includes(normalize(query.trim())));
  const fields = Object.entries(draft?.fields || {});
  const valid = draft && draft.deliverables.trim().length >= 20 && draft.documents.length > 0 && draft.documents.length <= 30 && fields.every(([, label]) => label.trim());
  const choose = (next: string) => {
    setId(next);
    const item = services.find(service => service.id === next);
    if (item) {
      const { fields, deliverables, documents } = serviceDocumentProfile(item, configured.get(next));
      setDraft({ fields: { ...fields }, deliverables, documents: [...documents] });
    } else setDraft(null);
    setResult(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft || !valid || busy) return;
    setBusy(true);
    setResult(null);
    try {
      await documentsApi.write(`/service-profiles/${encodeURIComponent(selected.id)}`, {
        fields: Object.fromEntries(fields.map(([key, label]) => [key, label.trim()])),
        deliverables: draft.deliverables.trim(),
        documents: draft.documents,
      }, "PUT");
      try {
        await onSaved();
        setResult({ text: "Configurație salvată pentru generările viitoare." });
      } catch {
        setResult({ text: "Configurația a fost salvată. Reîncarcă lista pentru a vedea starea actualizată." });
      }
    } catch (error) {
      setResult({ error: true, text: error instanceof Error ? error.message : "Configurația nu a putut fi salvată." });
    } finally { setBusy(false); }
  };
  return (
    <details className="dc-panel group mt-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-md [&::-webkit-details-marker]:hidden">
        <Settings2 className="size-5 shrink-0 text-violet-300" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Configurări pentru documentele activităților</span>
          <span className="mt-0.5 block text-xs text-slate-400">{services.length} servicii · {services.filter(item => configured.has(item.id)).length} personalizate</span>
        </span>
        <ChevronDown className="size-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-3 space-y-4 border-t border-white/10 pt-4">
        <p className="text-sm text-slate-300">Alege un serviciu ca să stabilești ce informații se cer, ce livrabile se propun și ce tipizate se recomandă. Documentele deja create rămân neschimbate.</p>
        {services.length ? <div className="grid gap-3 sm:grid-cols-2">
          <label className="dc-label">Caută după denumire sau SKU<input type="search" className="dc-input" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label className="dc-label">Serviciul din catalog
            <select className="dc-input" value={id} disabled={busy} onChange={event => choose(event.target.value)}>
              <option value="">Alege un serviciu</option>
              {([true, false] as const).map(custom => {
                const items = visible.filter(item => configured.has(item.id) === custom);
                return items.length ? <optgroup key={String(custom)} label={custom ? "Configurații personalizate" : "Configurații standard"}>
                  {items.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}
                </optgroup> : null;
              })}
            </select>
          </label>
          {!visible.length && <p className="text-xs text-slate-400 sm:col-span-2">Niciun serviciu pentru această căutare.</p>}
        </div> : <p className="text-sm text-slate-400">Nu sunt servicii active în catalog.</p>}
        {selected && draft && <form className="dc-grid rounded-xl border border-white/10 bg-black/15 p-3 sm:p-4" onSubmit={save}>
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-sm font-semibold">{selected.display_name}</h3>{selected.sku && <p className="mt-1 font-mono text-xs text-slate-400">{selected.sku}</p>}</div>
            <span className="dc-tag">{configured.has(id) ? "Personalizat" : "Standard"}</span>
          </header>
          <fieldset disabled={busy} className="dc-grid min-w-0">
            <label className="dc-label">Livrabile și limite recomandate
              <textarea className="dc-input" rows={3} required minLength={20} maxLength={8000} value={draft.deliverables} onChange={event => setDraft({ ...draft, deliverables: event.target.value })} />
            </label>
            <fieldset className="dc-grid min-w-0 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-semibold text-slate-300">Câmpuri de completat · {fields.length}/30</legend>
              {fields.map(([key, label], index) => <div key={key} className="flex min-w-0 items-end gap-2">
                <label className="dc-label min-w-0 flex-1">Câmpul {index + 1}
                  <input className="dc-input" required maxLength={160} value={label} onChange={event => setDraft({ ...draft, fields: { ...draft.fields, [key]: event.target.value } })} />
                </label>
                <button className="dc-button shrink-0" type="button" aria-label={`Elimină câmpul ${index + 1}`} onClick={() => setDraft({ ...draft, fields: Object.fromEntries(fields.filter(([field]) => field !== key)) })}><X className="size-4" /></button>
              </div>)}
            </fieldset>
            <button type="button" className="dc-button justify-self-start" disabled={fields.length >= 30} onClick={() => {
              const key = `field_${crypto.randomUUID().replace(/-/g, "")}`;
              setDraft({ ...draft, fields: { ...draft.fields, [key]: "" } });
            }}><Plus className="size-4" aria-hidden="true" />Adaugă un câmp</button>
            <details className="rounded-lg border border-white/10 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Tipizate recomandate · {draft.documents.length}</summary>
              <fieldset className="dc-grid mt-3 sm:grid-cols-2">
                <legend className="sr-only">Alege tipizatele recomandate</legend>
                {context.templates.map(template => {
                  const checked = draft.documents.includes(template.id);
                  return <label className="dc-check" key={template.id}><input type="checkbox" checked={checked} disabled={!checked && draft.documents.length >= 30} onChange={() => setDraft({ ...draft, documents: checked ? draft.documents.filter(value => value !== template.id) : [...draft.documents, template.id] })} />{template.name}</label>;
                })}
              </fieldset>
            </details>
          </fieldset>
          {!valid && <p className="text-xs text-slate-400">Completează denumirile câmpurilor și minimum 20 de caractere la livrabile, apoi alege cel puțin un tipizat.</p>}
          <button type="submit" className="dc-button dc-primary justify-self-start" disabled={!valid || busy}>{busy ? "Se salvează…" : "Salvează configurația"}</button>
        </form>}
        {result && <p role={result.error ? "alert" : "status"} className="dc-notice">{result.text}</p>}
      </div>
    </details>
  );
}
