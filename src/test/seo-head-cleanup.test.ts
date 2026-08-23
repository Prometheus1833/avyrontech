// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { setPageMeta, setJsonLd, resetManagedHead } from "@/lib/seo";
import { productLd, organizationLd, breadcrumbLd } from "@/lib/structuredData";

const graph = () => {
  const el = document.getElementById("ld-graph");
  return el ? JSON.parse(el.textContent!)["@graph"] : [];
};
const types = () => graph().map((n: { "@type": string }) => n["@type"]);

describe("SPA head cleanup between routes", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    resetManagedHead();
  });

  it("drops Product schema and stale alternates when leaving a product page", () => {
    // product page
    setPageMeta({
      title: "Audit",
      description: "d",
      path: "/produse/audit-website",
      alternates: { ro: "/produse/audit-website", en: "/en/products/website-audit" },
    });
    setJsonLd("organization", organizationLd);
    setJsonLd("product", productLd({ name: "Audit", description: "d", path: "/produse/audit-website" }));
    expect(types()).toContain("Product");

    // -> pricing
    resetManagedHead();
    setPageMeta({
      title: "Prețuri",
      description: "d",
      path: "/costurisiproduse",
      alternates: { ro: "/costurisiproduse", en: "/en/pricing" },
    });
    setJsonLd("organization", organizationLd);
    setJsonLd("breadcrumb", breadcrumbLd([{ name: "Acasă", path: "/" }]));
    expect(types()).not.toContain("Product");
    expect(document.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(
      "https://avyron.ro/costurisiproduse",
    );
    expect(
      [...document.querySelectorAll('link[hreflang="en"]')].map((l) => l.getAttribute("href")),
    ).toEqual(["https://avyron.ro/en/pricing"]);

    // -> homepage
    resetManagedHead();
    setPageMeta({ title: "Avyron", description: "d", path: "/", alternates: { ro: "/", en: "/en" } });
    setJsonLd("organization", organizationLd);
    expect(types()).toEqual(["Organization"]);
    expect(document.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
    expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.querySelectorAll('link[rel="alternate"][hreflang]').length).toBe(3);
  });

  it("switches document lang and robots per route", () => {
    setPageMeta({ title: "EN", description: "d", path: "/en/pricing" });
    expect(document.documentElement.lang).toBe("en");
    setPageMeta({ title: "404", description: "d", path: "/404", robots: "noindex, follow" });
    expect(document.documentElement.lang).toBe("ro");
    expect(document.querySelector('meta[name="robots"]')!.getAttribute("content")).toBe(
      "noindex, follow",
    );
  });
});
