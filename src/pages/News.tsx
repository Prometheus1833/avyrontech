import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook, Instagram, Share2, Newspaper, Plus, ExternalLink,
  Calendar, Tag, ChevronLeft, ChevronRight, Clock, MessageCircle,
  Send, Mail, Link2, Twitter, Linkedin, Check
} from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

const TikTokIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.95a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
  </svg>
);

const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26L4.205 21.16l3.443-.967zm5.34-4.51c.005.013.013.026.026.04.083.119.219.183.39.222.18.04.342.054.487.039.156-.018.33-.06.514-.118.184-.057.341-.122.469-.193l.043-.026c.183-.092.342-.18.476-.265.135-.085.247-.165.337-.243.09-.077.16-.146.21-.207.05-.06.09-.117.115-.17.025-.054.044-.105.057-.155.013-.05.02-.097.02-.142v-.002c0-.058-.014-.118-.041-.18a.587.587 0 0 0-.156-.183 4.65 4.65 0 0 0-.34-.231 7.21 7.21 0 0 0-.473-.286c-.169-.09-.31-.16-.426-.21-.116-.05-.198-.075-.246-.075-.078 0-.166.024-.265.072a1.63 1.63 0 0 0-.31.214 2.46 2.46 0 0 0-.246.244c-.066.077-.13.146-.193.207-.063.061-.13.118-.2.17-.07.054-.144.09-.22.108-.077.018-.158.013-.243-.014-.085-.027-.18-.078-.286-.153a8.21 8.21 0 0 1-.94-.844c-.345-.367-.611-.79-.797-1.27-.075-.187-.103-.336-.084-.448a.51.51 0 0 1 .137-.273c.067-.075.144-.16.232-.255.087-.094.157-.183.21-.265.054-.083.087-.157.1-.222.013-.066.005-.144-.024-.232a14.51 14.51 0 0 0-.327-.704 13.96 13.96 0 0 0-.34-.65c-.117-.207-.234-.337-.353-.39-.118-.052-.252-.077-.4-.077-.156 0-.32.027-.49.082a1.71 1.71 0 0 0-.475.234c-.14.103-.272.247-.397.43a2.49 2.49 0 0 0-.328.692c-.07.265-.097.55-.082.852.014.302.075.617.18.945.107.328.275.685.504 1.07.23.385.55.831.96 1.337z"/>
  </svg>
);

const TelegramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
);

const MessengerIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 0C5.37 0 0 4.97 0 11.1c0 3.49 1.74 6.6 4.46 8.64V24l4.08-2.24c1.09.3 2.24.46 3.46.46 6.63 0 12-4.97 12-11.1S18.63 0 12 0zm1.19 14.94l-3.05-3.25-5.95 3.25 6.55-6.95 3.13 3.25 5.87-3.25-6.55 6.95z"/>
  </svg>
);

const readingTime = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
};

