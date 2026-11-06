# Creează Logo și produse Development achitate

Ramura din 6 noiembrie 2026 continuă lotul cumulativ #94–#101 de la `4924253`, cu `origin/main` reverificat la `dcfd638`. Codul local, PR-ul și release-ul sunt stări distincte.

## Cont și navigare

În pagina principală a clientului și meniul său există **Creează Logo**, către simulatorul public existent `/servicii/creare-logo-3d-dinamic-cinematic/creeaza` (cu ruta EN corespunzătoare). Nu deschide administrarea simulărilor și nu schimbă tarifele exportului asistat AI sau produsului distinct Logo Studio 3D.

**Produse Development Achitate** este accesibil din aceeași pagină și din meniul personal, în `tab=collection`, deasupra planului și drepturilor active. Păstrează acțiunile native de coș, checkout și descărcare autorizată. Adăugarea unui produs public sincronizează coșul contului chiar dacă sertarul este închis; sincronizarea folosește coșul nativ (inclusiv modificările în așteptare ale vizitatorului) și nu așteaptă deschiderea panoului de cote/licențe. Sunt aplicate numai adăugările/eliminările făcute în vizita curentă; o selecție veche din browser nu este reintrodusă automat peste coșul contului la montarea paginii. Linkurile de produse din cont duc explicit pe site, inclusiv când dashboardul rulează pe app.avyron.ro.

Autentificarea din site, www și cont folosește același API existent `https://api.avyron.ro`, cu cookie-ul `sid` HttpOnly/Secure limitat la acel host. API-urile comerciale rămân pe destinațiile existente, cu JWT scurt în memorie. Nu se extinde cookie-ul către toate subdomeniile, nu se introduc tokenuri în linkuri/localStorage, nu se acordă roluri noi și nu se modifică expirarea/MFA. Sesiunile vechi limitate la alt host pot necesita o autentificare după lansare; autentificările noi se restabilesc prin cookie la navigare/reîncărcare pe site și cont. Configurația explicită de API pentru dezvoltare/preview rămâne aplicabilă.

Recenziile folosesc formularul și moderarea publice existente. Pentru utilizatorul conectat, numele și emailul sunt precompletate la deschidere, rămân editabile și nu sunt trimise automat. Consimțământul și controlul anti-spam rămân obligatorii. Recenzia nu devine publică înaintea aprobării.

## Istoric real de achiziții

`GET /api/produse/account/purchases?cursor=...` este sub middleware-ul nativ `requireAuth` și politica privată/no-store a API-ului. Citește numai `commerce_orders.user_id = userId` și `status='paid'`; cursorul nu modifică beneficiarul. Include linii product și vechiul format kind=item, inclusiv din comenzi mixte, cu numele/SKU/cantitatea din snapshotul istoric. Returnează 20 de comenzi per pagină și cursor stabil după created_at/id. Stările requested/quoted/accepted/cancelled și serviciile/planurile fără produse nu intră în acest istoric.

Data plății provine din `billing_order_fulfillments`; dacă lipsește pentru date istorice, UI identifică explicit data comenzii. Nu pretinde o dată de încasare sau drepturi perpetue. Istoricul rămâne vizibil și dacă dreptul expiră/este revocat; deschiderea/descărcarea păstrează verificările curente de licență și antivirus. Comenzile noi intră în istoric după confirmarea reală a procesatorului prin mecanismul existent, nu după parametrul URL de întoarcere din checkout.

Stările de încărcare, eroare, reîncercare și paginare sunt explicite; eroarea la actualizare păstrează lista deja încărcată. Schimbarea contului și cererile întârziate nu reutilizează istoricul altui utilizator.

## Verificare și limite

Testele serverului folosesc routerul Hono, SQLite cu migrațiile reale și tranzacția existentă de fulfillment: izolare client, plată neconfirmată, retry idempotent, drept expirat/revocat, comenzi mixte/legacy și paginare cu timestampuri identice. Testele browser folosesc cookie HttpOnly sintetic pe hostul API și site/app simulate din buildul local, pentru navigare, logo, recenzie, rol client și 320/1440 px.

Nu se execută plăți, recenzii sau generări AI reale în aceste teste. Acceptanța în contul real rămâne la utilizator. Nu sunt necesare migrări sau chei noi pentru acest task; release-ul cumulativ are încă migrările 0091–0098, care trebuie aplicate prin fluxul existent numai după backup și verificare. Hugging Face rămâne omis, iar configurarea Bouncer și verificările sale de conformitate rămân separate.

Verificare locală: 103 fișiere / 894 teste trecute și un benchmark opțional omis; după corecțiile finale ale coșului, 28 de teste țintite și 29 de scenarii browser distincte (25 existente + 4 noi) au trecut. Typecheck și lint fără erori; patru avertismente Fast Refresh preexistente. Build Pages final (inclusiv static), build Worker și API dry-run verificate, audit SEO trecut. CI pe HEAD și verificarea producției rămân pași separați consemnați în PR.
