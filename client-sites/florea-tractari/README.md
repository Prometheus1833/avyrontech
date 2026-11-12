# FMA Tractări — demo

Concept AVYRON pentru tractări auto în București și Ilfov și transport național. Include cinci pagini statice în română, identitatea FMA, nouă fotografii de transport, un clip și două acțiuni flotante de contact. Poate fi deschis dintr-un fișier sau servit local.

## Previzualizare

- `node build.mjs` generează `dist/`. Pentru previzualizare prin HTTP, servește acest director pe loopback.
- `node build.mjs --offline` generează `dist-offline/`. Deschide `index.html` în browser, păstrând toate fișierele alături. Fontul este inclus în CSS în această variantă.
- Pentru o copie de lucru cu acțiuni reale, setează variabila `FLOREA_PHONE` sau câmpul `phone` din `contact.local.json` la un număr românesc de mobil în format internațional. Acest fișier este ignorat de Git. Formularul compune local un mesaj și deschide WhatsApp. Utilizatorul decide dacă îl trimite.

## Direcție vizuală

AVYRON Site Builder, etapa Exemplu Vizual, contractul din repository versiunea 2026-11-10.2. Referințe publice revizuite în browser: AVYRON, RAUL EURO TRAVEL, GOTRONIC, Cabinet de Avocatură și ROCAST NORD. S-au adaptat navigarea, acțiunile de contact și ritmul secțiunilor. Identitatea, textele și imaginile sunt originale.

Paletă bleumarin `#101824`, lime `#ddf64d` și alb mineral `#f4f4ee`. Barlow Condensed este servit local cu subset latin și latin extins și licență OFL. Textul curent folosește fonturile sistemului.

Fotografiile provin de la beneficiar. Variantele web aplică ajustări de expunere, contrast și claritate, decupaje pentru hero și cardul de distribuire și compresie AVIF/WebP. Caruselul prezintă nouă situații cu legende individuale. Clipul este comprimat în MP4, fără pistă audio, și se descarcă la redare. Sigla cu relief metalic a fost generată cu ImageGen și este livrată ca WebP transparent.

## Handoff

Conceptul este disponibil pe demo8.avyron.eu, cu `noindex` pe fiecare pagină HTML. Paginile pot fi citite de aplicațiile care generează previzualizări de link. Cardul de distribuire include titlu, descriere și o imagine JPEG de 1200 × 630. Sitemapul și datele structurate pentru lansare necesită domeniul final și datele aprobate ale companiei. Capacitatea, programul și conturile sociale rămân de confirmat. Nu se indică tarife, recenzii, program permanent sau timpi de sosire.

Verificare locală în Chrome la 320, 390, 768, 1024 și 1440 px. Teste automate axe pe mobil și desktop, linkuri și imagini, tastatură, mișcare redusă, fallback fără JavaScript și compunere WhatsApp cu navigarea interceptată local. Indexarea este dezactivată intenționat pentru concept.
