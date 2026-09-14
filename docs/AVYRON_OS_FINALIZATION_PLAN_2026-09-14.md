# AVYRON OS — plan de finalizare

Sursa: lista utilizatorului din 14 septembrie și auditul de release existent.
Ramură: `codex/avyron-os-finalization-2026-09-14`, bază `bf63ef9`.
MFA pentru administratori este amânat explicit de utilizator. Nu se elimină
factorii deja înrolați și nu se acordă privilegii suplimentare.

## Ordine și criterii de acceptanță

1. **Acces și infrastructură**: acces GitHub/Cloudflare verificat; politică MFA
   temporară pentru administratorii platformei; fluxuri interne Cloudflare în
   locul Supabase; email cu dovadă de livrare; inventar WAF și backup/restore.
   Acceptanță: teste de autorizare, sesiuni, IDOR, erori și recuperare.
2. **Financiar**: CRUD complet, filtre/paginare, încasări distincte de facturare,
   FX explicit, profitabilitate, reînnoiri, anomalii, reconciliere, XLSX/PDF,
   idempotency/concurență, Cost Guard. Datele și prețurile reale se introduc
   numai din surse furnizate/verificate; lipsa lor nu înseamnă zero.
3. **Echipă și proiecte**: editor acces și asociere explicită cont–client,
   dashboarduri de rol, conversie lead idempotentă, termene/SLA, cereri cu
   aprobare cost, livrabile, onboarding/offboarding și contracte/reînnoiri.
4. **AI și automatizări**: instrumente și evaluări per agent; aprobări legate
   de versiune; istoric/cost real; editor, simulare, retry și oprire;
   briefing programabil; comenzi executabile și import controlat leaduri.
5. **Social**: OAuth autorizat, import/inbox, cercetare cu proveniență,
   generare–revizuire–aprobare–programare–publicare–rezultate și retenție.
   Publicarea și mesajele externe necesită autorizare specifică.
6. **Engine și cunoaștere**: surse/licențe verificate, conturi autorizate,
   sugestii aprobate, sincronizare verificată, administrare resurse,
   căutare/versionare/staleness și documente R2 private.
7. **Operațiuni**: probe reale de sănătate, Security/Error/Recovery,
   domenii/DNS/SSL, DSAR și calendar conformitate, experimente,
   comentarii moderate, newsletter, programări și rapoarte programate.
8. **Acceptanță finală**: furnizori autorizați, webhook replay/expirare/outage,
   verificări per rol și mobil, migrații locale, builds static/Pages/Worker,
   regresii, secret scan și revizuirea diff înaintea pushului final.

## Conexiuni verificate în această etapă

- GitHub: conector autentificat, repository `Prometheus1833/avyrontech`, drept
  de push confirmat; fetch efectuat, checkout curat la începutul lucrării.
- Cloudflare: sesiune browser autentificată, contul Avyron accesibil.
  Wrangler CLI nu are sesiune locală; acesta nu este un indiciu că resursele lipsesc.

## Limite de publicare

Implementare și teste locale pe ramura de task. Pushul este pasul final al
lucrării; merge, deploy, migrații remote și servicii plătite nu sunt aprobate
implicit. Nu se inventează conectări live, prețuri, clienți sau succes de email.
Auditul precedent rămâne istoric; acest plan nu declară backlogul finalizat.

## Etapa implementată local

| Domeniu | Rezultat concret | Limită rămasă |
| --- | --- | --- |
| Acces fără MFA nou | Excepție temporară numai pentru cei doi principali activi ai platformei fără factor înrolat; factorii existenți și ceilalți utilizatori privilegiați își păstrează protecția | Configurația nu a fost aplicată live; schimbarea parolelor se face de titular |
| Dashboard Cloudflare | Facturi, abonamente, suport, anunțuri, chat, domenii și rapoarte citesc/scriu prin API și D1; componentele interne neutilizate care depindeau de Supabase au fost eliminate | Providerul opțional al exemplelor publice este separat; nu a fost migrat |
| Echipă și clienți | Nivelul user/staff/admin și asocierile cont–client sunt salvate atomic, cu audit; accesul financiar nu se deduce din email sau accesul la proiect | Editorul capabilităților granulare și dashboardurile specializate pe rol rămân de extins |
| Livrare | Livrabile, taskuri, onboarding/offboarding și mentenanță persistente, termene, stări, editare cu revizie și priorități în dashboard pentru următoarele 48 ore | Asignarea persoanei, SLA/avertizări programate, cererile cu aprobare cost și contractele nu sunt finalizate |
| Chat și suport | Canale și mesaje directe cu istoric; suport izolat pe client, autor verificat server-side, blocare după închidere, protecție la cereri duplicate | Notificările email nu sunt operaționale; unele liste au încă numai prima pagină în UI |
| Fișiere proiect | Autorizare comună cu proiectele, descărcare autentificată, limită upload verificată pe flux și curățare R2 dacă D1 eșuează | Testele folosesc stocare locală simulată; backupul și restaurarea R2 remote nu sunt verificate |
| Încasări | Registru de plăți parțiale, distinct de facturare; sold și stare actualizate atomic; idempotency, protecție la supraplată și audit | Rambursări/stornări, reconciliere bancară, importuri și toate operațiile CRUD legacy necesită etapa financiară următoare |
| Multivalută | Totalurile RON includ numai RON sau echivalent documentat; încasările sunt grupate și în valuta originală | Nu există conversie automată presupusă, profitabilitate fiscală completă ori export XLSX/PDF finalizat |
| Domenii și măsurători | Verificări reale RDAP/DNS cu istoric, CSV al istoricului; rapoarte de proiect cu sursă și valori necunoscute păstrate | Watchlist, expirări/SSL/DNS complete și colectare automată a măsurătorilor rămân de implementat |
| Build Cloudflare | Eliminat lockfile-ul Bun rămas în urma actualizărilor npm; instalare npm curată verificată | Corecția trebuie să ajungă în ramura de build înaintea unei noi rulări Cloudflare |

