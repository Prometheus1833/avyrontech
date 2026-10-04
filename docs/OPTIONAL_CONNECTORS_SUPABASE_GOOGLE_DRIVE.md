# Conexiuni opționale Supabase și Google Drive

Aceste conexiuni completează AVYRON OS, fără să înlocuiască infrastructura principală Cloudflare. Autentificarea, datele business și fișierele existente rămân în Workers, D1, KV și R2.

## Limite intenționate

- conturile sunt create ca `configured`, dar rămân neactivate și inutilizabile până la stocarea unei chei și verificarea manuală;
- fiecare conexiune este asociată explicit unui `owner_user_id` AVYRON și dashboardul afișează contul asociat;
- `Verifică` testează accesul, fără să importe sau să utilizeze date;
- `Importă metadate` păstrează maximum 100 de intrări pentru revizuire;
- Google Drive nu descarcă conținutul fișierelor;
- Supabase citește doar schema Data API și nu citește rânduri din tabele;
- nicio conexiune nu este consumată automat de agenți, proiecte sau produse;
- cheile sunt criptate în Cloudflare KV și nu sunt salvate în D1, loguri sau bundle-ul frontend.

## Supabase

Se configurează URL-ul proiectului (`https://<project-ref>.supabase.co`) și o cheie publicabilă cu drepturi minime. Cheile `service_role`, cheile `sb_secret_*` și JWT-urile cu rol `service_role` sunt respinse. RLS și granturile proiectului rămân autoritatea pentru resursele vizibile.

Verificarea apelează exclusiv endpointul Data API `/rest/v1/`. Sincronizarea inventariază numele resurselor expuse de schema OpenAPI, fără interogarea tabelelor.

## Google Drive

Se folosește un token OAuth limitat la `drive.metadata.readonly`. Verificarea citește identitatea afișată și informația de cotă. Sincronizarea folosește `files.list` pentru cel mult 100 de fișiere neșterse și păstrează numai ID-ul, numele, tipul MIME, data modificării și dimensiunea.

## Erori tratate

Dashboardul diferențiază cheia invalidă sau expirată, permisiunile insuficiente ori contul suspendat, proiectul indisponibil, cota depășită, cheia criptată lipsă și indisponibilitatea temporară a furnizorului. `Deconectează` șterge referința către secret și programează eliminarea valorii criptate din KV.

## Publicare

Migrarea D1 `0041_optional_supabase_drive_connections.sql` trebuie aplicată controlat înaintea publicării codului Worker. Acest task nu aplică migrarea remote, nu configurează conturi reale și nu adaugă secrete de producție.
