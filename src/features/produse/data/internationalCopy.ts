import type { ProductHubLocale } from "./productLocales";

export type InternationalProductLocale = Exclude<ProductHubLocale, "ro" | "en">;

type ProductCardCopy = {
  name: string;
  summary: string;
  category: string;
};

export type InternationalHubCopy = {
  metaTitle: string;
  metaDescription: string;
  languageLabel: string;
  backHome: string;
  openCatalog: string;
  partnerships: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  intro: string;
  primaryCta: string;
  secondaryCta: string;
  stats: [string, string, string, string];
  catalogueEyebrow: string;
  catalogueTitle: string;
  catalogueBody: string;
  categories: Array<{ label: string; description: string }>;
  showcaseEyebrow: string;
  showcaseTitle: string;
  showcaseBody: string;
  cards: Record<string, ProductCardCopy>;
  viewProduct: string;
  englishDetails: string;
  principlesEyebrow: string;
  principlesTitle: string;
  principles: Array<{ title: string; body: string }>;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
  footerNote: string;
};

export const INTERNATIONAL_HUB_COPY: Record<InternationalProductLocale, InternationalHubCopy> = {
  it: {
    metaTitle: "Prodotti Avyron — componenti, template ed effetti 3D per il web",
    metaDescription: "Scopri i prodotti digitali Avyron: componenti React, sezioni pronte al lancio, template, strumenti, API ed effetti 3D ottimizzati per prestazioni e accessibilità.",
    languageLabel: "Lingua",
    backHome: "Avyron",
    openCatalog: "Catalogo completo",
    partnerships: "Collaborazioni",
    eyebrow: "Prodotti digitali AVYRON · Europa",
    title: "Un sistema di prodotti digitali",
    titleAccent: "pronto a trasformare idee in esperienze.",
    intro: "Componenti, sezioni, template, strumenti ed effetti 3D costruiti per progetti reali. Ogni elemento è pensato per essere veloce, accessibile e semplice da integrare.",
    primaryCta: "Esplora la selezione",
    secondaryCta: "Apri il catalogo in inglese",
    stats: ["prodotti", "gratuiti", "effetti 3D", "integrazioni API"],
    catalogueEyebrow: "Una biblioteca, molte direzioni",
    catalogueTitle: "Scegli il livello giusto per il tuo prossimo progetto.",
    catalogueBody: "Dai micro-dettagli di interazione fino a pagine e sistemi completi: il catalogo è organizzato per aiutarti a trovare rapidamente ciò che serve.",
    categories: [
      { label: "Componenti", description: "Interazioni precise, accessibili e leggere." },
      { label: "Sezioni", description: "Blocchi completi, pronti per contenuti reali." },
      { label: "Template", description: "Strutture coerenti per lanciare più velocemente." },
      { label: "Effetti 3D", description: "Profondità cinematografica con fallback efficienti." },
      { label: "Strumenti", description: "Utility pratiche per design, SEO e consegna." },
      { label: "API", description: "Dati affidabili integrati in esperienze chiare." },
    ],
    showcaseEyebrow: "Selezione editoriale",
    showcaseTitle: "Sei prodotti che raccontano l'universo Avyron.",
    showcaseBody: "Una selezione rappresentativa: identità, conversione, utilità, dati strutturati e interazioni immersive.",
    cards: {
      "logo-studio-3d": { name: "Logo Studio 3D", summary: "Crea, illumina e ruota un logo nello spazio direttamente nel browser.", category: "Identità" },
      "hero-spatial-particule": { name: "Hero spaziale a particelle", summary: "Un'apertura immersiva che reagisce al puntatore senza sacrificare la leggibilità.", category: "Esperienza 3D" },
      "template-landing-saas": { name: "Template landing SaaS", summary: "Una struttura di conversione completa per prodotti software e servizi digitali.", category: "Template" },
      "calculator-cost-proiect": { name: "Calcolatore del costo progetto", summary: "Un estimatore trasparente che trasforma requisiti complessi in una prima fascia di budget.", category: "Strumento" },
      "generator-json-ld": { name: "Generatore JSON-LD", summary: "Dati strutturati corretti per organizzazioni, servizi, FAQ e prodotti.", category: "SEO" },
      "api-open-meteo": { name: "API meteo Open-Meteo", summary: "Previsioni meteo integrate con stati di caricamento ed errori comprensibili.", category: "API" },
    },
    viewProduct: "Vedi il prodotto",
    englishDetails: "Scheda tecnica disponibile in inglese",
    principlesEyebrow: "Standard Avyron",
    principlesTitle: "Un prodotto digitale deve essere bello anche sotto la superficie.",
    principles: [
      { title: "Prestazioni dichiarate", body: "Peso, dipendenze e requisiti grafici sono visibili prima dell'integrazione." },
      { title: "Accessibilità nativa", body: "Focus, contrasto, tastiera e movimento ridotto fanno parte del prodotto, non di una correzione finale." },
      { title: "Codice aperto e portabile", body: "TypeScript leggibile, dipendenze esplicite e nessun vincolo nascosto verso la piattaforma." },
    ],
    finalTitle: "Vuoi costruire con Avyron?",
    finalBody: "Esplora il catalogo internazionale oppure raccontaci il progetto: possiamo adattare, integrare e sviluppare il sistema insieme a te.",
    finalCta: "Parliamo del progetto",
    footerNote: "Prodotti digitali progettati in Romania per team europei.",
  },
  hu: {
    metaTitle: "Avyron termékek — webes komponensek, sablonok és 3D effektek",
    metaDescription: "Fedezd fel az Avyron digitális termékeit: React komponensek, kész szekciók, sablonok, eszközök, API-k és teljesítményre optimalizált 3D effektek.",
    languageLabel: "Nyelv",
    backHome: "Avyron",
    openCatalog: "Teljes katalógus",
    partnerships: "Együttműködés",
    eyebrow: "AVYRON digitális termékek · Európa",
    title: "Digitális termékrendszer,",
    titleAccent: "amelyből gyorsabban lesz kifinomult élmény.",
    intro: "Valós projektekhez készült komponensek, szekciók, sablonok, eszközök és 3D effektek. Minden elem gyors, hozzáférhető és könnyen integrálható.",
    primaryCta: "Válogatás megnyitása",
    secondaryCta: "Angol katalógus megnyitása",
    stats: ["termék", "ingyenes", "3D effekt", "API-integráció"],
    catalogueEyebrow: "Egy könyvtár, sok irány",
    catalogueTitle: "Válaszd ki a következő projektedhez illő építőelemet.",
    catalogueBody: "Az apró interakcióktól a teljes oldalakig és rendszerekig: a katalógus felépítése segít gyorsan megtalálni, amire szükséged van.",
    categories: [
      { label: "Komponensek", description: "Pontos, hozzáférhető és könnyű interakciók." },
      { label: "Szekciók", description: "Valós tartalomhoz tervezett kész blokkok." },
      { label: "Sablonok", description: "Egységes struktúrák a gyorsabb induláshoz." },
      { label: "3D effektek", description: "Filmszerű mélység hatékony tartalék megoldásokkal." },
      { label: "Eszközök", description: "Gyakorlati segédletek designhoz, SEO-hoz és átadáshoz." },
      { label: "API-k", description: "Megbízható adatok érthető felületekbe építve." },
    ],
    showcaseEyebrow: "Szerkesztői válogatás",
    showcaseTitle: "Hat termék, amely megmutatja az Avyron világát.",
    showcaseBody: "Reprezentatív válogatás identitásból, konverzióból, hasznos eszközökből, strukturált adatokból és immerzív interakciókból.",
    cards: {
      "logo-studio-3d": { name: "Logo Studio 3D", summary: "Készíts, világíts meg és forgass logót térben közvetlenül a böngészőben.", category: "Arculat" },
      "hero-spatial-particule": { name: "Térbeli részecske hero", summary: "Magával ragadó nyitókép, amely reagál a mutatóra, miközben olvasható marad.", category: "3D élmény" },
      "template-landing-saas": { name: "SaaS landing sablon", summary: "Teljes konverziós struktúra szoftvertermékekhez és digitális szolgáltatásokhoz.", category: "Sablon" },
      "calculator-cost-proiect": { name: "Projektköltség-kalkulátor", summary: "Átlátható becslő, amely az összetett igényeket első költségsávvá alakítja.", category: "Eszköz" },
      "generator-json-ld": { name: "JSON-LD generátor", summary: "Helyes strukturált adatok szervezetekhez, szolgáltatásokhoz, GYIK-hoz és termékekhez.", category: "SEO" },
      "api-open-meteo": { name: "Open-Meteo időjárás API", summary: "Időjárás-előrejelzés érthető betöltési és hibakezelési állapotokkal.", category: "API" },
    },
    viewProduct: "Termék megtekintése",
    englishDetails: "A műszaki adatlap angolul érhető el",
    principlesEyebrow: "Avyron szabvány",
    principlesTitle: "Egy digitális terméknek a felszín alatt is jónak kell lennie.",
    principles: [
      { title: "Mérhető teljesítmény", body: "A méret, a függőségek és a grafikai igények már az integráció előtt láthatók." },
      { title: "Beépített hozzáférhetőség", body: "A fókusz, a kontraszt, a billentyűzet és a csökkentett mozgás a termék része." },
      { title: "Nyílt, hordozható kód", body: "Olvasható TypeScript, egyértelmű függőségek és rejtett platformkötöttség nélkül." },
    ],
    finalTitle: "Az Avyronnal építenél?",
    finalBody: "Nézd meg a nemzetközi katalógust, vagy mesélj a projektről. A rendszert közösen testre szabjuk, integráljuk és továbbfejlesztjük.",
    finalCta: "Beszéljünk a projektről",
    footerNote: "Romániában tervezett digitális termékek európai csapatoknak.",
  },
  de: {
    metaTitle: "Avyron Produkte — Web-Komponenten, Templates und 3D-Effekte",
    metaDescription: "Entdecke digitale Avyron Produkte: React-Komponenten, startfertige Sektionen, Templates, Tools, APIs und performante 3D-Effekte.",
    languageLabel: "Sprache",
    backHome: "Avyron",
    openCatalog: "Vollständiger Katalog",
    partnerships: "Zusammenarbeit",
    eyebrow: "Digitale AVYRON Produkte · Europa",
    title: "Ein System digitaler Produkte,",
    titleAccent: "das Ideen schneller in starke Erlebnisse verwandelt.",
    intro: "Komponenten, Sektionen, Templates, Tools und 3D-Effekte aus realen Projekten. Jedes Element ist schnell, zugänglich und einfach zu integrieren.",
    primaryCta: "Auswahl entdecken",
    secondaryCta: "Englischen Katalog öffnen",
    stats: ["Produkte", "kostenlos", "3D-Effekte", "API-Integrationen"],
    catalogueEyebrow: "Eine Bibliothek, viele Wege",
    catalogueTitle: "Wähle den passenden Baustein für dein nächstes Projekt.",
    catalogueBody: "Von kleinen Interaktionsdetails bis zu kompletten Seiten und Systemen: Der Katalog führt schnell zum richtigen Ausgangspunkt.",
    categories: [
      { label: "Komponenten", description: "Präzise, zugängliche und leichte Interaktionen." },
      { label: "Sektionen", description: "Vollständige Blöcke für echte Inhalte." },
      { label: "Templates", description: "Konsistente Strukturen für einen schnelleren Start." },
      { label: "3D-Effekte", description: "Cineastische Tiefe mit effizienten Fallbacks." },
      { label: "Tools", description: "Praktische Werkzeuge für Design, SEO und Auslieferung." },
      { label: "APIs", description: "Verlässliche Daten in klaren Erlebnissen." },
    ],
    showcaseEyebrow: "Kuratierte Auswahl",
    showcaseTitle: "Sechs Produkte, die das Avyron Universum zeigen.",
    showcaseBody: "Eine repräsentative Auswahl aus Identität, Conversion, Nutzen, strukturierten Daten und immersiven Interaktionen.",
    cards: {
      "logo-studio-3d": { name: "Logo Studio 3D", summary: "Logo direkt im Browser gestalten, beleuchten und frei im Raum drehen.", category: "Identität" },
      "hero-spatial-particule": { name: "Räumlicher Partikel-Hero", summary: "Ein immersiver Einstieg, der auf den Zeiger reagiert und dennoch lesbar bleibt.", category: "3D-Erlebnis" },
      "template-landing-saas": { name: "SaaS-Landingpage-Template", summary: "Eine vollständige Conversion-Struktur für Softwareprodukte und digitale Services.", category: "Template" },
      "calculator-cost-proiect": { name: "Projektkosten-Rechner", summary: "Ein transparenter Schätzer, der komplexe Anforderungen in einen ersten Budgetrahmen übersetzt.", category: "Tool" },
      "generator-json-ld": { name: "JSON-LD-Generator", summary: "Korrekte strukturierte Daten für Organisationen, Services, FAQ und Produkte.", category: "SEO" },
      "api-open-meteo": { name: "Open-Meteo Wetter-API", summary: "Wettervorhersagen mit verständlichen Lade- und Fehlerzuständen integrieren.", category: "API" },
    },
    viewProduct: "Produkt ansehen",
    englishDetails: "Technische Details sind auf Englisch verfügbar",
    principlesEyebrow: "Avyron Standard",
    principlesTitle: "Ein digitales Produkt muss auch unter der Oberfläche überzeugen.",
    principles: [
      { title: "Messbare Performance", body: "Größe, Abhängigkeiten und Grafik-Anforderungen sind vor der Integration sichtbar." },
      { title: "Zugänglichkeit ab Werk", body: "Fokus, Kontrast, Tastatur und reduzierte Bewegung gehören zum Produkt, nicht zum Nachtrag." },
      { title: "Offener, portabler Code", body: "Lesbares TypeScript, explizite Abhängigkeiten und keine versteckte Plattformbindung." },
    ],
    finalTitle: "Möchtest du mit Avyron bauen?",
    finalBody: "Entdecke den internationalen Katalog oder erzähle uns von deinem Projekt. Gemeinsam passen wir das System an, integrieren und erweitern es.",
    finalCta: "Projekt besprechen",
    footerNote: "In Rumänien entwickelte digitale Produkte für europäische Teams.",
  },
  fr: {
    metaTitle: "Produits Avyron — composants web, modèles et effets 3D",
    metaDescription: "Découvrez les produits numériques Avyron : composants React, sections prêtes à lancer, modèles, outils, API et effets 3D optimisés.",
    languageLabel: "Langue",
    backHome: "Avyron",
    openCatalog: "Catalogue complet",
    partnerships: "Collaborations",
    eyebrow: "Produits numériques AVYRON · Europe",
    title: "Un système de produits numériques",
    titleAccent: "pour transformer plus vite les idées en expériences.",
    intro: "Composants, sections, modèles, outils et effets 3D issus de projets réels. Chaque élément est rapide, accessible et simple à intégrer.",
    primaryCta: "Explorer la sélection",
    secondaryCta: "Ouvrir le catalogue anglais",
    stats: ["produits", "gratuits", "effets 3D", "intégrations API"],
    catalogueEyebrow: "Une bibliothèque, plusieurs directions",
    catalogueTitle: "Choisissez la bonne base pour votre prochain projet.",
    catalogueBody: "Du micro-détail d'interaction aux pages et systèmes complets, le catalogue vous aide à trouver rapidement le bon point de départ.",
    categories: [
      { label: "Composants", description: "Des interactions précises, accessibles et légères." },
      { label: "Sections", description: "Des blocs complets, pensés pour de vrais contenus." },
      { label: "Modèles", description: "Des structures cohérentes pour lancer plus vite." },
      { label: "Effets 3D", description: "Une profondeur cinématographique avec des solutions de repli efficaces." },
      { label: "Outils", description: "Des utilitaires pratiques pour le design, le SEO et la livraison." },
      { label: "API", description: "Des données fiables intégrées dans des expériences claires." },
    ],
    showcaseEyebrow: "Sélection éditoriale",
    showcaseTitle: "Six produits qui racontent l'univers Avyron.",
    showcaseBody: "Une sélection représentative : identité, conversion, utilité, données structurées et interactions immersives.",
    cards: {
      "logo-studio-3d": { name: "Logo Studio 3D", summary: "Créer, éclairer et faire pivoter un logo dans l'espace, directement dans le navigateur.", category: "Identité" },
      "hero-spatial-particule": { name: "Hero spatial à particules", summary: "Une ouverture immersive qui réagit au pointeur sans sacrifier la lisibilité.", category: "Expérience 3D" },
      "template-landing-saas": { name: "Modèle de landing SaaS", summary: "Une structure de conversion complète pour les logiciels et services numériques.", category: "Modèle" },
      "calculator-cost-proiect": { name: "Calculateur de coût de projet", summary: "Une estimation transparente qui transforme des besoins complexes en première fourchette budgétaire.", category: "Outil" },
      "generator-json-ld": { name: "Générateur JSON-LD", summary: "Des données structurées correctes pour organisations, services, FAQ et produits.", category: "SEO" },
      "api-open-meteo": { name: "API météo Open-Meteo", summary: "Des prévisions météo intégrées avec des états de chargement et d'erreur compréhensibles.", category: "API" },
    },
    viewProduct: "Voir le produit",
    englishDetails: "Fiche technique disponible en anglais",
    principlesEyebrow: "Standard Avyron",
    principlesTitle: "Un produit numérique doit aussi être excellent sous la surface.",
    principles: [
      { title: "Performance annoncée", body: "Poids, dépendances et exigences graphiques sont visibles avant l'intégration." },
      { title: "Accessibilité native", body: "Focus, contraste, clavier et réduction des animations font partie du produit dès le départ." },
      { title: "Code ouvert et portable", body: "TypeScript lisible, dépendances explicites et aucun verrouillage caché à la plateforme." },
    ],
    finalTitle: "Envie de construire avec Avyron ?",
    finalBody: "Explorez le catalogue international ou présentez-nous votre projet. Nous pouvons adapter, intégrer et développer le système avec vous.",
    finalCta: "Parler du projet",
    footerNote: "Des produits numériques conçus en Roumanie pour les équipes européennes.",
  },
  pl: {
    metaTitle: "Produkty Avyron — komponenty webowe, szablony i efekty 3D",
    metaDescription: "Poznaj cyfrowe produkty Avyron: komponenty React, gotowe sekcje, szablony, narzędzia, API i wydajne efekty 3D.",
    languageLabel: "Język",
    backHome: "Avyron",
    openCatalog: "Pełny katalog",
    partnerships: "Współpraca",
    eyebrow: "Cyfrowe produkty AVYRON · Europa",
    title: "System cyfrowych produktów,",
    titleAccent: "który szybciej zamienia pomysły w dopracowane doświadczenia.",
    intro: "Komponenty, sekcje, szablony, narzędzia i efekty 3D stworzone na potrzeby prawdziwych projektów. Każdy element jest szybki, dostępny i łatwy do integracji.",
    primaryCta: "Poznaj wybrane produkty",
    secondaryCta: "Otwórz katalog po angielsku",
    stats: ["produktów", "bezpłatnych", "efektów 3D", "integracji API"],
    catalogueEyebrow: "Jedna biblioteka, wiele kierunków",
    catalogueTitle: "Wybierz właściwy element dla swojego następnego projektu.",
    catalogueBody: "Od drobnych interakcji po kompletne strony i systemy — katalog pomaga szybko znaleźć właściwy punkt wyjścia.",
    categories: [
      { label: "Komponenty", description: "Precyzyjne, dostępne i lekkie interakcje." },
      { label: "Sekcje", description: "Kompletne bloki przygotowane na prawdziwe treści." },
      { label: "Szablony", description: "Spójne struktury, które przyspieszają start." },
      { label: "Efekty 3D", description: "Filmowa głębia z wydajnymi rozwiązaniami awaryjnymi." },
      { label: "Narzędzia", description: "Praktyczne funkcje dla designu, SEO i wdrożeń." },
      { label: "API", description: "Wiarygodne dane wbudowane w czytelne doświadczenia." },
    ],
    showcaseEyebrow: "Wybór redakcyjny",
    showcaseTitle: "Sześć produktów pokazujących świat Avyron.",
    showcaseBody: "Reprezentatywny wybór: identyfikacja, konwersja, użyteczność, dane strukturalne i immersyjne interakcje.",
    cards: {
      "logo-studio-3d": { name: "Logo Studio 3D", summary: "Twórz, oświetlaj i obracaj logo w przestrzeni bezpośrednio w przeglądarce.", category: "Identyfikacja" },
      "hero-spatial-particule": { name: "Przestrzenny hero z cząsteczkami", summary: "Immersyjne otwarcie reagujące na wskaźnik bez utraty czytelności.", category: "Doświadczenie 3D" },
      "template-landing-saas": { name: "Szablon landing page SaaS", summary: "Kompletna struktura konwersji dla oprogramowania i usług cyfrowych.", category: "Szablon" },
      "calculator-cost-proiect": { name: "Kalkulator kosztu projektu", summary: "Przejrzysta wycena, która zamienia złożone wymagania we wstępny przedział budżetu.", category: "Narzędzie" },
      "generator-json-ld": { name: "Generator JSON-LD", summary: "Poprawne dane strukturalne dla organizacji, usług, FAQ i produktów.", category: "SEO" },
      "api-open-meteo": { name: "API pogodowe Open-Meteo", summary: "Prognozy pogody z czytelnymi stanami ładowania i obsługą błędów.", category: "API" },
    },
    viewProduct: "Zobacz produkt",
    englishDetails: "Dokumentacja techniczna jest dostępna po angielsku",
    principlesEyebrow: "Standard Avyron",
    principlesTitle: "Produkt cyfrowy powinien zachwycać także pod powierzchnią.",
    principles: [
      { title: "Mierzalna wydajność", body: "Rozmiar, zależności i wymagania graficzne są widoczne jeszcze przed integracją." },
      { title: "Dostępność od początku", body: "Fokus, kontrast, klawiatura i ograniczenie ruchu są częścią produktu, a nie późniejszą poprawką." },
      { title: "Otwarty, przenośny kod", body: "Czytelny TypeScript, jawne zależności i brak ukrytego uzależnienia od platformy." },
    ],
    finalTitle: "Chcesz budować z Avyron?",
    finalBody: "Przejrzyj międzynarodowy katalog albo opowiedz nam o projekcie. Możemy wspólnie dostosować, zintegrować i rozwinąć system.",
    finalCta: "Porozmawiajmy o projekcie",
    footerNote: "Produkty cyfrowe projektowane w Rumunii dla europejskich zespołów.",
  },
};
