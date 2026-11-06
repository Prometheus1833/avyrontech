# Colaboratori / Parteneri — AVYRON OS

Implementare locală, 06.11.2026, de la `0dd2286`, pe `codex/collaborators-partners-2026-11-06`. Nu s-au făcut push, PR, merge, deploy, migrări remote, creări de conturi reale ori trimiteri către contacte. Continuă lotul autorizat pentru lansare la final; nu reprezintă o funcție deja activă în producție.

## Experiență

**Principal → Colaboratori/Parteneri**, după Antivirus, ultimul buton al primei grupe. Registru cu căutare după nume/cod/contact/specializare, filtre pe domeniu și stare, arhivă, paginare de 24 de fișe și carduri compacte. Domenii: juridic, financiar, economic, dezvoltare, marketing și alți parteneri. Relația poate fi colaborare sau parteneriat; stările sunt în discuție, activ, în pauză și încheiat.

„Deschide fișa colaboratorului” deschide un panou lateral adaptat mobilului, cu trei zone:

- **Fișă**: denumire, persoană de contact, domeniu, relație, e-mail, telefon, WhatsApp, website, specializare și asocieri opționale.
- **Colaborare**: stare, date opționale, obiect/caracteristici, responsabilități/condiții și note interne. Nu se inventează tarife, termene sau clauze juridice.
- **Documente**: maximum trei documente active, fiecare de maximum **5.000.000 bytes**, comune ambelor părți. Formate: PDF, DOCX, PNG și JPG.

Apelul, WhatsApp și e-mailul sunt linkuri native validate (`tel:`, `wa.me`, `mailto:`), active după completarea datelor. WhatsApp cere număr internațional explicit; deschiderea aplicației nu reprezintă trimitere sau livrare. Un website cu protocol arbitrar ori credențiale nu este acceptat. Nu există mesaje automate către terți.

## Relații și conturi

`agency_collaborators` este registrul relațiilor profesionale. Nu este `partnership_plans`, nu creează abonamente și nu acordă produse/licențe AVY Partener. Codul intern `AVP-…` este unic, stabil, generat automat și nu este un SKU sau o permisiune.

O fișă poate exista fără cont și fără client CRM. Poate indica un client existent și un cont nativ verificat; nu se creează un CRM sau o autentificare paralelă. Căutarea conturilor cere e-mailul sau username-ul exact. Asocierea este confirmată explicit și nu este dedusă din adresa de contact. Dacă se alege și un client, contul trebuie să aibă acces nativ distinct la acea entitate.

În `/api/auth/me`, `hasCollaborations` și `isAgencyPartner` sunt calculate din relațiile autorizate curente. Categoria de profil `avyron_partner` și achiziția unui plan nu produc acest badge. O relație încheiată rămâne în istoricul autorizat, fără badge activ și fără uploaduri noi. Arhivarea sau retragerea asocierii elimină accesul din cont. Revocarea accesului nativ la client invalidează imediat accesul la colaborarea legată de el.

Contul asociat are **Colaborările mele** în user menu (`/profil?tab=my-collaborations`) și badge-ul **Avyron Partener** în profil/meniu pentru relații neîncheiate. Meniul revalidează profilul când este deschis; administratorul își reîmprospătează identitatea după salvare. Serverul revalidează resursa la fiecare operațiune, indiferent de eticheta afișată anterior. Nu există o sesiune sau un rol nou de autentificare.

La schimbarea contului, toate documentele sunt retrase din publicarea către colaborator și necesită republicare individuală. Un beneficiar juridic asociat nu poate fi schimbat după ce există documente; se creează o fișă distinctă. Notele interne și referințele administrative nu sunt incluse în răspunsul portalului.

## Permisiuni

Owner/Super Admin au acces prin autorizarea nativă. Restul echipei trebuie să primească explicit:

