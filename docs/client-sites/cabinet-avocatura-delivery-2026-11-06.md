# Cabinet de Avocatură — livrare, 6 noiembrie 2026

## Publicare verificată

- URL: https://cabinet-avocatura.avyron.eu/; pagini revizuite: /programari/ și /en/appointments/.
- Sites: versiunea 16, `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_19ddfd297640819190769dd4cfdb6aa6`.
- Deployment: `appgdep_6aeef47322d88191b9e3e05754fe0925`, `succeeded`.
- Sursă Sites: `778a6e72120758ef57796cb5ef462f0e09716200`; runtime `04e88e63f7`.
- AVYRON: `client-sites/cabinet-avocatura/`, ramura `codex/cabinet-icons-preview-2026-11-07`, pornită din `origin/main` la `6d00e41`. PR #102 este integrat; această revizie continuă PR #110, deschis, fără merge automat.
- DNS existent păstrat; HTTPS public verificat cu validarea normală a certificatului.

## Programări — versiunea curentă

Trei etape: consultația, situația pe scurt și solicitarea. Text și controale mai mari, spații reduse, instrucțiuni directe. Calendarul cu disponibilitate fictivă a fost înlocuit cu data și intervalul preferate, raportate la Europe/Bucharest. Format online/cabinet; durată 30/60 minute sau recomandarea cabinetului.

Chestionar opțional: persoană/societate, etapă, context național/internațional, termen și descriere de maximum 1200 caractere. Ghidaj adaptat ariei; termenele apropiate sugerează apelul direct, fără sfat juridic automat. Răspunsurile rămân în memoria paginii, fără localStorage/server. Resetarea le elimină.

Documente: maximum 3 PDF/JPG/PNG și 10 MB total. Selecție locală de nume, tip și dimensiune; codul nu citește conținutul, nu încarcă și nu atașează automat. Mesajul menționează existența documentelor, fără numele fișierelor. Atașarea se face separat în canalul convenit. Validarea metadatelor nu este scanare antivirus.

Rezumat verificabil, apoi e-mail sau WhatsApp către destinatarii din brief. Mesajele nu se trimit automat. Cabinetul comunică disponibilitatea, onorariul și condițiile înaintea întâlnirii. Repetițiile despre demonstrație/neconfirmare au fost eliminate din subsol, CTA-uri și etichetele editoriale; paginile juridice descriu comportamentul actual.

## Conținut și design păstrate

42 pagini (21 RO + 21 EN), șase arii complete, trei ghiduri, fotografii AVIF/WebP cu încadrări desktop/mobil, fundaluri cinematice, carusel și progres la scroll. Cabinet de Avocatură Manuela Galuscan; București, România; reprezentare națională. Fără adresă, barou, premii, rezultate sau onorarii inventate. [Auditul brief-ului](cabinet-avocatura-brief-audit.md).

Fotografii ilustrative native 1536×1024, fără mărire artificială; nu reprezintă sediul sau titulara reală. Prompturi în assets/GENERATED-V2/V3/V4/V5.md. Noindex rămâne pentru revizia cabinetului; canonical/hreflang/sitemap/LegalService și breadcrumbs sunt păstrate.

## Verificări curente

- Build, check, test:interactions, sintaxă JS, git diff --check: trecute.
- Validator: 42 pagini, 1862 referințe interne, 514 resurse directe; metadate, srcset/fonturi, ancore, paritate și destinatari.
- Teste RO/EN: date/intervale, chestionar, termene condiționale, text sigur, mesaje contextuale, selecție și limite de fișiere, fără citire/transmitere fișiere, resetare. Editorul, caruselul, mișcarea redusă, progresul și acoperirea brief-ului rămân verificate.
- Browser: 16 combinații RO/EN la opt dimensiuni 320–1440 px, fără overflow; câmpuri 16 px. Rezumat EN cu text 130% + contrast la cinci dimensiuni: fără overflow, câmpuri 20,8 px. Tableta ajustată verificată din nou la 768/844 px și mobilul la 320 px.
- Public: formular, navigare, rezumat, fingerprint și capturi pe domeniul final. Home RO/EN și cele două CSS modificate comparate în această revizie cu build-ul local: 4/4 identice. Normalizarea exclude numai scriptul Cloudflare injectat de hosting. Dovezi în output/appointments-proof/.
- Gzip: booking.js 3389 B și booking.css 2908 B, numai pe programări; app.js comun redus la 2813 B.
- Build-urile aplicației AVYRON nu au fost rulate local, site-ul fiind autonom. CI verifică separat aplicația și site-ul.

Nu se pretinde testare pe dispozitive fizice iOS/Android, certificare WCAG/GDPR, audit complet Core Web Vitals sau încărcare universală sub două secunde.

## Limite operaționale

Calendarul conectat, plățile/webhook-urile și confirmările automate, CMS-ul autentificat, datele legale finale, politicile aprobate, accesul securizat/retentia și oferta de mentenanță/SLA necesită configurare distinctă. Editorul actual este local. Conturile cabinetului și procesatorul nu sunt activate de această publicare. Nu există migrări sau modificări în aplicația/API AVYRON, nici modificări DNS în această revizie. Lovable nu a fost folosit.

