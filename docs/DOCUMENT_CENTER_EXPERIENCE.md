# Centru Documente — organizare și personalizare

Etapă locală din 5 noiembrie 2026, pe `codex/document-center-experience-2026-11-05`, pornită din `24b8957`. `origin/main` a fost verificat la început la `631a127`. Lucrările anterioare pentru dashboard, Document Center, Social, AVY Core, Leaduri, Servicii și Abonamente sunt păstrate. Push, PR, merge, migrare remote și deploy rămân amânate până la încheierea taskurilor, conform utilizatorului.

## Navigare

Intrarea din categoria Documente se numește **Centru Documente**. Biblioteca artefactelor și integrărilor din dashboard este **Biblioteca Artefacte**; ruta publică `/biblioteca` rămâne aceeași.

| Pagină internă | Destinație | Conținut |
| --- | --- | --- |
| Bibliotecă Agenție | `/profil?tab=documents&documentView=library` | Lista compactă, carduri opționale, căutare autorizată, filtre, arhivă și descărcare PDF |
| Documente SC | `documentView=company` | Documentele societății, numai pentru Owner / principal autorizat explicit |
| Documente STAFF | `documentView=staff` | Documentele centrale cu scop staff, ghidurile existente și acces la Documents Hub |
| Tipizate | `documentView=templates` | Modele, căutare, scop, activitate, previzualizare și administrarea separată a originalului |
| Generator | `documentView=generator` | Context și model → Date și personalizare → Verificare → Creare |

Tipizatele și Generatorul au pagini distincte, cu URL-uri proprii în structura dashboardului existent. `documentTemplate=<version_id>` selectează explicit versiunea modelului. Editorul, istoricul, fișierele, publicarea, distribuirea și backupul rămân pe aceeași înregistrare centrală. Zona SC nu apare în navigarea neautorizată; backendul continuă să izoleze și numele, numărătorile, versiunile, fișierele și backupurile.

Căutarea și filtrele de stare, client, vizibilitate, familie și ordine rulează în API pe setul autorizat. Lista rămâne paginată cu 50 de rezultate. Noul filtru `family` și ordinea `number` reutilizează aceleași condiții de autorizare pentru listă și numărătoare. Nu se creează un index public al documentelor.

## Modele și context

Se păstrează cele 11 familii redactate existente. Pagina Tipizate le grupează după scop: Pregătire, Comercial, Juridic, Livrare și Recurență. Filtrul de activitate folosește catalogul real și profilurile configurabile existente, nu o listă nouă de servicii. Previzualizarea citește AST-ul în text React, fără HTML arbitrar. Folosirea unui model creează o instanță nouă; editarea masterului rămâne o acțiune separată, cu permisiuni și revizuire juridică.

Generatorul pornește pentru client, cu opțiuni explicite pentru document independent, STAFF sau SC. Dintr-un client/proiect/serviciu/abonament existent preia contextul autorizat. Selectarea unui proiect preia serviciile și abonamentele acestuia. Schimbarea beneficiarului elimină editările, devizul și asocierile beneficiarului anterior. Documentele consolidate rămân limitate la același beneficiar juridic.

Datele sunt grupate în Beneficiar și contact, Conținut și condiții, Detalii pentru activitate și Emitent AVYRON. Emitentul este precompletat și restrâns inițial pentru a reduce câmpurile vizibile. Modificările din generator sunt numai pentru instanță. Datele de facturare ale abonamentului selectat pot completa lipsurile profilului juridic, numai în contextul aceluiași client și numai când abonamentele selectate au date concordante; nu rescriu fișa CRM.

