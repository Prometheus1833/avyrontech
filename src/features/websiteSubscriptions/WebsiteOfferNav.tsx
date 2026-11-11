import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";

export default function WebsiteOfferNav({ ro }: { ro: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
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
      </header>
    </>
  );
}
