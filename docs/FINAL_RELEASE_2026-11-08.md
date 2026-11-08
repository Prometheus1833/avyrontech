# Lansare finală AVYRON — 8 noiembrie 2026

Utilizatorul a autorizat explicit integrarea, push și deployul în producție. Bază verificată: `origin/main` = `01acfb909a7026731f2542f17da00bb3391f99a3`. Ramură de release: `codex/final-release-2026-11-08`. Destinație: contul Cloudflare **Avyron**, Workerul existent **avyrontech**, D1 **avyron-db** și cele patru bucketuri private existente. Buildul standalone **avyron-site** este validare de compatibilitate; nu înlocuiește destinația de producție.

## Inventar verificat

| PR | Head inclus cu istoricul original | Conținut |
| --- | --- | --- |
| #113 | `19fce381aea7fe10a391bc2d2422ededb8640d13` | Manager Social Media: agendă 24h, aprobări sincronizate și materiale reutilizabile |
| #114 | `eb1c8e87320deffcdbb12e8bf8c44bda4cb43fd8` | Prezentare generală: priorități acționabile, proiecte AI și diagnostic R2/AI |
| #115 | `5667b6abb8ed72a3b2c156c36786890ae7d1b445` | Financiar: conturi editabile, proiecte compacte și finalizarea produselor digitale |
| #116 | `5b7754490cc30f2bbb00d2a92b6feef9e198cc48` | Logo 3D: preț configurabil, AI Free și mentenanță simplificată |
| #117 | `b4428e9489ac678696adf1a633d7284b2683f4d8` | AVYRON OS: coduri compacte, centru Resend și cunoștințe Site Builder |
| #118 | `3910ccf094d83c89a235fe1771de14270f8f9b5e` | Logo Engine și Media Generate: ateliere dedicate și imagini cinematice |
| #119 | `8ca17408121fbea10b6049cb5894a51bdcec6516` | Domenii .ro: adaptor sigur și Avyron Quality Standard pe landing |
| #120 | `e6dfff5f9de11e8791876f601c87c2e5b6507a9e` | Landing: carusel blog sincronizat și coperți robuste pe web/mobil |

Toate cele opt headuri sunt strămoși ai ramurii de release. Integrarea prin merge păstrează această dovadă și permite reconcilierea PR-urilor originale. **PR #110 și `client-sites/cabinet-avocatura` sunt excluse**; diferența acelui director față de main este goală. Nu se publică site-ul cabinetului și nu se schimbă DNS/rute pentru el.

