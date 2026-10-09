# Oblio facturare

Documentație oficială urmărită: [Oblio API](https://www.oblio.eu/api/) și [manualul API PDF](https://www.oblio.eu/download/api-oblio.pdf).

Workerul obține un token OAuth2 de scurtă durată de la `/api/authorize/token`, apoi emite factura la `/api/docs/invoice`. Comanda AVYRON devine `orderNumber`, iar `idempotencyKey` este `avyron-{order_id}`. Produsele trimit prețuri cu TVA inclus numai după configurarea explicită a denumirii și procentului TVA.

Limitele oficiale trebuie respectate: generarea documentelor are o fereastră mai restrictivă decât operațiile de citire. Reîncercările vor folosi aceeași cheie idempotentă. Eșecul Oblio nu inversează o plată confirmată; păstrează factura în `pending` pentru reconciliere internă.
