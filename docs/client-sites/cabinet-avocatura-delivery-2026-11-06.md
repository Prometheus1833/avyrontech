# Cabinet de Avocatură — livrare, 6 noiembrie 2026

## Publicare verificată

- URL principal: https://cabinet-avocatura.avyron.eu/
- Adresă tehnică: https://cabinet-avocatura-manuela.try-blue44.chatgpt.site/
- Audience public, păstrat.
- Sites project: `appgprj_6aee16d68fcc8191a51c7f828bcfab51`.
- Versiunea 9: `appgprj_6aee16d68fcc8191a51c7f828bcfab51~appgver_787c1513933c81918a1b963e34e62c14`.
- Deployment: `appgdep_6aee3f813b60819197434fa6d217915c`, `succeeded`.
- Sursă Sites: `16cbe99d153edd52f35e2edc28ce9bd20aacfba5`.
- Build runtime: `09691be414`.
- Surse AVYRON: `client-sites/cabinet-avocatura/`; PR #102, fără merge în main.

GitHub AVYRON și sursa Sites păstrează istorii Git distincte. Arborele site-ului și artefactul publicat sunt sincronizate; auditul brief-ului și documentația de livrare sunt păstrate suplimentar în AVYRON. Nu a fost folosit Lovable.

## Revizie față de brief

Audit complet: [cabinet-avocatura-brief-audit.md](cabinet-avocatura-brief-audit.md). Conține serviciile solicitate și distincția dintre exemplul de prezentare și funcțiile operaționale de configurat.

42 de pagini (21 RO + 21 EN), cu șase dosare de practică în fiecare limbă, trei ghiduri, consultații demonstrative, editor local și cinci pagini juridice/accesibilitate. Pagina principală rămâne sintetică. Conținutul extins este în paginile dedicate: servicii, analiză, documente utile, trei întrebări frecvente și ancore directe. Toate ariile și serviciile din brief sunt verificate automat, inclusiv Haga, paternitate, liberalități excesive, tulburarea posesiei și asistență pentru angajați și angajatori.

Indexul serviciilor orientează separat persoanele fizice și societățile. Articolele au cuprins, timp de lectură estimat din conținut și resurse oficiale relevante. Nu sunt atribuite titularei opinii personale neaprobate sau un portret generat.

Brandul este Cabinet de Avocatură Manuela Galuscan; localizarea București, România, fără sector. Textele, metadatele și LegalService/Service descriu reprezentare națională, fără adresă, barou sau acreditări inventate. Canonical/hreflang/sitemap folosesc domeniul AVYRON. BreadcrumbList reflectă ierarhia paginilor. Exemplul rămâne noindex pentru revizia cabinetului; nu se declară indexare sau poziționare confirmată.

## Design și interacțiuni

Source Serif 4 și Source Sans 3 sunt locale, cu licențe OFL. Hero-ul separă textul de imagine. Cardurile de practică au carusel continuu spre stânga, scroll/swipe nativ, drag, săgeți care aliniază cardul următor și tastatură. Mișcarea se oprește la apăsare, hover, focus, în afara ecranului, în tab ascuns și la mișcare redusă. Copiile de buclă nu intră în ordinea de tab/arborele accesibil. Efectul de profunzime este CSS 2.5D, fără WebGL.

Pe mobil, bara sticky urmărește geometria celor trei pași. Un singur scheduler deservește caruselul și progresul. Intrările scurte ale secțiunilor folosesc Web Animations ca îmbunătățire opțională: conținutul este vizibil implicit, iar mișcarea redusă/tabul ascuns anulează animațiile. Nu se folosește video.

Fotografiile noi de prezentare și consultații sunt native 1536 × 1024, optimizate AVIF/WebP, cu încadrări distincte desktop/mobil din aceeași sursă. Cadrul luminos: 18–82 KB AVIF; fundalul de consultații: 22–47 KB. Subsolul cinematic păstrat este nativ 1774 × 887. Imaginile sunt ilustrative, fără a reprezenta sediul real. Nu sunt 4K/8K mărite artificial. Prompturi: `assets/GENERATED-V2.md`, `GENERATED-V3.md`, `GENERATED-V4.md`.

CTA principal: „Solicitați o consultație”. Apel, WhatsApp și e-mail plutitoare apar pe landing, vertical pe desktop și într-o bară compactă pe mobil. Mesajele preiau domeniul și preferințele consultației, fără trimitere automată și fără rezervare implicită. Nu au fost trimise mesaje de verificare și nu a fost verificată existența contului WhatsApp pe număr.

