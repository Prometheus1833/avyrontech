# Oblio facturare

Documentație oficială urmărită: [Oblio API](https://www.oblio.eu/api/) și [manualul API PDF](https://www.oblio.eu/download/api-oblio.pdf).

Workerul obține un token OAuth2 de scurtă durată de la `/api/authorize/token`, apoi emite factura la `/api/docs/invoice`. Comanda AVYRON devine `orderNumber`, iar `idempotencyKey` este `avyron-{order_id}`. Produsele trimit prețuri cu TVA inclus numai după configurarea explicită a denumirii și procentului TVA.

Emisia fiscală este **oprită implicit**, chiar dacă toate credențialele există. `OBLIO_AUTO_ISSUE_ENABLED=true` se configurează numai după verificarea în contul Oblio a societății DIGITAL ECOTECH SOLUTIONS S.R.L., CUI 55055976, a seriei dedicate AVYRON, a tratamentului TVA și după aprobarea inițială a proprietarei. `OBLIO_SEND_EMAIL_ENABLED=true` este o activare separată pentru expedierea către client; implicit, facturile nu sunt expediate automat. Niciun test local sau preview nu activează aceste variabile.

Limitele oficiale trebuie respectate: generarea documentelor are o fereastră mai restrictivă decât operațiile de citire. Reîncercările vor folosi aceeași cheie idempotentă. Eșecul Oblio nu inversează o plată confirmată; păstrează factura în `pending` pentru reconciliere internă. Dacă există deja o factură emisă manual pentru comandă, emiterea automată este oprită pentru a evita duplicatul. În dashboard, stafful autorizat poate reîncerca emiterea doar după activarea explicită. e-Factura, proformele și stornările nu sunt încă executate automat; înainte de activare este necesară verificarea efectivă a contului și a procedurii contabile.
