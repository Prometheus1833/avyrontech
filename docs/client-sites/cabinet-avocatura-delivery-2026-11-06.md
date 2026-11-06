# Cabinet avocatură — livrare concept, 6 noiembrie 2026

## Publicare verificată

- URL principal: https://cabinet-avocatura.avyron.eu/
- Adresă tehnică: https://cabinet-avocatura-manuela.try-blue44.chatgpt.site/
- Acces public, fără autentificare.
- Sites project: `appgprj_6aee16d68fcc8191a51c7f828bcfab51`.
- Saved version: `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_8d2b4c09b78481918eb7d99bd5c8b25c`, versiunea 8.
- Deployment: `appgdep_6aee35d1561c81919ff300b883757c0f`, `succeeded`.
- Sites source revision: `bc45d24c358774ff337e1340bf89f09e08bf2323`.
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
- Validator: 42 pagini, 1.674 referințe interne, 360 referințe directe către fișiere, toate variantele srcset și fonturile locale, canonical/hreflang/metadate/JSON-LD și paritate RO/EN.
- Teste jsdom RO/EN: navigație și Escape, limitele calendarului, alegerea datei/orei, format/durată, invalidarea selecției anterioare, lipsa confirmărilor false de rezervare, textContent, ciorne locale și regenerare PNG pentru imaginile selectate. Fișierele HTML și imaginile indecodabile sunt respinse.
- Toate cele 42 de pagini verificate în browser la 320 × 568 atât normal, cât și cu text 130% și contrast ridicat: `scrollWidth === clientWidth`, fără depășirea lățimii documentului. Grilele de detaliu și Despre au fost corectate pentru text mărit.
- Controlul lingvistic, accesibilitatea, resetarea și persistența după reîncărcare au fost testate în browser și jsdom.
- Pagina principală verificată vizual în browser la 1440 × 1000 și 390 × 844. Fonturile și hero-ul se încarcă. Meniul mobil se deschide și navighează către Programări.
- Programări RO/EN verificate la 320 × 568, inclusiv data, ora și mesajul demonstrativ. Calendarul, fieldset-urile și antetul au fost corectate pentru ecrane înguste; `scrollWidth` este egal cu `clientWidth` (305 px în viewport de 320 px cu scrollbar de 15 px).
- Verificări HTTP publice pe toate cele 42 de rute, cu compararea HTML-ului aplicației cu build-ul; este exclus exclusiv scriptul de protecție Cloudflare injectat de hosting. În versiunea 8 au fost comparate 142 resurse publice cu build-ul local, inclusiv toate cele 42 de pagini și toate imaginile/fonturile/CSS/JS, fără diferențe de aplicație. Comportamentul 404 a fost verificat anterior și rămâne separat de acest raport de integritate.
- Bugete: JS principal 4.889 bytes gzip și modul de mișcare 3.140 bytes gzip (numai pe colecțiile de arii); CSS principal 9.899 bytes gzip și CSS suplimentar 3.708 bytes gzip; hero mobil AVIF aproximativ 11–19 KB, desktop 800 px aproximativ 25 KB. Intro 0,75 secunde, omis pentru mișcare redusă.

Aceste verificări nu constituie certificare WCAG, audit complet Core Web Vitals sau o garanție de încărcare sub 2 secunde în orice rețea. Capturile DNS anterioare sunt în `output/dns-proof/`; capturile versiunii 7 sunt în `output/refinement-proof/`; versiunea 8 și rapoartele curente sunt în `output/carousel-proof/`.

Build-urile aplicației AVYRON nu au fost rulate local pentru acest director autonom. Verificările generale AVYRON, CodeQL și auditul dependențelor au trecut în CI pentru revizia anterioară `2fa7aca`; workflow-ul dedicat verifică separat site-ul cabinetului. Verificați rezultatele CI ale celui mai recent commit înainte de merge.

## Funcții demonstrative și predare

