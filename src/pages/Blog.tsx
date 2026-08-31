import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  ArrowRight, BookOpen, Calendar, Check, Clock, Edit3, ExternalLink,
  Facebook, FileText, ImagePlus, Linkedin, Loader2, Mail, MessageCircle, Plus, Search,
  Send, Share2, ShieldCheck, SlidersHorizontal, Tag, Trash2, Twitter, UserRound,
} from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOG_INDEX, BLOG_INDEX_EN, type BlogIndexEntry } from "@/data/blogIndex";
import { apiUrl } from "@/lib/apiBase";
import { blogApi, type BlogLanguage, type BlogPost, type BlogPostInput, type BlogStatus } from "@/lib/blogApi";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PageBackLink from "@/components/site/PageBackLink";

const SITE_URL = "https://avyron.ro";
const FALLBACK_IMAGE = "/og/home.jpg";
const CATEGORIES: Record<string, { ro: string; en: string }> = {
  business: { ro: "Afaceri", en: "Business" },
  "web-design": { ro: "Web design", en: "Web design" },
  seo: { ro: "SEO și vizibilitate", en: "SEO & visibility" },
  security: { ro: "Securitate", en: "Security" },
  securitate: { ro: "Securitate", en: "Security" },
  cloudflare: { ro: "Cloudflare", en: "Cloudflare" },
  technology: { ro: "Tehnologie", en: "Technology" },
  tech: { ro: "Tehnologie", en: "Technology" },
  avyron: { ro: "Din agenție", en: "Inside Avyron" },
  digital: { ro: "Strategie digitală", en: "Digital strategy" },
};

const toTime = (value: string | number | null | undefined) => !value ? 0 : typeof value === "number" ? value : new Date(value).getTime();
const formatDate = (value: string | number | null | undefined, lang: BlogLanguage) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(toTime(value) || Date.now()));
const readingTime = (text: string) => Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 210));
const initials = (name?: string | null) => (name || "Avyron").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const categoryLabel = (category: string, lang: BlogLanguage) => CATEGORIES[category]?.[lang] || category.replace(/-/g, " ");
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
const mediaUrl = (value?: string | null) => !value ? FALLBACK_IMAGE : value.startsWith("/api/") ? apiUrl(value) : value;
const absoluteUrl = (value?: string | null) => mediaUrl(value).startsWith("http") ? mediaUrl(value) : `${SITE_URL}${mediaUrl(value)}`;

const fromIndex = (entry: BlogIndexEntry, language: BlogLanguage): BlogPost => ({
  ...entry, language, status: "published", author_name: "Echipa Avyron", author_avatar_url: null,
  cover_image_alt: entry.title, created_at: entry.published_at, alternate_slug: entry.slug,
  translation_key: entry.slug,
});

const mergePosts = (remote: BlogPost[], local: BlogPost[]) => {
  const bySlug = new Map(local.map((post) => [post.slug, post]));
  for (const post of remote) bySlug.set(post.slug, { ...bySlug.get(post.slug), ...post });
  return [...bySlug.values()].sort((a, b) => toTime(b.published_at) - toTime(a.published_at));
};

const safeInline = (value: string) => {
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const linked = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, rawUrl) => {
    const url = String(rawUrl).trim();
    const safe = /^(https?:|mailto:|tel:|#|\/)/i.test(url) ? url : "#";
    return `<a href="${safe}" rel="noopener noreferrer" class="font-medium text-brand underline-offset-4 hover:underline">${label}</a>`;
  });
  return DOMPurify.sanitize(linked, { ALLOWED_TAGS: ["strong", "em", "a", "code"], ALLOWED_ATTR: ["href", "rel", "class"], ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i });
};

