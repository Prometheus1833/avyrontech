# Recuperare taskuri AVYRON din coada iMac

Data recuperării: 2026-10-04

## Cum se citește acest document

- **Text vizibil** înseamnă text confirmat direct din fotografia cozii. Fotografia afișează finalul cu `...`, deci partea ascunsă nu poate fi declarată verbatim.
- **Specificație recuperată** înseamnă intenția confirmată din mesajele deja sincronizate în acest chat și din răspunsurile anterioare care au înregistrat cerințele.
- **Text integral recuperat** înseamnă text găsit complet în conversația-sursă, fără reconstruirea finalului.

## 1. Tranziții și efecte

### Text vizibil în coadă

> introdu subtil, inteligent, unde e cazul: Transitions (tranziții line)...

### Specificație recuperată

Introdu tranziții subtile, fluide și coerente acolo unde ajută orientarea și continuitatea vizuală. Pentru paginile individuale de servicii, folosește o scurtă animație de intrare 3D/360, cinematică și sugestivă pentru produs, similară direcției vizuale deja folosite la Logo și Produse: particule, profunzime și transformări controlate, cu durată maximă de trei secunde.

Cerințe de acceptare:

- animațiile nu blochează navigarea și nu întârzie conținutul important;
- efectele sunt compuse performant și nu produc salturi de layout;
- se adaptează capacității dispozitivului, cu o versiune redusă eficientă pe telefoane slabe;
- `prefers-reduced-motion` dezactivează mișcarea neesențială;
- GSAP, post-processing sau alte tehnologii se introduc numai unde aduc un beneficiu vizibil și fără dublarea mecanismelor existente;
- desktopul și mobilul păstrează aceeași identitate premium, fără pierderea accesibilității sau a utilizabilității.

## 2. Indexare, SEO și optimizare web/mobile

### Text vizibil în coadă

> verifica ca indexarea sa fie optimizata, designul perfect optimizat web si mobile peste tot, ai grij...

### Specificație recuperată

Verifică și optimizează indexarea, SEO tehnic, metadatele, sitemapul, designul responsive, performanța și compatibilitatea pe toate paginile publice.

Cerințe de acceptare:

- sitemapul include numai rutele publice canonice care trebuie indexate;
- paginile interne, administrative, de autentificare, preview, stare sau alte rute private nu sunt indexate;
- canonical, hreflang, redirecturile și variantele lingvistice sunt coerente;
- titlurile, descrierile și preview-urile sociale sunt profesionale și generice, fără formulări precum „agenție din Iași”, fără note interne, date private, texte demo sau informații care nu trebuie expuse vizitatorilor;
- layoutul, navigarea, formularele, cardurile și acțiunile sunt optimizate pentru desktop și mobil;
- imaginile, fonturile, animațiile și bundle-urile sunt încărcate eficient, cu degradare controlată pentru dispozitive slabe;
- verificarea finală acoperă buildurile, rutele generate, sitemapul, pagina live și fluxurile reale, fără scoruri de performanță inventate.

## 3. Pagina Cariere

### Text vizibil în coadă

> construieste inteligent pagina cariera care va aparea doar in menu user de pe landing page dar ...

### Specificație recuperată

Construiește o pagină profesională „Cariere”, coerentă cu identitatea AVYRON și accesibilă din meniul utilizatorului de pe landing page. Nu dubla intrarea în mai multe meniuri și nu crea butoane paralele pentru aceeași destinație.

Cerințe de acceptare:

- pagina explică domeniile de colaborare, modul de lucru și procesul de candidatură fără posturi, cifre sau promisiuni inventate;
- conținutul și formularul se administrează prin mecanismele existente, fără un al doilea sistem de leaduri;
- candidaturile intră într-un flux clar, protejat anti-spam și accesibil pe mobil;
- stările goale și situația în care nu există poziții deschise sunt tratate profesionist;
- SEO/indexarea paginii urmează decizia publică stabilită în registrul unic de rute;
- finalul care urma după `dar ...` nu a putut fi recuperat verbatim și trebuie tratat ca necunoscut, nu completat prin presupuneri.

## 4. Supabase și Google Drive

### Text vizibil în coadă

> Integrează în proiectul existent AVYRON două conexiuni opționale: Supabase ...

### Stare

Textul integral a fost recuperat din conversația-sursă „Construiește portal Supabase” și este salvat în [AVYRON_OPTIONAL_CONNECTORS_ORIGINAL_PROMPT_2026-10-04.md](./AVYRON_OPTIONAL_CONNECTORS_ORIGINAL_PROMPT_2026-10-04.md).

Rezumatul obligatoriu: Cloudflare rămâne infrastructura principală; Supabase și Google Drive sunt conexiuni opționale, pregătite și verificabile, dar operațiile asupra datelor rămân dezactivate. Nu se mută autentificarea, datele, fișierele sau proiectele și nu se activează servicii plătite.

## 5. Integrare, push și publicare în producție

### Text vizibil în coadă

> fa push si deploy in productie, ai grija sa nu fie conflicte, totul sa fie sincronizat si functional, ve...

### Specificație recuperată

Integrează schimbările AVYRON fără să pierzi lucrul existent sau commiturile Lovable, apoi fă push și publicare în producție numai după verificarea stării reale și a compatibilității tuturor componentelor.

Ordinea obligatorie:

1. actualizează referințele GitHub și compară `origin/main`, ramurile locale, worktree-urile și commiturile Lovable;
2. inventariază fișierele suprapuse, migrațiile D1 și configurațiile Cloudflare; rezolvă controlat coliziunile, fără force-push și fără rescrierea istoricului;
3. integrează într-o ramură comună de release numai schimbările validate;
4. rulează testele relevante, verificările de tipuri și lint, `npm run build`, `npm run build:pages` și `npm run build:worker`;
5. verifică rutele publice, sitemapul, metadatele, autentificarea, contul free, coșul, proiectele, AVY, newsletterul, leadurile, conectorii și responsive-ul;
6. creează sau actualizează pull requestul, sincronizează-l cu ultimul `main` și verifică din nou conflictele;
7. după integrarea controlată în `main`, publică Pages/Workers și aplică numai migrările remote necesare, în ordinea corectă;
8. verifică domeniile live, health/API, rutele publice și fluxurile reale după deploy și consemnează exact ce este funcțional sau blocat.

Finalul care urma după `ve...` nu a fost recuperat verbatim. Lista de mai sus este specificația operațională consolidată, nu o pretinsă transcriere a textului ascuns.

## Garanție de trasabilitate

Acest fișier păstrează separat textul confirmat de completările reconstruite. Nicio completare marcată drept „specificație recuperată” nu trebuie citată ulterior ca formulare exactă a utilizatorului.
