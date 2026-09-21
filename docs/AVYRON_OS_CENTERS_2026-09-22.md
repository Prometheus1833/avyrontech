# AVYRON OS — centre operaționale, 22 septembrie 2026

Ramură: `codex/os-complete-centers-2026-09-21`, pornită din `f86b4c9` (PR #10).
Această extensie este locală. Publicarea precedentă nu publică automat acest cod.

## Navigare și sursa datelor

`/profil?tab=os-centers&center=<id>` deschide direct fiecare centru. Catalogul vine
 din API, după verificarea rolului live; interfața nu decide privilegiile.
Centrul de comandă ⌘K / Ctrl+K caută modulele autorizate și deschide formularul
pentru un lead nou. Comenzile nu execută implicit operații financiare sau externe.

| Cerință | Implementare și limită explicită |
| --- | --- |
| Team / Staff | Rolul global și asocierile client existente, plus denumirea funcției, profil General / Sales / Developer / Marketing / Finance / Support, permisiuni citire/modificare per centru, revizie și audit. Numai Super Admin gestionează privilegiile. |
| Dashboarduri pe roluri | Navigație profesională și catalog de centre autorizate; clienții păstrează portalul propriu. Regulile existente de tenant/proiect rămân autoritatea pentru proiecte. Profilul profesional nu acordă acces la controlul financiar global sau la AI OS. |
| Needs Attention / Azi | Agregă leaduri fără răspuns, facturi reale `financial_revenues`, suport, proiecte, termene, abonamente, contracte, domenii/SSL, SLA, incidente și constatări WCAG înregistrate. Sortare critic înainte de atenție; link direct la sursă. |
| Approval Center | Lista propunerilor și intenția completă, Approve / Edit / Reject. Editarea schimbă atât intenția aprobării, cât și intrarea pasului AI, invalidează revizia anterioară și cere o nouă decizie. Nu transformă un conector inactiv într-un executor. |
| Agent Runs | Rulări reale, agent, stare, timestampuri, tokenuri, cost estimat, erori, pași și rezultate înregistrate. Nicio scanare sau contact fictiv. |
| Client Profitability | Venit facturat, cheltuieli directe/alocate și marjă documentată separat per monedă; contracte aprobate, servicii, registru de minute/cost orar, upsell și risc evaluat manual. Lipsa costului păstrează marja necunoscută. Costul muncii estimat în RON este separat pentru a evita dubla contabilizare. |
| Infrastructure Health | Probe HTTP fixe pentru site/app/API și citiri prin bindinguri D1/R2/KV; rezultatele sunt persistate. Auth și Worker confirmate de cererea autentificată. După o oră proba este veche. AI, survey, labs, logs, Pages, email rămân neverificate până la probe dedicate; existența unei configurări nu înseamnă verde. |
| Security Center | Evenimente reale de acces refuzat/eșuat și constatări înregistrate pentru incidente, auth, chei, SSL, WCAG. Nu pretinde că importă WAF/Logpush sau rulează un scanner WCAG. |
| Automation Center | Motorul D1 existent: programare, execuție, retry, anulare, istoric și următoarea rulare. Estimarea economiei = minute declarate per execuție × execuții reușite; nu este timp măsurat. |
| Integrations Health | Conturile Cloudflare/GitHub/Stripe/Revolut folosesc adaptoarele existente de verificare/sincronizare. Celelalte servicii au limite explicite; Supabase rămâne legacy, OS folosește Cloudflare. |
| Domains & Digital Assets | Registru persistent cu domeniu, client/proiect, expirare, SSL, DNS, redirecturi, evaluare estimată și oportunități. Verificarea registrar/DNS și cumpărarea nu sunt activate de salvarea unei înregistrări. |
| Contracts & Renewals | Refolosește registrul canonic, aprobarea pe versiune și termenele; semnarea/facturarea externă nu este simulată. |
| Knowledge / Documents | Căutare textuală în documente, knowledge AI și metadate fișiere AVY Engine; fragmente și termene de revizuire. Gestionarea/uploadul rămân în AVY Engine. Nu este căutare semantică nouă și nu consumă model. |
| AVY Briefing | Sinteză deterministă de maximum patru priorități, setări personale de afișare, fereastră 1–30 zile și includerea financiarului când rolul permite. Programarea notificărilor folosește automatizările existente. |
| SLA & Deadlines | Registru tipizat de răspuns/livrare/suport/WCAG/incidente, termen și avertizare în ore; intră în prioritățile dashboardului. |
| Change Requests | Registrul canonic de modificări, valori și aprobare pe revizie. |
| Deliverables | Datele existente din `project_work_items`, creare și schimbare de stare, cu autorizare la proiect. |
| Onboarding / Offboarding | Același strat de work items; checklisturi standard idempotente, create atomic, plus urmărire manuală. Bifarea unui export sau transfer nu execută acel export/transfer. |
| Asset Vault | Inventar de brand/documente/domenii/credențiale. Secretele sunt criptate AES-GCM în KV cu referință în D1; introducere/rotație și dezvăluire auditată, cu motiv. UI ascunde din nou valoarea după 30 secunde. Numai Super Admin. |
| Error Center | Erori persistate de agenți, automatizări, email, integrări și API. Erorile API neinterceptate sunt înregistrate ca evenimente fără corpul cererii sau secrete. |
| Backup & Recovery | Registru de dovezi/bookmarkuri, ultima copie verificată, teste de restaurare și cerere de recuperare cu motiv. Nu execută restaurări D1/R2 din interfață și nu inventează copii automate. |
| Privacy & Consent | Refolosește registrul de cereri GDPR, plus jurnal append-only al consimțământului newsletter. Exportul/ștergerea DSAR și colectarea globală a cookie-consent în D1 necesită flux separat. `avyron-cookie-consent-v2` rămâne neschimbat. |
| Legal / Compliance | Registrul canonic cu responsabil, termene și concluzii; integrat în priorități. |
| Experiments | Ipoteze/perioade/concluzii în registrul canonic. Nu distribuie trafic A/B și nu inventează rezultate. |
| Comentarii | API pentru depunere autentificată (blog), stare inițială pending, limitare rată, moderare centralizată pe revizie. UI publică de comentarii rămâne pentru etapa în care se activează comentariile pe pagini. |
| Pluginuri | Registrul AVY Engine filtrat pentru plugin/MCP/integrare/skill/tool, cu risc, stare, cerințe și ultima verificare. Fără instalare automată sau execuție arbitrară. |
| Vizite | Rapoarte D1 pe 7/30/90 zile, pagini/zile, sesiuni, vizualizări, CTA și conversii lead. Date limitate la analytics colectat cu consimțământ; sesiune nu înseamnă persoană. |
| Abonați | Registru newsletter cu email unic, sursă, dovadă și versiune politică; pending/subscribed/unsubscribed, istoric de consimțământ. Activarea subscribed cere dovadă. Nu trimite campanii. |
| Programări | Refolosește calendarul persistent și protecția atomică împotriva suprapunerilor existentă. |

## Securitate și implementare

- Migrația nouă `0025_os_centers.sql` este append-only. Migrațiile deja publicate
  nu sunt rescrise. Noua versiune necesită schema 0025 înainte de deploy.
- Scrierile registrelor/checklisturilor/privilegiilor/consimțămintelor au audit,
  validare strictă, idempotency și tranzacții D1. Editările resping reviziile vechi.
- Centrele privilegiate nu pot fi acordate prin profilul profesional.
- Conținutul comentariilor se redă ca text React, nu HTML executabil.
- Datele sensibile și răspunsurile API au `private, no-store`; secretul nu apare
  în listări sau idempotency responses, iar referința KV nu este returnată.
- Seiful folosește cheia Worker existentă, cu derivarea și authenticated data
  ale implementării validate. Rotirea cheii de bază cere recriptarea secretelor.
- Politica MFA existentă rămâne neschimbată.
- Profilurile profesionale personalizează navigația veche; nu rescriu autorizațiile
  existente ale fiecărui API legacy. Permisiunile centrelor noi sunt aplicate server-side.

## Validare

- Typecheck aplicație și Worker: trecut; ESLint: fără erori sau avertismente.
- Suita unit/runtime: 241/241 teste trecute. După ajustările finale, 59/59 teste
  runtime relevante au trecut, apoi toate cele 15 teste noi au fost reverificate.
- Suita Playwright completă: 60/60 teste trecute. Reverificarea dashboardului
  și centrelor: 17/17; după ajustarea afișării sumelor în lei, 5/5 teste ale
  centrelor au trecut din nou, inclusiv conversia 123,45 RON → 12345 bani.
- Cele 27 de centre și formularele registrelor au fost verificate la lățimi de
  390 și 1440 px, fără depășire orizontală; capturi inspectate vizual.
- Audit SQLite: 129 tabele de aplicație, integritate și chei externe valide.
  Wrangler a aplicat local toate migrațiile 0001–0025 într-o bază izolată.
- Build static cu prerender SEO, Pages și Worker: trecute; dry-run API și email:
  trecute. Buildul Pages a fost repetat după ultima modificare de interfață.
- `git diff --check`: trecut.

Testele browser folosesc fixtures; probele furnizorilor nu sunt activate pe
conturi reale. Această extensie este validată local și nu a fost publicată în
producție. Migrația 0025 nu a fost aplicată bazei de producție.
