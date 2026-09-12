# AVYRON OS — matrice de acoperire a cerințelor

Ultima verificare: 2026-09-12. Matricea consolidează cele trei briefuri furnizate
și starea reală din cod/infrastructură. `Complet local` nu înseamnă publicat;
activarea unui Worker, migrarea D1, DNS-ul, push-ul și producția rămân operații
separate, care cer aprobare explicită.

## Reguli de interpretare

- Cloudflare este platforma țintă: Worker, D1, R2, KV, Durable Objects și
  Workers AI. Nu se adaugă Supabase și nu se face dual-write.
- Nu se rulează nicio migrare D1 în această etapă. Fișierele `0014`–`0019`
  rămân append-only, versionate și pregătite pentru o fereastră aprobată.
- Paginile publice rămân înghețate. Optimizarea încărcării exemplelor schimbă
  doar comportamentul intern al bundle-ului când providerul legacy nu este
  configurat; conținutul și designul public nu se schimbă.
- `prometheus@avyron.ro` este principalul `platform_owner` rezolvat server-side,
  nu o excepție de securitate hardcodată în interfață.

## Brief principal, secțiunile 1–22

| # | Cerință | Stare verificată | Următorul prag real |
| --- | --- | --- | --- |
| 1 | Misiune și ordine | Complet local | Activările remote se fac numai în ordinea aprobată. |
| 2 | Protejarea paginilor publice | Verificat | Testele E2E public/auth protejează regresiile; nicio redesenare publică. |
| 3 | Audit și baseline | Complet | Inventar Git, Worker, bindinguri, D1, R2, DNS și builduri documentat. |
| 4 | Autoritate externă | Complet | Fără push, merge, producție, DNS, outreach sau plăți automate. |
| 5 | Cloudflare și medii | Fundație completă | Preview/producție sunt separate; Queues, Workflows și Vectorize se adaugă doar când există fluxul care le justifică. |
| 6 | Domenii/subdomenii | Parțial | Registry și routing demo sunt pregătite; DNS `.eu` și ținta `app.avyron.ro` cer confirmare separată. |
| 7 | Sincronizare/deployment | Complet ca proces | GitHub rămâne sursa de adevăr; runbook și porți de release documentate. |
| 8 | Auth/înregistrare | Fundație completă în cod | Sesiuni revocabile, MFA TOTP, recovery, schimbare email; onboarding progresiv și identity linking social rămân extensii. |
| 9 | Email tranzacțional | Parțial | Contractele și logul există; Workerul dedicat, retry queue, bounce/suppression și template QA nu sunt încă activate. |
| 10 | Organizații/RBAC | Complet local | Tenant isolation, memberships, invitații, roluri platformă și audit server-side. |
| 11 | Dashboarduri pe roluri | Complet pentru AI Prod | Cardul dashboard și intrarea mini-dashboard deschid aceeași pagină Proiecte AI; restul mini-dashboardului general poate fi redus ulterior la maximum șase acțiuni per rol. |
| 12 | Rapoarte/analize | Financiar local avansat | KPI, cost/lead, marjă estimată, categorii, alocări și motor determinist de proiecții; exporturile asincrone și rapoartele PDF rămân neactivate. |
| 13 | CRM/prospectare/Inbox | CRM operațional local | Pipeline, creare, deduplicare, contact manual, istoric, asignări, follow-up și remindere; Inbox omnichannel, import candidați și conversia idempotentă în proiect rămân următoarele. |
| 14 | Nucleu AI comun | Fundație + AI Prod complet local | Registry versionat, policy, bugete, kill switch, audit, Workers AI, Agents SDK și agenți alocați per proiect; uneltele externe rămân dezactivate până la aprobări și implementări dedicate. |
| 15 | Knowledge continuu | Fundație completă | Proveniență, surse, documente, claims și run-uri de sync; conectorii sociali, ingestia și aprobarea editorială live sunt neactivate. |
| 16 | Proiecte/portal client | Operațional, parțial extins | Izolare tenant, proiecte, linkuri, oferte și media; fluxurile contractuale/plăți și validarea completă a portalului se fac separat. |
| 17 | Content Studio | Ciorne și aprobare complet local | Proiectele AI generează postări/story/reel/carousel/mesaj/articol cu brief, strategie și expirare; calendarul și publicarea prin conectori reali rămân neactivate. |
| 18 | Automatizări | Fundație de siguranță | Idempotency, outbox, approvals și kill switches există; motorul Workflows/Queues și observabilitatea per workflow nu sunt active. |
| 19 | Domain Desk | Doar analiză/simulare | Verificarea domeniilor și shell-ul statistic există; portofoliul, bugetele și simularea licitațiilor nu execută achiziții/vânzări. |
| 20 | Securitate/fișiere/observabilitate | Fundație avansată | MFA, RBAC, audit, rate limits, R2 și validări; retenția, export/delete DSAR, scanarea uploadurilor și semnăturile tuturor webhookurilor rămân backlog. |
| 21 | Verificare/acceptare | Verificat local | Typecheck, lint, unit, builds, audit D1 local și E2E; remote se verifică din nou după orice activare autorizată. |
| 22 | Documentație/continuitate | Complet | Arhitectură, ownership, RBAC, resurse, runbookuri, status și această matrice sunt în repository. |

