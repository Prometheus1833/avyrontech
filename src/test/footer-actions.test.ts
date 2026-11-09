import { describe, expect, it } from "vitest";
import { footerAction } from "@/components/site/footerActions";
import { SERVICE_ROUTES } from "@/data/serviceRoutes";

const home = { ctaLabel: "Exemplu Gratuit", ctaSub: "Personalizat" };
describe("footer next steps", () => {
  it.each(["/", "/en", "/en/", "///"])("preserves the landing action on %s", path => {
    expect(footerAction(path, "ro", home)).toMatchObject({ page: "home", to: "#cta", label: home.ctaLabel, sub: home.ctaSub });
  });
  it.each([
    [SERVICE_ROUTES.websiteSubscription, "#website-brief"],
    [SERVICE_ROUTES.website, "#contact"],
    [SERVICE_ROUTES.onlineStore, "#contact"],
    [SERVICE_ROUTES.socialIdentity, "#contact"],
    [SERVICE_ROUTES.apps, "#contact"],
    [SERVICE_ROUTES.automationAi, "#contact"],
    [SERVICE_ROUTES.professionalBlog, "#configurator-blog"],
    [SERVICE_ROUTES.logo3d, "#contact"],
    [SERVICE_ROUTES.logoStudio, "#brief"],
    [SERVICE_ROUTES.qa, "#cta"],
    [SERVICE_ROUTES.seoAi, "#growth-cta-title"],
    [SERVICE_ROUTES.digitalMarketing, "#growth-cta-title"],
    [SERVICE_ROUTES.home, "#cta"],
  ] as const)("keeps %j inside its own workflow", (routes, target) => {
    for (const lang of ["ro", "en"] as const) {
      expect(footerAction(`${routes[lang]}/`, lang, home)?.to).toBe(target);
    }
  });
  it.each([
    ["/blog/despre-noi", "/blog"], ["/en/blog/about", "/en/blog"],
    ["/produse/unelte/blog", "/produse"], ["/en/products/tools/portfolio", "/en/products"],
    ["/produse", "/produse/ghid"], ["/en/products", "/en/products/guide"],
    ["/produse/ghid", "/produse"], ["/en/products/guide", "/en/products"],
  ])("does not mistake a slug in %s for a different page", (path, target) => {
    expect(footerAction(path, path.startsWith("/en/") ? "en" : "ro", home)?.to).toBe(target);
  });
  it.each(["/blog", "/en/blog", "/gdpr", "/en/privacy", "/termeni", "/en/terms", "/politica-cookies", "/en/cookie-policy", "/profil", "/intern", "/servicii/inexistent", "/en/services/unknown"])("does not invent an offer or a local anchor on %s", path => {
    expect(footerAction(path, "ro", home)).toBeNull();
  });
});
