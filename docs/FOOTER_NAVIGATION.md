# Subsolul public AVYRON

Landing page RO/EN păstrează acțiunile originale în ordine: WhatsApp, Exemplu Gratuit / Free Example (formularul `#cta`), Sună-ne / Call us și E-mail. Navigarea publică, linkurile legale, setările cookie și ANPC SAL rămân disponibile. Nu se adaugă intrări duplicate către cont sau administrare.

`src/components/site/footerActions.ts` selectează următorul pas după ruta exactă sau familia ei. Serviciile folosesc propriul contact/configurator; Website la 0 lei folosește brieful său; mentenanța folosește comparația abonamentelor; carierele folosesc candidatura. Catalogul duce la ghid, produsele la catalog, articolele la blog, prezentarea agenției la portofoliu. Paginile informative fără un pas suplimentar relevant păstrează numai contactul direct. Un slug de articol/produs nu poate fi confundat cu alt tip de pagină.

Limba subsolului urmează ruta RO/EN, inclusiv după o vizită anterioară în cealaltă limbă. Setul public de acțiuni este același pentru vizitatori, clienți și staff; drepturile conturilor nu se schimbă.

Pe ecrane înguste, contactul se așază pe două rânduri, cu ținte de minimum 44 px și focus vizibil. La intrarea subsolului în viewport, scurtăturile flotante de contact se ascund prin `IntersectionObserver`; la ieșire reapar. Observerul și atributul documentului sunt curățate la demontare. Notificările, newsletterul și dialogul cookie nu folosesc această regulă. Stratul subsolului protejează și conținutul prerandat de suprapunerea scurtăturilor.

## Verificare

- După `npm run build:pages`, `src/test/footer-artifacts.test.ts` verifică destinațiile și ancorele tuturor subsolurilor generate din registrul public.
- `src/test/footer-actions.test.ts` verifică delimitarea rutelor, limbile și fallbackul fără acțiuni inventate.
- `e2e/footer.spec.ts` verifică navigarea și ancorele reale, dimensiuni 320–1440 px, tastatura, cookie-urile, lipsa suprapunerilor și reapariția scurtăturilor. Conturile client/staff din aceste teste sunt sintetice.
- Se păstrează regresiile existente din `e2e/public-routes.spec.ts` și `e2e/website-subscriptions.spec.ts`; rularea cu `PLAYWRIGHT_WEBKIT=1` adaugă motorul WebKit pentru mobil.

Starea efectivă a testelor și a producției se consemnează în PR; această descriere nu constituie dovadă de deploy sau certificare WCAG completă.
