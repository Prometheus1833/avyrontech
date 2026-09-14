# AVYRON OS — release infrastructură, 15 septembrie 2026

Utilizatorul a autorizat push și deploy după finalizarea infrastructurii.
Această etapă stabilizează funcțiile existente în ramura
`codex/avyron-os-finalization-2026-09-14`; modulele viitoare rămân în backlog.

## Modificări finale

- Cost Guard respinge reutilizarea unei chei pentru alt agent, furnizor,
  proiect, client, operație, volum sau cost; inclusiv cereri concurente.
- Chatul și feedbackul public validează tipurile și limitele înainte de D1/AI.
- Rapoartele de termene respectă limita declarată de 100 înregistrări per listă.
- GitHub CI verifică explicit TypeScript, lint și toate migrațiile D1.
- `scripts/release-api.mjs` verifică jurnalul migrațiilor, înregistrează un
  bookmark Time Travel, aplică migrațiile și verifică FK, integritatea,
  coloanele critice și FTS înainte de publicare. Orice eroare oprește deploy-ul.
- Preview folosește exclusiv resursele preview. Un build Cloudflare asociat
  altui Worker este respins înainte de accesarea bazei de date.

## Inventar live înainte de publicare

Verificat în dashboardul Cloudflare, contul Avyron:

- `avyrontech`: versiune activă `e151d894`, bindings D1/R2/KV/AI/DO existente.
- `avyron-db`: jurnalul `d1_migrations` include în ordine `0001`–`0019`.
- GitHub Builds este conectat la `Prometheus1833/avyrontech`, producție `main`,
  build `npm run build`, deploy `npm run deploy:api`.
- `JWT_SECRET`, `MFA_ENCRYPTION_KEY` și `TURNSTILE_SECRET` există ca secrete.
  Nu au fost afișate sau copiate valorile lor. `SMTP_PASS` lipsește.
- `avyrontech-preview` are resurse izolate, dar nu are integrarea Git activată.

Autentificarea OAuth nouă pentru Wrangler a fost respinsă de revizuirea
automată din cauza permisiunilor persistente solicitate. Nu s-au acordat
permisiuni noi. Publicarea poate folosi identitatea de build deja configurată
în Cloudflare, în limitele drepturilor sale existente.

## Limite păstrate

Politica temporară fără înrolare MFA nouă pentru admini rămâne activă.
Factorii deja înrolați continuă să fie verificați. Conturile externe și emailul
necesită activare/configurare reală de către titular; nu se presupun tokenuri,
limite comerciale, încasări sau livrare email. Inventarul funcțional și backlogul
sunt în [raportul operațional](AVYRON_OS_OPERATIONS_2026-09-15.md).

## Verificare și publicare

- 226/226 teste unitare/runtime, inclusiv oprirea deploy-ului la migrare,
  integritate, FK, FTS sau mediu greșit.
- 44/44 teste Playwright pentru dashboard, operațiuni și pagini publice.
- TypeScript aplicație/Worker, ESLint, audit D1, build static/Pages/Worker,
  API/email dry-run: trecute. Integrarea cu `origin/main` este fără conflicte.

Rezultatele finale și identificatorii release-ului se completează după
verificarea CI și a stării live. Un build local sau un upload de versiune
preview nu reprezintă un deploy în producție.
