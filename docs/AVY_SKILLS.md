# Avy Skills

Registru intern peste autentificarea, RBAC, CRM, proiectele, AI Core, coada ASYNC_JOBS și R2 existente. Nu introduce furnizori, conturi, abonamente sau servere noi. Biblioteca nu este disponibilă clienților și nu se indexează.

## Intrări și utilizare

Grupa **Avy Skills**, spre finalul navigării desktop și mobile, conține:

- `/profil?tab=skill-site-builder`: brief minim, profil de nișă, concept HTML responsiv fără apel AI, rafinare opțională a brief-ului, descărcare HTML/Markdown și instrucțiunile originale folosite.
- `/profil?tab=skill-logo-engine`: brief de identitate și explorări de compoziție, distincte de livrarea comercială 2D/3D. Link spre produsul Logo Studio existent; tarifele și licențele nu se modifică.
- `/profil?tab=skill-media-generate`: direcție vizuală și, la solicitare explicită, imagine generată prin modelul image din AI Core. Mastere wide 1920×1088, square 1920×1920 sau portrait 1088×1920, fără reducerea automată a calității când cota este epuizată.

Date obligatorii: afacere și activitate. Obiectivul, preferințele, contactele, trei conturi sociale și contextul nativ sunt opționale. Proiectele sunt citite din API-ul nativ, iar butonul **Pregătește mockup** din fișa leadului păstrează identificatorul nativ. Clienții și proiectele viitoare nu cer conturi/CRM duplicate.

Atelierul pregătește concepte private. Monogramele nu sunt logo-uri originale finale, iar randarea CSS Media este un reper de compoziție. Modul imagine este distinct și produce un fișier binar real. Aprobarea internă nu publică, transmite sau implementează site-ul final.

## Cunoștințe și versiuni

### Site Builder · Etape

Lângă **Monitorizare**, **Etape** organizează opt faze: Exemplu Vizual, Rafinare, Integrări Suplimentare, Funcții Speciale, Domeniu/DNS/Build, Securitate, CRM/Funcții și Lansare. Fiecare prezintă scopul, rezultatul urmărit, punctul de control uman și resursele sale. Acesta este workflowul reutilizabil al agenției, nu progresul unui proiect sau o comandă de execuție automată.

Migrarea append-only `0112_site_builder_stages.sql` adaugă `stage_key` nullable și index în **aceeași** tabelă `avy_skill_resources`. Resursele existente rămân neclasificate; documentele și imaginile folosesc aceleași obiecte private, scanare, backup și permisiuni. Cele opt workflowuri inițiale sunt salvate în D1 ca **ciorne**, editabile și supuse aprobării. Clasificarea poate fi schimbată sau eliminată fără copierea fișierului. Editorii vechi care omit `stageKey` păstrează clasificarea. Editarea retrage aprobarea, iar revizia împiedică suprascrierea unei modificări concurente.

- `GET /api/skills/site-builder?stage=visual&resourceOffset=0&q=...`: resurse paginate, cu totaluri pe etapă filtrate după permisiuni. Celelalte chei sunt `refinement`, `integrations`, `special-features`, `domain-build`, `security`, `crm`, `launch`.
- `POST /api/skills/site-builder/resources` și `PATCH /api/skills/site-builder/resources/:id`: câmpul opțional `stageKey`, validat în API și în D1; etapele nu se pot aloca altor skilluri.
- `GET /api/skills/site-builder/stages/visual.md`: handoff privat pentru agent, cu ID și revizie, numai din resurse aprobate. Fără aprobare răspunde `409 stage_review_required`. Exportul este paginat la 20 de resurse și indică explicit continuarea `?offset=20`; nu limitează numărul de resurse stocate. Accesul este revalidat la fiecare citire, inclusiv pentru fișierele referite.

Instrucțiunile unei etape nu intră automat în contextul generic al mockupului. Agentul citește numai etapa necesară, în contextul autorizat, și păstrează reviziile în handoff. Aprobarea unei resurse nu autorizează trimiterea, DNS, migrarea remote, consumuri plătite sau deployul. Fișierele externe rămân blocate când scanarea/conformitatea nu sunt configurate; salvarea textului intern continuă fără scanări antivirus.

