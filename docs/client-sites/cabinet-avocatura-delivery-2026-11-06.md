# Cabinet de Avocatură — livrare, 6 noiembrie 2026

## Publicare verificată

- URL: https://cabinet-avocatura.avyron.eu/; pagini revizuite: /programari/ și /en/appointments/.
- Sites: versiunea 11, `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_c530fe7b944481919069f7d54a9eaac7`.
- Deployment: `appgdep_6aee47b79f00819196f12ef8f6cbf451`, `succeeded`.
- Sursă Sites: `3b3880a5e52d076e9a761cfbf897b058aa8390e0`; runtime `3f3d979f70`.
- AVYRON: `client-sites/cabinet-avocatura/`, ramura `codex/cabinet-avocatura-2026-11-06`, PR #102, fără merge în main.
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
- Public: formular, navigare, rezumat, fingerprint și capturi pe domeniul final. Toate cele 42 HTML, 9 CSS/JS și 20 derivate noi de imagine comparate cu build-ul local: 71/71 identice. Normalizarea exclude numai scriptul Cloudflare injectat de hosting. Dovezi în output/appointments-proof/.
- Gzip: booking.js 3389 B și booking.css 2908 B, numai pe programări; app.js comun redus la 2813 B.
- Build-urile aplicației AVYRON nu au fost rulate local, site-ul fiind autonom. CI verifică separat aplicația și site-ul.

Nu se pretinde testare pe dispozitive fizice iOS/Android, certificare WCAG/GDPR, audit complet Core Web Vitals sau încărcare universală sub două secunde.

## Limite operaționale

Calendarul conectat, plățile/webhook-urile și confirmările automate, CMS-ul autentificat, datele legale finale, politicile aprobate, accesul securizat/retentia și oferta de mentenanță/SLA necesită configurare distinctă. Editorul actual este local. Conturile cabinetului și procesatorul nu sunt activate de această publicare. Nu există migrări sau modificări în aplicația/API AVYRON, nici modificări DNS în această revizie. Lovable nu a fost folosit.

## Meniu și limbaj vizual — V5

Programări precedă Arii de practică în toate cele 42 pagini RO/EN, inclusiv meniul mobil. Accent de calendar cu stare curentă distinctă. Cele șase pictograme SVG sunt individualizate, cu palete discrete și elemente decorative aria-hidden. §, numerotarea și săgețile sunt texte/vector; titlurile au un ritm vizual echilibrat, iar descrierile ariilor sunt mai concrete.

Cele 11 surse fotografice active au fost inspectate. Au fost înlocuite cadrul succesiunilor și imaginea ghidului internațional cu două compoziții ImageGen native 1536×1024, ilustrative. Aceleași imagini au crop 4:3 desktop și 3:2 mobil, AVIF/WebP. Prompturi exacte și căi: assets/GENERATED-V5.md; dimensiuni/greutăți: assets/images-v5.json. `sizes` este adaptat rolului card/ghid/copertă/fundal. Nu se declară rezoluție 4K/8K.

Verificări curente: toate cele 42 pagini la 320×568, fără overflow și cu ordinea corectă a meniului. Șase pagini × trei dimensiuni (320/768/1440) cu text 130% și contrast: 18 combinații fără overflow. Meniu și carduri verificate și pe domeniul public. `visual.css`: 1954 B gzip, fără JS nou sau scheduler suplimentar. Capturi și rapoarte: output/visual-v5-proof/. Modurile de contrast și mișcare redusă rămân disponibile. QA nu înlocuiește testarea pe telefoane fizice.
