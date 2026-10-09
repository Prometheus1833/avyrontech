# Stripe Checkout și Billing

Documentație oficială urmărită: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [SetupIntents](https://docs.stripe.com/api/setup_intents), [Customer Portal](https://docs.stripe.com/api/customer_portal/sessions/create) și [webhook signatures](https://docs.stripe.com/webhooks/signature).

Plățile folosesc Checkout găzduit. Pentru o plată unică, `setup_future_usage=off_session` permite atașarea sigură a metodei la Customer. Pentru salvare fără încasare se folosește Checkout `mode=setup`. Abonamentele folosesc Checkout `mode=subscription`; `invoice.paid` înregistrează fiecare reînnoire și pornește factura Oblio, evenimentele `customer.subscription.*` sincronizează starea și perioada, anularea din AVYRON setează `cancel_at_period_end`, iar administrarea completă se face în Customer Portal.

Versiunea API nu este impusă în cod. Dacă `STRIPE_API_VERSION` lipsește, se folosește versiunea implicită a contului; schimbarea versiunii se face separat, după testarea sandbox.
