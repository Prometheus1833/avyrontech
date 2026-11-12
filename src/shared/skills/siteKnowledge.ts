import { siteVisualMarkdown } from "./siteVisualLibrary.ts";

/** Agency-owned patterns and editorial hypotheses; no private client data or deployment claims. */
export const SITE_KNOWLEDGE_VERSION = "2026-11-10.2";
export const SITE_QUALITY_CONTRACT =
  "Calitatea maximă a produsului prezentat clientului are prioritate față de timpul de execuție și consumul AI. Optimizarea privește exclusiv organizarea internă: context relevant, reutilizare verificată, cache și predare clară. Nu scurta rafinarea, nu înlocui imaginile de calitate și nu livra un șablon generic pentru economie de tokens. Mockupul determinist și rezumatul unui model mediu sunt instrumente interne de structurare; livrarea către client necesită personalizare completă și revizuire vizuală. Optimizează comunicarea: brief minim, contract comun, până la trei referințe aprobate la prima citire, manifest cu versiuni și citire progresivă. Extinde documentarea, rafinarea și verificările ori de câte ori sunt necesare calității; selecția inițială nu este o limită de livrare. Site-ul final este personalizat nișei și identității beneficiarului. Propune minimum cinci secțiuni utile, fără goluri excesive; hero adaptat clientului, upbar liquid glass cu fallback solid, carduri cu hover/focus, footer cinematic și trei acțiuni flotante validate. 3D și efectele wow au un scop și alternativă statică. Alege modelul potrivit sarcinii dintre furnizorii autorizați, fără a impune un model mediu produsului final. Dacă resursele autorizate nu permit calitatea cerută, raportează blocajul; nu reduce automat standardul și nu activa servicii plătite sau overage fără acord. Păstrează masterele la rezoluția nativă de calitate maximă, fără etichete 4K/8K nejustificate; livrează variante web responsive separat. Verifică 320/390/768 px și desktop, tastatură, contrast, reduced-motion, încărcare fără WebGL și formulare reale. Nu inventa testimoniale, stoc, programări, licențe, certificări, costuri ori rezultate. Fiecare integrare are stare: propusă, configurată, verificată, activă. Nu copia marca, textele, imaginile sau datele altui client. Conceptul este noindex; publicarea, trimiterea și activarea furnizorilor cer mandat explicit. Datele private rămân în contextul beneficiarului autorizat.";
