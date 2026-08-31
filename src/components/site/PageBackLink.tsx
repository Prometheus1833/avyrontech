import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type PageBackLinkProps = {
  to: string;
  label: string;
  title?: string;
  className?: string;
  inverse?: boolean;
};

const PageBackLink = ({ to, label, title, className, inverse = false }: PageBackLinkProps) => {
  const classes = cn(
    "group relative inline-flex min-h-9 items-center gap-1.5 overflow-hidden rounded-full border border-foreground/15 bg-foreground/[0.04] py-1.5 pl-1.5 pr-2.5 text-xs font-medium text-foreground/70 backdrop-blur transition-all duration-300 hover:border-cyan-400/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-2 sm:pl-2 sm:pr-3.5",
    inverse && "border-white/15 bg-white/[0.06] text-white/75 hover:text-white focus-visible:ring-offset-[#050914]",
    className,
  );
  const content = (
    <>
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/15 to-cyan-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
      <span className={cn("relative grid size-5 place-items-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-0.5", inverse && "bg-white text-slate-950")}>
        <ArrowLeft className="size-3" aria-hidden />
      </span>
      <span className="relative font-mono text-[10px] uppercase tracking-[0.18em]">{label}</span>
      <span className="relative size-1 rounded-full bg-cyan-400 motion-safe:animate-pulse" aria-hidden />
    </>
  );
  const shared = { title: title ?? label, "data-testid": "page-back-link", className: classes };

  return /^https?:\/\//.test(to)
    ? <a href={to} {...shared}>{content}</a>
    : <Link to={to} {...shared}>{content}</Link>;
};

export default PageBackLink;
