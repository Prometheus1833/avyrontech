# Revolut Merchant și Revolut Pay

Documentație oficială urmărită: [Merchant API](https://developer.revolut.com/docs/api/merchant), [Hosted Checkout](https://developer.revolut.com/docs/guides/merchant/accept-payments/online-payments/hosted-checkout-page/api), [Subscriptions API](https://developer.revolut.com/docs/guides/merchant/billing-subscriptions/api/get-started), [verificarea webhook-ului](https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature).

Integrarea folosește API-ul curent `2026-08-17`, configurabil prin secret pentru o migrare controlată. Plățile unice pornesc cu `POST /api/orders`; abonamentele folosesc customer, plan variation, subscription și setup order. Activarea inițială a abonamentului este verificată prin `GET /api/subscriptions/{id}`, deoarece documentația curentă nu definește un webhook separat pentru tranziția inițială la `active`. O reconciliere zilnică citește și `GET /api/subscriptions/{id}/cycles`, verifică server-to-server comenzile ciclurilor finalizate și înregistrează idempotent reînnoirea și factura Oblio.

Semnătura webhook este HMAC SHA-256 peste `v1.{timestamp}.{raw-body}`, cu toleranță de cinci minute și suport pentru rotația semnăturilor. Evenimentul `ORDER_COMPLETED` este urmat de o citire server-to-server a comenzii înainte de acordarea accesului.

Revolut Business Banking și Revolut Merchant sunt conectori diferiți și folosesc credențiale diferite.