- `collaborators.read`: registru, fișe și documentele acestui modul;
- `collaborators.manage`: creare/editare, asociere de cont, upload, publicare și retragere, cu dependența de citire în editorul de drepturi existent.

Nu se acordă automat drepturi tuturor Adminilor sau rangurilor staff. Se reutilizează politica MFA existentă pentru scrierile privilegiate; configurația globală MFA nu a fost modificată. Un colaborator extern vede numai relațiile contului său și fișierele publicate; poate încărca și retrage propriile documente, fără a modifica asocierile, notele interne sau documentele altora. Un badge nu conferă permisiuni de staff.

## Document Center și antivirus

Fiecare relație are un singur dosar administrativ intern în `documents` / `document_versions`. Nu este un contract aprobat. Fișierele sunt în **`document_files` și R2 FILES existente**, o singură dată. `collaborator_documents` conține asocierile, cele trei locuri, autorul, vizibilitatea și intenția de upload. Nu există bucket sau furnizor nou.

Flux: autorizare → validare tip/dimensiune reală → verificarea configurării/conformității → rezervare atomică a unui loc → carantină/scanare prin mecanismul Bouncer existent → CLEAN → revalidarea accesului → fișier central și asociere → publicare explicită pentru cont.

- Cele trei locuri se rezervă înaintea apelului taxabil în cotă. Cererile simultane nu pot crea un al patrulea document. O rezervare abandonată, fără fișier final, expiră după două minute și este recuperată la următoarea încărcare.
- Retry-urile păstrează cheia de intenție; conținutul scanat în același context reutilizează verdictul. Stările incerte nu generează automat un alt POST Bouncer.
- Lipsa DPA/configurării, epuizarea cotei, malware, verdict suspect ori nefinalizat blochează accesul și eliberează locul nefinalizat din fișă. Carantina centrală păstrează propriile reguli de retenție și buget.
- Pentru un verdict încă în așteptare, utilizatorul reia încărcarea după verificare; verdictul existent este reutilizat fără altă scanare. Nu există un worker nou care publică automat în numele său.
- Uploadul făcut de colaborator este vizibil în propria relație; uploadul staff este intern implicit. Publicarea/retragerea cer confirmare. Schimbarea accesului în timpul scanării împiedică finalizarea fișierului pentru noul context.
- Downloadul trece prin autentificare, politica relației, vizibilitatea fișierului și verdictul CLEAN legat de versiunea R2 exactă. Fără URL-uri anonime, cache partajat sau inspecție a carantinei.
- Retragerea unui fișier eliberează locul activ, păstrând originalul și jurnalul central. Nu șterge contracte sau fișiere oficiale printr-o regulă generală de curățare.

Dosarul central poate fi consultat și salvat în backup prin infrastructura Document Center. Editarea/publicarea/importul prin ruta generică sunt blocate pentru acest dosar: acțiunile se fac din fișa colaboratorului. Arhiva și beneficiarul dosarului se sincronizează cu fișa. Istoricul nativ al documentului primește evenimente imuabile pentru creare, modificări/asocieri, import și vizibilitate/retragere. Jurnalul operațional înregistrează identificatori, fără conținut privat ori secrete.

Copiile native ale dosarului nu înlocuiesc backupul D1 al relației, asocierilor și vizibilității. Restaurarea completă cere consistența D1/R2 și revalidarea versiunilor obiectelor. O restaurare de versiune în Document Center nu publică automat fișiere în portalul partenerului și nu ocolește carantina; recuperarea/republicarea rămâne controlată de operator.

**Dependență neactivată:** Bouncer nu a fost testat real în acest lot, cheia și verificările contractuale/private sunt în continuare necesare. Uploadurile reale sunt blocate până la îndeplinirea porților descrise în [ANTIVIRUS_BOUNCER.md](./security/ANTIVIRUS_BOUNCER.md). Testele locale folosesc exclusiv un furnizor controlat, nu dovada unui motor antivirus real.

## API și migrare

