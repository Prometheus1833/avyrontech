# api.avyron.ro — gateway Cloudflare Free

## Rezultat

`api.avyron.ro` este domeniul canonic al API-ului Avyron, servit de același
Worker care procesează rutele same-origin `/api/*` de pe `avyron.ro` și
`app.avyron.ro`. Nu există un proxy Worker suplimentar și nici o copie a bazei
de date, deci o acțiune a utilizatorului consumă o singură invocare de backend.

- API public versionat: `https://api.avyron.ro/v1/*`
- Compatibilitate website/platformă: `/api/*`
- Discovery: `https://api.avyron.ro/`
- OpenAPI 3.1: `https://api.avyron.ro/openapi.json`
- Health fără interogare D1: `https://api.avyron.ro/healthz`
- Indexare oprită: `robots.txt` plus `X-Robots-Tag: noindex, nofollow`

Un request către `/v1/*` este rescris intern către handlerul `/api/*`. Nu există
redirect HTTP, preflight sau hop de rețea suplimentar.

## Bugetul Free verificat la 28 august 2026

| Serviciu | Limită Free relevantă | Politica Avyron |
| --- | --- | --- |
| Workers | 100.000 requesturi/zi, 10 ms CPU/request, 50 subrequesturi externe | un singur Worker; fără gateway intermediar |
| D1 | 5 milioane rânduri citite/zi, 100.000 scrise/zi, 500 MB/bază, 5 GB/cont | query-uri parametrizate, coloane explicite, indecși pe filtre; health nu atinge DB |
| KV | 100.000 citiri și 1.000 scrieri/zi, 1 GB | doar configurație rar modificată, niciodată conturi/sesiuni |
| R2 Standard | 10 GB-lună, 1 milion operații Class A, 10 milioane Class B/lună, egress gratuit | media și atașamente; obiecte publice imutabile cache-uite |
| Turnstile | plan Free, challenge-uri și verificări Siteverify nelimitate | formulare și signup; hostname/action verificate server-side |

Limitele se verifică înaintea unei extinderi în documentația oficială:

- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/d1/platform/pricing/>
- <https://developers.cloudflare.com/d1/platform/limits/>
- <https://developers.cloudflare.com/kv/platform/limits/>
- <https://developers.cloudflare.com/r2/pricing/>
- <https://developers.cloudflare.com/turnstile/plans/>

## Organizarea API-urilor

| Domeniu | Rute | Persistență | Acces |
| --- | --- | --- | --- |
| Sistem | `/health`, discovery, OpenAPI | fără storage | public, no-store pentru health |
| Public | `/public/domain-check`, `/public/exchange-rate`, `/contact/*`, `/blog/*`, media publică | KV/D1/R2 numai prin Worker | cache la edge; rate limit + Turnstile unde există mutații |
| Cont | `/auth/*`, `/profile/*` | D1 + R2 avatar | JWT 15 minute + refresh cookie HttpOnly |
| Comerț | `/commerce/quote`, `/commerce/orders` | catalog server-side + D1 | cont autentificat; prețurile browserului sunt ignorate |
| Promoții | `/promotions/admin/*` | D1 + audit log | exclusiv `prometheus@avyron.ro`, verificat server-side |
| Platformă | `/clients`, `/projects`, `/proposals`, `/links`, `/media` | D1 + R2 | JWT + rol + verificări de ownership |
| Editorial | `/blog/staff/*` | D1 + R2 | staff/admin; mutații auditate |
| Config | `/content/*` | KV | staff read, admin write |

Răspunsurile API primesc un `X-Request-Id` corelat cu Cloudflare Ray ID,
`X-API-Version`, reguli CORS explicite, CSP restrictiv, `nosniff`, referrer și
permissions policy. Mutațiile venite dintr-un `Origin` neaprobat sunt respinse
înainte de handler. Erorile și datele private au `Cache-Control: private,
no-store`.

## Cache și performanță

Cache API este folosit numai pentru requesturi `GET` anonime către articole,
coperți, avatare, verificarea domeniilor și cursul valutar public. Cheile sunt
normalizate și elimină parametrii nerecunoscuți, evitând fragmentarea cache-ului.
Un request cu cookie sau `Authorization` nu poate intra în cache.

