# Portofoliu public AVYRON

Bază: `7322cf40e09e20b8b6b22a0f18090df574f9f15e` (`origin/main`), ramură dedicată `codex/portfolio-showcase-2026-11-09`. Implementare independentă de PR-urile #122–#127, fără merge, deploy, migrare sau modificări ale proiectelor prezentate. Cabinetul și workflow-ul său sunt excluse.

## Rute și descoperire

- `/portofoliu` și `/en/portfolio`: pagini proprii, bilingve, indexabile și prerandate. Redirecționările anterioare ale acestor două URL-uri sunt eliminate din routerul React și registrul edge.
- Butonul „Explorează portofoliul Avyron” apare imediat sub caruselul serviciului Website de prezentare profesional, în ambele limbi.
- Legătura secundară din footerul paginii Despre noi duce la noul portofoliu.
- Canonical, hreflang, sitemap, `llms.txt`, breadcrumbs și `CollectionPage`/`ItemList` sunt generate prin mecanismele native. Metadata reflectă conținutul vizibil, fără rezultate comerciale sau evaluări inventate.
- Prerandarea adaugă un `modulepreload` numai pentru modulul acestei rute, identificat din hashul buildului curat; homepage-ul și rutele private nu primesc preîncărcări noi. Mecanismul nativ este descris în [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload).
- Preview social propriu: `public/og/portfolio-2026.jpg`, 1200×630. Regenerare locală: `node scripts/generate-portfolio-social.mjs`.

Aceste verificări privesc ieșirea tehnică; indexarea Google/Bing și traficul nu sunt demonstrate de un build sau un scor Lighthouse.

## Organizare editorială

Hero → workflow în cinci etape → navigare pe domenii → Wellness & Beauty → Marketing & Comerț → Servicii & Platforme → Juridic & Încredere → servicii conexe → discuție despre proiect.

Fiecare domeniu separă recomandările pentru nișă de lista „Ce am construit” a fiecărui proiect. Avocatura și notariatul sunt direcții pentru proiecte viitoare, fără a inventa beneficiari sau lucrări. Retuvo are o notă de stadiu; prezentarea funcțiilor viitoare nu este tratată drept activare operațională.

Conținut: `src/data/portfolioShowcase.ts`. Capturi și variante responsive: `src/assets/portfolio-showcase`, mapate în `src/data/portfolioShowcaseImages.ts`. Acesta este conținut editorial public, nu un CRM nou și nu un export din datele private ale proiectelor.

## Proveniență verificată la 9 noiembrie 2026

