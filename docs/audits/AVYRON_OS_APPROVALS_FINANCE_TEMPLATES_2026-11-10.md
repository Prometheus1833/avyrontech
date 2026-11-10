# AVYRON OS — aprobări, finanțe și tipizate

Bază verificată: `8fc698f17963887073d0113afc46a232b656030f`. Modificările sunt limitate la AVYRON; nu configurează și nu publică Retuvo, Cutiuța Magică sau site-urile juridice.

## Comportamentul rezultat

- Control uman citește platformele, formatul și programarea din înregistrarea editorială originală. Data solicitării rămâne distinctă de data publicării. Lipsa programării este explicită. Prezentarea compactă arată patru elemente pe mobil, șase de la 768 px și opt de la 1536 px; lista completă și confirmările existente sunt păstrate.
- Încasări și facturare apare înaintea evidenței conturilor interne în Conturi și facturare. Configurarea oferă loginurile oficiale verificate pentru Stripe, Oblio și Revolut Business/Merchant. Cheile rămân exclusiv în secretele Workerului.
- Acțiunea Sincronizează compară, la cerere, referințele native legate de comenzile AVYRON cu API-ul procesatorului: checkouturi, abonamente și facturi Oblio deja emise. Nu reprezintă importul întregului cont, extras bancar, decontare, certificare e-Factura sau o reconciliere contabilă completă. Fluxurile website prin abonament își păstrează reconcilierea dedicată existentă.
- Fiecare lot verifică maximum cinci referințe, cu timeout și răspunsuri limitate, continuare persistentă și blocare optimistă contra retryurilor concurente. Efectele externe sunt citiri (și autorizarea OAuth Oblio), fără debitări, refunduri sau emitere de facturi. Diferențele rămân vizibile, nu sunt suprascrise. `last_sync_at` avansează numai la închiderea fără diferențe a întregului parcurs. Un parcurs gol declară zero referințe; nu constituie test de plată reală.
- Verificarea Revolut refuză originile API nepermise și cere o destinație webhook AVYRON cu ORDER_COMPLETED. Prezența secretului nu certifică livrarea unui eveniment; aceasta se verifică separat.
- Toate cele 11 familii primesc versiuni noi, conținut juridic contextual, etapă 1–5 și patru caracteristici în listă. Tipografia, identificarea părților și densitatea sunt adaptate AVYRON. Rendererul nou are propriul identificator; exporturile și versiunile istorice rămân separate.
- Generatorul preia clauze după serviciul real, inclusiv din profilurile de catalog existente. B2B/B2C se selectează explicit. DPA și condițiile transfrontaliere sunt condiționale; nu există renunțări automate la drepturile consumatorului, cesiuni implicite ori garanții de trafic/rezultat.

## Migrare și identitatea emitentului

`0116_document_legal_financial_sync.sql` adaugă două coloane nullable: `document_company_profile.registered_address` și `financial_provider_connections.sync_state_json`. Nu șterge date și nu modifică payloadurile istorice.

Noile mastere v3 sunt adăugate numai peste masterele native v2 nemodificate, partajate și neretrase, dacă nu există o versiune ulterioară. Modelele personalizate au prioritate și sunt păstrate. Toate noile versiuni au `review_required`; nu există aprobare juridică automată.

Adresa din Bd. Independenței nr. 20, mun. Iași, jud. Iași rămâne adresa de activitate/corespondență. Sediul social are un câmp distinct, fără a reclasifica adresa cerută de utilizator. Completarea sediului social pentru identificarea legală este necesară înaintea finalizării documentelor comerciale. Reprezentantul și capitalul social nu sunt deduse din conversații.

Identificatorul ONRC este completat numai dacă lipsește și numele/CUI-ul coincid exact cu emitentul verificat prin serviciul oficial ANAF V9 la 10.11.2026. Nu se deduce din această verificare un temei de scutire, cotă TVA sau autorizare de emitere automată.

Regenerare deterministă: `node scripts/documents/generate-legal-template-update.mjs --check`. Scriptul refuză rescrierea unei migrări existente diferite.

## Surse juridice și verificare umană

Reperele sunt păstrate în `src/shared/documents/legal.ts` și afișate în previzualizarea tipizatului. Ele sprijină revizuirea de specialitate; nu reprezintă certificarea conformității sau consultanță individualizată.

