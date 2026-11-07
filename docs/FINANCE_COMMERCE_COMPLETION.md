# Financiar, proiecte și pregătirea produselor digitale

Bază: `01acfb909a7026731f2542f17da00bb3391f99a3`. Livrare independentă de PR #113/#114; cabinetul și PR #110 sunt excluse. Nu implică merge, migrare remote sau deploy automat.

## Audit verificat — 8 noiembrie 2026

Citirea agregată D1 din contul Avyron a confirmat 87 produse, zero versiuni livrabile, zero produse cu SKU + cod articol complete, zero vânzări de produs activate și zero conexiuni financiare `connected`. Nu au fost modificate date remote, procesate plăți sau emise facturi.

În cod, conturile aveau creare, dar nu editare. Cele cinci grupuri financiare ocupau coloane întregi, configurarea furnizorilor era ascunsă în `details`, iar verificarea API cerea MFA fără o intrare clară în configurare. Pipeline-ul proiectelor folosea alinierea implicită `stretch`, care extindea și coloana goală vecină.

Conversația ChatGPT „Coduri SKU și articole contabile” a fost citită prin conectorul desktop. Convenția propusă separă SKU comercial de codul articolului pentru facturare; codul articolului nu este un cont din planul contabil. Datele și prețurile din acea conversație nu înlocuiesc catalogul actual.

## Funcții implementate

- Financiar: cinci grupuri compacte, cu subinstrumentele existente; acces direct la nomenclator din conturi/facturare.
- Conturi și metode mascate: creare, editare, activare/inactivare și arhivare, confirmare, revizie și audit atomic. Conturile sincronizate de furnizor nu se rescriu ca date manuale. Arhivarea păstrează referințele istorice. Nu se acceptă numere complete de card, CVV sau chei în endpointurile noi de editare.
- Configurare procesatori: cerințe și prezența câmpurilor, legături spre MFA și Cloudflare, verificare reală prin API-ul existent. Valorile secretelor nu sunt expuse. Owner și Super Admin păstrează drepturi de configurare; MFA verificat rămâne obligatoriu pentru mutațiile financiare și activarea produselor.
- Proiecte: coloanele și grupurile au înălțimi independente.
- Coduri: `Completează codurile lipsă` / sincronizarea nomenclatorului creează SKU și cod articol, completează numai câmpurile lipsă și nu suprascrie prețuri ori identități existente. Primele nouă servicii folosesc convenția AVY-SRV / AVS când nu au deja cod. Produsele noi folosesc AVY-DIG-CMP/SEC/TPL/3DE/TOL/API/DOC/LGO și AVD cu număr stabil. Scrierile și auditul folosesc un singur batch D1 atomic, pentru a evita cererile individuale pe fiecare articol. [Limitele D1](https://developers.cloudflare.com/d1/platform/limits/) tratează batch-ul ca o singură interogare în cota per invocare; nu a fost necesară mărirea planului. Conflictele concurente sunt raportate și pot fi reîncercate. SKU-urile folosite în comenzi nu pot fi redenumite prin editor.
- Produse: fiecare articol are `Pregătește vânzarea`, condiții de pregătire, licență confirmată uman, livrare, pachet ZIP cu versiune și SHA-256, configurarea comercială și activarea explicită.
- Activarea verifică din nou versiunea produsului, codurilor și licenței, preț fix pozitiv RON, periodicitate unică, fiscalitate confirmată, metodă de facturare, furnizor disponibil și dovadă API de maximum 24 h. Descărcările cer obiectul real cu verdictul existent valid. Livrarea asistată este permisă numai pentru produsul distinct Logo Studio 3D.
- Modificarea licenței, livrabilului, prețului ori stării comerciale dezactivează vânzarea până la reverificare. Checkoutul legacy nu mai vinde drafturi sau produse neconfigurate.
- Comenzile păstrează licența, codul articolului, unitatea și TVA din snapshot. Oblio primește codul articolului, unitatea și TVA; facturarea manuală nu declanșează emitere automată. Încasarea și drepturile de produs se acordă numai prin webhookul verificat existent. Licența achiziției este vizibilă în istoricul privat al clientului.

## Migrare și stocare

`0106_product_sales_profiles.sql` adaugă numai profilurile comerciale ale produselor, legate de catalogul existent. Nu aprobă licențe, nu modifică prețuri, nu conectează procesatori și nu activează vânzări. Pachetele folosesc `product_versions` și bucketul privat FILES existente; nu se creează un registru paralel de comenzi sau drepturi. 0105 din PR #113 rămâne separat și se păstrează la integrarea release-ului.

Uploadurile ZIP din browser sunt externe și trec prin scanarea Bouncer existentă, cu limita sa de fișier și controlul cotei. Fără configurație/conformitate/verdict CLEAN, pachetul nu devine livrabil. Nicio generare internă nu este introdusă în scanare prin această livrare. Fișierele interne pot continua fluxurile de generare deja autorizate; nu sunt declarate automat pachete comerciale.

## Limite reale și finalizarea comercială

Această livrare implementează instrumentele de finalizare. Cele 87 de produse nu devin automat vandabile: pachetele lipsesc în D1, licențele și fiscalitatea necesită confirmare, iar cheile/conformitatea Bouncer rămân indisponibile conform răspunsurilor utilizatorului. Nu sunt inventate fișiere, drepturi sau costuri. Sursele gratuite din repository nu sunt redenumite ca livrabile premium.

Operatorul: completează codurile → configurează preț, unitate, periodicitate, fiscalitate și facturare → confirmă licența → adaugă versiunea livrabilă sau fluxul Logo Studio → verifică procesatorul cu MFA → activează vânzarea → testează checkout/webhook/acces/livrare în mediul autorizat. Emiterea automată Oblio păstrează autorizarea și configurația existente; nu este activată prin simpla verificare API.

Referințe tehnice: [Oblio API](https://www.oblio.eu/api), [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/). Verificările locale/CI și starea release-ului se consemnează în PR, separat de acceptanța live.
