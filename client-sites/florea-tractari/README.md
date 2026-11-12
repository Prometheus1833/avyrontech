# Florea Tractări — concept vizual

Concept AVYRON pentru tractări auto în București și Ilfov și transport național. Include cinci pagini statice în română, o identitate originală și două acțiuni flotante de contact. Poate fi deschis dintr-un fișier sau servit local.

## Previzualizare

- `node build.mjs` generează `dist/`. Pentru previzualizare prin HTTP, servește acest director pe loopback.
- `node build.mjs --offline` generează `dist-offline/`. Deschide `index.html` în browser, păstrând toate fișierele alături. Fontul este inclus în CSS în această variantă.
- Pentru o copie de lucru cu acțiuni reale, setează variabila `FLOREA_PHONE` sau câmpul `phone` din `contact.local.json` la un număr românesc de mobil în format internațional. Acest fișier este ignorat de Git. Formularul compune local un mesaj și deschide WhatsApp. Utilizatorul decide dacă îl trimite.

## Direcție vizuală

AVYRON Site Builder, etapa Exemplu Vizual, contractul din repository versiunea 2026-11-10.2. Referințe publice revizuite în browser: AVYRON, RAUL EURO TRAVEL, GOTRONIC, Cabinet de Avocatură și ROCAST NORD. S-au adaptat navigarea, acțiunile de contact și ritmul secțiunilor. Identitatea, textele și imaginile sunt originale.

Paletă bleumarin `#101824`, lime `#ddf64d` și alb mineral `#f4f4ee`. Barlow Condensed este servit local cu subset latin și latin extins și licență OFL. Textul curent folosește fonturile sistemului.

Imaginile ilustrative au fost create cu ImageGen. Direcțiile de generare au folosit o platformă albă inspirată de Iveco Daily, cu marcaje lime, în patru cadre: la marginea Bucureștiului după ploaie, la încărcarea unei mașini, staționând cu mașina fixată pe platformă și în deplasare la poalele munților. Masterele PNG au fost păstrate la rezoluția de generare. Site-ul folosește AVIF și WebP responsive.

## Handoff

Conceptul rămâne local, cu `noindex`. Paginile au titluri, descrieri, metadate sociale, conținut semantic și linkuri interne. Canonicalul, sitemapul, datele structurate și imaginea de distribuire necesită domeniul final și datele aprobate ale companiei. Denumirea propusă, modelul real al autoutilitarei, capacitatea, programul și conturile sociale rămân de confirmat. Nu se indică tarife, recenzii, program permanent sau timpi de sosire.

Verificare locală în Chrome la 320, 390, 768, 1024 și 1440 px. Teste automate axe pe mobil și desktop, linkuri și imagini, tastatură, mișcare redusă, fallback fără JavaScript și compunere WhatsApp cu navigarea interceptată local. Lighthouse mobil pentru pagina principală servită local a măsurat 99/100 la performanță, 100/100 la accesibilitate și LCP 2,2 s. Indexarea este dezactivată intenționat pentru concept.
