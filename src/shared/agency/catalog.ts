/** Public evidence checked 2026-11-09. A listing is not an activated AVYRON account. */
export type AgencyCategory = "free" | "success" | "review";
export type AgencyPlatform = {
  id: string;
  name: string;
  category: AgencyCategory;
  priority: number;
  mode: "direct" | "inbound" | "network";
  homepage: string;
  login: string | null;
  register: string;
  hosts: string[];
  description: string;
  services: string[];
  workflow: string[];
  acquisition: string;
  eligibility: string;
  costs: string;
  restrictions: string;
  documents: string[];
  evidence: { url: string; label: string }[];
  verifiedOn: string;
  commissionBps: number | null;
  pending: string[];
};
const evidence = (url: string, label: string) => ({ url, label });
export const AGENCY_PLATFORMS: readonly AgencyPlatform[] = [
  {
    id: "infinum",
    name: "Infinum Alliance",
    category: "free",
    priority: 1,
    mode: "network",
    homepage: "https://alliance.infinum.com/partners/",
    login: null,
    register: "https://alliance.infinum.com/application-form/",
    hosts: ["infinum.com"],
    description:
      "Rețea B2B de subcontractare pentru companii de design și dezvoltare. Prioritate ridicată pentru expertiza tehnică AVYRON.",
    services: [
      "Software",
      "Frontend / Backend",
      "Aplicații",
      "Design",
      "DevOps",
    ],
    workflow: [
      "Aplicare cu datele firmei, echipa și referințele.",
      "Evaluarea expertizei și interviu tehnic.",
      "După acceptare, analiza invitațiilor și a condițiilor fiecărui proiect.",
    ],
    acquisition:
      "Oportunități potrivite transmise după selecție; nu este o bursă publică de proiecte garantate.",
    eligibility:
      "Companiile pot aplica. Acceptarea DIGITAL ECOTECH SOLUTIONS S.R.L. și condițiile de facturare se confirmă individual.",
    costs:
      "Pagina partenerilor descrie colaborarea fără cost suplimentar. Tarifele și contractul fiecărei misiuni necesită acceptare.",
    restrictions:
      "Nu presupune acceptarea, frecvența invitațiilor sau existența unui login public separat.",
    documents: [
      "Date societate",
      "Portofoliu relevant",
      "Competențe și capacitate echipă",
      "Tarife confirmate",
    ],
    evidence: [
      evidence("https://alliance.infinum.com/partners/", "Parteneri și proces"),
      evidence(
        "https://alliance.infinum.com/application-form/",
        "Formular oficial",
      ),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 0,
    pending: ["Acceptare AVYRON", "Contract și facturare"],
  },
  {
    id: "goodfirms",
    name: "GoodFirms",
    category: "free",
    priority: 2,
    mode: "direct",
    homepage: "https://www.goodfirms.co/",
    login: "https://myaccount.goodfirms.co/users/login",
    register: "https://www.goodfirms.co/get-listed",
    hosts: ["goodfirms.co"],
    description:
      "Profil B2B cu portofoliu și recenzii; planul gratuit declară acces limitat la RFP-uri publice.",
    services: ["Web / e-commerce", "Software", "AI", "SEO", "Marketing", "QA"],
    workflow: [
      "Solicită listarea gratuită și verificarea companiei.",
      "Completează serviciile, studiile de caz și recenziile autentice.",
      "Monitorizează RFP-urile disponibile în Free și cererile primite.",
    ],
    acquisition:
      "RFP-uri publice limitate și contacte organice. Verifică accesul gratuit la fiecare cerere, fără deblocări plătite.",
    eligibility:
      "Listare de companie; aprobarea contului românesc se confirmă prin procesul platformei.",
    costs: "Free: 0 USD, fără card și fără expirare, conform paginii oficiale.",
    restrictions:
      "Fără PRO, sponsorship sau promisiuni de volum. Limitele RFP se verifică în cont.",
    documents: ["Date societate", "Website", "Portofoliu", "Referințe reale"],
    evidence: [
      evidence("https://www.goodfirms.co/get-listed", "Plan Free și RFP-uri"),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 0,
    pending: ["Aprobarea listării", "Accesul concret la RFP-uri"],
  },
  {
    id: "techbehemoths",
    name: "TechBehemoths",
    category: "free",
    priority: 3,
    mode: "inbound",
    homepage: "https://techbehemoths.com/",
    login: "https://my.techbehemoths.com/login",
    register: "https://techbehemoths.com/companies/get-listed",
    hosts: ["techbehemoths.com"],
    description:
      "Descoperire de furnizori IT și mesaje inbound prin profilul firmei, în limitele Free.",
    services: [
      "Web / e-commerce",
      "Software",
      "AI",
      "Design",
      "SEO",
      "Marketing",
    ],
    workflow: [
      "Adaugă sau revendică profilul companiei.",
      "Completează portofoliul și domeniile de expertiză.",
      "Răspunde manual mesajelor organice din profil.",
    ],
    acquisition:
      "Mesaje inbound gratuite; accesul la anumite proiecte/contacte și deblocările sunt funcții distincte, posibil plătite.",
    eligibility:
      "Există un director pentru România. Acceptarea profilului AVYRON rămâne separată.",
    costs:
      "FREE pentru listare și formularul de contact; CORE și PRO sunt excluse din acest flux.",
    restrictions:
      "Nu marca project unlock drept gratuit. Fără upgrade sau rezultate garantate.",
    documents: [
      "Date societate",
      "Website",
      "Studii de caz",
      "Servicii și echipă",
    ],
    evidence: [
      evidence("https://techbehemoths.com/terms", "Free versus acces plătit"),
      evidence(
        "https://techbehemoths.com/companies/romania",
        "Director România",
      ),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 0,
    pending: ["Verificarea profilului AVYRON"],
  },
  {
    id: "clutch",
    name: "Clutch",
    category: "free",
    priority: 4,
    mode: "inbound",
    homepage: "https://clutch.co/",
    login: null,
    register: "https://vendor.clutch.co/profile/create/basic",
    hosts: ["clutch.co"],
    description:
      "Profil Basic pentru descoperire B2B și contacte organice; separat de promovarea și verificarea plătite.",
    services: [
      "Software",
      "Web / e-commerce",
      "AI",
      "Design",
      "SEO",
      "Marketing",
    ],
    workflow: [
      "Creează profilul Basic gratuit.",
      "Adaugă datele firmei și studiile de caz permise.",
      "Solicită recenzii reale și urmărește contactele organice.",
    ],
    acquisition:
      "Descoperirea profilului de către cumpărători. Nu presupune acces gratuit la leaduri contra cost.",
    eligibility:
      "Directorul include România; verificarea efectivă a contului firmei este necesară.",
    costs:
      "Basic gratuit. Clutch Verified și advertising sunt funcții plătite, neactivate.",
    restrictions:
      "Basic are studii de caz limitate și nu include Clutch Verification. Nu confunda verificarea recenziilor cu statutul plătit al firmei. Login direct neconfirmat; folosește site-ul oficial.",
    documents: [
      "Date societate",
      "Servicii",
      "Portofoliu permis",
      "Referințe ale clienților",
    ],
    evidence: [
      evidence("https://clutch.co/get-listed", "Basic și limite"),
      evidence("https://clutch.co/ro/developers", "România"),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 0,
    pending: ["Profil AVYRON", "Verificarea accesului în cont"],
  },
  {
    id: "een",
    name: "Enterprise Europe Network",
    category: "free",
    priority: 5,
    mode: "direct",
    homepage: "https://een.ec.europa.eu/partnering-opportunities",
    login: null,
    register: "https://een.ec.europa.eu/local-contact-points/ro",
    hosts: ["een.ec.europa.eu"],
    description:
      "Oportunități internaționale de cooperare și subcontractare, prin rețeaua europeană pentru IMM-uri.",
    services: ["Software", "AI", "Digitalizare", "Servicii IT"],
    workflow: [
      "Caută profiluri relevante și citește tipul acordului.",
      "Selectează cereri comerciale ori de outsourcing.",
      "Contactează punctul EEN din România pentru exprimarea interesului.",
    ],
    acquisition:
      "Cereri publice și intermediere prin consilieri. Parteneriatele de cercetare/finanțare sunt etichetate distinct de proiectele comerciale.",
    eligibility:
      "România are puncte EEN locale. Firma beneficiază de servicii; nu devine automat membru al rețelei.",
    costs:
      "Serviciile de informare, consiliere și parteneriat sunt descrise ca gratuite; confirmă eventuale condiții locale înainte de angajamente.",
    restrictions:
      "Nu echivala granturile sau ofertele altor furnizori cu cereri de cumpărare. Fără cont AVYRON ori rezultate presupuse.",
    documents: [
      "Profil companie",
      "Expertiză",
      "Referința oportunității",
      "Descrierea cooperării",
    ],
    evidence: [
      evidence(
        "https://een.ec.europa.eu/partnering-opportunities",
        "Oportunități publice",
      ),
      evidence(
        "https://een.ec.europa.eu/local-contact-points/ro",
        "Contacte în România",
      ),
      evidence(
        "https://een.ec.europa.eu/about-enterprise-europe-network",
        "Serviciile rețelei",
      ),
      evidence(
        "https://een.ec.europa.eu/system/files/documents/2024-05/Info%20session%202024%20EEN%20call.pdf",
        "Servicii gratuite",
      ),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 0,
    pending: ["Confirmarea procedurii locale"],
  },
  {
    id: "agencylisted",
    name: "AgencyListed",
    category: "review",
    priority: 6,
    mode: "inbound",
    homepage: "https://agencylisted.com/",
    login: "https://agencylisted.com/dashboard",
    register: "https://agencylisted.com/get-listed",
    hosts: ["agencylisted.com"],
    description:
      "Declară profil și briefuri de proiect gratuite. Rămâne în verificare până există dovezi suficiente de oportunități accesibile.",
    services: ["Branding", "Web", "SEO", "Marketing"],
    workflow: [
      "Verifică eligibilitatea firmei și termenii.",
      "Confirmă briefuri reale și procedura de acces fără plată.",
      "Înregistrează dovezile; activează numai după revizuire umană.",
    ],
    acquisition:
      "Briefuri compatibile declarate de furnizor; volumul, calitatea și accesibilitatea pentru AVYRON nu sunt confirmate.",
    eligibility: "Acceptarea unei societăți românești necesită confirmare.",
    costs:
      "Pagina declară Free pentru listare și briefuri; Pro nu cumpără distribuirea leadurilor.",
    restrictions:
      "Fără Pro. Directorul și pagina de prețuri nu demonstrează singure activitate comercială relevantă.",
    documents: [
      "Date societate",
      "Portofoliu",
      "Dovezi de eligibilitate și proiecte",
    ],
    evidence: [
      evidence("https://agencylisted.com/pricing", "Free și Pro"),
      evidence("https://agencylisted.com/get-listed", "Înscriere"),
      evidence("https://agencylisted.com/dashboard", "Acces prin link e-mail"),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 0,
    pending: [
      "Cereri comerciale recente reale",
      "România și facturare SRL",
      "Acces gratuit efectiv",
    ],
  },
  {
    id: "breef",
    name: "Breef",
    category: "success",
    priority: 7,
    mode: "network",
    homepage: "https://www.breef.com/for-agencies",
    login: null,
    register: "https://projects.breef.com/public/apply",
    hosts: ["breef.com"],
    description:
      "Invitații de proiect pentru agenții selectate în web, marketing și branding. Alternativă secundară, cu comision la câștig.",
    services: ["Web", "Branding", "Marketing", "E-commerce"],
    workflow: [
      "Aplicare cu echipa, serviciile și portofoliul.",
      "Evaluare și invitații potrivite, fără frecvență garantată.",
      "Ofertă manuală și contract cu verificarea încasării.",
    ],
    acquisition: "Proiecte prin invitație după aprobarea agenției.",
    eligibility:
      "Încasările sunt descrise prin ACH; eligibilitatea și plata către SRL în România trebuie confirmate înainte de contractare.",
    costs:
      "Înscriere și pitch gratuite. 15% din valoarea proiectelor din primele 12 luni ale relației, inclusiv extinderi; anumite costuri terțe sunt excluse.",
    restrictions:
      "Nu presupune compatibilitatea ACH sau un cont acceptat. Comisionul concret și baza de calcul se confirmă contractual.",
    documents: [
      "Portofoliu",
      "Profil agenție",
      "Date fiscale",
      "Confirmare ACH / plată",
    ],
    evidence: [
      evidence("https://www.breef.com/for-agencies", "Comision, proces și ACH"),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 1500,
    pending: ["România / ACH", "Acceptarea agenției"],
  },
  {
    id: "unbench",
    name: "Unbench",
    category: "success",
    priority: 8,
    mode: "network",
    homepage: "https://www.unbench.us/for-partners",
    login: "https://platform.unbench.us/signin",
    register: "https://platform.unbench.us/",
    hosts: ["unbench.us"],
    description:
      "Subcontractare și colaborare între companii software și agenții; utilizare numai fără plată inițială.",
    services: ["Software", "Echipe dedicate", "Design", "Marketing"],
    workflow: [
      "Înregistrare și completarea profilului companiei.",
      "Verificarea companiei și a condițiilor planului gratuit.",
      "Analiza cererilor și acceptarea comisionului după contract câștigat.",
    ],
    acquisition:
      "Cereri și colaborări B2B după verificare. Există și planuri/limite; se utilizează doar traseul fără plată în avans.",
    eligibility:
      "Procedura cere țara și documentele firmei. România și modalitatea de încasare necesită confirmare.",
    costs:
      "Pagina partenerilor declară înscriere gratuită și taxă după încheierea cu succes a unui acord. Procentul nu este public confirmat.",
    restrictions:
      "Fără upgrade. Nu se calculează o marjă pozitivă cu comision necunoscut.",
    documents: [
      "Date societate",
      "Documente de înregistrare",
      "Profil echipă",
      "Comision scris",
    ],
    evidence: [
      evidence("https://www.unbench.us/for-partners", "Condiții parteneri"),
      evidence(
        "https://www.unbench.us/user-guides/step-by-step-guide-script-how-to-sign-up-on-unbench",
        "Ghid de înscriere",
      ),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: null,
    pending: [
      "Procentul comisionului",
      "România / încasare",
      "Limitele planului gratuit",
    ],
  },
  {
    id: "influr",
    name: "INFLUR",
    category: "success",
    priority: 9,
    mode: "direct",
    homepage: "https://www.influr.com/",
    login: "https://www.influr.com/login",
    register: "https://www.influr.com/register/service-provider",
    hosts: ["influr.com"],
    description:
      "Marketplace de servicii digitale pentru piața Orientului Mijlociu, deschis agențiilor și furnizorilor din alte țări.",
    services: ["Web", "Design", "AI", "Marketing", "Software"],
    workflow: [
      "Deschide un profil de furnizor și confirmă datele firmei.",
      "Publică oferte sau răspunde manual briefurilor gratuite.",
      "Verifică livrarea, comisionul și ruta bancară înainte de contract.",
    ],
    acquisition:
      "Briefuri publice și servicii la preț fix; prețurile și plățile sunt în AED.",
    eligibility:
      "Sunt descrise transferuri IBAN/SWIFT în AED. Acceptarea băncii și a SRL-ului românesc nu este confirmată automat.",
    costs:
      "Fără abonament: 10% din prețul lucrării și suplimente, la eliberarea plății. Încasările devin disponibile după perioada de clearing descrisă de furnizor.",
    restrictions:
      "Fără promisiuni privind transferurile internaționale. Managed projects au termeni separați; verificați clauzele aplicabile.",
    documents: [
      "Date societate",
      "Profil furnizor",
      "Portofoliu",
      "Confirmare bancă și facturare",
    ],
    evidence: [
      evidence("https://www.influr.com/", "Ofertare, costuri și încasare"),
      evidence(
        "https://www.influr.com/terms-of-service",
        "Termeni contractuali",
      ),
    ],
    verifiedOn: "2026-11-09",
    commissionBps: 1000,
    pending: ["România / IBAN-SWIFT", "Acceptare profil furnizor"],
  },
];
export const agencyPlatform = (id: string) =>
  AGENCY_PLATFORMS.find((p) => p.id === id);
export const AGENCY_CATEGORY_LABELS = {
  free: "Platforme gratuite",
  success: "Comision la succes",
  review: "În verificare",
};
