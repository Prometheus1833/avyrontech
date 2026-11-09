# Leads Agency — implementare și verificare

Data: 9 noiembrie 2026. Bază: `7322cf40e09e20b8b6b22a0f18090df574f9f15e` (`origin/main`).
Branch: `codex/leads-agency-2026-11-09`. Starea acestei livrări: implementare locală/PR; fără migrare remote, înscrieri externe, merge sau deploy.

## Arhitectură și navigare

`/profil?tab=leads-agency`, imediat sub Leaduri în navigarea AVYRON OS. Șase vizualizări: Overview, Platforme gratuite, Comision la succes, În verificare, Oportunități, Rapoarte. Overview prezintă întâi cele cinci surse gratuite. Conturile pornesc neînregistrate și indicatorii pornesc de la datele reale din D1, fără oportunități ori venituri demonstrative.

React + componentele existente AVYRON; încărcare separată a modulului. API Hono în Workerul existent, D1 existent, autentificarea și registrul de permisiuni existente. Fără infrastructură, furnizori AI sau dependențe noi. Fără apeluri automate către platformele externe, scraping, aplicații sau transmitere de mesaje. Legăturile externe sunt deschise de utilizator.

Fișiere principale: `src/features/leads-agency/`, `src/shared/agency/`, `src/lib/leadsAgencyApi.ts`, `cloudflare/workers/api/src/leadsAgency.ts`, `leadsAgencyPolicy.ts`.

Migrarea aditivă `0113_leads_agency.sql` creează `agency_platform_accounts`, `agency_opportunities`, `agency_lead_links`, `agency_entries`, `agency_events`. Sunt păstrate tabelele existente de clienți, servicii, Leads, drepturi, audit și idempotency. Nu modifică tabelele ori deploymentul cabinetului de avocatură. Numărul este independent de migrațiile 0110–0112 aflate în alte PR-uri la audit; revalidare înainte de merge.

## Surse comerciale verificate public

Verificarea documentației publice nu echivalează cu acceptarea firmei, existența unui cont activ, accesul autentificat la RFP-uri sau confirmarea plăților. Orice condiție neconfirmată apare explicit în fișă. Data verificării publice este separată de verificarea umană a contului.

