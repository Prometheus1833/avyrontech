import type { L } from "./types";

/**
 * Colecțiile: trasee scurte prin catalog, pentru cine nu știe de unde să
 * înceapă. Fiecare are pagină proprie, indexabilă — pentru că oamenii caută
 * „kit landing page”, nu „componentă hero tipografic”.
 *
 * `intro` e paragraful de sus al paginii și, tăiat, meta description-ul. Se
 * scrie ca un răspuns la întrebarea din căutare, nu ca o listă de produse.
 */

export type Collection = {
  id: string;
  /** Segmentul de URL, în ambele limbi. */
  seg: { ro: string; en: string };
  name: L;
  hint: L;
  intro: L;
  /** Nuanța de accent a paginii. */
  hue: number;
  /** Produsele din colecție, în ordinea în care se montează pe pagină. */
  slugs: string[];
};

export const COLLECTIONS: Collection[] = [
  {
    id: "landing",
    seg: { ro: "kit-landing-page", en: "landing-page-kit" },
    name: { ro: "Kit landing page într-o oră", en: "Landing page kit in an hour" },
    hint: { ro: "Hero, prețuri, FAQ, subsol — se leagă între ele", en: "Hero, pricing, FAQ, footer — they fit together" },
    intro: {
      ro: "Patru piese care acoperă o pagină de vânzare întreagă: primul ecran, tabelul de prețuri, întrebările frecvente și subsolul. Sunt gândite să funcționeze împreună — aceleași raze, același ritm de spațiere, aceeași paletă — deci nu trebuie să le armonizezi după ce le lipești.",
      en: "Four pieces that cover an entire sales page: the first screen, the pricing table, the FAQ and the footer. They are designed to work together — same radii, same spacing rhythm, same palette — so you do not have to harmonise them after pasting.",
    },
    hue: 265,
    slugs: ["hero-tipografic-gradient", "preturi-lunar-anual", "faq-accordion-seo", "subsol-mega-newsletter", "sectiune-cta-gradient"],
  },
  {
    id: "wow",
    seg: { ro: "primul-ecran", en: "first-screen" },
    name: { ro: "Primul ecran care oprește scroll-ul", en: "A first screen that stops the scroll" },
    hint: { ro: "Efecte 3D și fundaluri cu shader", en: "3D effects and shader backgrounds" },
    intro: {
      ro: "Primul ecran are o singură treabă: să câștige următoarele trei secunde. Aici sunt piesele care fac asta fără să încarce pagina — fiecare are variantă de rezervă pentru telefoane slabe și se oprește singură dacă utilizatorul a cerut mai puțină mișcare.",
      en: "The first screen has one job: to win the next three seconds. These are the pieces that do it without weighing the page down — each has a fallback for weak phones and stops itself when the visitor asked for less motion.",
    },
    hue: 195,
    slugs: ["hero-spatial-particule", "fundal-aurora-shader", "fire-lumina", "imagine-displacement", "fundal-zgomot-organic"],
  },
  {
    id: "conversie",
    seg: { ro: "detalii-de-conversie", en: "conversion-details" },
    name: { ro: "Detalii care cresc conversia", en: "Details that lift conversion" },
    hint: { ro: "Butoane, notificări, cifre animate", en: "Buttons, notifications, animated numbers" },
    intro: {
      ro: "Diferența dintre un formular abandonat și unul trimis stă în detalii mici: butonul care confirmă apăsarea, notificarea care spune ce s-a întâmplat, cifra care se mișcă și dovedește că e reală. Toate sunt sub 2 kB și niciuna nu mută layout-ul.",
      en: "The difference between an abandoned form and a submitted one lives in small details: the button that confirms the press, the notification that says what happened, the number that moves and proves it is real. All under 2 kB, none of them shifting layout.",
    },
    hue: 300,
    slugs: ["buton-unda-refractie", "notificari-6-tipuri", "contor-animat", "card-contur-luminos", "stepper-proces"],
  },
  {
    id: "formulare",
    seg: { ro: "formulare-care-se-completeaza", en: "forms-people-finish" },
    name: { ro: "Formulare care se completează", en: "Forms people actually finish" },
    hint: { ro: "Câmpuri, validare, fișiere, pași", en: "Fields, validation, files, steps" },
    intro: {
      ro: "Un formular pierde oameni la fiecare frecare: etichete care dispar, erori care apar prea repede, încărcări de fișiere care nu spun de ce au refuzat poza. Piesele din colecția asta rezolvă exact frecările alea, și fiecare rămâne accesibilă din tastatură.",
      en: "A form loses people at every friction point: labels that vanish, errors that fire too early, uploads that will not say why the photo was refused. This collection fixes exactly those, and every piece stays keyboard accessible.",
    },
    hue: 210,
    slugs: ["input-eticheta-flotanta", "formular-date-facturare", "zona-incarcare-fisiere", "stepper-proces", "tooltip-inteligent"],
  },
  {
    id: "incredere",
    seg: { ro: "dovezi-si-incredere", en: "proof-and-trust" },
    name: { ro: "Dovezi și încredere", en: "Proof and trust" },
    hint: { ro: "Logouri, testimoniale, înainte/după, proces", en: "Logos, testimonials, before/after, process" },
    intro: {
      ro: "Nimeni nu cumpără de la un site care spune doar despre sine. Colecția asta arată ce ai livrat și cum lucrezi: logourile clienților, recomandările lor, comparația înainte/după și etapele colaborării — toate cu text real, indexabil, nu capturi de ecran.",
      en: "Nobody buys from a site that only talks about itself. This collection shows what you shipped and how you work: client logos, their quotes, a before/after comparison and the stages of the work — all as real, indexable text rather than screenshots.",
    },
    hue: 330,
    slugs: ["sectiune-zid-logouri", "sectiune-testimoniale-3d", "sectiune-inainte-dupa", "sectiune-timeline-proces"],
  },
  {
    id: "unelte",
    seg: { ro: "unelte-de-livrare", en: "delivery-tools" },
    name: { ro: "Unelte pentru livrare rapidă", en: "Tools for fast delivery" },
    hint: { ro: "CSV, JSON-LD, meta, contrast, favicon", en: "CSV, JSON-LD, meta, contrast, favicon" },
    intro: {
      ro: "Ultima zi înainte de lansare se duce pe lucruri mărunte: convertit un CSV, scris meta tag-urile, verificat contrastul, făcut faviconul, comprimat pozele primite de la client. Uneltele astea rulează în browser, local, și le termină în minute.",
      en: "The last day before launch goes on small things: converting a CSV, writing the meta tags, checking contrast, making the favicon, compressing the client's photos. These tools run locally in the browser and get it done in minutes.",
    },
    hue: 150,
    slugs: [
      "convertor-csv-json",
      "generator-json-ld",
      "generator-meta-tag",
      "verificator-contrast",
      "generator-favicon",
      "optimizator-imagini-webp",
      "generator-palete-contrast",
      "validator-iban",
      "calculator-tva",
    ],
  },
  {
    id: "integrari",
    seg: { ro: "integrari-gratuite", en: "free-integrations" },
    name: { ro: "Integrări gratuite și sigure", en: "Free and safe integrations" },
    hint: { ro: "ANAF, curs BNR, vreme, zile libere, GitHub", en: "Company lookup, FX rates, weather, holidays, GitHub" },
    intro: {
      ro: "Servicii publice care nu cer cheie, cont sau card: completarea datelor de firmă după CUI, cursul valutar, vremea, zilele libere legale, depozitele GitHub. Fiecare integrare spune limpede ce se întâmplă când serviciul nu răspunde — pentru că se întâmplă.",
      en: "Public services that need no key, account or card: company lookup by tax ID, exchange rates, weather, public holidays, GitHub repositories. Each integration states plainly what happens when the service is down — because it will be.",
    },
    hue: 45,
    slugs: ["api-anaf-cui", "api-curs-bnr", "api-open-meteo", "api-frankfurter", "api-zile-libere", "api-github-depozit", "api-rest-countries", "harta-locatie-osm"],
  },
  {
    id: "tranzitii",
    seg: { ro: "tranzitii-si-loading", en: "transitions-and-loading" },
    name: { ro: "Tranziții și ecrane de încărcare", en: "Transitions and loading screens" },
    hint: { ro: "Cortină, tunel, particule, contor", en: "Curtain, tunnel, particles, counter" },
    intro: {
      ro: "Timpul de așteptare se simte mai scurt când are formă. Colecția strânge ecranele de încărcare și tranzițiile care acoperă exact momentul în care pagina se schimbă — toate cu variantă instantanee pentru „mișcare redusă”.",
      en: "Waiting feels shorter when it has a shape. This collection gathers the loading screens and transitions that cover exactly the moment the page swaps — each with an instant variant for reduced motion.",
    },
    hue: 240,
    slugs: ["loading-particule", "loading-contor-cortina", "tranzitie-cortina-pagini", "tunel-galerie-3d", "carusel-inertie"],
  },

  {
    id: "magazin-ro",
    seg: { ro: "magazin-romanesc", en: "romanian-shop" },
    name: { ro: "Magazin românesc, de la comandă la factură", en: "A Romanian shop, from order to invoice" },
    hint: { ro: "WhatsApp, date de facturare, IBAN, TVA, program", en: "WhatsApp, billing details, IBAN, VAT, opening hours" },
    intro: {
      ro: "Majoritatea magazinelor mici din România nu vând cu cardul: vând pe WhatsApp, cu plata la livrare sau prin transfer. Colecția asta acoperă exact drumul acela — produsul alege, mesajul pleacă pe WhatsApp, datele de facturare se completează corect, IBAN-ul și TVA-ul se verifică singure, iar clientul vede dacă ești deschis acum.",
      en: "Most small Romanian shops do not sell by card: they sell over WhatsApp, cash on delivery or by transfer. This collection covers exactly that path — the product is picked, the message goes out on WhatsApp, billing details are filled correctly, IBAN and VAT check themselves, and the customer can see whether you are open right now.",
    },
    hue: 145,
    slugs: ["buton-comanda-whatsapp", "formular-date-facturare", "validator-iban", "calculator-tva", "program-cu-sarbatori", "tabel-comparatie-pachete"],
  },
  {
    id: "conformitate",
    seg: { ro: "conformitate-si-legal", en: "compliance-and-legal" },
    name: { ro: "Conformitate fără bătăi de cap", en: "Compliance without the headache" },
    hint: { ro: "Cookie-uri, ANPC și SOL, accesibilitate", en: "Cookies, consumer protection, accessibility" },
    intro: {
      ro: "Partea de care nimeni nu se ocupă până în ziua lansării: consimțământul pentru cookie-uri cu refuz la fel de ușor ca acceptul, blocul ANPC și SOL din subsol, contrastul verificat și declarația de accesibilitate. Nu e consultanță juridică — sunt piesele tehnice și un model de text pe care juristul îl confirmă.",
      en: "The part nobody handles until launch day: cookie consent where refusing is as easy as accepting, the consumer-protection footer block, checked contrast and an accessibility statement. This is not legal advice — these are the technical pieces and a text template your lawyer confirms.",
    },
    hue: 105,
    slugs: ["banner-cookie-gdpr", "bara-anpc-sol", "verificator-contrast", "generator-palete-contrast", "declaratie-accesibilitate"],
  },
];

export const COLLECTION_BY_ID = new Map(COLLECTIONS.map((collection) => [collection.id, collection]));