Migrațiile append-only `0020_internal_workspace.sql` și
`0021_financial_receipts.sql` sunt numai locale. Codul nou depinde de ele:
nu se activează pe un Worker care folosește o bază nemigrată. Încasările
înregistrate nu pot fi șterse sau modificate direct; fluxul viitor de
rambursare trebuie să adauge înregistrări de reversare auditate.

## Inventar live verificat prin Cloudflare

- Worker `avyrontech`: versiunea activă începe cu `e151d894`, trafic 100%.
  Bindingurile DB, FILES, MEDIA, AI, ASSETS, KV, Durable Object și rate limiter
  sunt prezente. Existența unui binding nu dovedește sănătatea serviciului.
- Buildul `11e8962b-3a26-4673-b909-77f66a65a21f`, pentru `bf63ef9`, a eșuat la
  `bun install --frozen-lockfile`: lockfile-ul nu corespundea manifestului.
  Branch-ul de producție rămâne `main`; taskurile folosesc upload de versiune
  preview, nu promovare automată în producție.
- SMTP are parametri configurați, însă secretul `SMTP_PASS` și bindingul
  `send_email` nu apar în Worker. Nu s-a declarat sau simulat o livrare email.
- D1 `avyron-db`: 104 tabele afișate, 1,77 MB; Time Travel oferă 7 zile.
  A fost citit un bookmark de recuperare, fără restore sau migrare remote.
- `avyron.ro`: regula activă „Block unsafe methods and scanner probes” blochează
  TRACE/CONNECT și sondările `.env`, `.git`, wp-login, xmlrpc, phpmyadmin,
  phpunit și cgi-bin. Regula „Leaked credential check” este activă.
  Lista arată „No Managed rules created”. Aceasta nu înlocuiește auditul
  protecțiilor Worker, autentificarea, rate limits și izolarea pe client.
- `avyron.eu`: inventarul arată 0/5 reguli custom, 0/1 reguli de rate limiting
  și nicio regulă managed creată. Alinierea cu regula anti-probe din `.ro` și
  protecțiile specifice rutelor demo sunt următorul pas de configurare; în
  această etapă nu au fost schimbate reguli live și nu a fost cumpărat un plan.

## Verificări și dovezi

- TypeScript pentru aplicație și Worker, ESLint și buildurile static, Pages,
  Worker/API și email dry-run sunt verificate local.
- Testele runtime execută handler-ele Hono cu toate migrațiile SQLite și
  tranzacții, inclusiv IDOR, MFA, duplicate concurente, supraplată, rollback la
  eșec de audit, revizii stale, chat privat și valori de performanță necunoscute.
- Rezultatul final: **184/184 teste unitare/runtime** în 22 fișiere;
  **39/39 teste Playwright**. Uploadul fără Content-Length, limita de 15 MB și
  curățarea obiectului la eșec D1 sunt verificate prin handler-ele reale și
  stocare simulată. Captura chatului mobil a fost inspectată vizual.
- Testele Playwright folosesc API fixtures: verifică UI desktop/mobil, roluri,
  chat și încasări; nu reprezintă tranzacții în servicii externe.
- `python3 scripts/verify-local-restore.py` verifică backup/restore SQLite în
  baze temporare distincte, toate rândurile din 113 tabele și integritatea/FK.
  Acesta este un test local, nu dovada restaurării D1/R2 din Cloudflare.
- Auditul npm verificat online: **0 vulnerabilități**.
- Instalarea curată `npm ci --no-audit --no-fund`, inclusiv pachetul API, a
  trecut într-un director temporar, fără legacy-peer-deps sau force.

## Următoarele praguri de acceptanță

1. Configurare email autorizată, apoi dovadă de livrare pentru recuperare,
   invitație și notificare; rotația parolelor de către titular. Backup R2
   periodic și restaurare D1/R2 într-un mediu izolat autorizat.
2. Închiderea tuturor punctelor financiare din lista inițială: formulare
   complete, paginare/filtre, FX documentat, alocări, ROI/ROAS, reînnoiri,
   anomalii, reconciliere, exporturi, concurență și fallback Cost Guard.
3. Capabilități granulare, roluri specializate, SLA și aprobarea costurilor;
   verificarea conversiei lead–client–proiect și a contractelor.
4. Fluxurile AI/Automation/Approval legate de versiune, apoi social și Engine.
   Conturile externe, licențele și sursele trebuie verificate individual;
   existența unui adaptor nu înseamnă integrare live.
5. Centrele operaționale și funcțiile de newsletter, programări, DSAR,
   experimente și raportare; testarea webhookurilor și indisponibilității
   furnizorilor. Niciun serviciu plătit nu este activat implicit.
6. Fetch și verificare față de ultimul `main`, secret scan, diff și verificări
   pe commitul final; push și PR la finalul etapei autorizate. Migrarea remote,
   activarea preview, merge și producția rămân operații distincte.
