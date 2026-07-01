import { useEffect, useRef, useState } from "react";
import { internApi, type ProjectMedia } from "@/lib/internApi";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Image as ImageIcon, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Ataşamente (imagini / PDF) pentru o propunere.
 * Backend: R2 via /api/projects/:id/media (POST/GET/DELETE).
 */
export const MediaAttachments = ({
  projectId,
  proposalId,
  canWrite,
}: {
  projectId: string;
  proposalId?: string;
  canWrite: boolean;
}) => {
  const [items, setItems] = useState<ProjectMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await internApi.listMedia(projectId);
      setItems(proposalId ? data.filter((m) => m.proposal_id === proposalId) : data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId, proposalId]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 15 * 1024 * 1024) {
          toast.error(`${f.name} depășește 15 MB`);
          continue;
        }
        await internApi.uploadMedia(projectId, f, proposalId);
      }
      toast.success("Fișier(e) încărcat(e)");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Ștergi fișierul?")) return;
    try {
      await internApi.deleteMedia(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <p className="text-xs text-muted-foreground">Se încarcă atașamentele…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Fără atașamente.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((m) => {
            const isImg = m.content_type.startsWith("image/");
            return (
              <div key={m.id} className="relative group rounded-lg border bg-muted/30 overflow-hidden">
                {isImg ? (
                  <a href={m.url} target="_blank" rel="noreferrer" title={m.filename}>
                    <img src={m.url} alt={m.filename} className="w-24 h-24 object-cover" />
                  </a>
                ) : (
                  <a href={m.url} target="_blank" rel="noreferrer" title={m.filename} className="w-24 h-24 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground p-1 text-center">
                    <FileText className="size-6" />
                    <span className="truncate w-full">{m.filename}</span>
                  </a>
                )}
                {canWrite && (
                  <button
                    onClick={() => remove(m.id)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                    aria-label="Șterge"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canWrite && (
        <>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,application/pdf"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
            {uploading ? "Se încarcă…" : "Atașează imagini / PDF"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            <ImageIcon className="size-3 inline mr-1" />
            Acceptăm PNG, JPG, WEBP, SVG, GIF sau PDF · max 15 MB / fișier.
          </p>
        </>
      )}
    </div>
  );
};
