# AVYRON OS — proprietatea datelor și consolidarea Cloudflare

## Decizia arhitecturală

Cloudflare D1 este sursa centrală de adevăr pentru identitate, organizații,
proiecte, CRM, knowledge și controlul agenților. R2 păstrează obiectele binare,
KV numai configurații cacheable, iar Durable Objects coordonează starea scurtă
a conversațiilor. Supabase rămâne temporar un sistem legacy pentru modulele care
încă îl folosesc; nu este o a doua sursă de adevăr și nu se introduce dual-write.

| Domeniu | Țintă | Stare legacy | Regula de migrare |
| --- | --- | --- | --- |
| identitate, sesiuni, MFA, RBAC | D1 + Worker | autentificare/roluri Supabase în UI vechi | identity map înaintea mutării datelor |
| proiecte, taskuri, mentenanță | D1 + R2 | hooks Supabase existente | organizație și autorizare server-side înainte de import |
| Leads și conversații comerciale | D1 + R2 | date parțial duplicate | import idempotent, proveniență și istoric obligatoriu |
| facturi, abonamente, plăți | D1 | tabele/hooks Supabase | reconciliere financiară înainte de cutover |
| chat intern și anunțuri | D1 + Durable Objects | realtime Supabase | mutare după definirea retenției și prezenței realtime |
| knowledge și agent control plane | D1 + R2 | fără sursă centrală completă | Cloudflare este sursa de adevăr din prima versiune |

## Succesiunea sigură

1. Se face inventar read-only și se blochează apariția unor tabele paralele.
2. Se creează maparea identităților legacy la `users` și organizații.
3. Se importă în preview, cu hash, identificator extern și audit de proveniență.
4. Se verifică număr de rânduri, relații, date financiare și fișiere R2.
5. La cutover se opresc scrierile legacy, se importă delta și se comută API-ul.
6. Sistemul vechi rămâne read-only pentru rollback; ștergerea cere aprobare
   separată și dovadă de backup.

Ordinea modulelor este: identitate, tickets, mentenanță/taskuri/anunțuri,
billing cu reconciliere, chat realtime, apoi eliminarea clientului Supabase din
bundle după ultimul consumator. Sumele noi sunt stocate în unități minore RON,
timestampurile în epoch milisecunde și timezone-ul de business este
`Europe/Bucharest`.

## Condiții de oprire

- identități fără mapare sau date fără organizație clară;
- divergență între totalurile financiare;
- fișiere fără hash/owner ori politici de retenție;
- schema preview diferă de migrațiile versionate;
- orice cerință de a șterge sau suprascrie sistemul legacy fără backup și
  aprobare explicită.
