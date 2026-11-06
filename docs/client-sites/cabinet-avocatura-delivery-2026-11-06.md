# Cabinet avocatură — livrare concept, 6 noiembrie 2026

## Publicare verificată

- URL principal: https://cabinet-avocatura.avyron.eu/
- Adresă tehnică: https://cabinet-avocatura-manuela.try-blue44.chatgpt.site/
- Acces public, fără autentificare.
- Sites project: `appgprj_6aee16d68fcc8191a51c7f828bcfab51`.
- Saved version: `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_ca9157b3e9408191b9d33768bfe916d9`, versiunea 6.
- Deployment: `appgdep_6aee257de928819182f46a3ac81acec4`, `succeeded`.
- Sites source revision: `4369868ad2556ff93d5007ed4d620723dc711294`.
- Director sursă în repo AVYRON: `client-sites/cabinet-avocatura/`.

Sursa din AVYRON este sincronizată cu sursa Sites. Furnizorul păstrează propria istorie Git și propriul SHA. Documentele de livrare și workflow-ul de verificare sunt păstrate suplimentar în AVYRON. Nu a fost făcut merge în main și nu au fost folosite Lovable sau creditele sale.

42 de pagini complete (21 RO + 21 EN), inclusiv șase arii de practică în fiecare limbă, trei materiale informative demonstrative, calendar și atelier editorial locale, cinci pagini juridice/accesibilitate și o pagină 404 separată.

## DNS și HTTPS active

Subdomeniul a fost configurat în contul Cloudflare Avyron, zona `avyron.eu`. Au fost adăugate numai CNAME-ul și cele două TXT emise pentru acest proiect. Înregistrările exacte sunt în `cabinet-avocatura-dns.json`, cu starea `applied-verified`. CNAME: `cabinet-avocatura.avyron.eu` → `custom-domains.chatgpt.site`, DNS only, TTL Auto.

Sites custom domain ID: `appgdom_6aee1b96ca348191a290fc6df5ea7007`. Stare verificată după configurare și publicare: `status=active`, `provider_status=active`, `ssl_status=active`. Rezolvarea CNAME/A este confirmată prin resolverele publice 1.1.1.1 și 8.8.8.8. TXT-urile de validare sunt prezente în DNS. Certificatul TLS a fost verificat prin cereri HTTPS, fără dezactivarea verificării certificatului.

Canonical, hreflang, sitemap, JSON-LD și imaginile sociale folosesc `https://cabinet-avocatura.avyron.eu`. Build-ul implicit păstrează acest domeniu; `SITE_ORIGIN` rămâne disponibil pentru medii distincte. Site-ul rămâne noindex ca prezentare pentru validarea cabinetului.

## Verificări efectuate

- Build static, verificări de sintaxă JavaScript și `git diff --check`.
- Validator: 42 pagini, 1.394 referințe interne, 248 referințe directe către fișiere, toate variantele srcset și fonturile locale, canonical/hreflang/metadate/JSON-LD și paritate RO/EN.
- Teste jsdom RO/EN: navigație și Escape, limitele calendarului, alegerea datei/orei, format/durată, invalidarea selecției anterioare, lipsa confirmărilor false de rezervare, textContent, ciorne locale și regenerare PNG pentru imaginile selectate. Fișierele HTML și imaginile indecodabile sunt respinse.
- Pagina principală verificată vizual în browser la 1440 × 1000 și 390 × 844. Fonturile și hero-ul se încarcă. Meniul mobil se deschide și navighează către Programări.
- Programări RO/EN verificate la 320 × 568, inclusiv data, ora și mesajul demonstrativ. Calendarul, fieldset-urile și antetul au fost corectate pentru ecrane înguste; `scrollWidth` este egal cu `clientWidth` (305 px în viewport de 320 px cu scrollbar de 15 px).
- Verificări HTTP publice pe toate cele 42 de rute, cu compararea HTML-ului aplicației cu build-ul; este exclus exclusiv scriptul de protecție Cloudflare injectat de hosting. Resurse reprezentative identice și pagină 404 reală pentru adresă inexistentă.
- Bugete: JS 3.673 bytes gzip; CSS 7.436 bytes gzip; hero mobil AVIF aproximativ 25 KB, desktop aproximativ 87 KB. Intro 0,75 secunde, omis pentru mișcare redusă.

Aceste verificări nu constituie certificare WCAG, audit complet Core Web Vitals sau o garanție de încărcare sub 2 secunde în orice rețea. Capturile de verificare sunt păstrate în workspace, în `output/dns-proof/`.

Build-urile aplicației AVYRON nu au fost rulate local pentru acest director autonom. Verificările generale AVYRON, CodeQL și auditul dependențelor au trecut în CI pentru revizia anterioară `2fa7aca`; workflow-ul dedicat verifică separat site-ul cabinetului. Verificați rezultatele CI ale celui mai recent commit înainte de merge.

## Funcții demonstrative și predare

Programările, duratele și orele sunt ilustrative; nicio rezervare, plată sau confirmare automată nu se produce. Nu sunt colectate date ale clienților. Atelierul editorial salvează local și exportă JSON, fără publicarea modificărilor. Articolele și paginile juridice necesită revizia cabinetului. Nu sunt stabilite onorarii, tarife de dezvoltare/mentenanță sau SLA în numele AVYRON ori al clientei.

Conturile CMS, calendar, procesator, domeniul și hostingul final pe numele cabinetului nu au fost create. Cerințele de predare și arhitectura pentru calendar, webhook-uri, plăți și protecția datelor sunt documentate în README.

Politica de cookies reflectă cookie-ul tehnic `__cf_bm` și scriptul Cloudflare observate pe adresa tehnică Sites. Antetele stricte din `_headers` sunt pregătite pentru Pages, dar nu au fost observate aplicate de hostingul static Sites. Restricțiile meta CSP pentru `object-src`, `base-uri` și `form-action` sunt incluse în HTML. Revizia securității și a prelucrării datelor rămâne necesară înainte de activarea serviciilor operaționale.

Imaginile ambientale sunt generate cu ImageGen, native 1672 × 941, optimizate AVIF/WebP, fără mărire artificială. Nu sunt 4K/8K și nu reprezintă sediul real. Fonturile OFL și proveniența imaginilor sunt incluse în sursă.
