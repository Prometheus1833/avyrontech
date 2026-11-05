import { AUDIT_INLINE_COPY } from "./managedServiceCopy/inline-audit";
// Build-time projection only. The dashboard and Worker consume the generated manifest.
import { SERVICE_PAGES, serviceTextFields } from "@/shared/servicePagePolicy";
import { SERVICES } from "./services";
import {
  ORDERED_SERVICES,
  AUDIT_COVERAGE,
} from "./managedServiceCopy/overview";
import { GROWTH_SERVICES } from "./growthServices";
import { LOGO_PAGE_COPY } from "./managedServiceCopy/logo";
import { QA_PAGE_COPY } from "./managedServiceCopy/qa";
import { meta } from "./managedServiceCopy/blogMeta";
import * as blogBlogProHero from "./managedServiceCopy/blogBlogProHero";
import * as blogStory from "./managedServiceCopy/blogStory";
import * as blogProduct from "./managedServiceCopy/blogProduct";
import * as blogSeoSection from "./managedServiceCopy/blogSeoSection";
import * as blogGrowth from "./managedServiceCopy/blogGrowth";
import * as blogFoundations from "./managedServiceCopy/blogFoundations";
import * as blogClosing from "./managedServiceCopy/blogClosing";
import { SERVICE_INLINE_OVERVIEW } from "./managedServiceCopy/inline-overview";
import { SERVICE_INLINE_GENERIC } from "./managedServiceCopy/inline-generic";
import { SERVICE_INLINE_GROWTH } from "./managedServiceCopy/inline-growth";
import { SERVICE_INLINE_QA } from "./managedServiceCopy/inline-qa";
import { SERVICE_INLINE_BLOG } from "./managedServiceCopy/inline-blog";
export const serviceContentManifest = Object.fromEntries(
  SERVICE_PAGES.map((page) => {
    const values: Record<string, string> = {};
    const add = (prefix: string, source: unknown) =>
      Object.assign(values, serviceTextFields(source, prefix));
    const service = SERVICES.find((service) => service.key === page.key);
    if (
      [
        "premium-website",
        "online-store",
        "apps",
        "ai-agent",
        "social-identity",
      ].includes(page.key)
    ) {
      add("service", service);
      add("inline", SERVICE_INLINE_GENERIC);
    }
    if (page.key === "overview") {
      add("services", ORDERED_SERVICES);
      add("inline", SERVICE_INLINE_OVERVIEW);
    }
    if (page.key === "audit") {
      add("coverage", AUDIT_COVERAGE);
      add("inline", AUDIT_INLINE_COPY);
    }
    if (page.key === "logo-3d") add("logo", LOGO_PAGE_COPY);
    if (page.key === "qa-testing") {
      add("qa", QA_PAGE_COPY);
      add("inline", SERVICE_INLINE_QA);
    }
    if (page.key === "seo-ai" || page.key === "marketing-ads") {
      add("growth", GROWTH_SERVICES[page.key]);
      add("inline", SERVICE_INLINE_GROWTH);
    }
    if (page.key === "blog-profesional") {
      add("meta", meta);
      add("inline", SERVICE_INLINE_BLOG);
      for (const [prefix, source] of Object.entries({
        blogBlogProHero,
        blogStory,
        blogProduct,
        blogSeoSection,
        blogGrowth,
        blogFoundations,
        blogClosing,
      }))
        for (const [name, value] of Object.entries(source))
          add(prefix + "." + name, value);
    }
    return [page.key, { ...page, values }];
  }),
);
