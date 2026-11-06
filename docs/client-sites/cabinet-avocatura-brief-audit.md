# Cabinet de Avocatură Manuela Galuscan — auditul brief-ului

Revizie: 6 noiembrie 2026. Sursa cerințelor este solicitarea clientei și completările utilizatorului din conversație. Documentul separă exemplul public de serviciile operaționale care necesită configurare și acorduri reale.

| Cerință | Implementare în exemplul de prezentare | Ce rămâne pentru lansarea operațională |
| --- | --- | --- |
| Ton elegant, aerisit, profesional, fără comercial excesiv | Pagină principală sintetică, tipografie Source Serif 4 / Source Sans 3 locală, paletă bleumarin/ivoriu, explicații factuale și CTA de solicitare, fără rezultate garantate | Revizia finală a textelor de către cabinet |
| Peste 27 de ani de experiență | Vizibil în hero, prezentare și subsol; fără an de intrare în profesie, premii sau acreditări inventate | Confirmarea identității profesionale și a datelor legale |
| Denumire și localizare | Cabinet de Avocatură Manuela Galuscan; București, România; reprezentare în întreaga țară; fără Sector 6 | Adresa profesională exactă doar după confirmare |
| Persoane fizice și societăți | Orientare pe categorii în indexul serviciilor și explicații în paginile dedicate | Confirmarea condițiilor de acceptare a fiecărei solicitări |
| Dreptul familiei | Divorț inclusiv extraneitate; autoritate părintească, locuința copilului și relații personale; întreținere; paternitate; adopție; bunuri comune; protecție; răpire internațională și Convenția de la Haga | Evaluarea fiecărei cauze, fără răspuns juridic automat |
| Succesiuni și moșteniri | Proceduri, litigii, partaj, reducțiunea liberalităților excesive, anularea certificatelor | Analiză individuală și documente convenite |
| Drept imobiliar și proprietate | Revendicare, uzucapiune, servituți, grănițuire, partaj, ieșire din indiviziune, evacuare, apărarea și tulburarea posesiei | Analiză individuală |
| Drept civil și creanțe | Litigii, pretenții, răspundere contractuală/delictuală, anulare, rezoluțiune/reziliere, recuperare civilă/comercială | Analiză individuală |
| Dreptul muncii | Concedieri, sancțiuni, salarii, negociere, încetare; angajați și angajatori | Analiză individuală |
| Comercial și consultanță | Redactare/verificare, negociere/executare, consultanță societăți, litigii comerciale | Cadrul și întinderea colaborării |
| Acasă sintetic, dezvoltare pe pagini separate | Șase dosare de practică RO/EN, servicii, abordare, pregătire și întrebări; navigare directă la secțiuni | Revizie editorială |
| Acasă / Despre / Arii / Programări / Articole / Contact | Navigație completă, RO/EN pe pagini echivalente, breadcrumbs vizibile și structurate | Confirmarea arhitecturii comerciale finale |
| Estimare până la 5 pagini și arii/articole dedicate | Exemplul extins are 21 rute pe limbă, 42 în total. Meniul și paginile dedicate cerute depășesc estimarea inițială | Numărul de pagini din ofertă trebuie definit explicit; nu este presupus un buget de 5 pagini pentru toate rutele |
| Articole publicabile ulterior | Trei ghiduri informative RO/EN, cuprins, resurse oficiale unde sunt relevante; editor local de demonstrație | CMS securizat cu autentificare, revizii, preview, publicare, export și acces deținut de cabinet |
| Consultații online cu durată și cost | Interfață de preferințe, domeniu, format, durată și calendar ilustrativ; mesaj contextual | Durate, onorarii și disponibilitate reale, cont de calendar pe numele cabinetului |
| Plată anticipată și confirmare automată | Nu sunt simulate încasări sau confirmări reale. UI spune explicit că nu există rezervare/plată | Procesator configurat, checkout găzduit, webhook-uri semnate/idempotente, blocare interval, reconciliere și e-mail tranzacțional verificate |
| Administrare calendar și tarife | Ciornă și export local demonstrativ, fără backend public de scriere | Administrare autentificată, roluri, MFA, manual și predare |
| Anulare și reprogramare | Pagină distinctă, model fără termene/penalități inventate | Politica aprobată a cabinetului, afișată și acceptată înainte de plata reală |
| GDPR și securitate | Minimizare: fără formular de dosar, cont client, documente sau carduri; preferințe locale; canale externe explicate; pagini juridice de lucru | Identitatea operatorului, temeiuri, retenție, furnizori, acorduri, transferuri, drepturi și securitate revizuite înainte de activarea colectării |
| Cost total, termen, revizii, texte, SEO, modul separat, hosting/licențe/SLA | Implementarea și SEO sunt documentate; nu sunt afișate tarife sau condiții comerciale neaprobate | Ofertă separată cu valori, termene, revizii incluse, redactare, costuri recurente, caracterul opțional/obligatoriu al mentenanței și SLA convenit |
| Domeniu, hosting și conturi pe numele cabinetului | Exemplu pe subdomeniul AVYRON, DNS/HTTPS conectate; sursă în repo AVYRON și Sites | Domeniul final, hostingul, CMS-ul, calendarul și procesatorul pe numele cabinetului, acces deplin și procedură de restaurare la predare |
| Inspirație Oana / LEX / Rainer | Structură și ierarhie profesională, servicii distincte, identitate personală; fără copierea textelor, imaginilor sau codului | Verificarea finală cu clienta |
| Mobil, iOS și Android | Layout responsiv, safe-area, formulare cu text de cel puțin 16 px, scroll tactil nativ, fallback-uri media/animation, fără video/WebGL obligatoriu | QA pe dispozitive fizice și versiunile finale de Safari/Chrome înainte de acceptanță; testul într-un viewport nu certifică fiecare sistem de operare |

## Principii editoriale și SEO

Descrierile sunt specifice fiecărei arii și includ București / reprezentare națională fără repetarea artificială a cuvintelor-cheie. Canonical, hreflang, sitemap și datele LegalService/Service sunt păstrate. BreadcrumbList reflectă structura paginilor. FAQ-urile sunt pentru orientarea vizitatorului, fără promisiunea unor rezultate speciale în Google. Nu sunt inventate adresă, barou, număr profesional, recenzii sau autorat personal al articolelor neaprobate.

Exemplul rămâne `noindex` pentru revizia cabinetului. Pregătirea tehnică SEO nu reprezintă indexare sau poziționare confirmată.

## Repere verificate

- [Google Search Central — BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [MDN — Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)
- [WebKit — Web Animations](https://webkit.org/blog/10266/web-animations-in-safari-13-1/)
- [HCCH — Convenția din 1980](https://www.hcch.net/en/instruments/conventions/specialised-sections/child-abduction)
- Exemple consultate: [LEX-AVOCAT](https://lex-avocat.ro/), [Andreea Rainer](https://www.andreearainerlaw.ro/). Oana Law Office a fost studiat anterior; recitirea din această revizie a întâmpinat timeout. Pagina UNBR cu hotărârea din 2021 a returnat 403 la recitire; nu se pretinde că exemplul are o certificare de conformitate profesională.
