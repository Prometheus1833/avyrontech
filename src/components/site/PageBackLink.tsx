import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type PageBackLinkProps = {
  /** Pagina de rezervă când vizitatorul a intrat direct (fără istoric în site). */
  to: string;
  label: string;
  title?: string;
  className?: string;
  /** Forțează varianta pentru fundal întunecat. Altfel se detectează automat. */
  inverse?: boolean;
};

/** Există o pagină anterioară în aceeași sesiune a aplicației? (React Router ține `idx`.) */
const hasInAppHistory = () => {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" && idx > 0;
};

/** Luminozitatea culorii de text moștenite: text deschis = fundal întunecat. */
const isDarkContext = (el: HTMLElement) => {
  const parent = el.parentElement;
  if (!parent) return false;
  const match = getComputedStyle(parent).color.match(/[\d.]+/g);
  if (!match || match.length < 3) return false;
  const [r, g, b] = match.slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
};

const PageBackLink = ({ to, label, title, className, inverse }: PageBackLinkProps) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLAnchorElement>(null);
  const [autoDark, setAutoDark] = useState(false);

  useLayoutEffect(() => {
    if (inverse !== undefined || !ref.current) return;
    const el = ref.current;
    const update = () => setAutoDark(isDarkContext(el));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, [inverse]);

  const dark = inverse ?? autoDark;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (hasInAppHistory()) {
      event.preventDefault();
      navigate(-1);
    }
  };

  const classes = cn(
    "group relative inline-flex min-h-9 items-center gap-1.5 overflow-hidden rounded-full border py-1.5 pl-1.5 pr-2.5 text-xs font-medium shadow-sm backdrop-blur-md transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 sm:gap-2 sm:pl-2 sm:pr-3.5",
    dark
      ? "border-white/20 bg-black/35 text-white/85 hover:border-cyan-300/70 hover:text-white focus-visible:ring-offset-black"
      : "border-foreground/15 bg-background/75 text-foreground/80 hover:border-cyan-500/60 hover:text-foreground focus-visible:ring-offset-background",
    className,
  );

  const content = (
    <>
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/15 to-cyan-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
      <span className={cn("relative grid size-5 place-items-center rounded-full transition-transform duration-300 group-hover:-translate-x-0.5", dark ? "bg-white text-black" : "bg-foreground text-background")}>
        <ArrowLeft className="size-3" aria-hidden />
      </span>
      <span className="relative font-mono text-[10px] uppercase tracking-[0.18em]">{label}</span>
      <span className="relative size-1 rounded-full bg-cyan-400 motion-safe:animate-pulse" aria-hidden />
    </>
  );
  const shared = { ref, title: title ?? label, "aria-label": title ?? label, "data-testid": "page-back-link", className: classes, onClick };

  return /^https?:\/\//.test(to)
    ? <a href={to} {...shared}>{content}</a>
    : <Link to={to} {...shared}>{content}</Link>;
};

export default PageBackLink;