const MarkdownArticle = ({ content }: { content: string }) => {
  const nodes: ReactNode[] = [];
  let bullets: string[] = [], numbers: string[] = [];
  const flush = () => {
    if (bullets.length) nodes.push(<ul key={`ul-${nodes.length}`} className="my-4 list-disc space-y-1.5 pl-6 leading-7">{bullets.map((line, index) => <li key={index} dangerouslySetInnerHTML={{ __html: safeInline(line) }} />)}</ul>);
    if (numbers.length) nodes.push(<ol key={`ol-${nodes.length}`} className="my-4 list-decimal space-y-1.5 pl-6 leading-7">{numbers.map((line, index) => <li key={index} dangerouslySetInnerHTML={{ __html: safeInline(line) }} />)}</ol>);
    bullets = []; numbers = [];
  };
  content.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return flush();
    if (line.startsWith("### ")) { flush(); nodes.push(<h3 key={index} className="mb-2.5 mt-7 font-display text-xl font-semibold" dangerouslySetInnerHTML={{ __html: safeInline(line.slice(4)) }} />); }
    else if (line.startsWith("## ")) { flush(); nodes.push(<h2 key={index} className="mb-3 mt-9 font-display text-2xl font-bold tracking-tight md:text-[1.7rem]" dangerouslySetInnerHTML={{ __html: safeInline(line.slice(3)) }} />); }
    else if (/^\d+\.\s/.test(line)) { if (bullets.length) flush(); numbers.push(line.replace(/^\d+\.\s/, "")); }
    else if (line.startsWith("- ")) { if (numbers.length) flush(); bullets.push(line.slice(2)); }
    else if (line.startsWith("> ")) { flush(); nodes.push(<blockquote key={index} className="my-7 border-l-4 border-brand bg-brand/5 px-5 py-4 text-lg italic" dangerouslySetInnerHTML={{ __html: safeInline(line.slice(2)) }} />); }
    else { flush(); nodes.push(<p key={index} className="my-3.5 leading-7 text-foreground/85" dangerouslySetInnerHTML={{ __html: safeInline(line) }} />); }
  });
  flush();
  return <div className="article-copy text-[0.97rem] md:text-base">{nodes}</div>;
};

const ShareButtons = ({ post, language, compact = false }: { post: BlogPost; language: BlogLanguage; compact?: boolean }) => {
  const url = `${SITE_URL}${language === "en" ? "/en/blog" : "/blog"}/${post.slug}`;
  const title = post.social_title || post.title;
  const text = post.social_description || post.excerpt;
  const encodedUrl = encodeURIComponent(url), encodedText = encodeURIComponent(`${title} — ${text}`);
  const links = [
    { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}` },
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { label: "Email", icon: Mail, href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%0A%0A${encodedUrl}` },
  ];
  const share = async () => {
    if (!navigator.share) {
      toast.info(language === "en" ? "Choose one of the available sharing channels" : "Alege unul dintre canalele de distribuire disponibile");
      return;
    }
    try { await navigator.share({ title, text, url }); } catch (error) { if (error instanceof Error && error.name !== "AbortError") toast.error(language === "en" ? "Sharing is not available" : "Distribuirea nu este disponibilă"); }
  };
  return <div className={compact ? "max-w-full" : "mt-8 border-t border-border/70 pt-6"}>
    {!compact && <p className="mb-4 flex items-center gap-2 text-sm font-semibold"><Share2 className="size-4 text-brand" />{language === "en" ? "Share this guide" : "Distribuie acest ghid"}</p>}
    <div data-testid="article-share-row" className="scrollbar-subtle flex max-w-full flex-nowrap justify-start gap-1.5 overflow-x-auto pb-1 sm:justify-center">
      <Button type="button" variant="outline" size="icon" className="size-9 shrink-0 rounded-full" onClick={share} aria-label={language === "en" ? "Share" : "Distribuie"} title={language === "en" ? "Share" : "Distribuie"}><Share2 className="size-4" /></Button>
      {links.map(({ label, icon: Icon, href }) => <Button key={label} asChild variant="outline" size="icon" className="size-9 shrink-0 rounded-full"><a href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={`${language === "en" ? "Share on" : "Distribuie pe"} ${label}`}><Icon className="size-4" /></a></Button>)}
    </div>
  </div>;
};

