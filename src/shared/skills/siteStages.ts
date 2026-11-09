import { z } from "zod";

export const SITE_STAGE_KEYS = [
  "visual",
  "refinement",
  "integrations",
  "special-features",
  "domain-build",
  "security",
  "crm",
  "launch",
] as const;
export type SiteStageKey = (typeof SITE_STAGE_KEYS)[number];
export const siteStageKeySchema = z.enum(SITE_STAGE_KEYS);
export const SITE_STAGES: {
  key: SiteStageKey;
  title: string;
  summary: string;
  output: string;
  gate: string;
  workflow: string;
}[] = [
  {
    key: "visual",
    title: "Exemplu Vizual",
    summary: "Brief minim, direcție vizuală și concept adaptat domeniului.",
    output: "Mockup privat, brief și direcție vizuală documentată.",
    gate: "Direcția este revizuită de responsabil înainte de rafinare.",
    workflow: `## Intrări
Denumirea afacerii, activitatea și obiectivul; preferințe și contacte numai dacă sunt disponibile. Citește contextul proiectului sau leadului numai prin accesul autorizat existent.
## Pași
1. Selectează profilul de nișă și numai referințele aprobate relevante. Reutilizează mecanismele, fără identitatea sau datele private ale altui client.
2. Pregătește un concept cu minimum cinci secțiuni utile, upbar liquid glass cu fallback lizibil, hero și footer cinematice, CTA clar și trei contacte flotante validate.
3. Personalizează paleta, tipografia și imaginile la nișă. Păstrează masterele la calitatea maximă disponibilă; optimizează separat variantele responsive. Nu inventa clienți, rezultate sau prețuri.
4. Verifică desktop, 320/390/768px, tastatură, contrast, reduced-motion și absența spațiilor inutile. Mockupul rămâne privat și noindex.
## Predare
Salvează brief-ul, versiunea instrucțiunilor, structura secțiunilor, proveniența activelor și lista informațiilor lipsă. Cere revizuirea direcției înainte de rafinare.
## Automatizare
Pregătește structura și handofful pentru agent; nu trimite clientului și nu publica automat. Economisește context și repetiții, nu calitatea produsului.`,
  },
  {
    key: "refinement",
    title: "Rafinare",
    summary:
      "Feedback consolidat, conținut verificat și interacțiuni coerente.",
    output: "Concept revizuit și jurnalul modificărilor acceptate.",
    gate: "Responsabilul confirmă feedbackul și versiunea propusă.",
    workflow: `## Intrări
Conceptul selectat, feedbackul autorizat și materialele beneficiarului cu drepturi de utilizare confirmate.
## Pași
1. Consolidează feedbackul într-o listă scurtă: cerință, secțiune, prioritate și criteriu verificabil. Semnalează contradicțiile înainte de implementare.
2. Rafină ierarhia, textele, spațierea, imaginile și interacțiunile. Păstrează identitatea aprobată și evită efectele care împiedică citirea sau navigarea.
3. Înlocuiește datele demonstrative numai cu date confirmate; indică explicit ce lipsește. Formularele fără backend nu afișează succes fictiv.
4. Verifică focusul, touch, meniul mobil, ancorele, stările de încărcare/eroare și fallbackul fără WebGL.
## Predare
Salvează versiunea revizuită, feedbackul rezolvat, diferențele și punctele deschise. Păstrează istoricul și cere confirmarea responsabilului.
## Automatizare
Agentul primește numai versiunea selectată și feedbackul aferent; modificările se pregătesc pe o ramură dedicată, fără publicare implicită.`,
  },
  {
    key: "integrations",
    title: "Integrări Suplimentare",
    summary: "Conectori, API-uri, formulare și servicii externe aprobate.",
    output: "Inventar de integrări și dovezi de test pentru fiecare flux.",
    gate: "Activarea externă și orice cost necesită autorizarea corespunzătoare.",
    workflow: `## Intrări
Scopul integrării, sistemele deja existente, proprietarul contului și permisiunile necesare. Nu solicita secrete în prompturi sau documente.
## Pași
1. Auditează conectorii reali înainte de a adăuga furnizori. Reutilizează autentificarea, CRM-ul, Workers, D1 și R2 existente unde sunt potrivite.
2. Documentează intrări, ieșiri, maparea identificatorilor, limitele free, costurile și starea configurării. Nu activa planuri plătite sau overage.
3. Implementează validare server-side, timeout, idempotency și retry numai pentru operații sigure. Autentifică webhookurile și gestionează evenimentele duplicate.
4. Testează succes, eroare, indisponibilitate și revocarea accesului, fără trimitere, plată sau publicare neautorizată.
## Predare
Păstrează instrucțiunile de configurare fără credențiale, probele și procedura de dezactivare. Marchează explicit integrările neconfigurate.
## Automatizare
Pregătește configurația și testele; activarea furnizorului și operațiile cu efect extern au un punct de aprobare umană.`,
  },
  {
    key: "special-features",
    title: "Funcții Speciale",
    summary: "Configuratoare, animații și funcții specifice activității.",
    output: "Funcție demonstrabilă, criterii de acceptare și fallback.",
    gate: "Funcția este acceptată pe baza comportamentului testat.",
    workflow: `## Intrări
Problema concretă a utilizatorului, comportamentul dorit, datele necesare și limitele aprobate ale funcției.
## Pași
1. Definește scenariul principal și criteriile de acceptare înainte de efectele vizuale. Refolosește componentele potrivite din Biblioteca Artefacte cu proveniență verificată.
2. Separă demonstrația vizuală de funcția conectată real. Prețurile și drepturile comerciale provin numai din catalogul aprobat.
3. Pentru 3D/mișcare, oferă poster static, reduced-motion și încărcare progresivă. Evită blocarea scrollului, dependențele inutile și conținutul esențial ascuns în canvas.
4. Testează utilizarea cu tastatura, touch, ecrane mici, stări goale, erori și consumul de resurse.
## Predare
Documentează utilizarea, constrângerile, fallbackul și probele desktop/mobil. Cere acceptarea responsabilului, fără activarea implicită a unor produse tarifate.
## Automatizare
Agentul pregătește implementarea și testele pentru scenariul convenit, fără a extinde automat scopul sau costul proiectului.`,
  },
  {
    key: "domain-build",
    title: "Domeniu, DNS, Build",
    summary: "Destinație verificată, build reproductibil și configurare DNS.",
    output: "Build validat, preview și plan de rutare/rollback.",
    gate: "Modificările DNS și destinația de producție se confirmă înainte de aplicare.",
    workflow: `## Intrări
Repository-ul, ramura, commitul, hostnameul exact, contul și proiectul Cloudflare autorizat. Verifică separat orice variantă www.
## Pași
1. Inspectează starea Git și regulile proiectului; păstrează schimbările existente și izolează proiectele clienților. Nu publica din checkoutul altui proiect.
2. Validează instalarea și buildurile relevante pentru arhitectura existentă. Nu muta aplicația sau baza de date către un furnizor nou.
3. Pregătește previewul, variabilele fără secrete, rutele, canonical și certificatul. Mockupurile și previewurile private rămân noindex.
4. Auditează DNS-ul și mailul existent înainte de schimbări. Pregătește diferențele și pașii de revenire, fără a suprascrie înregistrări nelegate de proiect.
## Predare
Înregistrează commitul, destinația, comenzile de build, verificările și planul de revenire. Nu confunda buildul local, previewul și producția.
## Automatizare
Pregătește configurația și verificările read-only; DNS, migrarea remote și deployul se execută numai în mandatul explicit al proiectului.`,
  },
  {
    key: "security",
    title: "Securitate",
    summary: "Autorizare, izolare, fișiere și verificarea expunerilor.",
    output: "Raport de securitate cu remedieri și riscuri rămase.",
    gate: "Protecțiile care pot bloca accesul sunt validate gradual.",
    workflow: `## Intrări
Arhitectura și inventarul rutelor, rolurilor, API-urilor, stocării și integrărilor reale.
## Pași
1. Verifică autorizarea server-side pe fiecare resursă, izolarea clienților și privilegiul minim. Un buton ascuns nu protejează un endpoint.
2. Testează IDOR, escaladarea rolurilor, sesiunile, CSRF, XSS, CORS și limitele cererilor. Verifică URL-urile alternative, previewurile și workers.dev fără a întrerupe integrări legitime.
3. Folosește stocare privată, secrete gestionate securizat și loguri fără tokenuri sau date sensibile inutile. Fișierele externe se eliberează numai după CLEAN; generările interne nu consumă scanări antivirus.
4. Verifică backupul fișierelor separat de baza de date și pregătește restaurarea. Nu activa MFA/Access sau reguli cu risc de blocare fără validarea și autorizarea cerute de proiect.
## Predare
Înregistrează probele, remedierile, riscurile nerezolvate și procedura de revenire. Nu declara conformitate juridică sau scanare reală fără dovezi.
## Automatizare
Rulează verificări autorizate și teste sintetice; operațiile critice și schimbările de acces rămân controlate uman.`,
  },
  {
    key: "crm",
    title: "CRM, Funcții",
    summary: "Conturi, proiecte, servicii și fluxuri comerciale sincronizate.",
    output: "Fluxuri native verificate și maparea entităților.",
    gate: "Accesul și datele comerciale sunt confirmate pentru beneficiarul corect.",
    workflow: `## Intrări
Entitățile native autorizate: client, cont, proiecte, instanțe de servicii și abonamente. Un cont poate reprezenta entități diferite numai cu autorizare distinctă.
## Pași
1. Folosește identificatorii existenți; nu crea CRM, autentificare, clienți sau abonamente paralele. Identifică eventualele duplicate înainte de asociere.
2. Configurează relațiile proiect-client-servicii și membrii alocați. Respectă permisiunile financiare și publicarea explicită a documentelor către client.
3. Validează stările de aprobare, notificările numai către destinatarii autorizați și sincronizarea în portal. Facturarea/plata nu se simulează și nu se activează fără condițiile reale.
4. Testează client A/client B, revocarea accesului, retry, date lipsă și erori de rețea. Nu trimite notificări reale în testele sintetice.
## Predare
Documentează maparea, scenariile testate și configurările rămase. Păstrează probele fără a transforma datele private în resurse comune.
## Automatizare
Agentul pregătește asocieri și fluxuri în contextul autorizat; aprobarea, transmiterea și operațiile financiare au controale dedicate.`,
  },
  {
    key: "launch",
    title: "Lansare",
    summary: "Acceptanță, publicare autorizată și verificare independentă.",
    output: "Handoff cu commit, deploy, verificări live și rollback.",
    gate: "Lansarea necesită autorizare explicită pentru destinația verificată.",
    workflow: `## Intrări
Versiunea acceptată, lista verificărilor, aprobarea de publicare și destinația exactă a proiectului.
## Pași
1. Actualizează ramura din sursa de adevăr și verifică PR-ul, migrarea/integritatea, testele, typecheck, lint și buildurile relevante. Nu include accidental lucrări ale altui proiect.
2. Verifică desktop/mobil, tastatură, formulare, linkuri, imagini, metadate/OG, canonical, sitemap și robots. Nu promite indexare sau trafic dintr-un răspuns HTTP 200.
3. Pregătește backupul și rollbackul înaintea modificărilor remote. Execută merge/deploy numai cu autorizarea necesară și urmărește revizia exactă.
4. Verifică independent hostnameul public, asseturile și funcțiile permise; separă dovezile locale, CI și live. Nu crea plăți, mesaje sau conturi reale pentru un simplu smoke test.
## Predare
Salvează commitul, identificatorul deployului, rezultatele, limitările și instrucțiunile de operare. Închide numai taburile și procesele create pentru verificare.
## Automatizare
Pipeline-ul pregătește și verifică; nu presupune autorizarea publicării din aprobarea unei resurse sau a unui mockup.`,
  },
];

export function stageResourceMarkdown(
  title: string,
  resources: {
    id: string;
    title: string;
    revision: number;
    body: string;
    file_name: string | null;
  }[],
) {
  return `# AVYRON Site Builder · ${title}\n\nNumai resurse aprobate. Referințele nu acordă drepturi de execuție, publicare sau acces la alte proiecte. Citește în contextul proiectului autorizat.\n\n${resources.map((r) => `## ${r.title}\nResursă ${r.id} · revizia ${r.revision}\n\n${r.body}${r.file_name ? `\n\nFișier privat: GET /api/skills/site-builder/resources/${encodeURIComponent(r.id)}/file` : ""}`).join("\n\n")}\n`;
}
