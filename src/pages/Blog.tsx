import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";

import {
  Facebook, Instagram, Share2, Newspaper, Plus, ExternalLink,
  Calendar, Tag, Clock, Mail, Link2, Twitter, Linkedin, Check,
  MessageCircle, Send, Trash2, Heart, Eye, ChevronUp, ChevronDown
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
  // Only accept safe URL schemes for links
  const safeUrl = (u: string) => {
    const trimmed = u.trim();
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
    return "#";
  };
  // Escape HTML in user content before applying markdown patterns
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const inline = (s: string) => {
    const escaped = escapeHtml(s);
    const html = escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g, (_m, label, url) =>
        `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" class="text-brand underline-offset-2 hover:underline font-medium">${label}</a>`,
      )
      .replace(/(#\w+)/g, '<span class="text-brand/80 font-medium">$1</span>')
      .replace(/(@\w+)/g, '<span class="text-brand-2 font-medium">$1</span>');
    // Defense in depth: sanitize the final HTML
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["strong", "em", "a", "span", "br", "code"],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i,
    });
  };
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

const buildShareLinks = (post: NewsPost) => {
  const url = `${window.location.origin}/blog#${post.slug}`;
  const text = `${post.title} — via Avyron`;
  const e = encodeURIComponent;
  return {
    url, text,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
    messenger: `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${e(url)}&redirect_uri=${e(url)}`,
    whatsapp: `https://wa.me/?text=${e(text + " " + url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
    telegram: `https://t.me/share/url?url=${e(url)}&text=${e(text)}`,
    email: `mailto:?subject=${e(post.title)}&body=${e(text + "\n\n" + url)}`,
    instagram: `https://www.instagram.com/`, // IG doesn't support web share intent — opens IG, link is copied
    tiktok: `https://www.tiktok.com/`,
  };
};