## Meniu și limbaj vizual — V5

Programări precedă Arii de practică în toate cele 42 pagini RO/EN, inclusiv meniul mobil. Accent de calendar cu stare curentă distinctă. Cele șase pictograme SVG sunt individualizate, cu palete discrete și elemente decorative aria-hidden. §, numerotarea și săgețile sunt texte/vector; titlurile au un ritm vizual echilibrat, iar descrierile ariilor sunt mai concrete.

Cele 11 surse fotografice active au fost inspectate. Au fost înlocuite cadrul succesiunilor și imaginea ghidului internațional cu două compoziții ImageGen native 1536×1024, ilustrative. Aceleași imagini au crop 4:3 desktop și 3:2 mobil, AVIF/WebP. Prompturi exacte și căi: assets/GENERATED-V5.md; dimensiuni/greutăți: assets/images-v5.json. `sizes` este adaptat rolului card/ghid/copertă/fundal. Nu se declară rezoluție 4K/8K.

Verificări curente: toate cele 42 pagini la 320×568, fără overflow și cu ordinea corectă a meniului. Șase pagini × trei dimensiuni (320/768/1440) cu text 130% și contrast: 18 combinații fără overflow. Meniu și carduri verificate și pe domeniul public. `visual.css`: 1954 B gzip, fără JS nou sau scheduler suplimentar. Capturi și rapoarte: output/visual-v5-proof/. Modurile de contrast și mișcare redusă rămân disponibile. QA nu înlocuiește testarea pe telefoane fizice.

## Progresul celor trei carduri — corecție

Pe mobil există exact trei carduri și o singură linie verticală continuă de 3 px, lipită de marginea stângă a acestora. Panoul sticky suplimentar, contorul separat și liniile individuale ale cardurilor au fost eliminate. Traseul se umple de la începutul primului card până la finalul celui de-al treilea, proporțional cu geometria reală a scrollului; la revenire, progresul scade. Elementul nu ocupă spațiu în flux. Desktopul păstrează trei coloane și ascunde indicatorul vertical.

Se folosește același scheduler rAF, actualizare directă scaleY, fără tranziție sau cronometru nou. ARIA expune o bară verticală unică; lista rămâne semantică. Mișcarea redusă nu dezactivează citirea progresului, numai animațiile decorative.

Verificări: build/check/toate testele trecute; teste RO/EN la 0/25/50/75/100%, revenire și schimbare mobile/desktop. Browser la 320/390/430/768/1440 px, plus text 130% și contrast la 320/430 px, fără overflow. Pe public, trei carduri, un traseu de 3 px și progres 61% → 34% la scroll în sus. Capturi și rapoarte: output/process-proof/. Gzip motion.js 3277 B și motion.css 4152 B. Fără schimbări de imagini, DNS, date sau integrări.

## Caruselul Note și repere juridice

Secțiunea de articole de pe home RO/EN este un carusel cu sens automat stânga → dreapta, invers celui de arii de practică. Reutilizează același motor și scheduler rAF. Săgeți, swipe/scroll nativ, drag cu mouse, pauză la apăsare/hover/focus, reluare explicită, tastatură, oprire offscreen/tab ascuns și mișcare redusă; efecte CSS 2.5D și fallback fără mișcare. Ambele carusele au controale și stări independente. Indexul Articole păstrează grila.

Bucla are trei articole originale. Copiile vizuale sunt aria-hidden și toate legăturile descendente sunt excluse din ordinea de tabulare. ID-urile celor două carusele și aria-controls sunt unice. Nu se adaugă imagini, dependențe sau solicitări de rețea pentru un motor separat.

Verificări: build/check/toate testele trecute. Testele RO/EN rulează pentru ambele carusele, în sensuri opuse, incluzând controale/input, buclă, copii, reduced-motion și idle. Browser: 12 combinații RO/EN la 320/390/430/768/1024/1440 px, fără overflow; text 130% + contrast la trei dimensiuni. Derulare orizontală nativă verificată, precum și comenzi independente pe public (articole în pauză, arii neafectate). Mișcare inversă observată în browser: -256,5 px, normalizată după perioada buclei. Nu se pretinde testare fizică iOS/Android. Dovezi: output/articles-carousel-proof/. Public: 42 HTML + motion.js/motion.css identice cu build-ul local, după excluderea exclusivă a scriptului Cloudflare injectat.

## Contacte plutitoare — 7 noiembrie 2026

Apel, WhatsApp și e-mail sunt circulare și verticale, unul sub altul în dreapta jos, pe desktop, tabletă și mobil. Mobil 48×48 px, gap 8 px; desktop 50×50 px, gap 10 px. Respectă safe-area. Bara orizontală și spațiul rezervat acesteia au fost eliminate. Înapoi sus este în stânga jos pe home, separat de contactele din dreapta. Destinatarii, aria-label și mesajele precompletate sunt păstrate.

