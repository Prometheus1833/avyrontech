import {
  blankPayload,
  heading,
  paragraph,
  type DocumentPayload,
} from "./model";
import { FAMILY_LEGAL_NOTES, LEGAL_REVIEW_DATE, TEMPLATE_STAGES } from './legal';

export type TemplateDefinition = {
  id: string;
  name: string;
  legal: boolean;
  required: string[];
  payload: DocumentPayload;
};
const base = ["date", "provider.legal_name", "provider.tax_id", "provider.registration_number", "provider.address", "provider.registered_address", "provider.share_capital", "beneficiary.legal_name", "scope"];
const commercialFamilies = new Set(['offer', 'framework', 'annex', 'sla']);
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
  required: [...new Set([...required, ...(commercialFamilies.has(id) ? ['contract_capacity'] : [])])],
  payload: {
    ...blankPayload(name),
    header: "AVYRON · {{provider.legal_name}}",
    labels: { __avyron_design: '2026', __avyron_edition: '2026-11', __avyron_stage: `${TEMPLATE_STAGES[id]}/5`, __avyron_legal_review: LEGAL_REVIEW_DATE },
    footer:
      "{{provider.contact_email}} · Document privat · {{beneficiary.legal_name}}",
    body: {
      type: "doc",
      content: [
        paragraph(TEMPLATE_INTROS[id]),
        paragraph(`TRASEU AVYRON · ETAPA ${TEMPLATE_STAGES[id]}/5 · ${FAMILY_LEGAL_NOTES[id].checkpoint}`),
        paragraph("Activitate: {{scope}}. Data: {{date}}."),
        {
          type: "table",
          content: [
            { type: "tableRow", content: ["Emitent AVYRON", "Beneficiar / destinatar"].map((label) => ({ type: "tableHeader", content: [paragraph(label)] })) },
            { type: "tableRow", content: [
              { type: "tableCell", content: [paragraph("{{provider.legal_name}}"), paragraph("CUI {{provider.tax_id}} · ONRC {{provider.registration_number}}"), paragraph("Activitate / corespondență: {{provider.address}}"), paragraph("Sediu social: {{provider.registered_address}}"), paragraph("Capital social: {{provider.share_capital}}"), paragraph("Contact: {{provider.contact_email}}") ] },
              { type: "tableCell", content: [paragraph("{{beneficiary.legal_name}}"), paragraph("{{beneficiary.summary}}")] },
            ] },
          ],
        },
        ...(commercialFamilies.has(id) ? [paragraph('Calitatea beneficiarului în această relație: {{contract_capacity}}.')] : []),
        ...(legal
          ? [
              paragraph(
                "Identificarea juridică a beneficiarului: {{beneficiary.identification}}. Sunt utilizate numai datele necesare relației documentate.",
              ),
            ]
          : []),
        ...(id === 'privacy' ? FAMILY_LEGAL_NOTES[id].clauses.map(paragraph) : []),
        ...sections.flatMap(([title, paragraphs]) => [
          heading(title),
          ...paragraphs.map(paragraph),
        ]),
        ...(id === 'privacy' ? [] : [heading('Condiții specifice și repere de aplicare'), ...FAMILY_LEGAL_NOTES[id].clauses.map(paragraph)]),
      ],
    },
  },
});

