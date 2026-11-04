import {
  blankPayload,
  heading,
  paragraph,
  type DocumentPayload,
} from "./model";

export type TemplateDefinition = {
  id: string;
  name: string;
  legal: boolean;
  required: string[];
  payload: DocumentPayload;
};
const base = ["date", "provider.legal_name", "beneficiary.legal_name", "scope"];
const legalBase = [
  ...base,
  "provider.tax_id",
  "provider.address",
  "beneficiary.entity_type",
  "beneficiary.identification",
  "beneficiary.address",
  "signatories",
];
const template = (
  id: string,
  name: string,
  legal: boolean,
  required: string[],
  sections: [string, string[]][],
): TemplateDefinition => ({
  id,
  name,
  legal,
  required,
  payload: {
    ...blankPayload(name),
    header: "AVYRON · {{provider.legal_name}} · {{date}}",
    footer:
      "Document privat · {{beneficiary.legal_name}} · versiunea și numărul sunt înscrise la export",
    body: {
      type: "doc",
      content: [
        paragraph(
          "Prestator / emitent: {{provider.legal_name}}. Beneficiar / destinatar: {{beneficiary.legal_name}}. Data: {{date}}. Obiect: {{scope}}.",
        ),
        ...(legal
          ? [
              paragraph(
                "Identificarea juridică a beneficiarului: {{beneficiary.identification}}. Sunt utilizate numai datele necesare relației documentate.",
              ),
            ]
          : []),
        ...sections.flatMap(([title, paragraphs]) => [
          heading(title),
          ...paragraphs.map(paragraph),
        ]),
      ],
    },
  },
});

