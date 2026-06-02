import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Home, LifeBuoy, Wrench, ShieldAlert, ServerCrash, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ErrorVariant = "404" | "403" | "500" | "maintenance" | "offline";

type Config = {
  code: string;
  badge: string;
  title: string;
  message: string;
  Icon: typeof Wrench;
  metaTitle: string;
  metaDescription: string;
  accent: string; // tailwind ring/glow color class
  showRetry?: boolean;
};

const CONFIGS: Record<ErrorVariant, Config> = {
  "404": {
    code: "404",
    badge: "Eroare 404",
    title: "Pagina pe care o cauți a luat-o pe scurtătură.",
    message:
      "Probabil a fost mutată, redenumită sau nu a existat niciodată. Hai înapoi acasă — îți construim drumul corect.",
    Icon: Compass,
    metaTitle: "404 — Pagină negăsită | Avyron",
    metaDescription:
      "Pagina căutată nu există pe avyron.ro. Descoperă serviciile Avyron: creare site-uri, aplicații mobile, magazine online, branding și SEO în Iași și România.",
    accent: "from-fuchsia-500/30 to-violet-600/30",
  },
  "403": {
    code: "403",
    badge: "Acces restricționat",
    title: "Această zonă e doar pentru cei din interior.",
    message:
      "Nu ai permisiunile necesare pentru a vedea conținutul. Dacă crezi că ar trebui să ai acces, autentifică-te din nou sau scrie-ne și verificăm împreună.",
    Icon: ShieldAlert,
    metaTitle: "403 — Acces interzis | Avyron",
    metaDescription:
      "Nu ai permisiunile necesare pentru această pagină Avyron. Autentifică-te sau contactează echipa pentru asistență.",
    accent: "from-amber-500/30 to-rose-500/30",
  },
  "500": {
    code: "500",
    badge: "Eroare server",
    title: "Ceva a clipit la noi pe server.",
    message:
      "A apărut o eroare neașteptată. Echipa Avyron este notificată automat. Încearcă din nou într-un minut sau revino la pagina principală.",
    Icon: ServerCrash,
    metaTitle: "500 — Eroare internă | Avyron",
    metaDescription:
      "Eroare internă pe avyron.ro. Echipa Avyron a fost notificată automat. Reîncearcă sau revino la pagina principală.",
    accent: "from-rose-500/30 to-orange-500/30",
    showRetry: true,
  },
  maintenance: {
    code: "503",
    badge: "Mentenanță planificată",
    title: "Lustruim câteva pixeli — revenim imediat.",
    message:
      "Facem o actualizare scurtă pentru a-ți oferi o experiență mai rapidă și mai sigură. Mulțumim pentru răbdare — te așteptăm înapoi în câteva minute.",
    Icon: Wrench,
    metaTitle: "În mentenanță — revenim imediat | Avyron",
    metaDescription:
      "Avyron.ro este în mentenanță planificată pentru îmbunătățiri. Revenim online în câteva minute.",
    accent: "from-violet-500/30 to-sky-500/30",
    showRetry: true,
  },
  offline: {
    code: "OFFLINE",
    badge: "Fără conexiune",
    title: "Pare că ești offline.",
    message:
      "Verifică conexiunea la internet și reîncarcă pagina. Conținutul tău te așteaptă imediat ce revii online.",
    Icon: LifeBuoy,
    metaTitle: "Offline | Avyron",
    metaDescription: "Nu există conexiune la internet. Reîncarcă pagina când revii online.",
    accent: "from-slate-500/30 to-zinc-500/30",
    showRetry: true,
  },
};

interface Props {
  variant?: ErrorVariant;
}

const ErrorPage = ({ variant = "404" }: Props) => {
  const location = useLocation();
  const cfg = CONFIGS[variant];

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: cfg.metaTitle,
        description: cfg.metaDescription,
        path: location.pathname,
      })
    );
    // Disallow indexing for error pages
    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    const prev = robots.getAttribute("content");
    robots.setAttribute("content", "noindex, follow");
    return () => {
      if (prev) robots?.setAttribute("content", prev);
    };
  }, [location.pathname, cfg.metaTitle, cfg.metaDescription]);

  const Icon = cfg.Icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient glow */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${cfg.accent} opacity-40 blur-3xl`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <Link
          to="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-bold text-white">
            A
          </span>
          Avyron
        </Link>

        <div className="relative w-full max-w-2xl text-center">
          {/* Huge ghost code */}
          <div
            aria-hidden
            className="select-none text-[clamp(8rem,22vw,18rem)] font-black leading-none tracking-tighter text-foreground/[0.06]"
          >
            {cfg.code}
          </div>

          <div className="-mt-[clamp(6rem,16vw,13rem)] flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
              <Icon className="size-3.5" />
              {cfg.badge}
            </div>

            <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              {cfg.title}
            </h1>

            <p className="max-w-lg text-pretty text-base text-muted-foreground md:text-lg">
              {cfg.message}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  <Home className="size-4" />
                  Înapoi acasă
                </Link>
              </Button>
              {cfg.showRetry ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => window.location.reload()}
                >
                  Reîncarcă pagina
                </Button>
              ) : (
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to={-1 as unknown as string} onClick={(e) => { e.preventDefault(); window.history.back(); }}>
                    <ArrowLeft className="size-4" />
                    Pagina anterioară
                  </Link>
                </Button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link to="/despre-si-portofoliu" className="hover:text-foreground">Despre Avyron</Link>
              <span aria-hidden className="opacity-30">·</span>
              <Link to="/costurisiproduse" className="hover:text-foreground">Costuri</Link>
              <span aria-hidden className="opacity-30">·</span>
              <Link to="/noutati" className="hover:text-foreground">Noutăți</Link>
              <span aria-hidden className="opacity-30">·</span>
              <a href="mailto:avyrontech@gmail.com" className="hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;