- [Legea 31/1990, art. 74](https://legislatie.just.ro/Public/DetaliiDocument/169688): identificarea societății în documentele comerciale.
- [Codul civil, text oficial MAI actualizat în 2026](https://starecivila.mai.gov.ro/documents/39578/0/LEGE%2Bnr.%2B287%2Bdin%2B2009%2Bprivind%2BCodul%2BCivil.pdf/c761e95b-6f4c-386d-2db3-4f8cb59a67d8?t=1774437586680): art. 1170, 1176, 1203 și 1270.
- [Legea 8/1996 republicată](https://legislatie.just.ro/Public/DetaliiDocument/201472): numerotarea actuală pentru cesiune art. 42–43, protecția programelor art. 73–74; nu numerotarea anterioară republicării.
- [GDPR](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32016R0679): minimizare, scop, securitate, roluri și condițiile art. 28, 33(2), 44–49.
- [Legea 365/2002](https://legislatie.just.ro/Public/DetaliiDocument/77218), [OUG 34/2014](https://legislatie.just.ro/Public/DetaliiDocument/254147), [Legea 506/2004 — copie ADR](https://www.adr.gov.ro/wp-content/uploads/2024/06/lege-506_2004.pdf) și [Legea 232/2022](https://legislatie.just.ro/Public/FormaPrintabila/00000G0KNQ8P76GT0TQ0JXEJG1KWCZGC), după domeniul concret de aplicare.
- [Roma I — jurisprudență oficială privind art. 3 și 6](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX%3A62024CJ0279): alegerea legii nu înlătură protecția imperativă a consumatorului.
- [AI Act, art. 50 — serviciul oficial al Comisiei](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50): evaluarea transparenței după utilizarea efectivă, fără clasificarea automată ca risc ridicat.

## Furnizori și limite externe

Documentație verificată: [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/retrieve), [Oblio API](https://www.oblio.eu/api/), [Revolut Merchant](https://developer.revolut.com/docs/api/merchant). Revolut Business Banking API nu este conectat doar pentru checkout. Nu sunt activate planuri plătite.

La audit, Stripe AVYRON era accesibil în browser; Oblio și Revolut solicitau autentificarea utilizatorului în paginile oficiale deschise. Nu s-au creat chei, nu s-au acceptat termeni financiari și nu s-au efectuat tranzacții reale. Nu se declară configurare completă pe baza existenței unei chei.

Finalizarea operațională cere autentificarea în conturile respective, confirmarea regimului TVA/seriei, a câmpurilor juridice lipsă și verificarea destinațiilor/semnăturilor webhook. Emiterea automată și autorizarea debitării se validează distinct. Fără acestea, starea rămâne explicit incompletă.

## Validare

PASS: typecheck aplicație/Worker; lint fără erori (patru avertismente Fast Refresh preexistente); audit D1, generator migrare determinist; build static, Pages, Worker și API dry-run; audit SEO (80 pagini indexabile și 212 pagini publice noindex în manifest).

PASS: 415 verificări native locale de securitate, inclusiv refuzul accesului anonim la noua rută de sincronizare. Auditul static nu a găsit secrete sau referințe de standard invalide. Aceste probe nu reprezintă conformitate ASVS completă: matricea generală existentă păstrează 7 FAIL, 278 NOT_VERIFIED și excepția MFA, în afara acestei livrări.

PASS: 45 scenarii Chromium și 31 WebKit/iPhone; ecrane 320–1700 px, generare/context, roluri, ordinea financiară, aprobări și verificări axe de bază. Verificarea vizuală include layouturile desktop/mobile și 48 pagini provenite din cele 22 de exporturi PDF/DOCX reale (11 familii), inclusiv deviz și documente de trei pagini.

NOT_VERIFIED: autentificarea finală în Oblio/Revolut, configurația externă completă, livrarea unui webhook real, plata/debitarea și emiterea de facturi. Mac-ul s-a blocat în etapa de acces la furnizori; loginurile au fost lăsate pentru utilizator. Nu sunt echivalate verificările cu date sintetice cu tranzacțiile reale.

PASS: regresie completă pe codul final: 154 fișiere, 1.431 teste trecute și un test opțional omis (`npx vitest run --maxWorkers=2 --testTimeout=20000 --hookTimeout=30000`). Au fost eliminate din evidența finală rulările intermediare suprapuse cu builduri și modificări, care au avut timeouturi.

PASS: nouă scenarii țintite de sincronizare cu SQLite și API-uri simulate, inclusiv trei cazuri suplimentare pentru abonament Stripe, factură Oblio și comandă Revolut. Sunt verificate continuarea loturilor, cursa concurentă, izolarea contului, diferențele contractuale și absența operațiunilor monetare.

Referința de livrare și starea migrației remote sunt confirmate separat după publicare. Exporturile de probă folosesc exclusiv date sintetice și exporterele reale PDF/DOCX ale aplicației; nu sunt încărcate în R2 și nu sunt trimise destinatarilor.

## Revenire

Versiunea Worker anterioară poate fi reactivată fără eliminarea coloanelor aditive. Masterele v3 pot fi retrase prin fluxul dedicat, fără modificarea documentelor deja generate sau a v1/v2. Nu se execută rollback SQL prin ștergerea istoricului financiar ori a documentelor.
