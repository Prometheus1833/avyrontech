# Cabinet avocatură — livrare concept, 6 noiembrie 2026

## Publicare verificată

- URL principal: https://cabinet-avocatura.avyron.eu/
- Adresă tehnică: https://cabinet-avocatura-manuela.try-blue44.chatgpt.site/
- Acces public, fără autentificare.
- Sites project: `appgprj_6aee16d68fcc8191a51c7f828bcfab51`.
- Saved version: `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_e3fc24eb68348191bb2aa3ab225f9ab3`, versiunea 7.
- Deployment: `appgdep_6aee2ef2fe688191bc68d9afcf161ed0`, `succeeded`.
- Sites source revision: `63466e05d4520bac2697fd21fc31bedf5b04609a`.
- Director sursă în repo AVYRON: `client-sites/cabinet-avocatura/`.

Sursa din AVYRON este sincronizată cu sursa Sites. Furnizorul păstrează propria istorie Git și propriul SHA. Documentele de livrare și workflow-ul de verificare sunt păstrate suplimentar în AVYRON. Nu a fost făcut merge în main și nu au fost folosite Lovable sau creditele sale.

42 de pagini complete (21 RO + 21 EN), inclusiv șase arii de practică în fiecare limbă, trei materiale informative demonstrative, calendar și atelier editorial locale, cinci pagini juridice/accesibilitate și o pagină 404 separată.

## DNS și HTTPS active

Subdomeniul a fost configurat în contul Cloudflare Avyron, zona `avyron.eu`. Au fost adăugate numai CNAME-ul și cele două TXT emise pentru acest proiect. Înregistrările exacte sunt în `cabinet-avocatura-dns.json`, cu starea `applied-verified`. CNAME: `cabinet-avocatura.avyron.eu` → `custom-domains.chatgpt.site`, DNS only, TTL Auto.

Sites custom domain ID: `appgdom_6aee1b96ca348191a290fc6df5ea7007`. Stare verificată după configurare și publicare: `status=active`, `provider_status=active`, `ssl_status=active`. Rezolvarea CNAME/A este confirmată prin resolverele publice 1.1.1.1 și 8.8.8.8. TXT-urile de validare sunt prezente în DNS. Certificatul TLS a fost verificat prin cereri HTTPS, fără dezactivarea verificării certificatului.

Canonical, hreflang, sitemap, JSON-LD și imaginile sociale folosesc `https://cabinet-avocatura.avyron.eu`. Build-ul implicit păstrează acest domeniu; `SITE_ORIGIN` rămâne disponibil pentru medii distincte. Site-ul rămâne noindex ca prezentare pentru validarea cabinetului.

## Identitate și direcție editorială

Brandul este „Cabinet de Avocatură Manuela Galuscan”, cu localizare București, România, fără sector. Conținutul, metadatele și datele structurate LegalService/Service indică reprezentare națională, fără a inventa o adresă sau acreditări. Hero-ul separă textul și butoanele de fotografie; titlurile ariilor de practică și metodei de lucru sunt centrate. Textele au fost revizuite într-un registru juridic mai precis.

Antetul afișează o singură etichetă lingvistică, RO sau EN; activarea deschide pagina echivalentă în cealaltă limbă. Butonul alăturat de accesibilitate deschide opțiuni de text 100/115/130%, contrast și resetare. Preferințele se păstrează local, fără date personale, iar panoul se închide cu Escape sau la click exterior.

## Verificări efectuate