Migrarea aditivă **0082** completează numai câmpurile fiscale/contact goale ale emitentului cu denumirea juridică DIGITAL ECOTECH SOLUTIONS S.R.L. CUI-ul, sediul și e-mailul provin din configurația existentă, reconciliate cu [Termenii AVYRON](https://avyron.ro/termeni) și [pagina GDPR](https://avyron.ro/gdpr). Valorile existente și profilurile cu alt emitent sunt păstrate. Registrul Comerțului și reprezentantul nu sunt inventate. Lipsurile obligatorii continuă să blocheze aprobarea; salvarea ciornei rămâne posibilă. PF nu primește câmp CNP implicit.

## Pregătirea facturii

`POST /api/documents/:id/prepare-billing` pregătește o **ciornă în `financial_revenues`**, nu o factură fiscală emisă. Cere acces curent la document, rol staff, MFA verificat și `finance.write` sau platform owner, scop client, versiune curentă aprobată, deviz valid, date coerente și confirmare explicită. UI-ul prezintă beneficiarul, versiunea, totalul, data și scadența.

În aceeași tranzacție D1 se creează ciorna, asocierea `document_billing_preparations` și evenimentele de audit. Cheia unică pe versiune previne duplicatele la reîncercări, inclusiv cu chei de cerere diferite. Trigger-ele verifică din nou aprobarea, versiunea curentă, arhivarea, clientul și apartenența proiectelor/serviciilor/abonamentelor; orice abatere anulează întreaga operațiune. Un document cu mai multe proiecte nu este atribuit arbitrar unuia singur în registrul financiar.

Nu se atribuie număr fiscal, nu se schimbă prețul de catalog, nu se transmite factura, nu se încasează bani și nu se creează un abonament paralel. Referința financiară este returnată numai utilizatorilor autorizați financiar, niciodată automat clientului. Verificarea și emiterea rămân în modulul Financiar existent. Facturarea lunară folosește în continuare fluxul Abonamente Clienți.

## Stocare, migrare și limite

0082 este aditivă, fără schimbări de bindings, conturi sau furnizori. Relația nouă păstrează doar identificatori și audit în D1; fișierele continuă în R2 privat. Nu apar copii suplimentare pentru navigare, filtrare sau pregătirea facturii. Referințele financiare intră în backupul bazei D1; backupul individual al documentului nu înlocuiește backupul registrului financiar. Strategia și limitele existente de restaurare/scanare rămân descrise în [DOCUMENT_CENTER.md](./DOCUMENT_CENTER.md).

La release se inventariază toate migrațiile restante și se aplică în ordine; 0081 trebuie să preceadă 0082. Migrarea 0082 precedă API-ul nou, după backup și verificarea reviziei exacte. Rollbackul aplicației păstrează tabelul și datele; nu se aplică migrare inversă distructivă. Nu se activează servicii plătite.

Limitări păstrate: modelele juridice cer revizuire umană, reprezentantul și numărul de înregistrare trebuie completate dacă lipsesc; scanarea antimalware a importurilor nu este configurată; integrările de distribuire au stările reale existente. Cele 8 ghiduri STAFF existente sunt păstrate, fără inventarea unui al nouălea. Contextul generatorului păstrează limitele de 250 de clienți / 500 de proiecte și instanțe din API-ul actual.

## Verificare locală

Testele de interfață folosesc date sintetice; testul Worker/D1 local folosește autentificarea existentă și înrolare/verificare TOTP efectivă. Aceste verificări nu reprezintă un deploy sau o probă în contul real.


| Verificare | Rezultat |
| --- | --- |
| Vitest complet | 84 fișiere, 673 teste trecute, 1 benchmark opțional omis |
| Regresie documente după ajustarea exportului Word | 51 teste trecute |
| Playwright dashboard / navigare / Social / AVY Core / Leaduri / Servicii / Abonamente | 70 teste trecute |
| Playwright final Document Center | 11 teste trecute; 71 scenarii distincte în total cu regresia de mai sus |
| Accesibilitate automată | 0 abateri în Biblioteca Agenție și Tipizate pentru setul axe WCAG 2 A/AA și 2.1 AA; nu este certificare a întregii platforme |
| Ecrane mici | 320, 390 și 768 px pentru noua bibliotecă; regresia dashboardului include și celelalte dimensiuni/teme existente |
| TypeScript | Aplicație și Worker trecute |
| ESLint | 0 erori; 4 avertismente React Refresh existente în componentele Logo |
| Toate migrațiile D1 în SQLite | `integrity_check=ok`, fără erori FK |
| Worker/D1 local | Migrarea 0082 aplicată local; FK curat și `quick_check=ok` pentru cele trei tabele verificate |
| Flux efectiv cu autentificare/TOTP | Aprobare → ciornă financiară → retry fără duplicare → publicare la client A; client B refuzat cu 404; referința financiară ascunsă clientului |
| Exporturi efective prin Worker local | PDF și DOCX descărcate de clientul autorizat; DOCX OOXML real, cu deviz, diacritice și total corect |
| Builduri statice / Pages / Worker | `npm run build:pages` și `npm run build:worker` trecute; audit SEO trecut în ambele; fără publicare |
| API build | Typecheck, tipuri binding și bundling `--dry-run` trecute, fără deploy |

Exportul Word are acum antet fără dublarea mărcii, titluri în culorile AVYRON și deviz cu coloane proporționale, antet diferențiat și total evidențiat. Versiunile și exporturile istorice stocate nu sunt rescrise. Verificarea vizuală folosește exporturi sintetice randate în PDF și LibreOffice. Contractul are 2 pagini în fiecare format; documentul lung are 8 pagini PDF și 7 pagini Word, cu tabele și paginare inspectate. Nu s-au identificat caractere în afara paginilor în cele patru PDF-uri verificate, inclusiv randările Word.

Capturi sintetice: [Bibliotecă Agenție desktop](assets/document-center/agency-desktop.jpg), [mobil](assets/document-center/agency-mobile.jpg), [previzualizare tipizat](assets/document-center/template-preview.jpg), [editor](assets/document-center/document-editor.jpg), [ofertă Word randată](assets/document-center/word-offer.jpg).

Ultima corecție de context: SC și STAFF ignoră filtrele de client/proiect rămase în URL, iar crearea unui document în aceste zone nu moștenește asocierile unui proiect de client anterior. Scenariul este acoperit de testul de browser final.

`git diff --check` este curat. JavaScript-ul generat nu include parola, sesiunea sau documentul fixture-ului local. Sesiunile locale de test au fost închise și factorul TOTP sintetic a fost revocat; nu au fost schimbate conturi reale.
