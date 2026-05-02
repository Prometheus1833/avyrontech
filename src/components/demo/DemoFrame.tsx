import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Star, MessageCircle, ExternalLink } from "lucide-react";

type Props = {
  displayUrl: string;
  brandName: string;
  children: ReactNode;
  accent?: string;
};

/**
 * Wraps a demo subsite in a fake-browser frame so the URL bar shows
 * "{brand}.avyron.ro" — preserving the realistic feel even though the
 * real route is /exemple/{slug}.
 */
export const DemoFrame = ({ displayUrl, brandName, children, accent = "hsl(var(--brand))" }: Props) => {
  return (
    <main className="min-h-screen bg-background">
      {/* Fake browser top bar */}
      <div className="sticky top-0 z-50 bg-foreground text-background border-b border-foreground/30">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 sm:gap-3">
          <Link
            to="/#exemple"
            aria-label="Înapoi la Avyron"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-background/10 transition-colors text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Avyron</span>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-yellow-400" />
            <span className="size-2.5 rounded-full bg-green-400" />
          </div>

          <div className="flex-1 flex items-center gap-1.5 rounded-full bg-background/15 backdrop-blur px-3 py-1.5 min-w-0">
            <Lock className="size-3 text-emerald-300 shrink-0" />
            <span className="text-[11px] sm:text-xs opacity-70 hidden sm:inline">https://</span>
            <span className="font-mono text-xs sm:text-sm font-semibold truncate">
              {displayUrl}
            </span>
          </div>

          <span className="hidden md:inline-flex text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-background/15 font-bold">
            Demo · {brandName}
          </span>
        </div>
      </div>

      {/* Subsite content */}
      <div style={{ ["--demo-accent" as string]: accent } as React.CSSProperties}>
        {children}
      </div>

      {/* Sticky footer banner — back to Avyron */}
      <div className="sticky bottom-0 z-50 bg-gradient-to-r from-brand to-brand-2 text-background border-t border-background/20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-medium text-center sm:text-left">
            <span className="opacity-80">Acesta este un exemplu construit de</span>{" "}
            <span className="font-bold">Avyron</span> pentru {brandName}.
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/#exemple"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/15 hover:bg-background/25 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="size-3" /> Alte exemple
            </Link>
            <Link
              to="/#cta"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background text-foreground text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="size-3" /> Vreau și eu
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};