- Build static, verificări de sintaxă JavaScript și `git diff --check`.
- Validator: 42 pagini, 1.376 referințe interne, 272 referințe directe către fișiere, toate variantele srcset și fonturile locale, canonical/hreflang/metadate/JSON-LD și paritate RO/EN.
- Teste jsdom RO/EN: navigație și Escape, limitele calendarului, alegerea datei/orei, format/durată, invalidarea selecției anterioare, lipsa confirmărilor false de rezervare, textContent, ciorne locale și regenerare PNG pentru imaginile selectate. Fișierele HTML și imaginile indecodabile sunt respinse.
- Toate cele 42 de pagini verificate în browser la 320 × 568 atât normal, cât și cu text 130% și contrast ridicat: `scrollWidth === clientWidth`, fără depășirea lățimii documentului. Grilele de detaliu și Despre au fost corectate pentru text mărit.
- Controlul lingvistic, accesibilitatea, resetarea și persistența după reîncărcare au fost testate în browser și jsdom.
- Pagina principală verificată vizual în browser la 1440 × 1000 și 390 × 844. Fonturile și hero-ul se încarcă. Meniul mobil se deschide și navighează către Programări.
- Programări RO/EN verificate la 320 × 568, inclusiv data, ora și mesajul demonstrativ. Calendarul, fieldset-urile și antetul au fost corectate pentru ecrane înguste; `scrollWidth` este egal cu `clientWidth` (305 px în viewport de 320 px cu scrollbar de 15 px).
- Verificări HTTP publice pe toate cele 42 de rute, cu compararea HTML-ului aplicației cu build-ul; este exclus exclusiv scriptul de protecție Cloudflare injectat de hosting. În versiunea 7 au fost comparate 132 resurse publice cu build-ul local, inclusiv toate cele 42 de pagini și toate imaginile/fonturile/CSS/JS, fără diferențe de aplicație. Comportamentul 404 a fost verificat anterior și rămâne separat de acest raport de integritate.
- Bugete: JS 4.236 bytes gzip; CSS 9.899 bytes gzip; hero mobil AVIF aproximativ 11–19 KB, desktop 800 px aproximativ 25 KB. Intro 0,75 secunde, omis pentru mișcare redusă.

Aceste verificări nu constituie certificare WCAG, audit complet Core Web Vitals sau o garanție de încărcare sub 2 secunde în orice rețea. Capturile DNS anterioare sunt în `output/dns-proof/`; capturile actualei versiuni și rapoartele de verificare sunt în `output/refinement-proof/`.

Build-urile aplicației AVYRON nu au fost rulate local pentru acest director autonom. Verificările generale AVYRON, CodeQL și auditul dependențelor au trecut în CI pentru revizia anterioară `2fa7aca`; workflow-ul dedicat verifică separat site-ul cabinetului. Verificați rezultatele CI ale celui mai recent commit înainte de merge.

## Funcții demonstrative și predare

Programările, duratele și orele sunt ilustrative; nicio rezervare, plată sau confirmare automată nu se produce. Nu sunt colectate date ale clienților. Atelierul editorial salvează local și exportă JSON, fără publicarea modificărilor. Articolele și paginile juridice necesită revizia cabinetului. Nu sunt stabilite onorarii, tarife de dezvoltare/mentenanță sau SLA în numele AVYRON ori al clientei.

Conturile CMS, calendar, procesator, domeniul și hostingul final pe numele cabinetului nu au fost create. Cerințele de predare și arhitectura pentru calendar, webhook-uri, plăți și protecția datelor sunt documentate în README.

Politica de cookies reflectă cookie-ul tehnic `__cf_bm` și scriptul Cloudflare observate pe adresa tehnică Sites. Antetele stricte din `_headers` sunt pregătite pentru Pages, dar nu au fost observate aplicate de hostingul static Sites. Restricțiile meta CSP pentru `object-src`, `base-uri` și `form-action` sunt incluse în HTML. Revizia securității și a prelucrării datelor rămâne necesară înainte de activarea serviciilor operaționale.

Imaginile actuale sunt generate cu ImageGen, native 1536 × 1024, optimizate AVIF/WebP cu decupaje distincte desktop/mobil și hero. Nu sunt mărite artificial și nu reprezintă sediul, clienții sau portretul real al titularei. Cele șase arii de practică au imagini specifice. Fonturile Source Serif 4 și Source Sans 3 sunt găzduite local, cu licențe OFL. Prompturile exacte și proveniența sunt în `assets/GENERATED-V2.md`.
