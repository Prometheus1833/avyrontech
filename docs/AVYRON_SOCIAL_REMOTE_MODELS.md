# Modele AI remote pentru AVYRON Social Studio

## Principiu

AVYRON Social Studio nu descarca si nu stocheaza greutati de modele, checkpoint-uri,
runtime-uri ori cache-uri mari. D1 pastreaza numai metadate compacte: identificatorul
modelului, rolul, furnizorul, licenta, sursa oficiala, limita si starea verificarii.

Infrenta are loc exclusiv remote prin bindingul Cloudflare Workers AI. Continutul text
ramane ciorna. Fisierele media aprobate folosesc R2, nu coloane BLOB in D1.

## Rute active

- `routine_copy`: GLM-4.7-Flash pentru copy social, variante native si hook-uri.
- `premium_editorial`: gpt-oss-120b pentru articole, concepte Reel si revizie editoriala.
- `image_generation`: FLUX.1 schnell pentru imagini aprobate.
- `audio_transcription`: Whisper large-v3-turbo pentru subtitrari.

LTX-Video si Wan2.2 sunt inregistrate numai drept catalog oficial. Fara un endpoint
remote verificat gratuit, agentul produce storyboard, cadre, voice-over, subtitrari si
instructiuni pentru editorul nativ, dar nu porneste generare video.

## Protectii de cost si stocare

- mod obligatoriu `free_only` si fara fallback platit;
- rezerva interna de maximum 7.000 unitati/zi, sub alocarea publica de 10.000 neuroni;
- resetare la 00:00 UTC si `hard_stop_before_paid=1`;
- maximum sase generari text, una imagine si doua transcrieri pe zi;
- ruta se opreste cand nu este verificata, este epuizata sau necesita plata;
- `storage_policy=metadata_only` pentru toate modelele;
- secretele raman exclusiv in bindings Cloudflare.

Limita interna este intentionat conservatoare. Ea nu inlocuieste verificarea planului
contului Cloudflare si a consumului total al contului inainte de activarea productiei.
