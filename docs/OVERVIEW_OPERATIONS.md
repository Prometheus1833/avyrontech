# Prezentare generală — operațiuni și diagnostic

Bază: `01acfb909a7026731f2542f17da00bb3391f99a3`. Livrarea este independentă de PR #113; nu îl merge-uiește și nu aplică 0105. Nu adaugă tabele, furnizori, bucketuri, planuri plătite sau permisiuni administrative în aplicație.

## Cardurile operaționale

- Observabilitatea afișează `ai_agents.name`, păstrând identificatorul stabil pentru relații. Un nume absent are fallback lizibil.
- Cardul Proiecte AI citește lista autorizată existentă, permite selecția și deschide exact proiectul ales. Proiectele CRM active au legături directe către fișele lor, distincte de portofoliul AI.
- Prioritățile afișează primele trei categorii, ordonate după severitate. Lista completă deschide evenimentele reale, paginate câte 25, cu dată, stare, fișă și referință. Alertele financiare pot fi preluate sau rezolvate prin API-ul financiar existent, cu confirmare separată; această acțiune actualizează alerta, nu înregistrează o plată.
- Detaliile proiectelor reutilizează exact limita de resursă a dashboardului. Leadurile, suportul, securitatea și finanțele păstrează permisiunile sursei. Legăturile spre lead/tichet deschid elementul identificat în modulul său.

## Control uman

Fiecare rând are Revizuiește, Aprobă și Șterge, în limitele drepturilor sale. Comenzile citesc din nou solicitarea, afișează versiunea curentă și cer confirmare. Aprobarea folosește traseul nativ și CAS. Modelele juridice, caruselele și cunoașterea cu verificări specifice continuă aprobarea în modulul specializat; nu sunt aprobate printr-un bypass generic.

`DELETE /api/os/approval-center/:source/:id` retrage numai o solicitare încă în așteptare, cu revizie exactă și confirmare. Stările native sunt: cerere AI/material/cunoaștere respinsă, înregistrare operațională arhivată, versiune de model retrasă, ciornă de carusel respinsă. Documentele generate, fișierele, versiunile publicate și istoricul sunt păstrate. Scrierea auditului și modificările sursei sunt atomice. Owner-only pentru cunoașterea AVY rămâne verificat server-side. Aprobarea materialelor pentru Super Admin este aliniată dreptului deja permis de API-ul nativ.

## Ce verifică infrastructura

Anterior, „configurat” indica doar existența bindingului, nu o eroare demonstrată. Cardurile noi expun pe desktop și mobil explicația și data dovezii.

- Documente R2 și Media R2: o citire prin binding, cu maximum un obiect cerut și fără returnarea cheilor. Rezultatul este memorat 15 minute în KV; cel mult șase runde/oră pentru platformă limitează probele chiar dacă KV nu funcționează. Scrierea și restaurarea nu sunt deduse din succesul citirii.
- Workers AI: model Free, cotă financiară, bugete native pe rol, oprire umană și versiune aprobată. Simpla rezervare de buget nu constituie dovada unei inferențe.
- `POST /api/os/health/ai`: diagnostic explicit, platform Owner/Super Admin, maximum 64 tokenuri de ieșire, prompt sintetic constant, AI Core și Cost Guard existente. Folosește modelul Free principal disponibil sau alternativa Free existentă dacă rolul principal nu mai are cotă. Nu schimbă modelul implicit al agenților, bugetele sau limitele de generare. Cele două execuții/oră sunt exclusiv pentru diagnostic; retry-ul aceleiași intenții nu dublează apelul. Modelul plătit, oprirea AI, lipsa cotei sau răspunsul fără text nu sunt prezentate ca succes.
- Gemma 4 returnează [structura OpenAI cu `choices`](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/). AI Core normalizează textul în câmpul `response`, păstrând răspunsul original și usage. Imaginile rămân neatinse. Diagnosticul Gemma dezactivează thinking conform [exemplului oficial Cloudflare](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/), pentru a obține un răspuns util în limita minimă de tokenuri.

Cache-ul nu decide autorizarea. Fiecare operațiune reverifică rolul/resursa, iar toate răspunsurile OS rămân `private, no-store`. În probe nu sunt transmise documente, parole sau date ale clienților.

## Dovezi operaționale din 07.11.2026

Acestea sunt rezultate punctuale, distincte de deployul codului:

1. Autorizația CLI inițială nu includea accesul necesar R2/AI. Cu acordul explicit al utilizatorului, OAuth a fost reautorizat numai pentru contul Avyron, păstrând accesul existent și adăugând Workers Write și Workers AI write. Cloudflare nu oferă [granularitate R2 prin OAuth Wrangler](https://developers.cloudflare.com/workers/authorization/); extinderea Workers Write a avut o confirmare separată. Creditele/planurile nu au fost schimbate, iar credențialele rămân în stocarea criptată/Keychain existentă.
2. `avyron-files` și `avyron-media` au trecut scrierea/citirea unui fișier sintetic de 32 bytes și comparația SHA-256. Ambele obiecte de test au fost eliminate. Contul Owner din aplicația live a confirmat și citirea D1, KV, celor două bucketuri, backupurilor și exporturilor. Aceasta nu reprezintă un test de restaurare.
3. Rolul AI principal avea 2.995 unități rezervate din 3.000, insuficient pentru un diagnostic minim. Plafonul a rămas neschimbat. O inferență reală pe alternativa Gemma Free, prin AI Core, a fost confirmată după normalizarea răspunsului; totalul nativ global în acel snapshot era 3.133 din 5.000 unități rezervate. Nicio cotă nu a fost resetată artificial.
4. Cele șase materiale nepublicate din PR #113 au primit cele 14 imagini interne originale în R2, fără regenerare AI și fără aprobare/publicare automată. Handoff-ul sursei păstrează aceleași ID-uri și revizii; `updated_at` este nou și aprobările trebuie să citească noua versiune. 0105 va adopta ultimul eveniment `social_studio.codex.assets.synced`.

## Verificare și lansare

Testele SQL/API folosesc toate migrările și handler-ele reale, cu cazuri de acces neautorizat, revocare, CAS, rollback, protejarea caruselului publicat, modele plătite/kill switch și retry fără inferență duplicată. Testele browser acoperă Chromium/WebKit la 320, 390 și 1440 px, comenzi, dialoguri și selecția proiectului. Acceptanța în contul real pentru interfața nouă se face după deploy; testele locale nu sunt o dovadă de deploy.

Nu există migrare nouă pentru această livrare. PR #113 și migrarea 0105 rămân o livrare separată, în așteptarea autorizării de merge/deploy. Proiectul cabinetului, PR #110 și designul public delogat nu sunt modificate. Taburile proprii de autorizare, diagnostic și QA sunt închise după utilizare.
