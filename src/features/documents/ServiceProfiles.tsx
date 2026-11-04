import { useState } from "react";
import { documentsApi, type DocumentContext } from "@/lib/documentsApi";
import {
  serviceDocumentProfile,
  type ServiceDocumentProfile,
} from "@/shared/documents/services";

export default function ServiceProfiles({
  context,
  onSaved,
}: {
  context: DocumentContext;
  onSaved: () => Promise<void>;
}) {
  const [id, setId] = useState(""),
    [draft, setDraft] = useState<ServiceDocumentProfile | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const choose = (id: string) => {
    setId(id);
    const item = context.catalog.find((c) => c.id === id);
    setDraft(
      item
        ? structuredClone(
            serviceDocumentProfile(
              item,
              context.serviceProfiles.find((p) => p.catalog_id === id)
                ?.configuration_json,
            ),
          )
        : null,
    );
    setMessage("");
  };
  return (
    <details className="dc-panel">
      <summary className="cursor-pointer text-sm font-semibold">
        Configurarea documentelor pe servicii
      </summary>
      <p className="mt-3 text-xs text-slate-400">
        Câmpuri, livrabile și recomandări asociate identificatorilor catalogului
        activ. Modificarea se aplică generărilor viitoare.
      </p>
      <label className="dc-label mt-3">
        Serviciul din catalog
        <select
          className="dc-input"
          value={id}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Selectează serviciul sau produsul</option>
          {context.catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
      </label>
      {draft && (
        <div className="dc-grid mt-4">
          <label className="dc-label">
            Livrabile și limite recomandate
            <textarea
              className="dc-input"
              rows={4}
              value={draft.deliverables}
              onChange={(e) =>
                setDraft({ ...draft, deliverables: e.target.value })
              }
            />
          </label>
          <div className="dc-grid sm:grid-cols-2">
            {Object.entries(draft.fields).map(([key, label]) => (
              <label key={key} className="dc-label">
                Câmp de completat
                <input
                  className="dc-input"
                  value={label}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      fields: { ...draft.fields, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button
            className="dc-button"
            onClick={() => {
              const key = `field_${Object.keys(draft.fields).length + 1}`;
              setDraft({
                ...draft,
                fields: { ...draft.fields, [key]: "Câmp suplimentar" },
              });
            }}
            disabled={Object.keys(draft.fields).length >= 30}
          >
            Adaugă un câmp
          </button>
          <fieldset className="dc-grid sm:grid-cols-2">
            <legend className="dc-label mb-2">Documente recomandate</legend>
            {context.templates.map((t) => (
              <label key={t.id} className="dc-check">
                <input
                  type="checkbox"
                  checked={draft.documents.includes(t.id)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      documents: draft.documents.includes(t.id)
                        ? draft.documents.filter((id) => id !== t.id)
                        : [...draft.documents, t.id],
                    })
                  }
                />
                {t.name}
              </label>
            ))}
          </fieldset>
          <button
            className="dc-button dc-primary"
            disabled={
              busy ||
              draft.deliverables.trim().length < 20 ||
              !draft.documents.length
            }
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                await documentsApi.write(
                  `/service-profiles/${id}`,
                  draft,
                  "PUT",
                );
                await onSaved();
                setMessage(
                  "Configurație salvată. Documentele existente își păstrează conținutul.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Salvează configurația
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="dc-notice mt-3">
          {message}
        </p>
      )}
    </details>
  );
}
