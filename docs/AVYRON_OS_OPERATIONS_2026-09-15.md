# AVYRON OS — operațiuni și agenți, 15 septembrie 2026

Implementare locală pe `codex/avyron-os-finalization-2026-09-14`, peste
`82e09e1`. Producția nu a fost modificată. Politica temporară fără înrolare
MFA nouă pentru administratorii platformei este păstrată.

## Funcții implementate

| Funcție | Comportament disponibil |
| --- | --- |
| Centrul operațional | În `/profil?tab=os-centers`, cu module pentru registre, automatizări, integrări, agenți și notificări; desktop și mobil |
| Contracte și cereri de modificare | Creare, editare, căutare, paginare, arhivare, client/proiect/responsabil, sumă în unități minore, monedă și termene; ownerul aprobă versiunea exactă; schimbarea conținutului revocă aprobarea |
| Programări | Interval obligatoriu și responsabil; D1 respinge suprapunerile inclusiv la cereri concurente; sunt permise intervalele adiacente |
| Conformitate, confidențialitate și experimente | Registre cu descriere, responsabil, stare, perioadă și concluzii. Nu execută ștergeri DSAR și nu distribuie trafic A/B |
| Automatizări | Creare/editare, interval între 15 minute și 7 zile, activare/oprire, simulare prin citiri reale, execuție imediată, rezultate și istoric |
| Rapoarte | Informare AVY din leaduri/aprobări/încasări; termene pentru proiecte și registre; probe reale D1, R2 și KV. Nu apelează modelul AI și nu pretind livrare email |
| Joburi | Coada persistentă în D1, maximum trei joburi per drain, deduplicare, revendicare atomică, lease de 120 secunde, maximum trei încercări cu backoff, reluare manuală și anulare. Un rezultat al unei execuții anulate nu poate fi publicat |
| Notificări interne | Un singur rezultat per job și principal activ; fiecare utilizator vede și marchează numai notificările proprii |
| Conturi conectate | Ownerul creează contul și introduce/rotește/revocă tokenul prin interfață. Verificarea și sincronizarea fac cereri GET către hosturi fixe; nu inițiază plăți și nu publică |
| Evaluarea agenților | Verifică versiunea aprobată, modelul Cloudflare, limita de răspuns, instrucțiunile și retrievalul; rezultat persistent și audit. Acesta este un test de configurare/cunoaștere, nu un scor de calitate generativă |
| Oprire agenți | Ownerul poate opri/reporni agentul prin kill switch; verificarea rulează și pentru răspunsurile directe |
| Aprobări AI | Decizia include revizia afișată. Modificarea intenției în așteptare invalidează revizia; intenția unei aprobări deja decise nu poate fi rescrisă |

## Integrări pregătite pentru activarea din interfață

| Furnizor | Verificare și sincronizare | Ce trebuie activat / limită |
| --- | --- | --- |
| GitHub | Identitatea contului și rezumatele repository-urilor accesibile | Token de citire pentru identitate și repository-urile dorite; maximum 100 per sincronizare; fără OAuth sau push din acest modul |
| Cloudflare | Verificarea tokenului personal și inventarul zonelor | Token personal cu drept de citire a zonelor; maximum 50 zone; nu acceptă tokenuri de cont pe endpointul de verificare personal |
| Stripe | Citirea facturilor, stare, monedă, total, încasat și sold | Cheie secretă/restricționată test sau live cu drept de citire a facturilor; maximum 100 per sincronizare; fără emitere/încasare automată |
| Revolut Business | Citirea conturilor și soldurilor | Token Business pentru sandbox sau producție; înlocuire manuală la expirare; fără OAuth refresh, extras de tranzacții sau inițiere de plăți |

GitHub și Cloudflare nu oferă un mediu sandbox în aceste adaptoare și sunt
marcate explicit drept conturi reale. Rulările de verificare nu confundă
crearea unui cont local cu o conexiune verificată la furnizor.

Datele importate sunt rezumate pentru revizuire. Identificatorii externi
prevăd upsert idempotent; informațiile personale suplimentare ale facturii
nu sunt copiate. Importurile nu creează automat încasări în registrul financiar.
Importul folosește o singură instrucțiune SQL pentru documente, evitând câte
o interogare separată pentru fiecare rând. Listele importate reprezintă un istoric limitat, nu o oglindă completă a contului.

Tokenurile sunt criptate AES-GCM în Cloudflare KV, cu o cheie derivată HKDF,
un IV aleator și referința drept authenticated data. În D1 se păstrează numai
referința. API-ul nu returnează tokenuri, ciphertext sau referințe de seif.
Cheia de bază este secretul Worker `MFA_ENCRYPTION_KEY`, folosit cu un context
criptografic distinct de TOTP. Rotirea acestui secret de bază necesită
recriptarea/reintroducerea și a credențialelor integrărilor; rotirea unui token
individual este disponibilă direct în UI. Valorile de test sunt fictive.

