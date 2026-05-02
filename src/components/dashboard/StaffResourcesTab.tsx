import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, Trash2, FileText, FileImage, FileArchive, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type FileObj = { name: string; id: string; updated_at: string; created_at: string; metadata: { size: number; mimetype: string } };

const iconFor = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return FileImage;
  if (["zip", "rar", "tar", "gz"].includes(ext)) return FileArchive;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return FileText;
  return FileIcon;
};

const human = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export const StaffResourcesTab = () => {
  const { isAdmin } = useAuth();
  const [files, setFiles] = useState<FileObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("staff-resources").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) toast.error(error.message);
    if (data) setFiles(data as FileObj[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("staff-resources").upload(path, file);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Fișier încărcat");
    load();
    e.target.value = "";
  };

  const download = async (name: string) => {
    const { data, error } = await supabase.storage.from("staff-resources").createSignedUrl(name, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (name: string) => {
    if (!confirm(`Șterge ${name}?`)) return;
    const { error } = await supabase.storage.from("staff-resources").remove([name]);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    load();
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Caută fișier…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Button asChild disabled={uploading}>
          <label className="cursor-pointer">
            <Upload className="size-4 mr-1" />
            {uploading ? "Se încarcă…" : "Încarcă fișier"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> :
        filtered.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Niciun fișier{search ? " care să corespundă" : ""}.</CardContent></Card> :
        <div className="grid gap-2">
          {filtered.map(f => {
            const Icon = iconFor(f.name);
            return (
              <Card key={f.id || f.name}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Icon className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name.replace(/^\d+-/, "")}</p>
                    <p className="text-xs text-muted-foreground">{human(f.metadata?.size || 0)} • {f.created_at && format(new Date(f.created_at), "dd MMM yyyy HH:mm")}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => download(f.name)}><Download className="size-4" /></Button>
                  {isAdmin && <Button size="sm" variant="ghost" onClick={() => remove(f.name)}><Trash2 className="size-4 text-destructive" /></Button>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
};
