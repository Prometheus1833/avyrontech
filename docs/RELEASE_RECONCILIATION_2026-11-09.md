# AVYRON — reconcilierea lansării din 09.11.2026

Mandat: utilizatorul a autorizat explicit push, integrarea tuturor modificărilor AVYRON pregătite și deploy în producție. Baza verificată: `7322cf40e09e20b8b6b22a0f18090df574f9f15e`. Ramură: `codex/production-reconciliation-2026-11-09`. Proiectele cabinetelor de avocatură și PR #110 sunt excluse. Acest document separă verificările locale, CI, preview și producție; starea lansării se completează cu probele efective.

## Inventar și integrare

| PR | Conținut inclus în arborele consolidat | Dependență |
| --- | --- | --- |
| #122 | Sesiuni native rotite, cookie host-only, import administrativ securizat și pregătire Access | 0110 |
| #123 | Website prin abonament, selector cu trei carduri, catalog, CRM, proiect, portal, perioade de facturare | 0111 |
| #124 | SEO, consimțământ, formulare, accesibilitate și recuperarea rutelor | include #123 |
| #125 | Site Builder / Etape și selecție unitară listă–pipeline pentru proiecte | 0112 |
| #126 | Navigarea clientului, documente, produse separate de achiziții, plăți/istoric și metode salvate | API workspace nativ |
| #127 | Audit de securitate, transport autentificat, validare KDF, QA și CI repetabil | include #122 |
| #128 | Portofoliu bilingv, proiecte și domenii, scene, imagini, SEO și acces din serviciul Website | fără migrare |
| #129 | Leads Agency FREE-FIRST, surse, pipeline, rapoarte, transfer Leads și generator Document Center | 0113 |

Toate cele opt head-uri sunt păstrate ca strămoși ai ramurii consolidate; nu sunt înlocuite cu versiuni de fișiere dintr-un singur PR. Integrarea păstrează pinurile SHA și permisiunile CI, contrastele corectate, telemetria CTA, safe-area mobil, domeniile native, fixture-urile actualizate și istoricul tipizatelor.

Corecții identificate la reconciliere:

- #126 eșua în CI deoarece testul căuta intrarea Notificări eliminată din meniul clientului. Testul utilizează acum clopoțelul persistent, păstrând meniul simplificat solicitat.
- #128 nu avea controlul comun de revenire pe portofoliu; este acum prezent în hero, în RO/EN.
- Temporizatorul de recuperare a unui salt de dispozitiv putea readuce utilizatorul la etapa anterioară după o derulare înapoi. Se anulează la atingerea etapei și la gesturile de wheel/touch; există regresie specifică.
- Cele două demo-uri aveau conflicte între contrastul corectat și eliminarea unor secțiuni vechi. S-au păstrat culorile accesibile și s-au eliminat linkurile către fragmentele inexistente Galerie/Hartă. Auditul SEO verifică din nou ancorele.
- URL-urile tehnice AVYRON workers.dev/Pages sunt marcate server-side noindex/nofollow, cu HTML private/no-store. Domeniul public canonic rămâne indexabil, iar hosturile proiectelor clienților nu sunt schimbate; cinci regresii verifică separarea.
- Controlul Lighthouse suplimentar pentru concordanța etichetelor vizibile a identificat șase linkuri de captură în portofoliu. Numele accesibil este acum derivat din domeniul și acțiunea vizibile, cu contextul proiectului/tabului pentru cititoare de ecran; imaginile din aceste linkuri sunt decorative. Regresia axe include explicit această regulă, pe lângă regulile WCAG AA.

## Ramuri istorice și alte worktree-uri

Au fost inventariate toate referințele remote neincluse direct în `main`, ramurile locale fără upstream și worktree-urile disponibile. În celelalte worktree-uri nu există modificări de sursă urmărite în Git; directoarele untracked reprezintă artefacte/output local și nu sunt publicate arbitrar.

Ramurile vechi pentru Documents Hub, OS centers, marketing/backup, Surveys, WhatsApp/TikTok, branding/proces și calculatoare nu se introduc brut peste istoricul canonic. Această regulă este deja consemnată în [reconcilierea anterioară](RELEASE_RECONCILIATION_2026-11-07.md). Unele au migrări alternative la numere deja aplicate ori tarife fixe depășite. Funcțiile native actuale și istoricul D1 rămân sursa de adevăr. Propunerea Claude de branding/proces din septembrie este o variantă istorică fără PR activ, nu o schimbare nouă aprobată pentru identitatea actuală.

