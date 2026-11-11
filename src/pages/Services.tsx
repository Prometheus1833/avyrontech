import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import {AUDIT_INLINE_COPY} from "@/data/managedServiceCopy/inline-audit";
import logo from "@/assets/avyron-logo.jpg";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Footer from "@/components/site/Footer";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";
import PaymentMethods from "@/components/site/PaymentMethods";
import QuickNav from "@/components/site/QuickNav";
import ThemeToggle from "@/components/site/ThemeToggle";
import { SERVICE_INLINE_OVERVIEW } from '@/data/managedServiceCopy/inline-overview';
import { AUDIT_COVERAGE,ORDERED_SERVICES,SERVICE_SUMMARY_LIMIT,type Copy,type ServiceDef } from '@/data/managedServiceCopy/overview';
import { SUBSCRIPTION_CATEGORIES,SUBSCRIPTION_PATH } from "@/data/subscriptionPlans";
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";
import { trackEvent } from "@/lib/analytics";
import {
ArrowRight,
Check,
Hourglass,
LibraryBig,
MessageCircle,
RefreshCw,ScanSearch,
ShoppingBag
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const t = (copy: Copy, lang: Lang) => copy[lang];

type ServiceBlockProps = {
  service: ServiceDef;
  lang: Lang;
  benefitsLabel: string;
  detailsLabel: string;
};

const ServiceBlock = ({ service, lang, benefitsLabel, detailsLabel }: ServiceBlockProps) => {
  const title = t(service.title, lang);
  const a = service.accent;

  return (
    <section
      id={service.key}
      data-service={service.key}
      data-testid="service-card"
      aria-labelledby={`service-${service.key}-title`}
      className={`group relative isolate scroll-mt-28 overflow-hidden rounded-2xl border ${a.border} bg-card/80 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.tile}`} />
      <div aria-hidden className={`pointer-events-none absolute -left-12 -top-16 size-40 rounded-full ${a.glow} blur-3xl`} />

      <div className="relative grid md:grid-cols-5">
        <div className="min-w-0 p-4 sm:p-5 md:col-span-2">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${a.tile} shadow-sm sm:size-12`}>
              <service.icon className="size-5 text-white sm:size-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className={`inline-flex rounded-full border ${a.pill} px-2.5 py-0.5 text-[10px] font-semibold tracking-wide`}>
                {t(service.badge, lang)}
              </p>
              <h2 id={`service-${service.key}-title`} className="mt-1 font-display text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
                {title}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-snug text-foreground/80">{t(service.tagline, lang)}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{t(service.desc, lang)}</p>
          <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border ${a.border} bg-foreground/[0.04] px-2.5 py-1 text-xs text-foreground/75`}>
            <Hourglass className="size-3.5 shrink-0" aria-hidden />
            {t(service.time, lang)}
          </div>
        </div>

        <div className="min-w-0 border-t border-foreground/10 bg-foreground/[0.025] p-4 sm:p-5 md:col-span-3 md:border-l md:border-t-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${a.check}`}>
              <Check className="size-4" aria-hidden />
            </span>
            <h3 className="text-sm font-semibold text-foreground/90">{benefitsLabel}</h3>
            <span className="text-xs text-foreground/65">{t(service.includes, lang)}</span>
          </div>

          <ul className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {service.features.slice(0, SERVICE_SUMMARY_LIMIT).map((feature) => (
              <li key={feature.text[lang]} className="flex items-start gap-2 text-sm leading-snug text-foreground/85">
                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ${a.check}`}>
                  <feature.icon className="size-3.5" aria-hidden />
                </span>
                <span>{t(feature.text, lang)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-stretch gap-2 border-t border-foreground/10 pt-3">
            <Link
              to={t(service.details, lang)}
              aria-label={`${detailsLabel}: ${title}`}
              onClick={() => trackEvent("product_details_click", { product: service.details.ro })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-4 py-2 text-sm font-semibold after:absolute after:inset-0 after:z-10 after:cursor-pointer after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand group-hover:border-foreground/35 group-hover:bg-foreground/[0.08]"
            >
              {detailsLabel}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <a
              href={`https://wa.me/40734605055?text=${encodeURIComponent(t(service.wa, lang))}`}
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: service.analytics })}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-left text-sm font-semibold text-foreground/90 transition-colors hover:border-brand/40 hover:bg-brand/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden />
              {t(service.cta, lang)}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  const serviceInlineCopy = useServicePageContent("overview", "inline", SERVICE_INLINE_OVERVIEW);

  const { lang } = useLang();
  const ro = lang === "ro";
  const managedServices = useServicePageContent("overview", "services", ORDERED_SERVICES);
  const auditInlineCopy = useServicePageContent("audit","inline",AUDIT_INLINE_COPY);
  const managedAuditCoverage = useServicePageContent("audit", "coverage", AUDIT_COVERAGE);

  useEffect(() => {window.scrollTo(0, 0);},[ro]);
  useEffect(() => {
    const title = (ro ? serviceInlineCopy.text_6e55cf371675.ro : serviceInlineCopy.text_6e55cf371675.en);
    const description = (ro ? serviceInlineCopy.text_f1dca133fcab.ro : serviceInlineCopy.text_f1dca133fcab.en);
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path: ro ? "/servicii" : "/en/services",
          alternates: { ro: "/servicii", en: "/en/services" },
          imageAlt: ro
            ? "Servicii digitale AVYRON pentru afaceri"
            : "AVYRON digital services for businesses",
        });

        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Servicii AVYRON" : "AVYRON Services",
              path: ro ? "/servicii" : "/en/services",
            },
          ]),
        );
      },
    );
  }, [ro,serviceInlineCopy]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <QuickNav
        items={[
          { id: "prezentare", label: ro ? "Servicii" : "Services", icon: ShoppingBag },
          ...managedServices.map((service) => ({
            id: service.key,
            label: service.title[lang],
            icon: service.icon,
          })),
          { id: "audit", label: ro ? "Audit gratuit" : "Free audit", icon: ScanSearch },
          { id: "abonamente", label: ro ? "Abonamente" : "Plans", icon: RefreshCw },
          {
            id: "biblioteca",
            label: ro ? "Bibliotecă" : "Library",
            icon: LibraryBig,
            href: ro ? "/biblioteca" : "/en/library",
          },
          { id: "cta", label: ro ? "Contact" : "Contact", icon: MessageCircle },
        ]}
      />
      {/* PS-style background: starfield + grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,112,243,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.18),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pb-14 sm:pt-6">
        {/* Top bar */}
        <nav
          aria-label={ro ? "Acțiuni pagină servicii" : "Services page actions"}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3"
        >
          <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} />

          <a
            href={ro ? "/#hero" : "/en#hero"}
            aria-label={ro ? "Acasă Avyron" : "Avyron home"}
            className="flex min-w-0 items-center justify-self-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-foreground/5"
          >
            <img src={logo} alt="Avyron" width={32} height={32} className="size-7 rounded-md ring-1 ring-white/20 sm:size-8" />
            <span className="hidden font-display text-xs tracking-[0.2em] min-[380px]:inline sm:text-sm sm:tracking-[0.25em]">AVYRON</span>
          </a>

          <div className="inline-flex min-h-9 items-center justify-self-end gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
            <LangSwitch />
            <span aria-hidden className="h-3 w-px bg-foreground/15" />
            <ThemeToggle />
          </div>
        </nav>

        <Breadcrumbs
          className="mt-3 sm:mt-4"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Servicii AVYRON" : "AVYRON Services",
              path: ro ? "/servicii" : "/en/services",
            },
          ]}
        />

        {/* Hero */}
        <section id="prezentare" className="mx-auto mt-7 max-w-4xl scroll-mt-28 text-center sm:mt-9">
          <h1 className="px-1 font-display text-3xl font-extrabold leading-[1.06] tracking-tight [text-wrap:balance] sm:text-4xl lg:text-6xl">
            <span className="bg-gradient-to-r from-foreground via-cyan-500 to-blue-600 dark:from-white dark:via-cyan-200 dark:to-blue-400 bg-clip-text text-transparent">
              {(ro ? serviceInlineCopy.text_27ffd8864364.ro : serviceInlineCopy.text_27ffd8864364.en)}
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-[60ch] font-display text-lg font-medium leading-[1.4] tracking-[-0.028em] text-foreground/80 [text-wrap:pretty] sm:mt-4 sm:text-[clamp(1.2rem,2.3vw,1.6rem)]">
            {(ro ? serviceInlineCopy.text_18abb00a157f.ro : serviceInlineCopy.text_18abb00a157f.en)}
          </p>
        </section>

        {/* All services — one uniform block each */}
        <div data-testid="services-list" className="mt-6 grid gap-3.5 sm:mt-7 sm:gap-4">
          {managedServices.map((service) => (
            <ServiceBlock
              key={service.key}
              service={service}
              lang={lang}
              benefitsLabel={serviceInlineCopy.text_e30901dfd72e[lang]}
              detailsLabel={serviceInlineCopy.text_a114de105a0e[lang]}
            />
          ))}
        </div>

        {/* Audit — last in the service list; the request continues in the protected form. */}
        <section
          id="audit"
          data-testid="free-audit-card"
          className="relative mt-4 scroll-mt-28 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-400/[0.08] via-card to-orange-500/[0.06] p-4"
        >
          <div aria-hidden className="absolute -right-10 -top-12 size-36 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                <ScanSearch className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-base font-extrabold sm:text-lg">
                  {(ro ? auditInlineCopy.text_bfb0995a9320.ro : auditInlineCopy.text_bfb0995a9320.en)}
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-foreground/70 sm:text-sm">
                  {(ro ? auditInlineCopy.text_7f0be9beffbb.ro : auditInlineCopy.text_7f0be9beffbb.en)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ul data-testid="audit-coverage-list" className="flex flex-wrap items-center gap-1.5">
                {managedAuditCoverage.map((item) => (
                  <li key={item[lang]} className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-[11px] text-foreground/70">
                    {t(item, lang)}
                  </li>
                ))}
              </ul>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground/60">
                <Hourglass className="size-3.5" aria-hidden />
                {(ro ? auditInlineCopy.text_0098d765db9f.ro : auditInlineCopy.text_0098d765db9f.en)}
              </span>
              <Link
                to={ro ? "/?request=audit#cta" : "/en?request=audit#cta"}
                onClick={() => trackEvent("audit_form_click", { location: "pricing_product" })}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {(ro ? auditInlineCopy.text_22ade5a44ee6.ro : auditInlineCopy.text_22ade5a44ee6.en)}
              </Link>
            </div>
          </div>
        </section>

        {/* Subscriptions — one short pointer, plans are split per service */}
        <section
          id="abonamente"
          data-testid="subscriptions-teaser"
          className="mt-5 scroll-mt-28 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/[0.10] via-card to-cyan-400/[0.06] p-5 sm:p-6"
        >
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
                <RefreshCw className="size-3.5" aria-hidden />
                {(ro ? serviceInlineCopy.text_60602f51b9da.ro : serviceInlineCopy.text_60602f51b9da.en)}
              </span>
              <h2 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">
                {(ro ? serviceInlineCopy.text_cac0e58edc4e.ro : serviceInlineCopy.text_cac0e58edc4e.en)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/70">
                {(ro ? serviceInlineCopy.text_1f257c6c097c.ro : serviceInlineCopy.text_1f257c6c097c.en)}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {SUBSCRIPTION_CATEGORIES.map((category) => (
                  <li key={category.key}>
                    <Link
                      to={`${SUBSCRIPTION_PATH[lang]}#abonamente-${category.key}`}
                      onClick={() => trackEvent("subscription_anchor_click", { category: category.key })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium text-foreground/75 transition-colors hover:border-brand/40 hover:text-foreground"
                    >
                      {category.copy[lang].title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to={SUBSCRIPTION_PATH[lang]}
              onClick={() => trackEvent("subscriptions_click", { location: "services" })}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
            >
              {(ro ? serviceInlineCopy.text_270cfedb3107.ro : serviceInlineCopy.text_270cfedb3107.en)}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </section>

        {/* Product handover note */}
        <section className="mt-5 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
          <p className="text-sm md:text-base text-foreground/75 leading-relaxed">
            {(ro ? serviceInlineCopy.text_a8439fc869c7.ro : serviceInlineCopy.text_a8439fc869c7.en)}
          </p>
        </section>

        {/* Payments */}
        <div className="mt-5">
          <PaymentMethods />
        </div>

        {/* CTA */}
        <section id="cta" className="relative mt-6 scroll-mt-28 overflow-hidden rounded-3xl border border-foreground/10 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-pink-500/15 p-5 text-center sm:p-8">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold">
            {(ro ? serviceInlineCopy.text_315a459dbbf7.ro : serviceInlineCopy.text_315a459dbbf7.en)}
          </h2>
          <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
            {(ro ? serviceInlineCopy.text_e897d726029e.ro : serviceInlineCopy.text_e897d726029e.en)}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/40734605055"
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_footer" })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-slate-950 transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="mailto:contact@avyron.ro"
              onClick={() => trackEvent("contact_click", { method: "email", location: "pricing_footer" })}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-bold transition-colors"
            >
              contact@avyron.ro
            </a>
            <Link
              to="/#exemple"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 px-6 py-3 text-sm font-bold transition-colors"
            >
              {(ro ? serviceInlineCopy.text_49fd39229a0f.ro : serviceInlineCopy.text_49fd39229a0f.en)}
            </Link>
            <a
              href="tel:+40734605055"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.06] hover:bg-foreground/[0.12] px-6 py-3 text-sm font-bold text-foreground transition-colors"
            >
              {(ro ? serviceInlineCopy.text_22b19f4a6859.ro : serviceInlineCopy.text_22b19f4a6859.en)}
            </a>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
};

export default function ManagedServices(){return <ServiceContentProvider><Services/></ServiceContentProvider>;}
