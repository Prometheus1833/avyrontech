# Glosar AVYRON

Folosește acești termeni consecvent în cod, UI, PR-uri și documentație. Stările operaționale trebuie susținute de dovada corespunzătoare.

| Termen | Sens în proiect |
| --- | --- |
| **AVYRON public** | Website-ul văzut fără autentificare; conținutul și designul lui se verifică separat de dashboard. |
| **AVYRON OS** | Platforma internă pentru staff, clienți, proiecte, Leads, AI, aprobare și finanțe. |
| **AVY / Avy bot** | Asistentul conversațional; răspunsurile sale trebuie să folosească surse și oferte aprobate, cu handoff când nu poate confirma un fapt. |
| **AI AVY Prod** | Portofoliul de proiecte de producție AI din `/intern/ai-projects`; nu este același registru cu proiectele operaționale. |
| **Avyron WEB** | Proiectul AI pentru prezența digitală și produsele agenției AVYRON. Etichetele sale sociale nu dovedesc conexiuni API. |
| **`platform_owner`** | Principal cu acces operațional complet și controlul ierarhiei platformei; identitatea Owner rămâne protejată. |
| **`superadmin`** | În implementarea locală din 05.11.2026: acces operațional complet, inclusiv Documente SC și backupurile firmei, fără controlul identităților Owner. [Politica și starea de release](./STAFF_RANKS_INTERNAL_CHAT.md). |
| **Rang staff** | Profil de drepturi peste RBAC-ul existent (`user`, `staff`, `admin`), fără autentificare paralelă. Cele șapte ranguri și alocările sunt descrise în [Membrii Agenției](./STAFF_RANKS_INTERNAL_CHAT.md). |
| **Pipeline** | Succesiune explicită de stări și acțiuni pentru Leads, conținut, proiecte sau facturi; UI trebuie să arate unde se află elementul și următoarea acțiune permisă. |
| **Conexiune configurată / verificată / sincronizată** | Configurată: există setări sau referințe. Verificată: identitatea și accesul API au fost testate. Sincronizată: importul/reconcilierea reală are timestamp și rezultat. |
| **`source_connections`** | Registrul OS pentru surse/conectori. Un URL sau un `account_label` nu poate înlocui autorizarea OAuth/API. |
| **`draft` → `pending_approval` → `approved`** | Stări ale conținutului AI. `approved` nu înseamnă `scheduled` sau `published`; verificarea se face per canal și destinație. |
| **Canonical / hreflang / noindex** | URL-ul preferat, legăturile dintre versiuni lingvistice și excluderea intenționată din index. Sursa rutelor publice este `src/seo/publicRoutes.ts`. |
| **SEO / GEO / AEO** | Optimizarea pentru căutarea clasică, rezultate generative și răspunsuri. Folosește conținut real, date structurate corecte și dovezi de indexare; nu inventa trafic sau clasări. |
| **`llms.txt`** | Fișier orientativ pentru agenți. Prezența lui nu garantează citirea, indexarea sau recomandarea de către modele. |
| **Prerender / preview / producție** | HTML generat la build / versiune de ramură / versiune servită public după release. Fiecare cere verificare proprie. |
| **Migrare D1 append-only** | Fișier nou de schemă aplicat în ordine; nu modifica retroactiv migrațiile deja aplicate în producție. |
| **Efect 2.5D** | Profunzime sugerată prin straturi, perspectivă și parallax; nu este o scenă 3D cu orbită liberă. |
| **Poster static / motion tier** | Conținut vizibil fără WebGL și în prerender / buget de animație stabilit după capabilitatea dispozitivului. |

Pentru procedura de predare și statutul ramurilor, vezi [PROJECT_CONTINUITY.md](./PROJECT_CONTINUITY.md). Pentru implementarea efectelor, vezi [VISUAL_TECHNIQUES.md](./VISUAL_TECHNIQUES.md).

- **Fișa clientului**: mini-dashboard din registrul Clienți; reunește identitatea comercială/fiscală, conturile autorizate, proiectele, abonamentele, situația financiară și documentele centrale. Identitatea fiscală este în `client_legal_profiles`; autentificarea rămâne în contul nativ, separat de identitatea firmei.
- **Acces client gestionat explicit**: `clients.access_managed=1`; accesul se bazează pe asocieri aprobate, iar reconcilierea legacy prin email nu reface automat granturile revocate. Alte granturi independente sunt administrate separat.
