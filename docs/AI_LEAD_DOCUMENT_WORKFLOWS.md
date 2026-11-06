# Proiecte AI, arhivă de leaduri și documente pentru beneficiari viitori

Task din 6 noiembrie 2026, pornit de la `05ced741c0c5f713cc94a8ad46a2a0d7a43f27ca` (PR #94, încă separat de producție la începutul lucrului). Ramura dedicată este `codex/ai-leads-document-workflows-2026-11-06`. Migrarea nouă este 0093, după 0091–0092 din PR #94. Nu interpreta această implementare sau un preview ca release în producție.

## Proiecte AI

În `/profil?tab=ai-projects` și `/intern/ai-projects`, Owner/Super Admin au butonul **Creează proiect AI**. Formularul cere nume, obiectiv și descriere/context opțional. Se reutilizează `ai_projects`, `ai_project_events`, registrul de idempotency și autorizarea native. Adresa proiectului se generează automat.

`POST /api/ai-projects` impune principal de platformă, MFA și idempotency key. Crearea și auditul sunt atomice; retry-ul identic întoarce același proiect. Proiectul agenției pornește `setup`, `automation_mode=approval`, fără mesaje externe autorizate și fără a genera conținut. Echipa, agenții și canalele se configurează prin pagina existentă. Nu sunt create conturi, conexiuni, abonamente sau licențe. Pierderea privilegiului de platformă nu este compensată printr-un grant implicit nou.

## Leaduri

**Arhivează** este disponibil pe rând, în pipeline și în fișa leadului. Arhivarea are cinci motive specifice:

1. Proiect amânat de beneficiar.
2. Nu răspunde la reveniri.
3. Buget indisponibil momentan.
4. Nu mai este interesat.
5. Solicitare în afara serviciilor AVYRON.

Schimbarea etapei sau priorității returnează revizia serverului, astfel încât arhivarea imediată nu depinde de polling. Nota internă este opțională. Confirmarea, revizia, dreptul de scriere și ACL-ul resursei sunt obligatorii. `POST /api/leads/:leadId/archive` păstrează leadul, etapa, contactele, proiectul asociat, activitățile și reminderele. Migrarea `0093_lead_archive.sql` adaugă numai metadate și index. Ştergerea existentă rămâne un flux distinct.

**Leaduri arhivate** deschide lista în aceeași pagină. `GET /api/leads?archived=1&offset=...` păstrează același control al accesului și paginează câte 50 de înregistrări. Căutarea vizuală filtrează explicit înregistrările încărcate. Restaurarea confirmată readuce etapa inițială și este auditată. Arhivatele nu apar în lista/pipeline-ul activ și în indicatorii operaționali activi, pipeline-ul analitic și lista de solicitări active din Produse. Raportarea istorică financiară rămâne istorică. Mutările normale și activitățile/reminderele nu pot modifica un lead arhivat; verificările SQL acoperă și o arhivare concurentă.

Butoanele **WhatsApp** apar numai când telefonul poate fi normalizat într-un format internațional valid sintactic. Numerele românești locale și prefixul internațional 00 sunt normalizate; valorile ambigue, extensiile și URL-urile injectate sunt refuzate. Existența contului WhatsApp nu este verificată automat. Linkul deschide conversația; fișa permite un mesaj scris de utilizator și codificat în URL. Trimiterea rămâne manuală în WhatsApp, fără a marca deschiderea ca transmitere sau livrare. Cererile întârziate ale altei fișe nu pot înlocui contactul/destinatarul curent.

## Documente SC

În Documente SC apare rezumatul profilului existent: denumire, CUI, Registrul Comerțului, sediu, reprezentant și e-mail. Valorile lipsă sunt marcate **Necompletat**. **Completează datele firmei** deschide formularul existent în aceeași secțiune; accesul și salvarea rămân rezervate principalilor autorizați. Se reutilizează `document_company_profile` și `/api/documents/settings/company`. Datele se preiau în documentele noi; versiunile deja salvate/finalizate rămân independente.

## Generator și export extern

Pentru beneficiar există două moduri:

- **Client existent / CRM**: contextul și autorizările native rămân aplicabile.
- **Completare directă**: nume/denumire, formă juridică și datele relevante pot fi introduse direct în document, fără a impune un client sau cont fictiv. Ciorna este internă și nu acordă acces în portal.

Opțiunea **Proiect viitor / în negociere** păstrează denumirea și contextul în instanța documentului, fără a crea obligatoriu un proiect operațional. Funcționează și pentru un client existent, fără proiect selectat. Modelele master nu sunt modificate.

Dacă utilizatorul alege explicit **Salvează beneficiarul în CRM**, se reutilizează fluxul nativ de clienți, cu numele/e-mailul și datele fiscale introduse. Contul este `mode=none`; înregistrarea nu acordă acces prin potrivirea e-mailului. Clientul nou este apoi selectat în generator. Crearea unui proiect real din generator folosește etapa Propus și API-ul nativ cu cheie de idempotency.

**Descarcă PDF** și **Descarcă Word (.docx)** folosesc exporturile existente, cu aceeași autorizare server-side, versiune, cache privat și audit. Ciornele sunt marcate neaprobate, inclusiv în Word. Aprobarea juridică, publicarea și facturarea păstrează fluxurile separate. Un beneficiar completat manual nu este transformat automat într-o identitate fiscală autorizată pentru emiterea facturilor sau într-un destinatar de portal.

## Validare și lansare

Testele runtime folosesc Hono/SQLite reale și simularea stocării native, inclusiv exporturi PDF/DOCX reale. Browserul verifică UI cu API-uri simulate, pe desktop și mobil. Nu reprezintă acceptanță în contul real sau dovadă de trimitere WhatsApp.

Înainte de un release autorizat: integrează toate migrațiile necesare în ordine, inclusiv 0091–0092 dacă PR #94 nu este deja lansat, păstrează backupul privat existent și aplică 0093 înainte de API. Apoi verifică versiunea Worker, schema, ACL-urile, arhivarea/restaurarea, datele emitentului și exporturile autentificate. Fără activări de servicii plătite, chei sau furnizori noi în acest task. Rezultatele exacte și starea CI sunt în PR.


### Rezultate locale pentru acest task

- Suita completă: 96 fișiere, 837 teste trecute și un benchmark opțional omis. După ultimele ajustări ale arhivei: 34 teste țintite trecute pentru sincronizarea listelor active, apoi 13 teste runtime trecute pentru arhivare/ACL/istoric/revizie, inclusiv schimbare etapă urmată imediat de arhivare.
- 32 scenarii Chromium trecute pentru AI, leaduri, documente și regresii ale configuratorului, inclusiv 320 px și desktop. Aceleași 32 de scenarii au fost repetate cu succes pe buildul final, inclusiv schimbarea etapei urmată imediat de arhivare.
- PDF real și DOCX ZIP editabil verificate pentru beneficiar direct/proiect viitor, cu marcaj de ciornă și acces privat; browserul folosește răspunsuri API simulate și verifică și acțiunile de download.
- `npm run typecheck` și lint complet: fără erori; patru avertismente preexistente în componente 3D. Typecheck app și lint țintit au fost repetate pe ultima corecție, fără erori sau avertismente.
- Build static/Pages, site Worker și API Worker dry-run trecute. Pages și API au fost refăcute după ultima corecție a reviziei; audit SEO: 77 pagini indexabile, 212 noindex publice, 11 URL-uri strategice. Avertismentele existente de chunking/Zod nu blochează buildul.
- Schema completă D1 și migrarea 0093 au trecut local. Arhivare, audit, restaurare și integritatea FK au fost probate și prin Wrangler D1 local; niciun acces sau write la D1 remote.
- Verificarea vizuală a capturilor: creare AI pe mobil, rezumat SC pe desktop, beneficiar direct și arhivă pe mobil.

Acceptanța în contul real și verificarea după un release autorizat rămân distincte de aceste teste. Nu a fost trimis niciun mesaj WhatsApp și nu au fost activate chei, scanere sau integrări externe.