const ArticleCard = ({ post, language, featured = false }: { post: BlogPost; language: BlogLanguage; featured?: boolean }) => {
  const href = `${language === "en" ? "/en/blog" : "/blog"}/${post.slug}`;
  return <article className={`group overflow-hidden rounded-3xl border border-border/70 bg-card/75 shadow-soft transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-elev ${featured ? "grid lg:grid-cols-[1.15fr_.85fr]" : "flex h-full flex-col"}`}>
    <Link to={href} className={`relative block overflow-hidden bg-muted ${featured ? "min-h-72 lg:min-h-[430px]" : "aspect-[16/10]"}`} aria-label={post.title}><img src={mediaUrl(post.cover_image_url)} alt={post.cover_image_alt || post.title} width={featured ? 1200 : 720} height={featured ? 675 : 450} loading={featured ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" /><div className="absolute inset-0 bg-gradient-to-t from-background/45 to-transparent" /></Link>
    <div className={`flex flex-1 flex-col ${featured ? "p-7 md:p-10" : "p-6"}`}><div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><Badge variant="secondary" className="rounded-full text-brand">{categoryLabel(post.category, language)}</Badge><span className="inline-flex items-center gap-1"><Calendar className="size-3.5" />{formatDate(post.published_at, language)}</span><span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{readingTime(post.content)} min</span></div>
      <h2 className={`${featured ? "mt-5 text-3xl md:text-4xl" : "mt-4 text-xl"} font-display font-bold leading-tight tracking-tight`}><Link to={href} className="transition-colors hover:text-brand">{post.title}</Link></h2><p className="mt-4 line-clamp-3 leading-relaxed text-muted-foreground">{post.excerpt}</p>
      <div className="mt-auto flex items-center justify-between gap-4 pt-7"><div className="flex min-w-0 items-center gap-2.5"><Avatar className="size-8 border border-border"><AvatarImage src={post.author_avatar_url ? mediaUrl(post.author_avatar_url) : undefined} alt="" /><AvatarFallback>{initials(post.author_name)}</AvatarFallback></Avatar><span className="truncate text-xs font-medium">{post.author_name || "Echipa Avyron"}</span></div><Button asChild variant="ghost" size="sm" className="shrink-0 text-brand"><Link to={href}>{language === "en" ? "Read" : "Citește"}<ArrowRight className="ml-1 size-4" /></Link></Button></div>
    </div>
  </article>;
};

const emptyForm = (language: BlogLanguage): BlogPostInput => ({ language, title: "", slug: "", translationKey: "", excerpt: "", content: "", coverImageUrl: "", coverImageAlt: "", category: "digital", tags: [], seoTitle: "", seoDescription: "", socialTitle: "", socialDescription: "", status: "draft" });
const toForm = (post: BlogPost): BlogPostInput => ({ language: post.language, slug: post.slug, translationKey: post.translation_key || "", title: post.title, excerpt: post.excerpt, content: post.content, coverImageUrl: post.cover_image_url || "", coverImageAlt: post.cover_image_alt || "", category: post.category, tags: post.tags, seoTitle: post.seo_title || "", seoDescription: post.seo_description || "", socialTitle: post.social_title || "", socialDescription: post.social_description || "", status: post.status });

const EditorialWorkspace = ({ language, isAdmin, onPublished }: { language: BlogLanguage; isAdmin: boolean; onPublished: () => Promise<void> }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]), [loading, setLoading] = useState(true), [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null), [form, setForm] = useState<BlogPostInput>(() => emptyForm(language));
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setPosts((await blogApi.listStaff()).data); } catch { toast.error(language === "en" ? "Editorial workspace could not be loaded" : "Spațiul editorial nu a putut fi încărcat"); } finally { setLoading(false); } }, [language]);
  useEffect(() => { void load(); }, [load]);
  const set = <K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const openNew = () => { setEditing(null); setForm(emptyForm(language)); setEditorOpen(true); };
  const openEdit = (post: BlogPost) => { setEditing(post); setForm(toForm(post)); setEditorOpen(true); };
  const save = async (status: BlogStatus) => {
    const next = { ...form, status, slug: form.slug || slugify(form.title), tags: form.tags.filter(Boolean).slice(0, 8) };
    if (next.title.trim().length < 8 || next.excerpt.trim().length < 40 || next.content.trim().length < 120) return toast.error(language === "en" ? "Complete the title, excerpt and article body" : "Completează titlul, rezumatul și conținutul articolului");
    setSaving(true); try { if (editing) await blogApi.update(editing.id, next); else await blogApi.create(next); toast.success(status === "published" ? (language === "en" ? "Article published" : "Articol publicat") : (language === "en" ? "Draft saved" : "Ciornă salvată")); setEditorOpen(false); await Promise.all([load(), onPublished()]); } catch (error) { toast.error(error instanceof Error ? error.message : "Eroare la salvare"); } finally { setSaving(false); }
  };
  const upload = async (file?: File) => { if (!file) return; setUploading(true); try { set("coverImageUrl", (await blogApi.uploadCover(file)).url); toast.success(language === "en" ? "Cover uploaded" : "Coperta a fost încărcată"); } catch { toast.error(language === "en" ? "Cover upload failed" : "Încărcarea copertei a eșuat"); } finally { setUploading(false); } };
  const remove = async (post: BlogPost) => { if (!isAdmin || !window.confirm(language === "en" ? "Delete this article permanently?" : "Ștergi definitiv acest articol?")) return; try { await blogApi.remove(post.id); await Promise.all([load(), onPublished()]); toast.success(language === "en" ? "Article deleted" : "Articol șters"); } catch { toast.error(language === "en" ? "Delete failed" : "Articolul nu a putut fi șters"); } };

  return <section className="rounded-3xl border border-brand/25 bg-brand/[0.045] p-5 md:p-7" aria-labelledby="editorial-heading"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Badge className="mb-2 rounded-full">Staff</Badge><h2 id="editorial-heading" className="font-display text-2xl font-bold">{language === "en" ? "Editorial workspace" : "Spațiu editorial"}</h2><p className="mt-1 text-sm text-muted-foreground">{language === "en" ? "Create, review and publish individual articles." : "Creează, verifică și publică articole individuale."}</p></div><Button onClick={openNew} className="rounded-full"><Plus className="mr-2 size-4" />{language === "en" ? "New article" : "Articol nou"}</Button></div>
    {loading ? <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{language === "en" ? "Loading…" : "Se încarcă…"}</div> : <div className="mt-6 grid gap-3 md:grid-cols-2">{posts.length === 0 && <p className="text-sm text-muted-foreground">{language === "en" ? "No database articles yet." : "Nu există încă articole în baza de date."}</p>}{posts.slice(0, 12).map((post) => <div key={post.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/75 p-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge><Badge variant="outline">{post.language.toUpperCase()}</Badge></div><p className="line-clamp-2 font-semibold">{post.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(post.updated_at, language)}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(post)} aria-label={language === "en" ? "Edit article" : "Editează articolul"}><Edit3 className="size-4" /></Button>{isAdmin && <Button size="icon" variant="ghost" onClick={() => void remove(post)} aria-label={language === "en" ? "Delete article" : "Șterge articolul"}><Trash2 className="size-4 text-destructive" /></Button>}</div></div>)}</div>}
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-2xl">{editing ? (language === "en" ? "Edit article" : "Editează articolul") : (language === "en" ? "New article" : "Articol nou")}</DialogTitle></DialogHeader>
      <div className="grid gap-6 py-2 lg:grid-cols-[1fr_.72fr]"><div className="space-y-4"><div><Label htmlFor="blog-title">{language === "en" ? "Title" : "Titlu"}</Label><Input id="blog-title" value={form.title} onChange={(event) => { set("title", event.target.value); if (!editing && !form.slug) set("slug", slugify(event.target.value)); }} maxLength={180} className="mt-1.5" /></div><div><Label htmlFor="blog-excerpt">{language === "en" ? "Short summary" : "Rezumat scurt"}</Label><Textarea id="blog-excerpt" value={form.excerpt} onChange={(event) => set("excerpt", event.target.value)} maxLength={320} rows={3} className="mt-1.5" /><p className="mt-1 text-right text-xs text-muted-foreground">{form.excerpt.length}/320</p></div><div><Label htmlFor="blog-content">{language === "en" ? "Article (Markdown)" : "Articol (Markdown)"}</Label><Textarea id="blog-content" value={form.content} onChange={(event) => set("content", event.target.value)} rows={20} maxLength={60000} className="mt-1.5 font-mono text-sm" placeholder="## Subtitlu\n\nParagraf…\n\n- listă" /><p className="mt-1 text-xs text-muted-foreground">{readingTime(form.content)} min · {form.content.length} caractere</p></div></div>
        <div className="space-y-5"><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="blog-language">{language === "en" ? "Language" : "Limbă"}</Label><Select value={form.language} onValueChange={(value) => set("language", value as BlogLanguage)}><SelectTrigger id="blog-language" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ro">Română</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></div><div><Label htmlFor="blog-category">{language === "en" ? "Category" : "Categorie"}</Label><Select value={form.category} onValueChange={(value) => set("category", value)}><SelectTrigger id="blog-category" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{["digital","business","web-design","seo","security","cloudflare","technology","avyron"].map((key) => <SelectItem key={key} value={key}>{CATEGORIES[key][form.language]}</SelectItem>)}</SelectContent></Select></div></div>
          <div><Label htmlFor="blog-slug">Slug URL</Label><Input id="blog-slug" value={form.slug} onChange={(event) => set("slug", slugify(event.target.value))} maxLength={96} className="mt-1.5 font-mono text-xs" /></div><div><Label htmlFor="blog-translation">Translation key</Label><Input id="blog-translation" value={form.translationKey} onChange={(event) => set("translationKey", slugify(event.target.value))} maxLength={96} className="mt-1.5" placeholder="aceeași cheie pentru RO și EN" /></div><div><Label htmlFor="blog-tags">Taguri</Label><Input id="blog-tags" value={form.tags.join(", ")} onChange={(event) => set("tags", event.target.value.split(",").map((tag) => slugify(tag)).filter(Boolean).slice(0, 8))} className="mt-1.5" placeholder="seo, web-design, cloudflare" /></div>
          <div className="rounded-2xl border border-dashed border-border p-4"><Label htmlFor="blog-cover-file" className="flex cursor-pointer items-center gap-2"><ImagePlus className="size-4 text-brand" />{uploading ? (language === "en" ? "Uploading…" : "Se încarcă…") : (language === "en" ? "Upload cover (AVIF/WebP/JPG/PNG)" : "Încarcă copertă (AVIF/WebP/JPG/PNG)")}</Label><Input id="blog-cover-file" type="file" accept="image/avif,image/webp,image/jpeg,image/png" className="sr-only" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} /><Label htmlFor="blog-cover-url" className="mt-3 block text-xs">URL copertă</Label><Input id="blog-cover-url" value={form.coverImageUrl} onChange={(event) => set("coverImageUrl", event.target.value)} className="mt-1" placeholder="https://… sau /api/blog/media/…" /><Label htmlFor="blog-cover-alt" className="mt-2 block text-xs">Text alternativ</Label><Input id="blog-cover-alt" value={form.coverImageAlt} onChange={(event) => set("coverImageAlt", event.target.value)} className="mt-1" placeholder="Descrierea imaginii" /></div>
          <div className="space-y-3 rounded-2xl border border-border/70 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Search className="size-4 text-brand" />SEO și social</p><Label htmlFor="blog-seo-title" className="sr-only">Titlu SEO</Label><Input id="blog-seo-title" value={form.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} maxLength={70} placeholder="Titlu SEO (max. 70)" /><Label htmlFor="blog-seo-description" className="sr-only">Descriere SEO</Label><Textarea id="blog-seo-description" value={form.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} maxLength={170} rows={2} placeholder="Descriere SEO (max. 170)" /><Label htmlFor="blog-social-title" className="sr-only">Titlu pentru distribuire</Label><Input id="blog-social-title" value={form.socialTitle} onChange={(event) => set("socialTitle", event.target.value)} maxLength={100} placeholder="Titlu pentru distribuire" /><Label htmlFor="blog-social-description" className="sr-only">Descriere pentru distribuire</Label><Textarea id="blog-social-description" value={form.socialDescription} onChange={(event) => set("socialDescription", event.target.value)} maxLength={220} rows={2} placeholder="Descriere pentru distribuire" /></div></div></div>
      <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-background/95 pt-4 backdrop-blur sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>{language === "en" ? "Cancel" : "Anulează"}</Button><Button variant="secondary" onClick={() => void save("draft")} disabled={saving}><FileText className="mr-2 size-4" />{language === "en" ? "Save draft" : "Salvează ciorna"}</Button><Button onClick={() => void save("published")} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}<Check className="mr-2 size-4" />{language === "en" ? "Publish" : "Publică"}</Button></div>
    </DialogContent></Dialog>
  </section>;
};

