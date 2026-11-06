# Manuela Galuscan — cabinet de avocat

Concept vizual bilingv autonom, în repository-ul `Prometheus1833/avyrontech`, fără modificarea aplicației AVYRON sau a rutelor acesteia. Numele scurt folosit în design este Manuela Galuscan; denumirea profesională exactă se confirmă la predare.

## Utilizare

Din acest director, cu Node.js 22 sau mai nou și Python 3 pentru preview:

```sh
npm run build
npm run check
npm ci
npm run test:interactions
npm run dev
```

Nu sunt necesare dependențe npm pentru build sau verificarea statică. Testele de interacțiune folosesc jsdom, instalabil prin `npm ci`. Sursa conținutului este `content.mjs`, șabloanele sunt în `scripts/build.mjs`. Ieșirea generată este `dist/`, compatibilă cu hosting static Sites și Cloudflare Pages. `.openai/hosting.json` păstrează identitatea Sites. Reîncărcarea paginilor interne funcționează fără fallback SPA.

42 de pagini, 21 în fiecare limbă: Acasă, Despre cabinet, index și șase arii de practică, Programări, index și trei articole, Contact, cinci pagini de informații legale/accesibilitate, atelier editorial. În plus, pagină 404. Fiecare pagină are HTML complet, titlu și descriere, canonical, hreflang reciproc RO/EN și x-default, Open Graph/Twitter și JSON-LD WebPage. Sitemap generat automat. Conceptul este public și `noindex, follow`; indexarea se activează numai după validarea identității și conținutului final. Nu s-a făcut nicio trimitere în Google Search Console.

## Funcții și limite reale

- Navigație responsive, selector RO/EN pe aceeași pagină semantică, legături de contact și FAQ accesibil.
- Formular de solicitare a consultației: format online/cabinet, durată preferată 30/60 minute sau recomandarea cabinetului, dată și interval preferate, fus Europe/Bucharest și rezumat. Chestionar opțional cu profil, etapă, context național/internațional, termen și descriere scurtă. Mesajul este verificat și continuat de utilizator prin e-mail/WhatsApp; nu există rezervare automată sau procesare de plăți. Niciun tarif nu este inventat.
- Atelier editorial local pentru texte, articol, imagine și onorariu în ciornă. Previzualizare prin `textContent`, salvare opțională în localStorage, ștergere și export JSON. Nu este un CMS de producție și nu modifică site-ul publicat. Imaginile alese sunt decodate în pixeli și re-encodează local un PNG pentru previzualizare, fără expunerea fișierului original ca Blob URL navigabil. Rămân în browser și nu sunt incluse în export.
- Fonturi locale cu licențe OFL, imagini AVIF/WebP responsive, lazy loading în afara hero-ului, script mic fără biblioteci. Intro decorativ pe Acasă de 0,75 secunde, fără blocarea interacțiunii; dezactivat la `prefers-reduced-motion`. Nu este o garanție de încărcare sub 2 secunde în orice rețea.
- Fără analytics, pixeli, iframe, încărcare documente, conturi sau formular extern. `_headers` conține CSP restrictiv și antete defensive; În HTML sunt aplicate prin meta numai restricțiile CSP `object-src`, `base-uri` și `form-action`, compatibile cu scriptul de protecție injectat de hosting. Pe publicarea statică Sites nu au fost observate antetele din `_headers`; acestea sunt pregătite pentru Cloudflare Pages și necesită verificare la migrare. Pe adresa Sites a fost observat cookie-ul tehnic Cloudflare `__cf_bm`, menționat în politica de cookies. Infrastructura are propria prelucrare tehnică; nu se declară conformitate GDPR completă sau certificare WCAG.
- Datele telefon/e-mail și experiența de peste 27 de ani provin din brief. Nu sunt publicate adresă exactă, CIF, acreditări suplimentare, rezultate, testimoniale, premii sau o fotografie fictivă a avocatei. Website-ul bilingv nu promite consultații în engleză fără confirmare.

## Predare și integrări operaționale