Comutatorul afișează doar RO sau EN și deschide pagina echivalentă. Opțiunile de text 100/115/130%, contrast și resetare păstrează preferințe locale. În landscape, panoul are scroll propriu și înălțime limitată la viewport. Bannerele cu imagine folosesc alb pe negru și elimină fotografia în contrast ridicat.

## Verificări

- Build static, sintaxă JS, `git diff --check`.
- Validator: 42 pagini, 1.818 referințe interne, 468 resurse directe, toate srcset/fonturile, metadate, schema breadcrumb și ancore locale, paritate RO/EN și destinatari/drafturi de contact.
- Teste: calendar/editor și regenerare raster sigură, allowlist pentru domeniul consultației, context precompletat, carousel press/touch-hold, focus/reluare, săgeți/tastatură, buclă, offscreen/hidden idle, mișcare redusă, progres la scroll, acoperirea brief-ului, dosare extinse și fallback de animație/media.
- Toate cele 42 de pagini în browser la 320 × 568, normal și text 130% + contrast, fără overflow orizontal.
- 54 combinații pagină/dimensiune: home, index servicii, comercial, consultații, contact, articol; 320×568, 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024, 844×390 și 1440×1000. Fără overflow; selectul de consultație are minimum 16 px.
- Corecții observate: contrast în bannere și panoul de accesibilitate în landscape. La viewport 844×390, panoul este derulabil, cu top 89/bottom 369; toate opțiunile sunt accesibile.
- Compatibilitate pregătită prin safe-area/viewport-fit, controale native și fallback media. Nu se declară testare pe telefoane fizice iOS/Android sau certificarea fiecărei versiuni de browser. Browserul integrat nu expune injectarea gesturilor tactile fizice.
- 162 resurse publice comparate cu build-ul local, inclusiv toate cele 42 pagini și imaginile/fonturile/CSS/JS: identice. Este exclus din comparație numai scriptul de protecție Cloudflare injectat de infrastructură.
- Gzip: app 4.937 B, motion 3.175 B doar pe colecțiile de arii, editorial 752 B; CSS principal 9.899 B, motion 3.708 B, editorial 3.214 B. Intro decorativ 0,75 s, respectă mișcarea redusă.

Capturi și rapoarte: `output/brief-proof/` în workspace; versiunile anterioare au dovezi în `output/dns-proof/`, `refinement-proof/`, `carousel-proof/`. Nu reprezintă audit complet Core Web Vitals sau certificare WCAG. Nu se garantează un timp de încărcare universal sub 2 secunde.

Build-urile aplicației AVYRON nu au fost rulate local, deoarece site-ul este autonom și nu modifică aplicația/API-ul. CI verifică separat site-ul și aplicația; rezultatele trebuie raportate pentru commitul curent, nu pentru o revizie anterioară.

## DNS și limite operaționale

DNS a fost configurat anterior în zona avyron.eu din contul Cloudflare Avyron: CNAME DNS only spre custom-domains.chatgpt.site și cele două TXT emise de Sites. Configurația exactă este în `cabinet-avocatura-dns.json`. Custom domain `appgdom_6aee1b96ca348191a290fc6df5ea7007` a fost confirmat activ, cu SSL activ, în configurarea inițială. În această revizie nu s-a modificat DNS; publicarea și verificările HTTPS pe domeniu au reușit cu verificarea normală a certificatului.

Calendarul, plățile și editorul sunt demonstrative. Nu se rezervă intervale, nu se încasează onorarii și nu se emit confirmări automate. Nu există formular operațional de client sau upload de dosare. Articolele și paginile juridice necesită revizia cabinetului. Onorariile, anulările, procesatorul, calendarul real, notificările, CMS-ul autentificat, conturile cabinetului și oferta de hosting/mentenanță/SLA rămân pentru configurare și acorduri separate. Nu au fost inventate tarife, condiții comerciale ori certificări GDPR.

Politica de cookies descrie comportamentul Cloudflare observat pe hosting. `_headers` este pregătit pentru Pages, dar hostingul static Sites nu a fost observat aplicând toate antetele. Meta CSP restricționează object-src/base-uri/form-action; aceasta nu reprezintă o certificare de securitate sau conformitate a viitorului sistem de date personale.
