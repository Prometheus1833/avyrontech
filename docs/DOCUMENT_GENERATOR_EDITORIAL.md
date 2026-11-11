# Generator Documente — design și export AVYRON

Modificare pornită de la `b6c4f7b` (PR #103). Verificați PR-ul și versiunea Worker pentru starea live; acest document descrie implementarea și verificările reproductibile.

## Rezultat

Ultimul pas al generatorului permite salvare și editare, salvare și descărcare PDF, salvare și descărcare Word editabil, respectiv pregătirea distribuirii. Documentul este creat prin API-ul nativ, cu aceeași cheie idempotentă, înaintea exportului. Câmpurile lipsă apar în previzualizare și exporturile moderne ca „De completat”, fără rescrierea variabilelor originale. Prețurile de pornire cer confirmare, iar valorile și taxele neconfirmate nu sunt prezentate ca zero sau total final. La o eroare de export rămâne salvat și poate fi descărcat din editor. Pentru un lot se deschide primul document, iar toate instanțele se păstrează în bibliotecă. Acțiunile respectă permisiunile existente; trimiterea cere aprobarea versiunii, destinatar autorizat și confirmare explicită. Nu se trimit documente prin simpla creare sau descărcare.

Cele 11 familii primesc o introducere specifică, identificarea lizibilă a emitentului și beneficiarului și aceeași ierarhie în previzualizare, PDF și Word. Oferta separă contextul, livrabilele, calendarul, investiția, plata și acceptarea; opțiunile suplimentare apar numai dacă sunt completate și sunt excluse din total. Devizul separă monedele și perioadele de facturare; nu adună implementarea cu tariful lunar. Aprobarea unei oferte cu monede diferite rămâne blocată de regula nativă.

Datele SC provin din profilul existent. La confirmarea utilizatorului din 06.11.2026 se păstrează sediul actual din AVYRON OS; ONRC, reprezentantul și capitalul vor fi completate de utilizator în Documente SC. Nu se preiau în baza de date informațiile contradictorii din conversații. Capitalul social este un câmp nou opțional al profilului, obligatoriu pentru aprobarea noilor modele comerciale ale emitentului SRL. Datele lipsă permit ciorne/export cu marcaj de neaprobat și blochează aprobarea, conform fluxului existent.

## Surse editoriale și limite juridice

Au fost consultate conversațiile ChatGPT „Ofertă site avocat”, „Documente Avy Center”, „Detalii societate DIGITAL ECOTECH” și trei mesaje comerciale trimise. S-a folosit structura textuală disponibilă; PDF-ul din sandboxul celeilalte conversații nu a fost importat. Nu sunt copiate în Git datele clienților, mesajele, conturile bancare, reducerile sau promisiunile specifice unei oferte. Condițiile negociate anterior nu devin condiții de catalog.

Datele emitentului urmăresc [art. 74 din Legea 31/1990](https://legislatie.just.ro/Public/DetaliiDocumentAfis/169688). Alegerea DPA rămâne explicită, în funcție de relația efectivă, cu anexele cerute de [art. 28 GDPR](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX%3A32016R0679). Modelele juridice noi sunt `review_required`; nu reprezintă aviz juridic sau aprobare contractuală. Verificarea specialistului rămâne necesară, inclusiv pentru raporturi cu consumatori și clauze negociate. Oferta nu este factură fiscală și nu creează o plată.

## Compatibilitate, migrare și fișiere

`0099_document_editorial_design.sql` adaugă capitalul în profil, revizia rendererului pe exporturi și versiunea 2 pentru fiecare master standard care nu are deja o versiune personalizată și nu este retras. Nu actualizează versiunea 1, aprobările, documentele generate, asocierile sau exporturile istorice. Un model personalizat este păstrat și poate primi manual aspectul nou într-o versiune nouă.

Designul este un marcaj în metadatele `labels.__avyron_design`, deja acceptate de schema anterioară; nu adaugă HTML/CSS arbitrar și nu schimbă forma contractuală a payloadului. Instanțele vechi fără marcaj își păstrează aspectul original. Schimbarea designului unei ciorne folosește aceeași salvare/versionare nativă; un document final nu devine editabil.

Exporturile moderne au marcaj `documentRenderer=avyron-2026-r1` în metadatele obiectului privat R2, iar coordonarea DO include aceeași revizie. Cache-ul și indexul unic D1 includ revizia rendererului. Un export din rendererul anterior nu este reutilizat pentru un document modern. O copie oficială precedentă rămâne păstrată; nu este suprascrisă sau ștearsă la regenerare. Expirarea exporturilor temporare și verificările de acces existente rămân aplicabile. Nu sunt adăugate conturi, servicii plătite, furnizori sau stocări.

În producție, aplicați migrarea aditivă după backup verificat și înaintea Workerului nou. API-ul anterior poate citi noile modele deoarece schema payloadului este compatibilă; noul renderer nu reutilizează un export cu aspect vechi produs în intervalul de rollout. Nu se reface 0076. Pentru rollback se revine deliberat la cod; nu se elimină coloane sau istoric.

## Verificare reproductibilă

- `node scripts/documents/generate-template-update.mjs --check` verifică migrarea față de sursa modelelor; generatorul refuză suprascrierea unei migrări diferite.
- `npm run audit:d1` și testele Document Center verifică schema, izolarea, imutabilitatea, salvarea, aprobarea, exporturile și păstrarea copiilor oficiale.
- `node scripts/documents/export-quality-fixtures.mjs /cale/absoluta/qa` produce 22 de PDF/DOCX reale, exclusiv cu date sintetice, pentru cele 11 familii. Nu contactează API-uri sau destinatari. Manifestul indică formatul și dimensiunea.
- Randarea DOCX prin LibreOffice și a PDF prin Poppler este separată de validarea OOXML/text. Verificați antetul repetat, diacriticele, tabelele, paginarea și devizul. Testele browser acoperă acțiunile directe la 320 px și distribuirea unei ciorne fără trimitere.

Verificarea pe dispozitive fizice iPhone/Android, aprobarea juridică efectivă și o trimitere reală către client sunt etape distincte. Nu sunt simulate ca finalizate. Bouncer rămâne separat, neconfigurat și cu uploadurile blocate conform politicii existente; Hugging Face rămâne omis.

## Ediția cu semnături

Migrarea `0119_document_signatures.sql` adaugă versiunea 4 pentru modelele standard v3 neschimbate. Modelele adaptate ori retrase se păstrează. Reviziile juridice se fac în fluxul existent înainte de aprobarea documentelor. Rendererul `avyron-2026-r3` afișează spațiul pentru cele două semnături după conținut și deviz, în același rând. Blocul tipărit permite semnarea în modalitatea convenită de părți. Nu este un serviciu de semnătură electronică.

Generatorul preia adresa de corespondență din Bd. Independenței, Iași, din profilul societății sau din datele confirmate pentru AVYRON. Sediul social este un câmp juridic separat, fără valoare inventată. La PF se poate folosi numele beneficiarului ori se indică mandatarul. La PJ se înscrie persoana autorizată să semneze, care poate fi diferită de contactul operațional.

Verificarea migrației se face cu `node scripts/documents/generate-signature-template-update.mjs --check`. Testele includ DPA opțional, condiții B2C, semnatari PF/PJ și conservarea modelelor personalizate.