Cache-ul este per centru de date Cloudflare. D1 rămâne sursa de adevăr pentru
datele relaționale, iar KV păstrează ultima rată valutară validată. Acest model
reduce citirile fără consistență falsă pentru conturi sau dashboard.

## Prețuri și promoții

Catalogul este comun interfeței și Worker-ului, însă Worker-ul recalculează
fiecare linie după SKU și ignoră orice valoare trimisă de browser. Codurile sunt
normalizate fără diferențe între litere mari și mici, iar perioadele, starea și
limitele globale/per cont sunt reverificate în tranzacția care creează comanda.

Codurile inițiale sunt `AVY10` (10%), `AVYONG` (10%), `SOCIALAVY` (5%),
`PROMETHAVY` (100%) și `EXCEPTIEAVY` (50%). Istoricul comenzilor și al
utilizărilor nu este șters când un cod este oprit. Numai contul exact
`prometheus@avyron.ro` poate vedea, crea sau activa/dezactiva promoții din
Dashboard; rolul generic de administrator nu acordă acest drept.

### Conversie EUR/RON

`GET /v1/public/exchange-rate` publică ultima rată EUR/RON validă preluată
direct din fluxul XML al Băncii Centrale Europene. Worker-ul o validează,
păstrează în KV numai ultima valoare corectă și o actualizează la `07:17 UTC`
și `15:17 UTC`. Prima oră asigură rata de referință disponibilă la începutul
zilei, iar a doua este după ora uzuală de publicare BCE; programul rulează și
în weekend pentru a păstra același comportament operațional.

Interfața folosește cursul numai pentru afișarea orientativă. Catalogul,
promoțiile, comenzile și facturile rămân calculate și validate server-side în
RON. Dacă BCE sau KV nu sunt disponibile, API-ul semnalizează explicit
`status: fallback`, iar UI-ul etichetează valoarea drept estimare de rezervă;
nu o prezintă drept curs oficial.

- Flux oficial: <https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml>
- Politica ratelor de referință BCE: <https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html>
- Cron Triggers: <https://developers.cloudflare.com/workers/configuration/cron-triggers/>
- Workers KV: <https://developers.cloudflare.com/kv/concepts/how-kv-works/>

## Furnizori externi acceptați

Principiul este „Cloudflare native înainte de terți”. Nu se adaugă agregatoare
gratuite fără SLA doar pentru a extinde artificial lista de funcții.

| Necesitate | Sursă | Motiv și fallback |
| --- | --- | --- |
| Anti-bot | Cloudflare Turnstile Siteverify | first-party, Free, acțiune și hostname verificate |
| Descoperire registru domeniu | registrul bootstrap IANA RDAP | sursă standard, actualizată de IANA; se interoghează endpointul HTTPS autoritativ |
| Semnal DNS pentru TLD fără RDAP | Cloudflare 1.1.1.1 DoH | fără autentificare; poate confirma delegarea, dar NXDOMAIN rămâne `unknown`, nu `available` |
| Email tranzacțional | Cloudflare Email Service/SMTP configurat | rezultatul livrării este persistat în D1; eșecul nu este raportat ca succes |
| Export opțional lead | Airtable API sau webhook HTTPS semnat | dezactivat implicit; D1 rămâne sursa de adevăr |

Sursele standard pentru domenii sunt IANA/ICANN:

- <https://data.iana.org/rdap/dns.json>
- <https://www.icann.org/rdap/>
- <https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/>

Pentru `.ro`, RoTLD nu publică în registrul IANA un endpoint RDAP la data
verificării. API-ul nu deduce disponibilitatea din lipsa DNS-ului; afișează
corect „Necesită confirmare” și trimite utilizatorul la un registrar pentru
confirmarea finală.

## Operare sigură

1. Preview-urile folosesc D1/KV/R2 izolate și nu atașează custom domains.
2. Se rulează `npm run validate:cloudflare` înainte de upload.
3. Producția se publică numai după ce `api.avyron.ro` nu are un record DNS
   conflictual. `custom_domain: true` creează automat DNS-ul și certificatul.
4. Se verifică `/`, `/healthz`, `/openapi.json`, `/v1/health`, CORS și un 404.
5. Se urmăresc Workers Observability, D1 Row Metrics, KV și R2 usage. Când se
   ajunge constant la 70% dintr-o cotă, se optimizează înainte de extindere.
