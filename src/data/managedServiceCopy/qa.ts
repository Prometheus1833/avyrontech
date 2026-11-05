import {
  Accessibility,
  ArrowRight,
  Bug,
  Check,
  ClipboardList,
  Clock,
  Cpu,
  FileSearch,
  FlaskConical,
  Gauge,
  Globe,
  Hand,
  Layers,
  Lock,
  MessageCircle,
  Monitor,
  RefreshCw,
  Repeat,
  Smartphone,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
function getCopy(ro:boolean){
const faq = ro
    ? [
        { q: "Este un abonament lunar?", a: "Nu. Testarea QA se contractează pe proiect sau pe sprint, cu preț fix agreat înainte de start. Plătești o singură dată pentru runda de testare, iar retestarea defectelor raportate este inclusă." },
        { q: "Ce înseamnă testare manuală și ce înseamnă testare automată?", a: "Testarea manuală înseamnă că un tester parcurge fluxurile ca un client real, pe dispozitive fizice, și caută inclusiv problemele pe care un script nu le vede. Testarea automată înseamnă scripturi end-to-end care repetă aceleași verificări la fiecare actualizare, în câteva minute." },
        { q: "Testați și aplicații mobile native?", a: "Da. Testăm aplicații Android și iOS, native sau hibride, inclusiv build-uri din TestFlight sau Google Play Internal Testing, pe dispozitive reale și emulatoare." },
        { q: "Ce primesc la final?", a: "Un raport de defecte cu severitate, pași de reproducere, capturi sau înregistrări video, impactul asupra utilizatorului și recomandarea de remediere, plus setul de scenarii de test care rămâne al tău." },
        { q: "Reparați și defectele găsite?", a: "Putem. Remedierea se cotează separat, în funcție de complexitate. Dacă lucrezi cu altă echipă de dezvoltare, raportul este suficient de detaliat ca ei să intervină direct." },
        { q: "Cât durează o rundă de testare?", a: "Între 3 și 10 zile lucrătoare pentru majoritatea proiectelor. Un site de prezentare se acoperă în 3–4 zile, un magazin online sau o aplicație cu conturi și plăți în 7–10 zile." },
        { q: "Cât costă?", a: "De la 1.600 lei pentru o rundă completă pe un site de prezentare. Pentru magazine online, aplicații și platforme cotăm în funcție de numărul de fluxuri critice și de dispozitivele acoperite." },
      ]
    : [
        { q: "Is this a monthly subscription?", a: "No. QA testing is contracted per project or per sprint, at a fixed price agreed before we start. You pay once for the testing round, and retesting of reported defects is included." },
        { q: "What is manual testing and what is automated testing?", a: "Manual testing means a tester walks your flows like a real customer, on physical devices, catching issues a script never sees. Automated testing means end-to-end scripts that repeat the same checks on every release, in minutes." },
        { q: "Do you test native mobile apps?", a: "Yes. We test Android and iOS apps, native or hybrid, including TestFlight and Google Play Internal Testing builds, on real devices and emulators." },
        { q: "What do I receive at the end?", a: "A defect report with severity, reproduction steps, screenshots or video recordings, user impact and a fix recommendation, plus the test case set which stays yours." },
        { q: "Do you also fix the defects you find?", a: "We can. Fixing is quoted separately based on complexity. If you work with another development team, the report is detailed enough for them to act directly." },
        { q: "How long does a testing round take?", a: "Between 3 and 10 working days for most projects. A presentation website is covered in 3–4 days; an online store or an app with accounts and payments in 7–10 days." },
        { q: "How much does it cost?", a: "From 1,600 RON (€300 when displayed in euro) for a full round on a presentation website. For stores, apps and platforms we quote based on the number of critical flows and the devices covered." },
      ];
const modes = {
    manual: {
      label: ro ? "Testare manuală" : "Manual testing",
      icon: Hand,
      lead: ro
        ? "Un tester parcurge produsul exact ca un client real: greșește, se răzgândește, pierde semnalul, apasă butonul de două ori. Aici apar problemele pe care niciun script nu le anticipează."
        : "A tester walks your product exactly like a real customer: makes mistakes, changes their mind, loses signal, taps a button twice. This is where the issues no script anticipates show up.",
      points: ro
        ? [
            "Testare exploratorie pe fluxurile tale de business",
            "Scenarii negative: date greșite, stoc epuizat, plată refuzată",
            "Verificare pe dispozitive fizice Android și iOS",
            "Control vizual: layout, texte, imagini, stări de eroare",
            "Testare de acceptanță (UAT) împreună cu tine",
            "Verificarea emailurilor tranzacționale și a facturilor",
          ]
        : [
            "Exploratory testing across your business flows",
            "Negative scenarios: bad data, out of stock, declined payment",
            "Checks on physical Android and iOS devices",
            "Visual control: layout, copy, images, error states",
            "User acceptance testing (UAT) together with you",
            "Transactional email and invoice verification",
          ],
      tools: ["Dispozitive fizice", "BrowserStack", "Charles Proxy", "TestRail / Notion", "DevTools"],
    },
    auto: {
      label: ro ? "Testare automată" : "Automated testing",
      icon: Terminal,
      lead: ro
        ? "Scripturile rulează aceleași verificări la fiecare actualizare, în câteva minute, și prind regresiile înainte să ajungă la clienți. Suita rămâne a ta și poate fi extinsă oricând."
        : "Scripts run the same checks on every release, in minutes, catching regressions before they reach customers. The suite stays yours and can be extended any time.",
      points: ro
        ? [
            "Teste end-to-end pe fluxurile critice (Playwright)",
            "Testare de regresie automată la fiecare deploy",
            "Verificări API și contract pentru integrări",
            "Teste de performanță și încărcare simultană (k6)",
            "Audit automat de accesibilitate (axe) și Lighthouse",
            "Rulare în pipeline CI, cu raport și capturi la fiecare eșec",
          ]
        : [
            "End-to-end tests on critical flows (Playwright)",
            "Automated regression testing on every deploy",
            "API and contract checks for your integrations",
            "Performance and concurrent load tests (k6)",
            "Automated accessibility (axe) and Lighthouse audits",
            "CI pipeline runs, with a report and screenshots on each failure",
          ],
      tools: ["Playwright", "Vitest", "k6", "axe-core", "Lighthouse CI", "GitHub Actions"],
    },
  } as const;
const types = ro
    ? [
        { icon: Check, title: "Funcțional", desc: "Cont, căutare, coș, checkout, plată, formulare, notificări, zona de administrare." },
        { icon: Repeat, title: "Regresie", desc: "Ne asigurăm că o modificare nouă nu strică ce funcționa deja înainte." },
        { icon: FileSearch, title: "Exploratoriu", desc: "Testare liberă, fără scenariu fix, exact acolo unde apar defectele neașteptate." },
        { icon: Monitor, title: "Cross-browser", desc: "Chrome, Safari, Firefox și Edge, pe rezoluții și sisteme de operare diferite." },
        { icon: Smartphone, title: "Mobil real", desc: "Telefoane Android și iPhone fizice, tablete, ecrane mici și telefoane vechi." },
        { icon: Gauge, title: "Performanță", desc: "Core Web Vitals, timpi de răspuns, internet lent și trafic simultan crescut." },
        { icon: Lock, title: "Securitate de bază", desc: "Validări de input, protecția formularelor, roluri, sesiuni și expunerea datelor." },
        { icon: Accessibility, title: "Accesibilitate", desc: "Navigare din tastatură, contrast, etichete pentru cititoare de ecran, criterii WCAG." },
        { icon: Layers, title: "API și integrări", desc: "Plăți, curierat, facturare, CRM, email — verificate inclusiv pe erorile lor." },
        { icon: Globe, title: "Localizare și SEO tehnic", desc: "Limbi, monede, formate de dată, titluri, meta, canonice și date structurate." },
        { icon: Cpu, title: "Compatibilitate", desc: "Comportament pe conexiuni instabile, browsere vechi și moduri de economisire." },
        { icon: ClipboardList, title: "Acceptanță (UAT)", desc: "Validarea finală înainte de lansare, împreună cu tine, pe criterii agreate." },
      ]
    : [
        { icon: Check, title: "Functional", desc: "Account, search, cart, checkout, payment, forms, notifications, admin area." },
        { icon: Repeat, title: "Regression", desc: "We make sure a new change doesn't break what already worked." },
        { icon: FileSearch, title: "Exploratory", desc: "Free-form testing with no fixed script, right where unexpected defects live." },
        { icon: Monitor, title: "Cross-browser", desc: "Chrome, Safari, Firefox and Edge across resolutions and operating systems." },
        { icon: Smartphone, title: "Real mobile", desc: "Physical Android phones and iPhones, tablets, small screens and older devices." },
        { icon: Gauge, title: "Performance", desc: "Core Web Vitals, response times, slow networks and increased concurrent traffic." },
        { icon: Lock, title: "Baseline security", desc: "Input validation, form protection, roles, sessions and data exposure." },
        { icon: Accessibility, title: "Accessibility", desc: "Keyboard navigation, contrast, screen reader labels, WCAG criteria." },
        { icon: Layers, title: "API and integrations", desc: "Payments, shipping, invoicing, CRM, email — including their failure paths." },
        { icon: Globe, title: "Localization and technical SEO", desc: "Languages, currencies, date formats, titles, meta, canonicals, structured data." },
        { icon: Cpu, title: "Compatibility", desc: "Behaviour on unstable connections, older browsers and data-saving modes." },
        { icon: ClipboardList, title: "Acceptance (UAT)", desc: "The final validation before launch, together with you, on agreed criteria." },
      ];
const steps = ro
    ? [
        { title: "Analiză și plan", desc: "Stabilim ce testăm, pe ce dispozitive și care sunt fluxurile critice pentru afacere." },
        { title: "Scenarii de test", desc: "Scriem cazurile de test, inclusiv cele negative, și le agreăm împreună înainte de start." },
        { title: "Execuție", desc: "Rulăm manual pe dispozitive reale și automat acolo unde repetabilitatea aduce valoare." },
        { title: "Raportare", desc: "Fiecare defect primește severitate, pași de reproducere, dovadă vizuală și impact." },
        { title: "Retestare", desc: "După remedieri retestăm defectele și rulăm o rundă de regresie pe zonele atinse." },
      ]
    : [
        { title: "Analysis and plan", desc: "We define what we test, on which devices, and which flows are business critical." },
        { title: "Test scenarios", desc: "We write the test cases, negative ones included, and agree them before we start." },
        { title: "Execution", desc: "We run manually on real devices and automatically where repeatability pays off." },
        { title: "Reporting", desc: "Every defect gets severity, reproduction steps, visual evidence and impact." },
        { title: "Retesting", desc: "After fixes we retest the defects and run a regression pass on the affected areas." },
      ];
const packages = [
    {
      key: "esential",
      ron: 1600,
      eur: 300,
      icon: Bug,
      accent: "from-lime-400 to-emerald-600",
      name: ro ? "Rundă esențială" : "Essential round",
      time: ro ? "3–4 zile" : "3–4 days",
      bestFor: ro ? "Site de prezentare, blog, pagină de campanie" : "Presentation site, blog, campaign page",
      features: ro
        ? ["Testare manuală funcțională", "Cross-browser desktop + mobil", "Formulare, emailuri, SEO tehnic de bază", "Raport de defecte cu severitate", "O retestare inclusă"]
        : ["Manual functional testing", "Cross-browser desktop + mobile", "Forms, emails, baseline technical SEO", "Defect report with severity", "One retest included"],
    },
    {
      key: "complet",
      ron: 3700,
      eur: 700,
      icon: FlaskConical,
      highlight: true,
      accent: "from-emerald-400 to-cyan-600",
      name: ro ? "Rundă completă" : "Full round",
      time: ro ? "7–10 zile" : "7–10 days",
      bestFor: ro ? "Magazin online, aplicație cu conturi și plăți" : "Online store, app with accounts and payments",
      features: ro
        ? ["Tot din runda esențială", "Conturi, coș, checkout, plăți, facturare", "Dispozitive fizice Android și iOS", "Performanță, securitate de bază, accesibilitate", "Două retestări și regresie inclusă"]
        : ["Everything in the essential round", "Accounts, cart, checkout, payments, invoicing", "Physical Android and iOS devices", "Performance, baseline security, accessibility", "Two retests and regression included"],
    },
    {
      key: "automat",
      ron: 6300,
      eur: 1200,
      icon: Workflow,
      accent: "from-cyan-400 to-blue-600",
      name: ro ? "Automatizare end-to-end" : "End-to-end automation",
      time: ro ? "10–15 zile" : "10–15 days",
      bestFor: ro ? "Produse cu lansări frecvente și echipă de dezvoltare" : "Products with frequent releases and a dev team",
      features: ro
        ? ["Suită Playwright pe fluxurile critice", "Rulare automată în pipeline la fiecare deploy", "Teste API și verificări de performanță", "Rapoarte cu capturi la fiecare eșec", "Cod și documentație predate ție"]
        : ["Playwright suite on your critical flows", "Automatic pipeline runs on every deploy", "API tests and performance checks", "Reports with screenshots on every failure", "Code and documentation handed over to you"],
    },
  ];
return {faq,modes,types,steps,packages};}
export const QA_PAGE_COPY={ro:getCopy(true),en:getCopy(false)};