Avy Skills și clarificarea antivirusului extern sunt deja prezente în sursa curentă. Patchurile dependabot vechi sunt înlocuite de versiunile actuale din lockfile, iar numele Workerului este deja `avyrontech`. Nicio ramură sau lucrare a utilizatorului nu este ștearsă. PR #110 și worktree-ul cabinetului rămân separate.

## Destinația reală și conservarea infrastructurii

Inventarul Cloudflare read-only confirmă că `avyron.ro`, `www.avyron.ro`, `api.avyron.ro`, `app.avyron.ro` și `surveys.avyron.ro` sunt custom domains ale Workerului **avyrontech**, care are bindingul ASSETS. Nu există proiect Pages AVYRON în lista contului. Ieșirea statică/Pages rămâne compatibilă și testată, dar lansarea publică folosește mecanismul existent Worker API + assets. Workerul separat `avyron-site` este o destinație de compatibilitate fără custom domain canonic și nu trebuie confundat cu publicarea principală.

Nu se creează proiect Pages, Worker, bază D1, bucket, abonament, serviciu plătit sau DNS nou. Bazele sunt `avyron-db` și `avyron-db-preview`, pe contul Cloudflare Avyron existent. R2/KV/cozi/workflow-uri rămân cele configurate. Nu sunt schimbate domeniile, fișierele sau workflow-ul cabinetelor. Probe HTTP/hash înainte și după lansare sunt păstrate local, fără date private în Git.

Înainte de lansare, producția are istoric canonic până la 0109; cele patru migrări noi sunt 0110–0113. Preview-ul a fost găsit la 0077 și a fost actualizat mai întâi, separat de producție. Se păstrează bookmark Time Travel înainte de migrare. Migrările sunt aditive; obiectele R2 nu sunt rescrise de această lansare. Time Travel protejează metadatele D1, nu este echivalent cu un backup nou al fișierelor R2.

Preview-ul avea și o migrare Durable Object restantă pentru exporturile native de documente. `versions upload` a refuzat corect aplicarea ei; după verificarea izolării (fără rute/crons de producție, D1/R2 preview) se utilizează deploy-ul Workerului preview existent pentru actualizarea clasei. Nu se modifică o clasă sau date de producție prin acest pas.

## Porți comerciale și de securitate păstrate

- MFA nu este activat; `ADMIN_MFA_POLICY=disabled`, `MFA_AUTH_ENABLED=false`. Access rămâne pregătit/off, conform deciziei utilizatorului. Nu se impun factori noi ori reguli cu risc de blocare.
- Nu se activează planuri AI plătite, depășiri de cote sau upgrade automat.
- Stripe și Oblio au secrete cu numele așteptate în Workerul curent; aceasta nu dovedește o plată sau factură emisă corect. Nu se creează tranzacții reale în auditul lansării.
- Bouncer nu are cheia și documentele de conformitate aprobate: uploadurile externe sensibile rămân blocate; generările interne nu consumă scanări. Nu există verdict CLEAN simulat.
- SMTP, Resend și Hugging Face nu sunt declarate funcționale fără configurarea lor. Hugging Face rămâne omis explicit de utilizator. Nu se trimit mesaje reale sau campanii în timpul testelor.
- Website prin abonament păstrează dezvoltarea inclusă la 0 lei, dar nu inventează tarife lunare, termeni fiscali, perioade minime ori servicii e-mail gratuite. Vânzarea planurilor necesită configurarea și aprobarea acestora în OS.
- Sursele Leads Agency nu sunt declarate conturi AVYRON active fără confirmare. Condițiile comerciale și încasarea pentru România se verifică uman acolo unde lipsesc dovezi.
- Indexabilitatea, sitemapul și canonical sunt verificabile tehnic; indexarea efectivă, traficul și pozițiile în motoare nu sunt garantate de deploy.

## Verificări înainte de publicare

Rezultate deja executate pe sursa consolidată:

- Typecheck aplicație/Worker: PASS.
- Lint: 0 erori; 4 avertismente Fast Refresh existente în componentele Logo Studio.
- Audit local D1 integral, registrul serviciilor și catalogul produselor: PASS.
- SCA root/API: 0 vulnerabilități raportate la verificare.
- Audit securitate repetabil: 436 endpointuri, 14 panouri, integritatea celor 345 referințe ASVS validată; nu constituie certificare de conformitate.
- Workers/D1 local real: 410 probe PASS, inclusiv acces anonim refuzat, sesiuni rotite/concurente, revocare, client izolat, CSRF/CORS și import administrativ; fără activare MFA sau scrieri remote.
- Regresiile browser pentru notificări, revenire comună și scena dispozitivelor: 14/14 PASS, Chromium și WebKit, desktop și mobil. Testele sunt sintetice, fără tranzacții sau dispozitive fizice.
- Primul build consolidat a găsit cele două ancore de demo inexistente; au fost corectate. Reluarea buildului Worker și a auditului SEO: PASS, 82 pagini indexabile și 212 publice noindex.

