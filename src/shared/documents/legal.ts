/** Reviewed source pointers for human legal review. No template is approved by this registry. */
export const LEGAL_REVIEW_DATE = '2026-11-11';
export const SIGNATURE_TERMS = 'Părțile verifică forma și dreptul de reprezentare înainte de semnare. La semnarea electronică se folosește un tip de semnătură adecvat actului, potrivit art. 25 din Regulamentul (UE) nr. 910/2014 (eIDAS) și Legii nr. 214/2024. Se păstrează versiunea integrală semnată, cu anexele convenite.';
export const TEMPLATE_STAGES: Record<string, number> = { brief: 1, audit: 1, offer: 2, framework: 3, annex: 3, access: 3, privacy: 3, implementation: 4, report: 4, handover: 4, sla: 5 };
export const LEGAL_SOURCES = {
  company: { title: 'Legea nr. 31/1990, art. 74 · identificarea societății', url: 'https://legislatie.just.ro/Public/DetaliiDocument/169688' },
  civil: { title: 'Codul civil · bună-credință, contract-cadru, clauze și executare', url: 'https://legislatie.just.ro/Public/DetaliiDocument/282147' },
  copyright: { title: 'Legea nr. 8/1996, republicată · art. 42–43 și 73–74', url: 'https://legislatie.just.ro/Public/DetaliiDocument/201472' },
  gdpr: { title: 'Regulamentul (UE) 2016/679 · protecția datelor', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=ro' },
  commerce: { title: 'Legea nr. 365/2002 · comerț electronic', url: 'https://legislatie.just.ro/Public/DetaliiDocument/77218' },
  consumer: { title: 'OUG nr. 34/2014 · contracte cu consumatorii', url: 'https://legislatie.just.ro/Public/DetaliiDocument/254147' },
  cookies: { title: 'Legea nr. 506/2004 · comunicații și confidențialitate', url: 'https://www.adr.gov.ro/wp-content/uploads/2024/06/lege-506_2004.pdf' },
  accessibility: { title: 'Legea nr. 232/2022 · accesibilitate, în domeniul ei de aplicare', url: 'https://legislatie.just.ro/Public/FormaPrintabila/00000G0KNQ8P76GT0TQ0JXEJG1KWCZGC' },
  eid: { title: 'Regulamentul (UE) nr. 910/2014, art. 25 · efectele semnăturii electronice', url: 'https://eur-lex.europa.eu/eli/reg/2014/910/oj?locale=ro' },
  signatures: { title: 'Legea nr. 214/2024 · semnătura electronică și serviciile de încredere', url: 'https://legislatie.just.ro/Public/FormaPrintabila/00000G39DPGSXSU0BYZ0T3MOH95IY574' },
  digitalConsumer: { title: 'OUG nr. 141/2021 · conformitatea conținutului și serviciilor digitale', url: 'https://legislatie.just.ro/Public/FormaPrintabila/00000G2C6B82UM8PJ173NHZTP6BIFKMF' },
  latePayment: { title: 'Legea nr. 72/2013, art. 3–5 · scadență și întârziere în relații între profesioniști', url: 'https://legislatie.just.ro/Public/FormaPrintabila/00000G1FGKZDDTDAUP133KO9KMIODAIB' },
  rome: { title: 'Regulamentul (CE) nr. 593/2008 · Roma I', url: 'https://eur-lex.europa.eu/eli/reg/2008/593/oj?locale=ro' },
} as const;
export type LegalSource = keyof typeof LEGAL_SOURCES;
type FamilyNote = { checkpoint: string; clauses: string[]; references: LegalSource[] };
export const FAMILY_LEGAL_NOTES: Record<string, FamilyNote> = {
  brief: {
    checkpoint: 'Clarificăm cerințele înainte de estimare și ofertare.', references: ['gdpr', 'copyright'],
    clauses: ['Informațiile de brief se limitează la ceea ce este necesar proiectului, potrivit art. 5 alin. (1) lit. (c) GDPR. Nu sunt necesare copii ale actelor de identitate, parole sau baze de date reale pentru o primă evaluare. Exemplele vizuale și materialele se transmit cu proveniența și drepturile de utilizare cunoscute.', 'Pentru estimare, beneficiarul separă cerințele obligatorii de opțiunile care pot fi amânate. AVYRON confirmă ipotezele și dependențele înainte de a calcula termenul și bugetul; o cerință deschisă rămâne de validat.'],
  },
  audit: {
    checkpoint: 'Separăm constatările demonstrate de verificările neexecutate.', references: ['gdpr', 'accessibility'],
    clauses: ['Mandatul de audit identifică resursele deținute sau administrate legal, mediile și operațiunile autorizate. Testarea intruzivă, tranzacțiile reale și modificările datelor nu sunt acoperite de o simplă cerere de evaluare. Dovezile sunt minimizate; când includ date personale se aplică art. 5 și 32 GDPR.', 'Un audit WCAG indică versiunea, nivelul, eșantionul și testele manuale efectuate. Aplicabilitatea Legii nr. 232/2022, inclusiv excepțiile, se evaluează pentru serviciul concret; un scor automat nu reprezintă certificare juridică.', 'Pentru fiecare problemă importantă se notează riscul concret, persoana care poate interveni și proba necesară la retestare. O remediere propusă intră în lucru după confirmarea scopului și a costului de către beneficiar.'],
  },
  offer: {
    checkpoint: 'Se confirmă pachetul, costurile și versiunea acceptată.', references: ['company', 'commerce', 'civil', 'consumer', 'digitalConsumer', 'rome'],
    clauses: ['Informațiile de identificare și capitalul social se completează conform art. 74 din Legea nr. 31/1990. Prețurile, taxele, recurențele și costurile terților sunt prezentate distinct, în acord cu informarea prevăzută la art. 5 din Legea nr. 365/2002. Acceptarea identifică versiunea și opțiunea aleasă; nu se prezumă o comandă din simpla vizualizare a ofertei.', 'Dacă se schimbă pachetul, prețul sau condițiile esențiale după transmitere, AVYRON prezintă o versiune nouă. Beneficiarul poate verifica diferențele și confirmă numai varianta pe care a ales-o.'],
  },
  framework: {
    checkpoint: 'Semnatarii verifică natura relației, anexele și clauzele speciale.', references: ['company', 'civil', 'copyright', 'gdpr', 'consumer', 'digitalConsumer', 'latePayment', 'rome'],
    clauses: ['Cadrul urmează art. 1170, 1176 și 1270 Cod civil. Clauzele standard neuzuale din sfera art. 1203, inclusiv anumite limitări, reînnoiri sau derogări de competență, se evidențiază și se acceptă expres în scris când norma le cere; nu rezultă dintr-o bifă preselectată.', 'Pentru creațiile comandate, cesiunea sau licența se individualizează: drepturi, utilizări, teritoriu, durată, exclusivitate și remunerație. Se verifică art. 42–43 din Legea nr. 8/1996, republicată. Resursele preexistente și licențele terților sunt inventariate separat, fără a promite drepturi pe care AVYRON nu le deține.', 'Pentru o modificare se notează cererea, impactul asupra prețului și termenului, versiunea documentelor afectate și acordul ambelor părți. La încetare se reconciliază lucrările executate și plățile, apoi se stabilesc fișierele de predat, accesurile de retras și obligațiile care continuă potrivit acordului.'],
  },
  annex: {
    checkpoint: 'Fiecare serviciu are limite, probă de livrare și cost propriu.', references: ['civil', 'copyright', 'commerce', 'consumer', 'digitalConsumer', 'rome'],
    clauses: ['Anexa identifică versiunea contractului și configurația efectiv acceptată, conform cadrului contractual din Codul civil. Pentru website, software, branding sau produse digitale se enumeră separat fișierele sursă, licențele, materialele terților și utilizările acordate. O extensie de funcționalitate ori o schimbare de licență cere un acord explicit, nu rescrierea unei anexe deja acceptate.', 'Criteriile de acceptare precizează mediul, scenariul și rezultatul observabil. Dacă lipsește o dependență, părțile consemnează ce se poate testa și stabilesc când se verifică partea rămasă.'],
  },
  access: {
    checkpoint: 'Se acordă acces nominal, limitat la operațiunile aprobate.', references: ['gdpr', 'civil'],
    clauses: ['Mandatul privește administrarea tehnică, nu proprietatea asupra conturilor sau disponibilului financiar. Când accesul implică date personale, măsurile din art. 32 GDPR includ controlul privilegiilor, trasabilitatea și revocarea. Rolul de persoană împuternicită și acordul art. 28 se stabilesc separat, după operațiunile reale.', 'Titularul păstrează controlul asupra contului și al recuperării lui. Dacă apare un incident sau încetează mandatul, persoanele desemnate limitează accesul, conservă dovezile necesare și confirmă în scris revocarea sau transferul rolurilor.'],
  },
  privacy: {
    checkpoint: 'Se aleg rolurile reale; confidențialitatea nu activează automat DPA.', references: ['gdpr', 'civil'],
    clauses: ['O obligație de confidențialitate nu este, singură, un temei pentru orice utilizare a datelor personale. Scopul, temeiul și responsabilitățile se stabilesc potrivit art. 5–6 GDPR. Listele de clienți, conversațiile, identificatorii și materialele primite nu se reutilizează pentru alte conturi, promovare sau instruire AI fără o bază și o autorizare corespunzătoare.', 'Obligațiile sunt reciproce. Dacă apare o divulgare neautorizată, partea care o constată informează cealaltă parte prin canalul convenit, limitează răspândirea și documentează măsurile luate, cu respectarea termenelor legale aplicabile.'],
  },
  implementation: {
    checkpoint: 'O etapă se închide cu livrabil, probă și aprobare identificabile.', references: ['civil', 'gdpr'],
    clauses: ['Punctele de control pentru acces, date, publicare și încasări sunt incluse în calendar. Protecția datelor prin proiectare și securitatea, când sunt incidente, se urmăresc potrivit art. 25 și 32 GDPR. Activarea unui furnizor, a unei integrări ori a unui cost extern se confirmă distinct de dezvoltarea locală; responsabilul și dovada se consemnează în plan.', 'Înainte de lansare se confirmă persoana care autorizează schimbarea, criteriile care opresc lansarea și condițiile de revenire la versiunea stabilă. După lansare se verifică traseele convenite și se înregistrează eventualele remedieri.'],
  },
  report: {
    checkpoint: 'Raportăm rezultate observate, surse și limite de măsurare.', references: ['gdpr', 'copyright'],
    clauses: ['Rapoartele de SEO, Ads, social media, AI, QA și mentenanță identifică intervalul, contul, sursa și metoda indicatorilor. Bugetul media, costul instrumentelor și onorariul se citesc separat. Capturile și exemplele sunt minimizate sau anonimizate, în acord cu art. 5 GDPR; raportul nu transformă accesul tehnic într-un drept de publicare a datelor clientului.', 'Comparațiile folosesc aceeași definiție a indicatorului și precizează diferențele de perioadă, buget sau atribuire. Pentru fiecare concluzie care cere o decizie se indică pasul următor și responsabilul propus.'],
  },
  handover: {
    checkpoint: 'Inventarul și observațiile se confirmă pe versiunea predată.', references: ['civil', 'copyright', 'gdpr'],
    clauses: ['Recepția se raportează la criteriile convenite și nu șterge drepturile ori remediile legale imperative. Licențele și eventualele cesiuni rămân cele documentate în scris; predarea unui fișier sau a unui cont nu extinde singură drepturile. Accesurile nominale se verifică, iar autorizările temporare ale echipei se retrag sau se păstrează numai potrivit mandatului de suport.', 'O rezervă identifică livrabilul afectat, verificarea nereușită și termenul de reverificare convenit. Dacă se predă un domeniu sau un mediu de producție, se confirmă titularul, controlul de recuperare și condițiile de revenire înaintea schimbării accesurilor.'],
  },
  sla: {
    checkpoint: 'Se confirmă acoperirea, facturarea și limitele reînnoirii.', references: ['civil', 'gdpr', 'consumer', 'digitalConsumer', 'latePayment', 'rome'],
    clauses: ['Procedura de incident distinge disponibilitatea, recuperarea și notificările privind datele personale. Pentru o relație de împuternicire se respectă art. 33 alin. (2) GDPR; nu se promite un termen universal care înlocuiește analiza incidentului. Restaurarea este verificată prin probe, inclusiv fișiere și baze de date.', 'Reînnoirea, suspendarea și debitarea automată sunt explicite. Acceptarea condițiilor comerciale și autorizarea cardului sunt operațiuni distincte; o factură, un card salvat ori tăcerea clientului nu sunt prezentate drept mandat de debitare. Clauzele neuzuale se verifică potrivit art. 1203 Cod civil.', 'Pentru fiecare incident se precizează severitatea, canalul, momentul înregistrării și țintele distincte de răspuns și remediere. Lucrările din afara abonamentului se estimează separat, iar costurile se confirmă înainte de executare.'],
  },
};

export const SERVICE_LEGAL_NOTES: Record<string, string[]> = {
  website: ['Website: livrarea tehnică se distinge de textele juridice ale beneficiarului. Formularul, analytics și cookie-urile se configurează după scop și consimțământ; se verifică Legea nr. 365/2002 și art. 4 alin. (5) din Legea nr. 506/2004. Domeniul, găzduirea și mentenanța au titular, durată și cost distincte.'],
  commerce: ['Magazin online: beneficiarul confirmă identitatea comerciantului, prețurile, taxele, livrarea, retururile și informațiile precontractuale. Pentru vânzări către consumatori se verifică OUG nr. 34/2014; implementarea checkoutului nu aprobă automat termenii comerciali sau emiterea facturilor.'],
  seo: ['SEO: indicatorii se raportează la proprietățile autorizate și sursele de măsurare disponibile. Nu se garantează indexarea, poziții sau trafic. Pentru analytics/cookie-uri se verifică GDPR și Legea nr. 506/2004; un instrument instalat nu este tratat ca acord pentru orice colectare.'],
  ads: ['Ads: bugetul media și onorariul sunt distincte. Audiențele, pixelii, remarketingul, creațiile și mesajele comerciale se aprobă înainte de lansare; GDPR și Legea nr. 506/2004 se analizează după operațiunile efective. Beneficiarul confirmă afirmațiile despre produs și drepturile materialelor.'],
  social: ['Social media: conturile și mandatul de publicare sunt individualizate; aprobarea unei creații nu autorizează toate canalele. Drepturile pentru imagini, muzică, mărci și persoane se verifică separat, conform Legii nr. 8/1996 și normelor de protecție a datelor. Mesajele directe nu constituie automat liste autorizate de marketing.'],
  ai: ['AI: sunt descrise scenariile, sursele permise, furnizorii și aprobările umane. Datele confidențiale nu intră implicit în modele externe; se stabilesc rolurile GDPR, retenția, transferurile și limitele instrumentelor. Rolul și obligațiile aplicabile potrivit Regulamentului (UE) 2024/1689 se verifică pentru utilizarea concretă, fără o clasificare automată ca sistem cu risc ridicat.'],
  brand: ['Branding și logo: conceptele, reviziile, formatele vectoriale/3D și sursele se enumeră separat. Cesiunea sau licența urmează drepturile expres acordate, în condițiile Legii nr. 8/1996, art. 42–43. Verificarea disponibilității și înregistrarea mărcii sunt servicii distincte; o simulare vizuală nu garantează protecția ca marcă.'],
  qa: ['QA și securitate: mandatul stabilește mediul, dispozitivele, datele de test și operațiunile permise. Scanările intruzive și plățile reale necesită autorizare distinctă. Dovezile păstrează versiunea și reproducerea, fără parole sau date personale inutile.'],
  accessibility: ['Accesibilitate: se consemnează standardul, nivelul, eșantionul și probele manuale. Legea nr. 232/2022 se aplică în domeniul și cu excepțiile sale; nu toate site-urile au automat același regim. WCAG este un reper tehnic, iar scorul unui instrument nu substituie evaluarea cerințelor legale aplicabile.'],
  maintenance: ['Hosting și mentenanță: sunt inventariate resursele, administratorii, ferestrele de intervenție și ce se poate restaura. Obligațiile art. 32 GDPR se analizează când sunt prelucrate date personale; existența unui backup al bazei nu confirmă și copia fișierelor. RPO/RTO se înscriu numai după verificarea posibilităților reale.'],
  software: ['Software și integrări: sunt individualizate codul livrat, depozitele, API-urile, licențele și costurile furnizorilor. Legea nr. 8/1996, inclusiv protecția programelor pentru calculator, nu este înlocuită de simpla predare a accesului. Conturile, aprobările și datele de test se separă de producție.'],
  digital: ['Produse și licențe: SKU-ul, versiunea, utilizatorii, durata și utilizările permise sunt cele aprobate pentru achiziție. Accesul la produs nu transferă automat codul, drepturi de revânzare sau exclusivitate. Condițiile furnizorului și normele imperative privind consumatorii, când sunt aplicabile, rămân respectate.'],
  general: ['Pentru această activitate se confirmă legea aplicabilă, drepturile, datele și obligațiile specifice înainte de aprobarea documentului; profilul tehnic nu acordă singur permisiuni sau drepturi juridice.'],
};