## Consolidarea celor două briefuri de produs

| Zonă solicitată | Implementare unică | Fără duplicare |
| --- | --- | --- |
| Dashboard premium | O singură navigație `/profil`, filtrată după rol și cu căutare | Mini-dashboardul viitor va deschide aceleași secțiuni, nu copii ale lor. |
| Leads Agent + CRM | Un singur pipeline D1 și o singură fișă de lead | Agentul propune/califică; omul aprobă și contactează. |
| Chat intern | Secțiunea existentă rămâne canalul intern | Realtime Cloudflare va înlocui providerul legacy numai într-o etapă aprobată. |
| Proiecte Avyron/client | Registry operațional pentru lucrări în curs plus portofoliu AI specializat, cu responsabilități distincte | Relațiile sunt explicite; pagina Proiecte AI nu copiază statusul contractual sau operațional. |
| AI AVY Prod | O listă canonică și un workspace per proiect pentru strategie, agenți, canale, memorie și conținut | Cardul și mini-dashboardul sunt doar puncte de intrare către aceleași date D1. |
| Financiar | `/finance` este modulul canonic D1; tabul dashboard reutilizează aceeași pagină | Agregatorul legacy Supabase a fost eliminat, iar detaliile se deschid progresiv. |
| Rapoarte | Un viitor strat de raportare peste aceleași date D1 | Nu se introduc dashboarduri cu metrici contradictorii. |
| Domain Hunter/Desk | Modul strict de analiză și simulare | Nu se amestecă cu operații financiare sau registrar neaprobate. |
| Avyron AI Assistant | Agent public cu knowledge aprobat și handoff uman | Nu există un al doilea chatbot cu altă bază de cunoștințe. |
| Control superadmin | AI OS este secțiunea owner-only | Full control aparține exclusiv principalului platformă din D1. |
| AVY Engine | Registru D1/R2 pentru surse, capabilități, conectori, documente, sugestii și bindings | Knowledge-ul existent este reutilizat; resursele externe nu devin automat conținut public sau tool executabil. |

## Ce este intenționat neactivat

1. Migrarea D1 `0014`–`0019` în preview sau producție.
2. Activarea unei versiuni noi pe `avyrontech-preview` sau producție.
3. DNS, certificate și rute pentru `app.avyron.ro`/`avyron.eu`.
4. OAuth/API pentru Instagram, Facebook, TikTok, LinkedIn sau alte surse.
5. Outreach automat, publicare, plăți, achiziții de domenii sau tool-uri cu efect extern.
6. Push, pull request, merge sau sincronizare în Lovable.

Această separare este parte din produs: capabilitățile sunt introduse numai
după ce datele, permisiunile, aprobările, retry-ul și rollback-ul sunt dovedite.
