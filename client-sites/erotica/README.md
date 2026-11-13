# Erotica — prototip AVYRON

Site de prezentare în limba română pentru un catalog de cărți cu solicitări de comandă pe WhatsApp. Șapte pagini: acasă, catalog, trei fișe de carte, despre proiect și cum comanzi. Numele, titlurile, descrierile și imaginile din prototip sunt propuneri creative. Nu reprezintă un catalog verificat.

```sh
node build.mjs
python3 -m http.server 8767 --bind 127.0.0.1 --directory dist
```

Deschideți `http://127.0.0.1:8767/`. Fișierele din `dist/` se pot deschide și offline, pornind din `index.html`. Nu există dependințe de execuție; fonturile, imaginile și scriptul sunt livrate local.

## Catalog și WhatsApp

Titlurile demonstrative sunt în `books.mjs`. Butoanele WhatsApp deschid implicit o simulare locală: mesajul include titlul ales și poate fi copiat. Nu se fac solicitări către WhatsApp în acest mod. Pentru activare, confirmați catalogul, numele comercial și numărul public pentru comenzi. Apoi setați la build variabila `EROTICA_WHATSAPP` la numărul confirmat în format internațional, numai cifre. Linkurile `wa.me` rezultate precompletează mesajul; vizitatorul decide dacă îl trimite. Numărul configurat apare în pagina de comandă și în linkuri, deci trebuie să fie un număr destinat publicării.

Paginile au titluri, descrieri și ierarhie HTML distincte. Prototipul are meta `noindex, nofollow, noarchive` și același antet pentru hosting static care acceptă fișierul `_headers`. Configurați URL-urile canonice, sitemapul și indexarea după aprobarea domeniului și a conținutului real. Stilul nu presupune analytics, conturi sau o bază de date.

Imagini: [proveniență și prompturi](assets/GENERATED.md). Fonturi: Cormorant Garamond și Manrope, găzduite local, cu licențele SIL OFL incluse în `assets/`.
