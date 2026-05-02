import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook, Instagram, Share2, Newspaper, Plus, ExternalLink,
  Calendar, Tag, Clock, Mail, Link2, Twitter, Linkedin, Check,
  MessageSquare, Send, Trash2, ChevronRight
} from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[] | null;
  category: string;
  published_at: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

const TikTokIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.95a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
  </svg>
);
const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26L4.205 21.16l3.443-.967z"/>
  </svg>
);
const MessengerIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 0C5.37 0 0 4.97 0 11.1c0 3.49 1.74 6.6 4.46 8.64V24l4.08-2.24c1.09.3 2.24.46 3.46.46 6.63 0 12-4.97 12-11.1S18.63 0 12 0zm1.19 14.94l-3.05-3.25-5.95 3.25 6.55-6.95 3.13 3.25 5.87-3.25-6.55 6.95z"/>
  </svg>
);
const TelegramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
);

const readingTime = (text: string) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));
const initials = (name?: string | null) => (name || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "acum";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} z`;
  return new Date(iso).toLocaleDateString("ro-RO");
};

const renderMarkdown = (md: string) => {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let ul: string[] = [], ol: string[] = [];
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand underline-offset-2 hover:underline font-medium">$1</a>')
      .replace(/(#\w+)/g, '<span class="text-brand/80 font-medium">$1</span>')
      .replace(/(@\w+)/g, '<span class="text-brand-2 font-medium">$1</span>');
  const flushUl = () => { if (ul.length) { out.push(<ul key={`u${out.length}`} className="list-disc pl-6 space-y-1.5 my-3">{ul.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}</ul>); ul = []; } };
  const flushOl = () => { if (ol.length) { out.push(<ol key={`o${out.length}`} className="list-decimal pl-6 space-y-1.5 my-3">{ol.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}</ol>); ol = []; } };
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, "");
    if (/^##\s+/.test(line)) { flushUl(); flushOl(); out.push(<h2 key={i} className="font-display text-xl md:text-2xl font-bold mt-6 mb-2 tracking-tight">{line.replace(/^##\s+/, "")}</h2>); }
    else if (/^###\s+/.test(line)) { flushUl(); flushOl(); out.push(<h3 key={i} className="font-display text-base md:text-lg font-semibold mt-4 mb-1.5">{line.replace(/^###\s+/, "")}</h3>); }
    else if (/^\d+\.\s+/.test(line)) { flushUl(); ol.push(line.replace(/^\d+\.\s+/, "")); }
    else if (/^-\s+/.test(line)) { flushOl(); ul.push(line.replace(/^-\s+/, "")); }
    else if (line.trim() === "") { flushUl(); flushOl(); }
    else { flushUl(); flushOl(); out.push(<p key={i} className="text-foreground/85 leading-relaxed my-2.5" dangerouslySetInnerHTML={{ __html: inline(line) }} />); }
  });
  flushUl(); flushOl();
  return out;
};

const News = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openFull, setOpenFull] = useState(false);

  // create post form
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("tech");
  const [submitting, setSubmitting] = useState(false);

  // comments state per active post
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [copied, setCopied] = useState(false);

  const featured = posts.find((p) => p.id === activeId) || posts[0];
  const others = posts.filter((p) => p.id !== featured?.id).slice(0, 4);

  // SEO meta
  useEffect(() => {
    const baseTitle = "Noutăți Avyron — Tehnologie, Web Design, SEO & Securitate";
    const baseDesc = "Articole zilnice despre IT, web design, SEO și securitate online de la echipa Avyron.";
    const t = featured ? `${featured.title} · Avyron Insights` : baseTitle;
    const d = featured?.excerpt || baseDesc;
    const url = `${window.location.origin}/noutati${featured ? `#${featured.slug}` : ""}`;
    const image = featured?.cover_image_url || `${window.location.origin}/og-default.jpg`;
    document.title = t;
    const set = (sel: string, attr: string, val: string, mk?: () => HTMLElement) => {
      let el = document.querySelector(sel) as HTMLElement | null;
      if (!el && mk) { el = mk(); document.head.appendChild(el); }
      if (el) el.setAttribute(attr, val);
    };
    set('meta[name="description"]', "content", d, () => { const m = document.createElement("meta"); m.setAttribute("name", "description"); return m; });
    set('link[rel="canonical"]', "href", url, () => { const l = document.createElement("link"); l.setAttribute("rel", "canonical"); return l; });
    [["og:title", t], ["og:description", d], ["og:type", featured ? "article" : "website"], ["og:url", url], ["og:image", image], ["og:site_name", "Avyron"],
     ["twitter:card", "summary_large_image"], ["twitter:title", t], ["twitter:description", d], ["twitter:image", image]
    ].forEach(([k, v]) => {
      const sel = k.startsWith("twitter") ? `meta[name="${k}"]` : `meta[property="${k}"]`;
      set(sel, "content", v as string, () => { const m = document.createElement("meta"); k.startsWith("twitter") ? m.setAttribute("name", k) : m.setAttribute("property", k); return m; });
    });
    const ex = document.getElementById("news-jsonld"); if (ex) ex.remove();
    if (featured) {
      const ld = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        headline: featured.title, description: featured.excerpt,
        image: featured.cover_image_url ? [featured.cover_image_url] : undefined,
        datePublished: featured.published_at, dateModified: featured.published_at,
        author: { "@type": "Organization", name: "Avyron", url: "https://www.avyron.ro" },
        publisher: { "@type": "Organization", name: "Avyron", logo: { "@type": "ImageObject", url: `${window.location.origin}/avyron-logo.jpg` } },
        mainEntityOfPage: url, keywords: featured.tags?.join(", ")
      };
      const s = document.createElement("script"); s.type = "application/ld+json"; s.id = "news-jsonld"; s.text = JSON.stringify(ld); document.head.appendChild(s);
    }
  }, [featured]);

  // load posts
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("news_posts").select("*").eq("published", true)
        .order("published_at", { ascending: false });
      if (error) toast.error("Nu am putut încărca articolele");
      else setPosts((data || []) as NewsPost[]);
      setLoading(false);
    };
    load();
  }, []);

  // sync URL hash
  useEffect(() => {
    if (!posts.length) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) { const i = posts.findIndex((p) => p.slug === hash); if (i >= 0) setActiveId(posts[i].id); }
  }, [posts]);

  useEffect(() => {
    if (featured) window.history.replaceState(null, "", `/noutati#${featured.slug}`);
  }, [featured]);

  // staff role
  useEffect(() => {
    const check = async () => {
      if (!user) return setIsStaff(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsStaff(!!data?.some((r: any) => r.role === "staff" || r.role === "admin"));
    };
    check();
  }, [user]);

  // load comments for featured post
  useEffect(() => {
    if (!featured) return;
    const load = async () => {
      const { data } = await supabase
        .from("news_comments").select("*").eq("post_id", featured.id)
        .order("created_at", { ascending: false });
      setComments((data || []) as Comment[]);
    };
    load();
    // realtime updates
    const ch = supabase
      .channel(`comments-${featured.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "news_comments", filter: `post_id=eq.${featured.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [featured?.id]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const submit = async () => {
    if (!user || !title.trim() || !content.trim()) { toast.error("Completează titlul și conținutul"); return; }
    setSubmitting(true);
    const slug = slugify(title) + "-" + Date.now().toString(36);
    const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from("news_posts").insert({
      author_id: user.id, title: title.trim(), slug,
      excerpt: excerpt.trim() || null, content: content.trim(),
      cover_image_url: cover.trim() || null, tags, category,
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Articol publicat");
    setPosts((p) => [data as NewsPost, ...p]);
    setActiveId((data as NewsPost).id);
    setOpenCreate(false);
    setTitle(""); setExcerpt(""); setContent(""); setCover(""); setTagsInput(""); setCategory("tech");
  };

  const postComment = async () => {
    if (!user) { toast.error("Conectează-te ca să comentezi"); return; }
    if (!featured || !commentText.trim()) return;
    setPostingComment(true);
    const name = (user.user_metadata as any)?.display_name || (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "User";
    const { error } = await supabase.from("news_comments").insert({
      post_id: featured.id, author_id: user.id, author_name: name, content: commentText.trim(),
    });
    setPostingComment(false);
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    toast.success("Comentariu publicat");
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("news_comments").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Șters");
  };

  const shareLinks = useMemo(() => {
    if (!featured) return null;
    const url = `${window.location.origin}/noutati#${featured.slug}`;
    const text = `${featured.title} — via Avyron`;
    const e = encodeURIComponent;
    return {
      url, text,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      messenger: `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${e(url)}&redirect_uri=${e(url)}`,
      whatsapp: `https://wa.me/?text=${e(text + " " + url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
      telegram: `https://t.me/share/url?url=${e(url)}&text=${e(text)}`,
      email: `mailto:?subject=${e(featured.title)}&body=${e(text + "\n\n" + url)}`,
    };
  }, [featured]);

  const copyLink = async () => {
    if (!shareLinks) return;
    try { await navigator.clipboard.writeText(shareLinks.url); setCopied(true); toast.success("Link copiat"); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Nu am putut copia"); }
  };

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* Compact hero strip */}
      <section className="relative pt-24 md:pt-28 pb-3 md:pb-4 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(265 90% 62% / 0.4), transparent 50%), radial-gradient(circle at 80% 60%, hsl(200 95% 55% / 0.4), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wider mb-1">
              <Newspaper className="size-3" /> Avyron Insights
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <span className="bg-gradient-to-r from-foreground via-brand to-brand-2 bg-clip-text text-transparent">Noutăți</span>
            </h1>
          </div>
          {isStaff && (
            <Button onClick={() => setOpenCreate(true)} size="sm" className="rounded-full">
              <Plus className="size-3.5 mr-1" /> Postare nouă
            </Button>
          )}
        </div>
      </section>

      {/* Featured post + side strip — fits in one screen */}
      <section className="relative pb-10">
        <div className="mx-auto max-w-5xl px-4">
          {loading ? (
            <div className="h-[500px] rounded-2xl bg-muted/40 animate-pulse" />
          ) : !featured ? (
            <p className="text-center text-muted-foreground py-10">Nu există articole.</p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.article
                key={featured.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="bg-card rounded-2xl shadow-soft border border-border/60 overflow-hidden"
              >
                {/* Header (Facebook-style) */}
                <div className="flex items-center gap-3 p-3.5 pb-2">
                  <Avatar className="size-9 bg-brand/10">
                    <AvatarFallback className="bg-brand/10 text-brand font-bold text-xs">AV</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight">Avyron</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>{timeAgo(featured.published_at ?? featured.created_at)}</span>
                      <span>·</span>
                      <span className="uppercase tracking-wider font-medium">{featured.category}</span>
                      <span>·</span>
                      <Clock className="size-2.5" />
                      <span>{readingTime(featured.content)} min</span>
                    </div>
                  </div>
                </div>

                {/* Title + excerpt */}
                <div className="px-3.5 pb-2.5">
                  <h2 className="font-display text-lg md:text-xl font-bold leading-snug mb-1.5">{featured.title}</h2>
                  {featured.excerpt && (
                    <p className="text-sm text-foreground/75 leading-relaxed line-clamp-2">{featured.excerpt}</p>
                  )}
                  {featured.tags && featured.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {featured.tags.slice(0, 5).map((t) => (
                        <span key={t} className="text-[10px] text-brand/80 font-medium">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cover */}
                {featured.cover_image_url && (
                  <button
                    onClick={() => setOpenFull(true)}
                    className="block w-full aspect-[16/9] bg-muted overflow-hidden cursor-pointer group"
                    aria-label="Vezi mai mult"
                  >
                    <img
                      src={featured.cover_image_url}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      width={1920} height={1080}
                      loading="eager"
                    />
                  </button>
                )}

                {/* Action bar */}
                <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span>{comments.length} {comments.length === 1 ? "comentariu" : "comentarii"}</span>
                  <button
                    onClick={() => setOpenFull(true)}
                    className="inline-flex items-center gap-1 text-brand font-semibold hover:underline"
                  >
                    Vezi mai mult <ChevronRight className="size-3" />
                  </button>
                </div>

                {/* Quick share */}
                <div className="grid grid-cols-4 gap-1 px-2 py-1.5 border-t border-border/60 text-xs">
                  <a href={shareLinks?.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-muted font-medium text-muted-foreground hover:text-[#1877F2]">
                    <Facebook className="size-4" /><span className="hidden sm:inline">Share</span>
                  </a>
                  <a href={shareLinks?.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-muted font-medium text-muted-foreground hover:text-[#25D366]">
                    <WhatsAppIcon className="size-4" /><span className="hidden sm:inline">WhatsApp</span>
                  </a>
                  <button onClick={() => setOpenFull(true)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-muted font-medium text-muted-foreground hover:text-brand">
                    <MessageSquare className="size-4" /><span className="hidden sm:inline">Comentează</span>
                  </button>
                  <button onClick={copyLink} className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-muted font-medium text-muted-foreground hover:text-brand">
                    {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
                    <span className="hidden sm:inline">{copied ? "Copiat" : "Copiază"}</span>
                  </button>
                </div>
              </motion.article>
            </AnimatePresence>
          )}

          {/* Bottom strip — last 3-4 other posts */}
          {others.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2 px-1">Alte postări</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {others.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveId(p.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-left bg-card rounded-xl border border-border/60 overflow-hidden hover:border-brand/40 hover:shadow-soft transition-all group"
                  >
                    {p.cover_image_url && (
                      <div className="aspect-[16/10] bg-muted overflow-hidden">
                        <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    )}
                    <div className="p-2">
                      <div className="text-[9px] uppercase tracking-wider font-bold text-brand/80 mb-0.5">{p.category}</div>
                      <div className="text-[11px] md:text-xs font-semibold leading-tight line-clamp-2">{p.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(p.published_at ?? p.created_at)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FULL POST DIALOG */}
      <Dialog open={openFull} onOpenChange={setOpenFull}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {featured && (
            <>
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="text-xl md:text-2xl font-display leading-tight pr-6">{featured.title}</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6">
                {featured.cover_image_url && (
                  <img src={featured.cover_image_url} alt={featured.title} className="w-full rounded-xl my-3 aspect-[16/9] object-cover" />
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold uppercase tracking-wide">
                    <Tag className="size-3" /> {featured.category}
                  </span>
                  <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{new Date(featured.published_at ?? featured.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" />{readingTime(featured.content)} min</span>
                </div>

                {featured.excerpt && (
                  <p className="text-base text-foreground/75 leading-relaxed mb-4 italic border-l-4 border-brand/40 pl-3">{featured.excerpt}</p>
                )}

                <div className="prose prose-sm max-w-none">{renderMarkdown(featured.content)}</div>

                {featured.tags && featured.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-border/60">
                    {featured.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>)}
                  </div>
                )}

                {/* Full share */}
                {shareLinks && (
                  <div className="mt-5 pt-4 border-t border-border/60">
                    <div className="flex items-center gap-2 mb-2.5"><Share2 className="size-4 text-brand" /><span className="text-sm font-semibold">Distribuie</span></div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ShareBtn href={shareLinks.facebook} label="Facebook" color="hover:bg-[#1877F2] hover:text-white"><Facebook className="size-4" /></ShareBtn>
                      <ShareBtn href={shareLinks.messenger} label="Messenger" color="hover:bg-[#0084FF] hover:text-white"><MessengerIcon className="size-4" /></ShareBtn>
                      <ShareBtn href={shareLinks.whatsapp} label="WhatsApp" color="hover:bg-[#25D366] hover:text-white"><WhatsAppIcon className="size-4" /></ShareBtn>
                      <ShareBtn href={shareLinks.twitter} label="X" color="hover:bg-foreground hover:text-background"><Twitter className="size-4" /></ShareBtn>
                      <ShareBtn href={shareLinks.linkedin} label="LinkedIn" color="hover:bg-[#0A66C2] hover:text-white"><Linkedin className="size-4" /></ShareBtn>
                      <ShareBtn href={shareLinks.telegram} label="Telegram" color="hover:bg-[#229ED9] hover:text-white"><TelegramIcon className="size-4" /></ShareBtn>
                      <ShareBtn href={shareLinks.email} label="Email" color="hover:bg-brand hover:text-brand-foreground" external={false}><Mail className="size-4" /></ShareBtn>
                      <button onClick={copyLink} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium hover:bg-brand hover:text-brand-foreground">
                        {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}<span className="hidden sm:inline">{copied ? "Copiat" : "Copiază"}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>Urmărește:</span>
                      <a href="https://instagram.com/avyron" target="_blank" rel="noopener noreferrer" className="hover:text-brand"><Instagram className="size-4" /></a>
                      <a href="https://facebook.com/avyron" target="_blank" rel="noopener noreferrer" className="hover:text-brand"><Facebook className="size-4" /></a>
                      <a href="https://tiktok.com/@avyron" target="_blank" rel="noopener noreferrer" className="hover:text-brand"><TikTokIcon className="size-4" /></a>
                      <Link to="/" className="ml-auto inline-flex items-center gap-1 text-brand hover:underline font-medium">avyron.ro <ExternalLink className="size-3" /></Link>
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div className="mt-6 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="size-4 text-brand" />
                    <h3 className="text-sm font-semibold">Comentarii & întrebări ({comments.length})</h3>
                  </div>

                  {user ? (
                    <div className="flex gap-2 mb-4">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-brand/10 text-brand">
                          {initials((user.user_metadata as any)?.display_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder="Scrie o întrebare sau un comentariu..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                          maxLength={2000}
                          className="rounded-full bg-muted/50 border-transparent text-sm"
                        />
                        <Button onClick={postComment} disabled={postingComment || !commentText.trim()} size="icon" className="rounded-full shrink-0">
                          <Send className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground mb-4 text-center">
                      <Link to="/auth" className="text-brand font-semibold hover:underline">Conectează-te</Link> ca să lași un comentariu sau o întrebare.
                    </div>
                  )}

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Fii primul care comentează.</p>
                    ) : comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="text-[10px] font-bold bg-muted">{initials(c.author_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/50 rounded-2xl px-3 py-2">
                            <div className="text-xs font-semibold mb-0.5 flex items-center justify-between gap-2">
                              <span>{c.author_name || "Anonim"}</span>
                              {user?.id === c.author_id && (
                                <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Șterge">
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">{c.content}</p>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 ml-3">{timeAgo(c.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create post dialog */}
      {isStaff && (
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Postare nouă</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Titlu" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="URL imagine cover (opțional)" value={cover} onChange={(e) => setCover(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="tech">Tehnologie</option>
                  <option value="web-design">Web Design</option>
                  <option value="seo">SEO</option>
                  <option value="securitate">Securitate</option>
                  <option value="avyron">Avyron</option>
                  <option value="promotie">Promoție</option>
                </select>
                <Input placeholder="Tag-uri (separate prin virgulă)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
              </div>
              <Textarea placeholder="Rezumat scurt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              <Textarea placeholder="Conținut (markdown: ##, ###, **bold**, [link](url), liste -)" rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
              <Button onClick={submit} disabled={submitting} className="w-full">{submitting ? "Se publică..." : "Publică articolul"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </main>
  );
};

const ShareBtn = ({ href, label, color, children, external = true }: { href: string; label: string; color: string; children: React.ReactNode; external?: boolean }) => (
  <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={label} title={label}
    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium transition-colors ${color}`}>
    {children}<span className="hidden sm:inline">{label}</span>
  </a>
);

export default News;
