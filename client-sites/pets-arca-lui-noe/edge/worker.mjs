import { pages } from '../content.mjs';
import { articlePages } from '../articles.mjs';
import { render } from '../site-render.mjs';
import { authorized, login, loginPage } from './auth.mjs';
import { ValidationError } from '../server/validation.mjs';
export { ClinicDemo } from './storage.mjs';

const routes = new Map([
  ['/', ['ro', 'home']], ['/en/', ['en', 'home']],
  ...[...pages, ...articlePages].flatMap(([key, ro, en]) => [['/' + ro, ['ro', key]], ['/en/' + en, ['en', key]]]),
]);
const previewHost = 'demo7.avyron.eu';
const policy = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
};

function reply(body, status = 200, type = 'text/plain', extra = {}) {
  return new Response(body, { status, headers: { ...policy, 'Content-Type': type + '; charset=utf-8', ...extra } });
}

function json(data, status = 200) {
  return reply(JSON.stringify(data), status, 'application/json');
}

async function requestText(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let body = '';
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new ValidationError('Datele depășesc limita formularului.', 413);
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

async function asset(env, request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  const response = await env.ASSETS.fetch(new Request(url, request));
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(policy)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (url.hostname !== previewHost && env.DEMO_LOCAL !== '1') return reply('Pagina nu a fost găsită.', 404);
  if (url.protocol !== 'https:' && env.DEMO_LOCAL !== '1') {
    url.protocol = 'https:';
    return reply(null, 308, 'text/plain', { Location: url.href });
  }

  const get = request.method === 'GET' || request.method === 'HEAD';
  const type = request.headers.get('Content-Type')?.split(';')[0];
  const origin = request.headers.get('Origin');
  const sameOrigin = origin === url.origin;
  const draft = path.startsWith('/preview/');
  const adminPage = path === '/admin' || path === '/admin/';
  const apiPrefix = '/admin/api/';
  const adminAPI = path.startsWith(apiPrefix);

  if (path === '/admin/login' && request.method === 'POST') {
    // Browsers can omit Origin or send null on a same-origin form navigation.
    const sameOriginForm = sameOrigin || ((!origin || origin === 'null') &&
      request.headers.get('Sec-Fetch-Site') === 'same-origin');
    if (!sameOriginForm || type !== 'application/x-www-form-urlencoded') {
      return reply(loginPage('Deschide pagina dashboardului și încearcă din nou.'), 403, 'text/html');
    }
    const form = new URLSearchParams(await requestText(request, 1024));
    const cookie = await login(form.get('password'), env.DEMO_ADMIN_CODE);
    if (!cookie) return reply(loginPage('Codul de acces este incorect. Copiază codul din conversație și încearcă din nou.'), 401, 'text/html');
    return reply(null, 303, 'text/plain', { Location: '/admin', 'Set-Cookie': cookie });
  }

  if (adminPage || adminAPI || draft) {
    if (!await authorized(request, env.DEMO_ADMIN_CODE)) {
      if (adminAPI) return json({ error: 'Deschide /admin și autentifică-te.' }, 401);
      if (adminPage && get) return reply(request.method === 'HEAD' ? null : loginPage(), 200, 'text/html');
      return reply(null, 303, 'text/plain', { Location: '/admin' });
    }
  }

  if (adminAPI) {
    const action = path.slice(apiPrefix.length);
    const clinic = env.CLINIC.getByName('pets-arca-demo7');
    if (action === 'state' && request.method === 'GET') return json(await clinic.state());
    if (request.method !== 'POST') return json({ error: 'Acțiune indisponibilă.' }, 404);
    if (!sameOrigin || type !== 'application/json') return json({ error: 'Acțiunea trebuie pornită din dashboard.' }, 403);
    const input = await requestText(request, 48 * 1024);
    let body;
    try { body = JSON.parse(input); } catch { return json({ error: 'Datele nu au formatul așteptat.' }, 400); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return json({ error: 'Datele nu au formatul așteptat.' }, 400);
    const { status, data } = await clinic.mutate(action, body);
    return json(data, status);
  }

  if (!get) return reply('Metodă indisponibilă.', 405);
  if (adminPage) return asset(env, request, '/admin/index.html');
  if (/^\/admin\/(?:admin\.(?:css|js)|login\.js)$/.test(path)) return asset(env, request, path);
  const publicPath = draft ? path.slice('/preview'.length) : path;
  if (/^\/assets\/[a-z0-9][a-z0-9.-]*\.(css|js|svg|webp|woff2|jpg)$/i.test(publicPath)) return asset(env, request, publicPath);
  if (path === '/robots.txt') return reply(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n');
  const route = routes.get(publicPath);
  if (!route) return reply('Pagina nu a fost găsită.', 404);
  if (request.method === 'HEAD') return reply(null, 200, 'text/html');
  const config = await env.CLINIC.getByName('pets-arca-demo7').content(draft);
  return reply(render(...route, config, { draft }), 200, 'text/html');
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof ValidationError) return json({ error: error.message }, error.status);
      console.error('pets-demo request failed', error.name, error.message);
      return reply('Preview-ul este momentan indisponibil.', 500);
    }
  },
};
