import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, BookOpen, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import BlogAdminPanel from "@/components/intern/BlogAdminPanel";
import PageBackLink from "@/components/site/PageBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blogApi, type BlogLanguage, type BlogSettings } from "@/lib/blogApi";
import { BLOG_CATEGORIES, blogSlug } from "@/lib/blogEditorial";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection } from "@/lib/access";

const toForm = (settings: BlogSettings) => ({
  publicationName: settings.publication_name,
  editorialDescription: settings.editorial_description,
  defaultLanguage: settings.default_language,
  defaultCategory: settings.default_category,
});

export default function InternBlog({ embedded = false }: { embedded?: boolean }) {
  const { isAdmin, isSuperAdmin, roles, capabilities } = useAuth();
  const allowed = canOpenSection("blog-editorial", buildAccess({ roles, capabilities, superadmin: isSuperAdmin }));
  const [params, setParams] = useSearchParams();
  const viewKey = embedded ? "blogView" : "view";
  const settingsView = params.get(viewKey) === "settings";
  const selectView = (settings: boolean) => setParams(current => {
    const next = new URLSearchParams(current);
    if (settings) next.set(viewKey, "settings");
    else next.delete(viewKey);
    return next;
  });
  const [stored, setStored] = useState<BlogSettings | null>(null);
  const [form, setForm] = useState<ReturnType<typeof toForm> | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await blogApi.settings(signal);
      if (signal?.aborted) return;
      setStored(data);
      setForm(toForm(data));
    } catch {
      if (!signal?.aborted) setError("Setările nu au putut fi încărcate. Încearcă din nou.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void loadSettings(controller.signal);
    return () => controller.abort();
  }, [allowed, loadSettings]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || saving) return;
    const next = { ...form, publicationName: form.publicationName.trim(), editorialDescription: form.editorialDescription.trim(), defaultCategory: blogSlug(form.defaultCategory) };
    if (next.publicationName.length < 3 || next.editorialDescription.length < 20 || !next.defaultCategory) {
      setError("Verifică numele (minimum 3 caractere), descrierea (minimum 20) și categoria."); return;
    }
    setSaving(true);
    setError("");
    try {
      await blogApi.updateSettings(next);
      setStored({ publication_name: next.publicationName, editorial_description: next.editorialDescription, default_language: next.defaultLanguage, default_category: next.defaultCategory, updated_at: Date.now() });
      setForm(next);
      toast.success("Setările editoriale au fost salvate.");
    } catch { setError("Setările nu au putut fi salvate. Modificările rămân în formular."); }
    finally { setSaving(false); }
  };

  if (!allowed) return <Navigate to="/403" replace />;
  const savedForm = stored ? toForm(stored) : null;
  const dirty = !!form && !!savedForm && (Object.keys(form) as (keyof typeof form)[]).some(key => form[key] !== savedForm[key]);
  const Container = embedded ? "div" : "main";
  return (
    <Container className={embedded ? "min-w-0" : "min-h-screen bg-secondary/30 px-4 py-7 sm:px-6"}>
      <div className="mx-auto max-w-6xl space-y-4">
        {!embedded && <PageBackLink to="/profil?tab=blog-editorial" label="Platformă" title="Control editorial în AVYRON OS" />}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Platformă · Blog</p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Control editorial</h1>
            <p className="mt-1 text-sm text-muted-foreground">Administrează articolele și setările redacției dintr-un singur loc.</p>
          </div>
          <Button asChild size="sm" variant="outline"><Link to="/blog">Vezi blogul public <ArrowUpRight className="ml-1.5 size-4" /></Link></Button>
        </header>
        <nav className="flex flex-wrap gap-2" aria-label="Secțiuni blog">
          <Button variant={!settingsView ? "default" : "outline"} aria-current={!settingsView ? "page" : undefined} onClick={() => selectView(false)}><BookOpen className="mr-1.5 size-4" />Articole</Button>
          <Button variant={settingsView ? "default" : "outline"} aria-current={settingsView ? "page" : undefined} onClick={() => selectView(true)}><Settings2 className="mr-1.5 size-4" />Setări blog</Button>
        </nav>
        {settingsView ? (
          <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="blog-settings-title">
            <div><h2 id="blog-settings-title" className="font-display text-lg font-bold">Setări editoriale</h2><p className="text-sm text-muted-foreground">Limba și categoria se propun pentru articolele noi. Articolele existente își păstrează datele.</p></div>
            {loading && <p role="status" className="text-sm">Se încarcă setările…</p>}
            {error && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">{error}{!form && <Button size="sm" variant="outline" onClick={() => void loadSettings()}>Reîncearcă</Button>}</div>}
            {form && <form className="space-y-4" onSubmit={save}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="blog-publication-name">Numele publicației</Label><Input id="blog-publication-name" value={form.publicationName} required minLength={3} maxLength={100} onChange={e => setForm({ ...form, publicationName: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="blog-default-language">Limba implicită</Label><select id="blog-default-language" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.defaultLanguage} onChange={e => setForm({ ...form, defaultLanguage: e.target.value as BlogLanguage })}><option value="ro">Română</option><option value="en">English</option></select></div>
                <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="blog-default-category">Categoria implicită</Label><select id="blog-default-category" className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:max-w-sm" value={form.defaultCategory} onChange={e => setForm({ ...form, defaultCategory: e.target.value })}>{[...new Set([...Object.keys(BLOG_CATEGORIES), form.defaultCategory])].filter(Boolean).map(key => <option key={key} value={key}>{BLOG_CATEGORIES[key]?.ro || key}</option>)}</select></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="blog-editorial-description">Descriere editorială internă</Label><Textarea id="blog-editorial-description" rows={4} required minLength={20} maxLength={500} value={form.editorialDescription} onChange={e => setForm({ ...form, editorialDescription: e.target.value })} /><p className="text-right text-xs text-muted-foreground">{form.editorialDescription.length}/500</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!dirty || saving}><Save className="mr-1.5 size-4" />{saving ? "Se salvează…" : "Salvează setările"}</Button>
                {dirty && <Button type="button" variant="outline" disabled={saving} onClick={() => { if (stored) setForm(toForm(stored)); setError(""); }}>Renunță la modificări</Button>}
              </div>
            </form>}
          </section>
        ) : (
          <BlogAdminPanel defaultLanguage={stored?.default_language || "ro"} defaultCategory={stored?.default_category || "digital"} isAdmin={isAdmin} settingsLoading={loading} />
        )}
      </div>
    </Container>
  );
}
