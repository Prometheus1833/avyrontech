---
name: avy-media-generate
description: "Direcție de artă, prompturi și resurse vizuale reutilizabile, cu politici de calitate și cost transparente."
---

# Media Generate

Folosește pentru briefuri de imagini, fundaluri cinematice, campanii și resurse vizuale. Cere numai afacerea/activitatea, scopul imaginii și preferințele relevante; nu prelua automat documente confidențiale în modele externe.
Definește subiectul, compoziția, perspectiva, iluminarea, materialele, profunzimea, spațiul pentru text, paleta, formatul și utilizarea. Prompturile trebuie adaptate nișei, fără afirmații factuale inventate, mărci copiate sau persoane prezentate fals drept clienți/angajați. Pentru hero rezervă o zonă calmă pentru heading și CTA.
Masterul vizual are calitate maximă disponibilă în planul aprobat; comprimarea AVIF/WebP este derivată pentru web, păstrând masterul. Nu reduce calitatea generării pentru a economisi tokens. Economisește prin reutilizarea activelor aprobate, context progresiv, planificarea variantelor și evitarea regenerărilor identice.
Modelele text medii din AI Core pregătesc structura; modelul image este utilizat numai când este configurat, autorizat și încadrat în buget. Niciun model plătit, overage sau serviciu nou nu se activează automat. Promptul pregătit nu înseamnă imagine generată.
Atașamentele folosesc R2 privat și poarta antivirus existente; fișierele neverificate nu se deschid și nu intră în contextul AI. Stochează titlu, nișă, proveniență, drepturi declarate și scopul reutilizării. Nu redistribui resurse cu licență necunoscută.
Verifică diacriticele/textul separat de imagine, contrastul, cropul desktop/mobil, proporțiile și absența detaliilor sensibile. Propunerile rămân interne până la aprobare; publicarea și distribuirea sunt acțiuni distincte.

## Sursa operațională
Acestea sunt instrucțiunile de pornire, fără date private. Pentru versiunea curentă aprobată, citește prin autentificarea AVYRON existentă GET /api/skills/media-generate/skill.md. Referințele relevante se citesc la GET /api/skills/media-generate/context?domain=DOMENIU. Nu afișa tokenul în loguri, prompturi sau fișiere. Folosește POST /api/skills/media-generate/runs pentru pregătire internă și GET /api/skills/media-generate/runs/ID pentru rezultat. Toate mutațiile necesită permisiuni, MFA conform politicii și Idempotency-Key; schema este publicată în /api/skills/media-generate/context. Codex local nu poate rula când Mac-ul este oprit; coada cloud rulează numai pregătirea autorizată, fără trimitere, publicare sau deploy.

## Atelier de art direction
Brief-ul nativ include `media.purpose`, `media.subject`, `media.lighting`, `media.composition` și `media.avoid`. Promptul afișat, copiat și descărcat folosește aceeași funcție ca apelul modelului; configurația este păstrată în istoricul pregătirii. Raportează dimensiunile reale ale rezultatului și păstrează masterul. Modelul Cloudflare verificat în configurația actuală folosește maximum 1920 px pe latură; nu numi rezultatul 4K/8K și nu interpola pentru a simula detaliu nativ. Nu reduce calitatea la epuizarea cotei și nu activează automat un serviciu plătit.
