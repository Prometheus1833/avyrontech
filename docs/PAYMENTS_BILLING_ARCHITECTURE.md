# Plăți, abonamente și facturare AVYRON

## Obiectiv

Un singur flux comercial deservește serviciile, produsele digitale și abonamentele. Prețul final este calculat exclusiv în Worker din catalogul D1. Browserul alege procesatorul și primește un URL de checkout găzduit; nu trimite niciodată numărul complet al cardului către AVYRON.

## Flux canonic

1. Contul cere o ofertă server-side și creează `commerce_orders`.
2. `POST /api/billing/checkout` verifică proprietarul, suma, moneda și eligibilitatea comenzii.
3. Adaptorul Revolut Merchant sau Stripe creează checkout-ul, cu o cheie idempotentă legată de comandă.
4. Clientul plătește pe pagina procesatorului. Revenirea în site nu confirmă plata.
5. Webhook-ul public verifică semnătura pe corpul brut, respinge mesajele vechi și revalidează plata la provider când este necesar.
6. D1 marchează comanda, dreptul de acces și venitul într-un flux idempotent.
7. Oblio emite factura doar după confirmarea încasării, folosind `avyron-{order_id}` drept cheie idempotentă.
8. Reînnoirile Stripe sunt preluate din `invoice.paid`, iar ciclurile Revolut sunt reconciliate zilnic din API, deoarece Revolut nu emite webhook pentru finalizarea fiecărui ciclu.

## Provideri și responsabilități

- **Revolut Merchant / Revolut Pay**: plăți unice, customer vault și abonamente recurente. Planurile recurente cer maparea SKU + perioadă la `provider_variation_id` în `billing_provider_products`.
- **Stripe Checkout / Billing**: plăți unice, Setup Checkout pentru salvarea cardului, abonamente și Customer Portal.
- **Oblio**: factură, document PDF și ulterior e-Factura SPV. Nu procesează plata.
- **Netopia**: rezervat ca adaptor viitor. `enabled` rămâne fals până există implementare, credențiale, webhook și teste de contract.

FGO nu mai este folosit în niciun flux activ. Coloana istorică `fgo_reference` rămâne în tabelele vechi numai pentru trasabilitatea înregistrărilor deja existente.

## Date și securitate

Tabelele `billing_*` păstrează numai ID-uri de provider, brand, ultimele patru cifre, expirare și stări operaționale. PAN, CVV, PIN și secretele API nu intră în D1, loguri, browser storage sau analytics. Secretele sunt configurate ca Worker secrets.

Webhook-urile Stripe și Revolut sunt singurele rute publice de billing. Rutele de cont cer autentificare; statusul intern cere rol staff/admin și MFA. Evenimentele sunt deduplicate în `billing_webhook_events`; numai stările finale sunt blocate ca duplicate, astfel încât un eșec temporar poate fi reluat în siguranță.

## Activare controlată

1. Se aplică migrarea D1 `0057_billing_payment_orchestration.sql`.
2. Se configurează întâi sandbox/test pentru procesator și webhook.
3. Se adaugă mapările Revolut pentru fiecare abonament lunar/anual.
4. Se verifică o plată reală cu valoare minimă, factura Oblio și anularea abonamentului.
5. Abia după reconcilierea sumelor și a documentelor se activează cheile live.

## Variabile opționale

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_VERSION`, `REVOLUT_MERCHANT_SECRET_KEY`, `REVOLUT_MERCHANT_WEBHOOK_SECRET`, `REVOLUT_MERCHANT_API_URL`, `REVOLUT_MERCHANT_API_VERSION`, `OBLIO_CLIENT_ID`, `OBLIO_CLIENT_SECRET`, `OBLIO_CIF`, `OBLIO_SERIES`, `OBLIO_VAT_NAME`, `OBLIO_VAT_PERCENTAGE`.

Absența unei configurații dezactivează providerul explicit; nu există fallback care să pretindă că plata sau factura a reușit.
