# Site Builder · Etape și organizarea proiectelor

Branch: `codex/site-builder-stages-projects-2026-11-09`.
Base: `7322cf40e09e20b8b6b22a0f18090df574f9f15e` din `origin/main`, verificat la începutul lucrării.

## Suprafețe

- `/profil?tab=skill-site-builder` → **Etape**, imediat după Monitorizare: cele opt faze cerute, navigare compactă, căutare, resurse paginate, creare/editare, documente/imagini, aprobare, arhivare și export Markdown pentru agent.
- `/profil?tab=projects` și vizualizarea internă reutilizată: pipeline și listă pe aceeași selecție, căutare fără diacritice după proiect/client/servicii/URL, filtre după tip/client/colecție/etapă și sortare după actualizare/nume/termen. Proiectele finalizate apar în ambele vizualizări. Arhivatele/anulatele au o colecție separată.
- Pipeline-ul păstrează cele patru etape native: Propus, În dezvoltare, Testare, Finalizat. Cele opt etape Site Builder sunt biblioteca procesului agenției; nu înlocuiesc statusurile proiectelor și nu modifică automat datele clienților.
- Fiecare coloană are înălțime independentă și afișează inițial maximum cinci fișe, cu extindere explicită. Lista folosește rânduri comparabile, fără grupări imbricate după serviciu. Detaliile financiare respectă redacția API existentă.
- Actualizarea la 30 de secunde și evenimentele native nu mai demontează zona proiectelor. Filtrele și extinderile sunt păstrate; o eroare temporară afișează reîncercare și păstrează datele încărcate anterior. Răspunsurile 401/403/404 elimină datele afișate. Clientul API păstrează acum statusul HTTP pe obiectul Error, fără schimbarea autentificării.

## Date și control

Migrarea aditivă `0112_site_builder_stages.sql`: o coloană nullable `stage_key`, un index și opt workflowuri inițiale în `avy_skill_resources`, în stare **draft**. Textele acoperă intrări, pași, predare, testare, calitate, eficiență și limitele automatizării. Se editează din aceeași fișă de resursă; documentele și imaginile nu sunt copiate.

RBAC nativ `skills.read/manage/approve`; mutațiile păstrează politica existentă pentru operații privilegiate, auditul și verificarea reviziei. Clientul nu primește acces la Skills. Clasificarea este validată în API și CHECK D1. Editorii vechi care omit clasificarea o păstrează. Editarea resursei retrage aprobarea. Contoarele nu divulgă drafturi cititorilor fără drepturi de gestionare/aprobare.

Exportul `/api/skills/site-builder/stages/:stage.md` include numai resurse aprobate, cu ID/revizie și continuare explicită peste 20 de resurse. Fiecare pagină și descărcare de fișier revalidează accesul; răspunsurile sunt private/no-store/noindex. Instrucțiunile etapelor nu sunt introduse automat în contextul generic al mockupului. Nu există execuție, trimitere, DNS sau deploy automat prin aprobarea unui workflow.

Uploadurile externe reutilizează FILES privat, Bouncer și backupul existente. Lipsa configurării sau conformității blochează fișierele sensibile. Notele/generările interne nu folosesc antivirusul. Nu s-au activat furnizori, costuri, conturi sau stocări suplimentare.

## Lansare și revenire

Schema se aplică înaintea API-ului și frontendului, după verificare/backup. 0110 și 0111 sunt rezervate de alte PR-uri; 0112 nu depinde de tabelele lor. Nu aplica automat schimbările acelor PR-uri. O schemă lipsă răspunde explicit `skills_not_migrated`.

Rollback: revino la API/frontend anterior și păstrează coloana nullable și resursele introduse. Nu șterge documente sau obiecte pentru revenirea interfeței. Backupurile folosesc strategia existentă, nu un sistem paralel.

## Limite

- Lista proiectelor continuă să folosească API-ul nativ, care returnează maximum 200 de proiecte autorizate. Interfața precizează numărul încărcat și avertizează la atingerea limitei; nu pretinde că filtrează întregul CRM dincolo de acest lot.
- Workflowurile sunt instrucțiuni inițiale pentru revizuire umană, nu dovada finalizării unei etape sau a unei automatizări externe.
- Producția, migrările remote și proiectul cabinetului de avocatură nu sunt modificate în această lucrare.

## Validare

Verificări locale:

- **77 teste API/unitare trecute** în Avy Skills, Project Workspace, Project Summary, persistența sesiunilor și centrul de aprobări. SQLite aplică toate migrările; verifică resursele reale, reviziile, aprobarea/reaprobarea, separarea etapelor/rolurilor, revocarea, paginarea și exporturile. Furnizorul antivirus/AI este simulat în testele care îl folosesc; nu este o scanare/inferență verificată live.
- Centrul de aprobări: testul selectează explicit versiunea curentă a tipizatului, fără a depinde de ordinea SQL. Un test separat confirmă că retragerea unei versiuni istorice este refuzată și conținutul său rămâne neschimbat.
- **98 de scenarii browser distincte validate**, Chromium și WebKit mobil, în Skills, proiecte, financiar și fluxurile Social/AVY Core existente. După adaptarea selectorului de navigare mobil dintr-un test existent, acesta a fost reverificat în ambele motoare. Ultimele **10 verificări ale proiectelor** au fost repetate pe buildul final, inclusiv linkul site-ului din listă și redacția financiară.
- Layout verificat la **320/390/768/1440 px**, fără overflow orizontal; nicio abatere automată WCAG 2 A/AA și 2.1 AA detectată în regiunile noi Etape/Proiecte. Nu reprezintă certificare completă sau test pe dispozitiv fizic.
- `npm run typecheck`, `npm run lint`, `npm run audit:d1`, `SERVICE_CONTENT_SNAPSHOT_SKIP=1 npm run build:pages`, `SERVICE_CONTENT_SNAPSHOT_SKIP=1 npm run build:worker`, `npm run build:api`, `npm run build:email`: trecute. Pages include buildul static și prerender; API/email folosesc numai dry-run. D1: integritate `ok`, fără încălcări FK. SEO tehnic: 78 rute indexabile și 212 rute publice noindex valide; nu dovedește indexare în Google.
- Lint: zero erori; patru avertismente React Fast Refresh preexistente în LogoLoader/StageProvider/StudioParts. Buildurile păstrează avertismentele existente privind mărimea unor chunkuri și comentariile din Zod.
- Browserul și previewul de test sunt închise după verificări. Nicio comandă de release remote, migrare remote sau operațiune comercială reală.

CI este verificat separat pe revizia PR-ului; rezultatul local nu este prezentat drept deploy sau funcționare verificată într-un cont de producție.