| Sursă | Categorie și cale către proiecte | Condiții și dovezi oficiale |
| --- | --- | --- |
| Infinum Alliance | A · rețea / invitații de subcontractare | [Parteneri](https://alliance.infinum.com/partners/), [aplicare](https://alliance.infinum.com/application-form/). Evaluarea companiei și interviu; fără cost suplimentar declarat. Acceptarea AVYRON și contractarea se confirmă individual. |
| GoodFirms | A · RFP public limitat și inbound | [Free/get listed](https://www.goodfirms.co/get-listed), [login](https://myaccount.goodfirms.co/users/login). Fără PRO, sponsorship sau contacte plătite; disponibilitatea fiecărui RFP se verifică după autentificare. |
| TechBehemoths | A · exclusiv profil și inbound gratuit | [Termeni](https://techbehemoths.com/terms), [înregistrare](https://techbehemoths.com/companies/get-listed), [login](https://my.techbehemoths.com/login), [România](https://techbehemoths.com/companies/romania). Deblocarea proiectelor/contactelor din CORE/PRO nu este tratată ca gratuită. |
| Clutch | A · profil Basic și cereri organice | [Get listed](https://clutch.co/get-listed), [Basic](https://vendor.clutch.co/profile/create/basic), [România](https://clutch.co/ro/developers). Limitele Basic se păstrează; nu include Clutch Verification, promovare sau Pay Per Lead. |
| Enterprise Europe Network | A · cereri și intermediere prin consilier | [Oportunități](https://een.ec.europa.eu/partnering-opportunities), [contact România](https://een.ec.europa.eu/local-contact-points/ro), [despre](https://een.ec.europa.eu/about-enterprise-europe-network), [prezentare oficială](https://een.ec.europa.eu/system/files/documents/2024-05/Info%20session%202024%20EEN%20call.pdf). Subcontractarea comercială este separată de cercetare/finanțare. Firma nu devine automat membru al rețelei. |
| AgencyListed | C · în verificare | [Pricing](https://agencylisted.com/pricing), [get listed](https://agencylisted.com/get-listed), [dashboard](https://agencylisted.com/dashboard). Profil/briefuri gratuite declarate; proiectele reale accesibile, România și contractarea necesită dovezi înainte de promovare în A. |
| Breef | B · comision după proiect | [For agencies](https://www.breef.com/for-agencies), [aplicare](https://projects.breef.com/public/apply). 15% pentru relația cu clientul în primele 12 luni, conform condițiilor publice; costurile media/producție excluse se verifică contractual. Plata ACH și eligibilitatea SRL România rămân neconfirmate. |
| Unbench | B · subcontractare | [For partners](https://www.unbench.us/for-partners), [portal](https://platform.unbench.us/), [login](https://platform.unbench.us/signin), [ghid](https://www.unbench.us/user-guides/step-by-step-guide-script-how-to-sign-up-on-unbench). Înscriere gratuită, comision după contract; procentul, limitele, contractarea și încasarea pentru România necesită confirmare. |
| INFLUR | B · marketplace digital B2B | [Homepage](https://www.influr.com/), [termeni](https://www.influr.com/terms-of-service), [despre](https://www.influr.com/about), [înscriere furnizor](https://www.influr.com/register/service-provider), [login](https://www.influr.com/login). 10% la eliberarea plății; condițiile declară IBAN/SWIFT și AED, cu perioadă de clearing. Acceptarea băncii românești necesită confirmare separată. |

Loginul public exact nu a fost confirmat pentru Infinum, EEN, Clutch și Breef: butonul indică „neconfirmat”, fără URL inventat. Pentru EEN este oferit accesul prin contactul local oficial.

Imaginile sunt locale, fără trackere externe: faviconuri publice pentru Infinum, AgencyListed, Breef și INFLUR; monograme de identificare pentru GoodFirms, TechBehemoths, Clutch, EEN și Unbench. Monogramele nu reprezintă logouri oficiale ale furnizorilor.

## Funcționalitate

- Fișe de platformă: status cont, profil AVYRON real, responsabil, note, următoarea verificare, dovezi, șase confirmări și istoric al modificărilor. Activarea sau promovarea unei surse C impune toate confirmările, o notă justificativă și surse. O sursă B nu poate fi reclasificată gratuită.
- Pipeline: Identificat → Calificat → Ofertă în pregătire → Ofertă trimisă → Negociere → Câștigat / Pierdut; editare, acțiune rapidă pentru etapă, arhivare/restaurare auditată. Cercetarea/finanțarea nu poate fi declarată contract comercial câștigat.
- Fișa oportunității: beneficiar viitor ori client nativ autorizat, email/telefon opțional, serviciu din catalogul comercial activ, sursă/referință, buget, monedă, termen, responsabil, prioritate, următoarea acțiune, contract și estimări.
- Filtre platformă, serviciu, etapă, prioritate și interval de buget cu monedă explicită. Paginare 50 rezultate. Nicio conversie valutară implicită.
- Datele de încasări, comisioane/costuri și timp sunt înregistrări manuale reale, cu referință unică și dată efectivă; nu există sincronizare bancară sau confirmare automată de furnizor. Corecțiile anulează înregistrarea cu motiv, fără ștergerea istoricului.
- Rapoartele folosesc toate înregistrările, inclusiv istoricul arhivat: oportunități, calificări, oferte trimise, contracte câștigate, valori contractate, timp, încasări și costuri pe monedă. Nu acordă scor pozitiv gratuității. Istoricul și registrul afișează ultimele 100 intrări per fișă, păstrând toate datele în D1.
- Încasarea înseamnă valoarea brută realizată înaintea reținerilor. Comisionul reținut este înregistrat separat o singură dată; banii blocați în escrow nu sunt încasări. Net de numerar = încasări brute − comisioane achitate/reținute − costuri de platformă − costuri de livrare consemnate. Nu este profit contabil și nu include taxe/costuri neintroduse. Marja estimată rămâne incompletă dacă procentul sau costul sunt necunoscute. Sumele folosesc unități monetare minore întregi și rotunjire exactă a comisionului; rapoartele refuză totaluri în afara preciziei sigure.
- Sursele cu verificări restante sunt afișate pentru revizuire; nu sunt eliminate automat pentru lipsa contractelor.

## Integrări native și limite

Transferul unei oportunități comerciale calificate utilizează aceeași funcție de creare Leads. Legătura unică și crearea leadului sunt în aceeași tranzacție D1; retry/concurența nu produc copii. Contactul deja existent este reutilizat numai dacă este accesibil utilizatorului. Leads continuă să funcționeze independent.

„Pregătește ofertă” deschide generatorul Document Center cu context autorizat citit server-side: beneficiar, serviciu, titlu de proiect viitor și descriere. Bugetul nu devine preț ofertat. Tipizatul master și prețurile de catalog nu sunt modificate. Finalizarea, aprobarea și exportul rămân funcțiile native Document Center.

„AVY Opportunity” și „AVY Margin” desemnează aici briefurile și analiza din modul. Auditul nu a identificat integrări autonome existente cu aceste nume; nu sunt simulate conexiuni. Brief Markdown descărcabil pentru Codex/agent, cu sursa tratată ca date nefiabile și interdicție de aplicare/contactare/plată/publicare fără autorizare. După transfer, agentul Leads existent poate utiliza leadul nativ în limitele sale curente. Nu se apelează modele AI și nu se consumă cote.

Notificările interne sunt deduplicate pe oportunitate/revizie și destinate responsabilului. Accesul se revalidează la citire; revocarea drepturilor ascunde notificările private. Fără email automat.

## Securitate și API

Permisiuni noi: `leads_agency.read`, `leads_agency.manage`. Owner/Super Admin folosesc drepturile native. Restul staffului are nevoie de acord explicit; șabloanele comerciale noi includ permisiunile, fără a rescrie acordurile existente. Simpla rolare ca Admin sau Client nu acordă acces. Un cont automat poate citi numai cu acord global explicit de citire și binding Leads activ; nu poate modifica ori accesa finanțele implicit.

Transferul cere separat `leads.read` și `leads.create`; Document Center cere `documents.create`; registrul financiar cere `finance.read`/`finance.write`. Asocierea beneficiarului verifică și dreptul asupra clientului. Responsabilul trebuie să fie staff eligibil. Autorizarea este recitită din D1 pentru fiecare operațiune, inclusiv după revocare.

API: `/api/leads-agency/bootstrap`, `/platforms/:id`, `/platforms/:id/history`, `/opportunities`, `/opportunities/:id`, `/opportunities/:id/archive`, `/opportunities/:id/entries`, `/entries/:id/void`, `/opportunities/:id/transfer`, `/opportunities/:id/brief`, `/opportunities/:id/document-context`, `/reports`.

Validări Zod stricte server-side, corp maxim 32 KB, SQL parametrizat, antiabuz în infrastructura existentă, `no-store` și `noindex`, chei de idempotency pentru mutații și control de revizie pentru editări concurente. URL-uri HTTPS fără credențiale/tokenuri și domenii oficiale pentru profiluri/cereri. Niciun URL de sursă nu este cerut automat de server (fără nouă suprafață SSRF). Câmpurile text sunt redate ca text, fără HTML importat. Logurile operaționale nu includ parole sau secrete; istoricul de fișă este privat. Autentificarea/MFA existente nu sunt schimbate. Nu se stochează parole ori sesiuni externe.

## Validare

- PASS: `npm run typecheck` (aplicație și Worker).
- PASS: `npm run lint`, fără erori; patru avertismente existente în componente din afara modulului.
- PASS: `npm run audit:d1`, toate migrările până la 0113 aplicate local, integritate și chei externe verificate.
- PASS: 35 teste noi de model/API, cu Hono real și SQLite migrat, tranzacții atomice, autentificări sintetice la limita testului. Include acces refuzat client A/B/Admin neautorizat, operator doar în citire, revocare, activare cu dovezi, sursă gratuită fără comision după promovare, idempotency, concurență, deduplicare Leads, izolare financiară, monede separate, rotunjire sigură, anulare istorică și context Document Center autorizat.
- PASS: suita țintită inițială cu 125 teste (include 32 dintre testele noi și regresii Leads/notificări/Document Center/operator/portal). Ulterior au fost adăugate trei cazuri noi, toate trecute în rularea celor 35 de mai sus.
- PASS: 22 teste Playwright pe buildul Pages compilat, servit de Worker local, pe Chromium și WebKit: 320/390/768/1440 px, navigare, categorii, fișe, salvare/reîncărcare, calificare/editare, transfer Leads fără duplicate, brief descărcabil, încasări/comision/raport, client neautorizat și precompletare Document Center. Testul de răspuns pierdut după commit confirmă reutilizarea aceleiași chei și o singură oportunitate.
- PASS: axe-core, reguli WCAG A/AA până la 2.2, pe overview și fișa platformei la 390/1440 px în ambele motoare; fără încălcări automate în zonele verificate. Tastatură pentru selecție și închiderea fișei; verificare vizuală desktop/mobile. Nu reprezintă o certificare WCAG, test complet cu screen reader sau test pe dispozitive fizice.
- PASS: Worker API real în Wrangler local: bootstrap, listă, rapoarte și istoric refuză anonim cu HTTP 401, JSON și `Cache-Control: private, no-store`.
- PASS: `SERVICE_CONTENT_SNAPSHOT_SKIP=1 npm run build:worker`, `SERVICE_CONTENT_SNAPSHOT_SKIP=1 npm run build:pages` (include buildul static), `npm run build:api` (doar dry run). Auditul SEO al buildurilor: 78 pagini indexabile, 212 publice noindex, fără publicarea rutei private în sitemap. Snapshotul comercial deja versionat este păstrat; nu s-a preluat conținut de producție în timpul testelor.
- PASS: gitleaks pe întreg diff-ul staged, fără secrete detectate; `git diff --check` curat. Bundle API comprimat aproximativ 2.09 MiB în dry run; modul UI separat aproximativ 19.3 kB gzip, pictograme locale aproximativ 13 kB conținut.

PASS: suita generală `npm test -- --maxWorkers=3`: 128 fișiere, 1.143 teste trecute, un test omis. Testul omis este benchmarkul opțional din `public-abuse-limits.test.ts`, activat numai prin `AVYRON_BENCH_PUBLIC_LIMITS=1`; nu este o verificare funcțională a acestui modul. Durată locală: 329,45 secunde.

[Captură desktop](previews/leads-agency-desktop.webp) · [Captură WebKit mobil](previews/leads-agency-mobile.webp).

Testele browser folosesc autentificare sintetică și API-urile reale ale modulului, executate cu SQLite; datele auxiliare Document Center sunt fixture-uri. Testul HTTP Wrangler de mai sus verifică suplimentar ruta reală neautentificată. Nu s-au testat conturi de producție, sesiuni externe, acceptări B2B sau transferuri bancare; nu au fost create înregistrări comerciale fictive în producție. Interogările contextuale sunt plafonate la 500 servicii/200 clienți/200 membri per încărcare, iar oportunitățile sunt paginate.

## Lansare graduală și rollback

1. Revalidarea branchului față de `origin/main`, verificarea coliziunilor de migrare și revizuirea PR-ului.
2. După autorizarea lansării: backup conform procedurii existente; migrare 0113 pe staging, verificarea integrității, API și frontend în staging; test autentificat cu acorduri reale și revocare.
3. Aplicarea aceleiași migrări pe D1 producție și publicarea reviziei aprobate prin fluxul existent. Fără modificări de abonament Cloudflare.
4. Test real Owner/staff autorizat/staff neautorizat/client, fișă salvată, oportunitate, transfer și generator. Datele de test trebuie etichetate și arhivate.
5. Rollback: revenire la revizia anterioară de API/frontend. Păstrează tabelele și istoricul financiar; nu executa DROP sau ștergeri automate. Modulul poate rămâne inaccesibil prin revocarea acordurilor explicite, fără a afecta Leads.

Intervenții umane rămase: înscrierea/profilurile AVYRON, acceptarea condițiilor și verificarea eligibilității, dovezile proiectelor AgencyListed, procentul Unbench, confirmarea încasărilor Breef/INFLUR pentru România și atribuirea responsabililor/acordurilor. Nu sunt necesare chei API pentru evidența și pipeline-ul implementate.
