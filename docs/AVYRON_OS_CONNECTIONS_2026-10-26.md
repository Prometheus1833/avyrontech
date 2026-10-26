# Conexiuni AVYRON OS — verificare și activare

## Starea verificată la 26.10.2026

În D1 producție, `source_connections` și `financial_provider_connections` nu conțin conexiuni. Proiectul `aip_avyron_web` are zero canale conectate: două sunt în starea `verifying`, iar cinci `disconnected`. Workerul are doar secretele interne de autentificare (`JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `SEED_TOKEN`, `TURNSTILE_SECRET`); nu sunt instalate cheile Stripe, Oblio, Revolut sau Google OAuth. Etichetele URL ale paginilor sociale nu dovedesc administrarea lor.

Registrul operațional are un rând `Revolut · Avyron` în starea `configured`, fără `secret_reference`, `checked_at` sau `synced_at`. Migrarea 0041 apare în istoricul D1; tabela temporară `integration_accounts_v2` este redenumită în `integration_accounts` chiar în acea migrare. Acest rând nu reprezintă o conexiune bancară. Verifică structura și starea tabelului final înainte de activarea Operations Console.

Configurația Worker curentă are `MFA_AUTH_ENABLED=false`. Verificarea conexiunilor financiare din acest PR cere MFA verificat și rămâne indisponibilă până când politica MFA este activată și validată pentru owner.

## Ordinea corectă

1. Confirmă firma emitentă (nume, CUI, TVA), identitatea fiecărui cont AVYRON și administratorii care pot autoriza OAuth. Nu folosi profilurile sau sesiunile Cutiuța Magică.
2. Pentru Meta, Instagram, Threads, LinkedIn, TikTok, Google și Revolut Business, autorizează separat doar permisiunile necesare. Păstrează tokenurile în secretele Worker sau într-un vault; în D1 păstrează doar referințe și stare. Nu marca `source_connections` drept `active` pe baza unui URL ori a unei etichete.
3. Pentru Stripe instalează `STRIPE_SECRET_KEY` și `STRIPE_WEBHOOK_SECRET` din același cont și mediu. Verifică endpointul webhook, modul test/live și identitatea juridică înainte de a activa checkoutul. În Financiar → Plăți și facturare, ownerul cu MFA poate apăsa **Verifică accesul API**; această acțiune face doar citiri și nu sincronizează plăți.
4. În Oblio, verifică firma și seriile existente. Creează din interfața Oblio o serie de tip **Factura**, cu prefix unic aprobat și început `0001`; API-ul public documentează citirea seriilor, nu crearea lor. După aceea, instalează `OBLIO_CLIENT_ID`, `OBLIO_CLIENT_SECRET`, `OBLIO_CIF`, `OBLIO_SERIES`. Butonul de verificare citește seria și respinge un prefix lipsă sau un început diferit. Configurează și verifică separat TVA. `OBLIO_AUTO_ISSUE_ENABLED` și `OBLIO_SEND_EMAIL_ENABLED` sunt aprobări distincte; nu le activa doar după testul de acces.
5. Revolut Merchant și Revolut Business sunt integrări distincte. Pentru Merchant configurează cheia, secretul webhook și verifică în API lista webhookurilor. Pentru Business sunt necesare OAuth/certificat și drepturi de citire a conturilor; adapterul bancar și reconcilierea nu sunt implementate, deci nu marca decontările ca verificate.
6. Pentru Google Drive există un flux OAuth separat în Operations Console, dar nu este configurat în producție. Search Console, GA4, Business Profile, Calendar și YouTube necesită scopuri și verificări proprii; conexiunea ChatGPT Google Drive nu autorizează AVYRON OS.
7. După fiecare autorizare, verifică identitatea contului, accesul API, webhookurile, primul import și timestampul. Abia apoi actualizează starea din OS. Menține ciornele, aprobările și publicarea per canal ca etape distincte.

## Stări financiare

`connected_unsynced` înseamnă că accesul API a fost verificat, dar nu există import/reconciliere. `synced` necesită un `last_sync_at` dintr-un proces real de sincronizare. Aceste stări nu confirmă emiterea unei facturi, plata unei comenzi sau decontarea bancară.

Surse: [Oblio API](https://www.oblio.eu/api/), [Stripe webhooks](https://docs.stripe.com/webhooks), [Revolut Merchant API](https://developer.revolut.com/docs/api/merchant), [Revolut Business API](https://developer.revolut.com/docs/api/business).