const Blog = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [openFull, setOpenFull] = useState(false);
  const [fullPost, setFullPost] = useState<NewsPost | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});

  // create form
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("tech");
  const [submitting, setSubmitting] = useState(false);

  // comments for full post
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollTop = useRef(0);

  const active = posts[activeIdx];

  // Hide header on scroll-down, show on scroll-up (within feed)
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      const st = el.scrollTop;
      if (st <= 8) { setHeaderVisible(true); lastScrollTop.current = st; return; }
      const delta = st - lastScrollTop.current;
      if (Math.abs(delta) < 6) return;
      setHeaderVisible(delta < 0);
      lastScrollTop.current = st;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [posts.length]);

  // SEO
  useEffect(() => {
    const SITE = "https://avyron.ro";
    const isEn = window.location.pathname.startsWith("/en/");
    const baseTitle = isEn
      ? "Avyron Blog — Technology, Web Design, SEO & Security"
      : "Blog Avyron — Tehnologie, Web Design, SEO & Securitate";
    const baseDesc = isEn
      ? "Articles on IT, web design, SEO and online security from the Avyron team."
      : "Articole despre IT, web design, SEO și securitate online de la echipa Avyron.";
    // Only deep-linked articles (#slug) override the blog's own title/description,
    // so /blog and /en/blog keep a stable, indexable identity.
    const deepLinked =
      !!active && window.location.hash.replace("#", "") === active.slug;
    const t = deepLinked ? `${active!.title} · Avyron Insights` : baseTitle;
    const d = (deepLinked && active?.excerpt) || baseDesc;

    const basePath = isEn ? "/en/blog" : "/blog";
    // Canonical stays on the list URL — hash fragments are not separate pages.
    const url = `${SITE}${basePath}`;
    const image = active?.cover_image_url || `${SITE}/og/home.jpg`;
    document.title = t;
    const set = (sel: string, attr: string, val: string, mk?: () => HTMLElement) => {
      let el = document.querySelector(sel) as HTMLElement | null;
      if (!el && mk) { el = mk(); document.head.appendChild(el); }
      if (el) el.setAttribute(attr, val);
    };
    set('meta[name="description"]', "content", d, () => { const m = document.createElement("meta"); m.setAttribute("name", "description"); return m; });
    set('link[rel="canonical"]', "href", url, () => { const l = document.createElement("link"); l.setAttribute("rel", "canonical"); return l; });
    // hreflang alternates
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    const alts: Array<[string, string]> = [
      ["ro", `${SITE}/blog`],
      ["en", `${SITE}/en/blog`],
      ["x-default", `${SITE}/blog`],
    ];
    alts.forEach(([code, href]) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", code);
      link.setAttribute("href", href);
      document.head.appendChild(link);
    });
    [["og:title", t], ["og:description", d], ["og:type", active ? "article" : "website"], ["og:url", url], ["og:image", image], ["og:site_name", "Avyron"], ["og:locale", isEn ? "en_US" : "ro_RO"],
     ["twitter:card", "summary_large_image"], ["twitter:title", t], ["twitter:description", d], ["twitter:image", image]
    ].forEach(([k, v]) => {
      const sel = k.startsWith("twitter") ? `meta[name="${k}"]` : `meta[property="${k}"]`;
      set(sel, "content", v as string, () => { const m = document.createElement("meta"); k.startsWith("twitter") ? m.setAttribute("name", k) : m.setAttribute("property", k); return m; });
    });
    const ex = document.getElementById("news-jsonld"); if (ex) ex.remove();
    if (active) {
      const ld = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        headline: active.title, description: active.excerpt,
        image: active.cover_image_url ? [active.cover_image_url] : undefined,
        datePublished: active.published_at, dateModified: active.published_at,
        inLanguage: isEn ? "en" : "ro-RO",
        author: { "@type": "Organization", name: "Avyron", url: SITE },
        publisher: { "@type": "Organization", "@id": `${SITE}/#organization`, name: "Avyron", logo: { "@type": "ImageObject", url: `${SITE}/avyron-logo.jpg` } },
        mainEntityOfPage: `${url}#${active.slug}`, keywords: active.tags?.join(", ")
      };
      const s = document.createElement("script"); s.type = "application/ld+json"; s.id = "news-jsonld"; s.text = JSON.stringify(ld); document.head.appendChild(s);
    }
  }, [active]);


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
    try { setLikes(JSON.parse(localStorage.getItem("avyron_news_likes") || "{}")); } catch {}
  }, []);

  // initial hash → idx
  useEffect(() => {
    if (!posts.length) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const i = posts.findIndex((p) => p.slug === hash);
      if (i >= 0) {
        setActiveIdx(i);
        setTimeout(() => slideRefs.current[i]?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" }), 50);
      }
    }
  }, [posts]);

  // sync hash with active
  useEffect(() => {
    if (active) window.history.replaceState(null, "", `/blog#${active.slug}`);
  }, [active]);

  // staff role
  useEffect(() => {
    const check = async () => {
      if (!user) return setIsStaff(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsStaff(!!data?.some((r: any) => r.role === "staff" || r.role === "admin"));
    };
    check();
  }, [user]);

  // observer-based active index
  useEffect(() => {
    if (!posts.length || !feedRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx)) setActiveIdx(idx);
        }
      },
      { root: feedRef.current, threshold: [0.55, 0.75] }
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [posts]);

  // load comments for fullPost
  useEffect(() => {
    if (!fullPost) return;
    const load = async () => {
      // Public read uses the security-invoker view that omits author_id (anon-safe).
      // Authenticated users can still read the full table for moderation actions.
      const source = user ? "news_comments" : "news_comments_public";
      const { data } = await (supabase as any)
        .from(source).select("*").eq("post_id", fullPost.id)
        .order("created_at", { ascending: false });
      setComments((data || []) as Comment[]);
    };
    load();
    if (!user) return; // Realtime requires authenticated reads on news_comments
    const ch = supabase
      .channel(`comments-${fullPost.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "news_comments", filter: `post_id=eq.${fullPost.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fullPost?.id, user?.id]);

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
    setActiveIdx(0);
    setOpenCreate(false);
    setTitle(""); setExcerpt(""); setContent(""); setCover(""); setTagsInput(""); setCategory("tech");
  };

  const postComment = async () => {
    if (!user) { toast.error("Conectează-te ca să comentezi"); return; }
    if (!fullPost || !commentText.trim()) return;
    setPostingComment(true);
    const name = user.display_name || user.email?.split("@")[0] || "User";
    const { error } = await supabase.from("news_comments").insert({
      post_id: fullPost.id, author_id: user.id, author_name: name, content: commentText.trim(),
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

  const toggleLike = (id: string) => {
    setLikes((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("avyron_news_likes", JSON.stringify(next));
      return next;
    });
  };

  const copyAndOpen = async (post: NewsPost, target: "instagram" | "tiktok") => {
    const links = buildShareLinks(post);
    try { await navigator.clipboard.writeText(`${post.title}\n${links.url}`); }
    catch {}
    toast.success(`Link copiat — lipește-l în ${target === "instagram" ? "Instagram" : "TikTok"} (story, postare, mesaj)`);
    window.open(links[target], "_blank", "noopener,noreferrer");
  };

  const nativeShare = async (post: NewsPost) => {
    const links = buildShareLinks(post);
    const data = { title: post.title, text: post.excerpt || post.title, url: links.url };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share(data); return; }
      catch (e: any) { if (e?.name === "AbortError") return; }
    }
    // Fallback: open the in-dialog share panel
    setFullPost(post); setOpenFull(true);
  };

  const shareTo = async (post: NewsPost, target: "facebook" | "instagram" | "tiktok") => {
    const links = buildShareLinks(post);
    if (target === "facebook") {
      window.open(links.facebook, "_blank", "noopener,noreferrer,width=600,height=600");
      return;
    }
    await copyAndOpen(post, target);
  };

  const scrollToIdx = (i: number) => {
    const target = Math.max(0, Math.min(posts.length - 1, i));
    slideRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Tech / digital fixed background */}
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 12% 8%, hsl(265 90% 62% / 0.22), transparent 60%), radial-gradient(800px 500px at 88% 18%, hsl(200 95% 55% / 0.20), transparent 60%), radial-gradient(700px 500px at 50% 95%, hsl(330 85% 65% / 0.18), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.10] dark:opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--brand) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--brand) / 0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 2px, hsl(var(--foreground) / 0.6) 2px 3px)",
          }}
        />
      </div>

      <Nav />

      {/* Compact strip — hides on scroll-down, returns on scroll-up */}
      <section
        className={`fixed left-0 right-0 top-16 md:top-20 z-20 transition-all duration-300 ease-out overflow-hidden bg-background/70 backdrop-blur-md ${
          headerVisible ? "max-h-48 opacity-100 pt-3 pb-3 pointer-events-auto" : "max-h-0 opacity-0 pt-0 pb-0 pointer-events-none"
        }`}
      >
        <div className="relative mx-auto max-w-5xl px-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wider border border-brand/20">
                <Newspaper className="size-3" /> Avyron Insights
              </div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                <span className="bg-gradient-to-r from-foreground via-brand to-brand-2 bg-clip-text text-transparent">Blog</span>
              </h1>
            </div>
            {isStaff && (
              <Button onClick={() => setOpenCreate(true)} size="sm" className="rounded-full">
                <Plus className="size-3.5 mr-1" /> Postare
              </Button>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Pulsul digital al echipei <span className="font-semibold text-foreground">Avyron</span> — articole zilnice despre
            <span className="text-brand font-medium"> tehnologie</span>,
            <span className="text-brand-2 font-medium"> web design</span>,
            <span className="text-foreground font-medium"> SEO</span> și
            <span className="text-brand-3 font-medium"> securitate online</span>.
            Studii de caz, ghiduri rapide și inspirație pentru identitatea ta online.
          </p>
        </div>
      </section>

      {/* Vertical scroll feed (Instagram/TikTok-style) */}
      <section className="relative pt-16 md:pt-20">
        {loading ? (
          <div className="mx-auto max-w-md md:max-w-lg px-3 py-10">
            <div className="aspect-[9/16] rounded-3xl bg-muted/40 animate-pulse" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Nu există articole.</p>
        ) : (
          <div
            ref={feedRef}
            className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] overflow-y-auto snap-y snap-mandatory scrollbar-thin px-3 pb-6"
            style={{ scrollPaddingTop: "0.5rem" }}
          >
            {posts.map((post, idx) => {
              const links = buildShareLinks(post);
              const liked = !!likes[post.id];
              return (
                <article
                  key={post.id}
                  data-idx={idx}
                  ref={(el) => { slideRefs.current[idx] = el; }}
                  className="snap-start min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] flex items-center justify-center py-2"
                >
                  <div className="relative w-full max-w-md md:max-w-lg mx-auto h-[min(80vh,720px)] rounded-3xl overflow-hidden bg-card border border-border/60 shadow-elev">
                    {/* Background image */}
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading={idx <= 1 ? "eager" : "lazy"}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-brand-2/20 to-brand-3/30" />
                    )}
                    {/* gradient overlays for legibility */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none" />

                    {/* TOP — author */}
                    <div className="absolute top-0 inset-x-0 p-3.5 flex items-center gap-2.5 text-white z-10">
                      <Avatar className="size-9 ring-2 ring-white/40">
                        <AvatarFallback className="bg-brand text-white font-bold text-xs">AV</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-tight">Avyron</div>
                        <div className="text-[11px] text-white/80 flex items-center gap-1.5">
                          <span>{timeAgo(post.published_at ?? post.created_at)}</span>
                          <span>·</span>
                          <span className="uppercase tracking-wider">{post.category}</span>
                          <span>·</span>
                          <Clock className="size-2.5" />
                          <span>{readingTime(post.content)} min</span>
                        </div>
                      </div>
                    </div>

                    {/* CENTER — Vezi mai mult */}
                    <button
                      onClick={() => { setFullPost(post); setOpenFull(true); }}
                      className="absolute inset-0 m-auto h-12 w-40 rounded-full bg-white/15 backdrop-blur-md text-white font-semibold text-sm border border-white/30 shadow-glow hover:bg-white/25 transition-all flex items-center justify-center gap-1.5 z-10"
                      aria-label="Vezi mai mult"
                    >
                      <Eye className="size-4" /> Vezi mai mult
                    </button>

                    {/* RIGHT side — vertical action stack */}
                    <div className="absolute right-2 bottom-32 md:bottom-36 flex flex-col items-center gap-2.5 z-10">
                      {(user || isStaff) && (
                        <ActionBtn label={liked ? "Apreciat" : "Apreciază"} onClick={() => toggleLike(post.id)}>
                          <Heart className={`size-5 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
                        </ActionBtn>
                      )}
                      <ActionBtn label="Instagram" onClick={() => shareTo(post, "instagram")}>
                        <Instagram className="size-5 text-white" />
                      </ActionBtn>
                      <ActionBtn label="Facebook" onClick={() => shareTo(post, "facebook")}>
                        <Facebook className="size-5 text-white" />
                      </ActionBtn>
                      <ActionBtn label="TikTok" onClick={() => shareTo(post, "tiktok")}>
                        <TikTokIcon className="size-5 text-white" />
                      </ActionBtn>
                      <ActionBtn label="Distribuie" onClick={() => nativeShare(post)}>
                        <Share2 className="size-5 text-white" />
                      </ActionBtn>
                    </div>

                    {/* BOTTOM — title + larger description */}
                    <div className="absolute inset-x-0 bottom-0 p-4 pr-16 text-white z-10">
                      <h2 className="font-display text-lg md:text-2xl font-bold leading-tight mb-2 drop-shadow">{post.title}</h2>
                      {post.excerpt && (
                        <p className="text-sm md:text-base text-white/90 leading-relaxed line-clamp-4 mb-2 drop-shadow">{post.excerpt}</p>
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.slice(0, 5).map((tg) => (
                            <span key={tg} className="text-[11px] font-medium text-white/95">#{tg}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Vertical nav arrows (desktop) */}
        {posts.length > 1 && (
          <div className="hidden md:flex flex-col gap-2 fixed right-4 top-1/2 -translate-y-1/2 z-30">
            <button onClick={() => scrollToIdx(activeIdx - 1)} disabled={activeIdx === 0}
              className="size-10 rounded-full bg-card border border-border/60 shadow-soft grid place-items-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronUp className="size-4" />
            </button>
            <div className="text-center text-[10px] font-bold text-muted-foreground">{activeIdx + 1}/{posts.length}</div>
            <button onClick={() => scrollToIdx(activeIdx + 1)} disabled={activeIdx === posts.length - 1}
              className="size-10 rounded-full bg-card border border-border/60 shadow-soft grid place-items-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronDown className="size-4" />
            </button>
          </div>
        )}
      </section>

      {/* FULL POST DIALOG */}
      <Dialog open={openFull} onOpenChange={(o) => { setOpenFull(o); if (!o) setFullPost(null); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {fullPost && (
            <>
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="text-xl md:text-2xl font-display leading-tight pr-6">{fullPost.title}</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6">
                {fullPost.cover_image_url && (
                  <img src={fullPost.cover_image_url} alt={fullPost.title} className="w-full rounded-xl my-3 aspect-[16/9] object-cover" />
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold uppercase tracking-wide">
                    <Tag className="size-3" /> {fullPost.category}
                  </span>
                  <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{new Date(fullPost.published_at ?? fullPost.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" />{readingTime(fullPost.content)} min</span>
                </div>

                {fullPost.excerpt && (
                  <p className="text-base text-foreground/75 leading-relaxed mb-4 italic border-l-4 border-brand/40 pl-3">{fullPost.excerpt}</p>
                )}

                <div className="prose prose-sm max-w-none">{renderMarkdown(fullPost.content)}</div>

                {fullPost.tags && fullPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-border/60">
                    {fullPost.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>)}
                  </div>
                )}

                {/* Full share */}
                <FullShare post={fullPost} onCopyOpen={copyAndOpen} />

                {/* Comments */}
                <div className="mt-6 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="size-4 text-brand" />
                    <h3 className="text-sm font-semibold">Comentarii & întrebări ({comments.length})</h3>
                  </div>

                  {user ? (
                    <div className="flex gap-2 mb-4">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-brand/10 text-brand">
                          {initials(user.display_name || user.email)}
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
                      <Link to="/auth" className="text-brand font-semibold hover:underline">Conectează-te</Link> ca să lași un comentariu.
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
              <Textarea placeholder="Rezumat scurt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
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

const ActionBtn = ({
  children, label, onClick, href,
}: { children: React.ReactNode; label: string; onClick?: () => void; href?: string }) => {
  const cls = "size-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 grid place-items-center hover:bg-black/60 hover:scale-105 active:scale-95 transition-all";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  );
};

const FullShare = ({ post, onCopyOpen }: { post: NewsPost; onCopyOpen: (p: NewsPost, t: "instagram" | "tiktok") => void }) => {
  const [copied, setCopied] = useState(false);
  const links = useMemo(() => buildShareLinks(post), [post]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(links.url); setCopied(true); toast.success("Link copiat"); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Nu am putut copia"); }
  };
  return (
    <div className="mt-5 pt-4 border-t border-border/60">
      <div className="flex items-center gap-2 mb-2.5"><Share2 className="size-4 text-brand" /><span className="text-sm font-semibold">Distribuie</span></div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ShareBtn href={links.facebook} label="Facebook" color="hover:bg-[#1877F2] hover:text-white"><Facebook className="size-4" /></ShareBtn>
        <ShareBtn href={links.messenger} label="Messenger" color="hover:bg-[#0084FF] hover:text-white"><MessengerIcon className="size-4" /></ShareBtn>
        <ShareBtn href={links.whatsapp} label="WhatsApp" color="hover:bg-[#25D366] hover:text-white"><WhatsAppIcon className="size-4" /></ShareBtn>
        <ShareBtn href={links.twitter} label="X" color="hover:bg-foreground hover:text-background"><Twitter className="size-4" /></ShareBtn>
        <ShareBtn href={links.linkedin} label="LinkedIn" color="hover:bg-[#0A66C2] hover:text-white"><Linkedin className="size-4" /></ShareBtn>
        <ShareBtn href={links.telegram} label="Telegram" color="hover:bg-[#229ED9] hover:text-white"><TelegramIcon className="size-4" /></ShareBtn>
        <button onClick={() => onCopyOpen(post, "instagram")} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium transition-colors hover:bg-gradient-to-tr hover:from-[#feda75] hover:via-[#d62976] hover:to-[#4f5bd5] hover:text-white">
          <Instagram className="size-4" /><span className="hidden sm:inline">Instagram</span>
        </button>
        <button onClick={() => onCopyOpen(post, "tiktok")} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium transition-colors hover:bg-foreground hover:text-background">
          <TikTokIcon className="size-4" /><span className="hidden sm:inline">TikTok</span>
        </button>
        <ShareBtn href={links.email} label="Email" color="hover:bg-brand hover:text-brand-foreground" external={false}><Mail className="size-4" /></ShareBtn>
        <button onClick={copy} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium hover:bg-brand hover:text-brand-foreground">
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
  );
};

const ShareBtn = ({ href, label, color, children, external = true }: { href: string; label: string; color: string; children: React.ReactNode; external?: boolean }) => (
  <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={label} title={label}
    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium transition-colors ${color}`}>
    {children}<span className="hidden sm:inline">{label}</span>
  </a>
);

export default Blog;
