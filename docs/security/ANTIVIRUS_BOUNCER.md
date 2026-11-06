# Antivirus AVYRON — Bouncer Free

Stare la 06.11.2026: implementare locală, de la `1397ce3`, pe `codex/bouncer-antivirus-2026-11-06`. Nu s-au făcut push, merge, deploy sau migrare remote. PR [#69](https://github.com/Prometheus1833/avyrontech/pull/69) este încă draft; versiunea auditată este `879f2fda4dd5a4a67ad25917718425b24c261291`, cu un binding generic `MALWARE_SCANNER` neconfigurat. Această implementare îl înlocuiește logic, fără a prelua peste codul actual fișierele vechi/conflictuale ale PR-ului.

**Nu este activă protecția nouă în producție. Nu există încă un test cu un verdict real Bouncer.** Nu s-a găsit `BOUNCER_API_KEY` în inventarul numelor de secrete al Workerului de producție. Cheia, contul Free și documentele contractuale trebuie furnizate/verificate înainte de acceptanța reală. Datele clienților nu au fost trimise la Bouncer.

## Furnizor și conformitate

Furnizor unic: **Bouncer Malware Scanning API, `usebouncer.dev`**, API `https://api.usebouncer.dev`. Nu este serviciul de verificare e-mail de la `usebouncer.com`; documentele acestuia nu pot fi folosite pentru scanarea malware.

Verificare a surselor publice la 06.11.2026:

- Documentația și termenii indică Free: 500 scanări/lună, resetare la 1, UTC, maximum 25 MB/fișier. Codul aplică limita conservatoare de **25.000.000 bytes**, iar limitele mai mici ale modulelor se păstrează.
- V1 are o limită efectivă de aproximativ 4,5 MB. Integrarea folosește **v2 pentru toate fișierele**, inclusiv cele mici: creare scanare → upload multipart către destinația temporară Bouncer/AWS → citire rezultat. Crearea țintei consumă o scanare chiar dacă uploadul nu ajunge la final.
- Politica declară AWS **ap-south-1, Mumbai, India**, fișiere șterse în maximum 24 h și metadate păstrate cât timp contul este activ. Nu am identificat în paginile publice un DPA aplicabil ori documentele de transfer pentru datele AVYRON. Aceasta este o verificare incompletă, nu o concluzie că orice prelucrare în India este interzisă.
- Pentru date personale/confidențiale trebuie verificat contractul de prelucrare conform art. 28, inclusiv autorizarea subcontractării când AVYRON este persoană împuternicită, și mecanismul/evaluarea transferului aplicabil. Un acord SCC corespunzător poate include și cerințele art. 28; nu este obligatoriu să existe documente separate cu anumite titluri. Referințele din configurație indică dovezi verificate de un specialist, nu o verificare juridică automată.
- Termenii restricționează revânzarea/redistribuirea serviciului fără permisiune. Integrarea este control intern al uploadurilor AVYRON, fără un API public de scanare oferit altora; utilizarea contractuală aplicabilă trebuie totuși verificată înainte de activare.

În starea actuală toate uploadurile reale sunt tratate conservator ca potențial sensibile și blocate înainte de transferul către Bouncer. Numai mostrele fixe generate de server, în secțiunea Teste, sunt exceptate de la poarta pentru conținut confidențial. Nu se poate reclasifica un document real drept „sintetic” printr-un parametru de upload.

Surse primare:

- [API și limite Bouncer](https://usebouncer.dev/docs/)
- [Termenii Bouncer](https://usebouncer.dev/terms/)
- [Confidențialitate și localizarea procesării](https://usebouncer.dev/privacy/)
- [Comisia Europeană: aplicarea GDPR și procesatori](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en)
- [Comisia Europeană: întrebări despre SCC, inclusiv art. 28 și evaluarea transferului](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en)

## Arhitectură

Se reutilizează Workerul API, autentificarea, principalii Owner/Super Admin, politica MFA, D1, bucketurile private `FILES` și `MEDIA` și programarea existentă. Nu există ClamAV instalat de AVYRON, Oracle, VM, server nou, bucket nou, furnizor alternativ sau serviciu plătit activat. Destinația AWS temporară este parte din API-ul Bouncer, nu o infrastructură administrată de AVYRON.

Migrarea aditivă **0089** adaugă:

- `malware_scan_jobs`: conținut identificat prin SHA-256, context deduplicat, stare, ID furnizor, carantină și încercări;
- `malware_monthly_usage`: rezervări conservatoare și utilizare reală observată, cu limite CHECK;
- `malware_storage_budget`: plafon al stocării suplimentare în carantină;
- `malware_object_verdicts`: legătura dintre un obiect și verdictul său, etag și versiunea R2 exactă;
- `malware_audit_events`: jurnal de operațiuni fără bytes, nume originale, chei API sau ținte de upload;
- `malware_inventory_cursors`: progresul inventarierii metadatelor R2.

Flux: validarea și autorizarea native → verificarea conformității și configurării → SHA-256/context → carantină privată R2 → cote → rezervare D1 atomică → Bouncer v2 → verdict → înregistrare în modulul nativ și legarea versiunii R2. Copia temporară este eliminată după înregistrarea originalului. Un import nu primește acces doar pentru că este PDF, imagine sau are MIME corect.

Un verdict încă în așteptare returnează o eroare recuperabilă și ID-ul scanării, fără înregistrarea unui fișier utilizabil în modulul respectiv. După CLEAN, încărcarea se reia cu aceiași bytes și același context; deduplicarea reutilizează verdictul fără altă scanare. Cronul finalizează numai verificarea, nu creează în fundal documente sau asocieri în numele utilizatorului.

Stări: carantină, transmitere, în scanare, CLEAN, malware, suspect, eroare, transmitere incertă, eliminare în curs, carantină eliminată. Fără verdict CLEAN nu există descărcare, previzualizare ori trimitere ca atașament. Nu există buton „marchează manual CLEAN”.

Se verifică ID-ul exact al scanării, hashul și dimensiunea rezultatului. Verdictul CLEAN cu amenințări, motoare nefinalizate/necunoscute ori metadate contradictorii este respins. Rezultatele neacoperite de contractul documentat sunt blocate până la clarificare, fără presupuneri optimiste.

Destinația API este fixă. Țintele v2 sunt limitate la gazdele Bouncer/AWS permise, HTTPS, fără redirecturi. Câmpurile semnate sunt folosite numai în memorie, o singură dată, fără persistare, cache sau log. Cheia API nu este transmisă către S3. Răspunsurile JSON au limită de 64 KiB și cererile au timeout.

## Integrarea modulelor

| Modul | Tratament |
| --- | --- |
| Document Center | Importuri reale blocate fără conformitate/configurare; import CLEAN separat de fișierele generate; verificare centrală la download; imagini în editor numai cu hash verificat. |
| Media / resurse vizuale | CLEAN înainte de acces; excepția `inspect=1` eliminată; UI nu oferă descărcare pentru fișiere în carantină. Restaurarea invalidează verdictul versiunii R2 și cere verificare nouă. |
| Fișiere proiect | Scanare înainte de înregistrare; autorizarea proiectului se păstrează; range/HEAD/ETag nu ocolesc verificarea. |
| Smart Surveys | Cota/contextul nativ se rezervă înainte de scanare; la blocare se eliberează rândul rezervat; downloadul cere CLEAN. |
| Financiar | Autorizare și verificarea resursei native, scanare, stocare și citire controlată. |
| AVY Engine | Documentele sunt verificate înainte de stocare și de utilizarea conținutului; citirea cere versiune verificată. |
| Blog | Coperte scanate; nu există acces public la imagini R2 neverificate și nici ocolire prin cache-ul API anterior. |
| Avatar | Verificare de semnătură, scanare și legarea versiunii curente; vechile URL-uri sunt rotite. |
| Contact | Toate atașamentele trebuie să fie CLEAN înainte de persistența/trimiterea mesajului cu fișiere; formularele fără atașamente continuă nativ. |
| Produse digitale | Descărcarea pachetelor R2 cere verdict; pachetele istorice nu sunt presupuse curate. Peste 25 MB nu sunt eligibile pentru Free. |

Fișierele generate de server (PDF/DOCX, manifeste și backupuri native) nu sunt uploaduri ale utilizatorului și păstrează fluxul lor separat de integritate/autorizare. Importurile restaurate revin în carantină. Backupul intern poate păstra o copie privată a unui original neverificat fără a-i acorda acces utilizatorului.

URL-urile externe doar afișate în pagini (de exemplu imagini publice introduse ca URL în carusele) nu sunt uploaduri procesate de acest API și nu sunt declarate scanate. Nu se descarcă arbitrar URL-uri externe pentru a consuma cota.

## Reguli Free și performanță

- 500 rezervări maximum/lună UTC, în aceeași bază, inclusiv la schimbarea cheii API; fără conturi multiple pentru ocolirea limitei.
- Verificare live a planului și utilizării înainte de fiecare scanare nouă. Orice plan diferit de Free, răspuns nevalid sau indisponibilitate oprește scanările noi.
- Rezervare atomică, fără refund automat pentru timeout, 5xx sau cerere incertă; niciun retry automat al POST-ului Bouncer. Citirea rezultatului unui ID cunoscut nu creează altă scanare.
- Protecție suplimentară: maximum 50 încercări/zi și 20/actor/zi; anonimii au limită comună per sursă; resetare UTC. Se reutilizează rate limitingul D1 existent.
- Maximum 50 MB suplimentari ținuți în carantină; depășirea oprește noile fișiere. Erorile de ștergere păstrează rezervarea, în loc să pretindă că spațiul a fost eliberat.
- Deduplicare numai în contextul/actorul autorizat; același fișier retransmis nu produce automat altă scanare. O eroare locală de stocare nu rescrie un verdict autentic CLEAN.
- Procesarea în cererea de upload așteaptă limitat. Pentru restul rezultatului se folosește registrul D1 și cronul existent: maximum cinci ID-uri cunoscute pe rulare, fără creare de scanări ori infrastructură nouă.
- Inventarierea este manuală și citește maximum 25 de obiecte/pas. Nu scanează automat arhiva și nu epuizează cele 500 de operațiuni.

Plafoanele proprii limitează impactul suplimentar; nu reprezintă dovada că întregul cont Cloudflare are consum gratuit disponibil. Planul și consumul curent D1/R2/Workers, subrequesturile și capacitatea existentă se verifică înainte de lansare, fără activarea unui plan plătit. La auditul actual, citirea setărilor publice ale bucketurilor prin API a returnat `Authentication error 10000`; caracterul privat nu a fost reconfirmat live prin acea credențială. Flagul de verificare rămâne separat.

## Interfață și API

**Principal → Antivirus**, ultimul buton din prima grupă. Acces: exclusiv principalii nativi Owner/Super Admin, verificați server-side. Acțiunile reutilizează politica MFA existentă; nu se afirmă că MFA global este activ dacă flagul platformei îl dezactivează.

Pagina include conexiune, cotă, spațiu de carantină, fișiere blocate, conformitate, filtre după modul, scanări, fișiere istorice și jurnal. Prezentarea generală are un rezumat compact. Acțiuni cu confirmare: sincronizare cotă, test text curat, test EICAR, test sintetic 5 MB, verificarea unui ID existent, reîncercarea explicită a unei erori certe, curățarea carantinei și inventariere. Nu se descarcă fișiere de carantină.

Rute private `GET /api/antivirus`, `POST /api/antivirus/usage/sync`, `/test`, `/jobs/:id/{poll|reconcile|retry|purge}`, `/legacy/:id/scan`, `/inventory/:source`. Toate răspunsurile sunt private/no-store. POST necesită confirmare și `Idempotency-Key`; corpul este limitat și validat. Retry-urile cu aceeași intenție nu repetă o scanare deja rezervată. Un obiect istoric schimbat nu este scanat din nou prin reluarea aceleiași intenții; verificările de checksum ale documentelor originale se păstrează. Reconcilierea consultă istoricul furnizorului după un răspuns pierdut și nu repetă POST-ul de creare.

## Configurare și test real

Nu configura secrete în Git, PR sau chat. Niciun secret nou nu a fost instalat în producție în această etapă.

| Setare | Rol |
| --- | --- |
| `BOUNCER_API_KEY` | Secretul contului Free autorizat. |
| `BOUNCER_ENABLED=true` | Activare explicită a adaptorului; nu aprobă datele confidențiale. |
| `BOUNCER_STORAGE_PRIVACY_VERIFIED=true` | Numai după verificarea destinațiilor R2 private în mediul respectiv. |
| `BOUNCER_SENSITIVE_PROCESSING_APPROVED=true` | Numai după revizuirea reală a contractului și a transferului. |
| `BOUNCER_DPA_REFERENCE` | Referință la acordul verificat aplicabil art. 28. |
| `BOUNCER_TRANSFER_REVIEW_REFERENCE` | Referință la mecanismul/evaluarea aprobată pentru transfer. |

Mostrele sintetice nu cer aprobarea pentru documente confidențiale. Acceptanța reală se face pe un Worker local izolat, D1/R2 locale și fără date reale. `scripts/test-bouncer-live.mjs` cere un token de fixture local într-un fișier securizat și refuză o destinație de producție. Verifică cota, execută trei scanări (text curat, EICAR, 5 MB prin v2), așteaptă rezultate finale, verifică lipsa overage-ului și elimină numai copiile sintetice create de acel test. Nu activează conformitatea pentru clienți și nu face deploy.

Pentru această acceptanță se folosește entrypointul API normal, fără interceptarea furnizorului, o configurație locală izolată și cheia reală transmisă printr-un fișier local de secrete protejat/ignorat de Git. Fixture-ul controlat folosit la regresii nu poate servi drept dovadă a scanării reale. Confirmarea rezultatului se corelează cu ID-urile și utilizarea observată în contul Free autorizat.

Exemplu, fără credențiale:

```sh
node scripts/test-bouncer-live.mjs --base http://127.0.0.1:8788 --token-file /private/path/local-fixture-token
```

Testul trebuie să confirme CLEAN pentru cele două mostre curate și blocare pentru EICAR. Un timeout, lipsa cheii, verdict nefinalizat sau eroare nu este un test trecut. Până la această dovadă, PR #69 rămâne draft.

## Lansare și restaurare

1. Review pe lotul local și actualizare din `main`; nu împinge peste branchul vechi PR #69 fără reconciliere. Userul a amânat push/deploy până la finalul taskurilor.
2. Backup D1 verificat și migrații în ordine; lotul are acum 0078–0089 neaplicate în această etapă. 0089 nu mută/șterge originale. Fișierele istorice nu primesc CLEAN implicit.
3. Verificare live a caracterului privat al `FILES`/`MEDIA`, a lipsei domeniilor directe și a bugetului Cloudflare existent. Invalidarea cache-ului edge este inclusă în cod; URL-urile avatar/copertă native sunt rotite în migrare. Copiile externe ori deja descărcate în trecut nu pot fi revocate retrospectiv.
4. Test real sintetic, verificarea cotelor/erorilor/logurilor, apoi decizia contractuală privind datele reale. Fără dovezi: uploadurile sensibile rămân blocate.
5. Deploy API după migrare, apoi frontend; verificare autenticată Owner, staff fără acces, clienți A/B, toate familiile de upload/read și fișiere istorice. Nu prezenta testele simulate drept protecție activă.
6. Rollback sigur: se dezactivează trimiterea către provider, se păstrează carantina și verificarea CLEAN la citire. Nu se redeschid fișierele neverificate și nu se suprascriu documente finalizate.

## Dovezi locale și limitele acceptanței

Verificări finale pe codul actual, fără mutații remote:

| Verificare | Rezultat |
| --- | --- |
| Vitest, surse fără cele trei suite dependente de build | 91 fișiere, **751 trecute, 1 omis**. |
| Vitest, artefacte Pages / HTML prerandat / preview-uri servicii | 3 fișiere, **44 trecute**. Total: **795 trecute, 1 omis**. |
| Playwright, Chromium pe buildul de producție | **64/64 trecute**: Antivirus, Document Center, Media, dashboard și matrice de roluri/viewporturi. |
| TypeScript aplicație și Worker | Trecut. |
| ESLint | Zero erori; patru avertismente Fast Refresh preexistente. |
| Build static și Pages (`build:pages` include `build`) | Trecut; verificarea SEO tehnică a trecut. |
| `build:worker`, adaptor Pages și `build:api` | Trecute; API verificat exclusiv cu `--dry-run`, fără deploy. |
| Sintaxă script acceptanță reală și `git diff --check` | Trecute. |

Singurul test omis este benchmarkul opțional pentru limitele publice: `AVYRON_BENCH_PUBLIC_LIMITS` nu este activat. Nu este un test antivirus omis. Auditul SEO verifică artefactele/crawlabilitatea tehnică, nu dovedește indexarea în motoarele de căutare. Snapshotul GitHub revalidat pentru pregătirea livrării este `origin/main=631a127`; integrarea în `main` rămâne amânată.

- Testele Bouncer folosesc un furnizor controlat pentru a verifica codul real de carantină, rezervarea atomică, versiunea R2, izolarea utilizatorilor, răspunsurile contradictorii, cotele, destinațiile de upload, erorile și reconcilierea. Acestea nu reprezintă verdictul unui motor antivirus real.
- Workerul nativ local a trecut 17 verificări cu autentificarea reală a aplicației, D1/R2 locale și mostre sintetice: blocare pentru lipsa conformității înainte de orice apel, import/download, deduplicare, publicare client A și refuz client B, proiecte, avatar, blog, Media, malware/suspect/în așteptare, răspuns pierdut, reconciliere fără alt POST și cotă. Toate apelurile externe au fost interceptate de un fixture aflat în afara repository-ului; acesta nu este inclus în codul deployabil.
- Integritate după test: `PRAGMA quick_check=ok`, zero încălcări FK; bugetul carantinei este egal cu suma fișierelor reținute. Nu s-au șters originale oficiale.
- Opt scenarii dedicate interfeței Antivirus au trecut, inclusiv 320/390/1440 px, lipsa accesului pentru staff obișnuit, eroare recuperabilă la date invalide, confirmare/idempotency și verificare automată WCAG AA a paginii. Capturile desktop/mobil au fost inspectate vizual.
- Regresiile au identificat două probleme corectate: inițializarea providerului React Query pe ruta privată și reîncărcarea stării Media după restaurare, care trebuie să revină în carantină. Un test vechi de ordine a meniului a fost actualizat pentru „Carusele Exemple”, deja adăugat în lotul anterior.

**Acceptanța reală rămâne neîndeplinită:** cheia Bouncer și testele sintetice reale CLEAN/EICAR/v2 nu sunt disponibile; lipsesc dovezile contractuale și reconfirmarea setărilor R2 private din producție. Nu se prezintă PR #69 ca finalizat ori protecția ca activă în producție. Testarea autentificată în conturile reale rămâne o etapă ulterioară, conform deciziei utilizatorului.
