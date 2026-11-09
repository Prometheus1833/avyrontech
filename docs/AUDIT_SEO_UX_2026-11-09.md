# Audit tehnic SEO, UX și consimțământ — 9 noiembrie 2026

## Context și delimitare

Repository: `Prometheus1833/avyrontech`. Bază auditată: `6952d4e652f0d2da4a3284cc7a32d728e383051a`, din PR #123 (Website prin abonament), peste `origin/main` `7322cf40e09e20b8b6b22a0f18090df574f9f15e`. Remedierile sunt izolate pe `codex/seo-ux-audit-2026-11-09`; PR #122 (securitate/Access) și PR #110 (cabinet de avocatură) rămân separate.

React/Vite/React Router, prerandare statică, Cloudflare Pages și Worker de site, API Worker cu D1/R2. Au fost reutilizate registrul de rute, metadatele comune, formularul și CRM-ul native, Turnstile, consimțământul existent, GA4 și măsurarea first-party. Nu s-au adăugat furnizori, abonamente, dependențe sau migrări.

Site-ul public a fost verificat prin citire și o vizită izolată cu acord Analiză pentru confirmarea transportului Google Analytics. Toate trimiterile din testele browser sunt interceptate; nu au fost create leaduri, conturi, emailuri, plăți sau evenimente reale de conversie. Nu s-au modificat producția, configurația Cloudflare, datele firmei ori proiectul cabinetului.

## Rezultate pe cele 17 cerințe

