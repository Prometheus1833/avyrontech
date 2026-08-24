# `app.avyron.ro` — Lovable frontend + Cloudflare API

## Arhitectură

- `avyron.ro` și `www.avyron.ro` rămân Custom Domains ale Workerului `avyrontech`.
- `app.avyron.ro` servește frontendul publicat al proiectului `avyrontech` din Lovable.
- Numai `app.avyron.ro/api/*` este interceptat la edge de Workerul Cloudflare și folosește D1/KV/R2 existente.
- Platforma nu este inclusă în sitemap, iar rutele sale sunt `noindex, nofollow`.

Această separare evită un reverse-proxy suplimentar pentru fișierele statice și păstrează API-ul/auth same-origin pe subdomeniul platformei.

## Conectarea în Lovable

1. În proiectul `AVYRON` deschide **Settings → Domains**.
2. Deconectează vechile intrări `avyron.ro` și `www.avyron.ro`. Ele apar incorect deoarece domeniul principal este acum Worker Custom Domain.
3. Alege **Connect existing domain** și introdu `app.avyron.ro`.
4. Extinde **Advanced** și activează **Domain uses Cloudflare or a similar proxy**.
5. Autorizează conexiunea Cloudflare (Entri) sau copiază CNAME-ul exact afișat de Lovable.

Nu conecta din nou apexul `avyron.ro` la Lovable și nu crea A/AAAA pentru `app`.

## DNS corect

Lovable trebuie să furnizeze ținta, deci nu o ghici și nu crea recordul înainte de pasul de autorizare.

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| CNAME | `app` | ținta exactă oferită de fluxul Lovable Advanced | Proxied | Auto |

La același hostname nu trebuie să existe A, AAAA sau un al doilea CNAME. Recordurile Worker read-only pentru `@` și `www` nu se modifică. MX/SPF/DKIM/DMARC rămân nemodificate.

## Verificări după autorizare

```bash
dig +short app.avyron.ro
curl -I https://app.avyron.ro/auth
curl https://app.avyron.ro/api/health
```

Rezultatul așteptat: HTTPS valid, pagina de login 200, API health 200, iar răspunsurile HTML private au `X-Robots-Tag: noindex, nofollow` după activarea regulii Cloudflare de response headers.