**Ordine de lansare:** verificare/backup D1 conform procedurii existente → aplicarea migrării 0112 → API → frontend → smoke test autorizat. Numerele 0110 și 0111 sunt rezervate de PR-uri independente și nu reprezintă dependențe de schemă pentru Etape. Nu aplica automat migrarea sau schimbările acelor PR-uri. Revenire: restaurează versiunile anterioare API/frontend, păstrând coloana nullable și datele; nu șterge resursele sau fișierele pentru rollback.

Migrarea append-only `0100_avy_skills.sql` adaugă registrul, versiuni imuabile, resurse, execuții, fișiere generate și evenimente. Instrucțiunile inițiale includ liquid glass cu fallback, hero/footer cinematic, minimum cinci secțiuni utile, CTA-uri și trei acțiuni flotante, adaptare la nișă, accesibilitate, mișcare redusă, SEO și verificări desktop/mobil. Referințele inițiale descriu mecanisme din codul existent: beauty, reciclare, turism, gastronomie și design. Nu certifică licențele activelor sau rezultate comerciale ale proiectelor.

Modificarea instrucțiunilor creează o versiune nouă, neaprobată. Pregătirile folosesc versiunea aprobată și păstrează brief-ul, contextul și rezultatul original. Resursele revizuite revin în ciornă; nu rescriu snapshoturile folosite. Agenții primesc numai referințele aprobate relevante, încărcate progresiv, fără importarea automată a fișelor private ale clienților.

Nu există un plafon nou de pregătiri/zi sau de resurse stocate. Listele sunt paginate. Protecția împotriva rafalelor de cereri este separată de cotele AI. Contextul limitat la resurse relevante economisește tokens, fără a limita biblioteca.

## Agenți și execuție cloud

`GET /api/skills/:slug/skill.md` exportă versiunea aprobată curentă. `GET /api/skills/:slug/context?domain=...` oferă schema brief-ului și referințele relevante. `POST /api/skills/:slug/runs` acceptă `{brief, mode}`, unde mode este `template`, `ai` sau `image` (ultimul numai pentru Media Generate), plus `Idempotency-Key`. `GET /api/skills/:slug/runs/:id` oferă starea/rezultatul autorizat; exporturile și `runs/:id/skill.md` revalidează accesul. Acest ultim export păstrează instrucțiunile și referințele originale, chiar după modificarea masterului.

Cele trei directoare `.agents/skills/avy-*` conțin instrucțiunile de pornire pentru Codex, fără credențiale ori date private. Identitatea operațională existentă poate citi/utiliza skillurile numai cât timp legătura agentului, apartenența și capabilitățile sale sunt active. Nu primește drepturi administrative sau de editare a bibliotecii.

Pregătirea fără AI rulează în Worker; inferențele explicite sunt drenate din coada existentă, inclusiv prin cronul existent. Un job este revendicat atomic și nu se execută de două ori la retry. O inferență întreruptă nu se repetă automat și nu pretinde că a reușit. Accesul este verificat înainte și după inferență.

Execuția cloud nu depinde de menținerea dashboardului sau a Mac-ului deschis. **Codex local, browserul de pe Mac, contactarea leadurilor și publicarea manuală necesită operator disponibil.** Acest modul nu creează o sesiune Codex cloud și nu activează automat campanii sau generări pentru toate leadurile.

## AI și costuri

Textul folosește rolul primary existent, fără escaladare automată la secondary. Modelul image folosește transportul multipart documentat pentru FLUX.2 klein 4B și rezervă costul de output conform tile-urilor 512×512, rotunjit în sus: 313 neuroni wide/portrait și 417 square la tariful verificat. Modelele cu transport/tarif necunoscut sunt blocate până la verificare. Bugetele configurate deja în AI Core și finanțe rămân sursa de adevăr; nu sunt introduse plafoane artificiale suplimentare și nu se activează overage.

