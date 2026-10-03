# Backup AVYRON Social Studio

## Surse de adevăr

- Git păstrează regulile editoriale, schema și istoricul revizuit. Fișierul canonic este `config/avyron-social-studio.json`.
- D1 păstrează metadatele operaționale, versiunile profilului de design, registrul activelor și registrul backupurilor.
- bucketul privat R2 `FILES` păstrează manifestele JSON; activele media rămân în bucketurile private și sunt referite prin cheie și checksum.
- un export local reproduce configurația și skillul fără parole, cookie-uri, tokenuri, conversații private sau secrete de conectare.

## Crearea unui backup local

Rulează `npm run backup:social-studio`. Rezultatul este creat sub `.backups/avyron-social-studio/<timestamp>/` și include un manifest cu SHA-256 pentru fiecare fișier.

Backupul local nu este comis. Configurația canonică, migrațiile și codul sunt însă versionate în Git și intră în procesul normal de review.

## Backup din AVYRON OS

Din proiectul AI AVYRON, un administrator cu MFA poate crea un backup de configurație. API-ul:

1. colectează numai datele permise și exclude identificatorii de conexiune și secretele;
2. construiește un document cu versiune de schemă și numărul înregistrărilor;
3. calculează SHA-256;
4. scrie manifestul în R2 privat;
5. păstrează în D1 starea, cheia obiectului, checksumul și rezultatul verificării.

Descărcarea cere autentificare și acces de administrare la proiect. Răspunsul folosește `no-store`.

## Restaurare

Restaurarea este intenționat manuală și controlată: se verifică checksumul, versiunea schemei și proiectul țintă, apoi se creează un plan de import revizuit. Un backup nu suprascrie direct datele active și nu reactivează conexiuni externe.

## Rolul telefonului Android

Samsung-ul este util pentru verificarea finală pe mobil, muzică, stickere, efecte TikTok/Instagram și confirmarea zonelor sigure după publicare. Nu este sursa de adevăr și nu va stoca baza principală de date.

## Retenție și verificare

- recomandare: 90 de zile pentru manifestele operaționale;
- se păstrează minimum ultima copie verificată și câte o copie înaintea schimbărilor structurale;
- checksumurile locale se pot verifica cu `shasum -a 256 -c checksums.sha256` din directorul backupului;
- niciun backup nu include credențiale sau sesiuni de browser.
