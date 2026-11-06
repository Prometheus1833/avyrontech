# Portal client — navigare și documente

6 noiembrie 2026. Bază: `96fc8c814b0d7395560a43c8b9b7a1e289044d07` (PR #98, cu #94–#97 în istoric). Ramură: `codex/client-portal-simplification-2026-11-06`.

## Comportament

- Contul clientului folosește marca „Avyron Tech” și descrierea „Serviciile, produsele și anexele într-un singur loc”, inclusiv în meniul mobil. Navigarea și meniul personal au destinații specifice clientului; meniul staffului rămâne separat.
- După Proiectele mele apar Servicii, Mentenanță / Abonamente, Metodă de plată salvată și Centru Documente. Produsele proprii, facturile/comenzile, mesajele și setările păstrează destinațiile existente.
- Mentenanța și abonamentele au o intrare comună, cu două panouri: abonamente/facturare și activități/materiale. Sunt reutilizate înregistrările și API-urile native. Linkurile istorice `tab=maintenance` și `tab=client-maintenance` sunt canonizate pentru clienți către `subscriptions&recurringView=activities`; AVY Core rămâne exclusiv rolurilor autorizate intern.
- Căutarea „Caută un proiect sau document” este inline, cu debounce, rezultate din proiectele personale și căutarea nativă autorizată a documentelor. Eșecurile parțiale sunt explicite; răspunsurile depășite sunt ignorate. Conținutul și identificatorii acestor rezultate nu sunt salvați în istoricul local de navigare.

## Centru Documente

Entry point-ul existent încarcă separat interfața clientului și interfața agenției. Componenta staff a fost extrasă în `AgencyDocumentCenter` fără modificarea funcțiilor sale. Clientul nu primește selector de bibliotecă internă, categoria Publicate, tipizate, generator, Documente SC sau operațiuni administrative.

Lista clientului permite căutare, sortare, paginare, deschiderea documentelor și consultarea versiunilor publicate autorizate. Citirea conținutului JSON validat se face prin elemente React fără HTML executabil, URL-uri externe pentru imagini sau editor. Tabelele, variabilele și liniile comerciale sunt prezentate în document. Dreptul de citire este separat de dreptul de export.

PDF/DOCX și fișierele importate se descarcă prin endpointurile private existente. Previzualizarea PDF folosește un Blob local revocat la schimbarea documentului sau demontare. Distribuirea apare numai cu permisiunea nativă, cere destinatar și confirmare și reutilizează versiunea selectată, verificările serverului și idempotency. Se transmite numai link privat; starea „pregătit” nu este prezentată ca livrare.

## Securitate și compatibilitate

Nu există migrații, roluri noi, autentificare paralelă, modificări de catalog, stocări sau furnizori noi. Backendul existent verifică în continuare grantul explicit, apartenența la beneficiar și publicarea versiunii către utilizator, inclusiv la căutare, versiuni, download și revocare. `/api/documents/context` și `/api/admin/system/*` rămân protejate server-side. Interfața publică pentru utilizatori neautentificați nu este redesenată.

## Verificare și limite

Rezultatele finale ale verificărilor sunt consemnate în PR. Testele browser folosesc conturi, documente și furnizori sintetici; fișierele lor PDF/DOCX sunt fixture-uri de transport, nu dovadă de randare sau livrare reală. Testele native Document Center verifică separat autorizarea și exporturile. Nu sunt trimise mesaje reale și nu se activează plăți sau scanări.

Suita completă a rulat 876 de cazuri: 871 au trecut inițial, trei pregătiri de baze D1 au depășit limita locală de 10 secunde în timpul rulării simultane cu browserul, iar o verificare istorică a meniului Cariere necesita aliniere la noua navigare. Cele patru fișiere afectate au fost reluate cu `--maxWorkers=1`: toate cele 138 de cazuri au trecut, fără modificarea logicii backend sau majorarea limitelor de timp. Rezultatul combinat acoperă 875 de cazuri active; benchmarkul opțional `AVYRON_BENCH_PUBLIC_LIMITS` nu a fost activat.

Nu există migrare remote, merge sau deploy în această etapă. Acceptanța finală în contul real rămâne la utilizator, conform instrucțiunii sale. Înainte de lansarea cumulativă trebuie reverificate noul HEAD, CI, migrațiile restante #94–#98 și destinația de producție; acest PR nu transformă lucrările pending în funcții live.