| Proiect | Sursă publică |
| --- | --- |
| Flawless Studio | [flawlesstudio.ro](https://www.flawlesstudio.ro/) |
| Ruller | [ruller.eu](https://ruller.eu/) |
| Cutiuța Magică | [cutiutamagica.eu](https://cutiutamagica.eu/) |
| CLAR Lumânări | [clarlumanari.ro](https://clarlumanari.ro/) |
| Retuvo | [retuvo.ro](https://retuvo.ro/) |
| Detectiv ICM | [detectiv-icm.avyron.eu](https://detectiv-icm.avyron.eu/) |

Paginile au fost consultate anonim, fără completarea formularelor, comenzi, programări, mesaje sau plăți. Capturile de prezentare provin din viewport desktop de 1600×1000; sunt livrate ca WebP 1280×800 și 640×400, cu `srcset`, dimensiuni rezervate și lazy loading sub hero. Nu sunt mockupuri inventate. Conținutul și aspectul se reverifică atunci când site-urile se schimbă.

## Design, mișcare și accesibilitate

- Scena hero folosește capturi reale în spațiu CSS 3D: perspectivă, adâncime, rotație controlată de pointer și reflexe discrete.
- Introducerea folosește geometrie XYZ cu proiecție în Canvas 2D, fără o bibliotecă 3D suplimentară. Pe ecrane de minimum 640 px, durată fixă: 1250 ms, maximum 30 FPS și DPR 1,5; nu așteaptă imagini sau API-uri. Există omitere manuală și afișare o singură dată pe sesiune. Sub 640 px se afișează direct hero-ul cinematic cu capturi CSS 3D, fără ecran introductiv care să amâne conținutul. Ancorele directe o sar. Pe o încărcare inițială de peste 2,5 secunde, introducerea este omisă: pagina prerandată nu este acoperită ulterior de un ecran de încărcare. Dimensiunile canvasului sunt rezervate în CSS înainte de inițializare. Introducerea este montată prin portal în `document.body`, astfel încât animația cu transform a containerului global să nu îi schimbe originea fixed; testul Chromium urmărește și deplasările de layout.
- `prefers-reduced-motion` și Save-Data opresc mișcarea decorativă. Hero-ul se oprește în afara viewportului și când documentul este ascuns; controlul de pauză rămâne disponibil după inițializare, inclusiv când browserul derulează spre el; observerele și RAF-urile sunt eliberate la demontare.
- Proiectele și CTA-urile sunt HTML semantic, vizibile fără WebGL. Stilul critic al rutei este inclus în HTML la prerandare și este eliminat la ieșirea din pagină în navigarea SPA. Navigare nativă, skip link cu țintă focusabilă, focus vizibil, control de pauză, hover și focus echivalente, suport forced colors. Numele accesibile includ textele vizibile ale controalelor și linkurilor. Selectorul comun de limbă include codul RO/EN în etichetă; contrastul versiunii politicii din bannerul comun de cookies a fost mărit.
- AVY reutilizează chatul existent. Numai pe portofoliu, poziția implicită este jos-dreapta, cu cheie separată pentru poziția personalizată; astfel nu acoperă hero-ul sau navigarea domeniilor. Nu se schimbă furnizorul sau politica agentului.

## Verificare și limite

Verificat local pe artefactul Pages, servit de Workerul nativ prin Wrangler local, fără legături către baze de date sau modificări de producție:

- 30/30 teste browser (28 pentru portofoliu și 2 de regresie a selectorului de limbă în înregistrare): Chromium și WebKit, lățimi 320, 390, 768 și 1440 px, cele șase imagini, ancore și intrare directă cu fragment după inițializarea React, limbi/canonical, butonul de sub carusel, intrare/ieșire SPA și eliminarea stilului, tastatură, lipsă WebGL, Save-Data, pauză pe mobil, încărcare lentă și navigare fără JavaScript.
- 0 încălcări axe-core în domeniul `.pf-page`, pentru regulile automate WCAG 2 A/AA, 2.1 A/AA și 2.2 A/AA. Nu constituie certificare.
- 64/64 teste unitare și de integrare în șapte fișiere: portofoliu, router Worker, SEO/discovery, calculatorul serviciului și experiența chatului.
- `npm run typecheck`: PASS. ESLint pentru fișierele TypeScript modificate: PASS, fără erori sau avertismente.
- `npm run build`, `npm run build:pages`, `npm run build:worker`: PASS. `npm run build:api`: dry-run PASS, fără deploy.
- Audit SEO al artefactului: PASS, 80 pagini indexabile, 212 pagini publice noindex și 11 URL-uri strategice de produse; sitemapul include ambele rute ale portofoliului.

Testele sunt în `e2e/portfolio-showcase.spec.ts`, cazul Despre/Portofoliu din `e2e/public-routes.spec.ts`, `src/test/portfolio-showcase.test.ts`, routerul Worker și suitele SEO/chat existente. Pentru WebKit: `PLAYWRIGHT_WEBKIT=1`. Configurația implicită CI utilizează Vite preview; cazul fără JavaScript cere explicit documentul generat deoarece preview nu reproduce rutarea edge. Verificarea locală finală folosește Workerul Pages real, la URL-urile canonice.

Capturi pentru review: [desktop](previews/portfolio-desktop.webp), [mobil](previews/portfolio-mobile.webp), [Wellness](previews/portfolio-wellness.webp).

Verificarea automată și emularea nu substituie dispozitive fizice iOS/Android, un cititor de ecran real, testarea tuturor integrărilor externe sau o certificare WCAG AA. Nu se trimit mesaje reale și nu se testează tranzacțiile beneficiarilor. Publicarea configurației caruselelor și conținutul editorial al acestei pagini sunt suprafețe distincte; nu se revendică sincronizare automată cu CRM-ul privat.

Rollback: se revine asupra commitului acestui PR; nu există migrare, date de convertit sau modificări ale infrastructurii. Înlăturarea paginii și a hintului de prerandare trebuie făcută împreună.

## Măsurători Lighthouse

Lighthouse 13.6.0, Chrome izolat, Worker Pages local; rulări mobile și desktop succesive, fără build sau teste browser concurente. Vizită anonimă inițială, banner de consimțământ implicit; API-ul extern blocat. Rezultate sintetice, fără promisiune de trafic, indexare sau date CrUX/INP.

| Profil | Performanță | Accesibilitate | Bune practici | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | 76 | 100 | 100 | 100 | 5.24 s | 233 ms | 0 |
| desktop | 97 | 100 | 100 | 100 | 1.16 s | 9 ms | 0 |

Performanța mobilă rămâne sub intervalul verde Lighthouse; LCP depășește 2,5 secunde în acest test. Imaginile responsive, prioritatea capturilor din hero, lipsa unui motor WebGL, preîncărcarea rutei și oprirea animației în afara ecranului sunt implementate. Profilarea indică în continuare costuri ale pornirii aplicației comune; nu declarăm toate Core Web Vitals rezolvate. Experimentul local fără tranziția globală nu a demonstrat un câștig și nu a fost inclus în cod.

Datele măsurate, condițiile și hashurile rapoartelor sunt în [PORTFOLIO_QA.json](PORTFOLIO_QA.json).
