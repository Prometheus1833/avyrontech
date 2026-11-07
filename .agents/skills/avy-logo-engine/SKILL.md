---
name: avy-logo-engine
description: "Brief de identitate, direcții vizuale și handoff pentru produsul Logo Studio, fără a schimba tarifele sau licențele."
---

# Logo Engine

Folosește pentru pregătirea identității unui brand, pornind de la nume, activitate, public și preferințe. Nu confunda simulatorul 2D gratuit cu produsul Logo Studio 3D și livrarea asistată AI tarifată.
Pregătește un brief concis: utilizări principale, caracterul mărcii, simboluri de explorat/evitat, lizibilitate mică, culoare și monocrom. Propune trei direcții distincte; nu copia mărci ori portofolii ale altor clienți și nu pretinde unicitate juridică sau verificare de marcă.
Simularea monogramei este numai un reper de compoziție, nu logo original final. Livrarea finală trebuie verificată uman: contururi vectoriale curate, proporții, contrast, avatar, print și favicon. Pentru 3D, definește material, lumină, mișcare, fundal transparent și fallback static; nu adăuga 3D fără scop.
Reutilizează fluxurile existente de creare logo, catalog, achiziție, licență și aprobare. Nu produce drepturi de utilizare mai largi decât licența efectivă; nu modifica prețuri, nu trimite și nu publica automat.
Folosește primary din AI Core pentru structură și copy scurt. Pentru randări, păstrează calitatea master maximă permisă de furnizorul aprobat; economisește prin reutilizare și brief scurt. Dacă modelul sau bugetul nu permit operația, raportează starea blocată. Păstrează versiunea, brief-ul și observațiile de aprobare.

## Sursa operațională
Acestea sunt instrucțiunile de pornire, fără date private. Pentru versiunea curentă aprobată, citește prin autentificarea AVYRON existentă GET /api/skills/logo-engine/skill.md. Referințele relevante se citesc la GET /api/skills/logo-engine/context?domain=DOMENIU. Nu afișa tokenul în loguri, prompturi sau fișiere. Folosește POST /api/skills/logo-engine/runs pentru pregătire internă și GET /api/skills/logo-engine/runs/ID pentru rezultat. Toate mutațiile necesită permisiuni, MFA conform politicii și Idempotency-Key; schema este publicată în /api/skills/logo-engine/context. Codex local nu poate rula când Mac-ul este oprit; coada cloud rulează numai pregătirea autorizată, fără trimitere, publicare sau deploy.
