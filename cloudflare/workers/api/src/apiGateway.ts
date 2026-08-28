export const API_HOSTNAME = "api.avyron.ro";
export const API_VERSION = "v1";
export const API_CANONICAL_ORIGIN = `https://${API_HOSTNAME}`;

const normalizeHostname = (hostname: string) => hostname.trim().toLowerCase().replace(/\.$/, "");

export const isApiHostname = (hostname: string) => normalizeHostname(hostname) === API_HOSTNAME;

export const isApiSurfaceRequest = (request: Request) => {
  const url = new URL(request.url);
  return isApiHostname(url.hostname) || url.pathname === "/api" || url.pathname.startsWith("/api/");
};

/**
 * api.avyron.ro exposes a stable, public /v1 namespace while the website and
 * platform keep their zero-latency, same-origin /api routes. Both namespaces
 * execute the same handlers, so there is no second Worker or duplicated data.
 */
export function normalizeVersionedApiRequest(request: Request): Request {
  const url = new URL(request.url);
  if (!isApiHostname(url.hostname)) return request;
  if (url.pathname === `/${API_VERSION}`) url.pathname = "/api";
  else if (url.pathname.startsWith(`/${API_VERSION}/`)) {
    url.pathname = `/api/${url.pathname.slice(API_VERSION.length + 2)}`;
  }
  if (url.href === request.url) return request;
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: request.redirect,
  });
}

export const apiDiscovery = {
  name: "Avyron API",
  description: "Gateway first-party pentru website-ul Avyron și platforma internă.",
  version: API_VERSION,
  status: "operational",
  canonical: `${API_CANONICAL_ORIGIN}/${API_VERSION}`,
  same_origin: "/api",
  documentation: `${API_CANONICAL_ORIGIN}/openapi.json`,
  modules: {
    public: ["health", "domain-check", "exchange-rate", "contact", "blog", "public-media"],
    account: ["auth", "profile"],
    platform: ["clients", "projects", "proposals", "links", "media", "editorial", "commerce", "promotions"],
  },
  storage: {
    relational: "Cloudflare D1",
    configuration: "Workers KV",
    objects: "Cloudflare R2",
  },
} as const;

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Avyron API",
    version: "1.0.0",
    description: "API first-party pentru website, conturi și platforma internă Avyron. Datele private necesită un token JWT cu durată scurtă.",
    contact: { name: "Avyron Development", email: "development@avyron.ro", url: "https://avyron.ro" },
    license: { name: "Proprietary - Avyron Terms", url: "https://avyron.ro/termeni" },
  },
  servers: [
    { url: `${API_CANONICAL_ORIGIN}/${API_VERSION}`, description: "Producție" },
    { url: "https://avyron.ro/api", description: "Website same-origin" },
    { url: "https://app.avyron.ro/api", description: "Platformă same-origin" },
  ],
  tags: [
    { name: "System", description: "Stare și metadate API" },
    { name: "Public", description: "Funcții publice protejate la edge" },
    { name: "Auth", description: "Conturi, sesiuni și verificarea emailului" },
    { name: "Platform", description: "Resurse autentificate pentru clienți și staff" },
  ],
  paths: {
    "/health": {
      get: { tags: ["System"], summary: "Verifică disponibilitatea Worker-ului", responses: { "200": { description: "Worker disponibil" } } },
    },
    "/public/domain-check": {
      get: {
        tags: ["Public"],
        summary: "Verifică prudent starea unui domeniu prin surse oficiale RDAP/DNS",
        parameters: [{ name: "domain", in: "query", required: true, schema: { type: "string", maxLength: 253 }, example: "exemplu.ro" }],
        responses: { "200": { description: "Stare verificată" }, "400": { $ref: "#/components/responses/Problem" }, "429": { $ref: "#/components/responses/Problem" } },
      },
    },
    "/public/exchange-rate": {
      get: {
        tags: ["Public"],
        summary: "Returnează cursul indicativ EUR/RON publicat de Banca Centrală Europeană",
        responses: { "200": { description: "Ultimul curs valid din Workers KV sau un fallback marcat explicit" } },
      },
    },
    "/contact/demo": {
      post: { tags: ["Public"], summary: "Trimite formularul principal protejat cu Turnstile", responses: { "201": { description: "Cerere salvată și notificată" }, "400": { $ref: "#/components/responses/Problem" }, "429": { $ref: "#/components/responses/Problem" } } },
    },
    "/contact/example": {
      post: { tags: ["Public"], summary: "Solicită un exemplu de produs", responses: { "201": { description: "Solicitare creată" }, "400": { $ref: "#/components/responses/Problem" } } },
    },
    "/auth/signup": {
      post: { tags: ["Auth"], summary: "Creează un cont și trimite verificarea emailului", responses: { "202": { description: "Cont creat; verificare necesară" }, "400": { $ref: "#/components/responses/Problem" }, "429": { $ref: "#/components/responses/Problem" } } },
    },
    "/auth/login": {
      post: { tags: ["Auth"], summary: "Autentifică un cont verificat", responses: { "200": { description: "Sesiune creată" }, "401": { $ref: "#/components/responses/Problem" } } },
    },
    "/auth/refresh": {
      post: { tags: ["Auth"], summary: "Reînnoiește tokenul folosind cookie-ul securizat", responses: { "200": { description: "Token reînnoit" }, "401": { $ref: "#/components/responses/Problem" } } },
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "Returnează contul curent", security: [{ bearerAuth: [] }], responses: { "200": { description: "Cont curent" }, "401": { $ref: "#/components/responses/Problem" } } },
    },
    "/blog/posts": {
      get: { tags: ["Public"], summary: "Listează articolele publicate", responses: { "200": { description: "Listă de articole" } } },
    },
    "/projects": {
      get: { tags: ["Platform"], summary: "Listează proiectele accesibile contului", security: [{ bearerAuth: [] }], responses: { "200": { description: "Listă de proiecte" }, "401": { $ref: "#/components/responses/Problem" } } },
    },
    "/commerce/quote": {
      post: { tags: ["Platform"], summary: "Calculează server-side prețul și reducerea unei comenzi", security: [{ bearerAuth: [] }], responses: { "200": { description: "Ofertă calculată" }, "400": { $ref: "#/components/responses/Problem" }, "409": { $ref: "#/components/responses/Problem" } } },
    },
    "/commerce/orders": {
      get: { tags: ["Platform"], summary: "Listează comenzile contului curent", security: [{ bearerAuth: [] }], responses: { "200": { description: "Listă de comenzi" } } },
      post: { tags: ["Platform"], summary: "Creează o comandă folosind prețurile validate de Worker", security: [{ bearerAuth: [] }], responses: { "201": { description: "Comandă creată" }, "400": { $ref: "#/components/responses/Problem" } } },
    },
    "/promotions/admin": {
      get: { tags: ["Platform"], summary: "Administrare promoții rezervată contului desemnat", security: [{ bearerAuth: [] }], responses: { "200": { description: "Listă promoții" }, "403": { $ref: "#/components/responses/Problem" } } },
      post: { tags: ["Platform"], summary: "Creează o promoție nouă", security: [{ bearerAuth: [] }], responses: { "201": { description: "Promoție creată" }, "403": { $ref: "#/components/responses/Problem" } } },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Token de acces cu durată de 15 minute" },
    },
    responses: {
      Problem: {
        description: "Eroare API",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" }, requestId: { type: "string" } } } } } } },
      },
    },
  },
} as const;