export const DOCUMENT_TEMPLATES: TemplateDefinition[] = [
  template(
    "brief",
    "Brief universal",
    false,
    [...base, "objectives", "deliverables"],
    [
      [
        "1. Contextul solicitării",
        [
          "Acest brief consemnează informațiile furnizate de beneficiar pentru definirea proiectului. El reprezintă baza analizei și a ofertei ulterioare; prețul, calendarul și obligațiile de livrare se confirmă în documentele comerciale aprobate.",
          "Activitatea și publicul vizat: {{business_context}}. Obiectivele urmărite și rezultatele considerate utile: {{objectives}}. Serviciile și produsele analizate: {{scope}}.",
        ],
      ],
      [
        "2. Cerințe și priorități",
        [
          "Funcționalitățile, paginile, platformele sau procesele vizate sunt: {{requirements}}. Cerințele obligatorii se disting de opțiunile care pot fi implementate ulterior. Livrabilele așteptate: {{deliverables}}.",
          "Pentru serviciile selectate, detaliile tehnice și limitele propuse sunt consemnate în secțiunile de serviciu. Integrările cu terți depind de disponibilitatea API-urilor, de conturile autorizate și de condițiile furnizorilor.",
        ],
      ],
      [
        "3. Materiale, acces și responsabilități",
        [
          "Beneficiarul indică materialele disponibile, proveniența și drepturile de utilizare: {{materials}}. Preferințe vizuale, ton și exemple relevante: {{preferences}}. Accesurile necesare se acordă individual prin mecanisme securizate; parolele și tokenurile nu se înscriu în brief.",
          "Persoanele responsabile de conținut și aprobări: {{contacts}}. Dependențele și restricțiile cunoscute: {{dependencies}}.",
        ],
      ],
      [
        "4. Buget și organizare",
        [
          "Bugetul orientativ și eventualele costuri externe acceptabile: {{budget}}. Data dorită și constrângerile de calendar: {{schedule}}. Aceste valori sunt informații de planificare până la confirmarea ofertei.",
          "Informațiile lipsă și întrebările deschise: {{open_questions}}. Beneficiarul verifică exactitatea datelor, iar echipa AVYRON formulează recomandarea de ofertare fără a considera completarea brief-ului drept acceptare contractuală.",
        ],
      ],
    ],
  ),
  template(
    "audit",
    "Audit și evaluare",
    false,
    [...base, "methodology", "findings", "evidence", "recommendations"],
    [
      [
        "1. Obiect și limite",
        [
          "Evaluarea privește {{scope}}, în starea observată la {{date}}. Obiectivele evaluării sunt {{objectives}}. Suprafețele, conturile, mediile și intervalul analizat: {{audit_targets}}.",
          "Sunt incluse numai verificările autorizate și descrise aici. Evaluarea nu constituie o garanție că toate defectele sau vulnerabilitățile au fost identificate. Zonele inaccesibile și limitările de acces sunt consemnate explicit: {{limitations}}.",
        ],
      ],
      [
        "2. Metodologie",
        [
          "Metodele și instrumentele utilizate: {{methodology}}. Pentru fiecare constatare se păstrează sursa, momentul observației, mediul, pașii de reproducere și impactul demonstrat. Standardele ori criteriile aplicate sunt identificate prin versiune, când este relevant.",
          "Datele reale sunt folosite numai în limitele autorizării. Testele care pot afecta disponibilitatea, plățile sau datele necesită mandat distinct. Dovezile sunt minimizate și nu includ secrete.",
        ],
      ],
      [
        "3. Constatări și severitate",
        [
          "Situația observată: {{findings}}. Dovezile verificabile și referințele securizate: {{evidence}}. Severitatea și justificarea impactului: {{severity}}.",
          "Fiecare rezultat este clasificat ca fapt confirmat, suspiciune de investigat sau verificare neexecutată. Un indicator de performanță, un scor automat ori o verificare punctuală nu înlocuiește evaluarea funcțională și contextuală.",
        ],
      ],
      [
        "4. Recomandări și urmărire",
        [
          "Măsurile propuse, în ordinea priorităților: {{recommendations}}. Responsabilii și dependențele: {{dependencies}}. Criteriile de reverificare: {{acceptance}}.",
          "Raportul descrie starea la data auditului. Confirmarea remedierii presupune repetarea verificării relevante și înregistrarea rezultatului, mediului și versiunii evaluate. Costurile și termenele de implementare se aprobă separat.",
        ],
      ],
    ],
  ),
  template(
    "offer",
    "Ofertă comercială și deviz",
    false,
    [
      ...legalBase,
      "objectives",
      "deliverables",
      "schedule",
      "payment_terms",
      "valid_until",
      "exclusions",
    ],
    [
      [
        "1. Context și propunere",
        [
          "AVYRON propune beneficiarului {{beneficiary.legal_name}} soluția descrisă în această ofertă pentru {{scope}}. Obiectivele urmărite: {{objectives}}. Varianta comercială și relația avută în vedere: {{offer_variant}}.",
          "Soluția propusă și beneficiile urmărite: {{solution}}. Beneficiile reprezintă obiective de lucru; rezultatele dependente de piață, algoritmi, furnizori ori deciziile beneficiarului nu sunt garantate.",
        ],
      ],
      [
        "2. Servicii, produse și livrabile",
        [
          "Serviciile și produsele ofertate sunt individualizate în deviz prin identificator, SKU unde există, cantitate, monedă și recurență. Livrabilele și limitele fiecărui element: {{deliverables}}.",
          "Opțiuni incluse: {{inclusions}}. Opțiuni excluse și servicii ale terților: {{exclusions}}. Costurile media pentru Ads, licențele externe și taxele furnizorilor sunt separate de onorariul AVYRON și se includ numai dacă sunt înscrise expres.",
        ],
      ],
      [
        "3. Calendar și dependențe",
        [
          "Calendarul estimativ și etapele propuse: {{schedule}}. Acesta depinde de materialele, accesurile și aprobările indicate: {{dependencies}}. Orice modificare de scop se evaluează și se confirmă înainte de executare.",
        ],
      ],
      [
        "4. Prețuri și condiții comerciale",
        [
          "Devizul păstrează prețul de catalog și prețul ofertat. Reducerile sau majorările se aplică exclusiv prezentei oferte și sunt motivate individual. Regimul fiscal aplicabil: {{tax_regime}}. Valorile recurente se disting de cele unice și de bugetele externe.",
          "Condițiile de plată, scadențele și eventualul avans: {{payment_terms}}. Durata serviciilor recurente: {{duration}}. Oferta este valabilă până la {{valid_until}}. Nicio taxă ori durată necompletată nu se consideră acceptată implicit.",
        ],
      ],
      [
        "5. Acceptare și pașii următori",
        [
          "Acceptarea se exprimă de reprezentanții autorizați pentru versiunea și pachetul selectate, prin {{acceptance_method}}. Condițiile de acceptare și eventualele documente ulterioare: {{acceptance}}.",
          "Date de contact AVYRON: {{provider.contact_email}}. Reprezentanți și semnături, dacă sunt necesare: {{signatories}}. Prezenta ofertă nu autorizează debitarea automată a conturilor și nu înlocuiește condițiile contractuale care trebuie convenite separat.",
        ],
      ],
    ],
  ),
  template(
    "framework",
    "Contract-cadru",
    true,
    [
      ...legalBase,
      "deliverables",
      "schedule",
      "payment_terms",
      "ip_terms",
      "liability_terms",
      "termination_terms",
      "governing_terms",
      "relationship_type",
    ],
    [
      [
        "Art. 1. Părțile și natura relației",
        [
          "{{provider.legal_name}}, identificată prin {{provider.tax_id}}, cu sediul în {{provider.address}}, și {{beneficiary.legal_name}}, forma {{beneficiary.entity_type}}, cu sediul/adresa în {{beneficiary.address}}, convin prezentul contract prin reprezentanții {{signatories}}.",
          "Relația juridică avută în vedere este {{relationship_type}}. Pentru parteneriate, colaborare independentă, subcontractare ori alte raporturi, dispozițiile specifice se verifică și se adaptează înainte de aprobare; titulatura documentului nu stabilește singură natura juridică.",
        ],
      ],
      [
        "Art. 2. Obiectul și documentele aplicabile",
        [
          "Obiectul convenit este {{scope}}. Livrabilele, limitele, etapele și criteriile măsurabile sunt stabilite în anexele acceptate: {{deliverables}}. În caz de neconcordanță, ordinea de prioritate convenită este {{document_priority}}.",
          "Orice extindere de scop, tarif sau calendar se confirmă de persoanele autorizate înainte de executare. Solicitările și discuțiile tehnice nu modifică singure contractul.",
        ],
      ],
      [
        "Art. 3. Executarea și obligațiile părților",
        [
          "AVYRON execută activitățile convenite cu diligență profesională, documentează livrarea și comunică impedimentele cunoscute. Beneficiarul furnizează informații corecte, materiale utilizabile legal, accesuri limitate și aprobări prin responsabilii desemnați.",
          "Calendarul și dependențele sunt {{schedule}} și {{dependencies}}. Întârzierile determinate de neîndeplinirea unei dependențe se analizează și se reflectă într-un calendar actualizat confirmat de părți.",
        ],
      ],
      [
        "Art. 4. Preț, facturare și plată",
        [
          "Prețurile și moneda rezultă din anexele și devizele acceptate. Condițiile de plată sunt {{payment_terms}}, iar regimul fiscal confirmat este {{tax_regime}}. Costurile terților și bugetele media se suportă numai potrivit acordului expres.",
          "Recurențele, ajustările și condițiile de suspendare pentru neplată sunt {{recurring_terms}}. Nicio penalitate, reînnoire ori autorizare de debitare nu rezultă dintr-un câmp necompletat.",
        ],
      ],
      [
        "Art. 5. Livrare și acceptanță",
        [
          "Livrarea se notifică prin canalul convenit și este însoțită de informațiile necesare verificării. Procedura, criteriile și termenul de verificare sunt {{acceptance}}. Observațiile trebuie să indice neconformitățile raportate la scopul acceptat.",
          "Remedierea defectelor din scop se distinge de funcționalitățile noi. Acceptarea tacită, dacă este dorită, necesită o clauză expresă verificată juridic; simpla transmitere a fișierelor nu o instituie.",
        ],
      ],
      [
        "Art. 6. Proprietate intelectuală și servicii externe",
        [
          "Drepturile transferate sau licențiate, momentul producerii efectelor și excluderile sunt {{ip_terms}}. Componentele preexistente, instrumentele AVYRON și operele terților păstrează regimul de licență aplicabil.",
          "Accesul la un produs, abonament sau fișier nu transferă implicit codul-sursă ori drepturi exclusive. Beneficiarul răspunde pentru drepturile materialelor furnizate. Condițiile platformelor externe se aplică separat și nu pot fi garantate de AVYRON.",
        ],
      ],
      [
        "Art. 7. Confidențialitate și date",
        [
          "Părțile limitează accesul la informațiile confidențiale la persoanele care au nevoie de ele pentru executare și aplică măsuri adecvate de protecție. Excepțiile, durata și obligațiile speciale sunt {{confidentiality_terms}}.",
          "Rolurile privind datele personale se stabilesc potrivit operațiunilor efective. Dacă este necesară prelucrarea în numele beneficiarului, părțile aprobă un acord distinct cu instrucțiunile și anexele relevante; acesta nu se presupune încheiat automat.",
        ],
      ],
      [
        "Art. 8. Răspundere, încetare și litigii",
        [
          "Regimul răspunderii și limitele negociate sunt {{liability_terms}}, cu respectarea dispozițiilor imperative aplicabile. Evenimentele neimputabile și procedura de notificare sunt {{force_majeure_terms}}.",
          "Durata, denunțarea, rezilierea, efectele încetării și predarea sunt {{termination_terms}}. Soluționarea disputelor și legea aplicabilă sunt {{governing_terms}}. Modificările se consemnează în scris de reprezentanții autorizați.",
        ],
      ],
    ],
  ),
  template(
    "annex",
    "Anexă de servicii",
    true,
    [
      ...legalBase,
      "contract_reference",
      "deliverables",
      "acceptance",
      "schedule",
      "payment_terms",
    ],
    [
      [
        "Art. 1. Legătura cu acordul principal",
        [
          "Prezenta anexă aparține acordului {{contract_reference}} și descrie {{scope}} pentru {{beneficiary.legal_name}}. Documentul identifică proiectele și instanțele de servicii cărora li se aplică; nu extinde acordul asupra altor beneficiari.",
          "Dacă sunt incluse mai multe servicii, limitele, livrabilele și costurile se individualizează pentru fiecare. Ordinea de prioritate între documente rămâne cea convenită în acordul principal.",
        ],
      ],
      [
        "Art. 2. Livrabile și limite",
        [
          "Livrabilele contractate și formatele de predare sunt {{deliverables}}. Funcționalitățile, cantitățile, paginile, platformele, integrările și intervențiile incluse sunt {{requirements}}. Excluderile explicite sunt {{exclusions}}.",
          "Lucrările suplimentare și reviziile care depășesc aceste limite necesită confirmarea impactului asupra costurilor și calendarului. Bugetele media, licențele, domeniile și taxele terților nu se confundă cu onorariul de implementare.",
        ],
      ],
      [
        "Art. 3. Organizare și dependențe",
        [
          "Calendarul și punctele de aprobare sunt {{schedule}}. Materialele, accesurile și deciziile datorate de fiecare parte sunt {{dependencies}}. Responsabilii operaționali și canalele de comunicare: {{contacts}}.",
          "Dependențele externe și condițiile tehnice de funcționare sunt {{technical_conditions}}. O integrare indisponibilă nu este prezentată ca activă; alternativele se aprobă înainte de utilizare.",
        ],
      ],
      [
        "Art. 4. Costuri și acceptanță",
        [
          "Prețurile, moneda, regimul fiscal și recurențele sunt cele individualizate în devizul anexei și în {{payment_terms}}. Criteriile de acceptare, probele necesare și procedura de remediere sunt {{acceptance}}.",
          "Drepturile asupra livrabilelor urmează {{ip_terms}}, în limitele acordului principal și ale licențelor terților. Anexa produce efecte numai pentru versiunea aprobată de reprezentanții {{signatories}}.",
        ],
      ],
    ],
  ),
  template(
    "access",
    "Acord de acces și administrare",
    true,
    [...legalBase, "platforms", "access_scope", "duration", "revocation"],
    [
      [
        "Art. 1. Mandatul acordat",
        [
          "Beneficiarul autorizează persoanele desemnate de {{provider.legal_name}} să efectueze operațiunile {{access_scope}} asupra platformelor {{platforms}}, exclusiv pentru {{scope}}. Identificatorii conturilor și proprietarii lor sunt {{account_references}}.",
          "Autorizarea este limitată la resursele, acțiunile și durata înscrise. Ea nu conferă dreptul de a transfera proprietatea, a modifica beneficiarii plăților, a accepta costuri sau a șterge definitiv date fără o aprobare distinctă.",
        ],
      ],
      [
        "Art. 2. Acordarea și protejarea accesului",
        [
          "Accesul se acordă prin utilizatori nominali, roluri delegate ori mecanisme OAuth/API cu privilegii minime. Parolele, codurile MFA, cheile private și tokenurile nu se înscriu în document și nu se trimit în canale nesecurizate.",
          "Responsabilii beneficiarului și ai prestatorului sunt {{contacts}}. Se păstrează evidența acțiunilor relevante și se evită conturile comune atunci când platforma permite conturi individuale.",
        ],
      ],
      [
        "Art. 3. Operațiuni și responsabilități",
        [
          "Publicarea, reclamele, modificările DNS, plățile și schimbările cu impact semnificativ necesită aprobările {{approval_rules}}. Prestatorul comunică erorile și incidentele cunoscute și nu prezintă o configurare drept operațiune finalizată fără dovadă.",
          "Beneficiarul menține dreptul asupra conturilor și verifică legalitatea materialelor și instrucțiunilor furnizate. Limitările furnizorilor, ferestrele de mesagerie și condițiile platformelor rămân aplicabile.",
        ],
      ],
      [
        "Art. 4. Durată și revocare",
        [
          "Mandatul este valabil pentru {{duration}}. Revocarea și procedura de predare sunt {{revocation}}. La încetare se retrag rolurile și tokenurile relevante, se predau informațiile necesare prin canale securizate și se consemnează rezultatul.",
          "Obligațiile de confidențialitate și conservare a evidențelor se aplică potrivit acordurilor relevante. Orice extindere de acces sau delegare ulterioară cere autorizare expresă.",
        ],
      ],
    ],
  ),
  template(
    "privacy",
    "Confidențialitate și protecția datelor",
    true,
    [...legalBase, "confidentiality_terms", "duration", "privacy_mode"],
    [
      [
        "Art. 1. Scop și alegerea regimului",
        [
          "Părțile protejează informațiile schimbate pentru {{scope}}. Regimul selectat este {{privacy_mode}}. Secțiunea privind prelucrarea în numele unui operator se include numai dacă analiza operațiunilor reale o impune și dacă anexele obligatorii sunt completate.",
          "Sunt confidențiale informațiile identificate ca atare ori care, prin natura și contextul lor, trebuie protejate: {{confidentiality_terms}}. Nu sunt acoperite informațiile devenite publice legal, cunoscute anterior în mod legitim sau obținute independent fără încălcarea unei obligații.",
        ],
      ],
      [
        "Art. 2. Utilizare și divulgare",
        [
          "Informațiile sunt utilizate numai pentru scopul convenit și comunicate persoanelor autorizate care au nevoie de ele și au obligații corespunzătoare de confidențialitate. Măsurile de protecție și canalele permise sunt {{security_measures}}.",
          "Divulgarea impusă legal se limitează la ceea ce este necesar și este notificată celeilalte părți când legea permite. Durata obligației și procedura de returnare sau ștergere sunt {{duration}} și {{return_deletion}}.",
        ],
      ],
      [
        "Art. 3. Roluri și instrucțiuni privind datele",
        [
          "Rolurile părților și temeiul relației se stabilesc în {{data_roles}}. Pentru o relație operator–persoană împuternicită, obiectul, durata, natura și scopul prelucrării, tipurile de date și categoriile de persoane vizate se descriu în anexa {{processing_annex}}.",
          "Persoana împuternicită prelucrează datele numai pe baza instrucțiunilor documentate, asigură confidențialitatea persoanelor autorizate și aplică măsurile tehnice și organizatorice convenite. Instrucțiunile considerate contrare normelor aplicabile sunt semnalate operatorului.",
        ],
      ],
      [
        "Art. 4. Cerințe condiționale pentru acordul de prelucrare",
        [
          "Dacă se activează regimul DPA, subîmputerniciții și condițiile autorizării lor, transferurile internaționale și garanțiile aplicabile sunt {{subprocessors_transfers}}. Asistența pentru cereri ale persoanelor vizate, incidente, evaluări și verificări se organizează potrivit {{dpa_assistance}}.",
          "La încetare, datele sunt returnate sau șterse conform opțiunii documentate și obligațiilor legale de păstrare. Dovezile de conformitate și condițiile auditului sunt {{audit_conditions}}. Această secțiune nu poate fi aprobată fără anexele și verificarea de specialitate necesare.",
        ],
      ],
    ],
  ),
  template(
    "implementation",
    "Plan de implementare",
    false,
    [...base, "deliverables", "schedule", "dependencies", "acceptance"],
    [
      [
        "1. Obiectiv și perimetru",
        [
          "Planul organizează realizarea {{scope}} și urmărește {{objectives}}. Livrabilele asumate în documentele comerciale sunt {{deliverables}}. Planul nu introduce singur servicii ori costuri suplimentare.",
          "Versiunea de referință a cerințelor și documentelor aprobate: {{contract_reference}}. Elementele excluse: {{exclusions}}.",
        ],
      ],
      [
        "2. Etape și responsabilități",
        [
          "Etapele, rezultatul fiecăreia, responsabilii și termenele sunt {{schedule}}. Fiecare etapă are un rezultat verificabil și o condiție explicită de intrare și ieșire. Activitățile paralele sunt permise numai când dependențele o permit.",
          "Responsabilii pentru accesuri, conținut, implementare, testare și aprobare sunt {{contacts}}. Beneficiarul indică persoana care poate decide asupra modificărilor de scop.",
        ],
      ],
      [
        "3. Dependențe și gestionarea schimbărilor",
        [
          "Dependențele tehnice și comerciale sunt {{dependencies}}. Riscurile cunoscute și măsurile de reducere sunt {{risks}}. Lipsa unei autorizări sau indisponibilitatea unui furnizor este evidențiată ca blocaj, fără simularea finalizării.",
          "Schimbările se înregistrează cu motiv, impact, responsabil și aprobarea necesară. Calendarul se actualizează pentru versiunea nouă fără a rescrie istoricul deciziilor anterioare.",
        ],
      ],
      [
        "4. Verificare și finalizare",
        [
          "Criteriile de finalizare și dovezile cerute sunt {{acceptance}}. Se verifică separat mediul local, preview și producția, precum și funcțiile dependente de furnizori externi.",
          "Predarea include documentația convenită, evidența limitărilor rămase și pașii de suport. Publicarea în producție, comunicarea externă și operațiunile financiare urmează propriile aprobări.",
        ],
      ],
    ],
  ),
  template(
    "report",
    "Raport universal",
    false,
    [
      ...base,
      "period",
      "activities",
      "evidence",
      "findings",
      "recommendations",
    ],
    [
      [
        "1. Perioadă și obiect",
        [
          "Raportul acoperă {{period}} pentru {{scope}} și se raportează la obiectivele {{objectives}}. Tipul de raport și sursele utilizate: {{report_type}} și {{data_sources}}.",
          "Sunt separate activitățile executate, rezultatele observate și acțiunile propuse. Configurarea unui serviciu sau pregătirea unei operațiuni nu este prezentată drept livrare finală.",
        ],
      ],
      [
        "2. Activități și livrabile",
        [
          "Activitățile efectuate și starea fiecăreia: {{activities}}. Livrabilele și versiunile la care se referă raportul: {{deliverables}}. Responsabilii și intervențiile beneficiarului: {{contacts}}.",
          "Pentru campanii, costul media se distinge de onorariu; pentru mentenanță, monitorizarea se distinge de intervenția efectivă; pentru agenți AI, propunerile se disting de acțiunile aprobate și executate.",
        ],
      ],
      [
        "3. Rezultate și dovezi",
        [
          "Indicatorii, metodologia de calcul și comparațiile relevante sunt {{metrics}}. Dovezile verificabile, mediul și momentul observației: {{evidence}}. Constatările și incidentele: {{findings}}.",
          "Datele indisponibile nu sunt înlocuite cu estimări prezentate ca fapte. Scorurile automate, atribuirea conversiilor și măsurătorile punctuale se interpretează în limitele surselor și perioadei analizate.",
        ],
      ],
      [
        "4. Recomandări și următorii pași",
        [
          "Prioritățile recomandate și justificarea lor sunt {{recommendations}}. Dependențele și aprobările necesare: {{dependencies}}. Activitățile rămase și calendarul propus: {{schedule}}.",
          "Raportul este verificat înainte de publicare. Rezultatele sunt valabile în contextul descris și nu constituie o promisiune privind poziționări, vânzări, disponibilitate ori absența totală a incidentelor viitoare.",
        ],
      ],
    ],
  ),
  template(
    "handover",
    "Proces-verbal de recepție și predare",
    true,
    [
      ...legalBase,
      "contract_reference",
      "deliverables",
      "evidence",
      "acceptance",
      "observations",
    ],
    [
      [
        "Art. 1. Obiectul predării",
        [
          "Părțile consemnează predarea {{scope}}, aferentă acordului {{contract_reference}}, pentru proiectele și serviciile asociate explicit documentului. Livrabilele, versiunile, mediile și formatele predate: {{deliverables}}.",
          "Data predării și participanții sunt {{date}} și {{signatories}}. Documentul se referă exclusiv la elementele inventariate, fără a presupune acceptarea altor lucrări.",
        ],
      ],
      [
        "Art. 2. Verificări și rezultat",
        [
          "Verificările efectuate, criteriile aplicate și dovezile sunt {{evidence}}. Rezultatul recepției este {{acceptance}}. Se disting elementele acceptate, cele acceptate cu observații și cele pentru care recepția se amână.",
          "Observațiile și neconformitățile identificate: {{observations}}. Măsurile de remediere, responsabilii și termenele confirmate: {{remediation}}. Funcționalitățile suplimentare solicitate ulterior se tratează separat.",
        ],
      ],
      [
        "Art. 3. Accesuri și documentație",
        [
          "Conturile, rolurile, domeniile, depozitele și documentația predate sunt inventariate prin referințe în {{access_inventory}}. Accesurile sunt transferate prin {{secure_channel}}, fără parole, tokenuri, coduri MFA sau chei private înscrise în acest proces-verbal.",
          "Drepturile de proprietate intelectuală și licențele rămân cele din documentele aprobate: {{ip_terms}}. Predarea accesului tehnic nu conferă automat drepturi suplimentare asupra produselor ori componentelor terților.",
        ],
      ],
      [
        "Art. 4. Efecte și suport ulterior",
        [
          "Efectele recepției asupra plăților și începutului mentenanței sunt {{handover_effects}}. Serviciile de suport ulterioare se acordă potrivit {{support_reference}} și nu se presupun nelimitate.",
          "Fiecare parte verifică exactitatea inventarului și păstrează versiunea aprobată. Corecturile ulterioare se consemnează într-un document nou, fără suprascrierea prezentului proces-verbal.",
        ],
      ],
    ],
  ),
  template(
    "sla",
    "Acord mentenanță / SLA",
    true,
    [
      ...legalBase,
      "coverage",
      "support_levels",
      "backup_policy",
      "restore_policy",
      "duration",
      "payment_terms",
      "renewal_terms",
    ],
    [
      [
        "Art. 1. Serviciile acoperite",
        [
          "Acordul privește {{scope}} și resursele inventariate în {{coverage}}. Sunt incluse intervențiile, actualizările și monitorizarea descrise expres. Funcțiile noi, refacerile majore și resursele terților sunt excluse dacă nu sunt înscrise separat.",
          "Limitele de volum, timp ori număr de intervenții sunt {{service_limits}}. Nu există un nivel de disponibilitate sau suport permanent implicit.",
        ],
      ],
      [
        "Art. 2. Solicitări și niveluri de suport",
        [
          "Canalele, programul de suport, clasificarea incidentelor și țintele de răspuns/remediere sunt {{support_levels}}. Timpul de răspuns se distinge de timpul de soluționare. Persoanele autorizate să solicite intervenții: {{contacts}}.",
          "Țintele se calculează conform metodei {{measurement_method}}, ținând cont de dependențe și de perioadele excluse convenite. Indisponibilitatea furnizorilor se raportează distinct.",
        ],
      ],
      [
        "Art. 3. Actualizări și schimbări",
        [
          "Actualizările se evaluează în raport cu compatibilitatea, securitatea și impactul. Ferestrele de mentenanță și aprobările sunt {{maintenance_windows}}. Schimbările cu risc semnificativ presupun o procedură de revenire documentată.",
          "Beneficiarul menține accesurile necesare și comunică modificările făcute de terți. O intervenție care depășește scopul se estimează și se aprobă separat înainte de executare.",
        ],
      ],
      [
        "Art. 4. Backup și restaurare",
        [
          "Ce se salvează, frecvența, destinația privată, retenția și excluderile sunt {{backup_policy}}. Protecția bazei de date se distinge de copia fișierelor și de configurațiile furnizorilor.",
          "Procedura de restaurare, responsabilitățile, țintele confirmate și verificările periodice sunt {{restore_policy}}. Un backup nu este considerat verificat numai pentru că operațiunea de creare a răspuns fără eroare. Costurile și limitele de stocare sunt {{storage_terms}}.",
        ],
      ],
      [
        "Art. 5. Durată, tarife și încetare",
        [
          "Durata este {{duration}}, tarifele și condițiile de plată sunt {{payment_terms}}, iar regimul fiscal este {{tax_regime}}. Reînnoirea și notificările sunt {{renewal_terms}}.",
          "Suspendarea, încetarea, exportul datelor și predarea accesurilor sunt {{termination_terms}}. Răspunderea și eventualele compensații de serviciu sunt {{liability_terms}}, în limitele normelor aplicabile și ale acordului principal.",
        ],
      ],
    ],
  ),
];