Programările, duratele și orele sunt ilustrative; nicio rezervare, plată sau confirmare automată nu se produce. Nu sunt colectate date ale clienților. Atelierul editorial salvează local și exportă JSON, fără publicarea modificărilor. Articolele și paginile juridice necesită revizia cabinetului. Nu sunt stabilite onorarii, tarife de dezvoltare/mentenanță sau SLA în numele AVYRON ori al clientei.

Conturile CMS, calendar, procesator, domeniul și hostingul final pe numele cabinetului nu au fost create. Cerințele de predare și arhitectura pentru calendar, webhook-uri, plăți și protecția datelor sunt documentate în README.

Politica de cookies reflectă cookie-ul tehnic `__cf_bm` și scriptul Cloudflare observate pe adresa tehnică Sites. Antetele stricte din `_headers` sunt pregătite pentru Pages, dar nu au fost observate aplicate de hostingul static Sites. Restricțiile meta CSP pentru `object-src`, `base-uri` și `form-action` sunt incluse în HTML. Revizia securității și a prelucrării datelor rămâne necesară înainte de activarea serviciilor operaționale.

Imaginile actuale sunt generate cu ImageGen, native 1536 × 1024, optimizate AVIF/WebP cu decupaje distincte desktop/mobil și hero. Nu sunt mărite artificial și nu reprezintă sediul, clienții sau portretul real al titularei. Cele șase arii de practică au imagini specifice. Fonturile Source Serif 4 și Source Sans 3 sunt găzduite local, cu licențe OFL. Prompturile exacte și proveniența sunt în `assets/GENERATED-V2.md`.


## Carusel, parcurs și contact — versiunea 8

Cardurile ariilor de practică formează carusele continue spre stânga, cu șase linkuri originale accesibile, scroll/swipe nativ, drag cu mouse, săgeți și comenzi stânga/dreapta din tastatură. Săgețile aliniază următorul card complet. Copiile de buclă sunt excluse din tab și din arborele accesibil. Mișcarea se oprește la hover, apăsare, focus, în afara ecranului, în tab ascuns și la mișcare redusă. Focusul și săgețile cer reluare explicită. Efectul cardurilor este perspectivă CSS 2.5D, fără WebGL sau librărie de animație.

Bara sticky mobilă urmărește poziția reală a celor trei etape, cu progres și evidențierea etapei curente. Un singur scheduler deservește mișcarea și actualizările la scroll. Testele deterministe verifică pauza, reluarea, touch-hold, bucla, tastatura, idle în afara ecranului/tabului și mișcarea redusă. În browser au fost confirmate menținerea aceleiași poziții în timpul apăsării, dragul fără navigare accidentală, scrollul orizontal nativ și progresul 01 → 02 → 03. Browserul integrat nu permite injectarea unui gest tactil fizic; nu se declară verificare pe un telefon fizic.

Subsolul are grupuri distincte pentru ariile de practică, cabinet și informații utile, plus cele trei canale de contact. Fundalul este o scenă juridică nocturnă ilustrativă, nativă 1774 × 887 px, optimizată la 17–33 KB AVIF și încărcată lazy. Promptul exact este în `assets/GENERATED-V3.md`. Imaginea se elimină la contrast ridicat. Nicio fotografie nu reprezintă sediul real.

Landing-ul are trei contacte plutitoare: apel, WhatsApp și e-mail, într-o coloană desktop și bară compactă mobilă. Mesajele RO/EN sunt precompletate, cu contextul ariei de practică; pagina de programări preia numai un domeniu din lista permisă și actualizează mesajul cu formatul, durata și data/ora preferate. Mesajul indică explicit lipsa rezervării confirmate. Linkurile folosesc numărul și e-mailul cabinetului din brief. Nu s-au trimis mesaje și nu s-a verificat existența contului WhatsApp. Informarea de confidențialitate reflectă deschiderea serviciilor externe la alegerea utilizatorului.

Publicarea Sites este verificată separat de integrarea GitHub. PR #102 păstrează schimbările într-o ramură dedicată, fără merge în main. Nu există migrări, modificări DNS sau activări de procesatoare de plăți în această revizie.