Înainte de activarea programărilor și plăților: confirmați titularul cabinetului, identitatea profesională, sediul și datele legale; creați conturile CMS, calendar, domeniu/hosting și procesator pe numele cabinetului; folosiți roluri și MFA. Alegeți un calendar cu disponibilitate autoritară, durate/buffere și blocarea concurentă a intervalelor. Rezervarea trebuie reconciliată server-side cu webhook-uri de plată semnate și idempotente, tranzacții eșuate/dublate și expirarea rezervărilor provizorii. Datele de card se introduc exclusiv pe pagina procesatorului; nu în acest site. Confirmați onorarii, taxe aplicabile, anulări, rambursări și mesajele tranzacționale cu cabinetul. Verificați livrarea e-mailurilor și reconcilierea calendarului înainte de a declara funcțiile active.

CMS-ul de producție trebuie să ofere editare texte/articole/imagini/tarife, previzualizare și publicare cu acces limitat, revizii și export al datelor. Refolosiți sistemele AVYRON existente acolo unde sunt potrivite și separați cabinetul de celelalte proiecte. Exemplul local nu reprezintă o integrare activă în AVYRON OS.

Documentați operatorul și persoanele împuternicite, scopuri/temeiuri, retenție, cereri GDPR, transferuri, copii de siguranță și accesul la documente. Evitați câmpuri libere cu date sensibile înainte de stabilirea relației profesionale; încărcarea documentelor necesită un canal autentificat, acces controlat și politici de păstrare. Textele juridice sunt modele de lucru care trebuie revizuite de cabinet. Nu există un set universal de politici care să certifice orice implementare.

Predarea include acces complet la conturile cabinetului, surse, instrucțiuni de editare, backup/export și o verificare a restaurării. Mentenanța, găzduirea, licențele, costurile integrărilor, numărul de revizii și SLA-ul se stabilesc într-o ofertă separată; acest concept nu angajează AVYRON la tarife sau timpi de răspuns neaprobați. Nu s-au înregistrat conturi în numele clientei.

## Cercetare și resurse