| Element | Status inițial | Problemă | Remediere aplicată | Status final |
|---|---|---|---|---|
| 1. Titluri | Unice în HTML-ul prerandat | Nicio duplicare detectată pe rutele indexabile | Păstrate; auditul existent rămâne obligatoriu în build | Verificate automat |
| 2. Descrieri | Unice în HTML | Nicio duplicare detectată | Păstrate, inclusiv RO/EN și pagini de produs | Verificate automat |
| 3. Open Graph / Twitter | Imagini dedicate existente | Configuratorul declara 1200×630/JPEG pentru un WebP 704×704; articolul edge putea moșteni tipul imaginii de pe homepage | Dimensiuni explicite reale pentru configurator, MIME după extensie, eliminarea dimensiunilor necunoscute și a metadatelor moștenite | Verificare automată a fișierului, dimensiunilor și MIME în build; test pentru articolul edge |
| 4. Favicon / manifest | Set complet existent | Lipsea verificarea automată a dimensiunilor | Control pentru ICO, PNG 16/32/96, Apple 180, manifest 192/512 | Validat în build |
| 5. Robots | Configurat public / privat | Nu s-a găsit blocare accidentală a paginilor publice auditate | Păstrat; control live pentru site, aplicație și documente anonime | Verificat; robots nu înlocuiește autentificarea |
| 6. Sitemap | Canonical, public, generat din registru | Nicio rută privată/noindex detectată în sitemap | Păstrate verificările de XML, lastmod, hreflang, imagini și descoperire HTML | 78 URL-uri live incluzând delegarea surveys; local 80 cu cele două rute din PR #123 |
| 7. Alt / imagini | Atribute alt prezente | Logo-ul din lista serviciilor nu avea dimensiuni HTML | Dimensiuni explicite; verificare alt și dimensiuni în build | Verificat pe HTML-ul indexabil |
| 8. Responsive / accesibilitate | Fără overflow în matricea inițială | Contrast insuficient pe serviciile generale și configurator; modalul bibliotecii nu gestiona complet focusul | Culori ajustate contextual; controale de cookies minimum 24px; Dialog Radix existent pentru focus și Escape, restaurarea focusului | Verificat prin axe și browser, conform matricei de mai jos |
| 9. CTA mobil | Bară de contact și WhatsApp existente | Cookie bannerul acoperea controalele fixe; safe-area incompletă | Controalele opționale sunt ascunse pe durata panoului de consimțământ; safe-area reutilizată | Fără CTA duplicat; test de vizibilitate și viewport scurt |
| 10. Loading | Butoane ocupate existente | Cereri fără timeout; două submit-uri în același render puteau porni simultan | Helper comun cu AbortController pentru răspuns și corp, timeout 20s (180s pentru cereri cu atașamente), fără retry automat; blocare sincronă prin ref | Teste pentru răspuns blocat și submit simultan |
| 11. Form errors | Validare backend și Turnstile existente | Erori numai în toast, câmpuri fără etichete accesibile în configurator; răspuns invalid putea deveni succes | Mesaje inline `role=alert`, labels/autocomplete/minLength, `aria-busy`; verificarea chitanței serverului în cele trei formulare demo și a răspunsului newsletter | Datele se păstrează la erori; rate limiting și verificarea serverului rămân active |
| 12. Confirmări | Confirmare contextuală existentă | Configuratorul putea afișa succes pe `{}`; configuratorul blog trata salvarea cu eroare de email ca eșec | Succes numai pe răspuns salvat; salvarea în CRM este distinctă de livrarea emailului | Nu s-a introdus o pagină redundantă de mulțumire sau PII în URL |
| 13. Confidențialitate | Politică RO/EN și date de contact existente | Inventarul tehnologiilor omitea coșul, brief-ul, draftul abonamentului și invitațiile | Inventar factual RO/EN completat în politica de cookies; documentele juridice existente păstrate | Responsabilul trebuie să valideze juridic scopurile, retenția și transferurile externe |
| 14. Termeni | Pagini RO/EN și linkuri în footer/fluxuri existente | Nu există dovadă de aprobare juridică finală pentru toate relațiile comerciale | Nu s-au inventat condiții, date fiscale, prețuri sau politici de retur | Verificare tehnică realizată; aprobarea juridică rămâne umană |
| 15. Consimțământ | Acceptare, refuz, personalizare, redeschidere existente | Marketing singur încărca GA; retragerea nu se propaga între taburi și păstra identificatori; newsletterul înregistra pagini înainte de acord Marketing | Google se încarcă numai cu Analiză; sincronizare `storage`, eliminare `_ga*` și sesiune first-party, eliminarea identificatorilor opționali Marketing; istoric newsletter doar după acord | Teste pentru opt-in, retragere, taburi, stocare golită și nouă sesiune |
| 16. Analytics | GA4 + D1 first-party existente | Salvarea repetată a acordului putea dubla page_view; lazy navigation putea folosi titlul anterior | Deducere duplicări pe ruta curentă, așteptarea canonicalului destinației; validare format ID, fără credențiale în URL; evenimente pentru bara de contact | Trackerele rămân excluse pe conturi, documente și preview; transportul live GA a răspuns 204, fără certificarea rapoartelor proprietății |
| 17. Contact | DIGITAL ECOTECH SOLUTIONS S.R.L., CUI și sediu în configurația existentă | Nu s-au detectat contradicții ale contactului principal în suprafețele verificate | Datele existente confirmate de utilizator au fost păstrate | Nicio adresă ori informație juridică inventată |

## Navigare, date structurate și imagini

Verificarea inițială a identificat 27 de apariții ale unor ancore inexistente (10 destinații distincte). Cererea de ofertă din Bibliotecă are acum destinație funcțională chiar fără efecte selectate; prețurile Blog/QA trimit la secțiunile reale; serviciile trimit la `#exemple`; demo-urile nu mai promit o galerie/hartă inexistentă prin linkuri fără destinație. Nu au fost introduse funcții de rezervare sau hărți fictive în demo-uri.

Patru fotografii originale ale demo-ului Studio Mara aveau URL-uri de preview `/__l5e/assets-v1/…` care răspundeau 404 pe domeniul AVYRON. Au fost recuperate prin citire din preview-ul proiectului AVYRON confirmat de conector (fără agent, editare, credite sau publicare Lovable). Fișierele JPEG 1024×768 corespund mărimilor din metadatele existente: 70.647, 93.480, 117.944 și 126.075 bytes. Sunt incluse acum prin importuri Vite, fără dependență la runtime de hostul de preview. Metadatele originale sunt păstrate.

