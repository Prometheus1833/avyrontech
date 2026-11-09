/** Isolated localhost protocol regression, not a production auth server.
 * WebKit omits Cookie from intercepted headers even when the wire includes it.
 * Native Secure/__Host-/SameSite attributes are tested in test:security:local. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium, webkit, devices } from "@playwright/test";
const engine = process.argv[2] || "chromium";
if (!["chromium", "webkit"].includes(engine)) throw Error("Invalid engine");
const listen = (server) => new Promise((r) => server.listen(0, "127.0.0.1", r));
const close = (server) => new Promise((r) => server.close(r));
let origin = "";
const api = createServer((req, res) => {
  if (req.headers.origin !== origin) {
    res.writeHead(403);
    res.end();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      wireCookiePresent: req.headers.cookie?.includes("audit=synth") === true,
    }),
  );
});
const app = createServer((_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(
    "<!doctype html><title>Local synthetic fixture</title><h1>Local fixture</h1>",
  );
});
let browser;
try {
  await listen(api);
  await listen(app);
  const target = `http://127.0.0.1:${api.address().port}`;
  origin = `http://127.0.0.1:${app.address().port}`;
  browser = await { chromium, webkit }[engine].launch();
  const context = await browser.newContext(
    engine === "webkit" ? devices["iPhone 13"] : {},
  );
  await context.addCookies([
    {
      name: "audit",
      value: "synth",
      url: target,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  let interceptedCookiePresent = false;
  await context.route(target + "/**", async (route) => {
    interceptedCookiePresent = Boolean(
      (await route.request().allHeaders()).cookie,
    );
    await route.continue();
  });
  const page = await context.newPage();
  await page.goto(origin);
  const result = await page.evaluate(
    async (url) => ({
      wire: await (await fetch(url, { credentials: "include" })).json(),
      readableCookie: document.cookie.includes("audit="),
    }),
    target + "/check",
  );
  assert.equal(result.wire.wireCookiePresent, true);
  assert.equal(result.readableCookie, false);
  console.log(
    JSON.stringify({
      engine,
      status: "PASS",
      wireCookiePresent: true,
      readableCookie: false,
      interceptedCookiePresent,
    }),
  );
} finally {
  await browser?.close();
  await close(api);
  await close(app);
}