Suita integrală consolidată: **140 fișiere, 1.253 teste PASS, un benchmark opțional omis** (`AVYRON_BENCH_PUBLIC_LIMITS` neactivat). Build static/Pages, standalone Worker, API și e-mail dry run: PASS. Audit SEO: 82 indexabile / 212 publice noindex. Transportul HttpOnly a fost verificat pe conexiune HTTP reală localhost în Chromium și WebKit, fără acces prin document.cookie.

În lotul WebKit consolidat au trecut inițial 95 din 96 probe. Proba facturii externe folosea fixture-ul vechi, fără răspunsul endpointului metodelor de plată cerut acum de pagina unificată; fixture-ul a fost adus la contractul API nativ. Nu s-a relaxat verificarea absenței Bearer-ului și a referrerului către furnizor. Reluarea probei a trecut 2/2 în Chromium și WebKit. Cele 96 scenarii WebKit distincte sunt astfel verificate prin lotul inițial și reluarea țintită, fără a prezenta prima rulare ca integral verde.

Preview-ul existent este publicat la versiunea `adce2918-4799-4c16-a16b-3acc37ea95bf`, cu D1 până la 0113, fără cron de producție. Smoke HTTP: health 200, portofoliu și Website prin abonament 200; Leads Agency, planuri interne și securitate refuzate anonim cu 401 și private/no-store. Toate cele patru bucketuri de producție au r2.dev dezactivat și zero custom domains la verificarea read-only.

Smoke vizual pe preview, cu API real și contexte separate: șase combinații Chromium desktop / WebKit mobil pentru portofoliu, Website prin abonament și autentificare au HTTP 200, fără erori JavaScript sau overflow orizontal. Profilarea Chrome pe portofoliu a măsurat LCP 404 ms / CLS 0 desktop și LCP 1.616 ms / CLS 0 la 390×844, DPR 3, CPU 4× și Fast 4G. Sunt probe de laborator, nu CrUX/INP ori scor Lighthouse de performanță. Auditul Lighthouse snapshot pe prototipul corecției semantice are 35 controale PASS, zero FAIL; este reluat pe buildul publicat. Nu s-a redus calitatea imaginilor sau designul cinematic pentru obținerea scorurilor.

Limite păstrate explicit: nu există test de încasare Stripe sau emitere Oblio în producție, sesiune reală Owner/Client reverificată în această lansare, test pe telefoane fizice, dovadă GSC de indexare ori restaurare nouă de obiecte R2. Testele autentificate folosesc runtime local real și fixture-uri browser separate. Auditul tehnic de securitate păstrează excepția MFA și constatările NOT_VERIFIED, inclusiv limitarea exportului WebGL în runnerul software WebKit; nu se declară conformitate integrală sau suport fizic iOS verificat.

CI și producția se completează la finalul lansării. Capturile și stările istorice ale fiecărui PR rămân probe ale etapelor lor, nu sunt prezentate drept verificări de producție.

Prima execuție CI a ramurii consolidate a trecut securitatea, tipurile, lint, migrările, buildul Pages, cele 1.253 teste și 445/446 scenarii browser. Scenariul rămas căuta vechea etichetă completă a selectorului RO/EN, înaintea corecției de accesibilitate care începe numele cu textul vizibil. Selectorul din test a fost sincronizat cu eticheta actuală; verificările nu sunt dezactivate și suita este reluată pe noul head înainte de merge.

După ultimele corecții: typecheck și lint țintit PASS; 12 probe unitare portofoliu/antete PASS; înregistrarea mobilă în engleză și accesibilitatea portofoliului PASS în ambele motoare, 4/4. Buildurile standalone Worker, static/Pages și API dry run sunt regenerate cu aceste corecții și au trecut. Scanarea de igienă a secretelor nu a găsit rezultate.

## Rollback

Se păstrează identificatorul ultimei versiuni active, bookmarkurile D1 și arborele Git anterior. Rollbackul codului se face către o versiune cunoscută, cu păstrarea migrărilor aditive și a istoricului. Rotația cookie-ului poate necesita reautentificare la revenirea pe cod foarte vechi. După existența unor plăți pentru Website prin abonament, nu se retrag handler-ele care păstrează identitatea cumpărătorului și perioadele achitate; se opresc numai vânzările noi sau se publică o corecție. Nu se execută DROP, reset global de conturi sau restaurare distructivă fără un incident și mandat separat.
