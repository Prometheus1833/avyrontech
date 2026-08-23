import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Cloud,
  Code2,
  Cpu,
  Gauge,
  Globe,
  MessageCircle,
  Palette,
  ScanSearch,
  Search,
  Share2,
  Shield,
  ShoppingBag,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { getProductByPath, PRODUCTS, type IconKey } from "@/data/products";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Reveal from "@/components/site/Reveal";
import NotFound from "@/pages/NotFound";
import logo from "@/assets/avyron-logo.jpg";

const ICONS: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  share: Share2,
  store: ShoppingBag,
  smartphone: Smartphone,
  cpu: Cpu,
  scan: ScanSearch,
  check: Check,
  shield: Shield,
  zap: Zap,
  search: Search,
  gauge: Gauge,
  accessibility: Accessibility,
  chart: BarChart3,
  palette: Palette,
  code: Code2,
  cloud: Cloud,
  users: Users,
  clock: Clock,
};

const WHATSAPP = "https://wa.me/40734605055?text=";

const ProductPage = () => {
  const { pathname } = useLocation();
  const { lang } = useLang();
  const ro = lang === "ro";
  const product = getProductByPath(pathname);

  useEffect(() => {
    if (!product) return;
    window.scrollTo(0, 0);
    const c = product.copy[lang];
    const path = product.path[lang];
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, faqPageLd }]) => {
        setPageMeta({
          title: c.metaTitle,
          description: c.metaDescription,
          path,
          alternates: { ro: product.path.ro, en: product.path.en },
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-service",
          serviceLd({
            name: c.name,
            description: c.metaDescription,
            path,
            priceEur: product.priceEur || undefined,
          }),
        );
        setJsonLd("ld-faq", faqPageLd(c.faq));
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Costuri & Produse" : "Pricing & Products",
              path: ro ? "/costurisiproduse" : "/en/pricing",
            },
            { name: c.name, path },
          ]),
        );
      },
    );
  }, [product, lang, ro]);

  if (!product) return <NotFound />;

  const c = product.copy[lang];
  const a = product.accent;
  const HeroIcon = ICONS[product.icon];
  const others = PRODUCTS.filter((p) => p.key !== product.key);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 size-[42rem] rounded-full blur-3xl opacity-40 ${a.glow}`} />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-6 sm:pt-8 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            className="group inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.04] backdrop-blur pl-2 pr-3.5 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-all duration-300"
          >
            <span className="grid place-items-center size-5 rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-0.5">
              <ArrowLeft className="size-3" aria-hidden />
            </span>
            <span className="font-mono uppercase tracking-[0.18em] text-[10px]">
              {ro ? "Produse" : "Products"}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="w-px h-3 bg-foreground/15" />
              <ThemeToggle />
            </div>
            <Link
              to={ro ? "/" : "/en"}
              aria-label={ro ? "Acasă" : "Home"}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-foreground/5 transition-colors"
            >
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 sm:size-8 rounded-md ring-1 ring-foreground/15" />
              <span className="font-display tracking-[0.2em] text-xs sm:text-sm">AVYRON</span>
            </Link>
          </div>
        </div>

        <Breadcrumbs
          className="mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Costuri & Produse" : "Pricing & Products",
              path: ro ? "/costurisiproduse" : "/en/pricing",
            },
            { name: c.name, path: product.path[lang] },
          ]}
        />

        {/* Hero */}
        <Reveal as="section" className="mt-8 sm:mt-10">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${a.chipBg} ${a.chipText}`}>
            <HeroIcon className="size-3.5" aria-hidden />
            {c.kicker}
          </div>
          <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
            <span className={`bg-gradient-to-r ${a.from} ${a.to} bg-clip-text text-transparent`}>
              {c.heroTitle}
            </span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">{c.subtitle}</p>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground/75 leading-relaxed">{c.heroLead}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={`${WHATSAPP}${encodeURIComponent(c.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${a.from} ${a.to} px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40`}
            >
              {c.ctaButton}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <Link
              to={ro ? "/costurisiproduse#cta" : "/en/pricing#cta"}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-6 py-3 text-sm font-semibold hover:bg-foreground/[0.1] transition-colors"
            >
              {ro ? "Cere ofertă" : "Request a quote"}
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-2 text-[11px]">
            {product.priceEur > 0 && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${a.chipBg} ${a.chipText}`}>
                {ro ? "de la" : "from"} {product.priceEur}€
              </span>
            )}
            {product.priceEur === 0 && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${a.chipBg} ${a.chipText}`}>
                {ro ? "Gratuit" : "Free"}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-3 py-1.5 text-foreground/70">
              <Clock className="size-3.5" aria-hidden />
              {ro ? "Durată:" : "Duration:"} {product.duration[lang]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-3 py-1.5 text-foreground/70">
              <Shield className="size-3.5" aria-hidden />
              {ro ? "Suport gratuit pe viață" : "Free lifetime support"}
            </span>
          </div>
        </Reveal>

        {/* Intro */}
        <Reveal as="section" className="mt-14 border-t border-foreground/10 pt-10">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold">{c.tagline}</h2>
          <div className="mt-5 space-y-4 max-w-3xl">
            {c.intro.map((p) => (
              <p key={p.slice(0, 40)} className="text-sm md:text-base text-foreground/75 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </Reveal>

        {/* Highlights */}
        <section className="mt-14">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Ce primești, pe scurt" : "What you get, in short"}
            </h2>
          </Reveal>
          <div className="mt-7 grid sm:grid-cols-2 gap-4">
            {c.highlights.map((h, i) => {
              const Icon = ICONS[h.icon];
              return (
                <Reveal key={h.title} delay={i * 60} as="article">
                  <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:bg-foreground/[0.06]">
                    <div className={`size-10 rounded-xl bg-gradient-to-br ${a.from} ${a.to} grid place-items-center text-white transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <h3 className="mt-4 font-display font-bold">{h.title}</h3>
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{h.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Deliverables */}
        <section className="mt-14">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Include în pachet" : "Included in the package"}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur">
              {c.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-foreground/85">
                  <Check className={`size-4 mt-0.5 shrink-0 ${a.text}`} aria-hidden />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* Process */}
        <section className="mt-14">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Cum lucrăm" : "How we work"}
            </h2>
          </Reveal>
          <ol className="mt-7 relative border-l border-foreground/15 pl-6 space-y-6">
            {c.process.map((step, i) => (
              <Reveal key={step.title} delay={i * 70} as="li">
                <span
                  aria-hidden
                  className={`absolute -left-[9px] mt-1 size-4 rounded-full bg-gradient-to-br ${a.from} ${a.to} ring-4 ring-background`}
                />
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-foreground/45">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-1 font-display font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-foreground/70 leading-relaxed max-w-2xl">{step.desc}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Întrebări frecvente" : "Frequently asked questions"}
            </h2>
          </Reveal>
          <div className="mt-6 space-y-3">
            {c.faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 50}>
                <details className="group rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-5 py-4 backdrop-blur transition-colors hover:border-foreground/20 open:border-foreground/25">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold list-none">
                    <span>{f.q}</span>
                    <span
                      aria-hidden
                      className={`shrink-0 grid place-items-center size-6 rounded-full border border-foreground/15 transition-transform duration-300 group-open:rotate-90 ${a.text}`}
                    >
                      <ArrowRight className="size-3.5" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-foreground/70 leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Reveal as="section" className="mt-16">
          <div className={`rounded-3xl border ${a.border} bg-gradient-to-br from-foreground/[0.06] to-transparent p-8 md:p-10 text-center backdrop-blur relative overflow-hidden`}>
            <div aria-hidden className={`absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full blur-3xl ${a.glow}`} />
            <div className="relative">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">{c.ctaTitle}</h2>
              <p className="mt-3 text-sm md:text-base text-foreground/70 max-w-xl mx-auto">{c.ctaDesc}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`${WHATSAPP}${encodeURIComponent(c.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
                <a
                  href="mailto:contact@avyron.ro"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-bold transition-colors"
                >
                  contact@avyron.ro
                </a>
                <Link
                  to={ro ? "/costurisiproduse" : "/en/pricing"}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-6 py-3 text-sm font-semibold hover:bg-foreground/[0.1] transition-colors"
                >
                  {ro ? "Vezi toate prețurile" : "See all pricing"}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Related products */}
        <section className="mt-16">
          <Reveal>
            <h2 className="font-display text-xl md:text-2xl font-extrabold">
              {ro ? "Alte produse Avyron" : "Other Avyron products"}
            </h2>
          </Reveal>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.map((p, i) => {
              const Icon = ICONS[p.icon];
              const oc = p.copy[lang];
              return (
                <Reveal key={p.key} delay={i * 50}>
                  <Link
                    to={p.path[lang]}
                    className="group flex h-full flex-col rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25"
                  >
                    <div className={`size-9 rounded-lg bg-gradient-to-br ${p.accent.from} ${p.accent.to} grid place-items-center text-white`}>
                      <Icon className="size-4.5" aria-hidden />
                    </div>
                    <h3 className="mt-3 font-display font-bold text-sm">{oc.name}</h3>
                    <p className="mt-1 text-xs text-foreground/60 leading-relaxed flex-1">{oc.tagline}</p>
                    <span className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${p.accent.text}`}>
                      {ro ? "Detalii" : "Details"}
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProductPage;