Conform [documentației Cloudflare](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/), modelul are patru pași fixați; nu există un control fictiv de creștere a pașilor. [Prețurile furnizorului](https://developers.cloudflare.com/workers-ai/platform/pricing/) trebuie reverificate când se schimbă modelul/tariful. O configurare în D1 nu dovedește o inferență reală reușită.

## Fișiere, securitate și recuperare

- **Antivirus numai pentru fișiere externe încărcate.** PDF, DOCX, TXT/MD și imagini acceptate trec prin Bouncer existent, cu maximum 25 MB conform planului Free. Nici carantina, nici semnătura MIME nu înlocuiesc verdictul CLEAN. Lipsa cheii/DPA/evaluării aprobate blochează uploadul, nu generările interne.
- Generările interne nu folosesc Bouncer și nu consumă scanări. HTML-ul este produs determinist cu escaping, fără JavaScript arbitrar, iar rezultatul AI text este afișat ca text. Imaginile generate sunt validate ca format binar, limitate tehnic și stocate privat cu checksum și versiunea exactă R2. Descărcările resping obiectele schimbate.
- Permisiuni noi: `skills.read/use/manage/approve`, disponibile în AVY STAFF. Owner/Super Admin au acces prin RBAC nativ. Un membru nu vede briefurile independente ale altuia. Contextul unui proiect/lead este revalidat; revocarea retrage previewul, exporturile, listarea și contoarele.
- Resursele de bibliotecă sunt intenționat reutilizabile la nivel de agenție după aprobare. Briefurile private nu devin resurse automat. Nu există acces implicit al chatbotului public la această bibliotecă.
- Fișierele sunt în FILES privat, sub chei opace; nu se folosește r2.dev. Metadatele sunt în D1 și intră în protecția D1 existentă. Dacă destinația DOCUMENT_BACKUPS este deja verificată privată și izolată, fișierele noi primesc o copie separată, cu checksum. Nu se creează destinații sau servicii plătite.
- La lipsa originalului, descărcarea autorizată poate recupera copia verificată prin checksum. Pentru uploadurile externe, verdictul antivirus trebuie să rămână CLEAN inclusiv la recuperare. Un original prezent, dar modificat, nu este mascat prin fallback la backup. Fără copie verificată, recuperarea este indisponibilă și nu este raportată drept protejată.

## Verificarea lansării

Separă testele locale cu furnizor simulat, schema migrată remote, versiunea Worker activă și testele într-un cont real. Nu numi inferența sau scanarea „verificată live” numai pentru că există un model/secret. Verifică PR-ul, CI, migrările/integritatea D1, deployul și răspunsurile anonime înainte de a raporta lansarea.

### Site Builder · calitate și registru de referință (2026-11-10)

Eficiența vizează pregătirea internă: brief minim, context progresiv, reutilizare și handoff cu versiuni. Rezultatul prezentat clientului urmărește calitatea maximă, indiferent de timpul sau consumul AI necesar în resursele autorizate. Un mockup determinist ori un rezumat AI reprezintă pregătire internă, cu rafinare și revizuire înainte de prezentare. Resursele insuficiente se raportează; nu se activează automat costuri sau o livrare inferioară.

Atelierul expune criteriile de identitate, mastere, experiență și predare. „Cunoștințe și agenți” conectează Biblioteca Artefacte, AVY Core, Media Generate și registrul comercial, cu linkuri filtrate după drepturi. Acestea indică instrumente disponibile în repository, nu furnizori verificați automat pentru un proiect.

`POST /api/skills/site-builder/sources/sync` sincronizează caruselele publicate, descriptorii din catalogul de efecte, capabilitățile native și, exclusiv pentru Owner/Super Admin, resursele active `internal_resources.kind=library`. Operatorii limitați primesc numai referințele aprobate, fără inventarul intern brut. Noile referințe sunt drafturi; aprobarea este separată. Sincronizarea nu accesează URL-urile externe, nu citește documentele clienților și nu preia conturi sau secrete. Revizia și conținutul surselor sunt verificate atomic; retragerea unei surse o exclude din contextul viitor, păstrând snapshoturile istorice. Verifică drepturile și absența datelor private înainte de aprobarea materialelor din biblioteca internă.

Migrarea 0117 adaugă versiunea 2 numai masterului Site Builder inițial, nemodificat. Masterele personalizate și rezultatele istorice sunt păstrate. Cele opt workflowuri actualizate intră ca drafturi distincte, pentru aprobare. Contractul comun din cod, exporturile agenților și bootstrapul local descriu aceeași prioritate de calitate; AI Core păstrează limitele și aprobările financiare existente. Compresia contextului modelului text este exclusiv pregătire internă; handofful complet și snapshotul păstrează contractul de livrare.
