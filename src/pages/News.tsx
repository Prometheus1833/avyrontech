import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Facebook, Instagram, Share2, Newspaper, Plus, ExternalLink, Calendar, Tag } from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.95a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
  </svg>
);

const shareUrl = (network: "facebook" | "twitter" | "linkedin", url: string, title: string) => {
  const enc = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (network) {
    case "facebook": return `https://www.facebook.com/sharer/sharer.php?u=${enc}`;
    case "twitter": return `https://twitter.com/intent/tweet?url=${enc}&text=${t}`;
    case "linkedin": return `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`;
  }
};

const News = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openPost, setOpenPost] = useState<NewsPost | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("tech");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Noutăți Avyron — Tehnologie, Web Design, SEO & Securitate";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "Ultimele actualizări din IT, web design, SEO, securitate online și instrumente moderne. Articole zilnice de la echipa Avyron.");
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) toast.error("Nu am putut încărca articolele");
      else setPosts(data as NewsPost[]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return setIsStaff(false);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsStaff(!!data?.some((r: any) => r.role === "staff" || r.role === "admin"));
    };
    checkRole();
  }, [user]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const submit = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast.error("Completează titlul și conținutul");
      return;
    }
    setSubmitting(true);
    const slug = slugify(title) + "-" + Date.now().toString(36);
    const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from("news_posts").insert({
      author_id: user.id,
      title: title.trim(),
      slug,
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      cover_image_url: cover.trim() || null,
      tags,
      category,
    }).select().single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Articol publicat");
    setPosts((p) => [data as NewsPost, ...p]);
    setOpenCreate(false);
    setTitle(""); setExcerpt(""); setContent(""); setCover(""); setTagsInput(""); setCategory("tech");
  };

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* Hero with tech background */}
      <section className="relative pt-28 md:pt-36 pb-12 md:pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(265 90% 62% / 0.4), transparent 50%), radial-gradient(circle at 80% 60%, hsl(200 95% 55% / 0.4), transparent 55%), url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-4">
              <Newspaper className="size-3.5" />
              <span>Banner interesant · Avyron Insights</span>
            </div>
            <h1
              className="text-4xl md:text-6xl font-bold tracking-tight"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <span className="bg-gradient-to-r from-foreground via-brand to-brand-2 bg-clip-text text-transparent">
                Noutăți
              </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-foreground/80 leading-relaxed">
              Aici descoperi ultimele actualizări din lumea <strong>IT și tehnologie</strong>, cele mai noi creații, instrumente, sfaturi practice de <strong>web design</strong>, <strong>SEO</strong>, <strong>securitate online</strong> și importanța identității digitale.
            </p>
            {isStaff && (
              <div className="mt-6">
                <Button onClick={() => setOpenCreate(true)} className="rounded-full">
                  <Plus className="size-4 mr-1.5" />
                  Postare nouă
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="relative py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nu există încă articole publicate.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Card className="overflow-hidden h-full flex flex-col hover:shadow-elev transition-shadow cursor-pointer group" onClick={() => setOpenPost(p)}>
                    {p.cover_image_url && (
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    )}
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <Tag className="size-3" />
                        <span className="uppercase font-semibold tracking-wide">{p.category}</span>
                        <span>·</span>
                        <Calendar className="size-3" />
                        <span>{new Date(p.published_at ?? p.created_at).toLocaleDateString("ro-RO")}</span>
                      </div>
                      <h2 className="font-display text-lg font-semibold leading-tight mb-2 group-hover:text-brand transition-colors">
                        {p.title}
                      </h2>
                      {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{p.excerpt}</p>}
                      {p.tags && p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {p.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Read post dialog */}
      <Dialog open={!!openPost} onOpenChange={(o) => !o && setOpenPost(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {openPost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display leading-tight">{openPost.title}</DialogTitle>
              </DialogHeader>
              {openPost.cover_image_url && (
                <img src={openPost.cover_image_url} alt={openPost.title} className="w-full rounded-xl my-3" />
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
                <span className="uppercase font-semibold">{openPost.category}</span>
                <span>·</span>
                <span>{new Date(openPost.published_at ?? openPost.created_at).toLocaleDateString("ro-RO")}</span>
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {openPost.content}
              </div>
              {openPost.tags && openPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t">
                  {openPost.tags.map((t) => (
                    <Badge key={t} variant="secondary">#{t}</Badge>
                  ))}
                </div>
              )}
              {/* Share buttons */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t">
                <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
                  <Share2 className="size-3.5" /> Distribuie:
                </span>
                <a
                  href={shareUrl("facebook", `${window.location.origin}/noutati#${openPost.slug}`, openPost.title)}
                  target="_blank" rel="noopener noreferrer"
                  className="size-8 rounded-full grid place-items-center bg-muted hover:bg-brand hover:text-brand-foreground transition-colors"
                  aria-label="Share Facebook"
                >
                  <Facebook className="size-4" />
                </a>
                <a
                  href="https://www.instagram.com/avyron"
                  target="_blank" rel="noopener noreferrer"
                  className="size-8 rounded-full grid place-items-center bg-muted hover:bg-brand hover:text-brand-foreground transition-colors"
                  aria-label="Open Instagram"
                >
                  <Instagram className="size-4" />
                </a>
                <a
                  href="https://www.tiktok.com/@avyron"
                  target="_blank" rel="noopener noreferrer"
                  className="size-8 rounded-full grid place-items-center bg-muted hover:bg-brand hover:text-brand-foreground transition-colors"
                  aria-label="Open TikTok"
                >
                  <TikTokIcon className="size-4" />
                </a>
                <Link
                  to="/"
                  className="ml-auto text-xs text-brand inline-flex items-center gap-1 hover:underline"
                >
                  avyron.ro <ExternalLink className="size-3" />
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create post dialog (staff) */}
      {isStaff && (
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Postare nouă</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Titlu" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="URL imagine cover (opțional)" value={cover} onChange={(e) => setCover(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="tech">Tehnologie</option>
                  <option value="web-design">Web Design</option>
                  <option value="seo">SEO</option>
                  <option value="securitate">Securitate</option>
                  <option value="promotie">Promoție</option>
                </select>
                <Input placeholder="Tag-uri (separate prin virgulă)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
              </div>
              <Textarea placeholder="Rezumat scurt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              <Textarea placeholder="Conținut (markdown acceptat)" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
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

export default News;
