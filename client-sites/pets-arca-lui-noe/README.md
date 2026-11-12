# Pets Arca lui Noe — concept de site AVYRON

Concept vizual privat pentru cabinet veterinar din Drobeta-Turnu Severin. Are cinci pagini complete (Acasă, Servicii, Prima vizită, Remindere și Contact), fiecare cu versiune RO și EN. Selectorul de limbă păstrează pagina deschisă. Nu necesită server pentru navigarea din pachetul ZIP.

## Deschidere

Rulează `npm start` în acest director cu Node.js 22.13+ sau deschide `Porneste preview.command` pe macOS. Nu trebuie instalate pachete.

- Site-ul local se deschide la [127.0.0.1:4186](http://127.0.0.1:4186/).
- Dashboardul se deschide la [127.0.0.1:4186/admin](http://127.0.0.1:4186/admin).
- `npm run build` și `npm run check` pregătesc și verifică pachetul static al site-ului. `dist/index.html` funcționează și din fișiere. Editorul și registrul folosesc serverul local.
- Serverul ascultă doar pe interfața loopback. SQLite creează `.local/clinic.sqlite` la prima rulare și păstrează datele între reporniri. Datele inițiale sunt fictive. Folosește `VET_PREVIEW_DB` pentru un fișier SQLite separat și `VET_PREVIEW_PORT` pentru un alt port local.
- Site-ul este izolat de buildurile AVYRON. Rutele au `noindex,nofollow`. Formularul public rămâne o simulare.

## Ce poate face cabinetul în dashboard

1. În **Editor site**, editează textele RO și EN, serviciile, întrebările, fotografia de copertă, contactul, programul, butonul de programare, anunțul și metadata. **Salvează ciorna** și deschide-o în preview. **Aplică pe site-ul local** actualizează toate paginile folosind aceeași revizie. Editarea din altă filă este verificată înainte de salvare sau aplicare.
2. În **Proprietari și animale**, adaugă și editează fișele, limba și preferința de notificare. Demo-ul acceptă destinatari cu adrese `@example.com`.
3. În **Termene**, adaugă rapeluri, deparazitări și controale. Ajustează data, intervalul, starea sau destinatarul. Data de notificare se recalculează după modificarea termenului.
4. În **E-mail și Resend**, editează expeditorul, adresa de răspuns, ora locală și intervalul implicit pentru fiecare tip de termen. Scrie șabloane RO și EN, previzualizează mesajul pentru un termen și simulează coada pentru o dată aleasă. Istoricul păstrează cel mult un eveniment simulat pentru fiecare revizie a termenului. Simularea înregistrează rezultatul în SQLite.

Schema este în `server/schema.sql`. Conținutul ciornă și cel afișat au revizii separate. Tabelele pentru proprietari, animale și termene sunt legate prin chei externe. Un index susține consultarea termenelor programate și o constrângere unică previne dublarea simulărilor.

## Surse și conținut

- Brief: denumirea „Pets Arca lui Noe”, localitatea și datele de contact provin din solicitarea primită. Nu păstrăm captura de ecran în artefact sau repository.
- [Colegiul Medicilor Veterinari — unități din Mehedinți](https://cmvro.cmvro.ro/cmvro/Unitati.aspx?jud=MH): denumire și adresă. Există și o intrare distinctă „Practice Arca lui Noe SRL” la aceeași adresă. Beneficiarul trebuie să confirme identitatea care va apărea în mențiunile legale și ca expeditor.
- [Cylex — Pets Arca Lui Noe](https://drobeta-turnu-severin.cylex.ro/firma/pets%2Barca%2Blui%2Bnoe%2Bsrl-1094632.html): telefonul corespunde brief-ului; orarul de pe site este indicativ. Catalogul de servicii este o propunere, nu o listă confirmată. Pagini sociale, recenzii, echipă, tarife, capacități de urgență și facilități medicale neconfirmate nu au fost inventate.
- AVYRON Site Builder: contractul și profilul medical generate local din `siteQualityContext("medical")`, versiunea **2026-11-10.2**, pe `origin/main` la `bf4e8c46c00fa0be460d4f8b0a5998dc6e27b67b`. Exportul operațional privat a răspuns 401 fără sesiune; nu s-au salvat rulări în OS și nu s-au importat resurse private.
- Referințe consultate: [portofoliul public AVYRON](https://avyron.ro/portofoliu), [Cabinet Avocatură](https://cabinet-avocatura.avyron.eu/) și [GOTRONIC](https://gotronic.avyron.eu/). Preluăm principii de navigare, ritm și ierarhie, cu grafică și fotografii noi.
- Imagini ilustrative generate pentru concept, în variante WebP responsive. Nu reprezintă cabinetul, personalul sau pacienți reali. Simbolul cu lăbuță este o propunere de identitate. Fontul Source Serif 4 este distribuit sub SIL Open Font License, inclusă în `assets/`.

## Trecerea de la demo la domeniul cabinetului

Pentru `https://domeniu.ro/admin`, pune dashboardul și API-ul administrativ în spatele autentificării și restricționează accesul la personalul cabinetului. Alege domeniul și baza de date pentru mediul găzduit, apoi aplică schema în acel mediu. Demo-ul local folosește protecții pentru loopback și date fictive. Formularul de programări are nevoie de un flux real de confirmare înainte de lansare.

Configurația Resend din dashboard pregătește datele pentru API-ul de trimitere. Pentru a activa livrarea, verifică domeniul expeditorului, configurează cheia API și secretul webhook pe server, apoi conectează un job care verifică termenele în fusul Europe/Bucharest. Păstrează separat trimiterea acceptată de furnizor și confirmarea de livrare, validează semnătura webhookului și păstrează cheia de idempotency în baza de date. Resend păstrează cheia 24 de ore. După un rezultat incert care depășește acest interval, verifică starea înainte de a reîncerca. [API Resend](https://resend.com/docs/api-reference/emails/send-email), [domenii verificate](https://resend.com/docs/dashboard/domains/introduction), [idempotency](https://resend.com/changelog/idempotency-keys), [webhookuri semnate](https://resend.com/changelog/managing-webhooks-via-api).

Înainte de lansare, cabinetul confirmă serviciile, programul, fotografiile, datele de contact și sursa termenelor. Dacă folosește deja o aplicație veterinară, verifică exporturile și API-ul ei înainte de a introduce un al doilea registru. Pentru site-ul final se pregătesc indexarea, metadata bilingvă, sitemapul și datele locale structurate.

Stadiul actual este preview local cu SQLite și simulări. Conectarea Resend, livrarea mesajelor, autentificarea echipei și găzduirea la domeniul cabinetului sunt etape de producție.
