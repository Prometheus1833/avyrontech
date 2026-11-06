# Cont client — suport, facturi și coș

6 noiembrie 2026. Bază task: `e892fc8a78588a450bebb7820289623291305653` (#99); ramură `codex/client-support-billing-cart-2026-11-06`. #99 a fost reverificat în GitHub cu toate verificările verzi. Lotul cumulativ #94–#99 rămâne în istoric; acest task nu face deploy.

## Navigare

- O singură intrare **Suport și mesaje**, în navigarea contului și meniul personal: solicitări de suport și conversații cu echipa proiectelor autorizate. Nu încarcă directorul staffului sau canalele interne. Linkurile vechi `tab=intern` deschid `tickets&supportView=messages`; navigarea staffului rămâne distinctă.
- **Plăți și facturi** reunește istoricul cu descărcări și panoul de date fiscale/metode mascate. `tab=invoices` rămâne un alias către istoricul noii secțiuni; nu există două intrări în meniu.
- Bara mobilă a clientului: Acasă, Servicii, Coș, Produse, Mai multe. Contorul coșului citește aceeași stare ca lista, inclusiv după adăugare/ștergere și pe site. Feedbackul temporar stă deasupra barei mobile, fără modificarea interfeței publice neautentificate.

## Coș și prețuri

`AccountCartProvider` reutilizează autentificarea și `/api/commerce/cart`, fără bază de date sau coș comercial paralel. Starea este izolată pe cont; schimbarea identității anulează scrierile vechi și curăță cache-ul contului precedent. Datele din cont sunt sursa de adevăr la încărcare, iar un jurnal local de modificări neconfirmate reaplică numai intențiile recente, inclusiv ștergerile. Coșul local vechi nu este combinat orbește cu serverul.

Scrierile sunt ordonate și grupate când sunt simultane. Un răspuns vechi nu șterge modificările noi. Cererile coșului au limită de timp; erorile păstrează selecția și oferă reîncercare. Dacă browserul interzice storage-ul, selecția activă poate fi sincronizată folosind memoria sesiunii; persistența offline peste o reîncărcare necesită storage permis. Nu se promite rezolvare distribuită a editărilor simultane de pe dispozitive independente.

O filă autentificată nu citește și nu suprascrie cache-ul altui cont dintr-o a doua filă: când proprietarul storage-ului diferă de contul activ al filei, folosește propria copie din memorie. Schimbarea contului în aceeași filă păstrează anularea cererilor vechi și curățarea cache-ului anterior.

Formularul de adăugare este pliabil și folosește controale native pentru selectare pe mobil. Adăugările duplicate și depășirea limitei native de 20 de elemente sunt prevenite. Prețurile de afișare se recitesc din catalogul curent, inclusiv produsele și liniile sincronizate fără preț local; o valoare nulă nu este prezentată ca preț zero. Oferta/totalul sunt verificate de Worker, iar răspunsurile depășite sunt ignorate. Încărcarea nu este prezentată drept coș gol.

Codul promoțional ocupă un rând compact. Explicația promoțională ANUALAVY20 și mențiunea din opțiunea perioadei au fost eliminate; regulile și eligibilitatea reducerilor existente sunt păstrate. Comenzile continuă să fie recalculate în backend, cu idempotency și separarea plăților recurente de cele unice. Nu se inițiază debitări prin salvarea datelor fiscale.

Sertarul public de produse păstrează selecția sa, sincronizând numai adăugările/eliminările explicite. Deschiderea unui sertar gol nu mai înlocuiește toate produsele deja salvate în cont. Aspectul public și fluxul de checkout găzduit rămân intacte.

Planurile de produse AVY Partener își păstrează checkoutul nativ din Produse. Coșul contului citește prețul anual din API-ul public de planuri și oferă acces la acel flux; nu le trimite drept SKU de serviciu la generatorul generic de comenzi și nu le multiplică prețul anual cu 12. Serviciile dintr-un coș mixt pot fi comandate separat, păstrând planul selectat. Dacă prețul planului nu poate fi încărcat, nu este inventată o valoare.

## Istoric și descărcări

Istoricul combină facturile financiare native și facturile pentru plăți online, cu sortare, căutare, filtre și paginare. Dublurile se identifică prin relația exactă a comenzii, fără presupuneri pe baza numelui sau sumei. Factura afișează număr, dată, scadență dacă există, stare, sumă și PDF numai când documentul este disponibil.

`GET /api/workspace/invoices/:invoiceId/content` verifică accesul actual la beneficiar, existența unei facturi ne-arhivate care nu este ciornă și fișierul PDF activ asociat acesteia. Fișierul trece prin `getScannedObject`: verdict CLEAN și identitatea versiunii R2 trebuie să coincidă. Răspunsul este privat/no-store, cu nosniff și audit. Nu generează o factură fiscală din metadate și nu acordă clientului drepturi financiare de staff. Legăturile externe existente sunt acceptate în UI numai pentru HTTPS pe domeniile Oblio permise; dacă lipsesc, apare PDF indisponibil.

În auditul SQL s-a identificat o referire preexistentă la `financial_revenues.external_reference`, coloană absentă din schema migrată. Înregistrarea plății, reconcilierea și corelarea istoricului folosesc acum `billing_order_fulfillments` împreună cu referințele Stripe/Revolut existente. Nu se adaugă coloane, nu se rescriu migrări sau încasări istorice. Testele pe SQLite cu toate migrările exercită atât plata confirmată, cât și replay-ul pentru fiecare procesator, fără apeluri reale la procesatori.

## Verificare și release

Rezultatele finale sunt în PR. Testele dedicate includ hidratare întârziată, ștergeri păstrate, răspunsuri de preț vechi, scrieri în ordine, schimbarea contului, storage interzis, timeout și reîncercare. Testele browser folosesc conturi, facturi și furnizori sintetici; fixture-ul PDF verifică transportul, nu o factură fiscală reală. Capturile la 320/390/1440 px sunt inspectate, iar verificarea axe urmărește probleme grave/critice WCAG A/AA.

Verificarea locală finală: `npm test -- --maxWorkers=2` — 102 fișiere, 890 teste trecute și un benchmark opțional omis; 37 teste Playwright pe pachetul Pages (portal client, coș/facturi/suport, sincronizare comercială și bara staff). `npm run typecheck`, `npm run lint`, buildul static inclus în `build:pages`, `npm run build:worker`, `npm run build:pages` și `npm run build:api` au trecut. Lintul păstrează patru avertismente Fast Refresh preexistente în fișierele Logo Studio; fără erori. Buildul API este dry-run, nu deploy.

Nu există migrare nouă, modificare de cont real, trimitere, plată, scanare reală, furnizor activat sau serviciu plătit nou. Cheile rămase și acceptanța finală în contul real rămân etape separate. Înainte de lansarea cumulativă se reverifică HEAD/CI, main, destinația și migrările pending 0091–0098 din lotul anterior.
