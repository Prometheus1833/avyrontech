import { useEffect } from "react";
import { useLang } from "@/i18n/LanguageContext";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import Footer from "@/components/site/Footer";
import QuickNav, { type QuickNavItem } from "@/components/site/QuickNav";
import logo from "@/assets/avyron-logo.jpg";
import ScrollProgress from "@/components/blogpro/ScrollProgress";
import ScrollNudges from "@/components/blogpro/ScrollNudges";
import BlogProHero from "@/components/blogpro/BlogProHero";
import { BlogAudiences, ContentJourney } from "@/components/blogpro/Story";
import { CmsExperience, ReaderExperience } from "@/components/blogpro/Product";
import { ContentArchitecture, SeoEngine } from "@/components/blogpro/SeoSection";
import { AiSection, AnalyticsSection, ConversionFlow, Integrations } from "@/components/blogpro/Growth";
import {
  DeviceExperience,
  IncludedFeatures,
  ProcessTimeline,
  TechnicalQuality,
} from "@/components/blogpro/Foundations";
import Configurator from "@/components/blogpro/Configurator";
import {
  AvyronBlogPreview,
  BlogFaq,
  ContentServices,
  FAQ_ITEMS,
  FinalCta,
} from "@/components/blogpro/Closing";

const PATHS = { ro: "/produse/blog-profesional", en: "/en/products/professional-blog" };

const meta = {
  ro: {
    title: "Creare Blog Profesional & Content Hub | AVYRON",
    description:
      "Blog profesional și content hub cu CMS propriu, SEO tehnic, analytics și module AI opționale. Configurează-ți platforma editorială și vezi estimarea de preț, de la 1.500 lei.",
    name: "Creare blog profesional și content hub",
  },
  en: {
    title: "Professional Blog & Content Hub Development | AVYRON",
    description:
      "A professional blog and content hub with its own CMS, technical SEO, analytics and optional AI modules. Configure your editorial platform and see the price estimate.",
    name: "Professional blog and content hub development",
  },
} as const;

const quickNav = {
  ro: [
    { id: "prezentare", label: "Prezentare" },
    { id: "pentru-cine", label: "Pentru cine" },
    { id: "cms", label: "CMS" },
    { id: "seo", label: "SEO" },
    { id: "conversie", label: "Conversie" },
    { id: "configurator-blog", label: "Preț" },
    { id: "faq", label: "Întrebări" },
  ],
  en: [
    { id: "prezentare", label: "Overview" },
    { id: "pentru-cine", label: "Who it's for" },
    { id: "cms", label: "CMS" },
    { id: "seo", label: "SEO" },
    { id: "conversie", label: "Conversion" },
    { id: "configurator-blog", label: "Pricing" },
    { id: "faq", label: "FAQ" },
  ],
} as const;

const BlogProfessional = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const m = meta[lang];

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, faqPageLd }]) => {
        setPageMeta({
          title: m.title,
          description: m.description,
          path: PATHS[lang],
          alternates: PATHS,
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-service",
          serviceLd({ name: m.name, description: m.description, path: PATHS[lang] }),
        );
        setJsonLd("ld-product", {
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `https://avyron.ro${PATHS[lang]}#product`,
          name: m.name,
          description: m.description,
          url: `https://avyron.ro${PATHS[lang]}`,
          brand: { "@type": "Brand", name: "Avyron" },
          category: ro ? "Servicii web / Blog profesional" : "Web services / Professional blog",
          offers: {
            "@type": "Offer",
            price: BASE_PRICE,
            priceCurrency: "RON",
            availability: "https://schema.org/InStock",
            url: `https://avyron.ro${PATHS[lang]}`,
            seller: { "@id": "https://avyron.ro/#organization" },
          },
        });
        setJsonLd("ld-faq", faqPageLd([...FAQ_ITEMS[lang]]));

        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Costuri & Produse" : "Pricing & Products", path: ro ? "/costurisiproduse" : "/en/pricing" },
            { name: m.name, path: PATHS[lang] },
          ]),
        );
      },
    );
  }, [lang, ro, m]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <ScrollNudges />

      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <PageBackLink
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la produse" : "Back to products"}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="h-3 w-px bg-foreground/15" />
              <CurrencySwitch compact showDetails={false} />
              <span aria-hidden className="h-3 w-px bg-foreground/15" />
              <ThemeToggle />
            </div>
            <a
              href={ro ? "/#hero" : "/en#hero"}
              aria-label={ro ? "Acasă" : "Home"}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-foreground/5"
            >
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 rounded-md ring-1 ring-foreground/15 sm:size-8" />
              <span className="font-display text-xs tracking-[0.2em] sm:text-sm">AVYRON</span>
            </a>
          </div>
        </div>

        <Breadcrumbs
          className="mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Costuri & Produse" : "Pricing & Products", path: ro ? "/costurisiproduse" : "/en/pricing" },
            { name: ro ? "Blog Profesional" : "Professional Blog", path: PATHS[lang] },
          ]}
        />
      </div>

      <BlogProHero />
      <ContentJourney />
      <BlogAudiences />
      <CmsExperience />
      <ReaderExperience />
      <SeoEngine />
      <ContentArchitecture />
      <ConversionFlow />
      <AnalyticsSection />
      <AiSection />
      <Integrations />
      <DeviceExperience />
      <TechnicalQuality />
      <ProcessTimeline />
      <IncludedFeatures />
      <Configurator />
      <ContentServices />
      <AvyronBlogPreview />
      <BlogFaq />
      <FinalCta />

      <QuickNav items={quickNav[lang] as unknown as QuickNavItem[]} />
      <Footer />
    </main>
  );
};

export default BlogProfessional;
