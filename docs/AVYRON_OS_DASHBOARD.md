# AVYRON OS — Dashboard operațional

## Scop

Dashboardul AVYRON OS este o suprafață internă, în limba română, care agregă
proiecte, leaduri, date financiare, aprobări AI și starea infrastructurii.
Interfața aplică progressive disclosure: afișează numai informația esențială,
iar modulele păstrează detaliile și acțiunile complete.

## Surse de date active

- D1: proiecte, clienți, leaduri, facturi, alerte financiare, rulări și aprobări AI;
- R2: starea bindings pentru documente și media, fără listări publice;
- Workers AI: numai starea bindingului; execuția rămâne protejată de Cost Guard;
- AVY Engine: conectori și capabilități aprobate;
- analytics first-party: sesiuni din ultimele 30 de zile.

Endpointul `GET /api/os/overview` răspunde în funcție de rol. Clientul primește
doar sumarul proiectelor asociate contului său. Datele de platformă, financiar,
integrări și agenți sunt returnate numai Super Adminului.

## Centre active

- AVY Briefing determinist, fără consum AI;
- Needs Attention;
- Approval Center pentru `ai_approvals`;
- AI Activity din `ai_runs` și `ai_run_steps`;
- health pentru API, autentificare, D1, R2 și Workers AI;
- Command Center pentru navigare autorizată;
- Team / Staff cu mascarea informațiilor pentru rolurile fără acces complet și
  administrarea nivelului Client / Staff / Administrator de către Super Admin;
- registrul Centre AVYRON OS, cu starea reală a fiecărui modul.

## Aprobări

Deciziile sunt disponibile numai unui principal de platformă cu MFA. Update-ul
folosește condiția `pending` plus termenul de expirare, sincronizează starea
rulării și a pasului și adaugă un eveniment în audit. Aprobarea nu reprezintă
executarea directă a unei acțiuni externe; executorul autorizat o preia separat.

## Echipă și acces

`GET /api/admin/users` reutilizează inventarul existent de conturi și maschează
datele pentru personalul fără acces complet. `PATCH /api/admin/users/:userId/roles`
este disponibil numai identității Super Admin cu MFA validat și acceptă doar
nivelurile `user`, `staff` sau `admin`.

Schimbarea este idempotentă, tranzacțională în D1 și scrie în `security_events`
rolurile anterioare și cele noi, fără date personale sau secrete. Identitățile
protejate ale platformei nu pot fi retrogradate din interfață. Rolurile sunt
recitite din D1 la fiecare cerere autentificată, astfel încât accesul vechi nu
rămâne activ într-o sesiune deja deschisă.

## Reguli de afișare

- interfața internă este în română;
- valorile inexistente nu sunt inventate;
- o integrare fără conexiune validată apare ca neconfigurată;
- verde indică o verificare reușită, nu existența presupusă a unui serviciu;
- cardurile financiare folosesc echivalentul RON disponibil în baza de date;
- detaliile sensibile nu sunt incluse în payloadul Overview.

## Extindere etapizată

Modulele marcate „în dezvoltare” vor primi tabele și endpointuri prin migrări D1
append-only. Se reutilizează `organizations`, `organization_memberships`,
`user_capabilities`, `security_events`, `outbox_events`, AVY Engine și domeniul
financiar înainte de introducerea unei structuri noi.

Următoarea etapă include SLA, change requests, deliverables, onboarding,
offboarding, automatizări programate, Error Center, Backup & Recovery, comentarii,
newsletter, programări, experimente și calendarul juridic.