export const FIELD_LABELS: Record<string, string> = {
  date: "Data documentului",
  "provider.legal_name": "Denumirea juridică AVYRON",
  "provider.tax_id": "CUI AVYRON",
  "provider.address": "Sediu AVYRON",
  "provider.contact_email": "E-mail AVYRON",
  "beneficiary.legal_name": "Beneficiar",
  "beneficiary.entity_type": "Forma juridică",
  "beneficiary.address": "Adresa beneficiarului",
  scope: "Obiectul documentului",
  objectives: "Obiective",
  deliverables: "Livrabile",
  schedule: "Calendar și termene",
  payment_terms: "Condiții de plată",
  tax_regime: "Regim fiscal",
  valid_until: "Valabilitatea ofertei",
  signatories: "Reprezentanți / semnatari",
  exclusions: "Excluderi",
  duration: "Durată",
  acceptance: "Criterii de acceptare",
  dependencies: "Dependențe",
  ip_terms: "Drepturi și licențe",
  privacy_mode: "Regim confidențialitate / DPA",
  relationship_type: "Natura relației juridice",
  offer_variant: "Varianta ofertei",
  period: "Perioada raportată",
  evidence: "Dovezi",
  findings: "Constatări",
  recommendations: "Recomandări",
  backup_policy: "Politica de backup",
  restore_policy: "Procedura de restaurare",
  support_levels: "Niveluri de suport",
  coverage: "Servicii acoperite",
  renewal_terms: "Reînnoire",
  termination_terms: "Încetare",
  liability_terms: "Răspundere",
  contract_reference: "Acordul de referință",
  methodology: "Metodologie",
  activities: "Activități",
  observations: "Observații",
  platforms: "Platforme",
  access_scope: "Operațiuni autorizate",
  revocation: "Revocarea accesului",
  confidentiality_terms: "Informații și obligații de confidențialitate",
  governing_terms: "Lege aplicabilă și litigii",
};
Object.assign(FIELD_LABELS, {
  business_context: "Activitate și public vizat",
  requirements: "Cerințe și limite",
  materials: "Materiale disponibile și drepturi",
  preferences: "Preferințe vizuale și exemple",
  contacts: "Responsabili și contacte",
  budget: "Buget orientativ",
  open_questions: "Întrebări deschise",
  audit_targets: "Suprafețe și versiuni auditate",
  limitations: "Limitările evaluării",
  severity: "Severitate și justificare",
  solution: "Soluția propusă",
  inclusions: "Opțiuni incluse",
  acceptance_method: "Modalitatea de acceptare",
  document_priority: "Prioritatea documentelor",
  recurring_terms: "Recurențe și suspendare",
  force_majeure_terms: "Evenimente neimputabile și notificare",
  technical_conditions: "Condiții tehnice",
  account_references: "Conturi și titulari",
  approval_rules: "Reguli de aprobare",
  security_measures: "Măsuri de securitate",
  return_deletion: "Returnare și ștergere",
  data_roles: "Rolurile privind datele",
  processing_annex: "Anexa privind prelucrarea",
  subprocessors_transfers: "Subîmputerniciți și transferuri",
  dpa_assistance: "Asistență pentru protecția datelor",
  audit_conditions: "Dovezi de conformitate și audit",
  risks: "Riscuri și măsuri",
  report_type: "Tipul raportului",
  data_sources: "Surse de date",
  metrics: "Indicatori și metodologie",
  remediation: "Remedieri și responsabili",
  access_inventory: "Inventarul accesurilor",
  secure_channel: "Canalul securizat de predare",
  handover_effects: "Efectele recepției",
  support_reference: "Acordul de suport",
  service_limits: "Limitele serviciilor",
  measurement_method: "Metoda de calcul a țintelor",
  maintenance_windows: "Ferestre de mentenanță",
  storage_terms: "Costuri și limite de stocare",
});
export const templateFields = (payload: DocumentPayload) => [
  ...new Set(
    JSON.stringify(payload)
      .match(/\{\{[a-zA-Z0-9_.-]+\}\}/g)
      ?.map((value) => value.slice(2, -2)) || [],
  ),
];

FIELD_LABELS["beneficiary.identification"] =
  "Identificare juridică beneficiar (CUI/CIF și registru, după caz)";
