// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import { it, expect } from "vitest";
import { WEBSITE_SUBSCRIPTION_PATH } from "@/shared/websiteSubscriptions";
const built=existsSync('dist/client/index.html')?'dist/client':'dist';
it.each(Object.values(WEBSITE_SUBSCRIPTION_PATH))('styles %s and discovers real project imagery before JavaScript', path => {
  const doc=new JSDOM(readFileSync(`${built}${path}/index.html`,'utf8')).window.document;
  expect(doc.head.querySelector('#avyron-website-subscription-critical')?.textContent).toContain('.ws-hero');
  expect(doc.head.querySelector('#avyron-footer-critical')?.textContent).toContain('.avy-footer');
  expect(doc.head.querySelector('link[rel="modulepreload"][href*="/WebsiteSubscriptionPage-"]')).not.toBeNull();
  const image=doc.querySelector('.ws-project-main img');
  expect(image?.getAttribute('srcset')).toContain('1600w');
  expect(image?.getAttribute('fetchpriority')).toBe('high');
  expect(image?.getAttribute('loading')).not.toBe('lazy');
  expect(doc.querySelector('a[href="/exemple/retuvo"]')).toBeNull();
});
it('keeps the subscription module out of homepage route preloads',()=>{
  const doc=new JSDOM(readFileSync(`${built}/index.html`,'utf8')).window.document;
  expect(doc.head.querySelector('link[rel="modulepreload"][href*="/WebsiteSubscriptionPage-"]')).toBeNull();
});
