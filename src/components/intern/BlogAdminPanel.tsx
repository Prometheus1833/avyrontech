// Panou de administrare pentru blog: articolele din baza de date, starea lor
// (publicat / ciornă / arhivat) și publicare rapidă direct din platforma internă.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogApi, type BlogPost, type BlogStatus } from "@/lib/blogApi";
import { toast } from "sonner";
import { Archive, Check, ExternalLink, FileText, Loader2, PenSquare, RefreshCw } from "lucide-react";

const STATUS_META: Record<BlogStatus, { label: string; className: string }> = {
  published: { label: "Publicat", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" },
  draft: { label: "Ciornă", className: "border-amber-500/30 bg-amber-500/10 text-amber-600" },
  archived: { label: "Arhivat", className: "border-border bg-muted text-muted-foreground" },
};

const when = (value: string | number | null | undefined) =>
  !value ? "—" : new Date(typeof value === "number" ? value : new Date(value).getTime()).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });

export default function BlogAdminPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPosts((await blogApi.listStaff()).data);
    } catch (e) {
      setError((e as Error).message || "Articolele nu au putut fi încărcate");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      published: posts.filter((p) => p.status === "published").length,
      draft: posts.filter((p) => p.status === "draft").length,
      archived: posts.filter((p) => p.status === "archived").length,
    }),
    [posts],
  );

  const setStatus = async (post: BlogPost, status: BlogStatus) => {
    setBusy(post.id);
    try {
      await blogApi.setStatus(post.id, status);
      toast.success(status === "published" ? "Articol publicat" : status === "draft" ? "Trecut în ciornă" : "Articol arhivat");
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Actualizarea a eșuat");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mb-6 border-border/70">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Blog — publicare articole</h2>
            <p className="text-sm text-muted-foreground">
              {counts.published} publicate · {counts.draft} ciorne · {counts.archived} arhivate
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Reîmprospătează
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/blog#editorial-workspace">
                <PenSquare className="mr-2 size-4" />
                Editor articole
              </Link>
            </Button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {loading && !posts.length ? (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Se încarcă articolele…
          </p>
        ) : !posts.length && !error ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Niciun articol în baza de date încă. Deschide editorul pentru a scrie primul articol.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {posts.slice(0, 12).map((post) => {
              const meta = STATUS_META[post.status];
              const url = `${post.language === "en" ? "/en/blog" : "/blog"}/${post.slug}`;
              return (
                <li key={post.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-[12rem] flex-1">
                    <p className="truncate text-sm font-semibold">{post.title}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {url} · actualizat {when(post.updated_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`rounded-full ${meta.className}`}>
                    {meta.label}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {post.status !== "published" ? (
                      <Button size="sm" variant="secondary" className="rounded-full" disabled={busy === post.id} onClick={() => void setStatus(post, "published")}>
                        <Check className="mr-1.5 size-3.5" /> Publică
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="rounded-full" disabled={busy === post.id} onClick={() => void setStatus(post, "draft")}>
                        <FileText className="mr-1.5 size-3.5" /> Retrage
                      </Button>
                    )}
                    {post.status !== "archived" && (
                      <Button size="sm" variant="ghost" className="rounded-full" title="Arhivează" aria-label={`Arhivează ${post.title}`} disabled={busy === post.id} onClick={() => void setStatus(post, "archived")}>
                        <Archive className="size-3.5" />
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" className="rounded-full" title="Deschide articolul">
                      <Link to={url} aria-label={`Deschide ${post.title}`}>
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
