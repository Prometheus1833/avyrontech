# Blogul în landing page

Ramură: `codex/home-blog-carousel-2026-11-08`, bazată pe PR #119, commit `8ca17408121fbea10b6049cb5894a51bdcec6516`. Baza `origin/main` verificată la început: `01acfb909a7026731f2542f17da00bb3391f99a3`. Este o livrare separată; nota nu confirmă merge sau deploy. PR-ul țintește main pentru a rula fluxurile CI existente, care nu pornesc pe o bază de tip feature branch. Integrați întâi #119, apoi actualizați ramura și revalidați acest PR. Modificarea proprie de blog se poate revizui separat în commitul `64b12ee791b07c595da415493e0b99933730cba3`.

## Sursa comună și interfața

`LatestBlog` este încărcat aproape de viewport, imediat înainte de `Socials` („Urmărește Avyron”), cu ancoră `#blog-avyron`. Prezintă maximum șase articole, în ordine descrescătoare a publicării: copertă, dată, titlu, mini-descriere și link direct către articol. Există și link către blogul complet, localizat RO/EN. Titlurile, rezumatele și URL-urile există și în HTML-ul prerandat.

Se reutilizează `/api/blog/posts?lang=…&limit=6`, clientul `blogApi` și arhiva publicată `BLOG_INDEX` / `BLOG_INDEX_EN`, fără catalog editorial paralel. `blogFeed.ts` oferă aceeași conversie, reconciliere după slug, filtrare și sortare pentru blog și landing. API-ul suprascrie versiunea inclusă în build; ciornele, articolele viitoare și datele invalide nu intră în selecție. În lipsa API-ului rămâne arhiva publică inclusă în site. Aceasta este sursă editorială publicată separată de D1; absența unui articol din răspunsul API nu șterge automat acea arhivă. Articolele fără traducere nu sunt inventate în engleză.

Actualizarea se face la montarea secțiunii sau schimbarea limbii. Nu există polling suplimentar sau promisiune de sincronizare instantanee pe un tab deschis permanent. Cererile landing sunt anulate la demontare; răspunsurile întârziate nu suprascriu limba curentă. Blogul ignoră refreshurile editoriale depășite.

## Mișcare și accesibilitate

Se reutilizează Embla 8.6 existent, fără dependență nouă. Săgețile, drag/swipe și tastele stânga/dreapta oferă navigare manuală. Intervalul de șase secunde există numai când secțiunea este vizibilă și tabul activ; nu rulează în reduced-motion. Hoverul mouse-ului pune temporar pauză. Atingerea, clickul și focusul opresc rularea până la reluarea explicită; atingerea nu creează o stare hover persistentă. Butoanele au etichete localizate și ținte de 44 px. Nu se anunță repetat în cititorul de ecran fiecare pas automat. Timerele și listenerii sunt eliminați la demontare.

## Imagini și verificare live

`BlogCover` este comun caruselului, cardurilor și imaginii principale de articol. Folosește ruta API existentă pentru media încărcată, o copertă editorială locală când sursa lipsește/eșuează și un placeholder accesibil dacă și fallbackul eșuează. Nu folosește URL-uri directe R2, r2.dev sau mecanisme de ocolire a verdictului antivirus. Dimensiunile/aspect ratio rezervă spațiul înaintea descărcării; coperțile caruselului sunt lazy-loaded.

Audit public din 8 noiembrie 2026: cele 10 coperți `/news/*.webp` au răspuns HTTP 200, `image/webp`, aproximativ 12–88 KB. Verificarea separată în Chromium headless pe `https://avyron.ro/blog` a confirmat `complete=true`, `naturalWidth=1200`, `naturalHeight=630` pentru toate cele 10. Acest audit descrie versiunea publică existentă, nu dovedește lansarea noului carusel. Browserul izolat de audit a fost închis; nu au fost mutate taburile sau conturile utilizatorului.

## Validare și livrare

- Teste native: sortare, limbă, API overrides, excluderea ciornelor/futurelor, URL-uri de imagine, fallback/placeholder, pornire numai în viewport, pauză/focus/hover, resume, touch, tab ascuns și cleanup.
- Browser: Chromium/WebKit, 320/1440 px, navigare la blog/articol, coperți încărcate, date API publicate noi, copertă 404, autoplay/pauză, drag, reduced-motion și reluare tactilă pe dispozitivul cu touch emulat.
- Prerender: șase linkuri de articole, link de blog și poziția imediat înaintea secțiunii social în ambele limbi.
- Typecheck aplicație/Worker, lint, build static/Pages și standalone Worker; snapshotul comercial se omite explicit cu `SERVICE_CONTENT_SNAPSHOT_SKIP=1` pentru a evita sincronizarea remote implicită în timpul buildului local.

Fără migrare, endpoint nou, modificare de autentificare/RBAC, serviciu plătit sau scriere remote. Cabinetul și PR #110 rămân excluse. API-ul și media R2 păstrează politicile existente. Livrarea în producție cere integrarea/revalidarea PR-urilor și autorizarea release-ului.

### Rezultate locale finale

13 teste de feed/media/lifecycle și 44 teste de prerender trecute (57 total în rularea finală). Cele 10 scenarii browser Chromium/WebKit au trecut pe buildul Pages, inclusiv reluarea prin atingere în WebKit; cele patru scenarii de layout/navigare au trecut și pe artefactul standalone Worker. Capturile stabilizate la 320/1440 px au fost inspectate vizual. Typecheck aplicație/Worker și buildurile static/Pages/Worker au trecut; auditul SEO raportează 78 pagini indexabile, 212 pagini publice noindex și 11 URL-uri strategice produse. Lint: zero erori, patru avertismente Fast Refresh preexistente, fără avertismente noi.
