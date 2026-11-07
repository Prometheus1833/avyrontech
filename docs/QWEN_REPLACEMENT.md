# Înlocuirea Qwen — 7 noiembrie 2026

Bază: `6d00e41e04bd68cabe8268ccb5cb3065ddcf5021`. Utilizatorul a solicitat înlocuirea Qwen înainte de retragerea din 20 noiembrie. Starea migrării remote și dovezile live se consemnează în PR; acest document nu certifică publicarea.

## Model și integrare

Modelul primar devine `@cf/mistralai/mistral-small-3.1-24b-instruct`, prin bindingul Cloudflare Workers AI existent. [Documentația oficială](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/) confirmă identificatorul, interfața `messages` și modelul de 24B. Nu sunt necesare conturi, chei externe, servere sau greutăți descărcate.

[Politica Cloudflare](https://developers.cloudflare.com/workers-ai/platform/pricing/) include o alocare gratuită zilnică, nu utilizare gratuită nelimitată. AVYRON păstrează bugetele monetare zero, plafoanele interne și hard-stopul înainte de costuri. Cotele și rezervările consumate nu sunt resetate sau extinse pentru migrare/testare.

## Migrarea 0103

- Schimbă numai identificatorul Qwen al registrului primar; păstrează modelele secundar/imagine, stările și limitele.
- Creează versiuni noi din snapshotul curent, păstrând instrucțiunile, aprobarea/ciorna, autonomia și permisiunile. Nu rescrie versiunile istorice sau editările viitoare neaprobate și nu activează agenți suspendați.
- Actualizează rutele sociale Qwen cu aceleași controale Free. O rută Mistral existentă dezactivată nu este activată automat; ruta Qwen duplicată este dezactivată.
- Aliasul runtime redirecționează identificatorul retras către Mistral. Modelele personalizate rămân intacte.
- Adaptorul păstrează schema JSON strictă și utilizează `guided_json`, conform API-ului Mistral. Surveys păstrează Cost Guard și folosește tarifele specifice modelului pentru estimare, fără a activa AI sau bugete noi.
- Înregistrează înlocuirea în auditul nativ. Migrarea este idempotentă.

## Verificare

Testele folosesc schema completă și handlerul real al chatbotului, cu furnizor simulat: modelul selectat, istoricul, permisiunile, ciornele, pauzele, rutele duplicate și bugetele consumate. CI validează buildurile existente. Inferența reală se verifică numai în bugetul rămas, prin AI Core și protecțiile native; nu se măresc sau resetează cote pentru un rezultat verde. Testele simulate nu sunt prezentate drept confirmări ale furnizorului.
