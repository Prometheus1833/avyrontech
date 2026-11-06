# Căutare directă și AVY ChatBot AI

Task din 6 noiembrie 2026, ramură `codex/dashboard-search-chatbot-2026-11-06`, pornită din `67a22230f55096701a0054bd581a8b310dba19d6` (PR #96, inclusiv #94–#95). `main` verificat la început: `dcfd638`. Acest document descrie implementarea locală, nu un release în producție.

## Navigare și interfață

Financiar este în **Principal**, cu aceleași permisiuni granulare. **Platformă → AVY ChatBot AI**, înainte de Recenzii, reutilizează `tab=ai-os` și permisiunile AI existente. Butonul „Întreabă AVY” din bara superioară a dashboardului este eliminat. Consola avansată rămâne la `/intern/ai-os`; parametrul `ai_panel` deschide panoul solicitat.

Căutarea este un câmp editabil permanent, cu sugestii ancorate sub el, fără dialog, fundal blocant sau capturarea focusului. Suportă diacritice, termeni multipli, secțiuni autorizate și configurări individuale ale serviciilor; nu indexează documente private sau date ale clienților. Săgeți / Enter / Escape și Ctrl/⌘K sunt disponibile. Ultimele cinci destinații sunt locale, separate după utilizator și filtrate din nou după drepturi; textul căutat nu este memorat. Panoul se adaptează dimensiunii ferestrei și tastaturii mobile.

Etichetele iconurilor folosesc tooltipurile Radix deja instalate, cu portal și activare la hover/focus, păstrând acțiunile, mini-panourile și notificările native. Elementele iconice au etichete accesibile și fără hover pe mobil.

## Agentul public existent

Pagina dedicată include test de conversație, configurare aprobată explicit, istoricul recent al agentului `avy`, transcrieri autorizate și diagnosticul configurației/furnizorului/cotei. Testul folosește chiar `/api/ai/chat`, cu identificator sintetic nou per conversație, și este înregistrat în istoricul nativ. Erorile păstrează textul pentru reîncercare. Revizuirea configurației nu activează furnizori și nu schimbă bugete. Citirea versus editarea este stabilită de API-ul AI existent; editarea rămâne rezervată Ownerului conform politicii acestuia.

Backendul permite întrebări generale chiar fără potrivire în baza comercială, păstrează ultimele șase mesaje și folosește contextul anterior pentru continuări. Saluturile simple sunt locale, fără model sau cost de tokenuri. Prețurile și afirmațiile AVYRON rămân ancorate în catalogul curent și sursele publice aprobate. Nu se acordă acces la documente private, instrumente de scriere sau căutare web. Continuarea verifică vizitatorul și agentul; un identificator de conversație singur nu permite accesul altui vizitator. Întrebările generale nu intră automat în baza de cunoștințe comerciale.

Sursele răspunsului sunt explicite: conversațional local, informație verificată, model sau generare indisponibilă. Când furnizorul, cota, modelul ori bugetul blochează generarea, nu este simulată o conversație AI reușită. Regulile existente de cost, limitare, aprobare a versiunii și oprire sunt păstrate. Diagnosticul include oprirea globală / agent și bugetul curent epuizat; disponibilitatea efectivă se revalidează la fiecare cerere.

Salvarea acceptă `expectedVersion`; o configurație veche primește 409, fără a suprascrie istoricul. O nouă versiune aprobată și politicile sale sunt salvate în același batch D1. Pagina avertizează înainte de abandonarea schimbărilor nesalvate.

## Migrarea 0097

`0097_public_chatbot_conversation.sql` actualizează numai instrucțiunile standard istorice nemodificate ale agentului AVY, inclusiv regulile cu prețuri vechi și promovarea obligatorie. Creează un snapshot aprobat nou, păstrează snapshotul anterior și copiază aceleași politici de instrumente. Saluturile și misiunea se actualizează doar când coincid exact cu valorile standard. Configurațiile personalizate sunt păstrate pentru revizuire manuală. Migrarea este idempotentă; nu modifică furnizori, cote, chei, conturi, achiziții sau ceilalți agenți.

La release, aplicați migrarea prin fluxul D1 existent înaintea verificării configurației publice și păstrați istoricul. Pentru rollback, reveniți la release-ul de cod anterior; orice revenire a configurației agentului se face explicit din consola autorizată printr-o versiune nouă, fără ștergerea istoricului.

## Acceptanță și limite

Testele backend folosesc handlerele Hono reale și SQLite migrat; furnizorii AI sunt simulați. Browserul verifică desktop/mobil, căutarea neblocantă, navigarea, etichetele, notificările, istoricul și salvarea condiționată de aprobare. Migrarea este verificată separat pentru idempotency, instrucțiuni personalizate, conservarea istoricului și a cotelor. Se verifică tipurile, lint, schema D1, buildurile Worker/Pages și dry-run API.

Nu s-a efectuat nicio conversație generativă live sau activare de furnizor în acest task. Citirea publică a listei de agenți a confirmat existența agentului AVY, fără a demonstra disponibilitatea generării. Starea reală a furnizorului și acceptanța în contul autentificat rămân verificări distincte; cheile/configurările rămase se tratează în pasul ulterior stabilit de utilizator. Nici merge, nici migrare remote, nici deploy în acest task.

Rezultat local final: **98 fișiere de teste, 859 teste trecute, 1 benchmark opțional skipped (`AVYRON_BENCH_PUBLIC_LIMITS` nu este activat)** în suita completă; **19 verificări browser trecute** pe buildul Pages de producție, inclusiv 320/390/768/1024/1440 px. `typecheck`, `lint` (zero erori, patru avertismente Fast Refresh preexistente), `audit:d1`, verificarea conținutului serviciilor și catalogului, `build:worker`, `build:pages` și `build:api` au trecut. Au fost inspectate vizual capturile de căutare pe mobil și configurare pe desktop. Un test vechi de navigare din PR #96 a fost actualizat pentru mutarea cerută a Cariere/Biblioteca Artefacte în AVYRON OS. O întrerupere a chatului în testarea de dezvoltare a fost urmărită până la reîncărcarea Vite în timpul formatării; testul a trecut ulterior atât pe server stabil, cât și pe buildul de producție.
