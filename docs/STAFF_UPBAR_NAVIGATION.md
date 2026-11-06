# INTERN OS — bară staff și conversații de proiect

Implementare locală pe `codex/staff-upbar-navigation-2026-11-05`, de la `9940346`. `origin/main` verificat la început: `631a127`. Nu există push, PR, merge, migrare remote sau deploy pentru această etapă; utilizatorul păstrează lansarea pentru finalul lotului. Designul vizitatorilor fără cont rămâne cel existent.

## Navigare

Stafful autentificat primește o bară proprie pe paginile web. **INTERN OS** este un link direct spre prima destinație permisă din dashboard: de regulă Prezentare generală, Financiar pentru AvyContabil, respectiv Profil când rolul nu permite prezentarea generală. Nu mai există meniul OS paralel de scurtături.

După calendarul existent sunt Chat, Resurse, Proiectele mele și Mentenanță / AVY Core, fiecare filtrat cu registrul central `canOpenSection`. Meniul contului păstrează Profil, Proiecte AI dacă sunt permise, Financiar pentru principal autorizat / `finance.read`, Setări și Deconectare. Dispar din meniul staff linkurile comerciale publice și acțiunile mutate în bară. Meniul comercial al clientului este păstrat.

Aceleași acțiuni sunt disponibile în antetul dashboardului, fără duplicarea vechiului buton de chat. Pe ecrane mici bara folosește două rânduri și acțiuni compacte etichetate accesibil. Închiderea dialogului restabilește focusul la butonul care l-a deschis; navigarea contextuală îl închide. Încărcarea panourilor este la cerere. Legăturile noi folosesc aceleași funcții de salvare pentru editorul de documente și paginile de servicii ca meniul intern; un conflict de salvare oprește navigarea și păstrează ciorna.

## Panouri și trasee canonice

| Acțiune | Comportament / destinație |
| --- | --- |
| INTERN OS | `/profil?tab=<prima secțiune permisă>` |
| Chat | Dialog cu Echipă și Proiecte și clienți; centrul complet este `/profil?tab=intern` |
| Resurse și template-uri | Dialog cu Bibliotecă Agenție, Tipizate, Documente STAFF, Biblioteca Artefacte și Media, numai unde există drepturi |
| Proiectele mele | Dialog cu căutare, stare, număr de membri și link spre fișa nativă; pipeline `/profil?tab=projects&scope=mine` |
| Mentenanță | `/profil?tab=maintenance`, pe accesurile existente AVY Core |
| Proiecte AI | `/profil?tab=ai-projects`; API-ul existent filtrează după apartenență activă, cu acces global pentru principalii autorizați |
| Financiar | `/profil?tab=finance`, cu verificările existente la API |

Resursele sunt legături către bibliotecile și politicile existente, fără copii sau nou registru. Generatorul, tipizatele, documentele SC și cele publicate pentru client rămân protejate de Document Center. Nicio nouă licență sau permisiune comercială este acordată prin bară.

`GET /api/projects?scope=mine` întoarce numai proiectele în care contul este proprietar, alocat explicit sau membru activ al organizației; clienții primesc și proiectele entităților autorizate. Un fost staff devenit client nu recapătă acces printr-o alocare staff istorică. Principalul nu primește automat toate proiectele în acest filtru; accesul global rămâne în registrul complet. Crearea nativă de proiect alocă deja creatorul în echipă, iar acele proiecte apar firesc în listă. Răspunsul acestui filtru nu include registrul financiar. Filtrul personal este identificat în titlul pipeline-ului și poate fi eliminat prin „Vezi toate proiectele autorizate”; contextul se curăță la schimbarea secțiunii. Listă limitată la 200, cu căutare locală; fișele și restul registrului păstrează API-urile existente.

## Chat — același sistem și două contexte izolate

Chatul de echipă păstrează canalele, mesajele directe, căutarea, istoricul, ciornele separate și protecția retry-urilor. Directorul minimal de contacte din `/api/workspace/chat/members` necesită `chat.read`, separat de administrarea echipei. Returnează identitate de afișare/rang, fără emailuri sau date financiare. Vechiul `/api/workspace/staff` își păstrează cerința `team.read`.

Conversațiile de proiect reunesc echipa și clientul autorizați pentru proiectul respectiv. Nu sunt mesaje private între două persoane: interfața indică explicit audiența. Clienții au și butonul Mesaje proiecte în bara web, plus centrul complet în cont, fără canale interne sau directorul staff. Fișa nativă a proiectului are legătură directă către conversația lui.

Se reutilizează `staff_chat_messages`, `staff_chat_reads`, utilizatorii, clienții, organizațiile și alocările existente. `0086_project_conversations.sql` adaugă doar `project_id` nullable, indexuri și constrângeri pentru context și beneficiar. Mesajele de proiect sunt adresate tehnic autorului, iar distribuția se face exclusiv prin `project_id`: astfel nici interogările vechi de canal comun sau DM ale altui utilizator nu pot extrage conținut de proiect în timpul unei lansări treptate. Noile endpointuri exclud complet mesajele de proiect din canalele, previzualizările și cursorii interni. Contextul și autorul unui mesaj sunt imuabile; transferul unui proiect cu istoric către alt beneficiar este blocat.

API privat `/api/project-chat`:

