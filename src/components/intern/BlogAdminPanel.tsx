import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Edit3, ExternalLink, FileText, ImagePlus, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blogApi, type BlogLanguage, type BlogPost, type BlogPostInput, type BlogStatus } from "@/lib/blogApi";
import { BLOG_CATEGORIES, blogSlug as slugify } from "@/lib/blogEditorial";

const labels = { all: "Toate", draft: "Ciorne", published: "Publicate", archived: "Arhivate" } as const;
type StatusFilter = keyof typeof labels;
const PAGE_SIZE = 12;
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro");
const emptyForm = (language: BlogLanguage, category: string): BlogPostInput => ({
  language, category, title: "", slug: "", translationKey: "", excerpt: "", content: "",
  coverImageUrl: "", coverImageAlt: "", tags: [], seoTitle: "", seoDescription: "",
  socialTitle: "", socialDescription: "", status: "draft",
});
const toForm = (post: BlogPost): BlogPostInput => ({
  ...emptyForm(post.language, post.category), slug: post.slug, translationKey: post.translation_key || "",
  title: post.title, excerpt: post.excerpt, content: post.content, coverImageUrl: post.cover_image_url || "",
  coverImageAlt: post.cover_image_alt || "", tags: post.tags, seoTitle: post.seo_title || "",
  seoDescription: post.seo_description || "", socialTitle: post.social_title || "",
  socialDescription: post.social_description || "", status: post.status,
});
const readingTime = (text: string) => Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 210));
const when = (value: BlogPost["updated_at"]) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—";
};

