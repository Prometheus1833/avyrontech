# Membrii Agenției AVYRON și chat intern

Implementare locală la 5 noiembrie 2026. Bază: `27a66a3`; ramură `codex/internal-chat-staff-access-2026-11-05`. Push, PR, merge, migrare remote și deploy sunt amânate la cererea utilizatorului. Conturile din producție nu au fost modificate.

## Arhitectură și compatibilitate

Autentificarea, crearea conturilor, schimbarea parolei temporare, MFA și sesiunile rămân în sistemul AVYRON existent. Rolurile de bază sunt tot `user`, `staff`, `admin`. Rangurile adaugă o configurație explicită peste `user_capabilities`, `platform_principals`, `project_staff`, `subscription_staff`, `client_account_access` și `ai_project_members` existente. Nu se creează alt CRM, alte abonamente sau un furnizor nou.

Migrarea aditivă **0083_staff_ranks_and_chat.sql** introduce:

- `staff_rank_profiles`: cele șapte profiluri inițiale, versionate;
- `staff_rank_assignments`: rangul alocat, fotografia drepturilor verificate, expirare și revizie;
- `staff_chat_reads`: poziția proprie de citire pe conversație;
- indexuri pentru membri și istoricul mesajelor directe/canalelor.

Migrarea nu reclasifică automat conturile existente. Membrii vechi fără rang își păstrează accesul anterior până la o alocare explicită. Interfața cere alegerea unui profil înainte de prima salvare a unui membru vechi; nu îl transformă implicit în client.

Conturile cu rang folosesc o verificare suplimentară a fiecărei cereri private, apoi politica resursei. Drepturile din fotografia alocării sunt intersectate cu granturile globale active din `user_capabilities`; revocarea sau expirarea unui grant produce efect imediat, inclusiv pe URL direct. Granturile independente și cele pe organizație nu sunt șterse de administrarea rangurilor.

## Ierarhie și profiluri inițiale

| Rang | Arie inițială |
| --- | --- |
| Owner Platform | Acces operațional complet și controlul atribuirii rangurilor platformei |
| Super Admin | Acces operațional complet, inclusiv Documente SC și backupurile firmei |
| UltimateDev | Toate proiectele, dezvoltare, proiecte noi, configurări servicii, mentenanță, documente de lucru și suport |
| AvyConsultant | CRM, leaduri, marketing, proiectele AI/Social alocate, aprobare editorială, documente comerciale și proiectele autorizate |
| SeniorDev | Toate proiectele, proiecte noi, dezvoltare și intervenții de mentenanță autorizate |
| VibeDev | Proiectele și mentenanța alocate; documente de lucru |
| AvyContabil | Registru financiar, operațiuni financiare, conturi mascate, documente financiare și audit |

Există **46 de permisiuni operaționale înregistrate**. Citirea, editarea, crearea proiectelor, extinderea la toate proiectele, mentenanța, financiarul, marketingul, aprobarea și distribuirea sunt separate. Contabilul nu primește implicit setări financiare sau aprobări de buget. Nu există un comutator care să pretindă publicare socială automată fără un flux și un conector implementate.

Drepturile profilurilor specializate se pot modifica pentru alocările viitoare. Membrii existenți nu primesc automat modificările; în fișa fiecăruia se poate relua explicit configurația profilului, apoi verifica și salva. Profilurile Owner/Super sunt fixe în acest flux. Numai Owner poate atribui rangurile platformei sau modifica un Super Admin. Super Admin nu poate dezactiva, reseta parola, revoca sesiunile ori schimba rangul unui Owner, inclusiv când contul Owner este dezactivat. Propriul rang și retrogradarea identității Owner sunt protejate. Contul operațional Codex rămâne în fluxul său dedicat.

### Politica Documente SC

**Decizia explicită a utilizatorului din 5 noiembrie înlocuiește regula anterioară de delegare separată:** orice principal Super Admin activ și verificat are acces la Documente SC și backupurile firmei, alături de Owner. Admin/Staff/Client nu primesc această zonă nici prin simpla etichetă administrativă, nici printr-un grant `documents.company.owner` introdus izolat. Contul, rolul și principalul sunt revalidate în D1. Politica MFA existentă, autorizarea pe versiune și izolarea R2 rămân aplicabile.

## Ecrane și operațiuni

