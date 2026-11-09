# AVY Chat — context comercial și prețuri

Corecție din 9 noiembrie 2026. Starea PR/CI/deploy și verificarea live se consemnează în PR; acest document descrie comportamentul și limitele implementării.

## Defect reprodus

Întrebarea publică „Cât costă un proiect?” selecta produsul public „Calculator de cost pentru proiect”, la 50 RON. Potrivirea lexicală a cuvântului „proiect” era tratată ca identificarea unui produs. Răspunsul era construit local din retrieval; schimbarea LLM-ului nu ar fi remediat cauza.

## Comportament

- O cerere generală despre buget clarifică tipul proiectului și obiectivul. Nu atribuie un preț de produs unui serviciu personalizat.
- Serviciul sau produsul explicit din mesaj are prioritate. Continuările scurte folosesc contextul autorizat al aceleiași conversații; o întrebare nouă nu moștenește automat prețul unei teme anterioare.
- O întrebare generică despre un proiect nu devine o cerere despre produs nici din istoricul conversației, nici din pagina produsului vizitat.
- Pagina publică poate oferi un indiciu pentru întrebări eliptice precum „Cât costă?”. Nu acordă acces la date private și nu înlocuiește o alegere explicită.
- Identitățile serviciilor provin din catalogul public existent. Valorile configurate în `commercial_catalog_codes` au prioritate față de valorile publice de bază. Un tarif null, `quote`, `unreviewed` sau o înregistrare inactivă nu reactivează prețul vechi din cod.
- Se păstrează moneda și periodicitatea. Un tarif de pornire este prezentat ca reper, nu ca ofertă finală. Pentru Website la 0 lei, dezvoltarea inclusă este diferențiată de abonamentul lunar contra cost; prețurile lunare neaprobate nu sunt inventate.
- Produsele trebuie să fie publicate și disponibile conform regulilor existente. O denumire explicită are prioritate față de simpla potrivire pe cuvinte comune, cum ar fi „calculator”. Codurile contabile nepublicate și denumirile interne nu sunt expuse.
- Răspunsul comercial include o întrebare de calificare relevantă, fără a cere din nou informațiile evidente din mesaj și fără a promite funcționalități, reduceri sau livrări neconfirmate.

## Modele și costuri

Se reutilizează `runAiCore`, registrul central și bindingul Workers AI existente. Nu se creează integrare, cheie, server, cont sau model paralel. Generarea publică solicită explicit `freeOnly`; politicile, cotele, opririle și bugetele existente rămân aplicabile. Nu se lansează apeluri speculative la mai multe LLM-uri.

Clarificarea intenției și comunicarea unui tarif verificat nu necesită inferență. Recomandările generale pot folosi modelul configurat și instrucțiunile aprobate, cu reguli suplimentare pentru un ton atent și diferențierea serviciilor de produsele digitale. Când modelul este indisponibil sau cota este insuficientă, canalul comercial păstrează răspunsurile locale utile și verificate.

Sumele numerice cu monedă din răspunsurile modelului sunt comparate cu faptele de catalog, inclusiv moneda și formatarea. Sumele în litere care nu pot fi validate determinist folosesc răspunsul verificat în locul generării. Un răspuns respins nu este publicat ca succes al modelului; consumul tentativei și motivul sunt păstrate în audit, fără jurnalizarea textului generat. Acesta este un control suplimentar, nu o certificare că orice afirmație a unui LLM poate fi validată automat.

## Verificare și limite

Testele handlerului real și D1 migrat acoperă clarificarea RO/EN, produs versus proiect, continuările și schimbarea serviciului, indicii de pagină, actualizarea imediată a prețului, monede și abonamente, valori neaprobate/inactive, date contabile private, erorile furnizorului, cota epuizată și respingerea sumelor inventate. Testele pure verifică clasificarea și formatele monetare.

Furnizorii din testele automate sunt simulați. O configurație prezentă în D1 nu dovedește o inferență live; aceasta trebuie verificată separat numai în cota disponibilă. Nu se resetează și nu se măresc cote pentru a obține un rezultat verde. Testele live utilizează întrebări sintetice, fără date personale sau documente de client.

Nu sunt necesare migrări, rescrieri ale instrucțiunilor personalizate, modificări ale autentificării/RBAC sau publicarea altor proiecte. Rollbackul este revenirea la versiunea anterioară a Workerului; tarifele și istoricul nativ nu sunt rescrise.
