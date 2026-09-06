# Prompt pentru Claude Design — AVYRON Cinematic Scroll Scene

> Copiază tot ce e sub linia de mai jos într-un prompt nou.
> Specificația detaliată, cadru cu cadru: [`SCENE_SPEC.md`](./SCENE_SPEC.md).
> Cadrele de referință: [`frames/`](./frames).

---

## PROMPT

Construiește o experiență web **cinematică, controlată integral de scroll**, cu o singură
scenă 3D continuă prin care camera călătorește. Nu construi șapte secțiuni separate cu
tranziții între ele — construiește **un singur spațiu 3D** și mișcă o cameră prin el.
Poziția de scroll *este* poziția camerei.

### Stack obligatoriu
- **GSAP 3 + ScrollTrigger** — sursa unică de adevăr pentru progres (`scrub: 1`, `pin: true`)
- **Lenis** — smooth scroll (`lerp: 0.085`), integrat în același `requestAnimationFrame` cu ScrollTrigger
- **Three.js r160+** — scena, camera, materialele
- **postprocessing** (pmndrs) — `EffectComposer`: Bloom → DepthOfField → ChromaticAberration → Noise → Vignette
- **Framer Motion** — doar micro-interacțiuni DOM (hover, focus), niciodată pentru scroll
- Nori volumetrici: **3D Gaussian Splatting** dacă e disponibil; altfel `THREE.Points` GPGPU cu `AdditiveBlending`

### Master timeline

```js
const master = gsap.timeline({
  scrollTrigger: {
    trigger: pageRef.current,
    start: "top top",
    end: "+=700%",
    scrub: 1,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  }
});
```

Camera: `PerspectiveCamera(38, aspect, 0.1, 400)`. **FOV-ul se animează** (38° → 52° → 34°) —
este instrumentul principal de expresie cinematică, nu doar poziția.

### Cele 7 scene

Respectă **exact** aceste praguri de progres, această ordine și acest ritm.

**SCENE 01 · 0–12% · Device reveal & descent**
Camera coboară vertical printr-o coloană de lumină/apă: `(0, 26, 14) → (0, 6, 9)`, FOV `38° → 44°`.
Particule albe urcă prin cadru (mișcare relativă = senzație de viteză). O siglă chrome
(torus, `metalness 1`, `roughness 0.08`, `envMapIntensity 2.4`) plutește central și rotește
`y += progress * PI * 1.4`. Un nor volumetric urcă din adâncime, `opacity 0 → 1` în ultimii 40%.
Fog `FogExp2(0.028)`. DoF cu focus pe siglă, `bokehScale 3.2`. Easing `power2.inOut` pe cameră,
`linear` pe particule. Parallax: fundal `0.15` / nor `0.45` / siglă `1.0` / particule `1.65`.
DOM: doar nav pill-ul, fade-in în primele 3%.

**SCENE 02 · 12–26% · Hero type & liquid metal**
Camera face dolly-in pur: `(0.6, 6, 9) → (0.2, 4.2, 6.4)`, FOV `44° → 40°`, fără orbit.
Titlul hero apare stânga-jos pe 3 linii, revelate prin `clip-path: inset(0 0 100% 0) → inset(0 0 0% 0)`
cu stagger `0.06` și `blur(14px) → blur(0)`. Coloană de microcopy mono în dreapta, delay `0.08`.
Obiectul chrome se transformă în formă lichidă, `scale 1 → 1.35`, `rotation.y 0 → 2.4rad`.
**Titlul nu dispare prin fade — trece prin cameră**: `scale 1 → 1.42` + `blur 0 → 9px` +
`opacity 1 → 0`, simultan, în intervalul 24–26%. Această mișcare este semnătura tranziției;
repet-o ori de câte ori un element DOM iese din scenă.
Adaugă ChromaticAberration `0.0008 → 0.0022`.

**SCENE 03 · 26–39% · Camera enters the display**
Momentul-cheie. FOV face spike `40° → 52°` cu `power4.inOut` — asta creează senzația fizică
de intrare în ecran. Camera: `(0.2, 4.2, 6.4) → (0, 2.6, 3.0)`, `lookAt (0,4,0) → (0,1.2,−4)`.
O coloană verticală de ~48 cioburi chrome (`InstancedMesh`, rotații random ±2rad) cade prin
centrul cadrului ca wipe 3D — `opacity` în curbă de clopot, vârf la 32%, `z = 1.5` (în fața
tuturor). În spatele ei primul card de proiect urcă: `scale 0.82 → 1`, `rotation.y −0.42 → −0.08rad`.
Titlul secțiunii anterioare persistă ca **text-fantomă supradimensionat la `opacity 0.22`**,
ocluzat de card prin depth buffer real. Radial blur `0 → 0.35 → 0`, Bloom spike `0.7 → 1.15`.

