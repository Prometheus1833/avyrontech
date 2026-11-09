// @vitest-environment node
import { beforeAll, beforeEach, afterEach, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { verifyAccessAssertion } from "../worker/accessAssertion";
import { boundaryEntry } from "../worker/adminBoundary";
import {
  authenticatedBoundary,
  serviceBound,
  breakGlassAllowed,
} from "../../cloudflare/workers/api/src/securityBoundary";
import {
  boundaryPolicy,
  safeSecurityMetadata,
} from "../shared/securityBoundary";
import { sha256 } from "../../cloudflare/workers/api/src/security";
import { apiBaseForHost, authBaseForHost } from "../lib/apiBase";
import type { Env, AppBindings } from "../../cloudflare/workers/api/src/types";
let keys: CryptoKeyPair, publicKey: JsonWebKey;
const seconds = () => Math.floor(Date.now() / 1000);
const policy = {
  SECURITY_BOUNDARY_MODE: "enforce",
  ADMIN_HOSTNAME: "admin.example.test",
  SECURITY_ACCESS_TEAM_DOMAIN: "https://security-test.cloudflareaccess.com",
  SECURITY_ACCESS_AUD: "synthetic-admin-audience",
};
const b64 = (value: string | Uint8Array) =>
  Buffer.from(value).toString("base64url");
async function assertion(
  values: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
) {
  const head = b64(
    JSON.stringify({ alg: "RS256", kid: "synthetic-key", ...header }),
  );
  const body = b64(
    JSON.stringify({
      type: "app",
      sub: "synthetic-subject",
      email: "owner@example.test",
      aud: [policy.SECURITY_ACCESS_AUD],
      iss: policy.SECURITY_ACCESS_TEAM_DOMAIN,
      iat: seconds() - 5,
      exp: seconds() + 300,
      ...values,
    }),
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keys.privateKey,
    new TextEncoder().encode(head + "." + body),
  );
  return head + "." + body + "." + b64(new Uint8Array(signature));
}
const request = (token = "", path = "/intern") =>
  new Request("https://admin.example.test" + path, {
    headers: token ? { "cf-access-jwt-assertion": token } : {},
  });
beforeAll(async () => {
  keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
});
beforeEach(() => {
  const cache = new Map<string, Response>();
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (r: Request) => cache.get(r.url)?.clone(),
      put: async (r: Request, response: Response) => {
        cache.set(r.url, response.clone());
      },
    }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (r: Request) => {
      expect(r.url).toBe(
        policy.SECURITY_ACCESS_TEAM_DOMAIN + "/cdn-cgi/access/certs",
      );
      return Response.json({
        keys: [
          { ...publicKey, kid: "synthetic-key", alg: "RS256", use: "sig" },
        ],
      });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
it("verifies a real RSA signature and reuses only public provider keys", async () => {
  const token = await assertion();
  expect(await verifyAccessAssertion(request(token), policy)).toMatchObject({
    email: "owner@example.test",
  });
  expect(await boundaryEntry(request(token), policy as Env)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([
  { aud: ["other-audience"] },
  { iss: "https://attacker.example.test" },
  { type: "org" },
  { exp: seconds() - 1 },
  { exp: undefined },
  { iat: seconds() + 300 },
  { nbf: seconds() + 300 },
  { email_verified: false },
  { sub: "" },
])("rejects invalid claims without an upstream lookup: %j", async (claims) => {
  expect(
    await verifyAccessAssertion(request(await assertion(claims)), policy),
  ).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects spoofed headers, a forged signature, algorithm confusion and untrusted key URLs", async () => {
  expect(
    (
      await boundaryEntry(
        new Request("https://admin.example.test/intern", {
          headers: {
            "cf-access-authenticated-user-email": "owner@example.test",
            "cf-access-client-id": "fake",
            "cf-access-client-secret": "fake",
          },
        }),
        policy as Env,
      )
    )?.status,
  ).toBe(403);
  const token = await assertion();
  const parts = token.split(".");
  parts[2] = b64(new Uint8Array(256));
  expect(
    await verifyAccessAssertion(request(parts.join(".")), policy),
  ).toBeNull();
  expect(
    await verifyAccessAssertion(
      request(await assertion({}, { alg: "none" })),
      policy,
    ),
  ).toBeNull();
  expect(
    await verifyAccessAssertion(
      request(
        await assertion({}, { kid: "unknown", jku: "http://127.0.0.1/secret" }),
      ),
      policy,
    ),
  ).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("supports the official service-token shape but never turns a service into a staff account", async () => {
  const identity = await verifyAccessAssertion(
    request(
      await assertion({
        email: undefined,
        sub: "",
        common_name: "synthetic-client.access",
      }),
    ),
    policy,
  );
  expect(identity?.service).toBe("synthetic-client.access");
  const env = {
    SECURITY_SERVICE_BINDINGS: JSON.stringify([
      {
        clientId: identity!.service,
        userId: "agent",
        routes: [{ prefix: "/api/leads", methods: ["GET"] }],
      },
    ]),
  } as Env;
  expect(
    serviceBound(
      env,
      identity!,
      "agent",
      ["user"],
      request("", "/api/leads/lead-a"),
    ),
  ).toBe(true);
  expect(
    serviceBound(
      env,
      identity!,
      "agent",
      ["user"],
      request("", "/api/leads-other"),
    ),
  ).toBe(false);
  expect(
    serviceBound(
      env,
      identity!,
      "agent",
      ["user", "admin"],
      request("", "/api/leads"),
    ),
  ).toBe(false);
  expect(
    serviceBound(
      env,
      identity!,
      "other-agent",
      ["user"],
      request("", "/api/leads"),
    ),
  ).toBe(false);
  expect(
    (
      await boundaryEntry(
        request(
          await assertion({
            email: undefined,
            sub: "",
            common_name: "synthetic-client.access",
          }),
        ),
        policy as Env,
      )
    )?.status,
  ).toBe(403);
});
it("keeps customer pages, public APIs, webhooks and off mode unchanged", async () => {
  for (const path of [
    "/profil",
    "/api/public/domain-check",
    "/api/billing/webhooks/stripe",
  ])
    expect(
      await boundaryEntry(
        new Request("https://public.example.test" + path),
        policy as Env,
      ),
    ).toBeNull();
  expect(
    await boundaryEntry(request(), { SECURITY_BOUNDARY_MODE: "off" } as Env),
  ).toBeNull();
  expect(
    await boundaryEntry(request(), {
      ...policy,
      SECURITY_BOUNDARY_MODE: "observe",
    } as Env),
  ).toBeNull();
  expect(
    (
      await boundaryEntry(request(), {
        ...policy,
        SECURITY_ACCESS_AUD: "",
      } as Env)
    )?.status,
  ).toBe(503);
  expect(boundaryPolicy({ SECURITY_BOUNDARY_MODE: "enfroce" }).mode).toBe(
    "enforce",
  );
});
it("redirects a legacy panel without carrying tokens and isolates native auth on the new hostname", async () => {
  const response = await boundaryEntry(
    new Request(
      "https://public.example.test/intern/projects?token=do-not-forward",
    ),
    policy as Env,
  );
  expect(response?.headers.get("location")).toBe(
    "https://admin.example.test/intern/projects",
  );
  expect(
    authBaseForHost(
      "admin.example.test",
      "https://public.example.test",
      "admin.example.test",
    ),
  ).toBe("");
  expect(
    apiBaseForHost("admin.example.test", undefined, "admin.example.test"),
  ).toBe("");
  expect(authBaseForHost("app.avyron.ro")).toBe("https://api.avyron.ro");
});
it("binds Access identity to the native account and denies a client trying to enter an internal API", async () => {
  const events: unknown[][] = [];
  const DB = {
    prepare: () => ({
      bind: (...values: unknown[]) => ({
        first: async () => null,
        run: async () => {
          events.push(values);
          return { meta: { changes: 1 } };
        },
      }),
    }),
  };
  const app = new Hono<AppBindings>();
  let roles: ("user" | "admin")[] = ["admin"];
  app.use("*", async (c, next) => {
    c.set("userId", "user-a");
    c.set("roles", roles);
    await next();
  });
  app.get(
    "*",
    async (c) =>
      (await authenticatedBoundary(c, {
        email: "other@example.test",
        email_verified: 1,
      })) || c.json({ ok: true }),
  );
  const env = { ...policy, DB } as unknown as Env;
  const token = await assertion();
  expect(
    (await app.request(request(token, "/api/profile"), undefined, env)).status,
  ).toBe(403);
  roles = ["user"];
  expect(
    (await app.request(request("", "/api/leads"), undefined, env)).status,
  ).toBe(403);
  expect(
    (
      await app.request(
        "https://public.example.test/api/profile",
        undefined,
        env,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await app.request(request("", "/api/leads"), undefined, {
        ...env,
        SECURITY_BOUNDARY_MODE: "observe",
      })
    ).status,
  ).toBe(200);
  expect(
    events.some(
      (row) =>
        row.includes("security.boundary.observed_assertion_required") &&
        row.includes("allowed"),
    ),
  ).toBe(true);
});
it("limits recovery to a time-bounded, exact native Owner and rejects stale or broad recovery windows", async () => {
  const secret = "synthetic-recovery-secret-with-sufficient-entropy";
  const timestamp = Date.now();
  const config = {
    issuedAt: timestamp - 10,
    expiresAt: timestamp + 60_000,
    userIds: ["owner"],
    tokenHash: await sha256(secret),
  };
  const DB = {
    prepare: () => ({
      bind: () => ({ first: async () => ({ role: "platform_owner" }) }),
    }),
  };
  const env = {
    DB,
    SECURITY_BREAK_GLASS: JSON.stringify(config),
  } as unknown as Env;
  const req = new Request("https://api.example.test/api/admin/security", {
    headers: { "x-avyron-recovery": secret },
  });
  expect(await breakGlassAllowed(env, req, "owner", timestamp)).toBe(true);
  expect(await breakGlassAllowed(env, req, "other-user", timestamp)).toBe(
    false,
  );
  expect(await breakGlassAllowed(env, req, "owner", timestamp + 70_000)).toBe(
    false,
  );
  expect(
    await breakGlassAllowed(
      {
        ...env,
        SECURITY_BREAK_GLASS: JSON.stringify({
          ...config,
          expiresAt: timestamp + 3_600_000,
        }),
      },
      req,
      "owner",
      timestamp,
    ),
  ).toBe(false);
});
it("omits secrets, nested request bodies and bearer values from audit metadata", () => {
  expect(
    safeSecurityMetadata({
      password: "sensitive",
      token: "sensitive",
      body: { password: "sensitive" },
      reason: "Bearer synthetic-token",
      status: 403,
    }),
  ).toEqual({ reason: "[redacted]", status: 403 });
});

it("recognizes encoded and case-varied legacy panel URLs before serving a shell", async () => {
  for (const path of ["/INTERN", "/%69ntern/blog", "/ADMIN", "/%73taff"]) {
    const response = await boundaryEntry(
      new Request("https://avyron.ro" + path),
      policy,
    );
    expect(response?.status).toBe(302);
    expect(new URL(response!.headers.get("location")!).hostname).toBe(
      policy.ADMIN_HOSTNAME,
    );
  }
});
it("preserves native staff self-service on the public account origin while protecting admin-host auth", async () => {
  const app = new Hono<AppBindings>();
  app.use("*", async (c, next) => {
    c.set("userId", "user-a");
    c.set("roles", ["admin"]);
    await next();
  });
  app.get(
    "*",
    async (c) =>
      (await authenticatedBoundary(c, {
        email: "owner@example.test",
        email_verified: 1,
      })) || c.json({ ok: true }),
  );
  const DB = {
    prepare: () => ({
      bind: () => ({
        first: async () => null,
        run: async () => ({ meta: { changes: 1 } }),
      }),
    }),
  };
  const env = { ...policy, DB } as unknown as Env;
  for (const path of ["/api/auth/me", "/api/auth/sessions", "/api/auth/mfa"]) {
    expect(
      (await app.request("https://api.avyron.ro" + path, undefined, env))
        .status,
    ).toBe(200);
    expect(
      (await app.request("https://admin.example.test" + path, undefined, env))
        .status,
    ).toBe(403);
  }
});
