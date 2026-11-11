import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, BookOpen, Pause, Play } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useLang } from "@/i18n/LanguageContext";
import { blogApi, type BlogPost } from "@/lib/blogApi";
import { mergeBlogPosts, staticBlogPosts } from "@/lib/blogFeed";
import BlogCover from "./BlogCover";
import "./latest-blog.css";

export default function LatestBlog() {
  const { lang } = useLang();
  const ro = lang === "ro",
    base = ro ? "/blog" : "/en/blog";
  const archive = useMemo(() => staticBlogPosts(lang), [lang]);
  const [feed, setFeed] = useState<{
    language: string;
    posts: BlogPost[];
  } | null>(null);
  const posts = (feed?.language === lang ? feed.posts : archive).slice(0, 6);
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [viewport, api] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: true,
    duration: reduced ? 0 : 45,
  });
  const [visible, setVisible] = useState(false),
    [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState({
    index: 0,
    count: 0,
    previous: false,
    next: false,
  });
  const stop = useCallback(() => setPaused(true), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void blogApi
      .listPublished(lang, 6, controller.signal)
      .then(({ data }) => {
        if (active)
          setFeed({
            language: lang,
            posts: mergeBlogPosts(data, archive, lang),
          });
      })
      .catch(() => {
        /* The same published archive remains available on the blog and landing. */
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [lang, archive]);
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // A layout/scroll update can queue both exit and entry in one delivery.
        // Only the newest observation represents the current viewport state.
        const entry = entries[entries.length - 1];
        if (entry) setVisible(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    const visibility = () => setHidden(document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!api) return;
    const update = () =>
      setPosition({
        index: api.selectedScrollSnap(),
        count: api.scrollSnapList().length,
        previous: api.canScrollPrev(),
        next: api.canScrollNext(),
      });
    update();
    api.on("select", update).on("reInit", update).on("pointerDown", stop);
    return () => {
      api.off("select", update).off("reInit", update).off("pointerDown", stop);
    };
  }, [api, stop]);
  const playing =
    !!api &&
    visible &&
    !hidden &&
    !paused &&
    !hovered &&
    !reduced &&
    position.count > 1;
  useEffect(() => {
    if (!playing || !api) return;
    const timer = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [api, playing]);
  const interact = (target: EventTarget) => {
    if (!(target instanceof Element) || !target.closest("[data-blog-playback]"))
      stop();
  };
  const date = (post: BlogPost) =>
    new Intl.DateTimeFormat(ro ? "ro-RO" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(post.published_at!));
  return (
    <section
      ref={section}
      id="blog-avyron"
      className="avy-blog-preview"
      aria-labelledby="avy-blog-preview-title"
      data-autoplay={playing ? "playing" : "paused"}
      data-carousel-index={position.index}
      onPointerDownCapture={(event) => interact(event.target)}
      onFocusCapture={(event) => interact(event.target)}
      onClickCapture={(event) => interact(event.target)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        stop();
        if (event.key === "ArrowLeft") api?.scrollPrev();
        else api?.scrollNext();
      }}
    >
      <div className="avy-blog-preview-shell">
        <header className="avy-blog-preview-header">
          <p className="avy-blog-preview-eyebrow">
            <BookOpen aria-hidden="true" /> Avyron Insights
          </p>
          <h2 id="avy-blog-preview-title">
            {ro ? "Idei pentru proiectul tău." : "Ideas for your next project."}
          </h2>
          <p className="avy-blog-preview-description">
            {ro
              ? "Website-uri, design, SEO și tehnologie. Pe scurt, pentru afacerea ta."
              : "Websites, design, SEO and technology. Brief insights for your business."}
          </p>
        </header>
        <div
          ref={viewport}
          className="avy-blog-preview-viewport"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovered(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setHovered(false);
          }}
          role="region"
          aria-roledescription={ro ? "carusel" : "carousel"}
          aria-label={
            ro ? "Ultimele articole Avyron" : "Latest Avyron articles"
          }
        >
          <div className="avy-blog-preview-track">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="avy-blog-preview-slide"
              >
                <Link
                  to={`${base}/${post.slug}`}
                  className="avy-blog-preview-card"
                  aria-label={`${ro ? "Citește" : "Read"}: ${post.title}`}
                >
                  <div className="avy-blog-preview-image">
                    <BlogCover
                      src={post.cover_image_url}
                      alt={post.cover_image_alt || post.title}
                      width={720}
                      height={405}
                      loading="lazy"
                    />
                  </div>
                  <div className="avy-blog-preview-copy">
                    <time dateTime={new Date(post.published_at!).toISOString()}>
                      {date(post)}
                    </time>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <span className="avy-blog-preview-read">
                      {ro ? "Citește articolul" : "Read article"}
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
        <div className="avy-blog-preview-controls">
          <Link to={base} className="avy-blog-preview-all">
            {ro ? "Explorează blogul" : "Explore the blog"}
            <ArrowRight aria-hidden="true" />
          </Link>
          {position.count > 1 && (
            <div>
              {!reduced && (
                <button
                  type="button"
                  data-blog-playback
                  aria-label={
                    paused
                      ? ro
                        ? "Pornește rularea automată"
                        : "Start automatic playback"
                      : ro
                        ? "Oprește rularea automată"
                        : "Pause automatic playback"
                  }
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? (
                    <Play aria-hidden="true" />
                  ) : (
                    <Pause aria-hidden="true" />
                  )}
                </button>
              )}
              <button
                type="button"
                aria-label={ro ? "Articolele anterioare" : "Previous articles"}
                disabled={!position.previous}
                onClick={() => {
                  stop();
                  api?.scrollPrev();
                }}
              >
                <ArrowLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={ro ? "Articolele următoare" : "Next articles"}
                disabled={!position.next}
                onClick={() => {
                  stop();
                  api?.scrollNext();
                }}
              >
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
