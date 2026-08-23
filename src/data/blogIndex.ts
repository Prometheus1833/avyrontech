export type BlogIndexEntry = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  category: string;
  published_at: string;
  updated_at: string;
};

const UPDATED_AT = "2026-08-24T00:00:00.000+03:00";

/** Complete, visible Romanian articles used by prerendering and as a resilient data fallback. */
export const BLOG_INDEX: BlogIndexEntry[] = [
  {
    id: "b2da7874-14c4-4c18-afe7-6ef12306090f",
    title: "Abonamentele Meta pe Facebook și Instagram: ce contează pentru branduri",
    slug: "meta-conturi-platite-facebook-instagram-2026",
    excerpt: "Cum evaluezi opțiunile plătite Meta fără să confunzi abonamentul cu o strategie reală de conținut, website și relație directă cu publicul.",
    content: `O funcție sau un abonament nou pe Facebook și Instagram poate fi util, dar nu înlocuiește strategia digitală a unei afaceri. Beneficiile, disponibilitatea și costurile produselor Meta diferă în funcție de țară și tipul contului, de aceea decizia trebuie luată după verificarea condițiilor afișate în contul propriu.

## Ce merită evaluat înainte de activare

- problema concretă rezolvată: suport, verificare, protecție împotriva impersonării sau distribuție;
- costul total pentru toate conturile și persoanele care administrează brandul;
- condițiile de eligibilitate, schimbarea numelui și documentele necesare;
- indicatorii care pot demonstra o schimbare utilă;
- dacă beneficiul rămâne relevant atunci când bugetul de promovare se oprește.

Un badge sau accesul la suport poate crește încrederea în anumite contexte. Totuși, el nu garantează distribuție, interacțiuni ori vânzări. Rezultatele depind în continuare de relevanța conținutului, răspunsurile oferite clienților, claritatea ofertei și experiența de după click.

## Rețelele sociale și site-ul au roluri diferite

Profilurile sociale ajută la descoperire și conversație. Un [site de prezentare profesional](/produse/website-prezentare-premium) oferă însă control asupra identității, paginilor de servicii, formularelor, măsurării conversiilor și informațiilor pe care Google sau sistemele AI le pot înțelege. Lista de urmăritori aparține platformei; domeniul, conținutul și baza de solicitări pot rămâne activele afacerii.

O structură sănătoasă folosește postările pentru a răspunde unei întrebări concrete, trimite utilizatorul către o pagină relevantă și măsoară o acțiune utilă: apel, mesaj, programare, cerere de ofertă sau comandă. Astfel, un produs Meta devine o componentă a sistemului de marketing, nu întregul sistem.

## Recomandarea Avyron

Pornește cu un inventar al canalelor, uniformizează numele, logo-ul, datele de contact și linkurile, apoi stabilește indicatori măsurabili pentru 30–60 de zile. Păstrează opțiunile plătite numai dacă reduc un risc sau îmbunătățesc un rezultat observabil. Pentru identitate și configurare coerentă poți consulta serviciul de [identitate social media](/produse/identitate-social-media).`,
    cover_image_url: null,
    tags: ["meta", "facebook", "instagram", "social-media", "strategie-digitala"],
    category: "tech",
    published_at: "2026-06-02T04:58:50.799028+00:00",
    updated_at: UPDATED_AT,
  },
  {
    id: "67c81192-3954-4b98-ae03-4112c54bfce3",
    title: "De ce un site de prezentare este vital pentru o afacere în 2026",
    slug: "importanta-website-afacere-2026",
    excerpt: "Un website propriu este punctul verificabil în care clienții înțeleg oferta, compară opțiuni și pot face următorul pas fără fricțiune.",
    content: `Când cineva caută o firmă, un cabinet, un salon, o pensiune sau un furnizor local, vrea răspunsuri rapide: ce servicii oferi, pentru cine, în ce zonă, cât de credibilă este activitatea și cum poate lua legătura cu tine. Un site de prezentare bine organizat pune aceste răspunsuri într-un spațiu controlat de afacere.

## Ce face un website util, nu doar frumos

Un website profesionist trebuie să aibă o promisiune clară în primul ecran, pagini distincte pentru serviciile importante, date de contact consecvente și acțiuni ușor de găsit. Pe mobil, apelul, WhatsApp, programarea sau cererea de ofertă trebuie să poată fi inițiate fără căutări inutile.

Pentru o afacere locală, sunt importante și zona deservită, programul, harta, fotografiile reale și răspunsurile la întrebările frecvente. Pentru servicii B2B sau profesii liberale, contează procesul de lucru, limitele serviciului, exemplele și modul în care sunt protejate datele transmise.

## Cum ajută la vizibilitate

Google și alte motoare descoperă mai ușor o afacere atunci când serviciile au URL-uri reale, titluri descriptive, legături interne și conținut textual vizibil. Datele structurate pot confirma entitatea, serviciile și limbile disponibile, dar trebuie să corespundă informațiilor pe care vizitatorul le vede.

Un site oferă și o destinație stabilă pentru Google Business Profile, Facebook, Instagram, LinkedIn, directoare și campanii. Consecvența numelui, telefonului, adresei și domeniului reduce confuzia dintre entități.

## Ce ar trebui să primești de la agenție

- structură și design adaptate domeniului, nu doar schimbarea culorilor unui șablon;
- versiune mobilă testată, HTTPS, formulare protejate și pagini legale;
- SEO tehnic, sitemap, canonical și hreflang pentru mai multe limbi;
- măsurare cu consimțământ și acces la datele conturilor;
- instrucțiuni de administrare și responsabilități clare după lansare.

Avyron construiește [site-uri de prezentare premium](/produse/website-prezentare-premium) pentru afaceri locale și proiecte naționale, cu design, dezvoltare, optimizare și infrastructură într-un singur flux. Durata și livrabilele sunt stabilite în oferta proiectului, în funcție de conținut și complexitate.`,
    cover_image_url: "/news/importanta-website-2026.jpg",
    tags: ["site-prezentare", "website-firma", "business", "web-design", "seo"],
    category: "business",
    published_at: "2026-05-15T22:33:26.25089+00:00",
    updated_at: UPDATED_AT,
  },
  {
    id: "11603ca0-b79f-44e3-8e89-f9655bad2add",
    title: "Cum lucrează Avyron: de la obiectivul afacerii la produsul digital",
    slug: "de-ce-alegi-avyron-studio-prezenta-digitala",
    excerpt: "Strategie, design, cod, SEO, securitate și mentenanță într-un proces în care livrabilele și responsabilitățile sunt explicate de la început.",
    content: `Avyron este o agenție de produse digitale din județul Iași care lucrează cu afaceri locale, profesii liberale, organizații și proiecte aflate în extindere. Nu pornim de la efecte vizuale, ci de la întrebarea pe care produsul trebuie să o rezolve: mai multe solicitări relevante, administrare mai simplă, comunicare mai clară sau automatizarea unui proces repetitiv.

## Descoperire și structură

În etapa inițială clarificăm publicul, serviciile prioritare, zonele deservite, competiția, resursele existente și criteriile de succes. Din acestea rezultă arhitectura informației: ce pagini sunt necesare, ce acțiune principală are fiecare pagină și ce conținut trebuie pregătit sau validat.

## Design și dezvoltare

Interfața este proiectată pentru identitatea și contextul proiectului. Componentele sunt responsive, accesibile și construite pentru utilizare reală, nu doar pentru o captură de portofoliu. Dezvoltarea include performanță, formulare protejate, metadata, date structurate, integrarea serviciilor aprobate și o fundație care poate fi extinsă.

Pentru platforme interne și aplicații, definim separat rolurile, permisiunile, modelul de date, auditarea acțiunilor și traseele critice. Cloudflare Workers și bazele de date edge pot reduce latența și separa API-ul de interfața publică atunci când această arhitectură este potrivită.

## Lansare și îmbunătățire

Înainte de livrare verificăm rutele, formularele, autentificarea, responsive design, metadata și erorile. Publicarea nu încheie automat colaborarea: mentenanța, monitorizarea, conținutul și optimizarea pot continua printr-un plan definit, fără promisiuni nelimitate sau responsabilități ambigue.

Poți explora [serviciile și costurile](/costurisiproduse), [portofoliul](/despre-si-portofoliu) sau poți solicita un exemplu adaptat domeniului tău. Recomandarea finală poate fi un site de prezentare, un magazin online, o aplicație, un audit ori o etapă mai mică decât cea imaginată inițial—alegem ceea ce are sens pentru obiectiv.`,
    cover_image_url: "/og/home.jpg",
    tags: ["avyron", "agentie-web-iasi", "proces", "dezvoltare-web", "cloudflare"],
    category: "avyron",
    published_at: "2026-05-02T13:32:14.247985+00:00",
    updated_at: UPDATED_AT,
  },
  {
    id: "4e02bb0b-7df3-4965-b5be-064f42e817c6",
    title: "Website profesionist: identitate digitală, încredere și conversie",
    slug: "website-profesionist-identitate-digitala-2026",
    excerpt: "Un site profesionist leagă identitatea vizuală de informații verificabile, navigare clară și un traseu simplu de la întrebare la contact.",
    content: `Identitatea digitală nu înseamnă numai logo, culori și un font modern. Ea include felul în care o afacere își explică serviciile, dovedește că este reală, răspunde întrebărilor și îl ajută pe vizitator să ia o decizie în siguranță.

## Elemente care construiesc încredere

Un site de prezentare pentru firmă ar trebui să publice date de contact consecvente, informații despre entitatea care prestează serviciul, politici relevante și exemple care pot fi înțelese. Fotografiile reale, descrierea procesului și limitele explicite sunt mai valoroase decât superlativele fără context.

Pentru un cabinet sau o profesie liberală, paginile pot detalia specializările, calificările, programarea și confidențialitatea. Pentru un restaurant sau o pensiune, vizitatorul caută meniu, program, locație, facilități și rezervare. Pentru o firmă de servicii locale, sunt utile aria de intervenție, tipurile de lucrări și un formular care colectează exact informațiile necesare ofertei.

## Designul trebuie să sprijine acțiunea

Ierarhia vizuală, contrastul, spațiul și mișcarea au un scop: evidențiază informația importantă. Textul principal trebuie să fie vizibil imediat, imaginile să aibă dimensiuni declarate, iar animațiile să respecte preferința de mișcare redusă. Pe mobil, elementele decorative nu trebuie să întârzie încărcarea sau să acopere acțiunile.

## Identitate pe mai multe canale

Același nume, aceeași descriere de bază, același domeniu și aceleași date de contact ar trebui să apară pe website, Google Business Profile și profilurile sociale. Legăturile reciproce și Schema.org ajută motoarele să coreleze entitatea, dar numai dacă profilurile sunt reale și publice.

Înainte de redesign, un [audit de website](/produse/audit-website) poate separa problemele de conținut, UX, performanță, SEO și securitate. Pentru un proiect nou, serviciul de [website de prezentare](/produse/website-prezentare-premium) pornește de la public și obiective, apoi traduce identitatea într-un sistem coerent.`,
    cover_image_url: null,
    tags: ["website-profesionist", "identitate-digitala", "web-design", "ux", "conversie"],
    category: "web-design",
    published_at: "2026-05-02T13:24:19.854279+00:00",
    updated_at: UPDATED_AT,
  },
  {
    id: "09c79fe5-ffdb-4e8c-944d-c612b2726ad3",
    title: "SEO în 2026: cum crești vizibilitatea pe Google și în răspunsurile AI",
    slug: "seo-2026-google-ai-search",
    excerpt: "Indexare tehnică, conținut textual util, entitate coerentă și experiență bună: aceeași fundație susține căutarea clasică și funcțiile AI.",
    content: `Vizibilitatea nu pornește de la repetarea unei expresii, ci de la o pagină pe care motorul o poate accesa, înțelege și considera utilă pentru o nevoie reală. Google precizează că funcțiile sale AI folosesc aceleași principii SEO de bază: pagina trebuie să fie indexabilă, informația importantă să existe în text, iar datele structurate să corespundă conținutului vizibil.

## Fundația tehnică

Fiecare serviciu important are nevoie de un URL real, canonical propriu, titlu descriptiv și legături interne. Variantele română și engleză trebuie să fie traduse integral și conectate prin hreflang. Sitemapul include numai URL-uri canonice indexabile și date reale de modificare. Rutele private primesc autentificare și X-Robots-Tag noindex, nu doar o regulă în robots.txt.

Performanța și stabilitatea vizuală contribuie la experiență. Imaginile sunt dimensionate și comprimate, codul este împărțit rațional, iar conținutul principal nu depinde de o cerere JavaScript târzie. Un articol prerandat trebuie să conțină articolul, nu numai metadata și un skeleton.

## Conținut pentru oameni și interogări reale

O pagină despre „creare site de prezentare” trebuie să explice pentru cine este serviciul, ce include, cum se desfășoară, ce se poate măsura și care sunt limitele. Întrebările conexe—site pentru salon, website pentru cabinet, pagină pentru pensiune, cost dezvoltare web, mentenanță sau SEO local—pot fi tratate natural prin exemple și răspunsuri, fără liste ascunse de cuvinte.

Conținutul original arată experiență: decizii, compromisuri, capturi, rezultate măsurate și actualizări semnificative. Schimbarea artificială a datei sau publicarea multor pagini superficiale nu construiește autoritate.

## Entitate și distribuție

Datele juridice, numele brandului, domeniul, profilurile sociale și Google Business Profile trebuie să fie consecvente. Organization, ProfessionalService, Service, BlogPosting și BreadcrumbList pot clarifica relațiile, dar nu garantează afișarea specială.

După publicare, verifică Page Indexing, sitemapul, canonicalul ales și interogările din Search Console. Google Analytics poate măsura acțiunile de după click, iar Cloudflare Web Analytics poate completa datele agregate de performanță. Un [audit tehnic și SEO](/produse/audit-website) transformă aceste verificări într-o listă prioritizată.`,
    cover_image_url: null,
    tags: ["seo-2026", "google", "ai-search", "indexare", "schema-org"],
    category: "seo",
    published_at: "2026-05-02T13:24:19.854279+00:00",
    updated_at: UPDATED_AT,
  },
  {
    id: "cfd7e077-d0f6-46a0-9549-aa187844664c",
    title: "Securitatea website-ului: 7 greșeli frecvente ale afacerilor mici",
    slug: "securitate-internet-greseli-afaceri-mici",
    excerpt: "Un ghid practic despre parole, actualizări, formulare, acces, backup și monitorizare pentru site-uri și conturile care le administrează.",
    content: `Un site mic poate procesa date importante: solicitări, documente, conturi, programări sau informații de facturare. Securitatea nu depinde de mărimea afacerii, ci de expunere și de impactul unei erori.

## 1. Aceeași parolă în mai multe servicii

Folosește parole unice, un manager de parole și autentificare multifactor pentru email, domeniu, hosting, Cloudflare, CMS și conturile sociale. Emailul principal poate reseta aproape toate celelalte accesuri, deci are prioritate.

## 2. Conturi comune fără roluri

Fiecare persoană trebuie să aibă cont propriu și doar permisiunile necesare. Când colaborarea se încheie, accesul este revocat fără schimbarea haotică a tuturor credențialelor.

## 3. Actualizări amânate

Frameworkurile, extensiile și dependențele trebuie evaluate periodic. Actualizarea se testează într-un mediu de preview, împreună cu formularele, autentificarea și traseele critice.

## 4. Formulare publice fără protecție

Validarea din browser nu este suficientă. API-ul validează din nou datele, aplică rate limiting și protecție anti-bot, limitează fișierele și evită expunerea secretelor. Trimiterea emailului și salvarea solicitării sunt monitorizate separat.

## 5. Backup neverificat

Un backup util poate fi restaurat. Stabilește ce se salvează, cât timp, cine are acces și testează periodic recuperarea bazei de date și a fișierelor.

## 6. Lipsa jurnalelor și alertelor

Erorile Workerului, încercările de autentificare, emailurile eșuate și modificările administrative trebuie să producă semnale acționabile, cu grijă să nu fie înregistrate parole sau date sensibile inutile.

## 7. Date colectate „pentru orice eventualitate”

Colectează numai datele necesare scopului declarat, stabilește retenția și oferă control asupra cookie-urilor. Minimizarea datelor reduce atât riscul tehnic, cât și obligațiile operaționale.

Pentru o evaluare independentă poți porni cu [testare QA web și mobile](/produse/testare-qa-web-mobile) sau un [audit de website](/produse/audit-website). Rezultatul ar trebui să indice severitatea, dovada, impactul și ordinea recomandată a remedierilor.`,
    cover_image_url: null,
    tags: ["securitate-website", "parole", "backup", "cloudflare", "gdpr"],
    category: "securitate",
    published_at: "2026-05-02T13:24:19.854279+00:00",
    updated_at: UPDATED_AT,
  },
];

