# Clienți — fișă unificată AVYRON OS

Implementare locală pe `codex/client-workspace-2026-11-05`, pornită de la `51960ce`. La începutul taskului `origin/main` era `631a127`. Aceste repere descriu checkoutul, nu o lansare în producție. Push, PR, merge, migrațiile remote și deployul se păstrează pentru finalul lotului de taskuri, conform utilizatorului.

## Interfață și trasee

Intrare: `/profil?tab=clients`. Registru paginat cu căutare în nume, contact, email, telefon și cod fiscal, tolerantă la diacritice românești, filtre de stare și tip juridic. Fiecare client are acțiunea explicită **Deschide fișa clientului**. Acțiunea **Adaugă client** creează o fișă CRM și, opțional, un cont ori o asociere cu un cont existent.

Fișa are secțiunile Prezentare, Date client, Conturi, Proiecte, Abonamente, Plăți și Documentele clientului. Zonele financiare/documentare respectă permisiunile curente. Interfața este adaptată pentru ecrane înguste, cu navigare orizontală, corp scrollabil, confirmare la abandonarea modificărilor profilului și erori recuperabile.

- Forma juridică lipsă rămâne necompletată în fișă și trebuie selectată înainte de salvare; nu este presupusă la editarea unui client existent.
- Identitatea fiscală folosește **`client_legal_profiles`**, citită deja de generatorul Document Center; nu există un registru fiscal separat.
- Conturile folosesc **`users`, `profiles`, `user_roles`, `client_account_access`**, aceeași funcție de provisionare cu API-ul existent `/api/admin/users` și același hash scrypt. Nicio parolă în clar nu este salvată sau inclusă în audit.
- Contul nou are `must_change_password=1`. Interfața existentă afișează schimbarea obligatorie, iar API-ul refuză accesul privat cu HTTP 428 până la schimbare. Schimbarea parolei revocă sesiunile, apoi clientul se autentifică din nou.
- Asocierile către conturi existente sunt confirmate explicit. Nu se modifică parola, emailul de login sau profilul fiscal personal al utilizatorului când se editează datele comerciale ale unui client.
- Proiectele noi sunt create prin API-ul nativ `/api/projects`, acum cu cheie de idempotență opțională. Un client poate avea mai multe proiecte. Organizația se preia din maparea existentă.
- Realocarea între beneficiari este permisă doar pentru proiecte neatribuite unui proprietar/unei organizații, fără echipă sau istoric detectat în sursele verificate. Proiectele cu servicii, fișiere, activitate, documente ori înregistrări financiare sunt blocate. Nu sunt transferate în tăcere facturi, abonamente, accesuri sau istoric.
- Abonamentele reutilizează panoul și API-ul operațional existente, filtrate server-side după client. Beneficiarul este fixat și datele fiscale sunt precompletate, apoi verificate de operator. Calendarul și ciornele financiare existente nu reprezintă o plată automată sau o emitere fiscală.
- Proiectele și abonamentele din portal se recitesc la revenirea în fereastră, la evenimentele locale relevante și la fiecare 30 secunde cât pagina este vizibilă. Accesul este verificat în backend la fiecare cerere.
- **Documentele clientului** deschide Document Center în fișă, cu căutare, stări, versiuni și funcțiile native permise. Există filtrare pe proiect și deschidere contextuală din abonament. Filtrele străine din URL sunt ignorate, beneficiarul generatorului este fixat, iar revenirea din document rămâne în panou. Fișierele, versiunile, exporturile și asocierile sunt cele centrale; nu sunt copiate în CRM.

## API și permisiuni

`/api/admin/operations/clients`:

| Operațiune | Metodă și cale | Acces |
| --- | --- | --- |
| Registru / creare | GET / POST | `clients.read` / `clients.write` |
| Opțiuni conturi | GET `/options` | Conturile eligibile sunt oferite numai principalilor platformei |
| Fișă / profil | GET / PATCH `/:id` | `clients.read` / `clients.write`; profil cu revizie obligatorie |
| Provisionare cont | POST `/:id/accounts` | Owner / Super Admin și confirmare explicită |
| Asociere / revocare | PUT `/:id/accounts` | Owner / Super Admin; lista anterioară obligatorie și confirmare |
| Alocări proiecte | PUT `/:id/projects` | Owner / Super Admin; sursa și timestampul anterior, confirmare |

Toate operațiunile necesită rol nativ staff/admin. Simpla etichetă `admin` nu acordă statut de principal. Scrierile respectă politica MFA existentă: MFA verificat când este activat; excepția explicită de rollout existentă rămâne posibilă, configurația absentă refuză scrierea. Conturile client nu pot apela aceste API-uri. Accesul financiar necesită `finance.read` sau principal autorizat. Gestionarea conturilor și a asocierilor rămâne separată de editarea profilului.

Scrierile au cheie de idempotență, tranzacții D1, verificări de revizie/context și audit. Eligibilitatea contului asociat și contextul proiectului sunt reverificate în tranzacție. Limite: corp 64 KiB, 80 scrieri/oră/utilizator, 480 citiri/oră/utilizator, pagini de 50 clienți; listele din fișă sunt limitate. Răspunsurile CRM folosesc `Cache-Control: private, no-store`.

API-ul existent `/api/admin/client-subscriptions?client=<id>` restrânge abonamentele, beneficiarii, conturile și proiectele. Abonamentele globale ale procesatorului sunt excluse din acest răspuns contextual. O alocare cu beneficiar diferit față de query este refuzată inclusiv înainte de replay-ul unei cereri.

