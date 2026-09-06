# Cinematic Scroll Scene

Analiza scenei 3D cinematice controlate de scroll și specificația pentru reconstrucția ei
pe site-ul AVYRON.

| Fișier | Conținut |
|---|---|
| [`SCENE_SPEC.md`](./SCENE_SPEC.md) | Specificația completă: master timeline, cele 7 scene cu toate axele (camera path, obiecte, pinning, scroll distance, easing, depth, scale, opacity, masking, blur, rotations, parallax, transitions, shadere/post, DOM vs WebGL), reguli transversale, buget de performanță |
| [`CLAUDE_DESIGN_PROMPT.md`](./CLAUDE_DESIGN_PROMPT.md) | Prompt gata de copiat pentru Claude Design |
| [`frames/`](./frames) | 18 cadre-cheie extrase din referință cu `ffmpeg` |

## Referință

Înregistrare video (17.10s · 720×704 · 60fps · H.264) a site-ului **activetheory.net**
rulând într-un browser desktop. Norii volumetrici din referință sunt
**3D Gaussian Splats** — Active Theory mențin un fork Three.js al implementării:
<https://github.com/activetheory/GaussianSplats3D>.

## Ce se păstrează din referință

Structura cinematică, ordinea scenelor, comportamentul scroll-ului, ritmul, traseele camerei
și mecanica tranzițiilor. **Nu** se păstrează: paleta (se folosesc tokenii de brand AVYRON),
conținutul, tipografia sau asset-urile.

## Valori numerice

Pragurile de progres și structura scenelor sunt citite direct din referință. Coordonatele
camerei, valorile de FOV, parametrii de material și cei de post-procesare sunt **derivate** —
reconstrucții calibrate pe cadrele extrase, gândite ca punct de plecare pentru tuning, nu ca
valori extrase din sursa originală.