Încărcarea rutelor are acum feedback accesibil, în locul unui container gol. Importurile întrerupte la părăsirea paginii nu mai declanșează reîncărcarea documentului vechi; garda împotriva reîncărcărilor repetate este resetată numai după încărcarea efectivă a rutei, nu imediat în entrypoint. Dacă stocarea browserului este blocată, eroarea originală ajunge la un ErrorBoundary de rută cu acțiuni de reîncărcare și întoarcere acasă, fără expunerea detaliilor excepției.

Biblioteca publică are un fundal întunecat și context de stacking propriu: straturile cu z-index negativ nu mai ajung sub fundalul deschis al paginii. Textele auxiliare cu opacitate mică sunt lizibile pe acest fundal; hover-urile și efectele vizuale sunt păstrate. Contrastul etichetei din modal a fost ajustat contextual.

Auditul extins verifică și ancorele spre pagini prerandate, imagini sociale locale, MIME/dimensiuni, favicon, alt și dimensiuni de imagini. Validările existente rămân active pentru canonical, unicitatea metadatelor, hreflang reciproc, JSON-LD, sitemap, noindex, llms și accesibilitatea paginilor din linkuri HTML. Raportul generat nu conține recomandări de schemă restante pentru suprafețele prerandate.

## Măsurători și verificări

- Baseline public read-only: audit live reușit pentru cele 78 URL-uri din sitemap (inclusiv surveys delegat), două robots.txt, excluderile pe hostul aplicației și acces anonim refuzat la documente.
- Chrome DevTools MCP a fost lansat izolat, deoarece profilul implicit era ocupat; nu s-a întrerupt browserul existent. Trace homepage live: LCP 1669ms, CLS 0.00, TTFB 53ms, desktop fără CPU/network throttling. Nu există date CrUX în această măsurătoare și nu s-a măsurat INP.
- Lighthouse homepage live, profil mobil: Accessibility 100, Best Practices 100, SEO 100. Sunt rezultate de laborator pentru homepage, nu scoruri pentru întregul site sau dovadă de indexare.
- Google Analytics live: într-un context izolat cu Analiză acceptată și Marketing refuzat, tagul s-a încărcat și un `page_view` pentru `/` a primit HTTP 204 de la endpointul Google `region1.google-analytics.com/g/collect`. Nu s-a trimis o conversie ori o cerere de contact; identificatorii de sesiune nu sunt incluși în raport.
- Baseline browser: 7 pagini reprezentative × 320/390/768/1440px; fără overflow orizontal. Axe a identificat contrastul insuficient pe `/servicii` și `/configurator`, corectat ulterior.
- Rezultatele verificării complete a reviziei sunt disponibile în checks-ul PR-ului (workflow „Verify AVYRON”). Verificarea CI este activă și pentru PR-uri cu bază `codex/**`, astfel încât acest audit poate fi verificat separat de PR #123.

## Intervenții manuale și limite

1. Validarea juridică a politicilor, termenilor, retenției, raportului dintre entitățile comerciale și transferurilor de date aparține responsabilului autorizat. Auditul nu reprezintă certificare juridică.
2. GSC/Bing: auditul HTTP și sitemapul nu demonstrează indexare, impresii sau trafic. Nu s-au modificat proprietăți și nu s-au depus cereri de indexare. Sunt necesare accesul la rapoarte și verificarea URL Inspection pentru motivul exact al eventualelor excluderi.
3. GA4: testele verifică încărcarea/consimțământul și comenzile prin transport simulat, iar o vizită live izolată a confirmat răspunsul collect HTTP 204. Acestea nu confirmă primirea în proprietatea Google, filtrele interne, retenția din cont sau conversii reale.
4. Testele de formulare nu trimit emailuri și nu creează leaduri de producție. Timeoutul clientului nu anulează garantat procesarea deja începută pe server. Nu există retry automat; rate limiting și Turnstile existente limitează abuzul. Nu se pretinde idempotentizare server nouă pentru formularele demo vechi; fluxul nou de abonament își păstrează mecanismul existent.
5. Browserul WebKit este emulare iPhone, nu un test pe dispozitiv fizic. Zoomul/safe-area și configurațiile de browser trebuie evaluate și pe dispozitivele țintă dacă există particularități hardware.
6. PR #123, migrarea 0111 și configurarea comercială a abonamentului nu sunt declarate lansate de acest audit. PR #122 și configurarea Access rămân separate. Nu s-au activat MFA, servicii plătite ori procesarea documentelor confidențiale prin furnizori neverificați.
7. Fișierele 3D/editor existente produc avertismente de chunk mare; acestea nu sunt rescrise în lipsa unei regresii măsurate. Baseline-ul public nu a indicat economii de render-blocking relevante care să justifice schimbarea infrastructurii.

