// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import { it, expect } from "vitest";
import { WEBSITE_SUBSCRIPTION_PATH } from "@/shared/websiteSubscriptions";

const built = existsSync("dist/client/index.html") ? "dist/client" : "dist";

it.each(Object.entries(WEBSITE_SUBSCRIPTION_PATH))("renders the offer and plan content before JavaScript in %s", (lang, path) => {
  const doc = new JSDOM(readFileSync(`${built}${path}/index.html`, "utf8")).window.document;
  expect(doc.head.querySelector("#avyron-website-subscription-critical")?.textContent).toContain(".ws-hero");
  expect(doc.head.querySelector("#avyron-footer-critical")?.textContent).toContain(".avy-footer");
  expect(doc.head.querySelector('link[rel="modulepreload"][href*="/WebsiteSubscriptionPage-"]')).not.toBeNull();
  expect(doc.querySelector("h1")?.textContent).toContain(lang === "ro" ? "0 lei pentru dezvoltare." : "No development fee.");
  expect(doc.querySelector(".ws-offer")?.textContent).toContain(lang === "ro" ? "Abonament lunar" : "Monthly subscription");
  expect(doc.querySelectorAll(".ws-hero img, nav[aria-label='Breadcrumb']")).toHaveLength(0);
  expect(doc.querySelectorAll(".ws-plan")).toHaveLength(3);
  expect(doc.querySelectorAll(".ws-journey-card")).toHaveLength(3);
  expect(doc.querySelectorAll('[data-example-carousel="premium-website"]')).toHaveLength(1);
  expect(doc.querySelector('a[href="/exemple/retuvo"]')).toBeNull();
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://avyron.ro${path}`);
});
it("keeps the subscription module out of homepage route preloads", () => {
  const doc = new JSDOM(readFileSync(`${built}/index.html`, "utf8")).window.document;
  expect(doc.head.querySelector('link[rel="modulepreload"][href*="/WebsiteSubscriptionPage-"]')).toBeNull();
});
