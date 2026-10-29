# Continuitatea sesiunilor STAFF și a operatorului Codex

## Stare și granițe

- AVYRON OS păstrează sesiunile în D1 și le validează în API Worker. Oprirea calculatorului nu oprește Workerul sau D1.
- Autentificarea prin `/staff` selectează implicit „Menține-mă conectat”. Pentru un cont privilegiat, cookie-ul `sid` este persistent și sesiunea expiră absolut după șapte zile; opțiunea debifată păstrează limita de 12 ore și cookie de sesiune. Deconectarea, revocarea, dezactivarea contului și expirarea închid accesul. După lansare, utilizatorii cu sesiuni vechi trebuie să se autentifice din nou pentru noua durată.
- Skillul din `.agents/skills/avyron-os-operator` este versionat și poate fi descoperit de o sesiune Codex care folosește acest repository după integrarea schimbării în `main`. Nu este un executor, o autentificare la furnizori sau o copie a skillurilor personale de pe iMac.
- Indicatorul „Acces operator Codex” verifică doar rolurile, capabilitățile și legăturile din D1. Rutele `codex_manual` și `codex_review` nu au prin ele însele un proces Codex persistent. Un proces Codex local se oprește odată cu iMacul.

## Verificare după o lansare aprobată

1. Confirmați că `main`, versiunea Workerului API și Pages production conțin commitul aprobat. Un preview sau un PR verde nu dovedește activarea în producție.
2. Autentificați un cont STAFF de test la `/staff` cu opțiunea implicită. Verificați în browser că `sid` are `Secure`, `HttpOnly` și o expirare de cel mult șapte zile. Reporniți browserul și confirmați că `/api/auth/me` restaurează același cont; verificați și deconectarea.
3. Repetați cu opțiunea debifată; cookie-ul trebuie să fie doar de sesiune. Verificați că revocarea sesiunii sau dezactivarea contului anulează refreshul.
4. Într-o sesiune Codex pornită din checkoutul actualizat, confirmați descoperirea skillului `avyron-os-operator`. Verificați separat în AVYRON OS legăturile agenților `leads` și `ai-prod-content` și starea rutelor lor. Nu folosiți indicatorul de acces ca probă a unei execuții.

## Pentru agenți activi când iMacul este oprit

Este necesar un executor găzduit, cu identitate de serviciu limitată, stocare sigură a credențialelor, buget, audit, aprobare pentru acțiuni externe și monitorizare. Înainte de activare trebuie aleasă platforma și verificate costul, drepturile, secretele, modul de declanșare, retry/idempotency și procedura de oprire. Integrarea unui astfel de executor și conectarea skillurilor personale nu sunt realizate de acest PR. Automatizările Workers AI existente se verifică independent în Cloudflare înainte de a fi declarate active.

## Impact și revenire

Calculul duratei se face în memoria Workerului și folosește clasificarea de privilegii deja calculată la login; nu adaugă interogări D1 pe ruta de autentificare și nici la fiecare cerere. Noua sesiune privilegiată persistă maximum șapte zile, deci furtul cookie-ului are o fereastră mai lungă decât în modul de 12 ore. `HttpOnly`, `Secure`, expirarea absolută și revocarea server-side reduc acest risc. Revenirea se face prin revertul PRului și o nouă lansare aprobată; sesiunile deja create pot fi revocate din administrarea conturilor dacă politica de durată se schimbă.
