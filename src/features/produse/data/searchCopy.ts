import type { INDEXABLE_PRODUCT_SLUGS } from "./routes";

type ProductSearchCopy = {
  title: string;
  description: string;
  question: string;
  answer: string;
};

export const PRODUCT_SEARCH_COPY: Record<(typeof INDEXABLE_PRODUCT_SLUGS)[number], Record<"ro" | "en", ProductSearchCopy>> = {
  "generator-favicon": {
    ro: {
      title: "Generator favicon online gratuit – PNG și ICO",
      description: "Creează pictograma site-ului dintr-un logo, o schiță sau inițiale. Verifică lizibilitatea la 16 px și descarcă PNG, ICO sau pictograme pentru PWA.",
      question: "Ce fișier favicon folosești pentru fiecare dispozitiv?",
      answer: "Alege ICO pentru compatibilitate cu filele browserelor, PNG de 180 px pentru Apple Touch și PNG de 192 sau 512 px pentru manifestul PWA. Încearcă mai întâi previzualizarea la 16 px: dacă detaliile se pierd, păstrează simbolul sau inițialele. Imaginea importată se prelucrează pe dispozitiv.",
    },
    en: {
      title: "Free online favicon generator – PNG and ICO",
      description: "Make a website icon from a logo, sketch or initials. Check readability at 16 px and download PNG, ICO or PWA icons.",
      question: "Which favicon file should you use on each device?",
      answer: "Use ICO for broad browser-tab compatibility, a 180 px PNG for Apple Touch, and 192 or 512 px PNG for the PWA manifest. Check the 16 px preview first and keep just the symbol or initials if details disappear. The editor processes imported images on your device.",
    },
  },
  "optimizator-imagini-webp": {
    ro: {
      title: "Comprimă și convertește imagini în WebP online",
      description: "Redimensionează până la opt fotografii și convertește-le în WebP direct în browser. Compară dimensiunea fișierelor înainte și după.",
      question: "Cum alegi lățimea și calitatea pentru imaginile unui site?",
      answer: "Pornește de la dimensiunea la care apare fotografia în pagină. O imagine pentru un card de produs poate avea o lățime mai mică decât fotografia principală. Redu calitatea treptat, compară fișierele și verifică textul și detaliile fine înainte să publici.",
    },
    en: {
      title: "Compress and convert images to WebP online",
      description: "Resize up to eight photos and convert them to WebP in your browser. Compare file sizes before and after conversion.",
      question: "How should you choose image width and quality for a site?",
      answer: "Start with the size at which the image appears on the page. A product card can use a narrower file than a full-width hero. Lower quality gradually, compare file sizes, and check text and fine details before publishing.",
    },
  },
  "generator-json-ld": {
    ro: {
      title: "Generator JSON-LD online pentru Schema.org",
      description: "Generează date structurate JSON-LD pentru Organizație, Afacere locală, Produs sau FAQ. Completează câmpurile și copiază codul pentru site.",
      question: "Ce tip de date structurate alegi pentru pagina ta?",
      answer: "Folosește Organization pentru identitatea companiei, LocalBusiness pentru datele unei locații și Product pentru o pagină care prezintă un singur produs. Verifică dacă valorile apar și în conținutul vizibil al paginii. Google decide eligibilitatea pentru rezultate îmbogățite în funcție de tipul paginii și de regulile sale.",
    },
    en: {
      title: "Online JSON-LD generator for Schema.org",
      description: "Generate JSON-LD structured data for Organization, LocalBusiness, Product or FAQ. Fill in the fields and copy the markup to your site.",
      question: "Which schema type fits your page?",
      answer: "Use Organization for the company identity, LocalBusiness for location details, and Product for a page about one product. Check that the values also appear in the visible page content. Google determines rich result eligibility from the page type and its guidelines.",
    },
  },
  "logo-studio-3d": {
    ro: {
      title: "Generator logo 3D online cu previzualizare",
      description: "Alege o monogramă, un simbol, materiale și iluminare. Rotește logo-ul 3D și verifică opțiunile de export pentru web și animație.",
      question: "Ce format de logo alegi pentru web sau animație?",
      answer: "Folosește PNG transparent pentru inserare rapidă în pagini și materiale sociale, SVG pentru forme scalabile și GLB pentru scene 3D interactive. Verifică în previzualizare dacă simbolul rămâne lizibil și la dimensiuni mici înainte de a alege exportul.",
    },
    en: {
      title: "Online 3D logo maker with live preview",
      description: "Choose a monogram or symbol, materials and lighting. Rotate the 3D logo and explore export options for websites and animation.",
      question: "Which logo format fits websites or animation?",
      answer: "Use transparent PNG for quick placement on websites and social graphics, SVG for scalable artwork, and GLB for interactive 3D scenes. Check that the symbol stays readable at small sizes before choosing an export.",
    },
  },
  "particle-lab": {
    ro: {
      title: "Generator particule 3D pentru Three.js",
      description: "Construiește un efect de particule 3D din forme, text sau imagine. Încearcă scena în browser și exportă configurația pentru integrare.",
      question: "Cum adaptezi un efect de particule pentru mobil?",
      answer: "Începe cu puține particule și verifică dacă textul rămâne lizibil peste scenă. Testează efectul pe telefon înainte să crești densitatea. Pregătește un poster static pentru vizitatorii fără WebGL2 sau care preferă mișcare redusă.",
    },
    en: {
      title: "3D particle generator for Three.js",
      description: "Build a 3D particle effect from shapes, text or an image. Try the scene in your browser and export the settings for integration.",
      question: "How do you adapt a particle effect for mobile?",
      answer: "Start with fewer particles and check that text stays readable over the scene. Test on a phone before increasing density. Provide a static poster for visitors without WebGL2 or those who prefer reduced motion.",
    },
  },
  "template-landing-saas": {
    ro: {
      title: "Template landing page SaaS în React și Tailwind",
      description: "Șablon de pagină pentru lansarea unui produs SaaS, cu demo, funcții, prețuri, întrebări frecvente și bază pentru metadata și date structurate.",
      question: "Ce personalizezi înainte de a publica un landing SaaS?",
      answer: "Arată din primul ecran cui se adresează produsul. Pune un flux real în demo și explică ce primește clientul în fiecare plan. Înlocuiește conținutul demonstrativ, metadata și datele structurate, apoi verifică formularul și încărcarea pe mobil.",
    },
    en: {
      title: "React and Tailwind SaaS landing page template",
      description: "Launch a SaaS product with a landing page template covering demos, features, pricing, FAQs, and a starting point for metadata and structured data.",
      question: "What should you customise before publishing a SaaS landing page?",
      answer: "Make the intended customer clear on the first screen. Show a real workflow in the demo and explain what each price tier includes. Replace sample copy, metadata and structured data, then test the form and loading experience on phones.",
    },
  },
};