const Blog = () => {
  const { slug } = useParams<{ slug?: string }>();
  const language: BlogLanguage = window.location.pathname.startsWith("/en/") ? "en" : "ro";
  const { isStaff, isAdmin } = useAuth();
  const staticPosts = useMemo(() => mergePosts([], (language === "en" ? BLOG_INDEX_EN : BLOG_INDEX).map((entry) => fromIndex(entry, language))), [language]);
  const [posts, setPosts] = useState<BlogPost[]>(staticPosts), [loaded, setLoaded] = useState(false), [query, setQuery] = useState(""), [category, setCategory] = useState("all");
  const refresh = useCallback(async () => { try { setPosts(mergePosts((await blogApi.listPublished(language)).data, staticPosts)); } catch { setPosts(staticPosts); } finally { setLoaded(true); } }, [language, staticPosts]);
  useEffect(() => { setPosts(staticPosts); setLoaded(false); void refresh(); }, [refresh, staticPosts]);
  const current = slug ? posts.find((post) => post.slug === slug) || null : null;
  useEffect(() => { if (!slug || current || !loaded) return; blogApi.getPublished(language, slug).then(({ data }) => setPosts((items) => mergePosts([data], items))).catch(() => {}); }, [current, language, loaded, slug]);

  useEffect(() => {
    const article = slug ? current : null, basePath = language === "en" ? "/en/blog" : "/blog", path = article ? `${basePath}/${article.slug}` : basePath;
    const alternates = article ? (article.alternate_slug ? (language === "ro" ? { ro: path, en: `/en/blog/${article.alternate_slug}` } : { ro: `/blog/${article.alternate_slug}`, en: path }) : undefined) : { ro: "/blog", en: "/en/blog" };
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
      const rawTitle = article?.seo_title || article?.title;
      const title = rawTitle ? `${rawTitle} | Avyron` : (language === "en" ? "Avyron Insights — Websites, SEO, AI & digital strategy" : "Avyron Insights — Website-uri, SEO, AI și strategie digitală");
      const description = article?.seo_description || article?.excerpt || (language === "en" ? "Applied analysis on business websites, SEO for Google and AI search, online security, automation and scalable digital products." : "Analize aplicate despre site-uri pentru afaceri, SEO pentru Google și căutări AI, securitate online, automatizare și produse digitale scalabile.");
      setPageMeta({
        title, description, path, alternates,
        image: mediaUrl(article?.cover_image_url), imageAlt: article?.cover_image_alt || article?.title,
        type: article ? "article" : "website", robots: slug && loaded && !article ? "noindex, nofollow" : undefined,
        publishedTime: article?.published_at ? new Date(toTime(article.published_at)).toISOString() : undefined,
        modifiedTime: article?.updated_at ? new Date(toTime(article.updated_at)).toISOString() : undefined,
        section: article ? categoryLabel(article.category, language) : undefined,
        tags: article?.tags,
      });
      setJsonLd("organization", organizationLd); setJsonLd("breadcrumb", breadcrumbLd([{ name: language === "en" ? "Home" : "Acasă", path: language === "en" ? "/en" : "/" }, { name: "Blog", path: basePath }, ...(article ? [{ name: article.title, path }] : [])]));
      if (article) setJsonLd("blogposting", { "@type": "BlogPosting", "@id": `${SITE_URL}${path}#article`, headline: article.title, description: article.excerpt, image: [absoluteUrl(article.cover_image_url)], datePublished: new Date(toTime(article.published_at)).toISOString(), dateModified: new Date(toTime(article.updated_at)).toISOString(), inLanguage: language === "en" ? "en" : "ro-RO", articleSection: categoryLabel(article.category, language), keywords: article.tags.join(", "), wordCount: article.content.trim().split(/\s+/).length, isAccessibleForFree: true, author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: article.author_name || "Echipa Avyron" }, publisher: { "@id": `${SITE_URL}/#organization` }, mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` } });
      if (!article && !slug) setJsonLd("blog", { "@type": "Blog", "@id": `${SITE_URL}${basePath}#blog`, name: "Avyron Insights", description, url: `${SITE_URL}${basePath}`, inLanguage: language, publisher: { "@id": `${SITE_URL}/#organization` } });
    });
  }, [current, language, loaded, slug]);

  if (slug && loaded && !current) return <main className="min-h-screen bg-background"><Nav /><section className="mx-auto max-w-3xl px-4 pb-24 pt-32 text-center"><div className="flex justify-start"><PageBackLink to={language === "en" ? "/en/blog" : "/blog"} label={language === "en" ? "Back" : "Înapoi"} title={language === "en" ? "Back to insights" : "Înapoi la articole"} /></div><div className="mx-auto mt-8 grid size-16 place-items-center rounded-2xl bg-muted"><FileText className="size-7 text-muted-foreground" /></div><h1 className="mt-6 font-display text-4xl font-bold">{language === "en" ? "Article not found" : "Articolul nu a fost găsit"}</h1><p className="mt-3 text-muted-foreground">{language === "en" ? "It may still be a draft, archived, or the link may be incorrect." : "Este posibil să fie încă o ciornă, să fi fost arhivat sau linkul să fie incorect."}</p></section><Footer /></main>;

  if (slug && current) {
    const basePath = language === "en" ? "/en/blog" : "/blog";
    const related = posts.filter((post) => post.slug !== current.slug && (post.category === current.category || post.tags.some((tag) => current.tags.includes(tag)))).slice(0, 3);
    return <main className="min-h-screen overflow-x-hidden bg-background"><Nav /><article className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:pt-36"><PageBackLink to={basePath} label={language === "en" ? "Back" : "Înapoi"} title={language === "en" ? "All insights" : "Toate articolele"} />
      <header className="mx-auto mt-8 max-w-5xl text-center"><Badge variant="secondary" className="rounded-full text-brand">{categoryLabel(current.category, language)}</Badge><h1 className="mt-4 text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">{current.title}</h1><p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">{current.excerpt}</p><div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><UserRound className="size-4" />{current.author_name || "Echipa Avyron"}</span><span className="inline-flex items-center gap-1.5"><Calendar className="size-4" />{formatDate(current.published_at, language)}</span><span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{readingTime(current.content)} {language === "en" ? "min read" : "min de citit"}</span></div><div className="mt-5 flex justify-center"><ShareButtons post={current} language={language} compact /></div></header>
      <figure className="mt-8 overflow-hidden rounded-[2rem] border border-border/70 bg-muted shadow-elev"><img src={mediaUrl(current.cover_image_url)} alt={current.cover_image_alt || current.title} width={1200} height={630} className="aspect-[40/21] w-full object-cover" /></figure>
      <div className="mx-auto mt-8 grid max-w-6xl gap-7 lg:grid-cols-[minmax(0,1fr)_220px]"><div className="rounded-3xl border border-border/60 bg-card/65 p-5 shadow-soft md:p-8"><MarkdownArticle content={current.content} />{current.tags.length > 0 && <div className="mt-8 flex flex-wrap gap-2 border-t border-border/70 pt-5">{current.tags.map((tag) => <Badge key={tag} variant="outline"><Tag className="mr-1 size-3" />{tag}</Badge>)}</div>}<ShareButtons post={current} language={language} /></div><aside className="space-y-5 lg:sticky lg:top-28 lg:self-start"><div className="rounded-3xl border border-border/70 bg-card/65 p-5"><Avatar className="size-12 border border-border"><AvatarImage src={current.author_avatar_url ? mediaUrl(current.author_avatar_url) : undefined} alt="" /><AvatarFallback>{initials(current.author_name)}</AvatarFallback></Avatar><p className="mt-4 font-semibold">{current.author_name || "Echipa Avyron"}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{language === "en" ? "Practical analysis based on design, development, SEO and infrastructure work." : "Analiză practică bazată pe proiecte de design, dezvoltare, SEO și infrastructură."}</p></div><div className="rounded-3xl border border-brand/20 bg-brand/5 p-5"><ShieldCheck className="size-5 text-brand" /><p className="mt-3 text-sm font-semibold">{language === "en" ? "Editorial standard" : "Standard editorial"}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{language === "en" ? "Clear scope, verifiable statements and no guaranteed outcomes." : "Informații clare, afirmații verificabile și fără rezultate garantate artificial."}</p></div></aside></div>
      {related.length > 0 && <section className="mx-auto mt-16 max-w-5xl"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Avyron Insights</p><h2 className="mt-2 font-display text-3xl font-bold">{language === "en" ? "Related guides" : "Ghiduri conexe"}</h2></div><div className="mt-6 grid gap-5 md:grid-cols-3">{related.map((post) => <ArticleCard key={post.id} post={post} language={language} />)}</div></section>}
      <section className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand/20 via-brand-2/10 to-brand-3/20 p-8 text-center md:p-12"><BookOpen className="mx-auto size-7 text-brand" /><h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">{language === "en" ? "Turn useful information into a digital system" : "Transformă informația utilă într-un sistem digital"}</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{language === "en" ? "Avyron combines strategy, design, development, SEO and Cloudflare infrastructure." : "Avyron combină strategie, design, dezvoltare, SEO și infrastructură Cloudflare."}</p><Button asChild className="mt-7 rounded-full"><Link to={language === "en" ? "/en/pricing" : "/costurisiproduse"}>{language === "en" ? "Explore services" : "Vezi serviciile"}<ArrowRight className="ml-2 size-4" /></Link></Button></section>
    </article><Footer /></main>;
  }

  const normalized = query.trim().toLocaleLowerCase(language === "en" ? "en" : "ro");
  const filtered = posts.filter((post) => (category === "all" || post.category === category) && (!normalized || `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLocaleLowerCase(language === "en" ? "en" : "ro").includes(normalized)));
  const featured = filtered[0], rest = filtered.slice(1), categories = [...new Set(posts.map((post) => post.category))];
  return <main className="min-h-screen overflow-x-hidden bg-background"><Nav /><section className="relative border-b border-border/60 pb-14 pt-28 md:pb-16 md:pt-36"><div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--brand)/.18),transparent_35%),radial-gradient(circle_at_90%_20%,hsl(var(--brand-2)/.13),transparent_38%)]" /><div className="mx-auto max-w-7xl px-4"><PageBackLink to={language === "en" ? "/en" : "/"} label={language === "en" ? "Back" : "Înapoi"} title={language === "en" ? "Back to homepage" : "Înapoi la pagina principală"} /><div className="mt-7 max-w-5xl"><Badge variant="outline" className="rounded-full border-brand/30 bg-brand/5 text-brand"><BookOpen className="mr-2 size-3.5" />Avyron Insights</Badge><h1 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.03] tracking-tight sm:text-5xl md:text-6xl">{language === "en" ? "Better digital decisions, clearly explained." : "Decizii digitale mai bune, explicate clar."}</h1><p className="mt-5 max-w-4xl text-base leading-relaxed text-muted-foreground md:text-lg">{language === "en" ? "Applied analysis and practical guides on high-converting websites, SEO for Google and AI search, security, automation, and scalable digital products." : "Analize și ghiduri aplicate despre website-uri care convertesc, SEO pentru Google și căutări AI, securitate, automatizare și produse digitale scalabile."}</p></div><div data-testid="blog-filter-console" className="mt-8 max-w-5xl rounded-2xl border border-border/70 bg-card/70 p-2 shadow-soft"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem_auto]"><Label htmlFor="blog-search" className="sr-only">{language === "en" ? "Search articles" : "Caută în articole"}</Label><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="blog-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-xl border-0 bg-background/80 pl-10 text-[13px] shadow-none focus-visible:ring-1 sm:text-sm" placeholder={language === "en" ? "Search articles…" : "Caută în articole…"} /></div><div className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" /><Label htmlFor="blog-category-filter" className="sr-only">{language === "en" ? "Filter by category" : "Filtrează după categorie"}</Label><select id="blog-category-filter" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full appearance-none rounded-xl border-0 bg-background/80 pl-9 pr-8 text-sm text-foreground shadow-none outline-none ring-offset-background focus-visible:ring-1 focus-visible:ring-brand"><option value="all">{language === "en" ? "All topics" : "Toate subiectele"}</option>{categories.map((item) => <option key={item} value={item}>{categoryLabel(item, language)}</option>)}</select><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground" aria-hidden>▾</span></div><div className="flex h-11 items-center justify-center rounded-xl border border-border/60 bg-background/55 px-3 font-mono text-[11px] text-muted-foreground" aria-live="polite">{filtered.length} {language === "en" ? "articles" : "articole"}</div></div>{isStaff && <Button onClick={() => document.getElementById("editorial-workspace")?.scrollIntoView({ behavior: "smooth" })} variant="ghost" size="sm" className="mt-2 h-9 rounded-xl"><Edit3 className="mr-2 size-4" />{language === "en" ? "Editorial workspace" : "Spațiu editorial"}</Button>}</div></div></section>
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 md:py-20">{isStaff && <div id="editorial-workspace"><EditorialWorkspace language={language} isAdmin={isAdmin} onPublished={refresh} /></div>}{featured ? <section><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">{language === "en" ? "Recommended" : "Recomandat"}</p><h2 className="mb-6 mt-2 font-display text-3xl font-bold">{language === "en" ? "Start here" : "Începe de aici"}</h2><ArticleCard post={featured} language={language} featured /></section> : <section className="py-16 text-center"><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-display text-2xl font-bold">{language === "en" ? "No matching articles" : "Nu am găsit articole"}</h2><Button variant="outline" className="mt-5 rounded-full" onClick={() => { setQuery(""); setCategory("all"); }}>{language === "en" ? "Reset filters" : "Resetează filtrele"}</Button></section>}
      {rest.length > 0 && <section><div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">{language === "en" ? "Knowledge library" : "Bibliotecă de cunoștințe"}</p><h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">{language === "en" ? "Latest practical guides" : "Cele mai noi ghiduri practice"}</h2></div><div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{rest.map((post) => <ArticleCard key={post.id} post={post} language={language} />)}</div></section>}
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/60 p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><p className="flex items-center gap-2 text-sm font-semibold text-brand"><ShieldCheck className="size-4" />{language === "en" ? "Professional digital guidance" : "Consultanță digitală profesionistă"}</p><h2 className="mt-3 font-display text-3xl font-bold">{language === "en" ? "Need an answer for your project?" : "Ai nevoie de un răspuns pentru proiectul tău?"}</h2><p className="mt-3 max-w-3xl text-muted-foreground">{language === "en" ? "We recommend the appropriate first step: website, audit, application, maintenance or a smaller validation phase." : "Îți recomandăm primul pas potrivit: website, audit, aplicație, mentenanță sau o etapă mai mică de validare."}</p></div><Button asChild size="lg" className="rounded-full"><Link to={language === "en" ? "/en/pricing" : "/costurisiproduse"}>{language === "en" ? "Discuss a project" : "Discută un proiect"}<ExternalLink className="ml-2 size-4" /></Link></Button></section>
    </div><Footer /></main>;
};

export default Blog;
