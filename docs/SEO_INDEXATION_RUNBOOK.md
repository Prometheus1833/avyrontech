# AVYRON: indexare și vizibilitate organică

Acest document separă semnalele tehnice observabile de decizia de indexare a Google. Un sitemap valid, un răspuns `200` și un canonical corect ajută descoperirea, dar nu garantează indexarea, poziții sau trafic.

## Sursele de adevăr

- Codul din `main` și buildul de producție stabilesc ce pagini publică AVYRON.
- `https://avyron.ro/sitemap.xml` enumeră doar URL-uri canonice, indexabile, cu `lastmod` derivat din sursele paginii. Paginile RO și EN au propriile URL-uri și legături `hreflang` reciproce.
- `https://avyron.ro/robots.txt` este răspunsul efectiv de la Cloudflare. Cloudflare poate adăuga reguli administrate înaintea fișierului din repository; verificați răspunsul public complet când modificați setările de crawl. Nu blocați prin robots paginile `noindex`: crawlerul trebuie să poată citi instrucțiunea.
- La verificarea publică din 31.10.2026, Cloudflare a adăugat `search=yes` și reguli `Disallow` pentru roboți de antrenare, inclusiv `Google-Extended`. Acest token nu controlează includerea în Google Search; regulile pentru alte servicii AI țin de politica de crawl configurată în Cloudflare și trebuie evaluate separat, după scopul dorit.
- `https://avyron.ro/llms.txt` este o listă orientativă generată din sitemap și HTML. Nu este un mecanism de indexare Google sau o garanție de apariție în răspunsuri AI.
- Google Search Console pentru proprietatea `avyron.ro` arată starea raportată de Google. Rapoartele pot avea întârziere; inspecția URL separă varianta live de ultima versiune cunoscută de Google.

## Ce trebuie indexat

Paginile de servicii, articolele, huburile publice și cele 11 pagini strategice de produse au conținut și intenții distincte și intră în sitemap. Paginile utilitare ale catalogului au `noindex, follow`: rămân accesibile utilizatorilor și crawlerelor, dar nu concurează cu huburile prin rezultate aproape duplicate. Paginile de autentificare, administrare, erori și sistem au `noindex` la nivel HTTP. URL-urile vechi din registrul de redirecturi sunt configurate cu `301` spre canonicalul actual.

Cele patru pagini noi trebuie să apară separat după release:

| Limbă | Serviciu | URL |
| --- | --- | --- |
| RO | SEO și vizibilitate AI | `/servicii/seo-ai-visibility-performance` |
| EN | SEO and AI visibility | `/en/services/seo-ai-visibility-performance` |
| RO | Marketing și reclame | `/servicii/digital-marketing-ads` |
| EN | Marketing and ads | `/en/services/digital-marketing-ads` |

## Verificare înainte și după release

1. Pe branch: `npm run build`, `npm run seo:audit`, `npm run build:pages`, `npm run build:worker`. Auditul verifică HTML prerandat, canonical, noindex, sitemap, `hreflang`, imagini și `llms.txt`.
2. După ce commitul aprobat este în producție: `npm run seo:audit:live -- --require-growth-routes`. Comanda citește sitemapurile publice și verifică răspunsurile fiecărui URL. Un `404` sau un URL absent din sitemap înseamnă că releaseul nu a publicat pagina respectivă.
3. În Search Console, proprietatea **Domain: avyron.ro**, verificați `Sitemapuri` și `Indexarea paginilor`, apoi inspectați cele patru URL-uri noi. Confirmați că Google vede `200`, canonicalul declarat și selectat, indexarea permisă și pagina mobilă redată. Trimiteți sitemapul sau solicitați indexarea numai după ce URL-urile răspund corect live.
4. Pentru clasele `Descoperită, momentan neindexată` și `Accesată cu crawlere, momentan neindexată`, exportați URL-urile și inspectați eșantioane din fiecare tip de pagină. Verificați conținutul distinct, linkurile interne vizibile, redirecturile, canonicalul ales și data ultimei accesări. Nu transformați cele 212 pagini utilitare din buildul verificat în pagini indexabile doar pentru a crește numărul din raport.
5. Pentru `404`, identificați dacă URL-ul trebuie să existe, să redirecționeze permanent spre un echivalent real sau să rămână `404/410`. Pentru `Exclus prin noindex` și `Pagină alternativă cu etichetă canonical`, comparați cu lista intenționată; aceste stări pot fi corecte.
6. Revedeți rapoartele după procesarea Google. Notați data raportului, exemplele și decizia pe fiecare clasă de URL-uri; nu marcați problema rezolvată doar pentru că testul live sau cererea de indexare a reușit.