## Migrarea 0084

Migrare aditivă `0084_client_workspace.sql`:

- `clients.notes`, `clients.revision`, `clients.updated_at`, `clients.access_managed`;
- index pentru identificarea fiscală, registrul recent și cele șapte surse de istoric care nu aveau index pe proiect;
- triggere pentru revizie când profilul comercial sau fiscal se schimbă și din alte fluxuri existente.

Nu șterge/recreează clienți, proiecte, utilizatori, abonamente sau date financiare. Aplică migrarea înainte de noul Worker; nu reveni distructiv asupra coloanelor dacă este nevoie de rollback al codului. Se reutilizează D1 și infrastructura Cloudflare existente, fără binding nou, furnizor nou sau serviciu plătit activat.

`access_managed=1` oprește reasocierea automată pe baza emailului pentru clienții gestionați explicit. Fișele create, editate ori administrate prin acest flux sunt marcate explicit; endpointul nativ de înlocuire a accesurilor marchează și clienții de la care retrage accesul. Granturile curente sunt păstrate la schimbarea modului. Clienții legacy neadministrați explicit rămân în comportamentul de reconciliere anterior (`0`), pentru compatibilitate. Revocarea unei asocieri nu retrage alte granturi independente, precum proprietatea unui proiect sau apartenența la organizație.

## Date financiare și limite

Plățile provin din `financial_revenues`/`financial_receipts` și din registrul inițial `invoices`/`payments`, exclusiv pe `client_id`. Monedele și sursele rămân distincte. Sunt consultate maximum 100 facturi și încasări per sursă; contoarele financiare descriu înregistrările afișate, nu întregul istoric nelimitat. Ciornele, anulările și rambursările nu sunt numărate ca facturi de achitat.

Comenzile/coșurile vechi sunt legate doar de utilizator, fără beneficiar juridic explicit. Sunt atribuite în această fișă numai dacă acel cont reprezintă un singur client; pentru un cont cu mai multe firme nu se ghicește beneficiarul. Panoul nu sincronizează plăți cu furnizori, nu emite facturi și nu încasează automat.

Notificarea acordării accesului folosește `operation_notifications`, cu deduplicare. Nu sunt trimise emailuri sau mesaje externe de test. Parola temporară se comunică separat printr-un canal autorizat.

## Verificare și lansare

Testele noi sunt în `src/test/client-workspace.test.ts` (Hono real cu SQLite și toate migrațiile) și `e2e/client-workspace.spec.ts` (browser cu răspunsuri sintetice). Acoperă crearea PF/PJ/PFA/ONG, conturi native, hash, idempotență, rollback, accesuri, MFA, concurență, revocare, clienți separați, proiecte multiple, abonamente, date financiare, căutare, erori, mini-dashboard documente și ecrane de 320/390/1440 px.

Un Worker local complet cu D1/KV/R2 izolate a verificat login real în conturi sintetice, schimbarea obligatorie, revocarea sesiunilor, două proiecte și un abonament în portalul corect, apoi revocarea accesului fără reapariție prin reconciliere email. Aceasta nu este o verificare într-un cont real de producție. Utilizatorul a păstrat testul final în contul său pentru mai târziu.

Înainte de lansarea întregului lot: review al ramurii și integrarea controlată cu ultimul `main`, backupul existent, migrațiile lipsă în ordine, verificarea integrității, Worker/Pages, apoi verificarea live în rolurile autorizate. Nu folosi `scripts/release-api.mjs` ca simplu test local: produce efecte remote.

### Rezultate locale finale

- Suita Vitest completă: **86 fișiere, 717 teste reușite**, un benchmark opțional omis (`AVYRON_BENCH_PUBLIC_LIMITS` neactivat). Fixture-ul vechi de aprobări folosește acum un timestamp nou la fiecare test, pentru ca durata suitei să nu expire artificial aprobările cazurilor ulterioare.
- Regresie browser: **99 teste reușite** pentru Clienți, Document Center, Abonamente, Staff/Chat, Social/AVY Core, Leaduri/Servicii, dashboard și portal. După ultimele ajustări ale formularului și SDK-ului, cele **10 teste Clienți** au fost rulate din nou cu succes.
- Schema curentă: **82 fișiere de migrare** aplicate într-o bază SQLite nouă, `integrity_check=ok`, zero erori de chei străine. Planurile de interogare confirmă utilizarea celor șapte indexuri pentru verificarea istoricului proiectelor.
- Typecheck aplicație și Worker: reușit. ESLint: zero erori; patru avertismente Fast Refresh existente în module Logo, fără avertismente noi în fișierele taskului.
- Build static (inclus în buildul Pages), Pages, standalone Worker și API `--dry-run`: reușite. Audit SEO: 77 pagini indexabile, 212 pagini publice noindex și 11 URL-uri strategice de produs, fără schimbarea designului public.
- Worker local cu login real în conturi sintetice: șase verificări ale fluxului client reușite și regresie reușită pentru crearea unui membru staff cu rang. Nicio trimitere externă, încasare, emitere fiscală, activare de furnizor sau operațiune remote.
- Capturile desktop/mobil și verificarea axe a fișei au fost inspectate local; testele generează capturile în `test-results/`. Dispozitivele fizice și sesiunea reală de producție nu au fost folosite pentru acceptanță.
