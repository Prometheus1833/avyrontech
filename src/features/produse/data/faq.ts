import type { L } from "./types";

export type FaqItem = { id: string; group: "start" | "limits" | "billing" | "licence" | "tech"; q: L; a: L };

export const FAQ_GROUPS: Record<FaqItem["group"], L> = {
  start: { ro: "Primii pași", en: "Getting started" },
  limits: { ro: "Limite și copieri", en: "Limits and copies" },
  billing: { ro: "Plată, facturi, rambursări", en: "Payment, invoices, refunds" },
  licence: { ro: "Licență și utilizare", en: "Licence and use" },
  tech: { ro: "Tehnic", en: "Technical" },
};

/**
 * Întrebările frecvente. Setul de subiecte e cel standard pentru bibliotecile
 * de componente; răspunsurile descriu politicile Avyron.
 *
 * ATENȚIE la lansare: răspunsurile despre rambursare, TVA și dreptul de
 * retragere trebuie confirmate de contabil / consultant juridic.
 */
export const FAQ: FaqItem[] = [
  {
    id: "ce-este",
    group: "start",
    q: { ro: "Ce sunt Produsele Avyron?", en: "What are Avyron Products?" },
    a: {
      ro: "O bibliotecă de componente, secțiuni, template-uri, efecte 3D, unelte și integrări API gata de pus în site-uri. Sunt aceleași piese pe care le folosim în proiectele clienților noștri, curățate, documentate și împachetate ca să le poți folosi și tu.",
      en: "A library of components, sections, templates, 3D effects, tools and API integrations ready to drop into websites. They are the same pieces we use in client projects, cleaned up, documented and packaged so you can use them too.",
    },
  },
  {
    id: "pentru-cine",
    group: "start",
    q: { ro: "Pentru cine sunt?", en: "Who are they for?" },
    a: {
      ro: "Pentru agenții web, freelanceri, programatori, „vibe coderi” care construiesc cu AI și oameni care își fac singuri site-ul. Dacă știi să copiezi un fișier într-un proiect React, le poți folosi. Dacă nu, fiecare produs are ghid și buton de ajutor.",
      en: "For web agencies, freelancers, developers, vibe coders building with AI and people building their own site. If you can copy a file into a React project you can use them. If not, every product has a guide and a help button.",
    },
  },
  {
    id: "cum-instalez",
    group: "start",
    q: { ro: "Cum instalez o componentă?", en: "How do I install a component?" },
    a: {
      ro: "Patru variante: comanda CLI (bun, npm, yarn sau pnpm) care adaugă fișierul direct în proiect, copierea codului, conectarea prin MCP la asistentul tău AI, sau promptul gata scris pentru Claude, Cursor sau Lovable. Toate sunt în butonul „Obține” de pe pagina produsului.",
      en: "Four ways: the CLI command (bun, npm, yarn or pnpm) that adds the file straight into your project, copying the code, connecting your AI assistant through MCP, or the ready-made prompt for Claude, Cursor or Lovable. All are in the “Get” button on the product page.",
    },
  },
  {
    id: "nu-stiu-implementez",
    group: "start",
    q: { ro: "Nu știu să implementez. Mă ajutați?", en: "I don't know how to implement it. Can you help?" },
    a: {
      ro: "Da. Fiecare produs are un ghid pas cu pas și un buton „Scrie-ne” care deschide WhatsApp cu produsul deja menționat. Dacă preferi să nu te ocupi deloc, echipa Avyron îl poate integra în site-ul tău contra unui cost fix, comunicat înainte.",
      en: "Yes. Every product has a step-by-step guide and a “Message us” button that opens WhatsApp with the product already mentioned. If you'd rather not deal with it at all, the Avyron team can integrate it into your site for a fixed fee agreed upfront.",
    },
  },
  {
    id: "ce-e-copiere",
    group: "limits",
    q: { ro: "Ce se numără ca o copiere?", en: "What counts as a copy?" },
    a: {
      ro: "Prima obținere a unui produs într-o zi: comanda CLI, copierea codului sau descărcarea arhivei. Dacă obții din nou același produs în aceeași zi, nu se mai numără. Previzualizarea, Editor Mode și citirea ghidului nu consumă nimic.",
      en: "The first time you get a product on a given day: the CLI command, copying the code or downloading the archive. Getting the same product again the same day does not count. Previews, Editor Mode and reading the guide never count.",
    },
  },
  {
    id: "cand-reset",
    group: "limits",
    q: { ro: "Când se resetează limitele?", en: "When do the limits reset?" },
    a: {
      ro: "În fiecare zi la ora 00:00, ora României (Europe/Bucharest). Contorul din cont îți arată în orice moment câte copieri mai ai azi pe fiecare tip.",
      en: "Every day at 00:00 Romanian time (Europe/Bucharest). The counter in your account shows at any time how many copies you have left today for each type.",
    },
  },
  {
    id: "se-reporteaza",
    group: "limits",
    q: { ro: "Copierile nefolosite se reportează?", en: "Do unused copies roll over?" },
    a: {
      ro: "Nu. Limita e zilnică și nu se acumulează. În schimb, ce ai obținut o dată rămâne în Colecția mea și îl poți redescărca oricând, fără să mai consumi.",
      en: "No. The limit is daily and does not accumulate. What you have obtained once stays in My collection and can be downloaded again at any time without using a copy.",
    },
  },
  {
    id: "mcp-consuma",
    group: "limits",
    q: { ro: "Copierea prin MCP sau CLI consumă din limită?", en: "Does copying through MCP or the CLI use my allowance?" },
    a: {
      ro: "Da, la fel ca orice copiere — o singură dată pe produs pe zi. Cererile repetate ale asistentului AI pentru același produs în aceeași zi nu se mai numără.",
      en: "Yes, like any copy — once per product per day. Repeated requests from your AI assistant for the same product on the same day don't count again.",
    },
  },
  {
    id: "limita-atinsa",
    group: "limits",
    q: { ro: "Ce se întâmplă dacă ating limita zilnică?", en: "What happens if I hit my daily limit?" },
    a: {
      ro: "Poți în continuare să previzualizezi, să folosești Editor Mode și să salvezi produse în colecție. Copierea se deblochează a doua zi, la upgrade sau dacă cumperi produsul separat — cele cumpărate separat nu consumă din limită.",
      en: "You can still preview, use Editor Mode and save products to your collection. Copying unlocks the next day, on upgrade, or if you buy the product separately — products bought separately never use the allowance.",
    },
  },
  {
    id: "cumparare-separata",
    group: "billing",
    q: { ro: "Pot cumpăra un singur produs, fără parteneriat?", en: "Can I buy a single product without a plan?" },
    a: {
      ro: "Da. Produsele premium au preț între 30 și 150 de lei (6–30 €). Le primești pe viață, cu actualizări incluse, fără limită de copieri. Dacă treci la Pro sau Studio în 30 de zile, ce ai plătit se scade din primul an.",
      en: "Yes. Premium products cost between 30 and 150 lei (€6–30). You keep them for life, updates included, with no copy limits. If you move to Pro or Studio within 30 days, what you paid is deducted from the first year.",
    },
  },
  {
    id: "produse-noi",
    group: "billing",
    q: { ro: "Cum intră produsele noi în parteneriate?", en: "How do new products enter the plans?" },
    a: {
      ro: "Automat: la lansare, un produs nou e inclus imediat în Studio și poate fi cumpărat separat. După 60 de zile intră în Pro. Produsele de bază pot deveni gratuite după un an. Parteneriatul tău crește singur, fără cost în plus.",
      en: "Automatically: at launch a new product is included in Studio right away and can be bought separately. After 60 days it joins Pro. Foundation products may become free after a year. Your plan grows on its own at no extra cost.",
    },
  },
  {
    id: "plata",
    group: "billing",
    q: { ro: "Cum pot plăti?", en: "How can I pay?" },
    a: {
      ro: "Cu cardul, Apple Pay, Google Pay sau Revolut Pay prin Stripe, în lei sau euro. Firmele pot cere proformă și plăti prin transfer bancar. Factura se emite automat și ajunge în contul tău, la secțiunea Facturi.",
      en: "By card, Apple Pay, Google Pay or Revolut Pay through Stripe, in RON or EUR. Companies can request a proforma and pay by bank transfer. The invoice is issued automatically and appears in your account under Invoices.",
    },
  },
  {
    id: "factura-firma",
    group: "billing",
    q: { ro: "Primesc factură pe firmă?", en: "Do I get a company invoice?" },
    a: {
      ro: "Da. La plată introduci CUI-ul și completăm automat datele firmei din registrul ANAF. Factura se transmite și în sistemul e-Factura.",
      en: "Yes. At checkout you enter your company's tax ID and we fill in the details automatically from the ANAF registry. The invoice is also submitted to the Romanian e-Invoice system.",
    },
  },
  {
    id: "rambursare",
    group: "billing",
    q: { ro: "Pot cere banii înapoi?", en: "Can I get a refund?" },
    a: {
      ro: "Pentru parteneriate: da, în 14 zile de la plată, dacă nu ai copiat sau descărcat niciun produs premium. Pentru produsele cumpărate separat, livrarea e imediată și, conform legii, dreptul de retragere se pierde odată cu descărcarea, cu acordul tău exprimat la plată. Dacă un produs nu funcționează cum e descris, îl reparăm sau îți returnăm banii.",
      en: "For plans: yes, within 14 days of payment if you haven't copied or downloaded any premium product. For products bought separately, delivery is immediate and, by law, the right of withdrawal ends once you download, with the consent you give at checkout. If a product doesn't work as described, we fix it or refund you.",
    },
  },
  {
    id: "anulare",
    group: "billing",
    q: { ro: "Ce se întâmplă dacă anulez?", en: "What happens if I cancel?" },
    a: {
      ro: "Parteneriatul rămâne activ până la finalul perioadei plătite, apoi contul trece pe Free. Tot ce ai integrat deja în proiecte rămâne al tău — licența pentru proiectele livrate nu expiră.",
      en: "Your plan stays active until the end of the paid period, then the account moves to Free. Everything you've already integrated into projects stays yours — the licence for delivered projects doesn't expire.",
    },
  },
  {
    id: "upgrade",
    group: "billing",
    q: { ro: "Ce se întâmplă dacă trec la un plan mai mare în timpul anului?", en: "What happens if I upgrade mid-year?" },
    a: {
      ro: "Plătești doar diferența proporțională cu zilele rămase, iar noile limite se aplică imediat. La downgrade, planul curent rămâne activ până la reînnoire.",
      en: "You only pay the difference pro-rated to the remaining days, and the new limits apply immediately. On downgrade, the current plan stays active until renewal.",
    },
  },
  {
    id: "pret-blocat",
    group: "billing",
    q: { ro: "Prețul crește la reînnoire?", en: "Will the price go up at renewal?" },
    a: {
      ro: "Nu pentru tine. Cine intră acum își păstrează prețul de azi pe toată durata parteneriatului, chiar dacă adăugăm produse și ridicăm prețul de listă.",
      en: "Not for you. Joining now locks in today's price for as long as your plan stays active, even as we add products and raise the list price.",
    },
  },
  {
    id: "proiecte-clienti",
    group: "licence",
    q: { ro: "Pot folosi produsele în proiecte pentru clienți?", en: "Can I use products in client projects?" },
    a: {
      ro: "Da. Licența permite utilizarea în număr nelimitat de proiecte proprii și ale clienților, inclusiv comerciale. Clientul final nu are nevoie de licență separată.",
      en: "Yes. The licence allows use in unlimited personal and client projects, including commercial ones. The end client doesn't need a separate licence.",
    },
  },
  {
    id: "revanzare",
    group: "licence",
    q: { ro: "Pot vinde template-uri făcute cu produsele Avyron?", en: "Can I sell templates made with Avyron products?" },
    a: {
      ro: "Poți vinde site-uri și produse finite construite cu ele. Nu poți revinde sau redistribui componentele ca atare — într-un kit, o bibliotecă sau un marketplace de template-uri.",
      en: "You can sell websites and finished products built with them. You can't resell or redistribute the components as such — in a kit, a library or a template marketplace.",
    },
  },
  {
    id: "open-source",
    group: "licence",
    q: { ro: "Folosiți cod open-source?", en: "Do you use open-source code?" },
    a: {
      ro: "Produsele Avyron sunt scrise de noi. Unde folosim biblioteci open-source (Three.js, GSAP, Lenis) sau piese preluate cu licență permisivă (MIT, Apache, CC0), le menționăm pe pagina produsului, cu atribuirea cerută. Ce preluăm din surse libere rămâne gratuit.",
      en: "Avyron products are written by us. Where we use open-source libraries (Three.js, GSAP, Lenis) or pieces taken under permissive licences (MIT, Apache, CC0), we list them on the product page with the required attribution. Anything taken from free sources stays free.",
    },
  },
  {
    id: "echipa",
    group: "licence",
    q: { ro: "Pot folosi un cont pentru toată echipa?", en: "Can my whole team share one account?" },
    a: {
      ro: "Un parteneriat e pentru o persoană. Pentru echipe, AVY Studio permite invitarea colegilor cu limite comune; scrie-ne pentru mai mult de 5 membri.",
      en: "A plan is for one person. For teams, AVY Studio lets you invite colleagues with shared limits; contact us for more than 5 members.",
    },
  },
  {
    id: "date-anulare",
    group: "licence",
    q: { ro: "Îmi păstrați datele dacă închid contul?", en: "Do you keep my data if I close my account?" },
    a: {
      ro: "Colecția și istoricul rămân 90 de zile după închidere, ca să te poți răzgândi, apoi se șterg. Facturile se păstrează cât cere legea contabilă. Detalii în politica de confidențialitate.",
      en: "Your collection and history stay for 90 days after closing, in case you change your mind, then they're deleted. Invoices are kept as long as accounting law requires. Details are in the privacy policy.",
    },
  },
  {
    id: "tehnologii",
    group: "tech",
    q: { ro: "Cu ce tehnologii funcționează?", en: "Which technologies do they work with?" },
    a: {
      ro: "Majoritatea sunt componente React cu TypeScript, compatibile cu Vite, Next.js și Remix. Efectele 3D folosesc Three.js și shadere GLSL (WebGL2); animațiile folosesc GSAP sau CSS. Filtrul „Tehnologie” îți arată exact ce cere fiecare produs.",
      en: "Most are React components in TypeScript, compatible with Vite, Next.js and Remix. 3D effects use Three.js and GLSL shaders (WebGL2); animations use GSAP or CSS. The “Technology” filter shows exactly what each product needs.",
    },
  },
  {
    id: "performanta",
    group: "tech",
    q: { ro: "Îmi încetinesc site-ul?", en: "Will they slow my site down?" },
    a: {
      ro: "Fiecare produs are greutatea afișată în kB. Efectele 3D se încarcă abia când intră în ecran, au trepte automate de calitate și cad pe o variantă statică pe dispozitive slabe, fără WebGL sau cu mișcare redusă.",
      en: "Every product shows its weight in kB. 3D effects load only when they enter the viewport, have automatic quality tiers and fall back to a static version on weak devices, without WebGL or with reduced motion.",
    },
  },
  {
    id: "wordpress",
    group: "tech",
    q: { ro: "Merg pe WordPress, Webflow sau Framer?", en: "Do they work on WordPress, Webflow or Framer?" },
    a: {
      ro: "Produsele marcate HTML/CSS merg oriunde poți pune cod. Componentele React merg în Framer ca Code Components și în WordPress prin blocuri React. Pentru Webflow recomandăm variantele HTML sau un embed.",
      en: "Products marked HTML/CSS work anywhere you can add code. React components work in Framer as Code Components and in WordPress through React blocks. For Webflow we recommend the HTML variants or an embed.",
    },
  },
  {
    id: "cerere-functie",
    group: "tech",
    q: { ro: "Nu găsesc ce caut. Puteți face?", en: "I can't find what I need. Can you build it?" },
    a: {
      ro: "Folosește „Solicită o funcție” de la finalul paginii. Cererile cu cele mai multe voturi intră primele în lucru, iar partenerii Studio au prioritate. Te anunțăm pe e-mail când e gata.",
      en: "Use “Request a feature” at the end of the page. The most-voted requests are built first, and Studio partners get priority. We email you when it's ready.",
    },
  },
];
