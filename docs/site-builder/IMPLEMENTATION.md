# AVYRON OS · cunoștințe și operațiuni agenție

Bază verificată: `01acfb909a7026731f2542f17da00bb3391f99a3` (`origin/main`). Modificările se livrează prin ramură și PR; acest document nu confirmă un deploy sau aplicarea migrării în producție.

## Suprafețe

- `/profil?tab=commercial-codes`: două mini-dashboarduri separate pentru coduri servicii / produse, căutare, copiere identificator/SKU/cod contabil, configurarea existentă și evidența câmpurilor lipsă.
- `/profil?tab=newsletter`, fila Resend: starea configurării, contactele native, evenimentele verificate din ultimele 30 de zile, pipeline, căutare, responsabil, reconciliere prin GET și acces la editorul/sincronizarea existente. Datele sunt limitate la campaniile AVYRON și webhookurile procesate; nu reprezintă întregul cont Resend.
- `/profil?tab=skill-site-builder`, Cunoștințe și agenți: 14 profile de domeniu, trei handoffuri Markdown, sursele caruselelor publicate, catalogul de efecte și proveniența cercetării. Resursele existente permit încărcări și domenii personalizate; securitatea fișierelor externe rămâne obligatorie.
- Navigare: Avy Skills înainte de AVYRON OS; AVY Core, AVY Engine și Centre AVYRON OS consecutive. Drepturile existente rămân în vigoare.

## Date și API

Migrarea aditivă `0108_agency_knowledge_newsletter.sql` adaugă alocarea/revizia operațională și marcajele de verificare pentru newsletter, proveniența resurselor și 14 profile comune. Nu cere migrările din PR-urile deschise 113–116. Nu rescrie instrucțiunile master sau versiunile existente; seedurile folosesc identificatori stabili și `INSERT OR IGNORE`.

Înainte de aplicare: backup D1 conform procedurii existente, verificarea registrului migrărilor și aplicare o singură dată prin fluxul de release. Recuperarea codului anterior poate lăsa coloanele aditive în baza de date; nu se recomandă ștergerea lor ca rollback automat. Migrarea nu modifică obiecte R2, secrete sau furnizori.

API-uri noi, autentificate și `private, no-store`:

- `GET /api/newsletter/admin/operations`
- `PATCH /api/newsletter/admin/campaigns/:id/assignment`, cu `revision`
- `POST /api/newsletter/admin/operations/reconcile`, numai citire de la Resend, maximum cinci campanii pe cerere și șase cereri/minut la nivel global
- `GET /api/skills/site-builder/knowledge`
- `GET /api/skills/site-builder/agents/{codex,claude,lovable}.md?domain=DOMENIU`
- `POST /api/skills/site-builder/sources/sync`, creează drafturi, nu aprobă

Controlul de acces, MFA, CSRF și limitele existente sunt reutilizate. Alocarea folosește compare-and-swap, iar sincronizarea caruselelor se anulează atomic dacă publicarea se schimbă între citire și scriere. Sursele retrase sunt arhivate pentru utilizările viitoare; istoricul deja creat rămâne nemodificat.

## Agenți și calitate

Handofful se generează din versiunea publicată a skillului, contractul comun și maximum trei referințe aprobate relevante. Are versiune și ETag. Copiile Markdown din repository sunt puncte de intrare; exportul autentificat din OS include configurația operațională curentă. După schimbarea contractului comun, rulați `node --experimental-strip-types scripts/sync-site-builder-guides.mjs`, apoi aceeași comandă cu `--check`; testele verifică și concordanța documentelor.

Leads și producția AI pentru proiectul agenției `avyron-web` primesc un rezumat de maximum două resurse aprobate, prioritizate după domeniul identificat. Contextul nu citește proiecte private, fișiere sau documentele altui beneficiar. Pauza skillului oprește acest rezumat. Nu există publicare, contactare sau aprobare automată nouă.

Rafinarea textului Site Builder trimite brief-ul compact și referințe scurte, păstrând integral instrucțiunile aprobate și contextul în handofful istoric. Nu se reduc calitatea imaginilor master, modelele aprobate, cotele sau nivelul livrabilului. Mockup, referință de catalog, demo și integrare verificată sunt stări distincte.

## Furnizori și limite

Resend reutilizează `RESEND_API_KEY`, `RESEND_MARKETING_SEGMENT_ID`, `RESEND_MARKETING_FROM` și `RESEND_WEBHOOK_SECRET`; interfața nu afișează valorile. Secretul prezent indică „configurat”; timestampul API și webhookurile sunt dovezi separate. Nu se atribuie newsletterelor limitele produsului transactional și nu se inventează o cotă Free. Limitele reale se verifică în contul Resend înainte de trimitere, în fluxul existent cu confirmare.

Nu s-au trimis e-mailuri, activat servicii plătite, schimbat modele ori scanat fișiere externe. Încărcările sensibile care nu îndeplinesc condițiile antivirus/compliance existente rămân blocate. Markdownul intern generat nu este tratat ca upload extern.

Codex, Claude și Lovable primesc instrucțiuni portabile; exportul nu pornește acești agenți și nu consumă credite Lovable. Mac-ul închis nu este compensat de un document: numai joburile deja configurate în Workers/Queues pot rula în cloud, în limitele autorizate.

## Validare și lansare

Testele folosesc SQLite cu migrările reale, API-uri Hono și furnizor simulat, apoi Chromium/WebKit cu utilizatori sintetici. Nu echivalează cu verificarea unui cont real Resend sau cu acceptanța în producție. Rezultatele exacte sunt consemnate în PR.

După merge/deploy autorizat: aplicați 0108 înainte de noul API, verificați rolurile reale, deschideți listele de coduri, alocați o campanie de test, reconciliați un broadcast nativ fără trimitere și confirmați un webhook real. Aprobați explicit referințele dorite, descărcați cele trei handoffuri și verificați noul context într-o ciornă. Nu activați trimiteri pentru a testa un simplu ecran.

Proiectul cabinetului și PR-ul său sunt excluse. Nu se modifică designul public delogat.