Migrarea aditivă **0090** adaugă două tabele de relații/asocieri, indexuri și o constrângere de integritate a fișierului central. Nu modifică datele CRM, conturile, abonamentele, prețurile sau rolurile existente. Lotul nelansat ajunge la **0078–0090**, de aplicat în ordine înainte de API.

- `GET/POST /api/collaborators`, `GET /api/collaborators/options`, `PATCH /api/collaborators/:id`: registrul autorizat și asocierile confirmate.
- `GET /api/my/collaborations`: numai relațiile autorizate ale contului.
- `GET /api/collaborations/:id`: fișă și documente, cu răspuns adaptat accesului.
- `POST /api/collaborations/:id/files`: upload cu `Idempotency-Key` și `X-File-Name`.
- `GET/PATCH /api/collaborations/:id/files/:fileId`: download controlat, publicare sau retragere confirmată.

Toate răspunsurile sunt private/no-store și noindex. Se limitează dimensiunile JSON, căutarea, paginarea și frecvența cererilor. Actualizările folosesc revizii și tranzacții; conflictele păstrează ciorna pentru reîncărcare, fără suprascriere tacită.

## Verificare și lansare

Verificări locale inițiale: 23 teste dedicate de backend și zece scenarii UI, inclusiv mobil/desktop și WCAG AA pentru fișă. Opt verificări native au folosit autentificarea aplicației, workerd, D1/R2 locale și un furnizor controlat, cu mostre sintetice: cont/CRM, badge, izolarea clienților, note interne, poarta de conformitate, CLEAN/download, limita trei și revocare. Baza locală este integră, zero încălcări FK, 88 de migrații locale; nicio prelucrare Bouncer reală și niciun efect remote.

Înainte de release: review și integrarea ultimului `main`, backup și migrații în ordine, configurarea/verificarea Bouncer și R2 privat, apoi API și frontend. Testul final în conturile reale rămâne pentru utilizator, conform deciziei anterioare. Push/deploy sunt amânate până la finalizarea lotului autorizat.

Rezultate finale pe lotul local:

| Verificare | Rezultat |
| --- | --- |
| Vitest, surse | 92 fișiere: 774 trecute, un benchmark opțional omis. |
| Vitest, artefacte Pages / HTML / preview servicii | 3 fișiere: 44 trecute. Total: **818 trecute, 1 omis**. |
| Backend dedicat colaboratorilor | **23/23 trecute**, inclusiv revalidarea accesului în timpul scanării, concurența ultimului loc și recuperarea rezervărilor expirate după întrerupere; reluate după această corecție. |
| Playwright pe buildul de producție | **86/86 trecute**: colaboratori, antivirus, documente, Media, dashboard, roluri, user menu și upbar. |
| Workerd cu autentificare și D1/R2 locale | **8 verificări trecute** cu furnizor controlat; zero efecte remote. |
| TypeScript, aplicație și Worker | Trecut. |
| ESLint | Zero erori; patru avertismente Fast Refresh preexistente. |
| Build static / Pages, Worker site, adaptor Pages | Trecute; auditul SEO tehnic a trecut. |
| API Worker | Tipuri actualizate/verificate, compilare și `wrangler deploy --dry-run` trecute; nu este un deploy. |
| Integritate / diff | `quick_check=ok`, zero încălcări FK, `git diff --check` trecut. |

Benchmarkul omis este cel opțional pentru limitele publice (`AVYRON_BENCH_PUBLIC_LIMITS` neactivat), nu un test al colaboratorilor. Capturile la 320/390/1440 px au fost inspectate; panoul și butonul de închidere sunt verificate în viewport, iar analiza automată WCAG AA a fișei nu raportează încălcări în scenariul testat. Verificarea SEO privește artefactele tehnice, nu confirmă indexarea în motoare de căutare. Testarea antivirus reală și acceptanța în conturile reale rămân distincte și neexecutate.