const TEMPLATE_INTROS: Record<string, string> = {
  brief: "Pornim de la activitatea și prioritățile dumneavoastră. Acest brief reunește informațiile necesare unei propuneri relevante și delimitează ce mai trebuie clarificat înainte de ofertare.",
  audit: "Acest raport prezintă starea evaluată, dovezile disponibile și ordinea recomandată a intervențiilor. Cititorul poate identifica rapid ce este confirmat, care este impactul și ce decizie urmează.",
  offer: "Vă propunem o soluție construită în jurul activității dumneavoastră. Oferta separă rezultatul urmărit, livrabilele, investiția și pașii de lucru, pentru a putea decide în cunoștință de cauză.",
  framework: "Acest contract stabilește cadrul colaborării, responsabilitățile părților și condițiile în care serviciile sunt comandate, verificate și predate. Anexele acceptate individualizează fiecare activitate.",
  annex: "Această anexă transformă propunerea acceptată într-un perimetru de lucru verificabil: ce se livrează, în ce condiții, cu ce limite și după ce criterii se confirmă finalizarea.",
  access: "Acest acord descrie accesul autorizat pentru activitatea convenită. Drepturile sunt limitate la scopul declarat, se acordă individual și pot fi retrase prin procedura stabilită mai jos.",
  privacy: "Acest document stabilește cum sunt utilizate și protejate informațiile schimbate în colaborare. Regimul de prelucrare a datelor se alege după rolurile și operațiunile efective ale părților.",
  implementation: "Planul face vizibile etapele, responsabilitățile și punctele de decizie. Fiecare livrabil este legat de un termen, de dependențele sale și de dovada necesară finalizării.",
  report: "Raportul reunește activitățile efectuate, rezultatele observate și prioritățile perioadei următoare. Concluziile sunt susținute de sursele și limitele de măsurare indicate în document.",
  handover: "Părțile consemnează ce a fost predat, ce s-a verificat și ce observații rămân de soluționat. Inventarul și rezultatul recepției permit urmărirea clară a responsabilităților ulterioare.",
  sla: "Acest acord clarifică resursele protejate, intervențiile incluse și modul de solicitare a suportului. Nivelurile de serviciu, backupul și costurile sunt delimitate explicit, fără acoperire implicit nelimitată.",
};

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
      ...base,
      "objectives",
      "deliverables",
      "schedule",
      "payment_terms",
      "valid_until",
      "exclusions",
    ],
    [
      [
        "01 Contextul și direcția propusă",
        [
          "Am organizat propunerea pentru {{scope}}, pornind de la următoarele obiective: {{objectives}}.",
          "Soluția propusă: {{solution}}. Varianta comercială: {{offer_variant}}. Beneficiile urmărite sunt obiective ale colaborării; poziționările, vânzările și rezultatele dependente de terți nu sunt garantate.",
        ],
      ],
      [
        "02 Ce primește beneficiarul",
        [
          "Livrabilele, formatele și limitele asumate: {{deliverables}}.",
          "Opțiunile incluse: {{inclusions}}. Fiecare serviciu sau produs este individualizat în deviz și în detaliile activității, fără extinderea implicită la alte proiecte.",
        ],
      ],
      [
        "03 Cum lucrăm și ce avem nevoie",
        [
          "Calendarul estimativ și punctele de verificare: {{schedule}}.",
          "Materialele, accesurile, responsabilii și aprobările necesare: {{dependencies}}. Modificările de scop se evaluează și se confirmă înainte de executare, împreună cu impactul asupra costurilor și termenelor.",
        ],
      ],
      [
        "04 Investiția și costurile separate",
        [
          "Devizul de la final distinge valoarea de catalog de valoarea ofertată și arată cantitatea, taxele și recurența fiecărei poziții. Orice reducere sau majorare este justificată și se aplică exclusiv acestei oferte.",
          "Elementele excluse și costurile furnizorilor externi: {{exclusions}}. Domeniile, bugetele media, licențele și abonamentele terților nu se confundă cu onorariul AVYRON. Regimul fiscal aplicabil: {{tax_regime}}.",
          "Durata și condițiile costurilor recurente: {{duration}}. Sumele unice și cele periodice se citesc separat; variantele alternative se confirmă înainte de acceptare.",
        ],
      ],
      [
        "05 Plata și valabilitatea",
        [
          "Condițiile de plată, eventualul avans și scadențele: {{payment_terms}}.",
          "Oferta este valabilă până la {{valid_until}}. Un câmp necompletat nu introduce un tarif, o durată sau o autorizare de debitare. Factura fiscală se emite prin fluxul de facturare aplicabil, separat de prezenta ofertă.",
        ],
      ],
      [
        "Opțiuni suplimentare",
        [
          "Propuneri care pot completa proiectul: {{optional_extras}}.",
          "Aceste opțiuni sunt prezentate pentru analiză, fără obligație de achiziție. Nu intră în totalul ofertei și nu se execută fără acceptarea separată a conținutului, prețului și condițiilor lor.",
        ],
      ],
      [
        "06 Acceptare și pasul următor",
        [
          "Pentru continuare se confirmă versiunea ofertei, pachetul ales și condițiile de acceptare: {{acceptance}}. Modalitatea de confirmare este {{acceptance_method}}.",
          "Contact AVYRON: {{provider.contact_email}}. Confirmarea aparține persoanelor autorizate să reprezinte beneficiarul; semnăturile se colectează prin canalul convenit, dacă sunt necesare. Oferta nu transferă singură drepturi asupra codului sau creațiilor și nu înlocuiește acordurile contractuale care trebuie încheiate separat.",
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
          "{{provider.legal_name}}, identificată în fișa părților, cu adresa de activitate și corespondență {{provider.address}}, și {{beneficiary.legal_name}}, forma {{beneficiary.entity_type}}, cu sediul/adresa în {{beneficiary.address}}, convin prezentul contract prin reprezentanții {{signatories}}.",
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
          "Rolurile părților și temeiul relației se stabilesc în {{data_roles}}. Pentru o relație operator–persoană împuternicită conform art. 28 alin. (3) GDPR, obiectul, durata, natura și scopul prelucrării, tipurile de date și categoriile de persoane vizate se descriu în anexa {{processing_annex}}.",
          "Persoana împuternicită prelucrează datele numai pe baza instrucțiunilor documentate, asigură confidențialitatea persoanelor autorizate și aplică măsurile tehnice și organizatorice convenite. Instrucțiunile considerate contrare normelor aplicabile sunt semnalate operatorului.",
        ],
      ],
      [
        "Art. 4. Cerințe condiționale pentru acordul de prelucrare",
        [
          "Dacă se activează regimul DPA, subîmputerniciții și condițiile autorizării lor, transferurile internaționale și garanțiile aplicabile sunt {{subprocessors_transfers}}, cu verificarea art. 28 și art. 44–49 GDPR. Asistența pentru cereri ale persoanelor vizate, incidente, evaluări și verificări se organizează potrivit {{dpa_assistance}}.",
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
  "beneficiary.summary": "Identificarea și contactul beneficiarului",
  "provider.share_capital": "Capital social AVYRON (valoare și monedă)",
  "provider.registration_number": "Registrul Comerțului AVYRON",
  optional_extras: "Opțiuni suplimentare fără obligație de achiziție (opțional)",
  "project.future_name": "Denumirea proiectului viitor",
  "project.future_description": "Contextul proiectului viitor",
  date: "Data documentului",
  "provider.legal_name": "Denumirea juridică AVYRON",
  "provider.tax_id": "CUI AVYRON",
  "provider.address": "Adresă AVYRON de activitate / corespondență",
  "provider.registered_address": "Sediu social confirmat pentru identificarea legală",
  contract_capacity: "Relația contractuală · profesionist sau consumator",
  cross_border: "Clauză transfrontalieră (opțional)",
  consumer_withdrawal_information: "Informarea privind retragerea, termenul și procedura aplicabile",
  consumer_performance_request: "Cererea expresă de începere în perioada de retragere, dacă există",
  jurisdiction_terms: "Competența și mecanismul de soluționare, verificate pentru țările implicate",
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
/** Optional clauses are removed before validation, not silently filled with promises. */
export function applicableTemplatePayload(payload: DocumentPayload, family: string, fields: Record<string, string>): DocumentPayload {
  let content = payload.body.content || [];
  if (family === "privacy" && fields.privacy_mode !== "DPA") {
    const boundary = content.findIndex((n) => n.type === "heading" && n.content?.some((t) => t.text?.startsWith("Art. 3.")));
    if (boundary >= 0) content = content.slice(0, boundary);
  }
  if (family === "offer" && !fields.optional_extras?.trim()) {
    const start = content.findIndex((n) => n.type === "heading" && n.content?.some((t) => t.text === "Opțiuni suplimentare"));
    if (start >= 0) {
      const next = content.findIndex((n, i) => i > start && n.type === "heading");
      content = [...content.slice(0, start), ...(next < 0 ? [] : content.slice(next))];
    }
  }
  if (commercialFamilies.has(family) && fields.contract_capacity === 'B2C') content = [...content,
    heading('Condiții specifice pentru consumatori'),
    paragraph('Se respectă informarea precontractuală, retragerea și excepțiile aplicabile potrivit OUG nr. 34/2014, în special art. 6, 9 și 16. Personalizarea unui serviciu nu este tratată automat ca renunțare la drepturi; cererile și acordurile exprese necesare se obțin separat, fără opțiuni preselectate.'),
    paragraph('Informarea pentru acest contract: {{consumer_withdrawal_information}}. Solicitarea expresă privind începerea prestării, dacă este relevantă: {{consumer_performance_request}}. Drepturile imperative ale consumatorului nu sunt excluse de clauzele standard.'),
  ];
  if (commercialFamilies.has(family) && fields.cross_border === 'yes') content = [...content,
    heading('Relație transfrontalieră · condiții de confirmat'),
    paragraph('Legea aplicabilă este {{governing_terms}}, iar soluționarea disputelor este {{jurisdiction_terms}}. Pentru raporturile acoperite de Regulamentul (CE) nr. 593/2008 (Roma I), alegerea legii se verifică potrivit art. 3 și, în relațiile cu consumatori, art. 6; normele imperative și protecția consumatorului nu sunt înlăturate printr-o alegere formală.'),
  ];
  return { ...payload, body: { ...payload.body, content } };
}

export const templateFields = (payload: DocumentPayload) => [
  ...new Set(
    JSON.stringify(payload)
      .match(/\{\{[a-zA-Z0-9_.-]+\}\}/g)
      ?.map((value) => value.slice(2, -2)) || [],
  ),
];

FIELD_LABELS["beneficiary.identification"] =
  "Identificare juridică beneficiar (CUI/CIF și registru, după caz)";
