# Conexiuni opționale Supabase și Google Drive

Aceste conexiuni completează AVYRON OS, fără să înlocuiască infrastructura principală Cloudflare. Autentificarea, datele business și fișierele existente rămân în Workers, D1, KV și R2.

## Limite intenționate

- conturile sunt create ca `configured`, dar rămân neactivate și inutilizabile până la stocarea unei chei și verificarea manuală;
- fiecare conexiune este asociată explicit unui `owner_user_id` AVYRON și dashboardul afișează contul asociat;
- `Verifică` testează accesul, fără să importe sau să utilizeze date;
- `SUPABASE_DATA_OPERATIONS_ENABLED`, `GOOGLE_DRIVE_DATA_OPERATIONS_ENABLED` și `BACKUP_JOBS_ENABLED` sunt `false` în producție și preview;
- backendul refuză sincronizarea Supabase/Drive cu `data_operations_disabled`, chiar dacă interfața este ocolită;
- Google Drive nu listează și nu descarcă fișiere, iar Supabase nu citește rânduri din tabele;
- nicio conexiune nu este consumată automat de agenți, proiecte sau produse;
- cheile sunt criptate în Cloudflare KV și nu sunt salvate în D1, loguri sau bundle-ul frontend.

## Supabase

Se configurează URL-ul proiectului (`https://<project-ref>.supabase.co`) și o cheie publicabilă cu drepturi minime. Cheile `service_role`, cheile `sb_secret_*` și JWT-urile cu rol `service_role` sunt respinse. RLS și granturile proiectului rămân autoritatea pentru resursele vizibile.

Verificarea apelează exclusiv endpointul Data API `/rest/v1/` pentru a confirma disponibilitatea proiectului și un răspuns OpenAPI valid. Nu sunt inventariate tabele, nu sunt interogate rânduri și nu sunt create bucketuri ori scheme.

## Google Drive

Conectarea se face prin OAuth 2.0 web-server, cu `state` unic, PKCE, redirect HTTPS explicit, acces offline și scope-ul restrâns `drive.file`. Refresh tokenul este criptat în KV. Callbackul verifică server-side prin `about.get` că adresa autorizată este exact `avyrontech@gmail.com`; `login_hint` este doar ajutor de interfață și nu este considerat dovadă.

Verificarea citește numai identitatea și cota raportată de `about.get`. Tokenurile expirate sunt reîmprospătate server-side; revocarea produce starea de reconectare. Nu se apelează `files.list` și nu se creează automat folderul de destinație.

Pentru conectarea reală trebuie configurate în Worker:

- variabila `GOOGLE_OAUTH_CLIENT_ID`;
- secretul `GOOGLE_OAUTH_CLIENT_SECRET`;
- opțional `GOOGLE_OAUTH_REDIRECT_URI`; implicit este `https://avyron.ro/api/integrations/google-drive/callback`.

Redirectul exact trebuie adăugat clientului OAuth Google. Dacă aplicația External rămâne în starea Testing, `avyrontech@gmail.com` trebuie adăugat ca test user, iar autorizarea și refresh tokenul pot expira după șapte zile.

## Erori tratate

Dashboardul diferențiază cheia invalidă sau expirată, permisiunile insuficiente ori contul suspendat, proiectul indisponibil, cota depășită, contul Google greșit, autorizarea care necesită reconectare, cheia criptată lipsă și indisponibilitatea temporară a furnizorului. `Deconectează` șterge referința către secret și programează eliminarea valorii criptate din KV.

## Limite verificate la 4 octombrie 2026

- Supabase Free: 500 MB pentru baza de date per proiect, 1 GB Storage și 5 GB egress necached plus 5 GB cached la nivelul organizației. Dashboardul furnizorului rămâne sursa pentru planul și consumul real; AVYRON nu prezintă estimări locale drept cotă confirmată.
- Drive API: 1.000.000 unități/minut/proiect, 325.000 unități/minut/utilizator/proiect și 1 TB egress/zi/proiect conform documentației curente. În această etapă AVYRON face doar verificări manuale `about.get`, fără trafic periodic.

Surse oficiale: [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Drive quotas](https://developers.google.com/workspace/drive/api/guides/limits), [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [OAuth app states](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).

## Publicare

Migrarea D1 `0041_optional_supabase_drive_connections.sql` trebuie aplicată controlat înaintea publicării codului Worker. Conexiunile reale rămân „de verificat” până când administratorul configurează Supabase și finalizează autorizarea OAuth Google din AVYRON OS; existența codului sau a variabilelor nu este raportată drept conexiune reușită.
