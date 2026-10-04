# Prompt original recuperat: Supabase și Google Drive

Sursă: conversația „Construiește portal Supabase”. Text recuperat integral la 2026-10-04.

Integrează în proiectul existent AVYRON două conexiuni opționale: **Supabase** și **Google Drive**.

Contul existent pentru aceste integrări este **avyrontech@gmail.com**. Reutilizează conturile, proiectele și configurațiile relevante existente.

**Obiectivul acestei etape este conectarea, verificarea și pregătirea integrărilor pentru utilizări viitoare. Nu transferăm acum date, fișiere sau proiecte în niciunul dintre servicii.**

## 1. Context și infrastructură

Cloudflare și infrastructura actuală rămân baza AVYRON.

Păstrează autentificarea, sesiunile, rolurile, permisiunile, bazele de date, stocarea și fluxurile existente. Nu introduce Supabase Auth.

Acest task privește exclusiv infrastructura celor două integrări și configurarea lor în AVYRON OS. Extinde aplicația existentă fără să reconstruiești portalul, CRM-ul sau modulele de produse și servicii.

Începe prin verificarea repository-ului, instrucțiunilor locale, configurației Cloudflare, mecanismului de secrete și eventualelor integrări deja implementate. Nu presupune că D1, R2, Supabase sau un anumit SDK sunt folosite fără să verifici codul.

Reutilizează componentele și serviciile existente. Lucrează într-un branch dedicat, conform fluxului Git al proiectului, fără consum de credite Lovable.

## 2. Separă conexiunea de utilizarea efectivă

Implementează separat:

**A. Configurarea și verificarea conexiunii**

- Configurarea credențialelor.
- Autorizarea contului Google.
- Identificarea proiectului Supabase.
- Verificări minime de acces, fără scriere.
- Afișarea stării și a ultimei verificări.

**B. Operațiile asupra datelor**

- Upload, export, backup, sincronizare și utilizarea serviciului de către un proiect.

În această etapă, conexiunile pot fi configurate și verificate, dar toate operațiile din categoria B rămân dezactivate.

Folosește opțiuni independente, adaptate convențiilor proiectului, precum:

- `SUPABASE_DATA_OPERATIONS_ENABLED=false`
- `GOOGLE_DRIVE_DATA_OPERATIONS_ENABLED=false`
- `BACKUP_JOBS_ENABLED=false`

Aplică restricțiile în backend. Ascunderea butoanelor în interfață nu este suficientă.

Nu porni migrări, sincronizări, exporturi, backupuri, cronuri sau joburi de încărcare. Nu crea operații restante pentru transferarea ulterioară a datelor existente.

## 3. Pregătirea Supabase

Supabase va putea fi folosit ulterior, prin activare explicită pentru un proiect sau modul, pentru:

- proiecte viitoare ale clienților;
- cataloage și depozite de produse;
- date și fișiere ale unor integrări viitoare;
- alte utilizări opționale aprobate ulterior.

Acum implementează adaptorul și configurația necesare accesului la PostgreSQL/Data API și Storage, fără popularea lor cu date din AVYRON.

Cerințe:

- Reutilizează proiectul Supabase relevant, identificat din configurația existentă și accesul disponibil.
- Nu crea proiecte separate pentru fiecare client.
- Dacă lipsesc configurații, pregătește numai resursele gratuite strict necesare conectării, evitând duplicatele.
- Nu crea acum tabele de business, cataloage, bucketuri sau fișiere demonstrative doar pentru a demonstra integrarea.
- Verifică accesul prin cereri autentificate minime de metadate, fără citirea inutilă a datelor existente.
- Diferențiază verificarea conexiunii de verificarea unor funcții de upload sau scriere, care nu sunt activate în această etapă.
- Folosește un adaptor compatibil cu runtime-ul Cloudflare existent.
- Păstrează cheile privilegiate exclusiv în backend.
- Nu activa Supabase Auth, Realtime, Edge Functions sau alte servicii suplimentare fără un caz concret în acest task.

Lipsa configurației, suspendarea proiectului sau o eroare Supabase nu trebuie să blocheze buildul, pornirea aplicației, autentificarea ori funcționarea AVYRON.

## 4. Pregătirea Google Drive

Google Drive va fi pregătit pentru arhive, exporturi și backupuri viitoare. În această etapă nu încărcăm și nu sincronizăm nimic.

Folosește **Google Drive API**, conectat la contul **avyrontech@gmail.com**.

Cerințe:

- Reutilizează proiectul Google și clientul OAuth relevante, dacă există.
- Dacă lipsesc, configurează doar componentele gratuite necesare Drive API și OAuth, fără activarea unor servicii Google Cloud cu plată.
- Nu introduce Google Cloud Storage sau Firebase în acest task.
- Implementează autorizarea OAuth a proprietarului contului. Aceasta este o conexiune administrativă la Drive și nu modifică loginul clienților AVYRON.
- Verifică server-side că identitatea autorizată aparține contului `avyrontech@gmail.com`. Nu considera parametrul `login_hint` drept dovadă a identității.
- Solicită permisiuni minime: preferă `drive.file` pentru viitoarele fișiere create sau selectate pentru aplicație, plus permisiunile de identificare strict necesare.
- Nu solicita acces general la întregul Drive dacă nu există o nevoie demonstrată.
- Implementează corect protecția fluxului OAuth: verificarea `state`, redirecturi permise explicit și gestionarea securizată a tokenurilor.
- Păstrează refresh tokenurile în stocare securizată în backend, folosind mecanismul existent de secrete sau criptare.
- Gestionează expirarea și revocarea autorizării printr-o stare clară „Necesită reconectare”.
- Verifică modul de publicare OAuth și documentează limitările modului Testing pentru acces de durată.

