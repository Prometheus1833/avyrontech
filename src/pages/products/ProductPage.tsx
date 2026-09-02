import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accessibility,
  ArrowRight,
  BarChart3,
  Bug,
  Check,
  FlaskConical,

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
import PageBackLink from "@/components/site/PageBackLink";
import Reveal from "@/components/site/Reveal";
import NotFound from "@/pages/NotFound";
import logo from "@/assets/avyron-logo.jpg";
import { trackEvent } from "@/lib/analytics";
import Footer from "@/components/site/Footer";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import { useCurrency } from "@/hooks/useCurrency";
import PaymentMethods from "@/components/site/PaymentMethods";

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
  bug: Bug,
  flask: FlaskConical,
  clock: Clock,

};

const WHATSAPP = "https://wa.me/40734605055?text=";

const ProductPage = () => {
  const { pathname } = useLocation();
  const { lang } = useLang();
  const ro = lang === "ro";
  const { formatEur } = useCurrency(ro ? "ro-RO" : "en-IE");
  const product = getProductByPath(pathname);

  useEffect(() => {
    if (!product) return;
    window.scrollTo(0, 0);
    const c = product.copy[lang];
    const path = product.path[lang];
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, productLd, faqPageLd }]) => {
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
        setJsonLd(
          "ld-product",
          productLd({
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
  // The audit is intentionally available only from the complete product overview,
  // where its protected request flow has the necessary context and anti-spam checks.
  const others = PRODUCTS.filter((p) => p.key !== product.key && p.key !== "audit");

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
          <PageBackLink
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la produse" : "Back to products"}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="w-px h-3 bg-foreground/15" />
              <ThemeToggle />
            </div>
            <a
              href={ro ? "/#hero" : "/en#hero"}
              aria-label={ro ? "Acasă" : "Home"}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-foreground/5 transition-colors"
            >
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 sm:size-8 rounded-md ring-1 ring-foreground/15" />
              <span className="font-display tracking-[0.2em] text-xs sm:text-sm">AVYRON</span>
            </a>
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
        <section id="prezentare" className="mt-8 scroll-mt-28 text-center sm:mt-10">
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
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/75 md:text-lg">{c.heroLead}</p>

          <div data-testid="product-hero-actions" className="mx-auto mt-7 grid w-full max-w-lg grid-cols-2 gap-2 sm:gap-3">
            <a
              href={`${WHATSAPP}${encodeURIComponent(c.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "product_hero", product: product.key })}
              className={`group inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r ${a.from} ${a.to} px-2.5 py-2.5 text-center text-xs font-bold leading-tight text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 sm:rounded-full sm:px-5 sm:text-sm`}
            >
              {c.ctaButton}
              <ArrowRight className="size-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-1 sm:size-4" aria-hidden />
            </a>
            <Link
              to={ro ? "/costurisiproduse#cta" : "/en/pricing#cta"}
              className="inline-flex min-h-12 min-w-0 items-center justify-center rounded-2xl border border-foreground/20 bg-foreground/[0.05] px-2.5 py-2.5 text-center text-xs font-semibold leading-tight transition-colors hover:bg-foreground/[0.1] sm:rounded-full sm:px-5 sm:text-sm"
            >
              {ro ? "Cere ofertă" : "Request a quote"}
            </Link>
          </div>

          <dl data-testid="product-hero-facts" className="mx-auto mt-7 grid w-full max-w-xl grid-cols-3 gap-1.5 sm:gap-2">
            <div className={`flex min-w-0 flex-col items-center justify-center rounded-xl border px-1.5 py-2.5 text-center ${a.chipBg} ${a.chipText}`}>
              <dt className="text-[8px] font-semibold uppercase tracking-[0.12em] opacity-70 sm:text-[9px]">
                {ro ? "Investiție" : "Investment"}
              </dt>
              <dd className="mt-0.5 text-[10px] font-bold leading-tight sm:text-xs">
                {product.priceEur > 0 ? `${ro ? "de la" : "from"} ${formatEur(product.priceEur)}` : ro ? "Gratuit" : "Free"}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-foreground/15 bg-foreground/[0.04] px-1.5 py-2.5 text-center text-foreground/70">
              <dt className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.12em] sm:text-[9px]">
                <Clock className="size-3 shrink-0" aria-hidden />
                {ro ? "Durată" : "Duration"}
              </dt>
              <dd className="mt-0.5 text-[10px] font-bold leading-tight sm:text-xs">{product.duration[lang]}</dd>
            </div>
            <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-foreground/15 bg-foreground/[0.04] px-1.5 py-2.5 text-center text-foreground/70">
              <dt className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.12em] sm:text-[9px]">
                <Shield className="size-3 shrink-0" aria-hidden />
                {ro ? "Suport" : "Support"}
              </dt>
              <dd className="mt-0.5 text-[10px] font-bold leading-tight sm:text-xs">
                {ro ? "Conform ofertei" : "Per proposal"}
              </dd>
            </div>
          </dl>

          {product.priceEur > 0 && <CurrencySwitch compact className="mt-4" />}

          {c.heroStats && (
            <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {c.heroStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 md:backdrop-blur transition-colors duration-300 hover:border-foreground/25"
                >
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <span className={`block font-display text-xl sm:text-2xl font-extrabold bg-gradient-to-r ${a.from} ${a.to} bg-clip-text text-transparent`}>
                      {s.value}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-foreground/60">
                      {s.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>


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
        <section id="beneficii" className="mt-14 scroll-mt-28">
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
                  <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 md:backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:bg-foreground/[0.06]">
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

        {/* Audiences */}
        {c.audiences && (
          <section id="pentru-cine" className="mt-14 scroll-mt-28">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">{c.audiences.title}</h2>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-foreground/70 leading-relaxed">
                {c.audiences.lead}
              </p>
            </Reveal>
            <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {c.audiences.items.map((it, i) => {
                const Icon = ICONS[it.icon];
                return (
                  <Reveal key={it.title} delay={i * 50} as="article">
                    <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 md:backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:bg-foreground/[0.06]">
                      <div className={`inline-grid place-items-center size-9 rounded-lg border ${a.chipBg} ${a.chipText} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="size-4" aria-hidden />
                      </div>
                      <h3 className="mt-3 font-display font-bold text-sm">{it.title}</h3>
                      <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{it.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        {/* Technology */}
        {c.tech && (
          <section id="tehnologii" className="mt-14 scroll-mt-28">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">{c.tech.title}</h2>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-foreground/70 leading-relaxed">
                {c.tech.lead}
              </p>
            </Reveal>
            <div className="mt-7 grid sm:grid-cols-2 gap-4">
              {c.tech.groups.map((g, i) => (
                <Reveal key={g.name} delay={i * 60}>
                  <div className="h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 md:backdrop-blur">
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-foreground/45">
                      {g.name}
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {g.items.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-foreground/12 bg-foreground/[0.05] px-3 py-1.5 text-xs text-foreground/80"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Deliverables */}
        <section id="pachet" className="mt-14 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Include în pachet" : "Included in the package"}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 md:backdrop-blur">
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
        <section id="proces" className="mt-14 scroll-mt-28">
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

        {/* Post-launch advice */}
        {c.advice && (
          <section id="consiliere" className="mt-14 scroll-mt-28">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">{c.advice.title}</h2>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-foreground/70 leading-relaxed">
                {c.advice.lead}
              </p>
            </Reveal>
            <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {c.advice.items.map((it, i) => (
                <Reveal key={it.title} delay={i * 50} as="article">
                  <div className="h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 md:backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25">
                    <div className={`text-[10px] font-mono uppercase tracking-[0.25em] ${a.text}`}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-2 font-display font-bold text-sm">{it.title}</h3>
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{it.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}


        {/* FAQ */}
        <section id="faq" className="mt-14 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Întrebări frecvente" : "Frequently asked questions"}
            </h2>
          </Reveal>
          <div className="mt-6 space-y-3">
            {c.faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 50}>
                <details className="group rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-5 py-4 md:backdrop-blur transition-colors hover:border-foreground/20 open:border-foreground/25">
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

        {/* Payment methods */}
        <Reveal as="div" className="mt-12">
          <PaymentMethods compact />
        </Reveal>

        {/* CTA */}
        <Reveal as="section" id="contact" className="mt-12 scroll-mt-28">
          <div className={`rounded-3xl border ${a.border} bg-gradient-to-br from-foreground/[0.06] to-transparent p-8 md:p-10 text-center md:backdrop-blur relative overflow-hidden`}>
            <div aria-hidden className={`absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full blur-3xl ${a.glow}`} />
            <div className="relative">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">{c.ctaTitle}</h2>
              <p className="mt-3 text-sm md:text-base text-foreground/70 max-w-xl mx-auto">{c.ctaDesc}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`${WHATSAPP}${encodeURIComponent(c.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "product_cta", product: product.key })}
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
                <a
                  href="mailto:contact@avyron.ro"
                  onClick={() => trackEvent("contact_click", { method: "email", location: "product_cta", product: product.key })}
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
            <h2 className="text-center font-display text-xl font-extrabold md:text-2xl">
              {ro ? "Alte produse Avyron" : "Other Avyron products"}
            </h2>
          </Reveal>
          <div data-testid="related-product-list" className="mt-5 grid gap-2 sm:grid-cols-2">
            {others.map((p, i) => {
              const Icon = ICONS[p.icon];
              const oc = p.copy[lang];
              return (
                <Reveal key={p.key} delay={i * 50}>
                  <Link
                    to={p.path[lang]}
                    className="group grid min-h-16 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-foreground/[0.06]"
                  >
                    <div className={`grid size-9 place-items-center rounded-lg bg-gradient-to-br ${p.accent.from} ${p.accent.to} text-white`}>
                      <Icon className="size-4.5" aria-hidden />
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="truncate font-display text-sm font-bold">{oc.name}</h3>
                      <p className="mt-0.5 truncate text-[11px] text-foreground/55">{oc.tagline}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${p.accent.text}`}>
                      <span className="hidden min-[370px]:inline">{ro ? "Detalii" : "Details"}</span>
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
};

export default ProductPage;
