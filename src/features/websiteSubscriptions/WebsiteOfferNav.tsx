import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";

export default function WebsiteOfferNav({ ro }: { ro: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  const home = ro ? "/" : "/en";
  const quote = ro ? "Cere o ofertă" : "Request a quote";

  useEffect(() => {
    if (!trigger.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setCompact(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(trigger.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bar = progress.current;
    if (!bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.scrollingElement;
      if (!root) return;
      const range = root.scrollHeight - root.clientHeight;
      const position = range > 0 ? Math.min(1, Math.max(0, root.scrollTop / range)) : 0;
      bar.style.transform = `scaleX(${position})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const page = bar.closest(".ws-page");
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(schedule);
    if (page) resize?.observe(page);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <>
      <div className="ws-nav-trigger" ref={trigger} aria-hidden="true" />
      <header className="ws-top" data-compact={compact || undefined}>
        <PageBackLink to={home} label={ro ? "Înapoi" : "Back"} inverse className="ws-back" />
        <Link to={home} className="ws-wordmark" aria-label={ro ? "Avyron, pagina principală" : "Avyron, homepage"}>
          AVYRON<span> / WEB</span>
        </Link>
        <div className="ws-top-actions">
          <LangSwitch className="ws-language" />
          <a className="ws-top-quote" href="#website-brief" aria-label={quote} title={quote}>
            <span>{quote}</span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <span className="ws-reading-track" aria-hidden="true"><span ref={progress} /></span>
      </header>
    </>
  );
}
