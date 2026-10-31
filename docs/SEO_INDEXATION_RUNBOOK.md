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
