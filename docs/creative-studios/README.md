# Logo Engine și Media Generate

Extensie a PR #117, bază `b4428e9489ac678696adf1a633d7284b2683f4d8`. Nu reprezintă merge/deploy sau verificare live a furnizorului. Folosește infrastructura, permisiunile, proiectele, Leads, coada și stocarea private existente. Nu are migrare nouă și nu activează modele, servicii sau planuri plătite.

## Ateliere dedicate

`/profil?tab=skill-logo-engine`: puncte de pornire vizuale, tipul identității, cinci palete, tagline, simboluri și excluderi. Trei studii de compoziție, sistem de identitate, repere de verificare, brief reluabil și SVG descărcabil pentru fiecare direcție. Conceptele nu sunt identități finale, cercetări de marcă sau livrări tarifate. Textul SVG rămâne editabil, fără fonturi încorporate/contururi finale. Simbolurile specifice solicitate sunt incluse în brief și rafinarea AI; compoziția deterministă este un reper, nu un generator vectorial arbitrar.

`/profil?tab=skill-media-generate`: scop, subiect, lumină, compoziție, excluderi și preferințe. Preseturi pentru hero, produs și editorial. Prompt afișat/copiabil/descărcabil înainte de orice apel AI, generat prin aceeași funcție utilizată în Worker. Imaginea rezultată arată dimensiunile reale; brief-ul, promptul, modelul și istoricul se păstrează în fluxul nativ. Template = direcție/prompt, AI text = rafinare, image = imagine generată explicit. Niciunul nu publică automat.

## Compatibilitate și securitate

Noile câmpuri JSON `logo` și `media` sunt strict validate, au limite și valori implicite pentru briefurile istorice. Nu se rescrie nicio pregătire finalizată. Contractul creativ este versionat în contextul noilor pregătiri și disponibil agenților prin endpointul `/context` existent; instrucțiunile master se administrează și aprobă separat.

`GET /api/skills/logo-engine/runs/:id/export?format=svg&direction=0|1|2` verifică accesul existent la run/proiect și starea rezultatului, apoi extrage SVG-ul din snapshotul istoric. Nu reface SVG-ul cu implementarea sau brief-ul actual. Răspunsul este privat, attachment, CSP restrictiv, cu audit. Pentru istoricele fără SVG, exportul întoarce `concept_svg_unavailable`; UI nu afișează butoane SVG pentru acele pregătiri. Datele utilizatorului sunt escapate, fără scripturi, resurse externe sau HTML încorporat în SVG.

Folosirea AI păstrează configurația și cotele aprobate existente. Modelul de imagine verificat local rămâne FLUX.2 klein 4B; transportul multipart și rezoluțiile sunt cele din `skillImages.ts`, fără schimbarea tarifelor sau extinderea cotelor. [Documentația furnizorului](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/). Generarea internă nu este trimisă la antivirus; poarta uploadurilor externe rămâne neschimbată.

## Imagini publice

Imagine nouă pentru website-ul wellness și cardul de programare de pe telefon, imagine nouă pentru turism, plus variante AVIF/WebP responsive pentru încă trei imagini din scena de dispozitive. Originalele, prompturile exacte și limita rezoluției sunt documentate în [IMAGES.md](./IMAGES.md). Nu se declară 4K/8K când generatorul livrează 1672 × 941 px. Redimensionarea pentru web nu mărește artificial imaginile.

## Verificare / lansare

Testele acoperă validarea și compatibilitatea briefurilor, escaparea SVG, exportul istoric, autorizarea per proiect, prompturile și stocarea imaginilor. Testele browser folosesc utilizatori sintetici și provider simulat; imaginile publice sunt servite real din build. Nu constituie verificare a unui apel AI în contul real.

La release autorizat: integrați mai întâi PR #117, apoi această extensie, verificați CI și infrastructura AI existentă, creați o pregătire de test pentru fiecare atelier și confirmați descărcările. Nu se aplică o migrare suplimentară pentru această extensie. Proiectul cabinetului și PR #110 sunt excluse.

Retry-urile fără personalizări creative păstrează hashul cererii vechi, astfel încât adăugarea câmpurilor implicite nu provoacă un conflict artificial sau o pregătire dublă după actualizare. Controalele personalizate fac parte din hashul noii cereri. Promptul multipart poate normaliza LF la CRLF; testul transportului compară conținutul după normalizarea terminatorilor de linie.

Ordinea de deploy: API-ul compatibil cu noile câmpuri înaintea frontendului, apoi Pages/Worker frontend. API-ul nou acceptă briefuri vechi; frontendul nou poate trimite câmpuri pe care versiunea API veche, strict validată, nu le cunoaște. La rollback coordonat, restaurați frontendul înaintea API-ului vechi. Migrarea 0108 a părintelui PR #117 trebuie să existe înaintea API-ului din acest lot.