Exemple studiate exclusiv pentru structură: [Oana Law Office](https://oanalawoffice.ro/), [LEX-AVOCAT](https://lex-avocat.ro/), [Andreea Rainer](https://www.andreearainerlaw.ro/). Textele, codul, identitatea și imaginile acestora nu au fost copiate.

Repere: [UNBR — publicitate și platforme online](https://unbr.ro/hotararea-consiliului-unbr-nr-195-din-10-11-septembrie-2021-privind-modificarea-si-completarea-statutului-profesiei-de-avocat-referitor-la-publicitate-ghidul-privind-utilizarea-platformelor/), [EDPB — principii GDPR](https://www.edpb.europa.eu/topics/key-gdpr-concepts/basic-principles_en), [Comisia Europeană — protecția datelor prin proiectare](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en). Aplicarea concretă necesită revizie profesională; nu sunt promise rezultate juridice.

Fotografiile ilustrative actuale sunt specifice consultației juridice și celor șase arii de practică, generate cu ImageGen la rezoluție nativă **1536 × 1024**, fără mărire artificială. Aceleași fotografii au decupaje distincte pentru desktop, mobil și hero, livrate prin `picture` în AVIF/WebP. Hero-ul mobil este aproximativ 11–19 KB AVIF; varianta desktop de 800 px este aproximativ 25 KB. Prompturile exacte, proveniența și fonturile sunt documentate în [assets/GENERATED-V2.md](assets/GENERATED-V2.md). Originalele PNG rămân în workspace și sunt excluse din Git/deploy. Imaginile sunt ilustrative și nu reprezintă sediul, clienții sau portretul real al titularei.

Direcția vizuală folosește Source Serif 4 și Source Sans 3 găzduite local, un hero cu textul separat de fotografie și carduri tematice. Identitatea este „Cabinet de Avocatură”; localizarea este București, România. Conținutul și datele structurate descriu posibilitatea reprezentării clienților din întreaga țară, fără adresă exactă inventată. Controlul lingvistic afișează numai limba curentă (RO sau EN) și trece direct la pagina echivalentă. Butonul alăturat de accesibilitate oferă text 100/115/130%, contrast ridicat și resetare, cu preferințe locale persistente.

## Domeniu și publicare

Adresa principală este `https://cabinet-avocatura.avyron.eu/`, conectată prin CNAME DNS only la `custom-domains.chatgpt.site`, cu cele două TXT de validare emise de Sites. La verificarea din 6 noiembrie 2026, domeniul, furnizorul și SSL sunt active. Canonical, hreflang, sitemap și imaginile sociale folosesc subdomeniul AVYRON. Adresa tehnică Sites rămâne disponibilă. Variabila `SITE_ORIGIN` poate fi folosită explicit pentru un alt mediu de publicare; build-ul implicit păstrează domeniul conectat. Starea DNS și pașii de verificare sunt documentate în `docs/client-sites/` din repository-ul AVYRON.

Verificarea publică a detectat și scriptul de protecție Cloudflare injectat de infrastructură, distinct de codul aplicației. Acesta și cookie-ul tehnic sunt menționate ca comportament al furnizorului. După restabilirea accesului la browser au fost verificate vizual pagina principală la 1440/390 px, meniul mobil și programările RO/EN la 320 px. Calendarul și antetul au fost corectate pentru 320 px, iar lățimea documentului corespunde lățimii disponibile. Au fost testate selectarea datei/orei și confirmarea exclusiv demonstrativă. Aceste verificări nu reprezintă certificare WCAG sau un audit complet al Core Web Vitals.


## Carusel, parcurs și contact contextual

Colecțiile de arii de practică (landing și index, RO/EN) sunt carusele orizontale cu scroll nativ, swipe, drag cu mouse, săgeți și tastatură. Derularea automată deplasează cardurile spre stânga și se oprește la apăsare/hover/focus, în afara ecranului, în tab ascuns și la mișcare redusă. Focusul și săgețile solicită repornire explicită prin controlul de mișcare. Copiile vizuale de buclă nu intră în ordinea de tab sau în arborele accesibil. Cardurile au perspectivă CSS 2.5D și zoom discret la hover; fără WebGL sau librărie de animație.

Un singur scheduler requestAnimationFrame deservește caruselul și indicatorul parcursului. Pe mobil, bara sticky urmărește geometria celor trei etape la scroll, indicând etapa și progresul. Nu folosește un cronometru. Conținutul rămâne un ordered list semantic, disponibil fără JavaScript.

Subsolul are o fotografie cinematică juridică statică, nativă **1774 × 887 px**, cu decupaje desktop/mobil și încărcare lazy. AVIF 17–33 KB, fără mărire artificială; promptul și proveniența: [assets/GENERATED-V3.md](assets/GENERATED-V3.md). Fundalul se elimină la contrast ridicat.

Landing-ul are apel, WhatsApp și e-mail plutitoare, într-o coloană pe desktop și într-o bară compactă pe mobil. Telefon: +40 723 228 582; e-mail: manuela.galuscan@yahoo.com. Legăturile WhatsApp/e-mail pregătesc mesaje RO/EN. Dintr-o arie de practică, programările primesc un parametru allowlisted `area`; alegerea domeniului, formatului, duratei și preferințelor de dată/interval actualizează draftul de contact. Mesajul solicită disponibilitatea, onorariul și pașii următori, fără avertizări redundante. Site-ul nu trimite mesaje automat și nu verifică existența unui cont WhatsApp pe numărul cabinetului. Utilizatorul revizuiește mesajul în serviciul ales.

Verificare: `npm run test:interactions` include testele de formular/editor, precompletarea contextuală, pauza și reluarea caruselului, touch-hold, tastatura, bucla, idle în afara ecranului/tab ascuns, mișcarea redusă și progresul la scroll. Testele în browser folosesc viewporturi 320/390/1440 px, inclusiv text 130% și contrast. Browserul integrat permite testarea dragului și scrollului orizontal nativ; injecția de gesturi tactile fizice nu este disponibilă, deci nu se declară testare pe un telefon fizic.

## Revizie editorială față de brief

Auditul complet al cerințelor este în `docs/client-sites/cabinet-avocatura-brief-audit.md` din repo AVYRON. Toate serviciile enumerate în solicitare sunt verificate automat: inclusiv Haga, paternitate, reducțiunea liberalităților, tulburarea posesiei, negociere/executare de contracte și asistență pentru angajați/angajatori.

Cele șase pagini de practică în fiecare limbă au acum explicații dezvoltate, servicii, aspecte analizate, pregătirea documentelor, trei întrebări frecvente și ancore directe. Indexul oferă orientare pentru persoane fizice și societăți. Cele trei ghiduri RO/EN au cuprins și conținut extins; materialul despre extraneitate indică resursa oficială HCCH. Publicarea lor ca opinii ale cabinetului necesită revizia sa. CTA-ul principal este „Solicitați o consultație”; mesajele și pagina de preferințe nu promit o rezervare automată.

SEO: descrieri specifice fiecărei arii, ierarhie vizibilă și BreadcrumbList corelat cu ruta canonică. Noindex rămâne activ pe exemplul de prezentare. Nu se declară indexare, poziționare sau rezultate speciale Google.

Două imagini ImageGen suplimentare, native 1536 × 1024, sunt folosite pentru prezentare și fundalul consultațiilor; [prompturi și fișiere](assets/GENERATED-V4.md), greutăți în `assets/images-v4.json`. Cadru luminos AVIF 18–82 KB în funcție de variantă; fundal cinematic AVIF 22–47 KB. Aceeași sursă are decupaje desktop/mobil, fără mărire artificială. Secțiunile folosesc treceri tonale și animații scurte de intrare. Conținutul este vizibil implicit, inclusiv fără Web Animations; mișcarea redusă și tabul ascuns anulează animațiile. Nu se adaugă video sau WebGL.

Compatibilitate: `viewport-fit=cover`, safe-area, câmpuri de minimum 16 px pe mobil, scroll tactil nativ, ascultători media cu fallback `addListener`, eliminarea dependenței frontend de Array.at, ancore și details native. Panoul de accesibilitate are înălțime limitată la viewport și scroll propriu în landscape. Au fost verificate 42 de pagini la 320 px, normal și text 130% + contrast, plus 54 de combinații pagină/dimensiune: 320×568, 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024, 844×390 și 1440×1000. Aceasta este QA în browser, nu o certificare a fiecărei versiuni de iOS/Android sau testare pe telefon fizic.

Repere tehnice: [WebKit — Web Animations](https://webkit.org/blog/10266/web-animations-in-safari-13-1/), [MDN — Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [Google — BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).

## Revizia paginii Programări

Pagina RO/EN are un parcurs în trei etape, text mai mare, instrucțiuni directe, rezumat și butoane clare. Calendarul fictiv a fost eliminat în favoarea unor preferințe reale de dată/interval; nu se afișează disponibilitate neverificată. Repetițiile despre demonstrație din subsol și etichetele editoriale redundante au fost eliminate.

`booking.js` și `booking.css` sunt livrate numai pe pagina de programări. Chestionarul și descrierea de maximum 1200 de caractere rămân în memoria paginii, fără scriere în localStorage/server. Descrierea și celelalte răspunsuri opționale intră în mesajul ales de vizitator. Fișierele PDF/JPG/PNG (maximum 3, total 10 MB) sunt selectate local: codul citește numai numele, dimensiunea și tipul, fără accesarea conținutului și fără upload. Mesajul menționează doar existența documentelor; numele fișierelor rămân în pagină. Atașarea se face separat, prin canalul convenit. Validarea de tip/dimensiune nu este scanare antivirus. Resetarea elimină răspunsurile și metadatele locale.

Testele verifică termenele condiționale, contextul pe arie, data/intervalul, mesajele RO/EN, lipsa citirii și trimiterii fișierelor, limitele selecției, randarea ca text și resetarea. Verificările de compatibilitate sunt în browser, nu pe dispozitive fizice iOS/Android.
