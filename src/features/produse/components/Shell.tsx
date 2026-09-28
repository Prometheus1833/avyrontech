import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Blocks, BookOpen, Boxes, Handshake, Heart, Layers, Search, Sparkles } from "lucide-react";
import Nav, { type NavLinkDef } from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import type { Lang } from "@/i18n/translations";
import { detectTier, finePointer, reducedMotion } from "../lib/capability";
import { collectionsPath, faqPath, guidePath, homePath, typePath } from "../lib/paths";
import Preloader from "./Preloader";
import CartDrawer from "./CartDrawer";

const Backdrop = lazy(() => import("./Backdrop"));
const SearchPalette = lazy(() => import("./SearchPalette"));

/**
 * Cadrul paginii Produse Avyron.
 *
 * Ce ține la un loc: bara de sus a site-ului (aceeași componentă, cu legături
 * proprii), fundalul WebGL care își schimbă nuanța pe secțiuni, scroll-ul
 * neted, cursorul, unda de la apăsare, paleta ⌘K, coșul și subsolul original.
 *
 * Tot ce e greu (fundal 3D, Lenis, cursor) pornește doar pe dispozitive care
 * îl duc și se oprește pe „mișcare redusă” — pagina rămâne completă și fără.
 */
export default function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  const ro = lang === "ro";
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tier] = useState(() => detectTier());

  const links: NavLinkDef[] = [
    { label: ro ? "Componente" : "Components", to: typePath(lang, "component"), icon: Blocks, isRoute: true },
    { label: ro ? "Secțiuni" : "Sections", to: typePath(lang, "section"), icon: Layers, isRoute: true },
    { label: ro ? "Template-uri" : "Templates", to: typePath(lang, "template"), icon: Boxes, isRoute: true },
    { label: ro ? "Efecte 3D" : "3D effects", to: typePath(lang, "effect"), icon: Sparkles, isRoute: true },
    { label: ro ? "Colecții" : "Collections", to: collectionsPath(lang), icon: Layers, isRoute: true },
    { label: ro ? "Parteneriate" : "Partnerships", href: `${homePath(lang)}#parteneriate` },
    { label: ro ? "Ghid" : "Guide", to: guidePath(lang), icon: BookOpen, isRoute: true },
  ];

  // Clasa .pa-js spune CSS-ului că avem JavaScript: fără ea, conținutul nu e
  // ascuns niciodată, deci prerenderul și cititoarele văd pagina întreagă.
  useEffect(() => {
    document.documentElement.classList.add("pa-js");
    return () => document.documentElement.classList.remove("pa-js");
  }, []);

  // Scroll neted, doar când utilizatorul nu a cerut mai puțină mișcare.
  useEffect(() => {
    if (reducedMotion() || loading) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.4 });
      let frame = 0;
      const loop = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
      stop = () => {
        cancelAnimationFrame(frame);
        lenis.destroy();
      };
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [loading]);

  // Unda de la apăsare, pentru butoanele marcate cu data-ripple.
  useEffect(() => {
    if (reducedMotion()) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("[data-ripple]");
      if (!target) return;
      const wave = document.createElement("span");
      wave.className = "pa-shock";
      wave.style.left = `${event.clientX}px`;
      wave.style.top = `${event.clientY}px`;
      document.body.appendChild(wave);
      window.setTimeout(() => wave.remove(), 650);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ⌘K / Ctrl+K deschide paleta de căutare oriunde în pagină.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // La schimbarea rutei, sus.
  useEffect(() => {
    if (loading) return;
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [pathname, loading]);

  const onDone = useCallback(() => setLoading(false), []);
  const showBackdrop = tier !== "none";

  return (
    <div className="pa-root min-h-screen bg-background text-foreground">
      {loading && <Preloader onDone={onDone} lang={ro ? "ro" : "en"} />}

      {showBackdrop ? (
        <Suspense fallback={null}>
          <Backdrop tier={tier} />
        </Suspense>
      ) : (
        <div
          aria-hidden
          className="fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(110% 80% at 15% 0%, hsl(264 70% 24% / .55), transparent 62%), radial-gradient(90% 70% at 85% 25%, hsl(200 80% 22% / .45), transparent 65%), hsl(228 18% 6%)",
          }}
        />
      )}

      <Nav links={links} cta={{ label: ro ? "Parteneriate AVY" : "AVY partnerships", sub: ro ? "de la 0 lei" : "from 0 lei", href: `${homePath(lang)}#parteneriate` }} />

      <main className="mx-auto max-w-6xl px-4 pt-24 sm:pt-28">
        <div className="mb-4 flex items-center gap-2">
          <Link to={homePath(lang)} className="pa-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground">
            {ro ? "Produse Avyron" : "Avyron Products"}
          </Link>
          <span className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground"
              aria-label={ro ? "Caută (Ctrl+K)" : "Search (Ctrl+K)"}
            >
              <Search className="size-3.5" aria-hidden />
              <span className="pa-mono hidden sm:inline">{finePointer() ? "⌘K" : ro ? "Caută" : "Search"}</span>
            </button>
            <Link
              to={`${typePath(lang, "component")}`}
              className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground"
            >
              <Heart className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{ro ? "Colecția mea" : "My collection"}</span>
            </Link>
            <Link
              to={faqPath(lang)}
              className="pa-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground"
            >
              <Handshake className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{ro ? "Întrebări" : "FAQ"}</span>
            </Link>
          </span>
        </div>
        {children}
      </main>

      <Footer />

      <CartDrawer lang={lang} open={cartOpen} onOpenChange={setCartOpen} />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchPalette
            lang={lang}
            onClose={() => setSearchOpen(false)}
            onPick={(path) => {
              setSearchOpen(false);
              navigate(path);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
