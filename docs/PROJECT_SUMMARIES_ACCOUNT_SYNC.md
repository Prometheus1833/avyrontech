# Rezumate de proiecte și sincronizarea conturilor

Task din 6 noiembrie 2026, pe `codex/project-summaries-account-sync-2026-11-06`, pornit din `f61b8f2` (PR #97, inclusiv #94–#96). `main` verificat la început: `dcfd638`. Implementarea descrisă aici nu reprezintă un deploy în producție.

## Rezumate unificate

Pipeline-ul, lista de proiecte, fișa clientului și mini-panoul Proiectele mele citesc aceleași înregistrări din `/api/projects` și API-ul CRM nativ. Cardurile afișează tipul proiectului, clientul, site-ul validat, bugetul autorizat, etapa, perioada planificată și serviciile efective din tabela `services`. Numele serviciilor nu reprezintă prețuri sau drepturi inventate. Datele lipsă sunt marcate explicit, iar un buget zero rămâne zero.

Tipurile au etichete românești comune; Blog profesional (`blog_profesional`) poate fi selectat la creare sau editare și este asociat categoriei existente de abonamente pentru blog, păstrând aliasul istoric `blog`. Nu se creează alt catalog de servicii.

Migrarea aditivă **0098** introduce numai `planned_start_at` și `planned_end_at` opționale în `projects`, cu validare și constrângere de ordine, plus un index neunic al e-mailurilor clienților legacy nemodificați. Datele nu se completează retroactiv din data creării, actualizării, facturării sau dintr-un termen presupus. Perioada se editează în fișa proiectului. Clientul nu primește drept de editare doar prin deținerea proiectului.

Rezumatul folosește o proiecție SQL comună pentru toate ariile autorizate, cu subinterogări indexate, fără cereri HTTP sau interogări suplimentare per card. Lista globală și Proiectele mele rămân arii distincte; Owner/Super Admin își păstrează accesul nativ. Lista staffului se aliniază accesului real la resursă, inclusiv pentru un owner explicit și pentru clienți din organizații diferite.

## Abonamente și bugete

Fișa proiectului afișează abonamentele reale asociate serviciilor sale, numai când beneficiarul abonamentului coincide cu beneficiarul proiectului: plan/SKU, stare, ciclu și următoarea facturare. Selectorul vechi care schimba doar câmpuri vizuale și cardul de plată bazat pe acel selector au fost înlocuite cu lista nativă și legături către administrarea/portalul existent. Datele istorice nu se șterg, nu se creează abonamente, facturi sau plăți automat și nu se schimbă furnizori.

Bugetele și tarifele sunt redacted în backend pentru stafful/operatorii fără `finance.read`, inclusiv în detaliu și încasările din lista de proiecte. Istoricul păstrează evenimentele, dar exclude metadatele pentru acești utilizatori, deoarece pot conține sume istorice. `finance.write` și dreptul de editare a proiectului sunt necesare pentru schimbarea bugetului. Clientul autorizat poate citi propriile valori. Dreptul global asupra proiectelor nu acordă implicit acces financiar.

Modificarea proiectului notifică listele native din aceeași sesiune; pollingul/focusul existente asigură reîmprospătarea celorlalte sesiuni. Actualizarea fișei păstrează formularul și confirmarea salvării, iar răspunsurile vechi sunt ignorate când se schimbă proiectul. La eroare, perioada și bugetul pot fi reîncercate fără simularea succesului.

## Conturi și apartenență

Reconcilierea legacy prin e-mail este reutilizată, centralizată și așteptată în `/api/auth/me` înainte de întoarcerea contului către interfață. Astfel proiectele, abonamentele, documentele și celelalte module pornesc după aceeași etapă de pregătire, fără dependența de vizitarea prealabilă a Facturilor sau Abonamentelor. Fluxurile workspace existente reutilizează aceeași funcție.

Asocierea automată se aplică exclusiv conturilor active cu e-mail verificat, fără rol de staff/admin, fără rang staff și fără principal de platformă, către clienți legacy cu `access_managed=0`. Nu creează conturi sau identități CRM. Nu înlocuiește asocierile aprobate și nu reface granturi revocate: clienții gestionați explicit rămân `access_managed=1`. Drepturile de client, proiect, mentenanță, documente, licențe și colaborări continuă să fie evaluate de modulele native; o asociere informativă nu acordă roluri, licențe sau integrări externe.

## Audit și acceptanță

[account-integration-audit.sql](../cloudflare/d1/checks/account-integration-audit.sql) este read-only și întoarce numai agregate: granturi/alocări orfane, abonamente cu beneficiar diferit și număr informativ de clienți/proiecte fără asociere. Un client fără cont sau un proiect fără client poate fi legitim. Fișierul folosește schema deja existentă în producție, fără a cere coloanele noi.

Comanda de audit, cu credențialele autorizate ale contului Cloudflare, este:

```sh
npx wrangler d1 execute avyron-db --remote --config wrangler.jsonc --env= --file cloudflare/d1/checks/account-integration-audit.sql --json
```

În acest task, o citire agregată remote a fost refuzată cu **Cloudflare 7403**. Nu există verificare curentă a înregistrărilor reale, modificări remote ale conturilor, migrări remote sau activări de furnizori. Verificările locale folosesc SQLite cu migrațiile reale, handlerele Hono și teste browser cu conturi sintetice. Configurarea cheilor/integrărilor externe și acceptanța finală în contul real rămân pasul ulterior stabilit de utilizator.

Rezultat local final: **99 fișiere, 868 teste trecute și un benchmark opțional skipped** (`AVYRON_BENCH_PUBLIC_LIMITS` neactivat). **39 scenarii browser verificate pe buildul Pages de producție**: 38 trecute inițial și verificarea de categorii repetată cu succes după actualizarea etichetei/căii către proiect; acoperă 320/390/768/1024/1440 px, carduri, salvare/eroare calendar, vizibilitate financiară, client/cont nou, proiecte multiple, abonamente, documente și chat. Capturile de proiecte la 320/1440 px au fost inspectate vizual. `typecheck`, `lint` (zero erori, patru avertismente Fast Refresh preexistente), schema/integritatea D1, buildurile Worker/Pages/SEO și API dry-run au trecut. Cele două aserțiuni de navigare învechite care au eșuat în CI-ul PR #97 au fost corectate și verificate în browser conform mutărilor cerute; nu s-a revenit la navigarea veche.
