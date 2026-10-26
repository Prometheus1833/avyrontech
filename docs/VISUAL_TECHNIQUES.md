# Tehnici vizuale AVYRON și reguli reutilizabile

Efectele bune din acest proiect explică produsul, păstrează conținutul accesibil și cedează imediat când dispozitivul sau utilizatorul cere mai puțină mișcare. Nu transporta automat paleta, logo-ul sau decorul AVYRON în alte proiecte; reutilizează mecanismul și adaptează expresia vizuală la produsul real.

## Modele implementate

| Model | Implementare verificabilă în cod | Ce se poate reutiliza |
| --- | --- | --- |
| Scenă de dispozitive la scroll | [`IndustryDeviceShowcase.tsx`](../src/components/site/IndustryDeviceShowcase.tsx), [`device-showcase.css`](../src/components/site/device-showcase.css) | Laptop → telefon → tabletă pe progres normalizat; `smoothstep`, transformări CSS 2.5D, un singur `requestAnimationFrame`, secțiune sticky, salt accesibil direct la etapă și pauză în afara viewportului. Conținutul din ecrane trebuie să reprezinte produsul real. |
| Buget vizual pe dispozitiv | [`capability.ts`](../src/lib/stage/capability.ts), [`PerformanceGovernor.tsx`](../src/components/site/PerformanceGovernor.tsx) | Trepte `ultra`, `standard`, `usor`, `none`; limite pentru DPR, FPS, particule și post-processing. `prefers-reduced-motion`, Save-Data și lipsa WebGL2 aleg posterul static. |
| WebGL încărcat la nevoie | [`StageSlot.tsx`](../src/components/biblioteca/StageSlot.tsx), [`Backdrop.tsx`](../src/components/biblioteca/effects/Backdrop.tsx) | Poster semantic în DOM și prerender; import dinamic lângă viewport; pornire doar când scena este vizibilă; demontare după ieșire pentru a elibera contextul WebGL. |
| Scroll și randare în același timp | [`useLenis.ts`](../src/components/biblioteca/useLenis.ts) | O singură sursă de timp pentru scrollul DOM și efectele WebGL, fără deturnarea interacțiunii native; dezactivare la mișcare redusă și cleanup complet. |
| Intro scurt de serviciu | [`ServiceCinematicIntro.tsx`](../src/components/services/ServiceCinematicIntro.tsx) | Canvasul critic pornește imediat; GSAP se importă dinamic doar pentru text pe hardware puternic. Există gardă de timp și teardown, astfel încât animația să nu blocheze pagina. |
| Preloader decorativ | [`BlogPreloader.tsx`](../src/components/blogpro/BlogPreloader.tsx) | Canvas 2D cu perspectivă calculată, buget de particule adaptat dispozitivului și conținut real deja randat dedesubt; intro mai scurt la vizitele repetate. |
| Text condus de scroll | [`WebsiteIntroScrollScene.tsx`](../src/components/services/WebsiteIntroScrollScene.tsx) | Paragrafe pe segmente distincte; ieșirea unuia precedă intrarea următorului pentru lizibilitate; fallback la mișcare redusă. |
| Logo 3D cu fallback | [`StageProvider.tsx`](../src/components/logo3d/StageProvider.tsx), [`FlatMark.tsx`](../src/components/logo3d/FlatMark.tsx) | Nu presupune WebGL; fallbackul plat este parte din experiență, nu o eroare. Verifică activul original aprobat înainte de orice schimbare de marcă. |

## Rețetă pentru un efect nou

1. Definește ce explică scena și ce element HTML rămâne util fără JavaScript, animație sau WebGL. Păstrează textul și CTA-urile în DOM; posterul nu trebuie să fie un cadru gol.
2. Alege metoda cea mai ieftină care rezolvă scena: CSS pentru microinteracțiuni, Canvas 2D pentru particule plane, WebGL doar pentru profunzime și interacțiune care chiar o cer. Un efect 2.5D trebuie numit 2.5D.
3. Aplică `motionProfile(detectTier())` și `prefers-reduced-motion`. Redu DPR, particulele și FPS înainte de a sacrifica lizibilitatea; pe `none` nu monta WebGL.
4. Încarcă resursele mari numai aproape de viewport. Folosește un singur scheduler `requestAnimationFrame`; oprește-l când scena iese din ecran, tabul este ascuns sau componenta se demontează. Eliberează observere, timere, tweenuri și contexte.
5. Pentru scene sticky, normalizează progresul din geometria secțiunii, nu din durata presupusă a scrollului. Oferă control direct prin butoane, focus, `aria-*` și stări inactive care nu captează pointerul.
6. Verifică pe desktop și mobil, cu mișcare redusă, dispozitiv lent, fără WebGL, navigare prin tastatură și HTML prerandat. Măsoară layout shift, încărcarea și răspunsul la interacțiune; nu declara FPS sau Core Web Vitals fără măsurare.

Direcția AVYRON este premium, profesională și reținută: profunzimea, lumina și tranzițiile trebuie să susțină înțelegerea serviciului, fără să ascundă conținutul sau să încetinească interfața. Aceasta este o regulă de design, nu o dovadă că fiecare scenă actuală este deja optimă.
