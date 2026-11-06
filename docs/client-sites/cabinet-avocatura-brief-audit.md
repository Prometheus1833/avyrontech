# Cabinet de Avocatură Manuela Galuscan — auditul brief-ului

Revizie: 6 noiembrie 2026. Sursa cerințelor este solicitarea clientei și completările utilizatorului din conversație. Documentul separă exemplul public de serviciile operaționale care necesită configurare și acorduri reale.

| Cerință | Implementare în exemplul de prezentare | Ce rămâne pentru lansarea operațională |
| --- | --- | --- |
| Ton elegant, aerisit, profesional, fără comercial excesiv | Pagină principală sintetică, tipografie Source Serif 4 / Source Sans 3 locală, paletă bleumarin/ivoriu, explicații factuale și CTA de solicitare, fără rezultate garantate | Revizia finală a textelor de către cabinet |
| Peste 27 de ani de experiență | Vizibil în hero, prezentare și subsol; fără an de intrare în profesie, premii sau acreditări inventate | Confirmarea identității profesionale și a datelor legale |
| Denumire și localizare | Cabinet de Avocatură Manuela Galuscan; București, România; reprezentare în întreaga țară; fără Sector 6 | Adresa profesională exactă doar după confirmare |
| Persoane fizice și societăți | Orientare pe categorii în indexul serviciilor și explicații în paginile dedicate | Confirmarea condițiilor de acceptare a fiecărei solicitări |
| Dreptul familiei | Divorț inclusiv extraneitate; autoritate părintească, locuința copilului și relații personale; întreținere; paternitate; adopție; bunuri comune; protecție; răpire internațională și Convenția de la Haga | Evaluarea fiecărei cauze, fără răspuns juridic automat |
| Succesiuni și moșteniri | Proceduri, litigii, partaj, reducțiunea liberalităților excesive, anularea certificatelor | Analiză individuală și documente convenite |
| Drept imobiliar și proprietate | Revendicare, uzucapiune, servituți, grănițuire, partaj, ieșire din indiviziune, evacuare, apărarea și tulburarea posesiei | Analiză individuală |
| Drept civil și creanțe | Litigii, pretenții, răspundere contractuală/delictuală, anulare, rezoluțiune/reziliere, recuperare civilă/comercială | Analiză individuală |
| Dreptul muncii | Concedieri, sancțiuni, salarii, negociere, încetare; angajați și angajatori | Analiză individuală |
| Comercial și consultanță | Redactare/verificare, negociere/executare, consultanță societăți, litigii comerciale | Cadrul și întinderea colaborării |
| Acasă sintetic, dezvoltare pe pagini separate | Șase dosare de practică RO/EN, servicii, abordare, pregătire și întrebări; navigare directă la secțiuni | Revizie editorială |
| Acasă / Despre / Arii / Programări / Articole / Contact | Navigație completă, RO/EN pe pagini echivalente, breadcrumbs vizibile și structurate | Confirmarea arhitecturii comerciale finale |
| Estimare până la 5 pagini și arii/articole dedicate | Exemplul extins are 21 rute pe limbă, 42 în total. Meniul și paginile dedicate cerute depășesc estimarea inițială | Numărul de pagini din ofertă trebuie definit explicit; nu este presupus un buget de 5 pagini pentru toate rutele |
| Articole publicabile ulterior | Trei ghiduri informative RO/EN, cuprins, resurse oficiale unde sunt relevante; editor local de demonstrație | CMS securizat cu autentificare, revizii, preview, publicare, export și acces deținut de cabinet |
| Consultații online cu durată și cost | Formular RO/EN cu preferințe de domeniu, format, durată, dată/interval; chestionar opțional, descriere scurtă, rezumat verificabil și mesaj contextual | Durate, onorarii și disponibilitate reale, cont de calendar pe numele cabinetului |
| Plată anticipată și confirmare automată | Nu sunt simulate încasări sau confirmări reale. Fluxul transmite o solicitare prin canalul ales; nu afișează disponibilitate fictivă sau un checkout | Procesator configurat, checkout găzduit, webhook-uri semnate/idempotente, blocare interval, reconciliere și e-mail tranzacțional verificate |
| Administrare calendar și tarife | Ciornă și export local demonstrativ, fără backend public de scriere | Administrare autentificată, roluri, MFA, manual și predare |
| Anulare și reprogramare | Pagină distinctă, model fără termene/penalități inventate | Politica aprobată a cabinetului, afișată și acceptată înainte de plata reală |
| GDPR și securitate | Chestionar local fără persistență; descriere opțională limitată, cu îndrumare pentru minimizarea datelor; selecție de metadate PDF/JPG/PNG fără citirea conținutului sau upload; mesaj revizuibil; fără cont client/carduri; pagini juridice actualizate | Identitatea operatorului, temeiuri, retenție, furnizori, acorduri, transferuri, drepturi și securitate revizuite înainte de activarea colectării |
| Cost total, termen, revizii, texte, SEO, modul separat, hosting/licențe/SLA | Implementarea și SEO sunt documentate; nu sunt afișate tarife sau condiții comerciale neaprobate | Ofertă separată cu valori, termene, revizii incluse, redactare, costuri recurente, caracterul opțional/obligatoriu al mentenanței și SLA convenit |
| Domeniu, hosting și conturi pe numele cabinetului | Exemplu pe subdomeniul AVYRON, DNS/HTTPS conectate; sursă în repo AVYRON și Sites | Domeniul final, hostingul, CMS-ul, calendarul și procesatorul pe numele cabinetului, acces deplin și procedură de restaurare la predare |
| Inspirație Oana / LEX / Rainer | Structură și ierarhie profesională, servicii distincte, identitate personală; fără copierea textelor, imaginilor sau codului | Verificarea finală cu clienta |
| Mobil, iOS și Android | Layout responsiv, safe-area, formulare cu text de cel puțin 16 px, scroll tactil nativ, fallback-uri media/animation, fără video/WebGL obligatoriu | QA pe dispozitive fizice și versiunile finale de Safari/Chrome înainte de acceptanță; testul într-un viewport nu certifică fiecare sistem de operare |