## Fișiere și livrare

Fișierele afectate sunt enumerate în diff-ul PR-ului: utilitarele comune SEO/analytics/formulare, CookieBanner/Newsletter/ContactBar, cele trei formulare demo și modalul de cerere, biblioteca, paginile Configurator/Servicii/CookiePolicy, două demo-uri, articolul edge, scriptul SEO și testele unitare/browser. Sunt incluse și cele patru fotografii originale recuperate, demo-ul Studio Mara și mecanismul de recuperare a rutelor. Nu există schimbări în `client-sites/cabinet-avocatura`, infrastructură sau migrări.

Publicarea în producție și merge-ul necesită autorizarea explicită a lansării. Rollback-ul acestui audit este revenirea commitului pe ramura sa; nu există date ori migrări de inversat.

## Validare locală și CI

| Verificare | Rezultat observat |
|---|---|
| Audit SEO live | Reușit pentru toate URL-urile din sitemapul public; fără trimitere în GSC |
| Build static și Pages | Reușit; 80 pagini indexabile (79 pe avyron.ro + surveys delegat), 212 pagini publice noindex |
| Build standalone site Worker | Reușit; aceeași validare SEO |
| Build API Worker | Reușit în dry-run, fără deploy sau modificări D1 |
| Typecheck app și Worker | Reușit |
| Lint | Zero erori; patru avertismente preexistente în LogoLoader, StageProvider și StudioParts |
| Suita unitară generală locală | 129 fișiere: 1.135 teste trecute, un benchmark opt-in omis; rulare serială cu timeout de test 30s și hook 60s, 1.395,82s |
| Regresii unitare dedicate | Consimțământ, tracking, chitanțe/timeout, metadate și recuperarea rutelor, inclusiv erori controlate și stocare blocată |
| Browser | Chromium și WebKit/iPhone; matrice 320/390/768/1440, axe pe homepage/servicii/configurator, viewport scurt, cereri simulate și focus modal |
| GA live | Tag încărcat cu acord Analiză, `page_view` HTTP 204; fără conversie reală |

Prima rulare generală locală, concurentă cu alte verificări, a înregistrat eșecuri și a fost întreruptă; nu este raportată ca reușită. Rularea serială de mai sus a trecut. Sincronizarea consimțământului păstrează panoul deschis în cursul editării; scrierile care schimbă numai timestampul nu elimină alegerile nesalvate. Revocările reale continuă să fie aplicate imediat. Testele browser au identificat restaurarea focusului și au impus sincronizarea explicită după inițializarea clientului, deoarece HTML-ul prerandat este vizibil înainte de atașarea handlerelor React. Testul vechi pentru contact folosește acum o alegere de cookies explicită; bara trebuie să rămână ascunsă când panoul este deschis. Cererea din bibliotecă reutilizează CTA-ul existent, cu ancoră permanentă; nu se adaugă un al doilea formular.

Rezultatul complet al reviziei publicate, inclusiv toate testele browser existente și buildurile, se verifică în checks-ul PR-ului și în [Verify AVYRON](https://github.com/Prometheus1833/avyrontech/actions/workflows/verify.yml). Nu se înlocuiește o verificare eșuată cu un rezultat dintr-o revizie diferită.

Verificarea Lighthouse pe preview-ul local a avut Accessibility 100 și SEO 100, Best Practices 96: API-ul de producție refuză prin CORS originile locale neautorizate. Restricția nu a fost relaxată pentru scor. Verificarea experimentală ARD a primit HTML-ul fallback Vite pentru `/ai-catalog.json`; în producție, resursa absentă răspunde 404 și nu este declarată disponibilă. Aceste rezultate locale nu înlocuiesc verificarea domeniului public.
