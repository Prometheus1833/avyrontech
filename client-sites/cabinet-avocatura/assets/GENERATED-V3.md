# Fundal cinematic juridic

Generat cu ImageGen integrat la 6 noiembrie 2026. Rezoluție nativă: **1774 × 887 px**. Sursă locală: `legal-cinematic-v3-original.png`, exclusă din Git și publicare. Scenă ilustrativă, fără reprezentarea sediului real.

Derivate din aceeași fotografie, fără mărire: desktop 960 × 480 și 1536 × 768; mobil 480 × 576 și 720 × 864, cu decupaj din partea dreaptă pentru păstrarea balanței. AVIF/WebP. AVIF: 18–33 KB desktop, 17–27 KB mobil. Încărcare lazy, fundal static, fără video sau WebGL.

## Prompt exact

```
Use case: photorealistic-natural. Asset type: cinematic background for the footer of a contemporary Romanian law office website. Primary request: exceptionally refined editorial architectural photograph, modern legal practice at blue hour in Bucharest. A sculptural contemporary balance of justice in dark brushed bronze sits far to the right of a deep navy stone desk, beside a neatly closed navy legal document folio. Through floor-to-ceiling glass, distant restrained Bucharest city lights and modern buildings, softly defocused. Strong layered depth: dark foreground desk, sculptural justice object in middle distance, quiet skyline beyond. Elegant contemporary materials, fluted dark timber, glass, warm narrow practical light accents. Wide composition with generous very dark uncluttered negative space across left two-thirds and upper middle for white website text and footer navigation. Deep midnight blue, ink navy, subtle teal, restrained warm bronze. Photorealistic, high material detail, natural optical falloff, subtle cinematic lighting, no glow effects, no excessive bokeh. No people, no readable text, no logo, no watermarks, no antique books, no classical columns, no gavel, no courthouse stock-photo cliches. Illustrative setting, not an assertion of the actual premises. Landscape image, maximum native detail and clean contrast, subject on far right must remain meaningful in an alternate mobile crop.
```

## Repere pentru implementare

- [WAI — Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): oprire la focus și control vizibil al mișcării.
- [MDN — requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame): progres dependent de timp, cu un singur scheduler comun.
- [MDN — Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events): drag cu mouse și păstrarea scrollului tactil nativ.

Efectele cardurilor folosesc perspectivă CSS 2.5D. Mișcarea automată se oprește la hover, apăsare, focus, în afara ecranului, în tab ascuns și la preferința de mișcare redusă. Focusul și săgețile trec la control manual până la repornirea explicită.
