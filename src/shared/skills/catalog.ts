import {ADDITIONAL_SITE_NICHES} from "./siteKnowledge";
import type { SkillSlug } from "./model";

export const SKILL_SEEDS: {
  slug: SkillSlug;
  name: string;
  summary: string;
  instructions: string;
}[] = [
  {
    slug: "site-builder",
    name: "Site Builder",
    summary:
      "Mockupuri vizuale și briefuri Codex adaptate domeniului, pornind din componente și lecții reutilizabile aprobate.",
    instructions: `Folosește pentru un mockup vizual de website sau pentru pregătirea implementării unui site AVYRON pentru un client nou ori existent. Nu publica, nu trimite și nu activa furnizori din acest skill.

1. Brief minim: denumirea afacerii, activitatea și obiectivul. Preferințele vizuale sunt opționale. Proiectul sau leadul existent oferă context numai după autorizare. Nu cere CNP, parole sau date fiscale pentru un mockup.
2. Citește cel mult trei referințe aprobate potrivite domeniului; rezumă structura, nu copia marca, textele sau activele altui client. Datele comerciale private și briefurile nu devin automat cunoștințe comune.
3. Propune cel puțin cinci secțiuni utile: hero, servicii/beneficii, proces/diferențiatori, întrebări/contact și urmărește-ne. Adaptează structura nișei; fără testimoniale, prețuri, rezultate sau certificări inventate. Identifică explicit macheta drept concept, nu site final.
4. Upbar compact cu liquid glass progresiv, contrast solid ca fallback, logo lizibil, navigare simplă și user menu numai când există conturi reale. CTA principal clar; linkuri ancoră și tastatură funcționale. Pe mobil, meniul nu acoperă CTA-urile.
5. Hero cu fundal cinematic profund, lumină și compoziție specifice domeniului. Text vizibil imediat în HTML; fără așteptarea canvasului. Poster static de calitate maximă disponibilă; WebGL/3D numai când explică produsul. Nu reduce calitatea imaginii master pentru economie de tokens: economisește prin reutilizare, context scurt, cache și variante de livrare AVIF/WebP.
6. Landing compact, fără ecrane goale sau padding excesiv. Carduri cu hover și focus echivalente; mișcare redusă, scroll discret, fără scroll-jacking. Footer profund/cinematic, cu date reale și linkuri legale potrivite activității; nu pretinde conformitate juridică automată.
7. Trei acțiuni flotante: apel, WhatsApp și email, numai cu contacte validate. Pentru mockupul comercial, folosește explicit contactele AVYRON pentru discuția despre concept dacă lipsesc contactele beneficiarului. Mesajul WhatsApp și subiectul emailului includ denumirea proiectului, fără informații sensibile. Nu trimite mesaje automat.
8. Spre final: urmărește-ne cu Facebook, Instagram și TikTok, doar pentru URL-uri confirmate; altfel arată că lipsesc, fără linkuri fictive. Personalizează paleta, tipografia, fotografiile, iconografia și tonul pentru nișă, fără a transfera automat identitatea AVYRON.
9. Construcție: componente reutilizabile, HTML semantic, un H1, headinguri logice, contrast și focus vizibil, ținte tactile de minimum 44px. Desktop și 320/390/768px, fără overflow orizontal. Imagini responsive, dimensiuni rezervate, încărcare leneșă sub fold, fonturi limitate. Verifică reduced-motion și fallback fără WebGL.
10. SEO numai pe site-ul final autorizat: canonical, metadata/OG specifice, sitemap, robots și date structurate conforme cu textul vizibil. Mockupurile și informațiile private rămân noindex. Nu promite indexare sau trafic.
11. Înainte de livrare: verifică linkurile, formularul real sau starea neconfigurată, layoutul mobil, tastatura și conținutul factual. Păstrează snapshotul skillului și al brief-ului; aprobarea internă nu reprezintă publicare.

Economie: pornește din profilul de nișă și mockupul determinist fără AI; cere rafinare doar dacă ajută. Folosește modelul text primary din registrul AI Core existent și limitele sale. Modelele suplimentare sau imaginile plătite cer autorizare separată; nu activa overage. Output: plan de secțiuni, direcție vizuală, componente de reutilizat, instrucțiuni Codex și lista datelor lipsă.`,
  },
  {
    slug: "logo-engine",
    name: "Logo Engine",
    summary:
      "Brief de identitate, direcții vizuale și handoff pentru produsul Logo Studio, fără a schimba tarifele sau licențele.",
    instructions: `Folosește pentru pregătirea identității unui brand, pornind de la nume, activitate, public și preferințe. Nu confunda simulatorul 2D gratuit cu produsul Logo Studio 3D și livrarea asistată AI tarifată.
Pregătește un brief concis: utilizări principale, caracterul mărcii, simboluri de explorat/evitat, lizibilitate mică, culoare și monocrom. Propune trei direcții distincte; nu copia mărci ori portofolii ale altor clienți și nu pretinde unicitate juridică sau verificare de marcă.
Simularea monogramei este numai un reper de compoziție, nu logo original final. Livrarea finală trebuie verificată uman: contururi vectoriale curate, proporții, contrast, avatar, print și favicon. Pentru 3D, definește material, lumină, mișcare, fundal transparent și fallback static; nu adăuga 3D fără scop.
Reutilizează fluxurile existente de creare logo, catalog, achiziție, licență și aprobare. Nu produce drepturi de utilizare mai largi decât licența efectivă; nu modifica prețuri, nu trimite și nu publica automat.
Folosește primary din AI Core pentru structură și copy scurt. Pentru randări, păstrează calitatea master maximă permisă de furnizorul aprobat; economisește prin reutilizare și brief scurt. Dacă modelul sau bugetul nu permit operația, raportează starea blocată. Păstrează versiunea, brief-ul și observațiile de aprobare.`,
  },
  {
    slug: "media-generate",
    name: "Media Generate",
    summary:
      "Direcție de artă, prompturi și resurse vizuale reutilizabile, cu politici de calitate și cost transparente.",
    instructions: `Folosește pentru briefuri de imagini, fundaluri cinematice, campanii și resurse vizuale. Cere numai afacerea/activitatea, scopul imaginii și preferințele relevante; nu prelua automat documente confidențiale în modele externe.
Definește subiectul, compoziția, perspectiva, iluminarea, materialele, profunzimea, spațiul pentru text, paleta, formatul și utilizarea. Prompturile trebuie adaptate nișei, fără afirmații factuale inventate, mărci copiate sau persoane prezentate fals drept clienți/angajați. Pentru hero rezervă o zonă calmă pentru heading și CTA.
Masterul vizual are calitate maximă disponibilă în planul aprobat; comprimarea AVIF/WebP este derivată pentru web, păstrând masterul. Nu reduce calitatea generării pentru a economisi tokens. Economisește prin reutilizarea activelor aprobate, context progresiv, planificarea variantelor și evitarea regenerărilor identice.
Modelele text medii din AI Core pregătesc structura; modelul image este utilizat numai când este configurat, autorizat și încadrat în buget. Niciun model plătit, overage sau serviciu nou nu se activează automat. Promptul pregătit nu înseamnă imagine generată.
Atașamentele folosesc R2 privat și poarta antivirus existente; fișierele neverificate nu se deschid și nu intră în contextul AI. Stochează titlu, nișă, proveniență, drepturi declarate și scopul reutilizării. Nu redistribui resurse cu licență necunoscută.
Verifică diacriticele/textul separat de imagine, contrastul, cropul desktop/mobil, proporțiile și absența detaliilor sensibile. Propunerile rămân interne până la aprobare; publicarea și distribuirea sunt acțiuni distincte.`,
  },
];