Pentru verificare, folosește o cerere minimă precum `about.get`, cu selecția câmpurilor necesare pentru identitatea contului și cota de stocare. Nu scana documentele și folderele personale.

Pregătește configurarea unui folder de destinație pentru utilizare ulterioară. Folderul poate rămâne nesetat în această etapă; nu crea automat foldere sau fișiere de test.

## 5. Utilizare eficientă în limitele gratuite

Verifică documentația oficială actuală și configurația conturilor înainte să stabilești limitele. Păstrează sursa și data verificării în documentația implementării.

Pentru Supabase, urmărește separat cotele relevante pentru:

- baza de date;
- fișiere;
- trafic de ieșire;
- limitele operațiilor utilizate.

Pentru Google Drive:

- Citește spațiul total și utilizat, când API-ul permite.
- Ține cont că spațiul contului poate fi folosit și de Gmail și Google Foto.
- Pregătește un buget de stocare AVYRON conservator, cu rezervă pentru celelalte utilizări.
- Respectă limitele Drive API aplicabile proiectului respectiv.

Implementează controale locale pentru viitoarele operații: dimensiunea fișierelor, volumul total, numărul de cereri și reîncercările.

Diferențiază în interfață:

- cota confirmată de furnizor;
- consumul observat de AVYRON;
- estimările sau valorile necunoscute.

Nu prezenta un contor local drept consumul complet al contului. Dacă informațiile necesare verificării bugetului lipsesc, viitoarele operații de scriere trebuie să rămână blocate până la clarificarea configurației.

Nu activa abonamente, upgradeuri, funcții plătite sau majorări de cote. Nu modifica facturarea existentă și nu promite cost total zero fără verificarea planului și a limitelor aplicabile.

În repaus, integrările nu trebuie să genereze trafic periodic. Verificările de conexiune se fac la configurare sau la cererea unui administrator, cu rezultate păstrate temporar și cu data ultimei verificări.

Nu implementa mecanisme de menținere artificială a activității Supabase. Un proiect Free suspendat trebuie identificat corect și tratat ca indisponibil.

## 6. Administrare în AVYRON OS

Adaugă cele două integrări în secțiunea existentă de setări/integrări, accesibilă numai rolurilor administrative autorizate.

Folosește două carduri compacte, cu detalii la deschidere.

Pentru fiecare integrare afișează:

- starea configurării;
- rezultatul și data ultimei verificări;
- contul Google verificat sau identificatorul proiectului Supabase;
- funcțiile pregătite pentru utilizare viitoare;
- starea „Utilizarea datelor este dezactivată”;
- cotele disponibile, limitele locale și eventualele erori;
- pașii concreți necesari finalizării conectării, dacă lipsesc.

Acțiunile disponibile acum sunt configurarea, conectarea/reconectarea, verificarea și deconectarea.

Deconectarea oprește accesul integrării și elimină sau revocă autorizarea proprie unde este cazul, fără ștergerea datelor din conturile externe.

Nu afișa secrete, tokenuri sau mesaje tehnice brute. Nu declara „Conectat” doar pentru că există variabile de mediu; starea trebuie susținută de o verificare autentică, cu dată.

## 7. Securitate și pregătire pentru extindere

Toate operațiile administrative trec prin backendul existent și verifică rolul utilizatorului.

Cheile Supabase, client secreturile Google și tokenurile nu trebuie să ajungă în frontend, repository, loguri sau răspunsuri API.

Nu construi un proxy generic care permite browserului să trimită cereri arbitrare către furnizori.

Pregătește interfețe clare pentru asocierea viitoare a unei integrări cu un proiect sau modul. Activarea ulterioară trebuie să fie explicită și să respecte permisiunile acelui proiect.

Nu introduce transfer automat către celălalt furnizor când unul nu răspunde. Orice viitoare alegere a destinației datelor trebuie făcută explicit.

Folosește o implementare simplă, extensibilă și compatibilă cu proiectul actual. Nu construi acum infrastructura completă a viitoarelor backupuri, depozite de produse sau aplicații ale clienților.

## 8. Verificare și predare

Testează:

1. Aplicația pornește și funcționează fără credențialele celor două servicii.
2. Conexiunile se pot verifica fără scrierea datelor externe.
3. O conexiune validă nu activează implicit uploaduri, exporturi sau backupuri.
4. Operațiile de date sunt refuzate în backend cât timp sunt dezactivate.
5. Contul Google autorizat este cel indicat.
6. Utilizatorii fără rol administrativ nu pot accesa configurarea sau verificările.
7. Timeouturile, erorile și autorizarea expirată nu afectează platforma.
8. În repaus nu apar joburi sau cereri periodice către furnizori.

Folosește teste locale și simulări pentru operațiile de date. Verificările reale ale conexiunilor trebuie să fie minime și fără scriere.

Rulează verificările relevante de build, tipuri și lint.

La final, prezintă:

- ce ai reutilizat și ce ai implementat;
- starea reală a fiecărei conexiuni;
- ce ai verificat efectiv;
- configurațiile necesare, fără valori secrete;
- limitele gratuite verificate și controalele locale;
- instrucțiuni scurte pentru conectare, reconectare și utilizare viitoare;
- confirmarea că nu ai transferat date și nu ai activat operații automate sau servicii plătite.

Dacă lipsește accesul la un cont, o credențială sau autorizarea OAuth, finalizează întâi tot ce poate fi implementat și verificat în repository. Apoi indică exact pasul necesar finalizării conexiunii, preferabil prin interfața creată. Nu cere parole ori tokenuri în chat și nu declara conectarea reușită dacă nu ai putut-o verifica.
