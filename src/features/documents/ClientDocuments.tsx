import DocumentReader from "./DocumentReader";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  Download,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  documentsApi,
  type DocumentDetail,
  type DocumentSummary,
} from "@/lib/documentsApi";
import { useAuth } from "@/hooks/useAuth";
import "./documents.css";
type Props = {
  projectId?: string;
  clientId?: string;
  serviceId?: string;
  subscriptionId?: string;
  embedded?: boolean;
};
export default function ClientDocuments({
  projectId,
  clientId,
  serviceId,
  subscriptionId,
  embedded = false,
}: Props) {
  const { user } = useAuth(),
    [params, setParams] = useSearchParams(),
    [localId, setLocalId] = useState(""),
    [localVersion, setLocalVersion] = useState<string>();
  const id = embedded ? localId : params.get("document") || "",
    version = embedded ? localVersion : params.get("version") || undefined;
  const search="",sort="recent";
  const [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [items, setItems] = useState<DocumentSummary[]>([]),
    [total, setTotal] = useState(0),
    [detail, setDetail] = useState<DocumentDetail | null>(null),
    [loading, setLoading] = useState(true),
    [detailLoading, setDetailLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(""),
    [share, setShare] = useState(false),
    [recipients, setRecipients] = useState<
      { id: string; email: string; display_name: string | null }[]
    >([]),
    [recipient, setRecipient] = useState(""),
    [channel, setChannel] = useState("link"),
    [confirmed, setConfirmed] = useState(false),
    [shareResult, setShareResult] = useState<{
      status: string;
      link: string;
      manualUrl: string | null;
    } | null>(null);
  const listEpoch = useRef(0),
    detailEpoch = useRef(0),
    previewRef = useRef(""),
    shareKey = useRef(crypto.randomUUID());
  const clearPreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
  }, []);
  useEffect(() => {
    const requestCounter = listEpoch;
    const epoch = ++requestCounter.current;
    // Fetch the library only while it is visible. Navigation may be deferred
    // by React; returning from a document must not retry its detail request.
    if (id) return;
    setLoading(true);
    setError("");
    setItems([]);
    const filters = new URLSearchParams({
      q: search,
      sort,
      offset: String(offset),
    });
    for (const [key, value] of [
      ["project", projectId],
      ["client", clientId],
      ["service", serviceId],
      ["subscription", subscriptionId],
    ])
      if (value) filters.set(key, value);
    void documentsApi
      .list(filters)
      .then((r) => {
        if (epoch === listEpoch.current) {
          setItems(r.data);
          setTotal(r.total);
        }
      })
      .catch(() => {
        if (epoch === listEpoch.current) {
          setTotal(0);
          setError(
            "Documentele nu au putut fi încărcate. Verifică sesiunea și reîncearcă.",
          );
        }
      })
      .finally(() => {
        if (epoch === listEpoch.current) setLoading(false);
      });
    return () => {
      requestCounter.current++;
    };
  }, [
    id,
    user?.id,
    search,
    sort,
    offset,
    projectId,
    clientId,
    serviceId,
    subscriptionId,
    refresh,
  ]);
  useEffect(() => {
    const requestCounter = detailEpoch;
    const epoch = ++requestCounter.current;
    clearPreview();
    setDetail(null);
    setShare(false);
    setShareResult(null);
    setConfirmed(false);
    setRecipients([]);
    setRecipient("");
    setBusy(false);
    if (!id) return;
    setDetailLoading(true);
    setError("");
    void documentsApi
      .get(id, version)
      .then((r) => {
        if (epoch === detailEpoch.current) setDetail(r);
      })
      .catch(() => {
        if (epoch === detailEpoch.current)
          setError(
            "Documentul nu este disponibil pentru acest cont sau accesul a fost retras.",
          );
      })
      .finally(() => {
        if (epoch === detailEpoch.current) setDetailLoading(false);
      });
    return () => {
      requestCounter.current++;
    };
  }, [id, version, user?.id, refresh, clearPreview]);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  const open = (next: string, nextVersion?: string) => {
    if (!next) {
      setError("");
    }
    if (embedded) {
      setLocalId(next);
      setLocalVersion(nextVersion);
      return;
    }
    const target = new URLSearchParams(params);
    target.delete("documentView");
    target.delete("template");
    if (next) target.set("document", next);
    else target.delete("document");
    if (nextVersion) target.set("version", nextVersion);
    else target.delete("version");
    setParams(target, { replace: false });
  };
  const download = async (format: "pdf" | "docx", asPreview = false) => {
    if (!detail || busy) return;
    const epoch = detailEpoch.current;
    setBusy(true);
    setError("");
    try {
      const current = await documentsApi.get(
        detail.document.id,
        detail.version.id,
      );
      if (epoch !== detailEpoch.current) return;
      const path = `/${encodeURIComponent(current.document.id)}/export/${format}?version=${encodeURIComponent(current.version.id)}${asPreview ? "&preview=1" : ""}`;
      if (asPreview) {
        const blob = await documentsApi.blob(path);
        if (epoch !== detailEpoch.current) return;
        if (!blob.type.includes("application/pdf"))
          throw new Error("invalid_pdf");
        clearPreview();
        const url = URL.createObjectURL(blob);
        previewRef.current = url;
        setPreview(url);
      } else
        await documentsApi.download(
          path,
          `${current.document.number}-v${current.version.version}.${format}`,
        );
    } catch {
      if (epoch === detailEpoch.current)
        setError(
          "Previzualizarea sau descărcarea nu este disponibilă. Accesul și fișierul trebuie să fie verificate; poți reîncerca.",
        );
    } finally {
      if (epoch === detailEpoch.current) setBusy(false);
    }
  };
  const prepareShare = async () => {
    if (!detail || busy) return;
    const epoch = detailEpoch.current;
    setBusy(true);
    setError("");
    try {
      const result = await documentsApi.recipients(detail.document.id);
      if (epoch !== detailEpoch.current) return;
      setRecipients(result.data);
      setShare(true);
      setConfirmed(false);
      shareKey.current = crypto.randomUUID();
    } catch {
      if (epoch === detailEpoch.current)
        setError("Opțiunile de distribuire nu pot fi încărcate.");
    } finally {
      if (epoch === detailEpoch.current) setBusy(false);
    }
  };
  return (
    <section className="document-center dc-grid" aria-label="Documentele Mele">
      <header className="rounded-2xl border border-white/10 bg-violet-500/5 p-4">
        {embedded ? <h3 className="text-base font-semibold">Documente disponibile</h3> : <h1 className="text-2xl font-semibold">Documentele Mele</h1>}
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          {embedded ? "Documentele acestui proiect puse la dispoziție de echipa AVYRON." : "Documentele proiectelor, serviciilor, abonamentelor și produselor tale. Apar aici numai documentele puse la dispoziție pentru contul tău de echipa AVYRON."}
        </p>
      </header>
      {error && (
        <div role="alert" className="dc-notice">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setRefresh((v) => v + 1)}
          >
            Reîncearcă
          </button>
        </div>
      )}
      {id ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="dc-button"
              onClick={() => open("")}
            >
              <ArrowLeft size={15} />
              Înapoi la documente
            </button>
            {detail && (
              <div className="flex flex-wrap gap-2">
                {detail.actions.export && (
                  <>
                    <button
                      className="dc-button"
                      disabled={busy}
                      onClick={() => void download("pdf", true)}
                    >
                      Previzualizează PDF
                    </button>
                    <button
                      className="dc-button"
                      disabled={busy}
                      onClick={() => void download("pdf")}
                    >
                      <Download size={15} />
                      Descarcă PDF
                    </button>
                    <button
                      className="dc-button"
                      disabled={busy}
                      onClick={() => void download("docx")}
                    >
                      Descarcă Word
                    </button>
                  </>
                )}
                {detail.actions.share && (
                  <button
                    className="dc-button"
                    disabled={busy}
                    onClick={() => void prepareShare()}
                  >
                    <Share2 size={15} />
                    Distribuie
                  </button>
                )}
              </div>
            )}
          </div>
          {detailLoading && <p role="status">Se verifică documentul…</p>}
          {detail && (
            <>
              <article className="dc-panel">
                <h2 className="break-words text-lg font-semibold">
                  {detail.document.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {detail.document.number} ·{" "}
                  {detail.document.company_name || "Contul tău"} · versiunea{" "}
                  {detail.version.version}
                </p>
                {detail.versions.length > 1 && (
                  <label className="dc-label mt-3 max-w-sm">
                    Versiuni disponibile
                    <select
                      aria-label="Versiuni disponibile"
                      className="dc-input"
                      value={detail.version.id}
                      onChange={(e) => open(id, e.target.value)}
                    >
                      {detail.versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          Versiunea {v.version} ·{" "}
                          {new Date(v.created_at).toLocaleDateString("ro-RO")}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <p className="mt-3 text-sm text-slate-400">
                  Citește documentul mai jos. Descărcarea și distribuirea sunt disponibile conform drepturilor acordate.
                </p>
              </article>
              <DocumentReader payload={detail.version.payload}/>
              {preview && (
                <div className="dc-panel">
                  <a
                    href={preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-200 underline"
                  >
                    Deschide previzualizarea într-o filă nouă
                  </a>
                  <iframe
                    title="Previzualizare document PDF"
                    src={preview}
                    className="mt-3 h-[65dvh] min-h-80 w-full rounded-lg border bg-white"
                  />
                </div>
              )}
              {detail.files.some((f) => f.kind === "import") && (
                <section className="dc-panel">
                  <h3 className="font-semibold">Fișiere atașate</h3>
                  {detail.files
                    .filter((f) => f.kind === "import")
                    .map((file) => (
                      <button
                        key={file.id}
                        className="dc-button mt-2"
                        disabled={busy || !detail.actions.export}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            await documentsApi.download(
                              `/${encodeURIComponent(id)}/files/${encodeURIComponent(file.id)}`,
                              file.file_name,
                            );
                          } catch {
                            setError(
                              "Fișierul nu poate fi descărcat. Verificarea sau accesul nu este disponibil.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {file.file_name}
                      </button>
                    ))}
                </section>
              )}
              {share && detail.actions.share && (
                <form
                  className="dc-panel dc-grid"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!confirmed || !recipient || busy) return;
                    const epoch = detailEpoch.current;
                    setBusy(true);
                    setError("");
                    try {
                      const result = await documentsApi.write<{
                        status: string;
                        link: string;
                        manualUrl: string | null;
                      }>(
                        `/${encodeURIComponent(id)}/share`,
                        {
                          versionId: detail.version.id,
                          recipientId: recipient,
                          channel,
                          subject: detail.document.title,
                          message: "Document disponibil în contul AVYRON.",
                          attachment: "none",
                          confirmed: true,
                          attachmentConfirmed: false,
                        },
                        "POST",
                        shareKey.current,
                      );
                      if (epoch === detailEpoch.current) setShareResult(result);
                    } catch {
                      if (epoch === detailEpoch.current)
                        setError(
                          "Distribuirea nu a fost confirmată. Verifică destinatarul și accesul.",
                        );
                    } finally {
                      if (epoch === detailEpoch.current) setBusy(false);
                    }
                  }}
                >
                  <h3 className="font-semibold">Distribuie securizat</h3>
                  <p className="text-xs text-slate-400">
                    Linkul cere autentificare și autorizare la fiecare
                    deschidere. Alegerea unui destinatar nu îi acordă acces nou.
                  </p>
                  <label className="dc-label">
                    Destinatar autorizat
                    <select
                      className="dc-input"
                      aria-label="Destinatar autorizat"
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        setConfirmed(false);
                        setShareResult(null);
                        shareKey.current = crypto.randomUUID();
                      }}
                    >
                      <option value="">Selectează destinatarul</option>
                      {recipients.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.display_name || r.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="dc-label">
                    Canal
                    <select
                      className="dc-input"
                      aria-label="Canal"
                      value={channel}
                      onChange={(e) => {
                        setChannel(e.target.value);
                        setConfirmed(false);
                        setShareResult(null);
                        shareKey.current = crypto.randomUUID();
                      }}
                    >
                      <option value="link">Link privat</option>
                      <option value="email">E-mail</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                    </select>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Confirm destinatarul, versiunea și distribuirea linkului
                    privat.
                  </label>
                  <button
                    className="dc-button"
                    disabled={!confirmed || !recipient || busy}
                  >
                    Confirmă distribuirea
                  </button>
                  {shareResult && (
                    <div role="status" className="text-sm">
                      <p>
                        {shareResult.status === "sent"
                          ? "Transmis către furnizor / sistem"
                          : shareResult.status === "delivered"
                            ? "Livrat"
                            : shareResult.status === "prepared"
                              ? "Pregătit · transmiterea nu este confirmată"
                              : shareResult.status === "failed"
                                ? "Distribuirea a eșuat"
                                : "Rezultat necunoscut · verifică distribuirea"}
                      </p>
                      <button
                        type="button"
                        className="dc-button mt-2"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(shareResult.link)
                            .catch(() =>
                              setError("Linkul nu a putut fi copiat."),
                            )
                        }
                      >
                        Copiază linkul privat
                      </button>
                      {shareResult.manualUrl && (
                        <a
                          className="dc-button mt-2"
                          href={shareResult.manualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Deschide aplicația pentru trimitere manuală
                        </a>
                      )}
                    </div>
                  )}
                </form>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <button
              className="dc-button self-end"
              disabled={loading}
              onClick={() => setRefresh((v) => v + 1)}
            >
              <RefreshCw size={15} />
              Actualizează
            </button>
          </div>
          {loading ? (
            <p role="status">Se încarcă documentele…</p>
          ) : !items.length && !error ? (
            <p className="dc-panel text-sm text-slate-400">
              {search
                ? "Nu există documente care corespund căutării."
                : "Nu ai încă documente disponibile. Echipa le va adăuga după alocare și verificare."}
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <article className="dc-panel min-w-0" key={item.id}>
                  <div className="flex gap-3">
                    <FileText className="mt-1 size-5 shrink-0 text-violet-300" />
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold">
                        {item.title}
                      </h2>
                      <p className="mt-1 break-words text-xs text-slate-400">
                        {item.number} · {item.company_name || "Contul tău"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Actualizat{" "}
                        {new Date(item.updated_at).toLocaleDateString("ro-RO")}
                      </p>
                      <button
                        className="dc-button mt-3"
                        onClick={() => open(item.id)}
                      >
                        Deschide documentul
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {total > 50 && (
            <nav
              aria-label="Paginare documente"
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <button
                className="dc-button"
                disabled={loading || offset === 0}
                onClick={() => setOffset((v) => Math.max(0, v - 50))}
              >
                Înapoi
              </button>
              <span>
                {offset + 1}–{Math.min(offset + 50, total)} din {total}
              </span>
              <button
                className="dc-button"
                disabled={loading || offset + 50 >= total}
                onClick={() => setOffset((v) => v + 50)}
              >
                Următoarele
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