- `/profil?tab=team-staff`: **Membrii Agenției AVYRON**; ranguri cu filtre, căutare, membri existenți și creare de cont.
- Dialogul de gestionare: rang/drepturi, proiecte și mentenanță, proiecte AI/Social, beneficiari și securitatea contului.
- Crearea conturilor folosește `/api/admin/users`, cu parolă temporară și schimbare obligatorie la prima autentificare.
- `/api/staff-access`: configurație și director. Membrii obișnuiți văd nume/ranguri, fără e-mailurile și alocările private ale colegilor.
- `/api/staff-access/:userId`: accesurile reale și salvarea atomică.
- `/api/staff-access/profiles/:rankId`: actualizarea versionată a drepturilor inițiale.

Administrarea cere un principal activ, politica MFA existentă satisfăcută, confirmare explicită și motiv. Salvarea folosește idempotency și controlul reviziei, actualizează rolurile/granturile/alocările în aceeași tranzacție și revocă sesiunile anterioare. Crearea concurentă a aceluiași cont cu aceeași cheie întoarce același rezultat; parolele nu apar în răspuns, audit sau cheile de retry.

Configurația urmărită în repository păstrează `MFA_AUTH_ENABLED=false`; această etapă nu activează MFA global. Folosim același `privilegedMfaSatisfied` ca restul platformei: sesiunea verificată sau excepția de rollout autorizată explicit de configurare. Configurația necunoscută este refuzată implicit. Când politica cere MFA, salvarea este blocată până la verificare. Când permite excepția, interfața o spune explicit, iar auditul păstrează `mfaVerified=false`; nu o prezintă drept autentificare în doi pași. Crearea de conturi, profilurile, alocările și acțiunile de securitate folosesc aceeași politică. Activarea globală se tratează separat la release, fără a presupune starea secretelor/providerului din simpla configurație locală.

Alocările sunt validate contra entităților existente. Legăturile de proprietar în proiecte și proiectele AI sunt păstrate; acest flux nu transferă proprietatea. Acordarea accesului la CRM nu permite reasocierea conturilor sau proiectelor altor beneficiari. Selectarea beneficiarului pentru un proiect nou poate afișa opțiuni minimale fără a acorda întregul CRM.

Directorul și selectoarele sunt limitate la 500 de înregistrări, proiectele AI la 250, alocările la 250 pe categorie. Pentru organizații peste aceste limite este necesară paginare înainte de extinderea utilizării. Nu sunt promise liste nelimitate.

## Chat intern

`/profil?tab=intern` păstrează mesajele și canalele existente. Pe desktop sunt două panouri; pe mobil lista deschide conversația și oferă întoarcere. Aspectul folosește culorile AVYRON, avataruri, bule și date lizibile, fără copierea identității WhatsApp.

Funcții: căutare de colegi fără diacritice, previzualizări autorizate, mesaje necitite pentru utilizatorul curent, ciorne separate în memorie, Enter/Shift+Enter, emoji, încărcare a istoricului prin cursor, căutare în mesajele încărcate și păstrarea ciornei la eroare. Retry-ul păstrează cheia operațiunii; un răspuns întârziat dintr-o conversație nu șterge textul din alta. Textul mesajelor este randat ca text, fără HTML importat.

Rutele `/api/workspace/chat`, `/chat/conversations`, `/chat/read` verifică participantul și conversația. Read cursor este privat și nu pretinde că destinatarul a citit un mesaj. Bifa proprie indică salvarea pe server; nu sunt afișate prezență online sau confirmări de livrare fictive. Nu sunt introduse atașamente de chat sau integrare WhatsApp.

Actualizare la 15 secunde pentru conversația selectată și 30 pentru previzualizări, oprită când pagina nu este vizibilă. Nu este un sistem WebSocket. Istoricul vine în pagini de 50; drafturile sunt private în memoria paginii și nu supraviețuiesc închiderii ei. Mesajele salvate persistă în D1 și după reload. Răspunsurile private rămân `private, no-store`.

## Migrare, backup și release

0083 trebuie aplicată după migrațiile existente și **înaintea API-ului nou**. Codul autentificat consultă noile tabele; publicarea fără migrare este incompatibilă. La release: verificare revizie/main, backup D1, migrare, integritate, API/frontend aliniate, test cu două ranguri și doi beneficiari. Nu se aplică migrare inversă distructivă; rollbackul de cod păstrează tabelele.