export default function BlogAdminPanel({ defaultLanguage, defaultCategory, isAdmin, settingsLoading }: { defaultLanguage: BlogLanguage; defaultCategory: string; isAdmin: boolean; settingsLoading: boolean }) {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all"), [langFilter, setLangFilter] = useState("all");
  const [query, setQuery] = useState(""), [pageIndex, setPageIndex] = useState(0);
  const [editing, setEditing] = useState<BlogPost | null>(null), [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(defaultLanguage, defaultCategory));
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setPosts((await blogApi.listStaff()).data); }
    catch { setError("Registrul nu a putut fi actualizat. Încearcă din nou."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const set = <K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) => setForm(old => ({ ...old, [key]: value }));
  const startEditing = (post: BlogPost | null) => {
    setEditing(post);
    setForm(post ? toForm(post) : emptyForm(defaultLanguage, defaultCategory));
    setTagsText(post?.tags.join(", ") || "");
    setEditorOpen(true);
  };
  const save = async (status: BlogStatus) => {
    const next = { ...form, status, slug: form.slug || slugify(form.title), tags: tagsText.split(",").map(slugify).filter(Boolean).slice(0, 8) };
    if (next.title.trim().length < 8 || next.excerpt.trim().length < 40 || next.content.trim().length < 120) {
      toast.error("Completează titlul (8 caractere), rezumatul (40) și conținutul articolului (120)."); return;
    }
    setSaving(true);
    try {
      if (editing) await blogApi.update(editing.id, next);
      else await blogApi.create(next);
      setEditorOpen(false);
      toast.success(status === "published" ? "Articol publicat." : status === "archived" ? "Articol actualizat în arhivă." : "Ciornă salvată.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Articolul nu a putut fi salvat."); }
    finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { set("coverImageUrl", (await blogApi.uploadCover(file)).url); toast.success("Coperta a fost încărcată."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Încărcarea copertei a eșuat."); }
    finally { setUploading(false); }
  };
  const changeStatus = async (post: BlogPost, status: "draft" | "archived") => {
    if (post.status === "published" && !window.confirm(`Retragi din blog articolul „${post.title}”?`)) return;
    setBusy(true);
    try { await blogApi.setStatus(post.id, status); toast.success(status === "draft" ? "Articol trecut în ciornă." : "Articol arhivat."); await load(); }
    catch { toast.error("Starea articolului nu a putut fi schimbată."); }
    finally { setBusy(false); }
  };
  const remove = async (post: BlogPost) => {
    if (!isAdmin || !window.confirm(`Ștergi definitiv articolul „${post.title}”?`)) return;
    setBusy(true);
    try { await blogApi.remove(post.id); toast.success("Articol șters."); await load(); }
    catch { toast.error("Articolul nu a putut fi șters."); }
    finally { setBusy(false); }
  };
  const counts = posts ? { all: posts.length, draft: 0, published: 0, archived: 0 } : null;
  if (counts) posts?.forEach(post => counts[post.status]++);
  const visible = (posts || []).filter(post => (filter === "all" || post.status === filter)
    && (langFilter === "all" || post.language === langFilter)
    && fold([post.title, post.slug, post.category, ...(post.tags || [])].join(" ")).includes(fold(query.trim())));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pages - 1);
  return (
    <section aria-labelledby="editorial-heading" className="min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Statistici registru">
        {(Object.keys(labels) as StatusFilter[]).map(status => (
          <button key={status} type="button" aria-pressed={filter === status} onClick={() => { setFilter(status); setPageIndex(0); }}
            className="min-w-0 rounded-xl border bg-card p-3 text-left hover:border-primary/60 aria-pressed:border-primary aria-pressed:bg-primary/10 sm:px-4">
            <span className="block text-xs font-medium text-muted-foreground">{labels[status]}</span>
            <strong className="text-xl tabular-nums">{counts ? counts[status] : "—"}</strong>
          </button>
        ))}
      </div>
      {posts?.length === 500 && <p className="text-xs text-muted-foreground">Totalurile acoperă cele mai recente 500 de articole din registru.</p>}
      <div className="min-w-0 space-y-4 rounded-2xl border bg-card p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="editorial-heading" className="font-display text-lg font-bold">Registru articole</h2><p className="text-sm text-muted-foreground">Caută, actualizează și publică articolele din platformă.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || busy} aria-label="Reîmprospătează articolele" title="Reîmprospătează articolele"><RefreshCw className="size-4" /></Button>
            <Button size="sm" disabled={settingsLoading || busy} onClick={() => startEditing(null)}><Plus className="mr-1.5 size-4" />Articol nou</Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Input aria-label="Caută articole în registru" placeholder="Titlu, categorie sau etichetă…" value={query} onChange={event => { setQuery(event.target.value); setPageIndex(0); }} />
          <select aria-label="Filtrează după limbă" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={langFilter} onChange={event => { setLangFilter(event.target.value); setPageIndex(0); }}>
            <option value="all">Toate limbile</option><option value="ro">Română</option><option value="en">English</option>
          </select>
        </div>
        {loading && <p role="status" className="text-sm text-muted-foreground">Se încarcă registrul…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {posts && !loading && !visible.length && <p className="text-sm text-muted-foreground">Niciun articol pentru filtrele alese.</p>}
        <ul className="divide-y divide-border" aria-label="Articole din registru">
          {visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(post => (
            <li key={post.id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{post.title}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{post.language.toUpperCase()} · {BLOG_CATEGORIES[post.category]?.ro || post.category} · {when(post.updated_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={post.status === "published" ? "default" : "outline"}>{post.status === "published" ? "Publicat" : post.status === "draft" ? "Ciornă" : "Arhivat"}</Badge>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => startEditing(post)} aria-label={`Editează ${post.title}`}><Edit3 className="mr-1 size-3.5" />Editează</Button>
                {post.status !== "archived" && <Button size="icon" variant="ghost" disabled={busy} onClick={() => void changeStatus(post, "archived")} aria-label={`Arhivează ${post.title}`} title="Arhivează"><Archive className="size-4" /></Button>}
                {post.status !== "draft" && <Button size="icon" variant="ghost" disabled={busy} onClick={() => void changeStatus(post, "draft")} aria-label={`Treci în ciornă: ${post.title}`} title={post.status === "published" ? "Retrage în ciornă" : "Restaurează în ciornă"}><FileText className="size-4" /></Button>}
                {post.status === "published" && <Button asChild size="icon" variant="ghost" title="Vezi articolul public"><Link to={`${post.language === "en" ? "/en/blog" : "/blog"}/${encodeURIComponent(post.slug)}`} aria-label={`Vezi articolul public: ${post.title}`}><ExternalLink className="size-4" /></Link></Button>}
                {isAdmin && post.status === "archived" && <Button size="icon" variant="ghost" disabled={busy} onClick={() => void remove(post)} aria-label={`Șterge definitiv ${post.title}`} title="Șterge definitiv"><Trash2 className="size-4 text-destructive" /></Button>}
              </div>
            </li>
          ))}
        </ul>
        {pages > 1 && <div className="flex items-center justify-between gap-2 text-sm"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPageIndex(currentPage - 1)}>Înapoi</Button><span>Pagina {currentPage + 1} din {pages}</span><Button variant="outline" size="sm" disabled={currentPage + 1 === pages} onClick={() => setPageIndex(currentPage + 1)}>Înainte</Button></div>}
      </div>
      <Dialog open={editorOpen} onOpenChange={open => { if (!saving && !uploading) setEditorOpen(open); }}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editează articolul" : "Articol nou"}</DialogTitle>
            <DialogDescription>Completează articolul, apoi alege dacă îl păstrezi ca ciornă sau îl publici.</DialogDescription>
          </DialogHeader>
          <fieldset disabled={saving || uploading} className="grid min-w-0 gap-5 py-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="blog-title">Titlu</Label>
                <Input id="blog-title" value={form.title} onChange={event => set("title", event.target.value)} maxLength={180} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-excerpt">Rezumat scurt</Label>
                <Textarea id="blog-excerpt" value={form.excerpt} onChange={event => set("excerpt", event.target.value)} maxLength={320} rows={3} />
                <p className="text-right text-xs text-muted-foreground">{form.excerpt.length}/320</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-content">Articol (Markdown)</Label>
                <Textarea id="blog-content" value={form.content} onChange={event => set("content", event.target.value)} rows={12} maxLength={60000} className="font-mono text-sm" placeholder={"## Subtitlu\n\nParagraf…\n\n- Listă"} />
                <p className="text-xs text-muted-foreground">{readingTime(form.content)} min · {form.content.length} caractere</p>
              </div>
            </div>
            <div className="min-w-0 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="blog-language">Limbă</Label>
                  <select id="blog-language" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.language} onChange={event => set("language", event.target.value as BlogLanguage)}><option value="ro">Română</option><option value="en">English</option></select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="blog-category">Categorie</Label>
                  <select id="blog-category" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.category} onChange={event => set("category", event.target.value)}>
                    {[...new Set([...Object.keys(BLOG_CATEGORIES), form.category])].filter(Boolean).map(key => <option key={key} value={key}>{BLOG_CATEGORIES[key]?.[form.language] || key}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-tags">Etichete</Label>
                <Input id="blog-tags" value={tagsText} maxLength={320} onChange={event => setTagsText(event.target.value)} placeholder="seo, web-design, cloudflare" />
              </div>
              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer font-medium">Copertă</summary>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="blog-cover-file"><ImagePlus className="mr-1.5 inline size-4 text-brand" />{uploading ? "Se încarcă…" : "Încarcă o imagine (max. 5 MB)"}</Label>
                  <Input id="blog-cover-file" type="file" accept="image/avif,image/webp,image/jpeg,image/png" onChange={event => void upload(event.target.files?.[0])} />
                  <Label htmlFor="blog-cover-url">URL copertă</Label>
                  <Input id="blog-cover-url" value={form.coverImageUrl} onChange={event => set("coverImageUrl", event.target.value)} placeholder="https://… sau /api/blog/media/…" />
                  <Label htmlFor="blog-cover-alt">Text alternativ</Label>
                  <Input id="blog-cover-alt" value={form.coverImageAlt} onChange={event => set("coverImageAlt", event.target.value)} placeholder="Descrierea imaginii" />
                </div>
              </details>
              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer font-medium"><Search className="mr-1.5 inline size-4 text-brand" />Adresă, traducere, SEO și social</summary>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="blog-slug">Adresă articol (slug)</Label>
                  <Input id="blog-slug" value={form.slug} onChange={event => set("slug", slugify(event.target.value))} maxLength={96} placeholder="Generată din titlu dacă rămâne goală" />
                  <Label htmlFor="blog-translation">Cheie comună pentru traduceri</Label>
                  <Input id="blog-translation" value={form.translationKey} onChange={event => set("translationKey", slugify(event.target.value))} maxLength={96} placeholder="Aceeași cheie pentru RO și EN" />
                  <Label htmlFor="blog-seo-title">Titlu SEO</Label>
                  <Input id="blog-seo-title" value={form.seoTitle} onChange={event => set("seoTitle", event.target.value)} maxLength={70} />
                  <Label htmlFor="blog-seo-description">Descriere SEO</Label>
                  <Textarea id="blog-seo-description" value={form.seoDescription} onChange={event => set("seoDescription", event.target.value)} maxLength={170} rows={2} />
                  <Label htmlFor="blog-social-title">Titlu pentru distribuire</Label>
                  <Input id="blog-social-title" value={form.socialTitle} onChange={event => set("socialTitle", event.target.value)} maxLength={100} />
                  <Label htmlFor="blog-social-description">Descriere pentru distribuire</Label>
                  <Textarea id="blog-social-description" value={form.socialDescription} onChange={event => set("socialDescription", event.target.value)} maxLength={220} rows={2} />
                </div>
              </details>
            </div>
          </fieldset>
          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-background pt-4">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving || uploading}>Anulează</Button>
            <Button variant="secondary" onClick={() => void save(editing?.status || "draft")} disabled={saving || uploading}>
              <FileText className="mr-2 size-4" />{editing?.status === "published" ? "Salvează articolul publicat" : editing?.status === "archived" ? "Salvează în arhivă" : "Salvează ciorna"}
            </Button>
            {editing?.status !== "published" && <Button onClick={() => { if (window.confirm("Publici articolul pe blog?")) void save("published"); }} disabled={saving || uploading}>Publică</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
