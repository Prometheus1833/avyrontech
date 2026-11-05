import PortfolioCarousel from "@/components/site/PortfolioCarousel";
import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import BlogPreloader from "@/components/blogpro/BlogPreloader";
import LibraryLink from "@/components/site/LibraryLink";
import { FAQ_ITEMS } from "@/data/managedServiceCopy/blogClosing";
import { meta } from '@/data/managedServiceCopy/blogMeta';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import { trackFunnel } from "@/lib/siteAnalytics";
import { useCallback,useEffect,useState } from "react";

import logo from "@/assets/avyron-logo.jpg";
import BlogProHero from "@/components/blogpro/BlogProHero";
import {
AvyronBlogPreview,
BlogFaq,
ContentServices,
FinalCta,
} from "@/components/blogpro/Closing";
import Configurator from "@/components/blogpro/Configurator";
import {
DeviceExperience,
IncludedFeatures,
ProcessTimeline,
TechnicalQuality,
} from "@/components/blogpro/Foundations";
import { AiSection,AnalyticsSection,ConversionFlow,Integrations } from "@/components/blogpro/Growth";
import { CmsExperience,ReaderExperience } from "@/components/blogpro/Product";
import ScrollNudges from "@/components/blogpro/ScrollNudges";
import ScrollProgress from "@/components/blogpro/ScrollProgress";
import { ContentArchitecture,SeoEngine } from "@/components/blogpro/SeoSection";
import { BlogAudiences,ContentJourney } from "@/components/blogpro/Story";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import FloatingWhatsApp from "@/components/site/FloatingWhatsApp";
import Footer from "@/components/site/Footer";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";
import QuickNav,{ type QuickNavItem } from "@/components/site/QuickNav";
import PlanTeaser from "@/components/site/subscriptions/PlanTeaser";
import ThemeToggle from "@/components/site/ThemeToggle";
import { categoryByKey } from "@/data/subscriptionPlans";

const PATHS = { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" };



const quickNav = {
  ro: [
    { id: "prezentare", label: "Prezentare" },
    { id: "pentru-cine", label: "Pentru cine" },
    { id: "cms", label: "CMS" },
    { id: "seo", label: "SEO" },
    { id: "conversie", label: "Conversie" },
    { id: "configurator-blog", label: "Preț" },
    { id: "faq", label: "Întrebări" },
    { id: "abonamente", label: "Abonamente" },
  ],
  en: [
    { id: "prezentare", label: "Overview" },
    { id: "pentru-cine", label: "Who it's for" },
    { id: "cms", label: "CMS" },
    { id: "seo", label: "SEO" },
    { id: "conversie", label: "Conversion" },
    { id: "configurator-blog", label: "Pricing" },
    { id: "faq", label: "FAQ" },
    { id: "abonamente", label: "Plans" },
  ],
} as const;

const BlogProfessional = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const m = useServicePageContent("blog-profesional","meta",meta)[lang];
  const managedFaq = useServicePageContent("blog-profesional","blogClosing.FAQ_ITEMS",FAQ_ITEMS);
  /* The intro is decorative: content stays in the DOM for users and crawlers. */
  const [introDone, setIntroDone] = useState(() => typeof window === "undefined");
  const [showIntro, setShowIntro] = useState(() => typeof window !== "undefined");
  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    /* Keep the canvas mounted through its fade so the handoff has no hard cut. */
    window.setTimeout(() => setShowIntro(false), 500);
  }, []);



  useEffect(() => {window.scrollTo(0, 0);}, [lang]);
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
        setJsonLd("ld-faq", faqPageLd([...managedFaq[lang]]));

        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Servicii AVYRON" : "AVYRON Services", path: ro ? "/servicii" : "/en/services" },
            { name: m.name, path: PATHS[lang] },
          ]),
        );
      },
    );
  }, [lang, ro, m, managedFaq]);

  const blogPlans = categoryByKey("blog");

  /* Vizită de pagină numărată în baza noastră (și în GA4). */
  useEffect(() => {
    trackFunnel("page_view", "blogpro", { product: "blog_profesional" });
  }, []);

  return (
    <main
      className="min-h-screen overflow-x-clip bg-background text-foreground"
      data-hero-enter={introDone ? "in" : "pending"}
    >
      {showIntro && <BlogPreloader onDone={handleIntroDone} />}
      <ScrollProgress />
      <ScrollNudges />


      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <PageBackLink
            to={ro ? "/servicii" : "/en/services"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la servicii" : "Back to services"}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
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
            { name: ro ? "Servicii AVYRON" : "AVYRON Services", path: ro ? "/servicii" : "/en/services" },
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

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <LibraryLink />
      </div>

      {/* Abonamentele de mentenanță pentru blog, deasupra subsolului */}
      {blogPlans && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <PlanTeaser
            category={blogPlans}
            accent={{
              from: "from-amber-400",
              to: "to-orange-600",
              text: "text-amber-600 dark:text-amber-300",
              border: "border-amber-300/30",
            }}
            productName={ro ? "blogul tău" : "your blog"}
            productKey="blog-professional"
          />
        </div>
      )}

      <QuickNav items={quickNav[lang] as unknown as QuickNavItem[]} showLang />
      <FloatingWhatsApp />
      <div className="mx-auto max-w-5xl px-4"><PortfolioCarousel lang={ro ? "ro" : "en"} carouselKey={"blog-profesional"} /></div>
      <Footer />
    </main>
  );
};

export default function ManagedBlogProfessional(){return <ServiceContentProvider><BlogProfessional/></ServiceContentProvider>;}
