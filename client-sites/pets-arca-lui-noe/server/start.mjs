import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from '../content.mjs';
import { articlePages } from '../articles.mjs';
import { render } from '../site-render.mjs';
import { actions, adminState, readContent } from './actions.mjs';
import { openDatabase } from './database.mjs';
import { ValidationError } from './validation.mjs';

const port = Number(process.env.VET_PREVIEW_PORT || 4186);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Portul de preview este invalid.');
const origin = `http://127.0.0.1:${port}`;
const databasePath = process.env.VET_PREVIEW_DB || fileURLToPath(new URL('../.local/clinic.sqlite', import.meta.url));
mkdirSync(dirname(resolve(databasePath)), { recursive: true, mode: 0o700 });
const database = openDatabase(databasePath);
const types = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
};

const publicRoutes = new Map([
  ['/', ['ro', 'home']], ['/en/', ['en', 'home']],
  ...[...pages, ...articlePages].flatMap(([key, ro, en]) => [['/' + ro, ['ro', key]], ['/en/' + en, ['en', key]]]),
]);

function reply(response, code, type, body) {
  response.writeHead(code, {
    'Content-Type': type.startsWith('text/') || type === 'application/json' ? type + '; charset=utf-8' : type,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  });
  response.end(body);
}

function json(response, code, data) {
  reply(response, code, 'application/json', JSON.stringify(data));
}

function serveFile(response, folder, name) {
  const extension = name.slice(name.lastIndexOf('.'));
  if (!Object.hasOwn(types, extension)) return reply(response, 404, 'text/plain', 'Fișier inexistent.');
  let data;
  try {
    data = readFileSync(new URL(`../${folder}/${name}`, import.meta.url));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return reply(response, 404, 'text/plain', 'Fișier inexistent.');
  }
  reply(response, 200, types[extension], data);
}

async function readJSON(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 48 * 1024) throw new ValidationError('Datele depășesc limita formularului.', 413);
    chunks.push(chunk);
  }
  let result;
  try {
    result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError('Datele nu au formatul așteptat.');
  }
  if (!result || Array.isArray(result) || typeof result !== 'object') {
    throw new ValidationError('Datele nu au formatul așteptat.');
  }
  return result;
}

const server = createServer(async (request, response) => {
  try {
    if (request.headers.host !== `127.0.0.1:${port}`) {
      return reply(response, 403, 'text/plain', 'Folosește adresa locală afișată în terminal.');
    }
    const path = new URL(request.url, origin).pathname;
    if (path.startsWith('/admin') || path.startsWith('/preview/')) {
      if (request.headers['sec-fetch-site'] === 'cross-site') {
        return reply(response, 403, 'text/plain', 'Deschide dashboardul direct în browser.');
      }
    }
    if (path.startsWith('/admin/api/')) {
      const action = path.slice('/admin/api/'.length);
      if (action === 'state' && request.method === 'GET') return json(response, 200, adminState(database));
      if (request.method !== 'POST' || !Object.hasOwn(actions, action)) {
        return json(response, 404, { error: 'Acțiunea nu este disponibilă.' });
      }
      if (request.headers.origin !== origin || request.headers['content-type']?.split(';')[0] !== 'application/json') {
        return json(response, 403, { error: 'Acțiunea trebuie pornită din dashboardul local.' });
      }
      return json(response, 200, actions[action](database, await readJSON(request)));
    }
    if (request.method !== 'GET') return reply(response, 405, 'text/plain', 'Metodă indisponibilă.');
    if (path === '/admin' || path === '/admin/') return serveFile(response, 'admin', 'index.html');
    const adminAsset = path.match(/^\/admin\/([a-z-]+\.(?:css|js))$/);
    if (adminAsset) return serveFile(response, 'admin', adminAsset[1]);
    const asset = path.match(/^\/(?:preview\/)?assets\/([a-z0-9.-]+)$/i);
    if (asset && !asset[1].startsWith('.')) return serveFile(response, 'assets', asset[1]);
    if (path === '/robots.txt') return reply(response, 200, 'text/plain', 'User-agent: *\nDisallow: /\n');
    const draft = path.startsWith('/preview/');
    const route = publicRoutes.get(draft ? path.slice('/preview'.length) : path);
    if (!route) return reply(response, 404, 'text/plain', 'Pagina nu a fost găsită.');
    const site = readContent(database);
    return reply(response, 200, 'text/html', render(...route, JSON.parse(draft ? site.draft : site.published), { draft }));
  } catch (error) {
    if (error instanceof ValidationError) return json(response, error.status, { error: error.message });
    console.error(error);
    return json(response, 500, { error: 'Acțiunea nu a putut fi finalizată.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Site: ${origin}/\nDashboard: ${origin}/admin`);
});