// Light markdown renderer (h2/h3, bold, lists, links)
const renderMarkdown = (md: string) => {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let olBuf: string[] = [];

  const flushUl = () => {
    if (listBuf.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc pl-6 space-y-1.5 my-3">
          {listBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
        </ul>
      );
      listBuf = [];
    }
  };
  const flushOl = () => {
    if (olBuf.length) {
      out.push(
        <ol key={`ol-${out.length}`} className="list-decimal pl-6 space-y-1.5 my-3">
          {olBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
        </ol>
      );
      olBuf = [];
    }
  };
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand underline-offset-2 hover:underline font-medium">$1</a>')
      .replace(/(#\w+)/g, '<span class="text-brand/80 font-medium">$1</span>')
      .replace(/(@\w+)/g, '<span class="text-brand-2 font-medium">$1</span>');

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\r$/, "");
    if (/^##\s+/.test(line)) { flushUl(); flushOl(); out.push(<h2 key={idx} className="font-display text-2xl md:text-3xl font-bold mt-8 mb-3 tracking-tight">{line.replace(/^##\s+/, "")}</h2>); }
    else if (/^###\s+/.test(line)) { flushUl(); flushOl(); out.push(<h3 key={idx} className="font-display text-lg md:text-xl font-semibold mt-5 mb-2">{line.replace(/^###\s+/, "")}</h3>); }
    else if (/^\d+\.\s+/.test(line)) { flushUl(); olBuf.push(line.replace(/^\d+\.\s+/, "")); }
    else if (/^-\s+/.test(line)) { flushOl(); listBuf.push(line.replace(/^-\s+/, "")); }
    else if (line.trim() === "") { flushUl(); flushOl(); }
    else { flushUl(); flushOl(); out.push(<p key={idx} className="text-foreground/85 leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: inline(line) }} />); }
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
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("tech");
  const [submitting, setSubmitting] = useState(false);

  const current = posts[index];

  // SEO + JSON-LD per post
  useEffect(() => {
    const baseTitle = "Noutăți Avyron — Tehnologie, Web Design, SEO & Securitate";
    const baseDesc = "Articole zilnice despre IT, web design, SEO, securitate online și instrumente moderne. Echipa Avyron îți aduce cele mai noi sfaturi din domeniu.";
    const fullTitle = current ? `${current.title} · Avyron Insights` : baseTitle;
    const desc = current?.excerpt || baseDesc;
    const url = `${window.location.origin}/noutati${current ? `#${current.slug}` : ""}`;
    const image = current?.cover_image_url || `${window.location.origin}/og-default.jpg`;

    document.title = fullTitle;

    const setMeta = (selector: string, attr: string, value: string, create?: () => HTMLElement) => {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el && create) { el = create(); document.head.appendChild(el); }
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", desc, () => { const m = document.createElement("meta"); m.setAttribute("name", "description"); return m; });
    setMeta('link[rel="canonical"]', "href", url, () => { const l = document.createElement("link"); l.setAttribute("rel", "canonical"); return l; });

    // OpenGraph
    [
      ["og:title", fullTitle], ["og:description", desc], ["og:type", current ? "article" : "website"],
      ["og:url", url], ["og:image", image], ["og:site_name", "Avyron"],
      ["twitter:card", "summary_large_image"], ["twitter:title", fullTitle], ["twitter:description", desc], ["twitter:image", image],
    ].forEach(([k, v]) => {
      const sel = k.startsWith("twitter") ? `meta[name="${k}"]` : `meta[property="${k}"]`;
      setMeta(sel, "content", v as string, () => {
        const m = document.createElement("meta");
        if (k.startsWith("twitter")) m.setAttribute("name", k); else m.setAttribute("property", k);
        return m;
      });
    });

    // JSON-LD
    const existing = document.getElementById("news-jsonld");
    if (existing) existing.remove();
    if (current) {
      const ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: current.title,
        description: current.excerpt,
        image: current.cover_image_url ? [current.cover_image_url] : undefined,
        datePublished: current.published_at,
        dateModified: current.published_at,
        author: { "@type": "Organization", name: "Avyron", url: "https://www.avyron.ro" },
        publisher: {
          "@type": "Organization",
          name: "Avyron",
          logo: { "@type": "ImageObject", url: `${window.location.origin}/avyron-logo.jpg` },
        },
        mainEntityOfPage: url,
        keywords: current.tags?.join(", "),
      };
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = "news-jsonld";
      s.text = JSON.stringify(ld);
      document.head.appendChild(s);
    }
  }, [current]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) toast.error("Nu am putut încărca articolele");
      else setPosts((data || []) as NewsPost[]);
      setLoading(false);
    };
    load();
  }, []);

  // Sync URL hash to active post
  useEffect(() => {
    if (!posts.length) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const i = posts.findIndex((p) => p.slug === hash);
      if (i >= 0) setIndex(i);
    }
  }, [posts]);

  useEffect(() => {
    if (current) window.history.replaceState(null, "", `/noutati#${current.slug}`);
  }, [current]);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return setIsStaff(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsStaff(!!data?.some((r: any) => r.role === "staff" || r.role === "admin"));
    };
    checkRole();
  }, [user]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openCreate) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, posts.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [posts.length, openCreate]);

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
    setIndex(0);
    setOpenCreate(false);
    setTitle(""); setExcerpt(""); setContent(""); setCover(""); setTagsInput(""); setCategory("tech");
  };

  const shareLinks = useMemo(() => {
    if (!current) return null;
    const url = `${window.location.origin}/noutati#${current.slug}`;
    const text = `${current.title} — via Avyron`;
    const e = encodeURIComponent;
    return {
      url, text,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      messenger: `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${e(url)}&redirect_uri=${e(url)}`,
      whatsapp: `https://wa.me/?text=${e(text + " " + url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
      telegram: `https://t.me/share/url?url=${e(url)}&text=${e(text)}`,
      email: `mailto:?subject=${e(current.title)}&body=${e(text + "\n\n" + url)}`,
    };
  }, [current]);

  const copyLink = async () => {
    if (!shareLinks) return;
    try {
      await navigator.clipboard.writeText(shareLinks.url);
      setCopied(true);
      toast.success("Link copiat");
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("Nu am putut copia"); }
  };

  const next = () => setIndex((i) => Math.min(i + 1, posts.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-8 md:pb-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(265 90% 62% / 0.4), transparent 50%), radial-gradient(circle at 80% 60%, hsl(200 95% 55% / 0.4), transparent 55%), url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80')",
            backgroundSize: "cover", backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-4">
              <Newspaper className="size-3.5" />
              <span>Avyron Insights · O postare nouă în fiecare zi</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <span className="bg-gradient-to-r from-foreground via-brand to-brand-2 bg-clip-text text-transparent">Noutăți</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-foreground/80 leading-relaxed">
              Ultimele actualizări din <strong>IT și tehnologie</strong>, sfaturi de <strong>web design</strong>, <strong>SEO</strong> și <strong>securitate online</strong>, plus exemple reale și instrumente noi — selectate zilnic de echipa Avyron.
            </p>
            {isStaff && (
              <div className="mt-5">
                <Button onClick={() => setOpenCreate(true)} className="rounded-full">
                  <Plus className="size-4 mr-1.5" /> Postare nouă
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Single post viewer */}
      <section className="relative pb-16 md:pb-24">
        <div className="mx-auto max-w-4xl px-4">
          {loading ? (
            <div className="h-[600px] rounded-3xl bg-muted/40 animate-pulse" />
          ) : !current ? (
            <p className="text-center text-muted-foreground py-16">Nu există încă articole publicate.</p>
          ) : (
            <>
              {/* Counter + nav */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-medium text-muted-foreground">
                  Articol <span className="text-foreground font-semibold">{index + 1}</span> din {posts.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="rounded-full size-9" onClick={prev} disabled={index === 0} aria-label="Articolul anterior">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full size-9" onClick={next} disabled={index === posts.length - 1} aria-label="Articolul următor">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.article
                  key={current.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="bg-cardgrad rounded-3xl shadow-soft border border-border/60 overflow-hidden"
                >
                  {current.cover_image_url && (
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={current.cover_image_url}
                        alt={current.title}
                        className="w-full h-full object-cover"
                        width={1920}
                        height={1080}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </div>
                  )}

                  <div className="p-6 md:p-10">
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand font-semibold uppercase tracking-wide">
                        <Tag className="size-3" /> {current.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {new Date(current.published_at ?? current.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {readingTime(current.content)} min citire
                      </span>
                    </div>

                    <h2 className="font-display text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight mb-4">
                      {current.title}
                    </h2>

                    {current.excerpt && (
                      <p className="text-lg md:text-xl text-foreground/75 leading-relaxed mb-6 font-light italic border-l-4 border-brand/40 pl-4">
                        {current.excerpt}
                      </p>
                    )}

                    <div className="prose prose-base max-w-none">
                      {renderMarkdown(current.content)}
                    </div>

                    {current.tags && current.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-8 pt-6 border-t border-border/60">
                        {current.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Share bar */}
                    {shareLinks && (
                      <div className="mt-8 pt-6 border-t border-border/60">
                        <div className="flex items-center gap-2 mb-3">
                          <Share2 className="size-4 text-brand" />
                          <span className="text-sm font-semibold">Distribuie articolul</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ShareBtn href={shareLinks.facebook} label="Facebook" color="hover:bg-[#1877F2] hover:text-white"><Facebook className="size-4" /></ShareBtn>
                          <ShareBtn href={shareLinks.messenger} label="Messenger" color="hover:bg-[#0084FF] hover:text-white"><MessengerIcon className="size-4" /></ShareBtn>
                          <ShareBtn href={shareLinks.whatsapp} label="WhatsApp" color="hover:bg-[#25D366] hover:text-white"><WhatsAppIcon className="size-4" /></ShareBtn>
                          <ShareBtn href={shareLinks.twitter} label="X / Twitter" color="hover:bg-foreground hover:text-background"><Twitter className="size-4" /></ShareBtn>
                          <ShareBtn href={shareLinks.linkedin} label="LinkedIn" color="hover:bg-[#0A66C2] hover:text-white"><Linkedin className="size-4" /></ShareBtn>
                          <ShareBtn href={shareLinks.telegram} label="Telegram" color="hover:bg-[#229ED9] hover:text-white"><TelegramIcon className="size-4" /></ShareBtn>
                          <ShareBtn href={shareLinks.email} label="Email" color="hover:bg-brand hover:text-brand-foreground" external={false}><Mail className="size-4" /></ShareBtn>
                          <button
                            onClick={copyLink}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-muted text-xs font-medium hover:bg-brand hover:text-brand-foreground transition-colors"
                            aria-label="Copiază link"
                          >
                            {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
                            <span>{copied ? "Copiat" : "Copiază link"}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                          <span>Urmărește-ne:</span>
                          <a href="https://instagram.com/avyron" target="_blank" rel="noopener noreferrer" aria-label="Instagram Avyron" className="hover:text-brand transition-colors">
                            <Instagram className="size-4" />
                          </a>
                          <a href="https://facebook.com/avyron" target="_blank" rel="noopener noreferrer" aria-label="Facebook Avyron" className="hover:text-brand transition-colors">
                            <Facebook className="size-4" />
                          </a>
                          <a href="https://tiktok.com/@avyron" target="_blank" rel="noopener noreferrer" aria-label="TikTok Avyron" className="hover:text-brand transition-colors">
                            <TikTokIcon className="size-4" />
                          </a>
                          <Link to="/" className="ml-auto inline-flex items-center gap-1 text-brand hover:underline font-medium">
                            avyron.ro <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.article>
              </AnimatePresence>

              {/* Pagination dots */}
              {posts.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-6">
                  {posts.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setIndex(i)}
                      aria-label={`Mergi la articolul ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? "w-8 bg-brand" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Bottom prev/next cards */}
              {posts.length > 1 && (
                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={prev}
                    disabled={index === 0}
                    className="text-left p-4 rounded-2xl border border-border/60 bg-card hover:border-brand/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><ChevronLeft className="size-3" /> Anterior</div>
                    <div className="text-sm font-semibold mt-1 line-clamp-2">{posts[index - 1]?.title || "—"}</div>
                  </button>
                  <button
                    onClick={next}
                    disabled={index === posts.length - 1}
                    className="text-left p-4 rounded-2xl border border-border/60 bg-card hover:border-brand/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed sm:text-right"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 sm:justify-end">Următor <ChevronRight className="size-3" /></div>
                    <div className="text-sm font-semibold mt-1 line-clamp-2">{posts[index + 1]?.title || "—"}</div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Create dialog */}
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
              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting ? "Se publică..." : "Publică articolul"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </main>
  );
};

const ShareBtn = ({ href, label, color, children, external = true }: { href: string; label: string; color: string; children: React.ReactNode; external?: boolean }) => (
  <a
    href={href}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    aria-label={label}
    title={label}
    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-muted text-xs font-medium transition-colors ${color}`}
  >
    {children}
    <span className="hidden sm:inline">{label}</span>
  </a>
);

export default News;
