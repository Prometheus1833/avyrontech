# GOTRONIC — concept de site

Concept autonom în limba română pentru GOTRONIC SRL, din Târgu Mureș. Compilatorul Node generează HTML complet, fără dependențe externe sau Worker. Bază AVYRON: `6680a5e9fe7de2619c417272cac7c7280a0cd835`. Aplică `avy-site-builder` și contractul comun `2026-11-10.2` din această revizie. Exportul live autentificat al skillului nu a fost accesibil la audit; nu s-a declanșat un job AI în AVYRON OS.

```sh
npm run build
npm run check
npm run dev
```

Preview local: http://127.0.0.1:8769/ · verificare cu imagini client: `npm run check -- --with-client`.

Rute: Acasă; catalog aprinderi; AT011; electrificatoare; ghiduri; contact; mențiuni legale; confidențialitate; cookies; termeni; 404. Datele de catalog sunt în `content.mjs`; șabloanele HTML în `scripts/build.mjs`. Conceptul este `noindex,nofollow`; nu publică sitemap sau canonical de producție. Nu se importă site-ul Joomla, cod, fișiere, setări sau linkuri suspecte de pe serverul actual. Publicarea necesită aprobare separată.

Selectorul nu colectează sau transmite date. Sugerează o singură opțiune documentată (AT011/011 la 12 V cu Ducellier pentru anumite Dacia/R12); cazurile de 6 V, Bosch sau insuficient descrise cer verificarea GOTRONIC. Butonul e-mail deschide o ciornă. Apelul folosește mobilul public. Butonul WhatsApp deschide dialogul de pregătire și copiere a mesajului; conectarea la număr se activează după confirmarea canalului. Site-ul nu trimite mesaje, nu acceptă comenzi, nu stochează stocuri, prețuri, conturi sau date de plată și nu încarcă trackere ori video încorporat.

Textele legale descriu această funcționalitate în stadiu de concept. Repere: [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [Legea 365/2002](https://legislatie.just.ro/Public/DetaliiDocumentAfis/288595), [OUG 34/2014](https://legislatie.just.ro/Public/DetaliiDocument/254147), [ANPC](https://anpc.ro/), [ANSPDCP](https://www.dataprotection.ro/). Înainte de publicare, operatorul validează identitatea, furnizorii și transferurile, perioadele de păstrare, informațiile precontractuale, procedura de garanție/retur și cookie-urile efective. Fără afirmații de omologare valabilă sau termene comerciale neconfirmate.

## Proveniență și drepturi

- [Profil GOTRONIC pe Bizoo](https://gotronic.bizoo.ro/), [listarea AT011/011](https://gotronic.bizoo.ro/vanzare/63425/aprindere-tranzistorizata-at011-si-senzor-011-dacia), [AT01](https://gotronic.bizoo.ro/vanzare/11305/sistem-aprindere-tranzistorizata-at01-dacia), [AT010](https://gotronic.bizoo.ro/vanzare/7406/aprindere-tranzistorizata-at010-oltcit) și [Pastor-EL(S)](https://gotronic.bizoo.ro/vanzare/18909533/generator-de-impulsuri-pentru-gard-electric-pastor-el-s): fotografii de listare, cu decupaj la imaginea AT011 și conversii locale AVIF/WebP. ELD045 nu avea fotografie în listare; cardul afișează codul, fără fotografie substituită.
- [Anunț GOTRONIC pe OLX](https://www.olx.ro/d/oferta/aprindere-electronica-vw-broasca-skoda-jawa-mz-ij-trabant-opel-ID5PWFa.html): fotografia de montaj și schema AT012/012CW. [Canal YouTube](https://www.youtube.com/@gotronic): două demonstrații legate direct, fără download sau reîncărcare.
- `assets/client/` este local și intră numai în conceptul privat Sites. Repository-ul GitHub public păstrează codul și referințele, fără copiile fotografiilor clientului; buildul fără ele afișează un marcaj discret cu codul produsului. Drepturile de utilizare publică se reconfirmă înainte de lansare.
- `assets/brand/hero-1200.*` și `hero-768.*`: derivate de livrare din `assets/master/atelier-gotronic.png`, master ImageGen nativ 1536×1024, local. Scenă ilustrativă; nu prezintă sediul sau un produs GOTRONIC. Semnul vectorial din header este o propunere de identitate pentru concept, de aprobat înainte de folosire publică.
- Tipografie Space Grotesk și Source Sans 3, cu licențele SIL OFL lângă fonturi.

Promptul ImageGen (modul integrat):

> Photorealistic editorial website hero background for a Romanian specialist in transistor ignition electronics for classic cars. Wide cinematic landscape composition around 3:2. A real-looking classic 1970s Eastern European compact sedan (inspired by a Dacia 1300, no badge, plate, marks or words), muted slate blue/gray body, hood raised, nose and engine bay clearly visible, placed entirely in the RIGHT 58 percent, three-quarter front view, single lamp each side, warm amber workbench practical lights on the extreme right, dark graphite restoration workshop with a hint of mechanical instruments, haze only very subtle. Left 42 percent is deep charcoal blue black dark negative space for large white text added later, high enough contrast. Keep the right focal point well inside the image and strong even on mobile crop. Rich detail, premium restrained documentary automotive photography, realistic colors, film-like falloff, natural texture, refined not gaudy. No people, text, lettering, watermarks, interface, fake electrical sparks, graphical overlays or branded ignition products. The result represents an illustrative workshop scene, not a photo of a particular business.
