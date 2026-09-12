# AVYRON OS — model funcțional consolidat

Acest document unifică cerințele orientative și elimină funcțiile duplicate.
Platforma internă are o singură navigație, un singur CRM Leads, un singur
registru de proiecte și un singur control plane pentru agenți.

## Experiența pe roluri

- Mini-dashboardul afișează maximum șase acțiuni relevante rolului: proiecte
  în mentenanță, Leads, chat intern, proiectele Avyron, rapoarte și Domain
  Hunter. Lista completă este în dashboard, nu duplicată în overlay.
- `prometheus@avyron.ro` este singurul `platform_owner` și singurul cont care
  poate schimba agenți, knowledge aprobat, politici, bugete, kill switches și
  conectori. Alți superadmini pot avea vizibilitate/operare delegată, fără
  control total.
- Stafful vede și editează numai organizațiile/proiectele permise. Clientul
  vede proiectele proprii, status, documente, ofertă, conversații și istoric.

## Domenii canonice

### Proiecte

O pagină securizată de proiect reunește metadata, domenii și linkuri externe,
status banner, servicii/abonamente, ofertă, media R2, log cronologic, taskuri,
mentenanță și conversația staff–client. Linkurile GSC/GBP/social sunt registry;
tokenurile conectorilor nu intră în D1 sau frontend.

### Leads

Pipeline unic: lead nou → contactat → discuție → potențial client → ofertă →
acceptat/respins → proiect. Include filtre, urgență, asignări, istoric pe canal,
remindere și conversie idempotentă în proiect. Agentul poate descoperi și
califica un candidat cu sursă și scor; nu contactează extern fără eligibilitate
și aprobare umană.

### Knowledge și agenți

Sursele au proprietar, URL canonic, nivel de încredere, vizibilitate și istoric
de sincronizare. Documentele și afirmațiile sensibile (prețuri, termene,
politici) trebuie aprobate înainte să alimenteze răspunsurile publice.

- **Avyron AI Assistant**: răspunsuri publice despre agenție, servicii, proces,
  prețuri aprobate și contact; recomandă următorul pas fără presiune.
- **Leads Agent**: calificare, prioritizare, follow-up propus și handoff uman.
- Agenții interni ulteriori folosesc același registry, aceleași politici de
  tool-uri, audit, bugete, versiuni și kill switches.

Durable Objects coordonează conversațiile, D1 păstrează datele centrale,
Workers AI generează numai din context aprobat, iar Workflows/Queues vor rula
sincronizările lungi cu retry și aprobare. Nicio rută Agents SDK nu este expusă
direct înaintea autentificării și autorizării Workerului.

### AI AVY Prod — Proiecte AI

`/intern/ai-projects` este portofoliul separat de producție AI pentru produse
proprii și proiecte administrate. Nu dublează pagina operațională „Proiecte”:
aceasta din urmă urmărește lucrările în curs, în timp ce Proiecte AI reunește
strategie, canale, agenți, memorie, concurență și materiale generate.

- Dashboardul și mini-dashboardul au aceeași intrare `AI AVY Prod` către
  pagina canonică, fără ecrane paralele.
- Avyron WEB, Cutiuța Magică și Retuvo sunt proiectele inițiale; accesul unui
  client/beneficiar se acordă explicit prin `ai_project_members`.
- Facebook, Instagram, TikTok, LinkedIn, WhatsApp și Messenger pornesc
  `disconnected`. `connected` cere un conector OAuth/API activ verificat
  server-side; numele unui cont introdus în UI nu simulează conexiunea.
- Agenții au rol, versiune, autonomie și capabilități delimitate per proiect.
  Agentul Content produce doar ciorne; Leads și Research pornesc în antrenare.
- Fluxul de conținut este `draft` → `pending_approval` → `approved`. Publicarea
  și mesajele outbound nu sunt implementate ca efect extern în această etapă.
- Limitele sunt configurabile per proiect: generări într-o fereastră rulantă
  de 24h, expirarea materialelor, retenția datelor brute și dimensiunea maximă
  a activelor. D1 păstrează metadata și textele, iar activele viitoare merg în
  R2 prin chei, nu ca bloburi în baza relațională.
- Orice mutație cere sesiune MFA. Controlul conexiunilor și orice activare
  automată aparțin exclusiv `platform_owner`; fiecare acțiune este auditată.

### Domain Hunter

Rămâne modul de simulare/analiză. Poate genera scoruri și recomandări, dar nu
cumpără, listează sau vinde domenii până când fluxul financiar, aprobările și
conformitatea sunt implementate separat.

## Surse inițiale

`avyron.ro` este sursă publică verificată. Linkurile oficiale Instagram,
Facebook, TikTok și LinkedIn sunt înregistrate ca surse `pending`; conținutul
lor se importă doar prin API/OAuth autorizat și după validarea contului. Nu se
folosește scraping fragil și nu se amestecă rezultate despre alte companii cu
nume asemănător.
