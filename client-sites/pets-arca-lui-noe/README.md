# Pets Arca lui Noe — concept de site AVYRON

Concept vizual privat pentru cabinet veterinar din Drobeta-Turnu Severin. Are cinci pagini complete (Acasă, Servicii, Prima vizită, Remindere și Contact), fiecare cu versiune RO și EN. Selectorul de limbă păstrează pagina deschisă. Nu necesită server pentru navigarea din pachetul ZIP.

## Build și verificare

- Node.js 20+; fără dependențe de runtime și fără servicii externe la încărcare.
- `npm run build`, apoi `npm run check` în acest director. Deschideți `dist/index.html`. Se poate servi și cu `python3 -m http.server 4186 --directory dist`.
- Site-ul este izolat de buildurile AVYRON; `dist` nu intră în artefactul public AVYRON. Toate paginile au `noindex,nofollow`. Niciun formular nu colectează sau trimite date. Linkurile către hartă, telefon, WhatsApp și e-mail deschid numai aplicația serviciului respectiv la acțiunea vizitatorului.

## Surse și conținut

- Brief: denumirea „Pets Arca lui Noe”, localitatea și datele de contact provin din solicitarea primită. Nu păstrăm captura de ecran în artefact sau repository.
- [Colegiul Medicilor Veterinari — unități din Mehedinți](https://cmvro.cmvro.ro/cmvro/Unitati.aspx?jud=MH): denumire și adresă. Există și o intrare distinctă „Practice Arca lui Noe SRL” la aceeași adresă. Beneficiarul trebuie să confirme identitatea care va apărea în mențiunile legale și ca expeditor.
- [Cylex — Pets Arca Lui Noe](https://drobeta-turnu-severin.cylex.ro/firma/pets%2Barca%2Blui%2Bnoe%2Bsrl-1094632.html): telefonul corespunde brief-ului; orarul de pe site este indicativ. Catalogul de servicii este o propunere, nu o listă confirmată. Pagini sociale, recenzii, echipă, tarife, capacități de urgență și facilități medicale neconfirmate nu au fost inventate.
- AVYRON Site Builder: contractul și profilul medical generate local din `siteQualityContext("medical")`, versiunea **2026-11-10.2**, pe `origin/main` la `bf4e8c46c00fa0be460d4f8b0a5998dc6e27b67b`. Exportul operațional privat a răspuns 401 fără sesiune; nu s-au salvat rulări în OS și nu s-au importat resurse private.
- Referințe consultate: [portofoliul public AVYRON](https://avyron.ro/portofoliu), [Cabinet Avocatură](https://cabinet-avocatura.avyron.eu/) și [GOTRONIC](https://gotronic.avyron.eu/). Preluăm principii de navigare, ritm și ierarhie, cu grafică și fotografii noi.
- Imagini ilustrative generate pentru concept, în variante WebP responsive. Nu reprezintă cabinetul, personalul sau pacienți reali. Simbolul cu lăbuță este o propunere de identitate. Fontul Source Serif 4 este distribuit sub SIL Open Font License, inclusă în `assets/`.

## Propunere funcțională pentru etapa următoare

1. **Programări asistate.** Solicitare de vizită urmată de confirmarea echipei. Cabinetul stabilește regulile și sursa de disponibilitate; site-ul nu promite sloturi până când calendarul nu este integrat. FAQ și telefon direct pentru situații urgente. Formularul din acest concept nu cere date personale.
2. **Remindere pentru termene recomandate de medic.** În interfața privată, personalul alege animalul, tipul termenului, data, e-mailul și limba preferată. Un program server stabilește trimiterea în fusul `Europe/Bucharest`, cu intervale configurabile (demo: 1, 3 sau 7 zile). La amânare sau anulare, trimiterea anterioară se actualizează sau se oprește. Panoul urmărește stările programat, transmis furnizorului, livrat sau nelivrat dacă furnizorul le confirmă. Încercările repetate folosesc o cheie unică pentru a evita duplicatele. E-mailul conține informațiile minime necesare și o acțiune de programare. Inspirație: [IDEXX Vello](https://software.idexx.com/vello-ezyvet) și [Covetrus Rapport](https://software.covetrus.com/emea/veterinary-solutions/rapport-veterinary-communication-software/).
3. **Integrare în funcție de cabinet.** Dacă există deja o aplicație veterinară, evaluăm întâi exporturile și API-ul ei; altfel propunem un registru privat minimal de termene. Ulterior pot fi adăugate cereri de reprogramare și instrucțiuni aprobate înainte de vizită. Portalul proprietarului, SMS și fișele medicale complete sunt extensii separate, dacă sunt necesare.

Înainte de lansare: se confirmă serviciile, programul, logo-ul, fotografiile, canalele de contact și modul de lucru al cabinetului. Pentru e-mail se alege sursa termenelor, se configurează un domeniu de expediere verificat, se definesc accesul personalului, preferințele proprietarilor și perioada de păstrare, apoi se testează livrarea, reprogramarea și anularea cu date de test. Pentru site-ul autorizat se pregătesc indexarea, metadata bilingvă, sitemapul, datele locale structurate și paginile legale potrivite.

Stadiu: concept și simulări locale. Nicio programare creată, niciun e-mail trimis, niciun furnizor activat.
