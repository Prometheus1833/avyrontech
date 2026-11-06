// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { resetManagedHead, setPageMeta } from "../lib/seo";
import { SERVICE_SOCIAL, serviceSocialForPath } from "../seo/serviceSocial";
import { PRERENDER_ROUTES } from "../seo/publicRoutes";

const meta = (key: string) => document.head.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.getAttribute("content");
beforeEach(() => { document.head.innerHTML = ""; resetManagedHead(); });

it("resolves a distinct local cover for each service and language, ignoring tracking and trailing slash", () => {
  const urls = new Set<string>();
  for (const entry of SERVICE_SOCIAL) for (const lang of ["ro", "en"] as const) {
    const image = serviceSocialForPath(entry.path[lang]);
    expect(image?.image).toMatch(/^\/og\/servicii\/[a-z]+-(ro|en)-[a-f0-9]{12}\.jpg$/);
    expect(image?.imageAlt).toContain(entry[lang].join(" "));
    expect(serviceSocialForPath(`${entry.path[lang]}/?utm_source=chat#contact`)).toEqual(image);
    urls.add(image!.image);
  }
  expect(urls.size).toBe(SERVICE_SOCIAL.length * 2);
  for (const route of PRERENDER_ROUTES.filter(route => /^\/(servicii|en\/services)(\/|$)/.test(route))) {
    expect(serviceSocialForPath(route), `Missing cover for public service ${route}`).not.toBeNull();
  }
  expect(serviceSocialForPath("/profil?tab=documents")).toBeNull();
});

it("replaces all image signals on SPA navigation and falls back without retaining a service or article cover", () => {
  for (const entry of SERVICE_SOCIAL) {
    setPageMeta({ title: entry.ro.join(" "), description: entry.caption.ro, path: entry.path.ro });
    const expected = `https://avyron.ro${serviceSocialForPath(entry.path.ro)!.image}`;
    for (const key of ["og:image", "og:image:secure_url", "twitter:image"]) expect(meta(key)).toBe(expected);
    expect(meta("og:image:type")).toBe("image/jpeg");
    expect(meta("og:image:width")).toBe("1200");
    expect(meta("og:image:height")).toBe("630");
    expect(meta("twitter:image:alt")).toBe(meta("og:image:alt"));
    expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
  }
  setPageMeta({ title: "Editorial", description: "Article", path: "/blog/editorial", image: "/news/test.png", imageAlt: "Cover" });
  expect(meta("og:image:type")).toBe("image/png");
  setPageMeta({ title: "Contact AVYRON", description: "Contact", path: "/contact" });
  expect(meta("og:image")).toBe("https://avyron.ro/og/home.jpg");
  expect(meta("og:image:alt")).toBe("Contact AVYRON");
  expect(meta("og:image:type")).toBe("image/jpeg");
});

it("keeps explicitly selected article/product covers while refreshing their alt text", () => {
  setPageMeta({ title: "Produs", description: "Descriere", path: "/produse/x/y", image: "/og/produse/item.jpg" });
  expect(meta("twitter:image")).toBe("https://avyron.ro/og/produse/item.jpg");
  expect(meta("twitter:image:alt")).toBe("Produs");
});
