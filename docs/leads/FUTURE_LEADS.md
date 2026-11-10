# Leaduri Viitoare

## Flux și integrare

Secțiune internă `/profil?tab=future-leads`, după Leaduri și Leads Agency. Lista
arată contactările apropiate cronologic (inclusiv cele restante), cu căutare după
client, titlu, sursă, contact și cerințe, tolerantă la diacritice. Se încarcă 50 de
înregistrări odată; istoricul arhivat / transformat se selectează din Opțiuni.

Fișa laterală programează un client/proiect nou sau un lead CRM existent. Sursa
și data sunt obligatorii; cerințele au maximum 500 de caractere. Nu este necesar
un cont de client. Datele de contact activează apelul, mesajul WhatsApp
precompletat și e-mailul în aplicația utilizatorului; nu se trimit mesaje automat.

Identitatea și contactele rămân în `leads`. Migrarea **0118** adaugă numai
`future_leads` (programare/context), `future_lead_events` (istoric al reviziilor)
și `future_lead_notices` (evidența reminderelor). Alocările sunt cele native din
`lead_assignments`. Nu se creează clienți, conturi sau proiecte fictive.
La programare, leadul trece în etapa CRM `accepted`, iar follow-up-urile automate
vechi se anulează. Istoricul CRM rămâne disponibil. Aceeași înregistrare poate fi
regăsită în CRM; nu se duplică fizic. Un lead arhivat/șters în CRM nu este reluat
implicit de acest modul.

Conversia confirmată folosește aceeași funcție autorizată ca `POST /api/projects`.
Se transferă titlul, tipul, cerințele, sursa, contactele, clientul ales și stafful
activ. Reviewerii devin viewers; ceilalți membri devin contributors, iar creatorul
rămâne project owner. Proiectul poate fi creat fără client; portalul clientului
necesită în continuare asocierea și autorizarea nativă. Repetarea conversiei
returnează proiectul deja legat. Salvările concurente sau o revizie veche sunt
respinse, fără proiecte orfane. Cererile idempotente includ identitatea leadului
și contextul programării în hash.

## Acces

- Numai identități staff/admin active și cu e-mail verificat; clienții nu au acces,
  nici ca membri ai unei organizații și nici prin URL direct.
- Owner/Super Admin: acces prin identitatea de platformă verificată în D1.
- `leads.read` global: vizualizarea listei integrale; `leads.write` global:
  administrare. Fără aceste drepturi, un membru vede numai leadurile alocate lui.
- Creare/programare: `leads.write` + `leads.create`. Conversie:
  `leads.write` + `projects.create`, plus toate controalele native pentru client,
  organizație și rank. Identitățile platformei păstrează drepturile existente.
- Stafful alocat (exceptând reviewerii) poate edita fișa și marca contactarea sau
  reprogramarea. Alocarea altor membri, schimbarea clientului și arhivarea necesită
  administrare. Nu se acordă drepturi globale CRM unui membru doar prin alocare.
- Alocările, statutul și drepturile sunt citite live; tranzacțiile verifică din nou
  identitatea, alocarea/grantul și revizia. Feedul, badge-urile și acțiunile de citire
  ale notificărilor folosesc același filtru de resursă.
- Endpointurile `/api/future-leads*` reutilizează autentificarea, politica de sesiune,
  CSRF și limitarea cererilor existente. Răspunsuri private `no-store` și `noindex`;
  validare strictă în server și corp de maximum 16 KiB. Nu se introduce MFA.

## Remindere

Job `future_lead_reminders`, în coada și cronul Cloudflare existente (la fiecare
15 minute). Niciun binding, abonament, canal extern sau serviciu nou.

- Praguri: **10, 5, 1 zile calendaristice înainte**, în `Europe/Bucharest`.
- Emisie de la **09:00 ora României**; prima execuție ulterioară creează notificarea.
- Destinatari: Owner/Super Admin activi și stafful activ alocat explicit.
- Mesaj important în inboxul nativ, cu link direct spre fișă. Nu este e-mail/SMS.
- După o întrerupere se recuperează doar pragul relevant cel mai recent, nu toate
  cele omise. Nu se trimit retroactiv praguri anterioare datei programării. După
  data contactării nu se emit remindere suplimentare; leadul rămâne restant în listă.
- Fiecare destinatar/prag/versiune de programare are cheie unică. Notificarea și
  evidența se scriu atomic; retry-urile nu dublează mesajele.
- Schimbarea datei sau revenirea la Programat incrementează versiunea programării.
  O simplă corectare a textului nu retrimite reminderele.
- Reprogramarea, arhivarea, conversia, contactarea și revocarea alocării fac
  notificările anterioare inaccesibile imediat, inclusiv prin feedurile vechi.
- Maximum 100 destinatari procesați pe execuție; execuția următoare continuă fără
  a relua destinatarii deja înregistrați. Erorile folosesc retry-ul/coada existente.

## Verificare și lansare

Testele Hono rulează contra SQLite cu toate migrările reale: validare, source,
ordine, idempotency, ACL între roluri, revocare în tranzacție, conversie și rollback,
conservarea clientului/brief-ului/staffului, deduplicarea reminderelor și DST.
Testele browser folosesc aceleași rute și o bază sintetică persistentă: creare,
editare, căutare, arhivare/reactivare, conversie, contact, erori recuperabile,
1440/390/320 px și axe-core. Nu se introduc leaduri sintetice în producție.

Lansare: bookmark D1 prin fluxul existent → migrare 0118 → Worker și assets din
același commit. Verificare: migrare aplicată, `foreign_key_check`, identitatea
Workerului și răspunsurile neautorizate. Bookmarkul D1 nu constituie backup R2.
Rollback: revenire la versiunea anterioară a Workerului/asseturilor; se păstrează
cele trei tabele și datele, fără down-migration distructivă. Workerul anterior nu
programează noul job. Nu este necesară modificarea proiectelor client existente.

Dovada reală a unei notificări la termen necesită o programare operațională și
prima execuție cron eligibilă. Testele cu timp controlat verifică toate pragurile;
nu echivalează cu observarea celor trei date calendaristice în producție.
