# Documents Hub, Command Center și Domains — extensie locală

Extinde commitul local `72677b9`. Nu reprezintă un deploy și nu activează automat
conturi, cote plătite, modificări DNS sau publicări.

## Documents Hub

- Oferte, contracte, briefuri, facturi, documentație tehnică, fișiere client și
  rapoarte; asociere cu client/proiect, conținut editabil, termen de revizuire,
  stări draft/approved/archived și control optimist pe revizie.
- Căutare FTS5 cu diacritice normalizate, filtre de categorie/client și paginare.
- Atașamente private R2 (PDF, PNG, JPEG, TXT, Markdown, JSON, maximum 10 MB),
  validare de tip, descărcare autentificată și auditată. Încărcarea unui fișier
  readuce documentul în draft. PDF/imagine nu se extrag automat: textul verificat
  se introduce în câmpul de conținut pentru căutare și AI.
- AI caută candidați textual și sintetizează maximum opt surse aprobate, în
  context limitat. Răspunsul include citate exacte validate server-side și
  versiunea sursei. Nu este un index semantic Vectorize al tuturor fișierelor.
- AVY Knowledge Auditor analizează maximum opt documente aprobate din clientul
  selectat (sau ultimele documente aprobate pentru toate conturile). Posibilele
  contradicții cer citate valide din două documente distincte ale aceluiași client și proiect. Constatările și
  sursele se păstrează ca snapshot în istoricul auditului; nu modifică documentele.
- Documentele cu revizuirea depășită apar separat și în Azi; sunt excluse din
  răspunsurile AI, dar pot fi incluse în eșantionul auditorului.
- Apelurile Workers AI folosesc agentul intern `knowledge-auditor`, versiunea
  aprobată, kill switch, limită de rată, idempotency atomic și Cost Guard. Cota
  furnizorului și politica agent/furnizor trebuie configurate/aprobate în
  controlul financiar existent. Migrația nu acordă buget și nu consumă AI.
- Accesul rămâne rezervat Super Admin prin politica server-side a centrului.
  Sursele vechi Knowledge/AVY Engine rămân consultabile separat, fără duplicare.

## Command Center

⌘K / Ctrl+K deschide paleta; săgețile selectează și Enter execută opțiunea afișată.

| Comandă | Rezultat |
|---|---|
| creează lead | Deschide formularul CRM existent, conform rolului. |
| arată facturile neachitate | Citește facturile invoiced/sent/partially_paid/overdue; valorile brute sunt etichetate explicit, nu prezentate ca sold restant. |
| deschide clientul Acme | Caută clientul, apoi deschide fișa și proiectele sale în paletă. |
| generează raportul august 2026 | Agregă facturile pe monedă, evenimentele analytics și execuțiile AI din luna UTC; salvează o ciornă în Documents Hub. |
| rulează scanarea WCAG | Verifică preliminar HTML-ul public avyron.ro: lang, title, prezența alt; salvează raportul în Documents Hub. |

Luna fără an folosește cea mai recentă apariție a acelei luni, iar opțiunea
afișează explicit YYYY-MM înainte de executare. Formatele YYYY-MM sunt acceptate.
Interogările financiare, fișele clienților, generarea rapoartelor și scanarea sunt
rezervate Super Admin, verificat și pe server.

Scanarea nu este un audit complet WCAG: nu testează contrast, tastatură sau DOM
randat dinamic. Destinațiile sunt fixe (`https://avyron.ro/` și `/en` în API), fără
redirecturi, cu timeout și corp limitat. Nicio adresă arbitrară nu este accesată.

## Domains & Digital Assets

- Proprietar Avyron/client, client obligatoriu pentru domeniile client, proiect,
  responsabil și expirare domeniu.
- Registrar, nameservere, înregistrări DNS, stare și expirare SSL, redirecturi și
  subdomenii în câmpuri distincte, plus valoare estimată și oportunități.
- SSL warning/expired și termenele apropiate intră în Azi. Datele sunt declarate
  de operator; salvarea nu modifică DNS/SSL/redirecturile la furnizor și nu
  pretinde verificare automată a acestora.

## Livrare și verificări

Noua schemă este migrația append-only `0026_documents_hub.sql`, dependentă de
migrația locală `0025`. Ambele trebuie aplicate înainte de publicarea noului API.
Verificări finalizate:

- 252/252 teste unitare/runtime; 26/26 teste ale centrelor reverificate după
  ajustările finale, inclusiv refuzul contradicțiilor între clienți/proiecte.
- 65/65 teste Playwright, inclusiv documente și citate AI la 390/1440 px,
  comenzi executate din tastatură și editarea înregistrărilor de domenii vechi.
  Capturile Documents Hub au fost inspectate vizual.
- Typecheck aplicație și Worker, ESLint și `git diff --check`: trecute.
- Build static + prerender, Pages și Worker: trecute; API dry-run: trecut.
- Audit D1: integritate validă, 136 tabele de aplicație inclusiv structurile FTS.
  Migrația 0026 a fost aplicată cu succes prin Wrangler exclusiv în D1 local.

Testele de integrare folosesc SQLite și bindings simulate; browserul folosește
fixtures. Nu au fost încărcate documente reale și nu au fost consumate modele AI
pe contul de producție în timpul validării.