**SCENE 04 · 39–58% · Work carousel**
Cea mai lungă scenă (133vh) și cu ritmul cel mai constant. Camera se deplasează lateral
**liniar** (`easing: none`) `x: 0 → 12.5`, cu `z: 3.0 → 2.0`, iar `lookAt.x` urmărește cu
lag `0.12` (camera privește ușor înapoi — detaliu esențial).
Carduri video pe un rail orizontal, pas `x = 4.2`, distribuite pe trei planuri de adâncime
`z ∈ {−1.2, −4.5, −8}`. Scale-ul cardurilor e **fix** — toată percepția de mărime vine din
perspectivă. Material: video texture + rounded-rect mask în fragment shader (`radius 0.055`
în UV) + rim fresnel `pow(1 − dot(N,V), 2.2) * 0.55` pentru chenarul subțire luminos.
`card.rotation.y = −0.10 − (card.x − camera.x) * 0.035`.
Cel puțin o dată camera trece **prin** un card (`z = 2.2`): cardul umple ecranul, bloom-ul
saturează, planul de clipping rămâne mascat.
DoF cu `focusDistance` legat de cardul cel mai apropiat, `bokehScale 4.5` pe cele din spate.
DOM: sidebar fix stânga-jos cu întrebare + listă de servicii + CTA pill.

**SCENE 05 · 58–77% · Spatial objects & orbit**
Camera începe să orbiteze: `x = 12.5 + sin(t)*5.5`, `z = 2.0 + (1 − cos(t))*4.0`, `t: 0 → 1.15rad`,
`y: 2.2 → 3.1`, easing `sine.inOut` — orice alt easing se simte mecanic.
Cardurile se desprind de plan, `z ∈ [−12, +1]` (adâncimea maximă a experienței), devin
parțial billboard (factor `0.35` spre cameră), cel focalizat `scale → 1.18`, restul `opacity → 0.72`.
**Velocity smear pe titluri**: `uSmear = clamp(|scrollVelocity| * 0.0009, 0, 0.03)`; randează
titlul de 3 ori cu offset `±uSmear` pe canalele R și B.
DoF agresiv (`focalLength 0.028`, `bokehScale 5.0`). La 75% densitatea norului scade brusc
`0.85 → 0.12` — pregătește golul.

**SCENE 06 · 77–92% · Depth collapse**
Culoarea se golește. Camera revine pe axa centrală `→ (0, 2.4, 5.2)`, orbita se anulează,
FOV `42° → 36°` (comprimă spațiul). Rămâne o structură wireframe suspendată
(`LineSegments` + ~4.5k puncte) reflectată într-o podea umedă (`MeshReflectorMaterial`,
`blur [300,80]`, `mixStrength 22`, mask gradient `smoothstep(0, 0.45, vUv.y)`).
Un singur plan focal, fog dens `0.05`. Rig-ul pendulează `rotation.y −0.3 → 0.25rad`.
DoF se relaxează `5.0 → 1.8`. Sidebar-ul DOM iese la 77–80%.

**SCENE 07 · 92–100% · CTA & settle**
Cea mai scurtă (56vh), deliberat. Camera aproape staționară `→ (0, 2.0, 4.0)`, FOV `36° → 34°`.
Un panou full-bleed randat printr-un **shader halftone hexagonal**
(`dotRadius = luminance(tex) * uCell * 0.62`), cu o **lentilă circulară** care rezolvă zona
centrală la rezoluție completă:
```glsl
float m = smoothstep(uRadius, uRadius - 0.045, distance(vUv, uLensCenter));
vec3 col = mix(halftone, rawVideo, m);
```
Textul secțiunii și CTA-ul final stau în interiorul lentilei.
Norul din SCENE 01 revine la `opacity 0.6` — bucla se închide vizual.
**Ultimele 8% sunt decelerare pură**: parallax-ul tuturor straturilor converge la `1.0`,
`bokehScale → 0`, rotații zero, easing exclusiv `power3.out` (niciodată `inOut`).
La `progress 1` pin-ul se eliberează și pagina continuă cu footer DOM normal.