## Surse oficiale

- [Google: ghidul pentru sitemapuri](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: canonicalizarea URL-urilor](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [Google: versiuni localizate și hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: robots.txt și limitele sale](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google: funcțiile AI din Search](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: rolul tokenului Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Cloudflare: reguli robots.txt administrate](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)

## Descoperire și măsurare — actualizare 6 noiembrie 2026

`seo:audit` urmărește acum și linkurile HTML din pagina principală, inclusiv huburile publice `noindex, follow`. Un URL prezent doar în sitemap, fără traseu prin linkuri, oprește buildul. Raportul `seo-audit.json` include `discovery.orphanPages`, numărul de pagini accesibile și traseele de peste trei linkuri. Legăturile spre alte gazde nu sunt folosite pentru a ascunde o pagină orfană. Navigarea publică include carierele și demonstrațiile interactive, identificate explicit drept demo-uri.

Politica comună a Workerelor aplică `X-Robots-Tag: noindex, nofollow` tuturor răspunsurilor de pe `app.avyron.ro`, inclusiv replicilor unor rute publice. HTML-ul aplicației este `private, no-store`; bundle-urile statice păstrează cache-ul existent. Pe gazda canonică publică nu se schimbă eligibilitatea. Headerul HTTP prevalează asupra unui meta tag mai permisiv dintr-un fișier public reutilizat; autorizarea documentelor rămâne separată și obligatorie.

Tagul GA4 folosește coada `Arguments` cerută de Google. Descărcarea cu succes a `gtag.js` singură nu dovedește primirea evenimentelor. După lansare, verificați cererea `g/collect`, ID-ul fluxului și pagina de timp real din proprietatea corectă. Un test tehnic trebuie identificat drept test, nu raportat drept creștere organică.

Analiza rămâne condiționată de consimțământ. Codul exclude subdomeniile aplicației/API/Surveys, rutele private și preview-urile serviciilor; scoate query-ul și fragmentul din locația trimisă și păstrează doar originea referrerului. La retragerea acordului sau intrarea în cont, semnalul oficial `ga-disable-<ID>` suprimă și tagul deja încărcat. În GA4, păstrați măsurarea îmbunătățită automată oprită pentru acest flux: aplicația trimite explicit afișările și acțiunile publice, fără dubluri prin history și fără autocaptura formularelor/descărcărilor private. Nu înlocuiți lipsa acordului printr-un proxy de tracking.

## Bing și celelalte motoare

Meta tagul public `msvalidate.01` din `index.html` este dovada Bing pentru domeniul AVYRON, nu o cheie API. După deploy, în contul corect Bing Webmaster Tools confirmați verificarea prin HTML, trimiteți sitemapul canonic și verificați rezultatul real. Adăugarea unui domeniu cu starea `Not verified` nu înseamnă conexiune finalizată. Nu importați alte proprietăți Google și nu creați credențiale sau servicii plătite pentru această verificare.

Cloudflare Crawler Hints este mecanismul nativ ales pentru notificările IndexNow. În configurația domeniului AVYRON a fost găsit activ pe planul Free; revalidați starea înainte de a o raporta ulterior. Nu se adaugă alt serviciu, cheie publicată, cron sau registru de notificări paralel. Semnalele Crawler Hints și acceptarea unui sitemap reprezintă notificare/descoperire, nu confirmarea indexării de către fiecare motor. Google se verifică separat în Search Console.

Nu publicați în Git rapoarte Analytics private, exporturi brute de cont sau tokenuri. Păstrați dovezile operaționale în raportul privat al sesiunii. Dispozitivele reale, traficul organic, datele de laborator și rapoartele Core Web Vitals sunt dovezi distincte.

- [Google: instalarea tagului și coada Arguments](https://developers.google.com/tag-platform/gtagjs)
- [Google: dezactivarea măsurării](https://developers.google.com/tag-platform/security/guides/privacy)
- [Cloudflare: Crawler Hints și disponibilitatea Free](https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/)
