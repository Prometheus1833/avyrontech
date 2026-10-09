/**
 * Catalogul Bibliotecii Avyron.
 *
 * Sursa unică de adevăr pentru: secțiunile paginii, demo-urile live, textul
 * indexabil, coșul de brief și datele structurate. Fiecare efect are un cod
 * stabil folosit în cod, în ofertă și în discuția cu clientul.
 *
 * Cod: {SERVICIU}-{S|F}{număr}. S = semnătură (efect rar), F = fundație (efect
 * comun, bine executat). Cost: S ≤ 0,5 zi · M 1–2 zile · L 3–5 zile.
 */

export type EffectTier = "signature" | "foundation";
export type EffectCost = "S" | "M" | "L";

/** Cheia demo-ului live. Fără cheie, efectul apare doar ca intrare de catalog. */
export type DemoKey =
  | "hero-displacement"
  | "cinematic-descent"
  | "product-configurator"
  | "curved-gallery"
  | "logo-extrude"
  | "curtain-transition"
  | "post-generator"
  | "tilt-card"
  | "holo-card"
  | "marquee-scroll"
  | "cart-particles"
  | "flip-filters"
  | "device-scroll"
  | "theme-wave"
  | "ai-orb"
  | "chat-stream"
  | "visual-diff"
  | "cwv-gauge"
  | "reading-progress"
  | "cover-parallax"
  | "logo-particles"
  | "svg-draw";

export type LibraryEffect = {
  code: string;
  name: { ro: string; en: string };
  desc: { ro: string; en: string };
  tier: EffectTier;
  cost: EffectCost;
  demo?: DemoKey;
  /** Demo-ul folosește WebGL: trece prin StageSlot, cu poster și treaptă de calitate. */
  webgl?: true;
};

/** Demo-urile care cer un context WebGL. Restul rulează pe DOM sau canvas 2D. */
export const WEBGL_DEMOS: ReadonlySet<DemoKey> = new Set<DemoKey>([
  "hero-displacement",
  "cinematic-descent",
  "product-configurator",
  "curved-gallery",
  "logo-extrude",
]);

export type LibrarySection = {
  /** Ancora din URL — identică cu slug-ul produsului. */
  id: string;
  code: string;
  name: { ro: string; en: string };
  claim: { ro: string; en: string };
  /** Ruta produsului, pentru CTA-ul de la finalul secțiunii. */
  service: { ro: string; en: string } | null;
  /**
   * Butonul de intrare apare pe pagina produsului?
   *
   * Fals pentru produsele pe care nu le legăm de bibliotecă. Secțiunea rămâne
   * în pagină pentru cine ajunge acolo derulând, dar pagina de produs nu se
   * atinge deloc.
   */
  entry: boolean;
  /** Aplicații concrete, pe tipuri de client — exemple, nu promisiuni. */
  cases: Array<{ ro: string; en: string }>;
  /** Nuanță HSL folosită de fundalul 3D când secțiunea e activă. */
  hue: number;
  effects: LibraryEffect[];
};

const PUBLIC_SECTION_ORDER = [
  "website-prezentare-premium",
  "magazin-online",
  "aplicatii-web-si-mobile",
  "agent-ai-personalizat",
  "identitate-social-media",
  "blog-profesional",
  "logo-identitate-vizuala",
  "testare-qa-web-mobile",
] as const;