- `GET /projects`: proiecte autorizate cu ultimul mesaj și necitite; maximum 100 pe răspuns, căutare server-side `q`, prioritate contextuală `focus` fără a ocoli autorizarea.
- `GET /:id/messages`: ultimele 50 de mesaje, cursor temporal plus ID pentru istoric.
- `POST /:id/messages`: text simplu, maximum 4000 caractere, corp limitat, cheie de idempotență obligatorie, scriere și audit atomic în D1.
- `POST /:id/read`: cursor per cont și proiect, fără regresie și fără posibilitatea marcării unui mesaj străin.

Autentificarea nativă verifică rolurile și contul curent, inclusiv schimbarea obligatorie a parolei. Stafful are nevoie de `chat.read`, acces de proiect și, pentru trimitere, `chat.write` în politica sa curentă. Apartenența activă și permisiunile sunt reverificate la fiecare citire/scriere, inclusiv înaintea replay-ului idempotent. Principalii autorizați au accesul global existent. Clienții pot comunica exclusiv în proiectele accesibile prin proprietate, organizație sau grantul legal nativ. Revocarea nu șterge istoricul, dar oprește imediat accesul API.

Scrierile staff respectă MFA nativ și excepția explicită de rollout existentă; configurația de producție nu este schimbată. Rate limiting D1: 1200 citiri/mark-read pe oră, 300 trimiteri/oră și 20/minut. Mesajele sunt randate ca text React, fără HTML importat, tokenuri sau conținut în audit. Răspunsurile sunt `private, no-store`.

Interfața păstrează ciornele la schimbarea proiectului și după eșecul trimiterii, plus cheia cererii pentru retry. Cererile întârziate sunt anulate/ignorate la schimbarea conversației. Istoricul încărcat este limitat la 500 de mesaje în interfață. Lista proiectelor se actualizează la 30 secunde, conversația de proiect la 10 secunde cât pagina este vizibilă și panoul este montat. Necititele sunt marcate doar în conversația vizibilă, aproape de ultimul mesaj. Nu există pretenții de prezență online, livrare prin servicii externe sau citire de către alte persoane.

## Validare și limite de lansare

- TypeScript app + Worker și ESLint: trec; lint are doar cele patru avertismente Fast Refresh existente în componentele Logo.
- Build static/Pages, build Worker și adaptor Pages final: trec. API `--dry-run` trece, fără deploy.
- Audit SEO al buildului: 77 pagini indexabile, 212 noindex, 11 URL-uri strategice de produse; nu reprezintă indexare live.
- Vitest complet: **89 fișiere, 750 teste trecute și 1 benchmark opțional omis**. Cele 15 teste noi acoperă autorizarea, revocarea, clienții, izolarea față de canalele vechi, retry, istoricul, granturile AI și rolul anterior staff. Alte două teste verifică blocarea navigării la salvare eșuată, ordinea salvării și prevenirea dublei navigări.
- Workerd/D1/KV local, cu conturi sintetice și autentificare nativă: **9 scenarii trecute**, inclusiv schimbarea obligatorie a parolei, răspunsul clientului în conversația comună, cursorul, retry-ul și revocarea. Nicio trimitere către persoane reale sau furnizori.
- Integritatea și FK-urile celor două fișiere SQLite locale au fost verificate fără erori. Conexiunea readonly nu putea inițializa indexul WAL; verificarea s-a făcut printr-o conexiune locală care permite inițializarea acestuia, folosind exclusiv interogări PRAGMA.
- Verificări vizuale și axe pentru panou; adaptare web / dashboard și ecrane de la 320 px până la 1440 px. Capturi locale în `/tmp/avyron-staff-upbar-local/screenshots-final/`.

Regresia completă în browser: 191/194 trecute inițial. S-au corectat eticheta ARIA a datei și două așteptări de test pentru meniul și butonul de trimitere. După refacerea buildurilor, lotul de 35 teste și testul editorial separat au trecut integral, rezolvând cele trei eșecuri. După integrarea protecției salvării și a resetării filtrului personal, suita relevantă de 43 scenarii a trecut 42; un click de pipeline la 390 px a fost nereprodus în trei repetări consecutive. Testul a fost sincronizat explicit cu datele încărcate și verifică starea butonului. Lotul final de acceptanță, cu bara staff, conversațiile, filtrele și salvarea blocată, are **21/21 trecute**. Nu există eșecuri rămase nerezolvate. Testele folosesc Chromium și fixture-uri; testul final în contul real rămâne la utilizator, conform alegerii sale anterioare.

Chatul este textual; nu introduce atașamente, voce/video, push extern, websocket sau un furnizor nou. Nu sunt trimise automat documente și nu sunt activate servicii plătite. Ciornele sunt în memoria panoului; închiderea lui nu oferă persistență între sesiuni. Mesajele salvate rămân în D1; retenția și recuperarea depind de politica existentă a bazei. Nu se creează un job nou de backup al mesajelor sau un bucket nou.

La release-ul autorizat: integrați ultimul main pe ramura de task, verificați conflictele și PR-ul, aplicați 0086 după migrațiile anterioare, apoi Workerul și interfața. Testați cu Owner, staff cu/fără drepturi, client A/B, fost staff, proiecte și AI alocate și revocare. Nu considerați validarea locală drept migrare/deploy/configurare verificată în producție.