/** Compact policy for internal text preparation; the full immutable handoff retains every delivery gate. */
export const SITE_INTERNAL_AI_POLICY = "Pregătire internă. Clientul primește calitate maximă, personalizare și mastere native, indiferent de timp/tokens. Schița nu este site final. Resurse insuficiente: raportează blocajul, fără variantă inferioară, costuri noi sau publicare. Optimizează numai contextul și reutilizarea.";
export const SITE_DELIVERY_GATES = [
  { id: "identity", title: "Identitate proprie", detail: "Compoziție, tipografie, paletă, texte și ritm adaptate beneficiarului; verificare umană înainte de prezentare." },
  { id: "visual", title: "Mastere premium", detail: "Imagini originale sau licențiate, rezoluție nativă verificată, crop desktop/mobil și contrast; variante web separate de originale." },
  { id: "experience", title: "Experiență completă", detail: "CTA, meniu, formulare, focus, touch, reduced-motion și fallback fără WebGL testate; fără succes simulat." },
  { id: "delivery", title: "Predare verificată", detail: "Brief și resurse cu versiuni, teste și dovezi vizuale, integrări cu stare reală, blocaje explicite și aprobare de prezentare." },
] as const;
export const SITE_REUSABLE_CAPABILITIES = [
  { id: "artifacts", title: "Biblioteca Artefacte", tab: "library", publicPath: "/biblioteca", platformOnly: false, description: "Alege efecte după cod, scop și fallback. Demo-ul dovedește o demonstrație, nu integrarea în proiect. Verifică licența și accesul la sursa implementării." },
  { id: "core", title: "AVY Core", tab: "maintenance", platformOnly: true, description: "Reutilizează verificările infrastructurii, diagnosticele și fluxurile existente. Domeniul, Workers, R2 și backupul se verifică pe destinația proiectului, fără infrastructură paralelă sau copiere de secrete." },
  { id: "media", title: "Media Generate", tab: "skill-media-generate", platformOnly: false, description: "Pregătește direcția de artă și masterele vizuale prin fluxul autorizat. Promptul, fișierul generat, masterul și varianta web au stări distincte; nu declara generarea reușită fără fișier valid." },
  { id: "codes", title: "Registru comercial", tab: "commercial-codes", platformOnly: true, description: "Leagă livrabilele de identificatorii reali ai serviciului/produsului. Reutilizează SKU și codul de articol în ofertă; nu inventa prețuri, drepturi sau activează plăți dintr-un brief." },
] as const;
export const SITE_DOMAIN_PLAYBOOKS = [
  {
    id: "general",
    label: "General / personalizat",
    job: "Calificarea cererilor fără pași inutili",
    sections: [
      "Hero cu ofertă clară",
      "servicii",
      "proces",
      "dovezi reale",
      "întrebări/contact",
      "urmărește-ne",
    ],
    features: ["brief progresiv", "filtre accesibile", "contact contextual"],
    questions: [
      "Ce vinzi",
      "Cui te adresezi",
      "Care este acțiunea principală?",
    ],
    hypothesis:
      "Adaptarea la nișă se validează prin discuții și cereri reale, nu prin promisiuni de conversie.",
  },
  {
    id: "beauty",
    label: "Beauty / wellness",
    job: "Programări cu serviciul și locația potrivite",
    sections: [
      "Hero editorial",
      "tratamente și durată",
      "experiență",
      "locații",
      "programări",
      "întrebări",
    ],
    features: [
      "selector locație",
      "programare prin furnizor autorizat",
      "comparație servicii",
      "galerie cu acord",
    ],
    questions: [
      "Ce tratamente sunt oferite",
      "Ce locații există",
      "Ce sistem de programări este folosit?",
    ],
    hypothesis:
      "Ipoteză de testat: claritatea duratei, locației și disponibilității poate reduce întrebările repetitive.",
  },
  {
    id: "recycling",
    label: "Reciclare / economie circulară",
    job: "Înțelegerea pașilor și a condițiilor reale",
    sections: [
      "Hero orientat spre acțiune",
      "pași SGR",
      "roluri",
      "eligibilitate",
      "funcții disponibile",
      "întrebări",
    ],
    features: [
      "explicator interactiv",
      "status funcționalități",
      "conturi pe roluri",
      "formular operațional",
    ],
    questions: [
      "Ce operațiuni funcționează deja",
      "Ce parteneri sunt confirmați",
      "Ce date sunt necesare?",
    ],
    hypothesis:
      "Retuvo arată explicit funcțiile în pregătire; o machetă de interfață nu dovedește scanare ori plată activă.",
  },
  {
    id: "hospitality",
    label: "Turism / ospitalitate",
    job: "Cereri de rezervare complete și încredere în locație",
    sections: [
      "Hero cinematic",
      "camere",
      "facilități confirmate",
      "experiențe",
      "localizare",
      "rezervare/contact",
    ],
    features: [
      "galerie pe camere",
      "cerere disponibilitate",
      "calendar doar cu sursă reală",
      "traseu",
    ],
    questions: [
      "Ce camere există",
      "Care este sursa disponibilității",
      "Ce condiții aprobate se afișează?",
    ],
    hypothesis:
      "Ipoteză: informațiile despre camere, acces și condiții ajută calificarea cererilor; nu inventa grad de ocupare.",
  },
  {
    id: "food",
    label: "Gastronomie / cofetărie / cafea",
    job: "Comenzi ușor de explicat și actualizat",
    sections: [
      "Hero produs",
      "meniu/catalog",
      "opțiuni",
      "proces comandă",
      "livrare/ridicare",
      "contact",
    ],
    features: [
      "filtre meniu",
      "alergeni confirmați",
      "coș de cerere WhatsApp",
      "opțiuni produs",
    ],
    questions: [
      "Care este oferta reală",
      "Cum se confirmă comanda",
      "Ce alergeni și intervale sunt aprobate?",
    ],
    hypothesis:
      "Din conversația pentru un catalog de cafea: cererea prin canale existente poate preceda checkoutul; nu o prezenta ca plată online.",
  },
  {
    id: "design",
    label: "Design / arhitectură",
    job: "Portofoliu relevant și cereri de consultanță",
    sections: [
      "Hero editorial",
      "proiecte",
      "specializări",
      "proces",
      "întrebări",
      "consultanță",
    ],
    features: [
      "filtre portofoliu",
      "galerii înainte/după cu drepturi",
      "brief progresiv",
      "moodboard",
    ],
    questions: [
      "Ce proiecte pot fi publicate",
      "Care este publicul",
      "Ce informații califică cererea?",
    ],
    hypothesis:
      "Ipoteză: contextul fiecărui proiect este mai util decât o galerie fără explicații.",
  },
  {
    id: "medical",
    label: "Cabinete medicale",
    job: "Orientare clară către serviciu și contact",
    sections: [
      "Hero sobru",
      "servicii",
      "echipă verificată",
      "ghid înscriere",
      "locație/program",
      "întrebări",
    ],
    features: [
      "ghid pas cu pas",
      "accesibilitate",
      "programare autorizată",
      "hartă opțională cu acord",
    ],
    questions: [
      "Ce servicii sunt aprobate",
      "Cum se fac programările",
      "Ce informații trebuie confirmate de cabinet?",
    ],
    hypothesis:
      "Conversația de planificare medicală susține ghidul de înscriere și delimitarea serviciilor; fără promisiuni privind numărul de pacienți. Formularul public nu cere date medicale.",
  },
  {
    id: "legal",
    label: "Servicii juridice",
    job: "Contact calificat și credibilitate profesională",
    sections: [
      "Hero sobru",
      "arii de practică",
      "abordare",
      "informații practice",
      "întrebări",
      "contact",
    ],
    features: [
      "selectare arie",
      "formular minim",
      "conținut revizuit",
      "navigație bilingvă",
    ],
    questions: [
      "Ce arii sunt oferite",
      "Ce informații sunt publicabile",
      "Cine aprobă textele profesionale?",
    ],
    hypothesis:
      "Ipoteză de design, nu analiză juridică: navigarea pe arii și contactul discret pot clarifica traseul. Fără rezultate ori clienți inventați; proiectul cabinetului existent nu se modifică.",
  },
  {
    id: "real-estate",
    label: "Imobiliare",
    job: "Cereri relevante pe proprietăți actualizate",
    sections: [
      "Hero cu căutare",
      "proprietăți",
      "zone",
      "proces",
      "întrebări",
      "vizionare",
    ],
    features: [
      "filtre utile",
      "hartă cu alternativă listă",
      "favorizare locală opțională",
      "cerere vizionare",
    ],
    questions: [
      "Care este sursa ofertelor",
      "Cine actualizează disponibilitatea",
      "Ce filtre ajută cumpărătorul?",
    ],
    hypothesis:
      "Ipoteză: calitatea datelor și actualizarea ofertelor contează mai mult decât animații ample.",
  },
  {
    id: "automotive",
    label: "Auto / service",
    job: "Programări și cereri cu datele necesare",
    sections: [
      "Hero tehnic",
      "servicii",
      "proces",
      "echipamente confirmate",
      "întrebări",
      "programare",
    ],
    features: [
      "selector serviciu",
      "estimare numai cu regulă aprobată",
      "cerere constatare",
      "contact rapid",
    ],
    questions: [
      "Ce servicii există",
      "Ce date califică cererea",
      "Există un calendar sau este doar solicitare?",
    ],
    hypothesis:
      "Ipoteză: explicarea etapelor și a modului de confirmare reduce așteptările greșite.",
  },
  {
    id: "construction",
    label: "Construcții / industrie",
    job: "Cereri de ofertă tehnică și dovezi verificabile",
    sections: [
      "Hero material",
      "servicii",
      "proiecte",
      "proces",
      "capacități confirmate",
      "cerere ofertă",
    ],
    features: [
      "brief proiect",
      "documente publice aprobate",
      "galerie pe categorie",
      "calcule explicabile",
    ],
    questions: [
      "Ce lucrări sunt oferite",
      "Ce portofoliu este publicabil",
      "Ce certificări sunt confirmate?",
    ],
    hypothesis:
      "Ipoteză: cererea structurată și limitele clare ajută oferta; nu publica certificări sau capacități neconfirmate.",
  },
  {
    id: "transport",
    label: "Transport / logistică",
    job: "Cereri de cursă cu traseu și dată",
    sections: [
      "Hero orientat spre trasee",
      "servicii",
      "proces",
      "condiții",
      "întrebări",
      "cerere cursă",
    ],
    features: [
      "RO/IT sau limbile reale",
      "traseu/dată/pasageri",
      "WhatsApp precompletat",
      "status cerere",
    ],
    questions: [
      "Ce rute sunt operate",
      "Cum se confirmă locul",
      "Ce condiții și contacte sunt aprobate?",
    ],
    hypothesis:
      "Lecție reutilizabilă din transportul bilingv AVYRON: fiecare limbă și rută se verifică separat; nu inventa flotă sau disponibilitate.",
  },
  {
    id: "retail",
    label: "Retail / produse artizanale",
    job: "Descoperire produs și finalizare comandă",
    sections: [
      "Hero produs",
      "colecții",
      "diferențiatori",
      "proces",
      "livrare",
      "întrebări/contact",
    ],
    features: [
      "variante produs",
      "coș compact",
      "checkout doar cu furnizor verificat",
      "istoric",
    ],
    questions: [
      "Care este catalogul",
      "Cum se gestionează stocul",
      "Ce furnizori de plată/livrare sunt conectați?",
    ],
    hypothesis:
      "Eurostat indică oportunități de digitalizare, nu cerere garantată. Testează traseul produs → coș → confirmare și tratează integrarea separat de mockup.",
  },
  {
    id: "business",
    label: "B2B / servicii profesionale",
    job: "Calificare cereri și diferențiatori credibili",
    sections: [
      "Hero cu beneficiu",
      "soluții pe segment",
      "proces",
      "dovezi",
      "întrebări",
      "consultanță",
    ],
    features: [
      "brief dinamic",
      "CRM existent",
      "comparație pachete aprobate",
      "resurse pe rol",
    ],
    questions: [
      "Cine decide",
      "Ce rezultat urmărește clientul",
      "Ce date minime califică o oportunitate?",
    ],
    hypothesis:
      "Lecție din wellness corporate: identitatea publică dorită și ritmul vizual al clientului au prioritate; un hero enorm nu este obligatoriu.",
  },
];
export const SITE_FEATURES = [
  {
    id: "guided-brief",
    name: "Brief progresiv și cerere contextuală",
    purpose:
      "Cere numai informațiile necesare serviciului; recapitulare înainte de trimitere.",
    implementation: "src/components/biblioteca/demos/FlipFilters.tsx",
    state: "demo",
    acceptance:
      "Etichete, tastatură, validare server și confirmare reală a cererii.",
  },
  {
    id: "device-showcase",
    name: "Prezentare pe dispozitive",
    purpose: "Arată structura produsului într-o succesiune controlabilă.",
    implementation: "src/components/site/IndustryDeviceShowcase.tsx",
    state: "implemented",
    acceptance:
      "Selectare directă, scroll reversibil, reduced-motion și poster static.",
  },
  {
    id: "product-configurator",
    name: "Configurator vizual de produs",
    purpose: "Variante și parametri explicabili, cu preview local.",
    implementation: "src/components/biblioteca/effects/ProductConfigurator.tsx",
    state: "demo",
    acceptance:
      "Prețul și disponibilitatea se verifică pe server; fără checkout fictiv.",
  },
  {
    id: "cinematic-hero",
    name: "Hero cinematic și galerie curbată",
    purpose: "Profunzime specifică nișei, fără a ascunde oferta.",
    implementation: "src/components/biblioteca/effects/CinematicDescent.tsx",
    state: "demo",
    acceptance:
      "Conținut HTML imediat, fallback fără WebGL, control direct și buget de animație.",
  },
  {
    id: "chat-stream",
    name: "Chat și handoff contextual",
    purpose:
      "Ghidează către serviciul potrivit și transferă cererea autorizată.",
    implementation: "src/components/biblioteca/demos/ChatStream.tsx",
    state: "demo",
    acceptance:
      "Demo-ul nu reprezintă un agent conectat; autorizare și provider real separat.",
  },
  {
    id: "visual-diff",
    name: "Comparație vizuală și QA",
    purpose: "Revizuire înainte/după pentru lucrări și livrări.",
    implementation: "src/components/biblioteca/demos/VisualDiff.tsx",
    state: "demo",
    acceptance: "Comenzi prin tastatură și drepturi confirmate pentru imagini.",
  },
  {
    id: "reading-progress",
    name: "Conținut editorial și progres de citire",
    purpose: "Explică un subiect complex fără a încărca navigarea.",
    implementation: "src/components/biblioteca/demos/ReadingProgress.tsx",
    state: "demo",
    acceptance: "Un H1, headinguri logice, ancore și contrast accesibil.",
  },
  {
    id: "contact-actions",
    name: "Apel, WhatsApp și email contextual",
    purpose: "Trei acțiuni funcționale, discrete, cu mesaj precompletat.",
    implementation: "src/shared/skills/render.ts",
    state: "implemented",
    acceptance:
      "Contacte validate, fără trimitere automată; pe mobil nu acoperă CTA sau formular.",
  },
];
export const SITE_CASES = [
  {
    id: "cutiutamagica",
    name: "Cutiutamagica.eu",
    url: "https://cutiutamagica.eu",
    kind: "portfolio",
    domain: "retail",
    lesson:
      "Cutiuțe muzicale artizanale din lemn: catalog, poveste de brand, livrare prin curier sau Easybox.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "ruller",
    name: "Ruller.eu",
    url: "https://ruller.eu",
    kind: "portfolio",
    domain: "beauty",
    lesson:
      "Barber shop premium din Iași: meniu servicii, galerie și programări prin Mero și WhatsApp.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "clarlumanari",
    name: "Clarlumanari.ro",
    url: "https://clarlumanari.ro",
    kind: "portfolio",
    domain: "retail",
    lesson:
      "Lumânări parfumate turnate manual: catalog, poveste de brand și comenzi rapide.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "flawlesstudio",
    name: "Flawlesstudio.ro",
    url: "https://www.flawlesstudio.ro",
    kind: "portfolio",
    domain: "beauty",
    lesson:
      "Studio de epilare și tratamente faciale din Iași, cu identitate vizuală premium.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "plaseieftineiasi",
    name: "Plaseieftineiasi.ro",
    url: "https://plaseieftineiasi.ro",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Plase anti-insecte la comandă în Iași: comenzi rapide, contact WhatsApp și montaj.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "retuvo",
    name: "Retuvo.ro",
    url: "https://retuvo.ro",
    kind: "portfolio",
    domain: "recycling",
    lesson:
      "Digitalizează SGR: scanezi bonul și primești valoarea garanției direct în cont.",
    verification: "public_page_checked",
    checkedAt: "2026-11-08",
  },
  {
    id: "miago",
    name: "Miago.ro",
    url: "https://miago.ro",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Anunțuri auto (autoturisme, camioane, utilaje) într-un concept nou și intuitiv.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "lumina-botez",
    name: "Lumina Botez",
    url: "https://demo1.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Lumânări pentru botez și cununie, mărturii și trusouri personalizate, cu ofertare directă.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "verdia",
    name: "VERDIA",
    url: "https://demo2.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Suplimente din plante organizate după nevoie, catalog clar, ghid de alegere și cumpărare online.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "pungiplast",
    name: "PungiPlast",
    url: "https://exemplu1.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Catalog B2B de pungi pentru magazine și distribuitori, cu producție proprie și ofertare rapidă.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "detectiv-icm",
    name: "Detectiv ICM",
    url: "https://detectiv-icm.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Servicii de detectiv licențiat și consultanță criminologică, prezentate sobru și confidențial.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "craita-dinulescu",
    name: "Crăița Dinulescu",
    url: "https://dinulescu-craita-consultant-financiar.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Consultanță financiară, fiscală și contabilă pentru antreprenori, cu programare directă a discuției.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "tipografia-umc",
    name: "Tipografia UMC",
    url: "https://umc.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Tipar offset, digital și large format, ambalaje și finisări premium într-un flux complet de producție.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "cgc-imobiliare",
    name: "CGC Imobiliare",
    url: "https://demo3.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Proprietăți atent selectate, consultanță și coordonarea clară a tranzacției, într-o prezentare premium.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "cabane-sucevita",
    name: "Cabane Sucevița",
    url: "https://demo4.avyron.eu",
    kind: "portfolio",
    domain: "general",
    lesson:
      "Case și cabane din bușteni, foișoare și sculpturi în lemn realizate în Bucovina.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "cofetariadulcedor",
    name: "Cofetăria Dulce Dor",
    url: "https://avyron.ro/examples/cofetariadulcedor.ro",
    kind: "mockup",
    domain: "food",
    lesson:
      "Meniu sezonier, torturi pe comandă și comenzi instant prin WhatsApp.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "studiomaradesign",
    name: "Studio Mara Design",
    url: "https://avyron.ro/examples/studiomaradesign.ro",
    kind: "mockup",
    domain: "design",
    lesson:
      "Proiecte rezidențiale și comerciale, proces transparent și formular de consultanță.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
  {
    id: "pensiuneacerbul",
    name: "Pensiunea Cerbul",
    url: "https://avyron.ro/examples/pensiuneacerbul.ro",
    kind: "mockup",
    domain: "hospitality",
    lesson:
      "Camere, facilități și rezervări directe pentru o pensiune montană.",
    verification: "catalogue_reference",
    checkedAt: null,
  },
];
export const SITE_MARKET_SOURCES = [
  {
    title: "Eurostat · digitalizarea întreprinderilor, ediția 2025",
    url: "https://ec.europa.eu/eurostat/web/interactive-publications/digitalisation-2025",
    insight:
      "În ediția 2025, e-sales pentru 2023 sunt raportate de aproximativ 15% dintre întreprinderile din România, față de 24% la nivel UE. Populația statistică și anul diferă de microafacerile locale; datele nu dovedesc cererea pentru un client anume.",
  },
  {
    title: "Eurostat · utilizarea website-urilor în 2025",
    url: "https://ec.europa.eu/eurostat/statistics-explained/SEPDF/cache/22286.pdf",
    insight:
      "Raportul indică aproximativ 54% întreprinderi cu website în România și 79% în UE; se referă la întreprinderi din aria anchetei, nu la toate firmele. Folosește pentru prioritizarea cercetării, nu pentru estimarea vânzărilor garantate.",
  },
  {
    title: "web.dev · Nuvemshop, 24 iunie 2026",
    url: "https://web.dev/case-studies/nuvemshop",
    insight:
      "Studiul leagă prioritizarea imaginilor și îmbunătățirea performanței de rezultate măsurate pentru platforma analizată. Lecție: master vizual de calitate, dimensiuni responsive și imaginea LCP prioritizată; rezultatele nu se transferă automat clienților AVYRON.",
  },
];
export const ADDITIONAL_SITE_NICHES = SITE_DOMAIN_PLAYBOOKS.filter(
  (x) =>
    ![
      "general",
      "beauty",
      "recycling",
      "hospitality",
      "food",
      "design",
    ].includes(x.id),
).map((x) => ({
  id: x.id,
  label: x.label,
  accent: (
    {
      medical: "#8acfc4",
      legal: "#c4b08c",
      transport: "#8fbbe3",
      retail: "#e4b6cc",
      automotive: "#e5b57d",
      construction: "#c9b88b",
      "real-estate": "#aac3be",
      business: "#b6b8ec",
    } as Record<string, string>
  )[x.id],
  background: "#151c29",
  headline: x.job,
  sections: x.sections.slice(1, 4),
  source: "src/shared/skills/siteKnowledge.ts",
}));
export function siteQualityContext(domain: string) {
  const p =
    SITE_DOMAIN_PLAYBOOKS.find((p) => p.id === domain) ||
    SITE_DOMAIN_PLAYBOOKS[0];
  return `## Contract comun AVYRON · ${SITE_KNOWLEDGE_VERSION}\n${SITE_QUALITY_CONTRACT}\n\n## Criterii de prezentare și livrare\n${SITE_DELIVERY_GATES.map(g => `- ${g.title}: ${g.detail}`).join("\n")}\n\n## Resurse native de evaluat\n${SITE_REUSABLE_CAPABILITIES.map(c => `- ${c.title}: ${c.description}`).join("\n")}\n\nNișă: ${p.label}. Obiectiv de proiect: ${p.job}. Structură orientativă: ${p.sections.join(" → ")}. Opțiuni de evaluat, nu integrări active: ${p.features.join("; ")}. Ipoteză editorială: ${p.hypothesis}\n\n${siteVisualMarkdown(p.id)}`;
}
export const SITE_AGENT_GUIDES = {
  codex:
    "Citește AGENTS.md și starea Git înainte de editare. Confirmă repository-ul și destinația. Lucrează pe ramură dedicată, păstrează modificările existente, implementează și validează înainte de PR. Citește întâi manifestul, apoi numai referințele necesare. Nu publica fără autorizare.",
  claude:
    "Citește AGENTS.md și CLAUDE.md dacă există. Folosește același brief și aceleași versiuni de resurse; notează deciziile și fișierele modificate. Cere doar informațiile lipsă care influențează produsul. Nu importa automat documente private în alt proiect sau provider.",
  lovable:
    "Document de handoff, nu comandă de lansare a agentului Lovable. Utilizarea agentului și a creditelor cere autorizare explicită. Reutilizează repository-ul și backendul aprobate; nu genera autentificare, CRM sau Supabase paralel. Respectă pipeline-ul Git și nu edita aceleași fișiere cât timp PR-ul este deschis.",
} as const;
export type SiteAgent = keyof typeof SITE_AGENT_GUIDES;
export function siteAgentMarkdown(
  agent: SiteAgent,
  domain: string,
  instructions: string,
  version: number,
  references: string,
) {
  return `# AVYRON · Site Builder · ${agent}\n\nVersiune cunoștințe: ${SITE_KNOWLEDGE_VERSION}. Model aprobat în OS: v${version}.\n\n## Mod de lucru\n${SITE_AGENT_GUIDES[agent]}\n\n${siteQualityContext(domain)}\n\n## Instrucțiuni aprobate ale atelierului\n${instructions}\n\n## Referințe aprobate, citire progresivă\n${references || "Nicio referință suplimentară aprobată pentru această nișă."}\n\n## Workflow pe etape\nCitește numai etapa necesară prin GET /api/skills/site-builder/stages/ETAPA.md (visual, refinement, integrations, special-features, domain-build, security, crm, launch). Include numai resurse aprobate și urmează continuarea explicită dacă există mai multe pagini. Păstrează ID/revizie; aprobarea instrucțiunii nu autorizează execuția, transmiterea, DNS sau deployul.\n\n## Predare obligatorie\nIdentifică sursele și reviziile folosite, deciziile, activele cu drepturi confirmate, integrările propuse/configurate/verificate, testele efectuate și blocajele. Nu declara mockupul site final, configurarea conectare verificată sau preview-ul producție. Eficiența comunicării nu justifică reducerea calității imaginilor ori a produsului.\n`;
}
