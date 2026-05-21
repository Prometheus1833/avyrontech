## Înlocuire favicon cu logo Avyron

Imaginea logo "A" cu gradient mov-fucsia și accent cyan a fost deja generată la `public/favicon.png` (vezi preview-ul de mai sus).

## Pași

1. **Șterge** `public/favicon.ico` (favicon-ul default Lovable, 51KB) — altfel browserele îl vor cere automat și suprascriu cel nou.
2. **Actualizează `index.html`** — adaugă după meta google-site-verification:
   ```html
   <link rel="icon" type="image/png" href="/favicon.png" />
   <link rel="apple-touch-icon" href="/favicon.png" />
   ```
3. **Republică** site-ul pentru ca favicon-ul nou să fie live pe avyron.ro.

Confirmă trecerea în build mode ca să aplic schimbările.