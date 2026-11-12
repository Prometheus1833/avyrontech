import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Image, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { internApi, type ProjectMedia } from "@/lib/internApi";
import { Button } from "@/components/ui/button";

const maxBytes = 15 * 1024 * 1024;
const supportedTypes = ["application/pdf", "text/plain", "image/png", "image/jpeg", "image/webp", "image/gif"];
const size = (bytes: number | null) => !bytes ? "" : bytes < 1024 * 1024
  ? `${Math.ceil(bytes / 1024)} KB`
  : `${(bytes / (1024 * 1024)).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} MB`;

const uploadError = (error: unknown) => {
  if (!(error instanceof Error)) return "Fișierul nu a putut fi încărcat.";
  if (/unconfigured|compliance|unavailable|scan_required/i.test(error.message))
    return "Verificarea de securitate este momentan indisponibilă. Fișierul nu a fost încărcat.";
  if (/invalid_file|unsupported_type/i.test(error.message))
    return "Tipul sau conținutul fișierului nu este acceptat.";
  return error.message;
};

export function MediaAttachments({ projectId, proposalId, canWrite, projectFiles = false }: {
  projectId: string;
  proposalId?: string;
  canWrite: boolean;
  projectFiles?: boolean;
}) {
  const [items, setItems] = useState<ProjectMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [listError, setListError] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const sequence = useRef({ revision: 0 });

  const load = useCallback(async () => {
    const request = ++sequence.current.revision;
    setLoading(true);
    setListError(false);
    try {
      const { data } = await internApi.listMedia(projectId);
      if (request !== sequence.current.revision) return;
      setItems(data.filter((file) => proposalId ? file.proposal_id === proposalId : !projectFiles || !file.proposal_id));
    } catch {
      if (request === sequence.current.revision) {
        setItems([]);
        setListError(true);
      }
    } finally {
      if (request === sequence.current.revision) setLoading(false);
    }
  }, [projectId, proposalId, projectFiles]);

  useEffect(() => {
    const state = sequence.current;
    void load();
    return () => { ++state.revision; };
  }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length || uploading || !canWrite) return;
    setUploading(true);
    setError("");
    setMessage("");
    let uploaded = 0;
    const errors: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.size || file.size > maxBytes) {
          errors.push(`${file.name}: fișier gol sau peste limita de 15 MB.`);
          continue;
        }
        if (!supportedTypes.includes(file.type)) {
          errors.push(`${file.name}: format neacceptat.`);
          continue;
        }
        try {
          await internApi.uploadMedia(projectId, file, proposalId);
          uploaded += 1;
        } catch (error) {
          errors.push(`${file.name}: ${uploadError(error)}`);
        }
      }
      if (uploaded) {
        setMessage(uploaded === 1 ? "Fișierul a fost încărcat." : `${uploaded} fișiere au fost încărcate.`);
        await load();
      }
      if (errors.length) setError(errors.join("\n"));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function download(file: ProjectMedia) {
    if (active) return;
    setActive(file.id);
    setError("");
    try {
      const response = await cfAuth.requestResponse(file.url);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Fișierul nu poate fi descărcat. Verifică accesul sau reîncearcă.");
    } finally { setActive(null); }
  }

  async function remove(file: ProjectMedia) {
    if (active || !canWrite || !window.confirm(`Ștergi fișierul „${file.filename}”?`)) return;
    setActive(file.id);
    setError("");
    try {
      await internApi.deleteMedia(file.id);
      setItems((previous) => previous.filter((item) => item.id !== file.id));
      setMessage("Fișierul a fost șters.");
    } catch { setError("Fișierul nu a putut fi șters."); }
    finally { setActive(null); }
  }

  return (
    <div className="min-w-0 space-y-3">
      {projectFiles && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Fișiere încărcate</h3>
            <p className="mt-1 text-xs text-muted-foreground">Disponibile persoanelor cu acces la proiect după verificarea de securitate.</p>
          </div>
          {canWrite && (
            <Button type="button" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              {uploading ? "Se încarcă…" : "Încarcă documente"}
            </Button>
          )}
        </div>
      )}
      {listError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>Lista de fișiere nu a putut fi încărcată.</span>
          <Button variant="outline" size="sm" type="button" onClick={() => void load()}>Reîncearcă</Button>
        </div>
      ) : loading ? (
        <p role="status" className="text-xs text-muted-foreground">Se încarcă fișierele…</p>
      ) : !items.length ? (
        <p className={projectFiles ? "rounded-lg border border-dashed p-3 text-sm text-muted-foreground" : "text-xs text-muted-foreground"}>
          {projectFiles ? "Niciun fișier încărcat în proiect." : "Fără atașamente."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((file) => {
            const Icon = file.content_type.startsWith("image/") ? Image : FileText;
            return (
              <li key={file.id} className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/50 p-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium">{file.filename}</p>
                  {file.size_bytes ? <p className="text-xs text-muted-foreground">{size(file.size_bytes)}</p> : null}
                </div>
                <Button type="button" variant="ghost" size="icon" disabled={!!active || loading} className="shrink-0" aria-label={`Descarcă ${file.filename}`} onClick={() => void download(file)}><Download className="size-4" /></Button>
                {canWrite && <Button type="button" variant="ghost" size="icon" disabled={!!active || loading} className="shrink-0" aria-label={`Șterge ${file.filename}`} onClick={() => void remove(file)}><Trash2 className="size-4" /></Button>}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="whitespace-pre-line break-words text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-foreground">{message}</p>}
      {canWrite && (
        <>
          <input ref={fileInput} type="file" multiple className="hidden" aria-label={projectFiles ? "Alege documentele proiectului" : "Alege atașamentele"}
            accept={supportedTypes.join(",")} onChange={(event) => void onFiles(event.target.files)} />
          {!projectFiles && (
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              {uploading ? "Se încarcă…" : "Atașează fișiere"}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">PDF, TXT, PNG, JPG, WEBP sau GIF · maximum 15 MB per fișier.</p>
        </>
      )}
    </div>
  );
}