/** Full English counterparts use the same stable slugs for reciprocal hreflang. */
export const BLOG_INDEX_EN: BlogIndexEntry[] = [
  {
    ...BLOG_INDEX[0],
    title: "Meta subscriptions on Facebook and Instagram: what matters for brands",
    excerpt: "How to assess paid Meta options without mistaking a subscription for a durable content, website, and customer-relationship strategy.",
    content: `A new Facebook or Instagram feature can be useful, but it does not replace a business's digital strategy. Benefits, availability, and pricing can vary by country and account type, so decisions should be based on the current terms displayed inside the relevant account.

## What to assess before subscribing

- the exact problem being solved: support, verification, impersonation protection, or distribution;
- the total cost across every brand account and administrator;
- eligibility, naming, and identity-document requirements;
- the metrics that can demonstrate a useful change;
- whether the benefit remains valuable when paid promotion stops.

A badge or improved support access may strengthen trust in some situations. It does not guarantee reach, engagement, or sales. Outcomes still depend on useful content, timely customer responses, a clear offer, and the experience after a person clicks.

## Social profiles and websites serve different roles

Social networks help discovery and conversation. A [professional business website](/en/products/premium-presentation-website) provides control over identity, service pages, forms, conversion measurement, and the information that search engines or AI systems can understand. A follower list belongs to the platform; a domain, approved content, and enquiry data can remain business assets.

A healthy system uses each post to answer a specific question, links to the relevant page, and measures a useful action such as a call, message, booking, quote request, or order. The subscription then becomes one component of marketing rather than the entire system.

## Avyron's recommendation

Audit the current channels first, align the brand name, logo, contact details, and links, then define measurable indicators for 30–60 days. Keep a paid option only when it reduces a real risk or improves an observable result. For consistent profile setup and visual direction, explore [social media identity](/en/products/social-media-identity).`,
    tags: ["meta", "facebook", "instagram", "social-media", "digital-strategy"],
  },
  {
    ...BLOG_INDEX[1],
    title: "Why a professional business website matters in 2026",
    excerpt: "An owned website is the verifiable place where customers understand an offer, compare options, and take the next step without friction.",
    content: `When someone searches for a company, practice, salon, guest house, or local service provider, they need quick answers: what is offered, who it is for, where it is available, whether the business is credible, and how to make contact. A well-structured business website puts those answers in a space controlled by the business.

## What makes a website useful, not merely attractive

A professional website needs a clear promise in the first screen, distinct pages for important services, consistent contact details, and easy-to-find actions. On mobile, a call, WhatsApp message, booking, or quote request should require no unnecessary searching.

Local businesses also benefit from coverage areas, opening hours, a map, authentic photos, and answers to common questions. B2B services and independent professionals should explain their process, scope, evidence, and how submitted data is protected.

## How it supports discoverability

Search engines can understand a business more easily when services have real URLs, descriptive titles, internal links, and visible textual content. Structured data can confirm the entity, services, and available languages, but it must match what visitors can see.

A website is also a stable destination for Google Business Profile, Facebook, Instagram, LinkedIn, directories, and campaigns. Consistent names, phone numbers, addresses, and domains reduce ambiguity between entities.

## What to expect from a web agency

- a structure and design tailored to the field, not only a recoloured template;
- a tested mobile experience, HTTPS, protected forms, and legal pages;
- technical SEO, sitemap, canonical links, and hreflang for translated content;
- consent-aware measurement with access to the underlying accounts;
- administration guidance and clear post-launch responsibilities.

Avyron builds [professional presentation websites](/en/products/premium-presentation-website) for local businesses and national projects, combining design, development, optimization, and infrastructure. Timelines and deliverables are agreed in the project proposal according to content and complexity.`,
    tags: ["business-website", "presentation-website", "web-design", "seo", "local-business"],
  },
  {
    ...BLOG_INDEX[2],
    title: "How Avyron works: from a business objective to a digital product",
    excerpt: "Strategy, design, code, SEO, security, and maintenance in a process where deliverables and responsibilities are clear from the outset.",
    content: `Avyron is a digital product agency based in Iași County, working with local businesses, independent professionals, organizations, and growing projects. We do not begin with visual effects. We start with the problem the product must solve: more relevant enquiries, simpler administration, clearer communication, or automation of a repetitive process.

## Discovery and structure

The first stage clarifies the audience, priority services, coverage, competition, existing resources, and success criteria. This becomes the information architecture: the required pages, the primary action for each page, and the content that must be prepared or approved.

## Design and development

The interface is designed for the project's identity and context. Components are responsive, accessible, and built for real use rather than a portfolio screenshot. Development covers performance, protected forms, metadata, structured data, approved integrations, and a foundation that can be extended.

For internal platforms and applications, roles, permissions, the data model, action auditing, and critical journeys are defined separately. Cloudflare Workers and edge databases can reduce latency and separate the API from the public interface when this architecture is appropriate.

## Launch and improvement

Before delivery, we check routes, forms, authentication, responsive design, metadata, and errors. Publication does not automatically end collaboration: maintenance, monitoring, content, and optimization can continue under a defined plan without unlimited promises or unclear ownership.

Explore [services and pricing](/en/pricing), the [portfolio](/en/about), or request an example for your field. The final recommendation may be a business website, online store, application, audit, or a smaller first phase than initially imagined—we choose what fits the objective.`,
    tags: ["avyron", "web-agency-romania", "process", "web-development", "cloudflare"],
  },
  {
    ...BLOG_INDEX[3],
    title: "A professional website as digital identity, trust, and conversion",
    excerpt: "A professional website connects visual identity with verifiable information, clear navigation, and a simple journey from question to contact.",
    content: `Digital identity is more than a logo, colours, and a modern typeface. It includes how a business explains its services, proves it is real, answers questions, and helps a visitor make a safe decision.

## Elements that build trust

A company website should publish consistent contact details, information about the service provider, relevant policies, and understandable examples. Authentic photography, a clear process, and explicit scope are more valuable than superlatives without context.

A practice or independent professional may need pages for expertise, qualifications, booking, and confidentiality. A restaurant or guest house needs menus, opening hours, location, facilities, and reservations. A local service company benefits from a coverage area, types of work, and a form that collects exactly what is needed for a quote.

## Design should support action

Visual hierarchy, contrast, space, and motion have a purpose: they make important information easier to perceive. Main text should appear immediately, images need declared dimensions, and animations should respect reduced-motion preferences. On mobile, decorative elements must not delay content or cover actions.

## Identity across channels

The same name, core description, domain, and contact details should appear on the website, Google Business Profile, and public social profiles. Reciprocal links and Schema.org help systems connect the entity only when the destinations are real and public.

Before a redesign, a [website audit](/en/products/website-audit) can separate content, UX, performance, SEO, and security problems. For a new project, the [professional website service](/en/products/premium-presentation-website) begins with audience and goals, then turns the identity into a coherent system.`,
    tags: ["professional-website", "digital-identity", "web-design", "ux", "conversion"],
  },
  {
    ...BLOG_INDEX[4],
    title: "SEO in 2026: improving visibility in Google and AI answers",
    excerpt: "Technical indexability, useful visible text, a coherent entity, and a good experience form the same foundation for classic and AI search.",
    content: `Visibility does not begin with repeating a phrase. It begins with a page that a search engine can access, understand, and consider useful for a genuine need. Google states that its AI search features rely on the same SEO foundations: a page must be indexable, important information must be available in text, and structured data must match visible content.

## The technical foundation

Every important service needs a real URL, self-canonical, descriptive title, and internal links. Romanian and English versions should be fully translated and connected with hreflang. A sitemap should contain canonical, indexable URLs and genuine modification dates. Private routes need authentication and an X-Robots-Tag noindex header, not merely a robots.txt rule.

Performance and visual stability support a good experience. Images are sized and compressed, code is split thoughtfully, and key content does not depend on a late JavaScript request. A prerendered article must contain the article, not only metadata and a loading skeleton.

## Content for people and real queries

A page about “professional business website design” should explain who the service is for, what it includes, how delivery works, what can be measured, and where the boundaries are. Related needs—websites for salons, practices, guest houses, local services, web development costs, maintenance, or local SEO—can be answered naturally through examples rather than hidden keyword lists.

Original content demonstrates experience through decisions, trade-offs, screenshots, measured results, and meaningful updates. Artificial date changes or many shallow pages do not create authority.

## Entity and distribution

Legal details, brand name, domain, public profiles, and Google Business Profile should remain consistent. Organization, ProfessionalService, Service, BlogPosting, and BreadcrumbList markup can clarify relationships but cannot guarantee enhanced display.

After publication, monitor Page Indexing, sitemaps, selected canonicals, and queries in Search Console. Google Analytics can measure actions after a click, while Cloudflare Web Analytics can add aggregated performance information. A [technical and SEO audit](/en/products/website-audit) turns those checks into a prioritized plan.`,
    tags: ["seo-2026", "google", "ai-search", "indexing", "schema-org"],
  },
  {
    ...BLOG_INDEX[5],
    title: "Website security: 7 common small-business mistakes",
    excerpt: "A practical guide to passwords, updates, forms, access, backups, and monitoring for websites and the accounts that manage them.",
    content: `A small website can process important information: enquiries, documents, accounts, bookings, or billing details. Security depends on exposure and impact, not company size.

## 1. Reusing passwords

Use unique passwords, a password manager, and multi-factor authentication for email, domains, hosting, Cloudflare, content management, and social accounts. The primary email can reset most other access, so protect it first.

## 2. Shared accounts without roles

Every person should have an individual account and only the permissions they need. When a collaboration ends, access can be revoked without changing every credential chaotically.

## 3. Delayed updates

Frameworks, extensions, and dependencies need periodic review. Test updates in a preview environment together with forms, authentication, and critical journeys.

## 4. Public forms without server protection

Browser validation is insufficient. The API validates again, rate-limits requests, verifies anti-bot tokens, restricts files, and keeps secrets out of the client. Saving an enquiry and delivering its notification email should be monitored separately.

## 5. Untested backups

A useful backup can be restored. Define what is saved, retention, access, and a recurring recovery test for databases and files.

## 6. Missing logs and alerts

Worker errors, authentication attempts, failed emails, and administrative changes need actionable signals without logging passwords or unnecessary personal data.

## 7. Collecting data “just in case”

Collect only what the declared purpose needs, define retention, and give visitors control over optional cookies. Data minimization reduces both technical risk and operational obligations.

For an independent review, start with [web and mobile QA testing](/en/products/qa-testing-web-mobile) or a [website audit](/en/products/website-audit). Findings should include severity, evidence, impact, and a recommended remediation order.`,
    tags: ["website-security", "passwords", "backups", "cloudflare", "gdpr"],
  },
];

export const BLOG_SLUGS = BLOG_INDEX.map((post) => post.slug);
