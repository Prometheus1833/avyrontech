import { useMemo, useState } from "react";
import { BookOpen, ArrowUpRight, Search, ShieldCheck } from "lucide-react";
import type { DocumentContext, DocumentTemplate } from "@/lib/documentsApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { replaceVariables } from "@/shared/documents/model";
import { automaticDocumentFields } from "@/shared/documents/autofill";
import DocumentReader from "./DocumentReader";
import { FIELD_LABELS } from "@/shared/documents/templates";
import { serviceDocumentProfile } from "@/shared/documents/services";
import { FAMILY_LEGAL_NOTES, LEGAL_SOURCES } from "@/shared/documents/legal";
import { TEMPLATE_META } from "./presentation";
import { documentBodyParts } from "@/shared/documents/signatures";
import { isSignatureEdition } from "@/shared/documents/design";

function referenceKeys(template: DocumentTemplate) {
  const references = FAMILY_LEGAL_NOTES[template.family]?.references || [];
  return isSignatureEdition(template.payload) && documentBodyParts(template.payload.body).signatures.length
    ? [...references, "eid" as const, "signatures" as const]
    : references;
}

function TemplateReferences({ template }: { template: DocumentTemplate }) {
  const references = referenceKeys(template);
  if (!references.length) return null;
  return (
    <details className="dc-template-references text-xs text-slate-300">
      <summary className="cursor-pointer">Referințe legale</summary>
      <ul className="mt-1">
        {references.map(key => (
          <li key={key}>
            <a className="inline-flex min-h-8 items-center py-1 text-violet-200 underline" href={LEGAL_SOURCES[key].url} target="_blank" rel="noreferrer">{LEGAL_SOURCES[key].title}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}
export default function DocumentTemplates({
  context,
  onUse,
  onEdit,
  canManage,
  canCreate,
}: {
  context: DocumentContext;
  onUse: (version: string) => void;
  onEdit: (template: DocumentTemplate) => void;
  canManage: boolean;
  canCreate: boolean;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState(""),
    [activity, setActivity] = useState(""),
    [preview, setPreview] = useState<DocumentTemplate | null>(null);
  const matching = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("ro");
    const q = normalize(query.trim());
    const service = context.catalog.find((c) => c.id === activity && c.entity_type === "service");
    const profile = service
      ? serviceDocumentProfile(
          service,
          context.serviceProfiles.find((p) => p.catalog_id === activity)
            ?.configuration_json,
        )
      : null;
    return context.templates.filter(
      (t) =>
        (!group ||
          (TEMPLATE_META[t.family]?.group || "Personalizate") === group) &&
        (!q ||
          normalize([t.name, TEMPLATE_META[t.family]?.description, t.family, ...referenceKeys(t).map(key => LEGAL_SOURCES[key].title)].join(" ")).includes(q)) &&
        (!profile || profile.documents.includes(t.id)),
    ).sort((a, b) => (TEMPLATE_META[a.family]?.stage ?? 6) - (TEMPLATE_META[b.family]?.stage ?? 6));
  }, [context, query, group, activity]);
  return (
    <section className="dc-grid" aria-label="Biblioteca de tipizate">
      <div className="dc-heading-row">
        <div>
          <h2 className="text-xl font-semibold">Alege modelul potrivit</h2>
          <p className="mt-1 text-sm text-slate-400">
            Citește modelul, apoi creează o copie personalizată. Originalul
            rămâne neschimbat. Datele emitentului se preiau din Documente SC.
          </p>
        </div>
        <span className="dc-tag">{matching.length} modele</span>
      </div>
      <div className="dc-search-panel">
        <label className="dc-label dc-search-main">
          <span>
            <Search className="size-4" />
            Caută un tipizat
          </span>
          <input
            className="dc-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ofertă, contract, raport, mentenanță…"
          />
        </label>
        <label className="dc-label">
          Scop
          <select
            aria-label="Scopul tipizatului"
            className="dc-input"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">Toate scopurile</option>
            {[
              "Pregătire",
              "Comercial",
              "Juridic",
              "Livrare",
              "Recurență",
              "Personalizate",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="dc-label">
          Activitate
          <select
            aria-label="Activitatea tipizatului"
            className="dc-input"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="">Toate activitățile</option>
            {context.catalog
              .filter((c) => c.entity_type === "service")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {!matching.length && (
        <div className="dc-empty">
          <BookOpen />
          <h3>Niciun model pentru selecția curentă</h3>
          <button
            className="dc-button"
            onClick={() => {
              setQuery("");
              setGroup("");
              setActivity("");
            }}
          >
            Resetează filtrele
          </button>
        </div>
      )}
      <div className="dc-template-grid">
        {matching.map((t) => {
          const meta = TEMPLATE_META[t.family],
            usable =
              t.visibility !== "private_proposal" ||
              t.review_status === "approved";
          return (
            <article key={t.version_id} className="dc-template-card">
              <div className="dc-heading-row">
                <span className="dc-kicker">
                  {meta?.group || "Personalizate"}
                </span>
                <div className="flex items-center gap-2"><span className="text-xs text-slate-500">v{t.version}</span>{meta && <span className="dc-stage-tag" aria-label={`Etapa ${meta.stage} din 5 în proiect`}>{meta.stage}<span>/5</span></span>}</div>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold">
                {t.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {meta?.description ||
                  "Model privat pregătit dintr-un document existent."}
              </p>
              {meta && <ul className="dc-template-traits" aria-label="Caracteristicile modelului">{meta.traits.map(trait => <li key={trait}>{trait}</li>)}</ul>}
              <p className="mt-3 text-xs text-violet-200">
                {meta?.use || "Pentru contextul autorizat"}
              </p>
              <p className="mt-3 flex gap-2 text-xs text-slate-400">
                <ShieldCheck className="size-4 shrink-0" />
                {t.legal
                  ? "Revizuire juridică obligatorie"
                  : t.review_status === "approved"
                    ? "Model revizuit"
                    : "Pregătit pentru revizuire"}
                {t.visibility === "private_proposal" ? " · model privat" : ""}
              </p>
              {documentBodyParts(t.payload.body).signatures.length > 0 && (
                <p className="mt-2 text-xs text-violet-200">Semnătură AVYRON și semnătură beneficiar</p>
              )}
              <TemplateReferences template={t} />
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button className="dc-button" onClick={() => setPreview(t)}>
                  Previzualizează
                </button>
                <button
                  className="dc-button dc-primary"
                  disabled={!usable || !canCreate}
                  onClick={() => onUse(t.version_id)}
                >
                  Folosește modelul
                  <ArrowUpRight className="size-3" />
                </button>
              </div>
              {canManage && (
                <button
                  className="mt-3 self-start text-xs text-slate-400 underline underline-offset-4"
                  onClick={() => onEdit(t)}
                >
                  Editează modelul original
                </button>
              )}
            </article>
          );
        })}
      </div>
      <Dialog
        open={!!preview}
        onOpenChange={(v) => {
          if (!v) setPreview(null);
        }}
      >
        <DialogContent className="dc-dialog dark max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>
              Model original · v{preview?.version}. Utilizarea creează o
              instanță nouă, editabilă.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <TemplateReferences template={preview} />
              <DocumentReader fieldLabels={FIELD_LABELS} payload={replaceVariables(preview.payload, { ...preview.payload.fields, ...automaticDocumentFields(context.company, undefined, new Date().toLocaleDateString("ro-RO"), false) })} />
              <button
                className="dc-button dc-primary justify-self-start"
                disabled={
                  !canCreate ||
                  (preview.visibility === "private_proposal" &&
                    preview.review_status !== "approved")
                }
                onClick={() => onUse(preview.version_id)}
              >
                Personalizează pentru un client sau proiect
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
