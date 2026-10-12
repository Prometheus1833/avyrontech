# Stripe Checkout și Billing

Documentație oficială urmărită: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [SetupIntents](https://docs.stripe.com/api/setup_intents), [Customer Portal](https://docs.stripe.com/api/customer_portal/sessions/create) și [webhook signatures](https://docs.stripe.com/webhooks/signature).

Plățile folosesc Checkout găzduit. Pentru o plată unică, `setup_future_usage=off_session` permite atașarea sigură a metodei la Customer. Pentru salvare fără încasare se folosește Checkout `mode=setup`. Abonamentele folosesc Checkout `mode=subscription`; `invoice.paid` înregistrează fiecare reînnoire și pornește factura Oblio, evenimentele `customer.subscription.*` sincronizează starea și perioada, anularea din AVYRON setează `cancel_at_period_end`, iar administrarea completă se face în Customer Portal.

Sesiunea Checkout este reutilizată pentru comanda deja deschisă și POST-urile către Stripe au chei de idempotency. Un webhook semnat este asociat cu sesiunea locală și cu mediul test/live înainte de livrare. `checkout.session.completed` pentru o plată încă neconfirmată rămâne în așteptare; livrarea are loc numai la `payment_status=paid`, inclusiv prin `checkout.session.async_payment_succeeded`. Evenimentele de eșec/expirare marchează sesiunea, iar o revendicare unică în D1 previne dubla înregistrare a venitului când evenimentele ajung concurent. Factura Oblio rămâne un eveniment distinct și este blocată implicit până la aprobare.

Versiunea API nu este impusă în cod. Dacă `STRIPE_API_VERSION` lipsește, se folosește versiunea implicită a contului; schimbarea versiunii se face separat, după testarea sandbox.

Nu considera `providerCapabilities.enabled` o dovadă de conectivitate: indică doar credențiale prezente. Identitatea juridică, webhookul înregistrat, modul contului, decontările, comisioanele și rambursările trebuie verificate din sesiunea Stripe accesibilă înainte de activarea live.