## Optimizarea AI

- Căutare FTS5 indexată în D1 în locul scanării a până la 400 de cunoștințe.
  Filtre per agent și limbă; cunoștințele arhivate sau expirate sunt excluse.
  Indexul se actualizează la creare, editare și ștergere.
- Întrebările identice după normalizare primesc răspunsul validat fără apel
  de model. Întrebările fără context suficient folosesc fallbackul și intră
  în coada de învățare existentă.
- Context de maximum 6.000 de caractere, maximum patru surse, istoric limitat,
  instrucțiuni de separare a datelor de prompt și maximum 800 tokenuri de ieșire.
- Chatul folosește promptul/configurația versiunii aprobate, nu câmpurile
  mutable ale agentului.
- Consum raportat de furnizor, estimat sau absent este păstrat distinct.
  La eșecul unui apel început, rezerva estimată se păstrează conservator.
  Costul efectiv necunoscut rămâne `NULL`; nu este prezentat ca zero.
- Cost Guard rezervă atomic quota și evenimentul de consum, cu idempotency
  și reverificarea limitelor zilnice/lunare la scriere. Concurența nu poate
  dubla aceeași rezervare sau trece peste quota configurată.
- Câmpul `reservation_mode` permite trecerea de la vechiul Worker la noul
  Worker fără taxarea dublă a rezervărilor de către trigger și codul vechi.

Nu au fost schimbate abonamente, activate planuri plătite sau consumate
apeluri AI reale pentru testele acestei etape. Economia de tokenuri pentru
răspunsuri directe este verificată în teste; nu există încă măsurători de
cost, latență sau calitate generativă în producție pentru această versiune.

## Activare și livrare

1. Revizuire, commit și push al ramurii de task la pasul final autorizat.
2. Într-un mediu Cloudflare autorizat, migrațiile se aplică în ordine până la
   `0024`. Codul nou depinde de `0022`–`0024`; nu funcționează cu schema veche.
3. Se încarcă Workerul și frontendul în preview, se verifică autentificarea,
   accesul celor doi principali și fluxurile de mai sus cu date de test.
4. Se confirmă existența secretului de criptare. Titularul activează ulterior
   conturile din UI, cu tokenuri restrânse la operațiile de citire necesare.
5. Cronul `0,15,30,45 * * * *` procesează automatizările în configurația
   principală; preview păstrează cronurile dezactivate. Execuția manuală
   folosește `waitUntil` și este disponibilă independent de cron.
6. Promovarea și migrarea producției necesită autorizare separată. Nu s-au
   efectuat push, merge, deploy, migrații remote, plăți sau mesaje externe.

## Funcții care necesită încă dezvoltare

Activarea conturilor este suficientă numai pentru adaptoarele de citire
implementate mai sus. Nu este suficientă pentru emiterea facturilor FGO,
NETOPIA, OAuth/social inbox/publicare, reconciliere bancară completă,
rambursări, export XLSX/PDF financiar complet, execuție DSAR, distribuție A/B,
newsletter și restaurare R2. Acestea rămân explicit în backlog; registrele și
butoanele existente nu sunt prezentate ca implementări ale acelor fluxuri.

Emailul necesită configurarea furnizorului și dovadă de livrare. Cost Guard
necesită limite reale validate de titular. Nu se presupun limite, prețuri,
tranzacții, clienți sau rezultate live.

## Verificare

- **214/214 teste unitare/runtime**, în 23 de fișiere; cele 29 de teste ale
  operațiunilor și integrărilor includ handler-ele chatului, concurență,
  expirare, criptare, izolarea datelor, eșecuri și idempotency.
- **44/44 teste Playwright**; capturile centrului operațional desktop/mobil
  au fost inspectate vizual.
- TypeScript aplicație/Worker, ESLint, build static, Pages și standalone
  Worker: trecute. API și email: dry-run reușit, fără deploy.
- Migrațiile `0001`–`0024` aplicate cu Wrangler numai în D1 local temporar.
  Căutarea FTS5 și funcțiile JSON verificate în acest runtime; fără probleme FK.
- Audit de schemă și backup/restore SQLite: **125 de tabele** comparate,
  integritate și chei externe valide.
- `git fetch origin --prune`: `origin/main` rămâne `bf63ef9`, inclus în ramură.
  Verificarea diferențelor nu a găsit secrete introduse sau modificări de lockfile.

Testele runtime folosesc handler-ele Hono reale și toate migrațiile SQLite, cu bindinguri
Cloudflare și răspunsuri ale furnizorilor simulate. Playwright verifică UI cu
API fixtures; nu reprezintă tranzacții sau loginuri la furnizori reali.
