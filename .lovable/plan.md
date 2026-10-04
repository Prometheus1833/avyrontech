# Repararea accesului în portalul clienților și în panoul echipei

## Ce e confirmat
1. **Portalul clienților e gol.** Facturile, abonamentele, statisticile și tichetele apar doar pentru conturile legate manual de un client. Momentan nu există nicio legătură, iar clienții nu pot deschide tichete.
2. **Echipa e blocată de codurile în doi pași.** Conturile de staff și admin primesc erori peste tot până își activează o aplicație de autentificare. Nimic din ecran nu le spune să facă asta.
3. **Staff-ul nu vede tichetele.** Lista de suport și schimbarea statusului merg doar pentru cei doi super admini.

## Ce schimb
1. **Legare automată client–cont:** printr-o migrare, fiecare cont existent se leagă de clientul cu același email, verificat cu majuscule ignorate. La crearea unui cont nou, legătura se face automat după email. Pentru clienții fără legătură, tichetul se creează pe contul lor, nu pe un client, deci trimiterea nu mai e blocată. Legarea manuală din echipă rămâne disponibilă.
2. **Activarea codurilor în doi pași:**
   - La autentificare, când serverul cere activarea, contul ajunge direct la pasul de configurare, cu cod QR și verificare.
   - În panou, orice eroare de tip „confirmare în doi pași necesară” afișează un banner cu butonul „Activează acum”.
   - Regula de securitate rămâne neschimbată.
3. **Tichete pentru staff:** staff-ul și adminii pot vedea toată coada de suport și pot schimba statusul tichetelor. Facturile și finanțele rămân doar pentru super admini.

## Detalii tehnice
- Migrare D1 nouă: populează `client_account_access` prin potrivirea `users.email` cu `clients.email`; aceeași potrivire rulează la signup.
- `workspace.ts`:
  - pe ruta de tichete, scope-ul de principal devine `role IN ('staff','admin')`;
  - PATCH folosește `requireRole`;
  - POST permite `client_id` null, cu `user_id` setat pe autor.
- `Auth.tsx` tratează `mfa_enrollment_required`; un `MfaEnrollBanner` partajat apare în `Profile.tsx`.
- Verificare: typecheck, `build`, `build:pages`, `build:worker`, teste.
