const cookie = '__Host-pets_demo';
const sessionSeconds = 8 * 60 * 60;
const encoder = new TextEncoder();

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode('pets-arca-demo/session/v1:' + secret), {
    name: 'HMAC', hash: 'SHA-256',
  }, false, ['sign', 'verify']);
}

export async function authorized(request, secret) {
  if (!secret) return false;
  const token = request.headers.get('Cookie')?.split(';').map(value => value.trim())
    .find(value => value.startsWith(cookie + '='))?.slice(cookie.length + 1);
  const parts = token?.match(/^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/);
  if (!parts) return false;
  const [, expires, nonce, signature] = parts;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const bytes = Uint8Array.from(signature.match(/.{2}/g), byte => parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', await signingKey(secret), bytes, encoder.encode(expires + '.' + nonce));
}

export async function login(password, secret) {
  const input = password?.trim();
  if (!secret || !input) return null;
  const normalized = /^[0-9a-f]{32}$/.test(secret) ? input.toLowerCase() : input;
  const [actual, expected] = await Promise.all([normalized, secret].map(value =>
    crypto.subtle.digest('SHA-256', encoder.encode(value))));
  if (!crypto.subtle.timingSafeEqual(actual, expected)) return null;
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const payload = expires + '.' + toHex(crypto.getRandomValues(new Uint8Array(16)));
  const signature = toHex(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload)));
  return `${cookie}=${payload}.${signature}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${sessionSeconds}`;
}

export function loginPage(error = '') {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Acces dashboard | Pets Arca lui Noe</title>
<link rel="icon" href="/assets/mark.svg"><link rel="stylesheet" href="/admin/admin.css"><script src="/admin/login.js" defer></script></head>
<body><main class="login-shell"><section class="panel login-panel">
<p class="login-brand"><img src="/assets/mark.svg" width="44" height="44" alt="">Pets Arca lui Noe</p>
<h1>Dashboard demo</h1><p class="muted">Introdu codul de acces pentru a deschide editorul și registrul de test.</p>
${error ? '<p class="feedback error" role="alert">${error}</p>' : ''}
<form method="post" action="/admin/login"><label>Cod de acces<input type="password" id="access-code" name="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" maxlength="128" required></label><button type="button" class="button secondary login-toggle" aria-controls="access-code" aria-pressed="false" hidden>Arată codul</button><button type="submit" class="button">Intră în dashboard</button></form>
<a href="/" class="inline-link">Înapoi la site</a>
</section></main></body></html>`;
}