Build/check/toate testele trecute. Browser: 320×568, 390×844, 430×932, 844×390, 768×1024 și 1440×1000: flex-direction column, exact trei butoane cu aceeași coordonată x și coordonate y crescătoare, fără overlap între ele sau overflow. EN la 320 px confirmat. Public la 390×844: x 315 px, y 672/728/784 px, 48×48 px, runtime 8c7ed7702a. Home RO/EN și CSS motion/editorial corespund build-ului. Dovezi: output/floating-proof/. Gzip motion.css 4094 B, editorial.css 3176 B. Fără modificări JS, imagini, DNS sau integrări.

## Iconuri de interfață și preview — 7 noiembrie 2026

Eliminate glyphurile tipografice decorative din interfață, inclusiv săgeata oblică de la consultații, simbolul § repetat și săgețile listelor de servicii. Pictograme SVG locale pe grilă 24 px: calendar la butoanele consultației, monitor/clădire la format, carte pentru ghiduri, chevroane pentru navigare, plus/închidere/contrast și pauză/reluare. Etichetele și aria-label denumesc acțiunile; iconurile sunt decorative și fără font/dependență/rețea nouă. Pauza caruselelor schimbă vizibilitatea iconurilor fără innerHTML. Contactele rămân trei cercuri verticale în dreapta jos.

Preview-ul linkului are titlu, descriere, numele cabinetului, imagine 1200×630, tip JPEG și alternative text pentru Open Graph/Twitter. Descrierea RO: „Peste 27 de ani de experiență. Consultanță, asistență și reprezentare pentru persoane fizice și societăți. București, România · Consultații online sau la cabinet.” Versiunea EN are descriere echivalentă. Titlul afișat al proiectului Sites a fost actualizat; API-ul de metadate Sites permite numai titlul, nu și descrierea internă a proiectului din Library.

Build/check/test:interactions trecute local și pentru sursa exactă Sites. Validatorul verifică acum metadatele preview și absența glyphurilor vechi în toate cele 42 de pagini. Browser: home RO/EN la 320/390/768/1440 px, fără overflow, CTA calendar și contacte verticale; programări RO/EN la 320 px și EN la 1440 px, iconuri format 24×24; pauză/reluare SVG verificată. Public: home la 390 px, runtime 8221300ba3, calendar vizibil și metadate actualizate. Patru pagini cu metadate comparate cu build-ul și trei resurse runtime identice. Dovezi: output/icon-proof/. Fără migrații, schimbări DNS sau integrări. Gzip: styles.css 9908 B, visual.css 2131 B, motion.js 3276 B. Verificarea nu reprezintă testare pe telefoane fizice.

## Landing compact, selector de limbă și intro — 7 noiembrie 2026

Home: padding vertical redus pentru secțiuni, toolbarurile caruselelor, CTA și subsol. Cardurile „Note și repere juridice” au înălțime naturală, fără stretch după cel mai lung articol și fără margin-top:auto la link; textul este integral. Imagini 16:10 și padding 18–20 px. În RO, măsurători browser la 390 px: primul card aproximativ 630 → 438 px, cel mai lung 630 → 511 px; spațiul dintre descriere și link 133 → 8 px pentru primul card. La 1440 px: primul card 621 → 484 px. Înălțimea home: 7790 → 7301 px mobil, 5802 → 5181 px desktop. Valorile sunt geometrie de layout, nu metrici Core Web Vitals. Efectele și motorul ambelor carusele, progresul celor trei pași și contactele verticale sunt păstrate.

RO/EN este acum details/summary nativ, cu o singură alternativă vizibilă după apăsare. Nu există navigare la prima apăsare; linkul opțiunii păstrează ruta echivalentă în cealaltă limbă. Funcționează și fără JavaScript; JS adaugă Escape cu revenirea focusului, ArrowDown, închidere la click/focus în exterior și exclusivitate cu meniul/accesibilitatea. Testele RO/EN verifică explicit aceste comportamente.

Intro-ul home: CSS 420 ms, estompare de la primul cadru, fără hold-ul inițial al animației de 750 ms; fundal discret în profunzime și linie de 300 ms. Nu blochează interacțiunea și nu așteaptă imagini/load events, nu introduce temporizatoare, stocare sau progres fictiv. La mișcare redusă este ascuns. Durata intro-ului nu dovedește un timp total de încărcare de 420 ms și nu reprezintă audit Lighthouse.

Verificări: build/check/test:interactions trecute local și pentru sursa exactă împachetată. Browser: RO/EN la 320/390/430/768/1440 px, fără overflow, dropdown în viewport, prima apăsare păstrează URL-ul, alternativa navighează corect. EN la 320 px cu text 130% și contrast ridicat fără overflow; reduced-motion ascunde intro și dezactivează autoplay. Pe domeniul public, selectorul și navigarea RO → EN sunt verificate; CSS intro 0.42s, visibility hidden după terminare. Patru pagini cu disclosure identic build-ului și patru resurse runtime identice. Capturi și rapoarte: output/landing-compact-proof/. Fără migrări, DNS, dependențe sau integrări. Nu se declară testare pe dispozitive fizice iOS/Android. Gzip: app.js 2962 B, styles.css 9936 B, editorial.css 3654 B, visual.css 2411 B.
