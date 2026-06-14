import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FileRow = { name: string; url: string };

export const StaffMediaTab = () => {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const BUCKET = "examples";

  const load = async () => {
    const { data } = await supabase.storage.from(BUCKET).list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (!data) return;
    const rows = data
      .filter((f) => f.name && !f.name.endsWith("/"))
      .map((f) => ({ name: f.name, url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl }));
    setFiles(rows);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    setUploading(false);
    e.target.value = "";
    if (error) return toast.error(error.message);
    toast.success("Fișier urcat");
    load();
  };

  const onDelete = async (name: string) => {
    if (!confirm(`Ștergi ${name}?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display text-lg font-semibold">Media</h3>
            <p className="text-xs text-muted-foreground">Bucket: <span className="font-mono">{BUCKET}</span> · imagini publice pentru site & exemple</p>
          </div>
          <label className="inline-flex">
            <Input type="file" accept="image/*" onChange={onUpload} disabled={uploading} className="max-w-xs" />
            <Button asChild variant="outline" size="sm" className="ml-2" disabled={uploading}>
              <span><Upload className="size-4 mr-1.5" />{uploading ? "..." : "Urcă"}</span>
            </Button>
          </label>
        </div>
      </Card>

      {files.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <ImageIcon className="size-10 mx-auto mb-2 opacity-40" />
          Niciun fișier. Urcă primul pentru a-l vedea aici.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((f) => (
            <Card key={f.name} className="overflow-hidden group">
              <div className="aspect-square bg-muted">
                <img src={f.url} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <span className="text-xs truncate" title={f.name}>{f.name}</span>
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => onDelete(f.name)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
