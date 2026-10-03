import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { BookOpen, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import BlogAdminPanel from "@/components/intern/BlogAdminPanel";
import PageBackLink from "@/components/site/PageBackLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blogApi, type BlogLanguage } from "@/lib/blogApi";
import { EditorialWorkspace } from "@/pages/Blog";
import { useAuth } from "@/hooks/useAuth";

type View = "publish" | "settings";

export default function InternBlog() {
  const { isAdmin, isStaff } = useAuth();
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "settings" ? "settings" : "publish";
  const [saving, setSaving] = useState(false);
  const [publicationRevision, setPublicationRevision] = useState(0);
  const [form, setForm] = useState({ publicationName: "", editorialDescription: "", defaultLanguage: "ro" as BlogLanguage, defaultCategory: "digital" });

  useEffect(() => {
    blogApi.settings().then(({ data }) => setForm({
      publicationName: data.publication_name,
      editorialDescription: data.editorial_description,
      defaultLanguage: data.default_language,
      defaultCategory: data.default_category,
    })).catch((error) => toast.error(error instanceof Error ? error.message : "Setările blogului nu au putut fi încărcate."));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await blogApi.updateSettings(form);
      toast.success("Setările editoriale au fost salvate.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Setările nu au putut fi salvate.");
    } finally { setSaving(false); }
  };

  if (!isStaff) return <Navigate to="/403" replace />;

  return (
    <main className="min-h-screen bg-secondary/30 px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageBackLink to="/intern" label="Proiecte" title="Înapoi la proiecte" />
        <header className="rounded-3xl border bg-card/85 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Platformă internă</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Blog · control editorial</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Publicarea și setările sunt separate intenționat. Modificarea setărilor nu publică articole, iar schimbarea stării unui articol nu rescrie configurația blogului.</p>
        </header>
        <nav className="grid gap-2 rounded-2xl border bg-card p-2 sm:grid-cols-2" aria-label="Secțiuni blog">
          <Button variant={view === "publish" ? "default" : "ghost"} onClick={() => setParams({ view: "publish" })}><BookOpen className="mr-2 size-4" /> Publicare articole</Button>
          <Button variant={view === "settings" ? "default" : "ghost"} onClick={() => setParams({ view: "settings" })}><Settings2 className="mr-2 size-4" /> Setări blog</Button>
        </nav>
        {view === "publish" ? <div className="space-y-5"><EditorialWorkspace language={form.defaultLanguage} isAdmin={isAdmin} onPublished={async () => setPublicationRevision((value) => value + 1)} /><BlogAdminPanel key={publicationRevision} /></div> : (
          <Card>
            <CardHeader><CardTitle>Setări editoriale</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="blog-publication-name">Numele publicației</Label><Input id="blog-publication-name" value={form.publicationName} maxLength={100} onChange={(event) => setForm({ ...form, publicationName: event.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="blog-default-category">Categoria implicită</Label><Input id="blog-default-category" value={form.defaultCategory} maxLength={48} onChange={(event) => setForm({ ...form, defaultCategory: event.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="blog-editorial-description">Descriere editorială internă</Label><Textarea id="blog-editorial-description" rows={5} maxLength={500} value={form.editorialDescription} onChange={(event) => setForm({ ...form, editorialDescription: event.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="blog-default-language">Limba implicită</Label><select id="blog-default-language" className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-64" value={form.defaultLanguage} onChange={(event) => setForm({ ...form, defaultLanguage: event.target.value as BlogLanguage })}><option value="ro">Română</option><option value="en">English</option></select></div>
              <Button onClick={() => void save()} disabled={saving}><Save className="mr-2 size-4" /> {saving ? "Se salvează…" : "Salvează setările"}</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