export const LIBRARY_SECTIONS: LibrarySection[] = ([
  {
    id: "website-prezentare-premium",
    code: "PRZ",
    name: { ro: "Website prezentare premium", en: "Premium presentation website" },
    claim: {
      ro: "Un site de prezentare nu trebuie doar să arate bine. Trebuie să facă vizitatorul să rămână, iar mișcarea e instrumentul care ține atenția fără să încarce pagina.",
      en: "A presentation website should not merely look good. It has to keep the visitor there, and motion is the tool that holds attention without weighing the page down.",
    },
    service: { ro: "/servicii/website-prezentare-profesional", en: "/en/services/professional-presentation-website" },
    entry: true,
    cases: [
      { ro: "O prezentare clară a serviciilor, construită în jurul întrebărilor reale ale clienților.", en: "A clear presentation of services, built around the questions customers actually ask." },
      { ro: "Animații discrete care susțin povestea brandului fără să încetinească experiența.", en: "Subtle motion that supports the brand story without slowing the experience." },
      { ro: "Un traseu simplu de la prima impresie la contact, ofertă sau programare.", en: "A simple path from the first impression to contact, quote or booking." },
    ],
    hue: 265,
    effects: [
      { code: "PRZ-S1", tier: "signature", cost: "L", demo: "cinematic-descent", webgl: true,
        name: { ro: "Coborâre cinematică", en: "Cinematic descent" },
        desc: { ro: "Orbită → nori → oraș → clădire → interior, camera pe spline condusă de scroll, în patru acte.", en: "Orbit → clouds → city → building → interior, a scroll-driven camera on a spline, in four acts." } },
      { code: "PRZ-S2", tier: "signature", cost: "M", demo: "hero-displacement", webgl: true,
        name: { ro: "Hero cu displacement", en: "Displacement hero" },
        desc: { ro: "Fotografia se lichefiază sub cursor și se recompune. Un singur shader, o singură textură.", en: "The photo liquefies under the cursor and settles back. One shader, one texture." } },
      { code: "PRZ-S3", tier: "signature", cost: "M",
        name: { ro: "Titluri 3D fără pierdere de claritate", en: "Crisp 3D headlines" },
        desc: { ro: "Text MSDF care se extrudează și se aliniază la scroll, rămânând selectabil pentru SEO.", en: "MSDF text that extrudes and aligns on scroll while staying selectable for SEO." } },
      { code: "PRZ-S4", tier: "signature", cost: "L", demo: "curtain-transition",
        name: { ro: "Tranziție de pagină „cortină”", en: "Curtain page transition" },
        desc: { ro: "Pagina veche se destramă în plăci care se recompun în cea nouă, fără flash alb.", en: "The old page shatters into tiles that reassemble as the new one, with no white flash." } },
      { code: "PRZ-S5", tier: "signature", cost: "S",
        name: { ro: "Cursor magnetic cu lentilă", en: "Magnetic lens cursor" },
        desc: { ro: "Zonă de lupă care distorsionează local grila și atrage butoanele apropiate.", en: "A lens area that warps the local grid and pulls nearby buttons toward it." } },
      { code: "PRZ-F1", tier: "foundation", cost: "S",
        name: { ro: "Dezvăluire progresivă la scroll", en: "Progressive scroll reveal" },
        desc: { ro: "Stagger pe rânduri și pe carduri, cu prag de intrare în viewport.", en: "Staggered rows and cards, triggered on viewport entry." } },
      { code: "PRZ-F2", tier: "foundation", cost: "S", demo: "cover-parallax",
        name: { ro: "Parallax pe trei straturi", en: "Three-layer parallax" },
        desc: { ro: "Fundal, mijloc și prim-plan cu viteze diferite, plus fixarea secțiunii pe durata unei povești.", en: "Background, midground and foreground at different speeds, plus section pinning for one story beat." } },
      { code: "PRZ-F3", tier: "foundation", cost: "S", demo: "tilt-card",
        name: { ro: "Carduri cu înclinare și lumină", en: "Tilt cards with specular light" },
        desc: { ro: "Înclinare 3D cu reflexie speculară care urmărește cursorul.", en: "3D tilt with a specular highlight that tracks the cursor." } },
      { code: "PRZ-F4", tier: "foundation", cost: "S",
        name: { ro: "Fundal gradient-mesh animat", en: "Animated gradient mesh" },
        desc: { ro: "Generat pe canvas, sub 3 kB, fără imagine de descărcat.", en: "Canvas-generated, under 3 kB, with no image to download." } },
      { code: "PRZ-F5", tier: "foundation", cost: "S",
        name: { ro: "Contoare și bare de încredere", en: "Trust counters and bars" },
        desc: { ro: "Pornesc la intrarea în viewport, cu cifre tabulare aliniate.", en: "They start on viewport entry, with aligned tabular figures." } },
    ],
  },
  {
    id: "identitate-social-media",
    code: "SOC",
    name: { ro: "Identitate social media", en: "Social media identity" },
    claim: {
      ro: "Identitatea se vede în mișcare, nu în paletă. Un template care se animă corect valorează cât zece postări statice.",
      en: "Identity shows in motion, not in a palette. One template that animates well is worth ten static posts.",
    },
    service: { ro: "/servicii/identitate-social-media", en: "/en/services/social-media-identity" },
    entry: true,
    cases: [
      { ro: "Cofetărie: generatorul scoate treizeci de postări pe lună din același brand kit.", en: "Pastry shop: the generator turns out thirty posts a month from one brand kit." },
      { ro: "Sală de fitness: feed viu pe telefon, cu abonamentele derulând în mockup.", en: "Gym: a live feed on the phone mockup, memberships scrolling inside." },
      { ro: "Salon de înfrumusețare: card holografic pentru voucherele cadou.", en: "Beauty salon: a holographic card for gift vouchers." },
    ],
    hue: 320,
    effects: [
      { code: "SOC-S1", tier: "signature", cost: "M", demo: "device-scroll",
        name: { ro: "Feed viu pe telefon 3D", en: "Live feed on a 3D phone" },
        desc: { ro: "Mockup care se rotește ușor, iar feed-ul din el derulează sincron cu pagina.", en: "A mockup that tilts gently while the feed inside scrolls in sync with the page." } },
      { code: "SOC-S2", tier: "signature", cost: "M", demo: "holo-card",
        name: { ro: "Card de brand cu folie holografică", en: "Holographic foil brand card" },
        desc: { ro: "Shader iridescent care reacționează la cursor pe desktop și la giroscop pe mobil.", en: "An iridescent shader reacting to the cursor on desktop and the gyroscope on mobile." } },
      { code: "SOC-S3", tier: "signature", cost: "L", demo: "post-generator",
        name: { ro: "Generator de postare", en: "Post generator" },
        desc: { ro: "Alegi paleta și textul, se randează template-ul animat și îl exporți ca imagine sau clip scurt.", en: "Pick palette and copy, the animated template renders, and you export it as an image or short clip." } },
      { code: "SOC-S4", tier: "signature", cost: "M",
        name: { ro: "Tipografie kinetică", en: "Kinetic typography" },
        desc: { ro: "Același titlu se rearanjează singur în trei formate: story, feed, cover.", en: "The same headline rearranges itself across three formats: story, feed, cover." } },
      { code: "SOC-S5", tier: "signature", cost: "M",
        name: { ro: "Mozaic care se recompune", en: "Reassembling mosaic" },
        desc: { ro: "Nouă postări separate se strâng într-un singur vizual de grid și înapoi.", en: "Nine separate posts gather into a single grid visual and back again." } },
      { code: "SOC-F1", tier: "foundation", cost: "S",
        name: { ro: "Carusel cu snap și progres de story", en: "Snap carousel with story progress" },
        desc: { ro: "Bare de progres sus, oprire la atingere, derulare cu degetul.", en: "Progress bars on top, pause on touch, swipe to advance." } },
      { code: "SOC-F2", tier: "foundation", cost: "S",
        name: { ro: "Video care pornește la hover", en: "Hover-to-play video" },
        desc: { ro: "Poster static pentru LCP, sursa se încarcă abia la intenție.", en: "A static poster for LCP; the source loads only on intent." } },
      { code: "SOC-F3", tier: "foundation", cost: "S",
        name: { ro: "Paletă aplicată live", en: "Live palette swap" },
        desc: { ro: "Schimbi culoarea brandului și toată secțiunea se recolorează instant.", en: "Change the brand color and the whole section recolors instantly." } },
      { code: "SOC-F4", tier: "foundation", cost: "S",
        name: { ro: "Înainte / după pe același cont", en: "Before / after on one account" },
        desc: { ro: "Slider între postarea făcută în grabă și varianta lucrată.", en: "A slider between the rushed post and the crafted one." } },
      { code: "SOC-F5", tier: "foundation", cost: "S", demo: "marquee-scroll",
        name: { ro: "Marquee cu viteză variabilă", en: "Scroll-reactive marquee" },
        desc: { ro: "Accelerează cu direcția scroll-ului și se oprește la hover.", en: "It accelerates with scroll direction and stops on hover." } },
    ],
  },
  {
    id: "magazin-online",
    code: "SHP",
    name: { ro: "Magazin online", en: "Online store" },
    claim: {
      ro: "Într-un magazin, fiecare efect trebuie să răspundă la o întrebare de cumpărare: cum arată produsul, ce am în coș, cât mai durează.",
      en: "In a store, every effect must answer a buying question: what the product looks like, what is in the cart, how much longer this takes.",
    },
    service: { ro: "/servicii/magazin-online", en: "/en/services/online-store" },
    entry: true,
    cases: [
      { ro: "Magazin de mobilă: configurator 3D pe canapele, cu textile comutabile.", en: "Furniture store: a 3D configurator on sofas, with switchable fabrics." },
      { ro: "Bijuterii: gravura pe inel, vizibilă înainte de a plasa comanda.", en: "Jewellery: the engraving on the ring, visible before the order is placed." },
      { ro: "Magazin de corpuri de iluminat: galerie curbată pentru două sute de produse.", en: "Lighting store: a curved gallery for two hundred products." },
    ],
    hue: 20,
    effects: [
      { code: "SHP-S1", tier: "signature", cost: "L", demo: "product-configurator", webgl: true,
        name: { ro: "Configurator 3D de produs", en: "3D product configurator" },
        desc: { ro: "Material, culoare, gravură, cu iluminare HDRI și umbră reală pe podea.", en: "Material, color, engraving, with HDRI lighting and a real contact shadow." } },
      { code: "SHP-S2", tier: "signature", cost: "M", demo: "cart-particles",
        name: { ro: "Adăugare în coș cu traiectorie", en: "Add to cart with a trajectory" },
        desc: { ro: "Produsul se desface în particule care zboară pe o curbă până în iconul de coș.", en: "The product bursts into particles that arc into the cart icon." } },
      { code: "SHP-S3", tier: "signature", cost: "M",
        name: { ro: "Tranziție grilă → pagină de produs", en: "Grid to product transition" },
        desc: { ro: "Element partajat, cu View Transitions API și rezervă pentru browserele mai vechi.", en: "Shared element, using the View Transitions API with a fallback for older browsers." } },
      { code: "SHP-S4", tier: "signature", cost: "L", demo: "curved-gallery", webgl: true,
        name: { ro: "Galerie infinită curbată", en: "Curved infinite gallery" },
        desc: { ro: "Curbură la scroll: două sute de produse care nu par o listă.", en: "Curvature on scroll: two hundred products that never feel like a list." } },
      { code: "SHP-S5", tier: "signature", cost: "M",
        name: { ro: "Vezi produsul în camera ta", en: "See the product in your room" },
        desc: { ro: "AR pe mobil, cu model GLB pentru Android și USDZ pentru iOS.", en: "Mobile AR, with a GLB model for Android and USDZ for iOS." } },
      { code: "SHP-F1", tier: "foundation", cost: "S",
        name: { ro: "Quick view în panou lateral", en: "Quick view drawer" },
        desc: { ro: "Se deschide fără să pierzi poziția din listă.", en: "It opens without losing your place in the list." } },
      { code: "SHP-F2", tier: "foundation", cost: "S", demo: "flip-filters",
        name: { ro: "Filtre cu reordonare animată", en: "Filters with animated reordering" },
        desc: { ro: "Grila se rearanjează prin FLIP, fără să clipească la fiecare filtrare.", en: "The grid rearranges via FLIP instead of flickering on every filter change." } },
      { code: "SHP-F3", tier: "foundation", cost: "S",
        name: { ro: "Lupă pe imaginea de produs", en: "Product image lens" },
        desc: { ro: "Zoom continuu, cu sursa de rezoluție mare încărcată la cerere.", en: "Continuous zoom, with the high-resolution source loaded on demand." } },
      { code: "SHP-F4", tier: "foundation", cost: "S",
        name: { ro: "Mini-coș sticky", en: "Sticky mini cart" },
        desc: { ro: "Badge care reacționează la schimbare, fără să sară layout-ul.", en: "A badge that reacts to change without shifting the layout." } },
      { code: "SHP-F5", tier: "foundation", cost: "S",
        name: { ro: "Skeleton și răspuns optimist", en: "Skeleton and optimistic response" },
        desc: { ro: "Interfața confirmă acțiunea înainte de răspunsul serverului.", en: "The interface confirms the action before the server replies." } },
    ],
  },
  {
    id: "aplicatii-web-si-mobile",
    code: "APP",
    name: { ro: "Aplicații web și mobile", en: "Web and mobile apps" },
    claim: {
      ro: "La o aplicație, mișcarea nu decorează: explică unde ești, ce s-a schimbat și ce urmează.",
      en: "In an app, motion is not decoration: it explains where you are, what changed and what comes next.",
    },
    service: { ro: "/servicii/aplicatii-si-platforme", en: "/en/services/apps-and-platforms" },
    entry: true,
    cases: [
      { ro: "Aplicație de livrare: fluxul de comandă jucabil direct în pagina de prezentare.", en: "Delivery app: the ordering flow playable right in the landing page." },
      { ro: "Platformă de rezervări: device 3D care parcurge cele patru ecrane principale.", en: "Booking platform: a 3D device walking through the four main screens." },
      { ro: "SaaS B2B: diagramă animată a integrărilor, în loc de o listă de logo-uri.", en: "B2B SaaS: an animated integrations diagram instead of a logo wall." },
    ],
    hue: 200,
    effects: [
      { code: "APP-S1", tier: "signature", cost: "M", demo: "device-scroll",
        name: { ro: "Device 3D care schimbă ecranul", en: "3D device that swaps screens" },
        desc: { ro: "Telefonul se rotește la scroll, iar interfața din el trece prin fluxul real.", en: "The phone rotates on scroll while the interface inside walks the real flow." } },
      { code: "APP-S2", tier: "signature", cost: "M",
        name: { ro: "Onboarding jucabil în pagină", en: "Playable onboarding" },
        desc: { ro: "Prototip funcțional, nu video: apeși butoane adevărate.", en: "A working prototype, not a video: you press real buttons." } },
      { code: "APP-S3", tier: "signature", cost: "M",
        name: { ro: "Arhitectură care „curge”", en: "Flowing architecture diagram" },
        desc: { ro: "Diagramă animată în care datele se plimbă între client, worker și bază de date.", en: "An animated diagram where data travels between client, worker and database." } },
      { code: "APP-S4", tier: "signature", cost: "S", demo: "theme-wave",
        name: { ro: "Val de comutare temă", en: "Theme switch wave" },
        desc: { ro: "Light/dark care se propagă din punctul apăsat peste tot ecranul.", en: "Light/dark spreading from the point you pressed across the whole screen." } },
      { code: "APP-F1", tier: "foundation", cost: "S",
        name: { ro: "Indicator de tab care curge", en: "Fluid tab indicator" },
        desc: { ro: "Se întinde și se strânge între tab-uri, cu animație de layout.", en: "It stretches and contracts between tabs, with layout animation." } },
      { code: "APP-F2", tier: "foundation", cost: "S",
        name: { ro: "Gesturi mobile simulate", en: "Simulated mobile gestures" },
        desc: { ro: "Swipe și pull-to-refresh demonstrate în mockup.", en: "Swipe and pull-to-refresh demonstrated inside the mockup." } },
      { code: "APP-F3", tier: "foundation", cost: "S",
        name: { ro: "Grafice cu scrub", en: "Scrubbable charts" },
        desc: { ro: "Tragi cu degetul pe serie și citești valoarea exactă.", en: "Drag along the series and read the exact value." } },
      { code: "APP-F4", tier: "foundation", cost: "S",
        name: { ro: "Notificare push la momentul potrivit", en: "Well-timed push notification" },
        desc: { ro: "Intră în ecranul mockup exact când scroll-ul ajunge la povestea ei.", en: "It slides into the mockup screen exactly when the scroll reaches its story." } },
    ],
  },
  {
    id: "agent-ai-personalizat",
    code: "AIA",
    name: { ro: "Agenți AI și automatizări", en: "AI agents and automation" },
    claim: {
      ro: "Agenți specializați pot prelua conversații, emailuri, activități social media, calificarea leadurilor și procese repetitive, cu reguli clare și control uman.",
      en: "Specialized agents can handle conversations, email, social media activity, lead qualification and repetitive processes, with clear rules and human control.",
    },
    service: { ro: "/servicii/automatizari-si-ai", en: "/en/services/automation-and-ai" },
    entry: true,
    cases: [
      { ro: "Clinică: agentul preia programările din afara programului.", en: "Clinic: the agent takes bookings outside working hours." },
      { ro: "Firmă de curățenie: fișa de lead se completează singură din conversație.", en: "Cleaning company: the lead card fills itself from the conversation." },
      { ro: "Magazin online: orb conversațional pe pagina de contact, în locul unui formular mort.", en: "Online store: a conversational orb on the contact page instead of a dead form." },
    ],
    hue: 160,
    effects: [
      { code: "AIA-S1", tier: "signature", cost: "M", demo: "ai-orb",
        name: { ro: "Centru conversațional inteligent", en: "Intelligent conversation hub" },
        desc: { ro: "Conversațiile de pe site și din canalele conectate sunt gestionate coerent, cu transfer către echipă atunci când este necesar.", en: "Website and connected-channel conversations are handled consistently, with handoff to the team whenever needed." } },
      { code: "AIA-S2", tier: "signature", cost: "L",
        name: { ro: "Demonstrație pe informații aprobate", en: "Demo using approved information" },
        desc: { ro: "Agentul răspunde numai din sursele și regulile pregătite pentru demonstrație, fără promisiuni inventate.", en: "The agent answers only from sources and rules prepared for the demo, without invented claims." } },
      { code: "AIA-S3", tier: "signature", cost: "M",
        name: { ro: "Hartă vie a automatizărilor", en: "Live automation map" },
        desc: { ro: "Arată transparent cum trece o solicitare prin validare, aprobare, CRM și notificarea echipei.", en: "Transparently shows how a request moves through validation, approval, CRM and team notification." } },
      { code: "AIA-S4", tier: "signature", cost: "M",
        name: { ro: "Undă de voce și transcriere", en: "Voice wave and transcript" },
        desc: { ro: "Waveform în timp real, text care apare cuvânt cu cuvânt.", en: "A real-time waveform with text appearing word by word." } },
      { code: "AIA-F1", tier: "foundation", cost: "S", demo: "chat-stream",
        name: { ro: "Bulă de chat cu streaming", en: "Streaming chat bubble" },
        desc: { ro: "Indicator de tastare și text care curge, nu apare dintr-o dată.", en: "A typing indicator and text that flows instead of appearing all at once." } },
      { code: "AIA-F2", tier: "foundation", cost: "S",
        name: { ro: "Calificare asistată a leadurilor", en: "Assisted lead qualification" },
        desc: { ro: "Datele relevante sunt structurate din conversație și pregătite pentru verificarea echipei.", en: "Relevant details are structured from the conversation and prepared for team review." } },
      { code: "AIA-F3", tier: "foundation", cost: "S",
        name: { ro: "Activitate și rezultate măsurabile", en: "Measurable activity and outcomes" },
        desc: { ro: "Panoul arată acțiunile efectuate, aprobările, transferurile către oameni și rezultatele verificabile.", en: "The dashboard shows completed actions, approvals, human handoffs and verifiable outcomes." } },
      { code: "AIA-F4", tier: "foundation", cost: "S",
        name: { ro: "Aprobare umană și escaladare", en: "Human approval and escalation" },
        desc: { ro: "Acțiunile sensibile așteaptă aprobarea, iar cazurile neclare ajung la persoana potrivită cu tot contextul.", en: "Sensitive actions wait for approval, while unclear cases reach the right person with full context." } },
    ],
  },
  {
    id: "testare-qa-web-mobile",
    code: "QAT",
    name: { ro: "Testare QA și audit", en: "QA testing and audit" },
    claim: {
      ro: "Calitatea e greu de vândut pentru că e invizibilă. Aici o facem vizibilă: diferența dintre două capturi, dintre două încărcări, dintre două versiuni.",
      en: "Quality is hard to sell because it is invisible. Here we make it visible: the difference between two captures, two loads, two versions.",
    },
    service: { ro: "/servicii/qa-testing-web-mobile", en: "/en/services/web-mobile-qa-testing" },
    entry: true,
    cases: [
      { ro: "Magazin online înainte de Black Friday: diff vizual pe checkout, la fiecare build.", en: "Online store before Black Friday: a visual diff on checkout, on every build." },
      { ro: "Aplicație cu trafic mare: waterfall de rețea pentru paginile care se încarcă greu.", en: "High-traffic app: a network waterfall for the pages that load slowly." },
      { ro: "Site de prezentare: Core Web Vitals explicate clientului, nu doar raportate.", en: "Presentation website: Core Web Vitals explained to the client, not just reported." },
    ],
    hue: 45,
    effects: [
      { code: "QAT-S1", tier: "signature", cost: "M", demo: "visual-diff",
        name: { ro: "Diff vizual cu hartă de căldură", en: "Visual diff with heat map" },
        desc: { ro: "Două capturi suprapuse, slider între ele și pixelii schimbați marcați.", en: "Two captures overlaid, a slider between them and the changed pixels marked." } },
      { code: "QAT-S2", tier: "signature", cost: "M",
        name: { ro: "Waterfall de rețea interactiv", en: "Interactive network waterfall" },
        desc: { ro: "Vezi de ce un site se încarcă în șase secunde și altul în una, resursă cu resursă.", en: "See why one site loads in six seconds and another in one, resource by resource." } },
      { code: "QAT-S3", tier: "signature", cost: "M",
        name: { ro: "Suită de teste care rulează în pagină", en: "Test suite running in the page" },
        desc: { ro: "Log-uri reale înregistrate din suita noastră, redate cu timing autentic.", en: "Real logs recorded from our suite, replayed with authentic timing." } },
      { code: "QAT-S4", tier: "signature", cost: "S", demo: "cwv-gauge",
        name: { ro: "Core Web Vitals explicate", en: "Core Web Vitals explained" },
        desc: { ro: "Scor animat, iar la hover fiecare metrică spune ce pierde clientul dacă e roșie.", en: "An animated score; on hover each metric says what the client loses when it is red." } },
      { code: "QAT-F1", tier: "foundation", cost: "S",
        name: { ro: "Pastile de status cu sparkline", en: "Status pills with sparklines" },
        desc: { ro: "Trecut, picat sau instabil, cu tendința ultimelor rulări.", en: "Passed, failed or flaky, with the trend of recent runs." } },
      { code: "QAT-F2", tier: "foundation", cost: "S",
        name: { ro: "Inele de acoperire", en: "Coverage rings" },
        desc: { ro: "Progres pe module, animat la intrarea în viewport.", en: "Per-module progress, animated on viewport entry." } },
      { code: "QAT-F3", tier: "foundation", cost: "S",
        name: { ro: "Tabel de bug-uri sortabil", en: "Sortable bug table" },
        desc: { ro: "Reordonare animată și filtrare pe severitate.", en: "Animated reordering and filtering by severity." } },
      { code: "QAT-F4", tier: "foundation", cost: "S",
        name: { ro: "Cronologie de regresii", en: "Regression timeline" },
        desc: { ro: "Ce s-a stricat și la ce versiune, pe o axă navigabilă.", en: "What broke and in which version, on a navigable axis." } },
    ],
  },
  {
    id: "blog-profesional",
    code: "BLG",
    name: { ro: "Blog profesional", en: "Professional blog" },
    claim: {
      ro: "Un blog bun se citește până la capăt. Efectele de aici servesc lectura, nu o întrerup.",
      en: "A good blog gets read to the end. The effects here serve reading instead of interrupting it.",
    },
    service: { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" },
    entry: true,
    cases: [
      { ro: "Cabinet de avocatură: articole cu cuprins magnetic și progres de citire.", en: "Law firm: articles with a magnetic table of contents and reading progress." },
      { ro: "Clinică veterinară: card de share generat din paragraful selectat.", en: "Veterinary clinic: a share card generated from the selected paragraph." },
      { ro: "Consultant financiar: grafice interactive în corpul articolului, cu date reale.", en: "Financial consultant: interactive charts inside the article, with real data." },
    ],
    hue: 285,
    effects: [
      { code: "BLG-S1", tier: "signature", cost: "S",
        name: { ro: "Preloader editorial", en: "Editorial preloader" },
        desc: { ro: "Deschiderea articolului ca o secvență scurtă, nu ca o pagină albă.", en: "The article opens as a short sequence instead of a blank page." } },
      { code: "BLG-S2", tier: "signature", cost: "M", demo: "cover-parallax",
        name: { ro: "Copertă care se așază în header", en: "Cover that settles into the header" },
        desc: { ro: "Imaginea se deformează la scroll și devine antetul articolului.", en: "The image warps on scroll and becomes the article header." } },
      { code: "BLG-S3", tier: "signature", cost: "S",
        name: { ro: "Cuprins magnetic", en: "Magnetic table of contents" },
        desc: { ro: "Urmărește poziția din text și „trage” secțiunea activă spre cursor.", en: "It tracks your position and pulls the active section toward the cursor." } },
      { code: "BLG-S4", tier: "signature", cost: "M",
        name: { ro: "Selectezi un paragraf, iese un card de share", en: "Select a paragraph, get a share card" },
        desc: { ro: "Generat pe canvas, cu identitatea vizuală a clientului.", en: "Canvas-generated, carrying the client's visual identity." } },
      { code: "BLG-F1", tier: "foundation", cost: "S", demo: "reading-progress",
        name: { ro: "Progres de citire și timp estimat", en: "Reading progress and time left" },
        desc: { ro: "Bară subțire sus, plus minutele rămase din articol.", en: "A thin bar on top, plus the minutes left in the article." } },
      { code: "BLG-F2", tier: "foundation", cost: "S",
        name: { ro: "Previzualizare la hover pe articolele conexe", en: "Hover preview on related posts" },
        desc: { ro: "Card care apare lângă cursor, cu primul paragraf.", en: "A card appearing beside the cursor with the opening paragraph." } },
      { code: "BLG-F3", tier: "foundation", cost: "S",
        name: { ro: "Grafice interactive în corpul textului", en: "Interactive charts inside the text" },
        desc: { ro: "Date reale, cu tooltip și citire exactă a valorii.", en: "Real data, with tooltips and exact value readout." } },
      { code: "BLG-F4", tier: "foundation", cost: "S",
        name: { ro: "Lightbox cu zoom continuu", en: "Lightbox with continuous zoom" },
        desc: { ro: "Deschidere din poziția imaginii, închidere prin swipe.", en: "It opens from the image's position and closes with a swipe." } },
    ],
  },
  {
    id: "logo-identitate-vizuala",
    code: "LGO",
    name: { ro: "Logo și identitate vizuală", en: "Logo and visual identity" },
    claim: {
      ro: "Un logo se judecă în mișcare și în aplicare. Aici îl vezi construindu-se, nu doar așezat pe un fundal alb.",
      en: "A logo is judged in motion and in application. Here you watch it being built, not just placed on white.",
    },
    service: null,
    entry: true,
    cases: [
      { ro: "Rebranding de pensiune: marca extrudată în 3D pentru clipul de deschidere.", en: "Guesthouse rebrand: the mark extruded in 3D for the opening clip." },
      { ro: "Startup tehnologic: asamblare din particule pe ecranul de încărcare.", en: "Tech startup: particle assembly on the loading screen." },
      { ro: "Producător local: gravura luminoasă pe eticheta de produs.", en: "Local producer: the light-trace engraving on the product label." },
    ],
    hue: 35,
    effects: [
      { code: "LGO-S1", tier: "signature", cost: "M", demo: "logo-extrude", webgl: true,
        name: { ro: "Morph SVG → 3D extrudat", en: "SVG to extruded 3D morph" },
        desc: { ro: "Marca se ridică din plan cu bevel și reflexii: metal, sticlă, mat.", en: "The mark lifts off the plane with bevel and reflections: metal, glass, matte." } },
      { code: "LGO-S2", tier: "signature", cost: "M", demo: "logo-particles",
        name: { ro: "Asamblare din particule", en: "Particle assembly" },
        desc: { ro: "Zeci de mii de puncte se strâng în marcă și se împrăștie la ieșire.", en: "Tens of thousands of points gather into the mark and scatter on exit." } },
      { code: "LGO-S3", tier: "signature", cost: "S", demo: "svg-draw",
        name: { ro: "Gravură cu traseu luminos", en: "Light-trace engraving" },
        desc: { ro: "Un punct de lumină parcurge conturul și lasă marca desenată în urmă.", en: "A point of light travels the outline and leaves the mark drawn behind it." } },
      { code: "LGO-S4", tier: "signature", cost: "M",
        name: { ro: "Aplicare live pe mock-uri", en: "Live application on mockups" },
        desc: { ro: "Carte de vizită, tricou, fațadă, favicon — toate din același SVG.", en: "Business card, shirt, storefront, favicon — all from the same SVG." } },
      { code: "LGO-F1", tier: "foundation", cost: "S",
        name: { ro: "Desenare stroke la intrarea în viewport", en: "Stroke draw on viewport entry" },
        desc: { ro: "Conturul se trasează, apoi se umple.", en: "The outline draws itself, then fills." } },
      { code: "LGO-F2", tier: "foundation", cost: "S",
        name: { ro: "Variante de marcă în morph", en: "Morphing mark variants" },
        desc: { ro: "Orizontal, monogramă, iconiță, cu tranziții între ele.", en: "Horizontal, monogram, icon, with transitions between them." } },
      { code: "LGO-F3", tier: "foundation", cost: "S",
        name: { ro: "Test de contrast comutabil", en: "Switchable contrast test" },
        desc: { ro: "Logo-ul pe șase fundaluri, cu verdict de lizibilitate.", en: "The logo on six backgrounds, with a legibility verdict." } },
      { code: "LGO-F4", tier: "foundation", cost: "S",
        name: { ro: "Fișă de sistem vizual", en: "Visual system sheet" },
        desc: { ro: "Paletă, tipografie și spațieri, prezentate ca document livrabil.", en: "Palette, typography and spacing, presented as a deliverable document." } },
    ],
  },
] satisfies LibrarySection[]).sort(
  (left, right) => PUBLIC_SECTION_ORDER.indexOf(left.id as typeof PUBLIC_SECTION_ORDER[number])
    - PUBLIC_SECTION_ORDER.indexOf(right.id as typeof PUBLIC_SECTION_ORDER[number]),
);

/** Toate efectele, indexate după cod — pentru coșul de brief. */
export const EFFECTS_BY_CODE = new Map<string, { effect: LibraryEffect; section: LibrarySection }>(
  LIBRARY_SECTIONS.flatMap((section) =>
    section.effects.map((effect) => [effect.code, { effect, section }] as const),
  ),
);

export const SECTION_BY_ID = new Map(LIBRARY_SECTIONS.map((s) => [s.id, s]));

export const TOTAL_EFFECTS = LIBRARY_SECTIONS.reduce((n, s) => n + s.effects.length, 0);
export const TOTAL_SIGNATURE = LIBRARY_SECTIONS.reduce(
  (n, s) => n + s.effects.filter((e) => e.tier === "signature").length,
  0,
);
