# Inventar Cloudflare și matrice de resurse

Inventar confirmat la 2026-09-10. Nu include valori de secrete,
tokenuri, identificatori de cont sau înregistrări de verificare email/DNS.

## Workers și routing

| Resursă | Live | Config repo | Observație |
| --- | --- | --- | --- |
| `avyrontech` | activ, GitHub `main` | `wrangler.jsonc` | Worker central + assets |
| `avyrontech-preview` | activ, izolat, fără cron/rute custom | `env.preview` | AVYRON OS preview + assets |
| `avyron-email` | absent din lista live | `cloudflare/workers/email/wrangler.jsonc` | pregătit local, nu presupune deployment |
| `avyron.ro` | custom domain | declarat | canonic public |
| `www.avyron.ro` | custom domain | declarat | redirect la apex |
| `api.avyron.ro` | custom domain | declarat | API central |
| `app.avyron.ro/api/*` | route | declarat | numai API; frontendul rămâne separat |
| `avyron.eu/*` | route | declarat | DNS apex nu era proxied |
| `*.avyron.eu/*` | route | declarat | DNS wildcard lipsea |

Observabilitate: logs erau active; traces erau inactive. Activarea tracingului
este o schimbare live separată, cu impact de volum/cost, deci nu este inclusă
implicit.

## Storage

| Binding | Producție | Preview | Utilizare |
| --- | --- | --- | --- |
| `DB` | `avyron-db` | `avyron-db-preview` | date relaționale și securitate |
| `KV` | `avyron_kv` | binding preview separat | config/cache, nu auth/RBAC |
| `FILES` | `avyron-files` | `avyron-files-preview` | documente private |
| `MEDIA` | `avyron-media` | `avyron-media-preview` | media aprobate/avataruri |
| `AI` | Workers AI | Workers AI | inferență limitată de runtime |
| rate limiter | producție separat | preview separat | protecție burst |
| `AVYRON_AGENT_RUNTIME` | Durable Object în `avyrontech` | Durable Object în `avyrontech-preview` | coordonare fără date business |

Starea migrărilor este intenționat separată: producția s-a oprit la `0010`, iar
preview are `0001`–`0016`. Repository-ul conține migrațiile append-only
`0011`–`0016`; aplicarea lor în producție este o etapă separată, cu backup și
aprobare explicită.

Worker-ul preview are `JWT_SECRET` și `MFA_ENCRYPTION_KEY`, cache edge pentru
registrul agenților și modelul Workers AI activ. Preview URLs per versiune sunt
indisponibile conform limitării Cloudflare pentru Workers care implementează
Durable Objects; izolarea se face prin Worker-ul `avyrontech-preview`.

## DNS confirmat și diff propus

Nu se schimbă MX, TXT, SPF, DKIM, DMARC, nameservere sau verificări existente.

### `avyron.eu`

| Record | Acum | Propunere | Impact | Rollback |
| --- | --- | --- | --- | --- |
| apex A | DNS-only, target existent | păstrează targetul, activează Proxy | permite route `avyron.eu/*` | Proxy → DNS-only |
| `www` | absent | CNAME `www` → `avyron.eu`, Proxied | redirect HTTPS canonic | șterge recordul |
| `*` | absent | A `*` → `192.0.2.1`, Proxied | demo registry + 404 fail-closed | șterge recordul |

`192.0.2.1` este folosit doar ca adresă de documentație; Worker route răspunde
la edge înaintea oricărui origin. Activarea se face doar după deployul codului
de hostname routing și verificarea certificatului.

### `avyron.ro`

- Nu se adaugă wildcard.
- Rutele exacte `exemplu1`–`exemplu3` rămân pentru compatibilitate.
- `app.avyron.ro` nu se creează până când ținta reală a frontendului este
  confirmată; Workerul deține numai calea `/api/*`.
- `staging.app.avyron.ro` rămâne blocat până la confirmarea TLS pentru hostname
  pe două niveluri și existența unui environment izolat real.

## Reguli de secret management

- valorile secretelor se păstrează numai în Cloudflare;
- repository-ul conține doar numele bindingurilor și lista secretelor necesare;
- outputurile de inventar nu se copiază în documentație dacă includ tokenuri,
  valori DKIM sau identificatori sensibili;
- preview și production au valori și resurse distincte.
- `MFA_ENCRYPTION_KEY` este obligatorie în ambele medii, distinctă de
  `JWT_SECRET`, de minimum 32 de caractere și păstrată cu procedură de recovery;
  pierderea ei invalidează factorii TOTP existenți.