## Principii editoriale și SEO

Descrierile sunt specifice fiecărei arii și includ București / reprezentare națională fără repetarea artificială a cuvintelor-cheie. Canonical, hreflang, sitemap și datele LegalService/Service sunt păstrate. BreadcrumbList reflectă structura paginilor. FAQ-urile sunt pentru orientarea vizitatorului, fără promisiunea unor rezultate speciale în Google. Nu sunt inventate adresă, barou, număr profesional, recenzii sau autorat personal al articolelor neaprobate.

Exemplul rămâne `noindex` pentru revizia cabinetului. Pregătirea tehnică SEO nu reprezintă indexare sau poziționare confirmată.

## Repere verificate

- [Google Search Central — BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [MDN — Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)
- [WebKit — Web Animations](https://webkit.org/blog/10266/web-animations-in-safari-13-1/)
- [HCCH — Convenția din 1980](https://www.hcch.net/en/instruments/conventions/specialised-sections/child-abduction)
- Exemple consultate: [LEX-AVOCAT](https://lex-avocat.ro/), [Andreea Rainer](https://www.andreearainerlaw.ro/). Oana Law Office a fost studiat anterior; recitirea din această revizie a întâmpinat timeout. Pagina UNBR cu hotărârea din 2021 a returnat 403 la recitire; nu se pretinde că exemplul are o certificare de conformitate profesională.

## Actualizare Programări

Trei etape: preferințe, situația pe scurt, solicitarea. Câmpurile chestionarului sunt opționale; aria preselectată dintr-o pagină de practică este allowlisted. Ghidajul se adaptează domeniului, iar un termen cunoscut afișează data; termenele apropiate sugerează apelul direct. Nu se emit recomandări juridice automate. Butoanele de e-mail/WhatsApp apar după verificarea rezumatului. Nu sunt solicitate nume, e-mailuri, CNP sau date de card în formular.

Documentele pot fi pregătite local prin selecție: maximum 3 PDF/JPG/PNG, total 10 MB. Nu sunt citite, încărcate sau atașate automat. Numele/dimensiunea se afișează local; mesajul menționează numai existența unor documente, fără a transmite numele. Acest control nu înlocuiește un viitor sistem securizat de încărcare și nici scanarea fișierelor.

Explicațiile repetitive despre neconfirmare/demonstrație au fost eliminate din subsol, CTA-uri și rezumat. Rămân instrucțiunile necesare despre următorul pas, onorariu, transmiterea mesajului și documente. Funcțiile de calendar conectat, plată și CMS rămân în afara implementării statice.

## Meniu și limbaj vizual — V5

Programări precedă Arii de practică în toate cele 42 pagini RO/EN, inclusiv meniul mobil. Accent de calendar cu stare curentă distinctă. Cele șase pictograme SVG sunt individualizate, cu palete discrete și elemente decorative aria-hidden. §, numerotarea și săgețile sunt texte/vector; titlurile au un ritm vizual echilibrat, iar descrierile ariilor sunt mai concrete.

Cele 11 surse fotografice active au fost inspectate. Au fost înlocuite cadrul succesiunilor și imaginea ghidului internațional cu două compoziții ImageGen native 1536×1024, ilustrative. Aceleași imagini au crop 4:3 desktop și 3:2 mobil, AVIF/WebP. Prompturi exacte și căi: assets/GENERATED-V5.md; dimensiuni/greutăți: assets/images-v5.json. `sizes` este adaptat rolului card/ghid/copertă/fundal. Nu se declară rezoluție 4K/8K.

Verificări curente: toate cele 42 pagini la 320×568, fără overflow și cu ordinea corectă a meniului. Șase pagini × trei dimensiuni (320/768/1440) cu text 130% și contrast: 18 combinații fără overflow. Meniu și carduri verificate și pe domeniul public. `visual.css`: 1954 B gzip, fără JS nou sau scheduler suplimentar. Capturi și rapoarte: output/visual-v5-proof/. Modurile de contrast și mișcare redusă rămân disponibile. QA nu înlocuiește testarea pe telefoane fizice.

## Progresul celor trei carduri — corecție

Pe mobil există exact trei carduri și o singură linie verticală continuă de 3 px, lipită de marginea stângă a acestora. Panoul sticky suplimentar, contorul separat și liniile individuale ale cardurilor au fost eliminate. Traseul se umple de la începutul primului card până la finalul celui de-al treilea, proporțional cu geometria reală a scrollului; la revenire, progresul scade. Elementul nu ocupă spațiu în flux. Desktopul păstrează trei coloane și ascunde indicatorul vertical.

Se folosește același scheduler rAF, actualizare directă scaleY, fără tranziție sau cronometru nou. ARIA expune o bară verticală unică; lista rămâne semantică. Mișcarea redusă nu dezactivează citirea progresului, numai animațiile decorative.

Verificări: build/check/toate testele trecute; teste RO/EN la 0/25/50/75/100%, revenire și schimbare mobile/desktop. Browser la 320/390/430/768/1440 px, plus text 130% și contrast la 320/430 px, fără overflow. Pe public, trei carduri, un traseu de 3 px și progres 61% → 34% la scroll în sus. Capturi și rapoarte: output/process-proof/. Gzip motion.js 3176 B și motion.css 3755 B. Fără schimbări de imagini, DNS, date sau integrări.

## Caruselul Note și repere juridice

Secțiunea de articole de pe home RO/EN este un carusel cu sens automat stânga → dreapta, invers celui de arii de practică. Reutilizează același motor și scheduler rAF. Săgeți, swipe/scroll nativ, drag cu mouse, pauză la apăsare/hover/focus, reluare explicită, tastatură, oprire offscreen/tab ascuns și mișcare redusă; efecte CSS 2.5D și fallback fără mișcare. Ambele carusele au controale și stări independente. Indexul Articole păstrează grila.

Bucla are trei articole originale. Copiile vizuale sunt aria-hidden și toate legăturile descendente sunt excluse din ordinea de tabulare. ID-urile celor două carusele și aria-controls sunt unice. Nu se adaugă imagini, dependențe sau solicitări de rețea pentru un motor separat.

Verificări: build/check/toate testele trecute. Testele RO/EN rulează pentru ambele carusele, în sensuri opuse, incluzând controale/input, buclă, copii, reduced-motion și idle. Browser: 12 combinații RO/EN la 320/390/430/768/1024/1440 px, fără overflow; text 130% + contrast la trei dimensiuni. Derulare orizontală nativă verificată, precum și comenzi independente pe public (articole în pauză, arii neafectate). Mișcare inversă observată în browser: -256,5 px, normalizată după perioada buclei. Nu se pretinde testare fizică iOS/Android. Dovezi: output/articles-carousel-proof/. Public: 42 HTML + motion.js/motion.css identice cu build-ul local, după excluderea exclusivă a scriptului Cloudflare injectat.

## Contacte plutitoare — 7 noiembrie 2026

Apel, WhatsApp și e-mail sunt circulare și verticale, unul sub altul în dreapta jos, pe desktop, tabletă și mobil. Mobil 48×48 px, gap 8 px; desktop 50×50 px, gap 10 px. Respectă safe-area. Bara orizontală și spațiul rezervat acesteia au fost eliminate. Înapoi sus este în stânga jos pe home, separat de contactele din dreapta. Destinatarii, aria-label și mesajele precompletate sunt păstrate.

Build/check/toate testele trecute. Browser: 320×568, 390×844, 430×932, 844×390, 768×1024 și 1440×1000: flex-direction column, exact trei butoane cu aceeași coordonată x și coordonate y crescătoare, fără overlap între ele sau overflow. EN la 320 px confirmat. Public la 390×844: x 315 px, y 672/728/784 px, 48×48 px, runtime 8c7ed7702a. Home RO/EN și CSS motion/editorial corespund build-ului. Dovezi: output/floating-proof/. Gzip motion.css 4094 B, editorial.css 3176 B. Fără modificări JS, imagini, DNS sau integrări.