Baza main include deja Document Center (#87), lotul OS (#93), portalul/produsele (#103), generatorul (#105), SEO (#106), Avy Skills și reconcilierea (#108), înlocuirea Qwen (#111) și notificările (#112). Notele lor istorice „local”/„nepublicat” nu sunt tratate drept starea curentă.

## Matrice cerințe → implementare și verificare

| Grup de cerințe | Suprafețe și dovadă relevantă | Limită sau acțiune operațională |
| --- | --- | --- |
| CRM, clienți, proiecte și conturi sincronizate | Fluxurile native users/profiles, client_account_access, proiecte/servicii, intervenții și abonamente; teste `client-workspace`, `workspace-runtime`, `client-portal`, `auth-session-persistence` și parcursuri browser | Nu creează CRM/auth paralele; testul final autentificat al utilizatorului rămâne separat de fixture-uri |
| Leaduri, etape, arhivare/motive, WhatsApp | Registre native și E2E leaduri/servicii/AI; numere validate înainte de link | Deschiderea WhatsApp nu dovedește transmitere sau livrare |
| Manager Social Media și Codex | 0105, agendă -24h/+24h, reutilizare, sursă/revizie, aprobări comune, arhivare istoric; teste sociale și handoff | Cronul pregătește; publicarea externă și aprobarea umană rămân distincte |
| Prezentare generală, priorități, aprobări, proiecte AI | #114, verificări resurse/rol, primele trei evenimente, acțiuni și selecție proiect; `overview-actions-runtime` și E2E | Diagnosticul nu mărește cotele AI și nu certifică o restaurare R2 |
| Financiar compact, conturi editabile, SKU/coduri și vânzări | 0106, #115, editare/activare/arhivare cu audit, nomenclator, profil comercial/licență/versiune/checkout; `finance-commerce-runtime`, `paid-development-products`, E2E financiar | Datele financiare se modifică numai cu MFA verificat. Produsele fără licență, fiscalitate și livrabil confirmate rămân oprite |
| Mentenanță, abonamente clienți/interne, proiecte externe | #116/0107 și implementările native din main; picker căutabil, client nou, servicii/catalog și alocări; E2E social/AVY Core/portal | Metadatele de facturare nu reprezintă o încasare automată sau un consimțământ de debitare |
| Logo 2D gratuit / Logo 3D produs distinct | Catalog, preț din sursa nativă, configurare permisă, asistență AI Free-only, tariful AI păstrat; teste logo/purchase/catalog | Nu modifică automat prețurile; drepturile/licențele comerciale cer confirmare |
| Document Center complet | 11 familii, master→instanță→versiune, date SC existente, editor, salvare, PDF/DOCX reale, contexte/asocieri multiple; teste documente/editor/export/backup și E2E | ONRC/reprezentant/capital lipsă sunt completate de utilizator; modelele juridice necesită revizuire umană |
| Acces Documente SC, STAFF și clienți | RBAC și resource checks, Owner/Super Admin conform cerinței finale, publicare explicită, revocare și download revalidat; teste IDOR/istoric | Nu se publică fișiere sau backupuri; clientul nu primește bibliotecile interne |
| Distribuire documente | API nativ, link privat autentificat, preview/confirmare și istoric real; teste e-mail/manual WhatsApp/Telegram/failure | Fără furnizor/autorizare, starea rămâne neconfigurată/manuală; nu se afirmă livrare |
| AVY STAFF, chat, notificări, parteneri | Roluri/capabilități, discuții de proiect-client, mini-panouri, badgeuri și fișe native; teste staff/chat/parteneri/notificări | Nicio promovare automată de rol prin asociere ca partener/client |
| Media, antivirus și fișiere | R2 privat, verificarea verdictului și provenienței, carantină și cote; teste malware/media | Bouncer nu are încă un cont/cheie/DPA confirmate. Uploadurile externe sensibile rămân blocate; generările interne nu consumă scanări |
| Site Builder, agenți, resurse și domenii | #117/0108, selecție progresivă, referințe aprobate, Markdown Codex/Claude/Lovable, carusele publicate și instrucțiuni versionate | Exportul unui handoff nu pornește un agent desktop când Mac-ul este închis; cloudul poate pregăti coada |
| Logo Engine / Media Generate | #118, direcție creativă, brief vizual, SVG din snapshot, private media/checksum/backup; teste `avy-skills`, export, idempotentă și UI | Masterele fotografice sunt 1672×941 nativ; nu sunt prezentate ca 4K/8K. Niciun serviciu plătit nou |
| Newsletter / Resend | #117, feedback real, revizii, alocări, sincronizare și pipeline; teste newsletter/politici și E2E | Cheia Resend nu există încă în Worker; nu au fost trimise campanii și nu se inventează statistici |
| Domenii .ro | #119/0109, adaptor registrar read-only, cache și fallback conservator; teste API/schema/erori și E2E | Credențialele Openprovider lipsesc; NXDOMAIN nu este declarat disponibil. Contul API se configurează securizat ulterior |
| Landing, Quality Standard, blog și imagini | #118–120, imagini responsive, cinci obiective de calitate, ultimele șase articole sincronizate, swipe/săgeți/pauză; RO/EN, reduced-motion, teste media și E2E | Obiectivele 100/100 nu sunt scoruri Lighthouse măsurate; coperțile publice existente au fost verificate separat în browser |
| SEO/indexare și preview-uri | Registry public, canonical/hreflang, prerender, OG/Twitter specifice, sitemap/robots/llms, audit HTML/linkuri și teste rute | GSC a fost consultat direct: sitemapurile sunt citite cu succes; raportul de indexare afișat este datat 23.10.2026. Conturile, resursele și demo-urile păstrează excluderile intenționate. Nu se promite indexare ori trafic instantaneu |
| Hugging Face / modele AI | Integrarea Hugging Face a fost omisă explicit; Cloudflare AI și înlocuirea Qwen sunt native | Nu se activează automat API-uri, overage sau modele plătite |

## Reconciliere tehnică

Conflictele de continuitate au păstrat ambele note. Conflictul skillRuntime a păstrat **împreună** selecția Free-only/Cost Guard și contextul creativ/referințele compacte. Un test de integrare suplimentar verifică referința aprobată, contextul Logo Engine și limita Free, fără mărirea bugetelor. Nicio funcție nu este eliminată pentru a rezolva merge-ul.

Migrațiile 0105–0109 sunt ordonate peste 0104 deja aplicată. 0105 arhivează joburile istorice, fără ștergerea lor, și versiunează agentul social păstrând model/bugete/tool policies. 0106 adaugă profiluri comerciale, fără activare de produse. 0107 adaugă intenția Free-only și cheia serviciului de mentenanță. 0108 adaugă metadate operaționale și playbookuri aprobate, fără trimitere. 0109 lărgește sursa verificărilor de domenii prin copiere atomică a tuturor câmpurilor/ID-urilor și recrearea indexurilor.

## Backup și restaurare înainte de migrare

D1 are un punct Time Travel înregistrat înainte de scrieri. Exportul general standard nu suportă tabelele FTS; nu au fost șterse tabele pentru a-l forța. Copia privată include 261 tabele obișnuite și toate cele trei FTS: două reconstruite din conținutul extern și unul cu propriile rânduri copiate. Restaurarea locală în SQLite a trecut `quick_check=ok` și zero încălcări FK. Manifestul păstrează checksum SHA-256. Backupul este în afara Git, în directorul privat al operatorului; conținutul și URL-urile temporare de export nu intră în raport sau PR.

Fișierele R2 nu sunt modificate de migrațiile acestei lansări. Copia D1 nu este prezentată ca backup al obiectelor R2. Destinațiile documentelor și backupurile corporative păstrează izolarea nativă; `BACKUP_JOBS_ENABLED=false` nu este confundat cu protecție automată activă. Restaurarea integrală în producție se execută numai în caz de necesitate și cu planul operațional, nu ca probă distructivă.

## Verificări și lansare

Preflight: identitate GitHub/Cloudflare corectă, worktree curat inițial, toate headurile reconciliate, tipuri/lint/audit D1 și catalog, build static/Pages/Worker/API/e-mail. Cele 47 teste ale skillurilor, inclusiv combinația Free/creative, au trecut independent. Suitele complete de acceptanță sunt urmărite până la rezultat, înainte de integrare și deploy.

O rulare locală care concura cu buildul și browserul a atins timeouturi de hook la recrearea schemei complete. A fost întreruptă și va fi repetată separat, fără relaxarea limitelor de test ori eliminarea aserțiunilor. Se păstrează rezultatul final exact în PR. Indexarea Google, plata efectivă, livrarea e-mail și acceptanța umană autentificată nu sunt deduse din teste cu fixture-uri.

După CI verde: revalidare main → integrare cu păstrarea istoricului → migrări cu backup și integritate → build final din main cu snapshotul publicat → deploy doar avyrontech → verificare independentă HTTP/bundle/rute publice, securitate API anonimă și web/mobil. Versiunea efectivă, migrările, rezultatele și starea PR-urilor vor fi consemnate după verificarea live, fără a pretinde lansarea anticipat.
