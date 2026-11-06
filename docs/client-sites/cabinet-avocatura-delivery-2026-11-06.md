# Cabinet avocatură — livrare concept, 6 noiembrie 2026

## Publicare verificată

- URL public, fără autentificare: https://cabinet-avocatura-manuela.try-blue44.chatgpt.site/
- Sites project: `appgprj_6aee16d68fcc8191a51c7f828bcfab51`.
- Saved version: `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_b6535c0c5a1c8191b309bbcfefe2faf4`, versiunea 4.
- Deployment: `appgdep_6aee1f35265c8191b74c9387e360abc8`, `succeeded`.
- Sites source revision: `c1f03845f91ab739eaf211d1f1588dd91595a949`.
- Director sursă în repo AVYRON: `client-sites/cabinet-avocatura/`.

Directorul autonom din AVYRON este sincronizat cu sursa utilizată de Sites; repository-ul tehnic al furnizorului păstrează propria istorie și propriul SHA. Codul frontend, conținutul și build-ul sunt identice. Documentele de livrare și workflow-ul de verificare sunt păstrate suplimentar în AVYRON.

42 de pagini complete (21 RO + 21 EN), inclusiv șase arii de practică în fiecare limbă, trei materiale informative demonstrative, calendar și atelier editorial locale, cinci pagini juridice/accesibilitate și o pagină 404 separată.

## Verificări efectuate

- Build static, verificare sintaxă JavaScript, `git diff --check`.
- Validator: 42 pagini, 1.394 referințe interne, 248 referințe directe către fișiere, toate variantele srcset și fonturile locale, canonical/hreflang/metadate/JSON-LD, paritate RO/EN, noindex.
- Teste jsdom RO/EN: navigație și Escape, limitele calendarului, alegerea datei/orei, schimbarea formatului și duratei, invalidarea selecției anterioare, lipsa unei confirmări false de rezervare, previzualizare sigură prin textContent, salvare și ștergere ciornă locală, regenerare PNG a imaginilor locale și respingerea fișierelor HTML/indecodabile.
- Toate cele 42 de rute: HTTP 200 local și public. HTML-ul aplicației publice corespunde exact build-ului după eliminarea exclusivă a scriptului de protecție Cloudflare identificat ca injecție a hostingului.
- CSS, JS, imagine socială, hero mobil AVIF și fonturi reprezentative: conținut public identic cu build-ul. Rută inexistentă: HTTP 404.
- Bugete: JS 3.673 bytes gzip; CSS 7.419 bytes gzip; hero mobil AVIF aproximativ 25 KB, desktop aproximativ 87 KB. Aceste dimensiuni nu constituie măsurători LCP/INP/CLS sau o garanție de încărcare sub 2 secunde.
- Intro 0,75 secunde prin CSS, fără blocarea interacțiunii; redus/omis la preferința de mișcare redusă.

Nu au fost rulate build-urile aplicației AVYRON (`build:pages`, `build:worker`, Worker API/email), deoarece această schimbare adaugă un proiect static autonom, fără modificarea aplicației sau configurației sale de hosting. Aceste verificări rămân în CI-ul general existent. Workflow-ul nou verifică separat directorul cabinetului și nu publică nimic.

Verificarea vizuală efectivă desktop/mobile, zoom și metricile de browser sunt încă neefectuate: instrumentul a returnat repetat `Local browser use is disabled in Work settings`. Testele DOM și regulile CSS responsive nu sunt prezentate drept dovadă vizuală sau certificare WCAG.

## Subdomeniu — nefinalizat

`cabinet-avocatura.avyron.eu` a fost adăugat în Sites, custom domain ID `appgdom_6aee1b96ca348191a290fc6df5ea7007`. Ultima verificare: `status=pending`, `provider_status=pending`, `ssl_status=pending_validation`. Rezolvarea DNS publică nu a returnat o destinație.

Înregistrările exacte emise de furnizor sunt în `cabinet-avocatura-dns.json`. Acestea sunt **pregătite, nu aplicate**. CNAME trebuie să fie DNS only, TTL Auto, către `custom-domains.chatgpt.site`. Cele două TXT sunt înregistrări publice de validare a domeniului, nu credențiale de cont. Nu au fost modificate alte hostname-uri sau înregistrări DNS.

Blocaj verificat: configurația locală Wrangler este expirată; API Cloudflare a returnat HTTP 403 și `wrangler whoami` a raportat lipsa autentificării. Conectorul Cloudflare nu a fost găsit în catalog, iar accesul browserului este dezactivat. Sunt necesare accesul normal autentificat la zona `avyron.eu` și dreptul de editare DNS. Nu s-a generat și nu s-a persistat niciun token nou.

După restabilirea accesului: verificați zona și eventualele înregistrări existente la cele trei nume; creați doar înregistrările emise pentru acest proiect; cereți revalidarea domeniului în Sites. Confirmați `active` pentru domeniu, provider și SSL și verificați public HTTPS pe RO/EN. Apoi reconstruiți cu `SITE_ORIGIN=https://cabinet-avocatura.avyron.eu`, rulați verificările și publicați revizia exactă. Până atunci, canonical, hreflang, sitemap și social card folosesc URL-ul Sites funcțional.

## Ce rămâne demonstrativ

Programările, duratele și orele sunt ilustrative; nicio rezervare, plată sau confirmare automată nu se produce. Nu sunt colectate date ale clienților. Atelierul editorial salvează local și exportă JSON, fără a modifica website-ul public. Articolele și paginile juridice necesită revizia cabinetului. Nu sunt stabilite onorarii, tarife de dezvoltare/mentenanță sau SLA în numele AVYRON ori al clientei.

Conturile CMS, calendar, procesator, domeniul și hostingul final pe numele cabinetului nu au fost create. Cerințele de predare și arhitectura recomandată pentru calendar, webhook-uri, plăți și protecția datelor sunt documentate în README-ul proiectului.

Pe Sites a fost observat cookie-ul tehnic `__cf_bm` și scriptul aferent Cloudflare. Politica de cookies reflectă acest lucru. Antetele stricte pregătite în `_headers` nu au fost observate aplicate de hostingul static Sites; restricțiile meta CSP pentru `object-src`, `base-uri` și `form-action` sunt incluse în HTML. Revizia securității și a prelucrării datelor rămâne necesară înaintea unei versiuni operaționale.

Imaginile ambientale sunt generate cu ImageGen, native 1672 × 941, optimizate AVIF/WebP și fără mărire artificială. Nu sunt 4K/8K și nu reprezintă sediul real. Fonturile OFL și proveniența imaginilor sunt incluse în sursă. Nu au fost folosite Lovable sau creditele sale.