### Reguli care nu se negociază

1. **Continuitate absolută.** Zero fade-to-black, zero tăieturi. Overlap 4–6% între scene
   adiacente. Un obiect din scena N+1 începe să apară în scena N.
2. **Un singur `scrollVelocity`** calculat o dată pe frame, care alimentează: aberația
   cromatică (`0.0008 + |v|*0.000012`, clamp `0.004`), intensitatea bloom-ului
   (`+|v|*0.00008`), smear-ul de text, și alungirea particulelor (`clamp(|v|*0.002, 0, 1.4)`).
3. **Curba de energie** nu e uniformă: accelerare (S01) → stabilizare (S02) → spike (S03) →
   platou hipnotic (S04) → crescendo (S05) → colaps (S06) → liniște (S07).
4. **DOM rămâne DOM** pentru titluri, microcopy, sidebar, CTA-uri, footer — accesibile,
   selectabile, indexabile. **WebGL** pentru orice text care se deformează sau trebuie să
   respecte perspectiva (titlurile cardurilor). Elementele DOM ancorate în spațiul 3D se
   poziționează prin `camera.project()`, nu prin `z-index`.
5. **Zero alocări în bucla `raf`.** `Vector3`/`Quaternion` pre-alocate la nivel de modul.

### Paletă

Folosește tokenii de brand AVYRON din `src/index.css` (nu culorile referinței):

| Rol | Token | HSL |
|---|---|---|
| Nor primar / accent | `--brand` | `264 90% 62%` |
| Nor secundar / adâncime | `--brand-2` | `200 95% 55%` |
| Nor terțiar / highlight | `--brand-3` | `330 85% 65%` |
| Bloom / rim light | `--brand-glow` | `264 100% 75%` |
| Fundal scenă | `--background` (dark) | `222 25% 7%` |

Tipografie: `font-display` (Avenir Next) pentru titluri, mono pentru microcopy și etichete.

### Performanță

60fps pe M1 / RTX 3060, floor 30fps pe GPU integrat, primul frame sub 2.5s.
`setPixelRatio(min(dpr, 2))` (1.5 pe mobil). Instancing pentru cioburi și particule.
Doar cardurile din frustum au video-ul `play()`-at. DoF la half-res. FXAA manual, `multisampling: 0`.
**Adaptive quality**: dacă `avgFrameTime > 22ms` timp de 60 frame-uri, elimină pe rând
DoF → bloom la `resolutionScale 0.5` → LOD pe norul volumetric.

**Fallback-uri obligatorii:**
- `prefers-reduced-motion` → fără pin, fără scrub; scenele devin secțiuni statice cu
  poster-image și fade-in simplu.
- WebGL indisponibil → layout static cu aceleași texte DOM și `<img>` în loc de canvas.
  SEO neafectat, pentru că titlurile sunt deja DOM.
- Mobil → S01+S02 fuzionează, orbita din S05 devine deplasare liniară, norul volumetric
  devine point cloud clasic de ~60k puncte.

### Ordinea de construcție

1. Lenis + ScrollTrigger + pin, cu un cub ca subiect. Validează `progress`.
2. **Traseul complet al camerei** pe toate 7 scenele, cu `AxesHelper` ca subiect. Aici se
   joacă tot filmul — nu trece mai departe până nu se simte bine cu geometrie primitivă.
3. Cardurile: geometrie, rounded-rect shader, rim fresnel, video texture, distribuție pe rail.
4. Sincronizarea DOM: titluri, mask-uri, sidebar, ancorare `camera.project()`.
5. Norii volumetrici.
6. Post-processing, în ordinea: Bloom → DoF → ChromaticAberration → Noise → Vignette.
7. Velocity effects.
8. Tuning de easing, overlap-uri, curba de energie.
9. Performanță și fallback-uri.

Pașii 1–4 dau 70% din efect.

### Livrabil

React + TypeScript + Vite, Tailwind pentru DOM. Un hook `useCinematicScroll()` care expune
`progress`, `velocity` și `scene`, plus componente separate pentru fiecare grup de obiecte 3D.
Traseul camerei într-un singur fișier de configurare, editabil fără să atingi logica de render.