Rangurile, granturile, alocările și mesajele intră în backupul D1 existent. Nu apar fișiere sau copii R2 noi pentru chat/ranguri. Backupurile Document Center păstrează separarea corporativă existentă; acordarea accesului unui Super Admin nu pornește automat joburi de backup sau servicii plătite. Schema nu reprezintă o copie remote a datelor. Niciun serviciu nou nu a fost activat în această etapă.

## Verificări

| Verificare | Rezultat |
| --- | --- |
| Typecheck aplicație și API Worker | Trecut |
| ESLint întreg repository | 0 erori; 4 avertismente React Refresh existente în componentele logo |
| Build static și Cloudflare Pages | Trecut; audit SEO trecut |
| Build Worker standalone | Trecut; audit SEO trecut |
| API și verificare bindings | Trecut; Wrangler `--dry-run`, fără deploy |
| Schema D1 prin toate migrațiile până la 0083 | `integrity_check=ok`; 251 de tabele; fără încălcări FK |
| Vitest | **694 trecute, 1 omis**, în 85 de fișiere |
| Browser Chromium, șapte suite de regresie | **84/84 trecute**, dintre care 13 scenarii noi pentru chat/ranguri |
| Accesibilitate automată | Fără încălcări WCAG 2 A/AA și 2.1 AA în chat, echipă și dialogul testat |
| Worker + D1 + R2 locale, autentificare reală | Cele șapte ranguri create prin API-ul existent; retry concurent, parolă obligatorie, TOTP, izolare, mesaje și revocarea sesiunilor trecute |
| Integritate fixture locală | 0 erori FK; `quick_check=ok` pe tabelele noi, capabilități și alocări; 0 sesiuni QA active; factorii QA revocați |

Suita completă a trecut în 85 de fișiere; după limitarea metadatelor directorului pentru membrii fără drept de administrare au fost reluate și trecute toate cele 20 de teste ale modulului, iar API-ul a fost reconstruit în dry-run.

Cele 20 scenarii noi de backend includ capabilități revocate pe URL direct, expirare, CAS/idempotency, protecția Owner și a contului operațional, profiluri de rang, alocări, mentenanță numai pentru citire, configurare delegată, aprobare editorială separată de generare și izolarea mesajelor. Document Center are suplimentar un test de backup/restaurare SC pentru Super Admin, cu izolarea destinației și refuz pentru Staff. Accesul Super Admin la evidența backupurilor SC a fost verificat și prin Worker-ul local cu MFA.

Singurul test omis este benchmarkul opțional de limite publice din `public-abuse-limits.test.ts`, activ numai cu `AVYRON_BENCH_PUBLIC_LIMITS=1`; nu reprezintă un test funcțional eșuat. Testul de publicare a paginii de serviciu a primit o așteptare de 15 secunde pentru aplicarea asincronă a valorilor peste HTML-ul prerandat; rularea finală de browser este integral verde. Același principiu de așteptare a stării autentificate se aplică meniului public, unde inițializarea sesiunii este amânată intenționat.

Capturile sintetice inspectate se află în `/tmp/avyron-staff-chat-qa/`: chat desktop, 320/390 px, membri desktop și dialog mobil. Regresia navigării acoperă 320×568, 390×844, 768×1024, 1024×768, 1440×900 și 844×390 în cele două teme și limbi. Acestea sunt verificări în Chromium cu viewporturi emulate; nu sunt teste pe dispozitive fizice Android/iOS sau Safari.

Testul final în contul real rămâne la utilizator, conform instrucțiunii sale. Verificările de aici nu dovedesc publicarea sau migrarea în producție.

Verificare suplimentară de compatibilitate: Worker-ul local cu `MFA_AUTH_ENABLED=false` a permis crearea confirmată și auditată a unui membru prin autentificarea existentă, cu aceeași identitate la retry. API-ul a raportat separat `mfaSatisfied=true` și `mfaVerified=false`. Acest test nu a schimbat configurația globală sau serviciile de producție.

Verificarea vizuală a identificat și corectat dimensionarea rândului grid pe desktop: o listă lungă de colegi nu mai împinge editorul în afara panoului. Regresia dedicată verifică poziția și accesibilitatea efectivă a câmpului cu 40 de colegi la 1280×720, 1440×900 și 768×1024.