export const NICHE_PROFILES = [
  {
    id: "general",
    label: "General / personalizat",
    accent: "#b99cff",
    background: "#0d1120",
    headline: "O experiență construită în jurul tău.",
    sections: ["Servicii și beneficii", "Cum lucrăm", "Întrebări și contact"],
    source: "docs/VISUAL_TECHNIQUES.md",
  },
  {
    id: "beauty",
    label: "Beauty / wellness",
    accent: "#e1b79e",
    background: "#211c22",
    headline: "Ritualuri de îngrijire, în ritmul tău.",
    sections: [
      "Tratamente și servicii",
      "Experiența ta",
      "Programări și întrebări",
    ],
    source:
      "src/assets/example-flawlesstudio.jpg; src/components/site/mockups/index.tsx",
  },
  {
    id: "recycling",
    label: "Reciclare / economie circulară",
    accent: "#bde18d",
    background: "#132921",
    headline: "Resursele continuă. Într-un sistem mai simplu.",
    sections: [
      "Soluții și utilizatori",
      "Cum funcționează",
      "Contact și implementare",
    ],
    source:
      "src/assets/example-retuvo.jpg; src/components/site/mockups/index.tsx",
  },
  {
    id: "hospitality",
    label: "Turism / ospitalitate",
    accent: "#e4c28e",
    background: "#17302e",
    headline: "Un loc pentru experiențe care rămân.",
    sections: [
      "Experiențe și facilități",
      "Sejurul tău",
      "Disponibilitate și contact",
    ],
    source: "src/examples/pensiuneacerbul.tsx",
  },
  {
    id: "food",
    label: "Gastronomie / cofetărie",
    accent: "#f1b1a5",
    background: "#2c1d23",
    headline: "Gusturi care adună oamenii împreună.",
    sections: [
      "Colecții și specialități",
      "De la idee la masă",
      "Comenzi și întrebări",
    ],
    source: "src/examples/cofetariadulcedor.tsx",
  },
  {
    id: "design",
    label: "Design / arhitectură",
    accent: "#d7c2a0",
    background: "#202322",
    headline: "Spații și idei cu o identitate clară.",
    sections: [
      "Servicii și direcții",
      "Proces și colaborare",
      "Discută proiectul",
    ],
    source: "src/examples/studiomaradesign.tsx",
  },
  ...ADDITIONAL_SITE_NICHES,
] as const;
