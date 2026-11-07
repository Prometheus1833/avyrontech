# Notificări native AVYRON

Task base: `f584e302f5e930c1f163e225b1a4409e6e41df68` (PR #111). Implementarea aparține AVYRON OS. Nu include `client-sites/cabinet-avocatura`, PR #110 sau publicarea cabinetului.

## Arhitectură

Inboxul canonic rămâne `operation_notifications` din D1. Migrarea aditivă `0104_native_notifications.sql` adaugă categoria, prioritatea și referința la resursa nativă, indexuri, configurație versionată, istoricul configurației și preferința individuală pentru blog. Nu schimbă datele CRM, autentificarea, prețurile sau stocarea fișierelor. Nu creează furnizori, chei API, Web Push ori trimiteri e-mail.

Evenimentele sunt create prin triggere în aceeași tranzacție cu entitatea sursă, inclusiv pentru scrierile existente din Workers și fluxurile operaționale. Constrângerea existentă `(user_id, deduplication_key)` previne duplicatele la retry. Un proiect creat și alocat aceleiași persoane în aceeași tranzacție nu produce două invitații identice.

| Eveniment | Destinatari candidați | Control live |
| --- | --- | --- |
| Proiect creat | Owner/Super Admin activ, staff cu acces global, beneficiar autorizat, apartenențe active | ACL nativ de proiect |
| Alocare proiect | Membrul staff alocat | Alocare încă activă, rol și ACL |
| Propunere nouă | Numai stafful alocat, fără autor | Alocare + rol + ACL, inclusiv pentru Super Admin |
| Actualizare în jurnalul destinat clientului / schimbare etapă | Beneficiari, membri și staff implicați, fără autorul actualizării | ACL de proiect; nu folosește notele interne |
| Abonament / data de facturare | Beneficiar autorizat al abonamentului | Aceeași entitate juridică, grant și ACL de proiect |
| Abonament de produs | Contul din `billing_subscriptions` | Apartenență directă la cont |
| Articol publicat | Cont autentificat, preferință blog activă | Doar articole publicate, deja scadente, din ultimele 14 zile și după crearea contului |
| Document publicat / partajat | Fluxurile existente | Filtrul nativ Document Center reverificat la fiecare citire |
| Anunț staff | Fluxul existent de anunțuri | Permisiunile native ale secțiunii, inclusiv MFA unde se aplică |

Articolele sunt materializate la citirea inboxului, maximum cinci articole eligibile pe cerere, deduplicate per articol și cont. Această limită controlează fan-out-ul, nu accesul la blog. Nu se creează notificări retroactive pentru toate proiectele vechi.

`projectAccessMap` este evaluatorul comun pentru accesul individual și verificarea în lot. Păstrează regulile existente pentru principal, organizație, proiect, client și permisiunile staff active. Referințele sunt rezolvate în lot; nu se trimite câte un lanț de interogări pentru fiecare rând din inbox. Nu există cache comun pentru conținutul privat.

## Rute și ecrane

- `/profil?tab=notifications`: inbox cu bannere pe categorii, filtre, citire și preferință blog.
- Clopoțelul și intrarea **Notificări** din meniul contului: mini panou ancorat, fără blocarea paginii.
- `/profil?tab=notification-settings`: configurație și monitorizare, exclusiv Owner/Super Admin cu MFA conform politicii existente.
- Card **Sistem de notificări** pe prezentarea internă, imediat după infrastructură/integrări, în prima parte a paginii.
- `GET /api/notifications/config`: numai configurația publică pentru vizitatori, fără conturi, statistici sau destinatari.
- `GET /api/notifications?lang=ro|en`: ultimele 100 de notificări autorizate din fereastra recentă de 200 de înregistrări sursă.
- `POST /api/notifications/:id/read`: destinatarul și resursa sunt reverificate; ID neautorizat sau revocat → 404; repetarea păstrează prima dată de citire.
- `PUT /api/notifications/preferences`: preferința blog a contului curent.
- `GET/PUT /api/notifications/admin`: configurație, contoare reale pe 30 de zile, salvare CAS și istoric. O versiune concurentă este refuzată cu 409.

Notificările sunt ordonate descrescător după dată și ID. Proiectele și abonamentele primesc accent vizual important, fără reordonarea cronologiei. Datele sunt actualizate la deschidere, la evenimentele de activitate și periodic la 60 de secunde numai când pagina este vizibilă. Nu este un sistem de push în timp real.

## Mesaje pentru vizitatori

Configurația inițială: 60 de secunde de timp activ, pauză de 24 de ore, o singură invitație pe sesiune. Timpul nu avansează în tab ascuns, fără focus sau când se completează un formular. Salturile de ceas și suspendarea calculatorului nu accelerează contorul. Sunt excluse contul, autentificarea, checkoutul, paginile private, politicile, demonstrațiile și paginile `noindex`. Preferința marketing trebuie să fie acordată; refuzul sau revocarea suprimă mesajele promoționale.

Textele RO/EN sunt editabile pentru șase contexte: general, website, magazin online, social media, logo, AI. CTA-ul duce exclusiv spre contactul AVYRON existent (`/#cta` sau `/en#cta`); nu sunt acceptate redirectări arbitrare, HTML executabil ori urmărire externă. Nu sunt modificate metadatele SEO, canonicalurile sau sitemapurile. Textele sunt clare și relevante contextual, fără promisiuni de poziționare sau trafic.

Noul flux coordonează invitațiile existente: invitația automată la newsletter și mesajul proactiv AVY sunt suprimate când sugestiile contextuale sunt active. Formularul de newsletter și chatul rămân disponibile la cererea utilizatorului. Utilizatorii autentificați nu primesc invitații promoționale de contact.

## Lansare și verificare

1. Validează ramura și PR-ul față de `main`; nu include PR-uri ale cabinetului.
2. Rulează verificările locale și CI; aplică migrarea 0104 prin fluxul existent de release, cu backup D1 înainte. Nu rula scriptul de release ca simplu test: poate modifica D1 și publica Workerul.
3. Publică API-ul cu schema înaintea frontendului; clienții vechi rămân compatibili cu coloanele noi. În cazul revenirii aplicației, păstrează schema aditivă și istoricul, fără down-migration distructivă.
4. Verifică în conturi reale distincte A/B, staff alocat/nealocat și Owner/Super Admin; verifică noul proiect, propunerea, revocarea, abonamentul, preferința și marcarea citită.
5. Verifică vizual mini panoul și mesajul public pe desktop și mobil. Testele cu conturi sintetice și bindingul SQLite local nu înlocuiesc confirmarea în conturile reale din producție.

Nu sunt necesare chei noi. Contoarele sunt înregistrări native și citiri, nu confirmări de livrare e-mail, Telegram sau WhatsApp. Backupul rămâne strategia D1 existentă; acest task nu pretinde activarea unui furnizor separat de backup sau a unor canale externe.

## Verificări locale ale implementării (07.11.2026)

- TypeScript aplicație + Workers, lint: trecute; patru avertismente React Refresh preexistente în Logo Studio.
- Build static/Pages și Worker, API dry-run: trecute; audit SEO cu 78 pagini indexabile și 212 pagini publice noindex. Aceste rezultate nu reprezintă confirmări de indexare GSC.
- 10 teste de integrare dedicate pe toate migrările reale SQLite/Hono și 3 teste pentru ceasul de activitate: trecute.
- Suita completă: 991 teste trecute, 1 benchmark opțional omis și 3 depășiri de 5 secunde sub încărcare. Cele trei cazuri au fost reluate izolat împreună cu al patrulea caz din aceleași fișiere: 4/4 trecute în 2,89 secunde. Nu au rămas aserțiuni eșuate în acele cazuri.
- Browser Chromium: 16/16 teste de notificări și regresii carusele trecute la 320, 390 și 1440 px. Capturile au fost inspectate vizual; clopoțelul duplicat din antetul mobil a fost eliminat.
- WebKit cu profil iPhone: 7/7 teste de notificări trecute. Reproducere: `PLAYWRIGHT_WEBKIT=1 npm run test:e2e -- --project=webkit-mobile e2e/native-notifications.spec.ts --workers=1` (necesită browserul WebKit Playwright instalat).

Nu au fost aplicate migrări remote și nu a fost publicată această funcționalitate în producție la momentul acestor verificări. Confirmarea în conturi reale rămâne etapa de acceptanță după lansare.
