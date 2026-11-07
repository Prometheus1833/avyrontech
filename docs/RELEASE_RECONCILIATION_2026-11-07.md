# Reconcilierea lansării AVYRON — 07.11.2026

Bază verificată: `origin/main` la `9dead20bb41048b7ac3062a3853a704ee2ed847a`. Ramură: `codex/release-reconciliation-2026-11-07`. Utilizatorul a autorizat explicit consolidarea, push, integrarea și deployul. Rezultatul remote și versiunea activă se consemnează în PR după lansare; acest fișier nu constituie dovadă de deploy.

## Inventar și decizii

Worktree-ul de lansare a fost curat. Celelalte worktree-uri disponibile nu au editări de sursă necomise; directoarele locale de output, capturi și resurse neversionate se păstrează și nu se publică automat. Auditul ramurilor separă istoricul inclus direct, patchurile echivalente și implementările înlocuite. Nu se rescriu ramurile sau migrările vechi pentru a simula integrarea.

| PR / grup | Rezultat pregătit pentru lansare |
| --- | --- |
| #104 | Articolul despre variantele de produs, copertă WebP și ruta RO sunt integrate cu istoricul original. Sitemapul și HTML-ul folosesc registrul existent; nu se inventează traducere EN. |
| #102 | Sursa cabinetului, resursele și workflowul dedicat sunt integrate cu istoricul original. Sites: proiectul existent `appgprj_6aee16d68fcc8191a51c7f828bcfab51`, versiunea 14 activă; toate cele 42 de pagini și app.js/motion.js/motion.css corespund publicării existente, eliminând numai scriptul injectat de protecție Cloudflare din comparație. Nu sunt necesare schimbări DNS sau o republicare identică. |
| #28 | Fluxul de reveniri și revizie este portat pe schema/RBAC actuale prin 0101. Migrările alternative vechi 0061/0062 nu sunt aplicate peste catalogul comercial existent. |
| #69 | Propunerea cu binding generic MALWARE_SCANNER este înlocuită de Bouncer din lansările #93/#107. Nu se reintroduce scannerul generic și nu se declară scanare reală fără cont, cheie și conformitate. |
| #11 / #12 | Versiunile vechi ale centrelor, Surveys și backupului sunt înlocuite de `adminOperations`, `surveyAdmin`, Document Center și mecanismele actuale. Migrațiile 0025–0031 există în istoricul canonic; nu se reinstalează componente paralele sau migrări alternative. PR-urile istorice sunt închise cu trimitere la succesor, după verificarea lansării. |
| #7 | Propunerea draft de înlocuire a identității/logo-ului public nu este reactivată; se păstrează identitatea actuală și istoricul propunerii. |
| #74, #76–82, #89–92 | Actualizările propuse sunt reconciliate în manifestele și lockfile-urile actuale. Worker SDK rămâne izolat de React 18; nu se mută Agents 0.32 în frontend. Wrangler și tipurile Worker sunt aliniate în cele două arbori. |

Ramurile mai vechi pentru configurator, prezentarea publică, WhatsApp/TikTok, branding, documente și marketing nu sunt reintroduse brut peste versiunile ulterioare. Calculatoarele vechi cu prețuri fixe nu înlocuiesc catalogul/configuratorul actual. Conectorii fără acreditări rămân neconfigurați. Avy Skills este deja inclus prin #107, iar verificarea finală compară arborele de release cu `main` și codul servit public.

## Altele

Sidebarul, meniul mobil și directorul folosesc același registru și aceleași permisiuni. Paginile autorizate fără intrare proprie apar automat în Altele: inclusiv promoții, documente/resurse și colecția staffului, după drepturi. Există căutare cu diacritice normalizate și navigare nativă. Cardul fără acțiune „Rapoarte transversale — de dezvoltat” este eliminat. Clienții nu primesc acces la director sau funcții interne.

## Leaduri: migrarea 0101

Transportul uploadurilor este aliniat cu politicile modulelor: Document Center/Media 15 MiB, colaboratori 5 MB și Avy Skills 25 MB. Defaultul JSON de 1 MiB nu mai respinge uploaduri valide pe aceste rute. Modulele verifică în continuare tipul, dimensiunea, autorizarea și verdictul antivirus; generările interne nu sunt trimise către scanner.

- Două tabele: ciorne de revenire și revizii. API-ul central al leadului oferă preluare, aprobare, respingere, revizie pe secțiune și confirmare manuală pe canal.
- Confirmările WhatsApp și e-mail sunt independente. O confirmare parțială nu declară celălalt canal trimis, iar un canal confirmat nu poate fi rescris sau reconfirmat.
- Revizia leagă cheia idempotentă de utilizator, lead, ciornă, versiune, secțiune și instrucțiune. Revalidarea accesului după inferență previne modificarea după revocare/arhivare. Modificarea resetează aprobarea.
- Coada și cronul existente pregătesc ciorne Necesit, fără trimitere externă. Inboundul, arhivarea, refuzul și preluarea umană opresc revenirile; o inferență întreruptă nu este repetată automat. Trimiterile reale rămân operații manuale autorizate.
- Agentul primește o versiune nouă cu instrucțiunile existente păstrate și disciplină de checkpoint/canale. Drepturile toolurilor și starea activ/pausă nu sunt extinse automat. Politica Free de cost zero este completată numai dacă lipsește și există cota nativă cu hard-stop; politicile existente nu sunt înlocuite.
- Cele cinci rute operaționale adăugate în catalog folosesc `limit_mode=native_budget` sau `manual`; nu introduc plafoane zilnice proprii. Regulile `daily` existente rămân distincte. Codex local nu rulează cu Mac-ul oprit; pregătirea cloud este independentă de browser.

## Validare și limite

PR-ul de lansare păstrează rezultatele exacte pentru typecheck, lint, audit D1, build static/Pages/Worker/API/e-mail, auditul celor doi arbori npm, teste unitare și browser. Testele browser folosesc date sintetice și nu certifică dispozitive fizice iOS/Android. Un benchmark local opțional rămâne dezactivat când nu este cerut explicit.

După CI: revalidarea `main`, integrarea exactei revizii testate, urmărirea Workers Builds existent, verificarea migrării 0101 și integrității, a versiunii Worker la 100%, a paginilor publice și a izolării API anonime. Nu se activează furnizori plătiți, DNS nou, servicii redundante sau distribuire socială. Bouncer și celelalte integrări fără acreditările/aprobările necesare rămân marcate explicit; testul autentificat final rămâne separat, conform utilizatorului.
