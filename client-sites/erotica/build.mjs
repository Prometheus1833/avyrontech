import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { books } from './books.mjs';
import { partnerOptions, questions, readingChoices } from './editorial.mjs';

const root = new URL('./', import.meta.url);
const dist = new URL('dist/', root);
const configuredNumber = process.env.EROTICA_WHATSAPP ?? '';
const phoneNumber = process.env.EROTICA_PHONE ?? '';
const contactEmail = process.env.EROTICA_EMAIL ?? '';
for (const [name, number] of [['EROTICA_WHATSAPP', configuredNumber], ['EROTICA_PHONE', phoneNumber]]) {
  if (number && !/^[1-9]\d{7,14}$/.test(number)) throw new Error(`${name}: format internațional, doar cifre (fără +).`);
}
if (contactEmail && !/^[a-z\d._+-]+@[a-z\d.-]+\.[a-z]{2,}$/i.test(contactEmail)) {
  throw new Error('EROTICA_EMAIL: introduceți o adresă de e-mail validă.');
}
const escape = (value) => String(value).replace(/[&<>"']/g, (letter) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[letter]));
const svg = (body, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const arrow = svg('<path d="M4 12h15m-6-6 6 6-6 6"/>');
const diagonal = svg('<path d="M6 18 18 6M7 6h11v11"/>');
const bookIcon = svg('<path d="M12 6c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v13"/>');
const whats = svg('<path d="M20.7 11.6a8.7 8.7 0 0 1-12.9 7.6L3 20.5l1.4-4.6a8.7 8.7 0 1 1 16.3-4.3Z"/><path d="M8.1 8.4c-.5.6-.4 1.8.6 3.2 1.3 1.8 3.8 3.2 5.1 3.1 1-.1 1.6-.7 1.7-1.4l-2.1-1.1-.8 1c-1.3-.6-2.3-1.5-2.9-2.6l.7-.8-1-2.1c-.5 0-.9.2-1.3.7Z"/>');
const phoneIcon = svg('<path d="M7 3H5a2 2 0 0 0-2 2 16 16 0 0 0 16 16 2 2 0 0 0 2-2v-2l-5-2-2 2a12 12 0 0 1-7-7l2-2-2-5Z"/>');
const mailIcon = svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>');
const star = svg('<path d="M12 1v22M1 12h22M5 5l14 14M19 5 5 19"/>', 'star');
const mark = svg('<path d="M12 21V9m0 3c0-3-5-6-9-6v11c4 0 7 2 9 4 2-2 5-4 9-4V6c-4 0-9 3-9 6Zm0-9v3M9 4l3 2 3-2"/>','mark');
const close = svg('<path d="m6 6 12 12M18 6 6 18"/>');
const menu = svg('<path d="M4 8h16M4 16h16"/>');
const navs = [['Acasă','index.html','home'],['Colecția','colectie.html','catalog'],['Despre','despre.html','about'],['Cum comanzi','comanda.html','order'],['Parteneri','parteneri.html','partners']];
const bookUrl = (b) => `carte-${b.slug}.html`;
const whatsURL = (draft) => `https://wa.me/${configuredNumber}?text=${encodeURIComponent(draft)}`;
const message = (title) => title
  ? `Bună! Mă interesează „${title}”. Îmi puteți spune dacă este disponibilă, care este prețul și cum se face livrarea? Mulțumesc!`
  : 'Bună! Aș dori să aflu mai multe despre cărțile disponibile și cum pot comanda. Mulțumesc!';
const partnerDraft = 'Bună! Reprezint o librărie, un club de lectură sau un organizator de evenimente și aș dori să discutăm o colaborare cu Erotica. Cum putem lua legătura? Mulțumesc!';
const whatsappLink = (label, style, draft, fallback) => configuredNumber
  ? `<a class="${style}" href="${escape(whatsURL(draft))}" target="_blank" rel="noopener noreferrer">${whats}<span>${label}</span></a>`
  : `<a class="${style}" href="${fallback}" data-draft="${escape(draft)}">${whats}<span>${label}</span></a>`;
const whatsapp = (label, style, title = '') => whatsappLink(label, style, message(title), 'comanda.html#mesaj');
const contactActions = [
  { id: 'apel', label: 'Sună', icon: phoneIcon, destination: phoneNumber && `tel:+${phoneNumber}`, unavailable: 'Numărul pentru apeluri va fi afișat când va fi confirmat.' },
  { id: 'email', label: 'Trimite e-mail', icon: mailIcon, destination: contactEmail && `mailto:${encodeURI(contactEmail)}`, unavailable: 'Adresa pentru mesaje va fi afișată când va fi confirmată.' },
];
const floatingContacts = `<nav class="float-contacts" aria-label="Contact rapid">
  ${contactActions.map(({id, label, icon, destination}) => `<a class="button float-cta" href="${escape(destination || `comanda.html#${id}`)}" title="${label}">${icon}<span>${label}</span></a>`).join('')}
  ${whatsapp('WhatsApp', 'button float-cta')}
</nav>`;

const footerGroups = [
  ['Explorează', [['Colecția de cărți', 'colectie.html', 'catalog'], ['Bestseller', 'index.html#bestseller'], ['Ghid de lectură', 'ghid-de-lectura.html', 'reading']]],
  ['Comenzi', [['Cum comanzi', 'comanda.html', 'order'], ['Întrebări frecvente', 'intrebari-frecvente.html', 'faq'], ['Livrare', 'intrebari-frecvente.html#livrare']]],
  ['Proiectul', [['Despre Erotica', 'despre.html', 'about'], ['Devino partener', 'parteneri.html', 'partners'], ['Cluburi de lectură', 'parteneri.html#cluburi']]],
];

const logo = `<a class="logo" href="index.html" aria-label="Erotica, acasă">${mark}<span>Erotica<span class="logo-dot">.</span></span></a>`;

const link = ([label, href, id], current) =>
  `<a href="${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`;

function footer(current, book) {
  let invitation = '<h2>Ai găsit o carte?</h2><p>Întreabă despre disponibilitate, preț și livrare.</p>';
  let action = whatsapp('Scrie pe WhatsApp', 'button button-gold');
  if (book) {
    invitation = `<h2>Te interesează această carte?</h2><p>Mesajul va include titlul „${escape(book.title)}”.</p>`;
    action = whatsapp('Întreabă pe WhatsApp', 'button button-gold', book.title);
  } else if (current === 'partners') {
    invitation = '<h2>Ai o propunere de colaborare?</h2><p>Prezintă organizația și ideea ta într-un mesaj.</p>';
    action = whatsappLink('Discută o colaborare', 'button button-gold', partnerDraft, 'parteneri.html#mesaj-colaborare');
  } else if (current === 'order' || current === 'faq') {
    invitation = '<h2>Ai ales un titlu?</h2><p>Deschide fișa cărții ca să pregătești un mesaj cu titlul ales.</p>';
    action = `<a class="button button-gold" href="colectie.html">Vezi colecția ${arrow}</a>`;
  }

  return `<footer class="site-foot">
    <div class="wrap">
      <div class="foot-invitation"><div>${invitation}</div>${action}</div>
      <div class="foot-directory">
        <div class="foot-brand">
          ${logo}
          <p>Romane și proză scurtă despre dorință, apropiere și intimitate.</p>
        </div>
        <nav class="foot-nav" aria-label="Navigare în subsol">
          ${footerGroups.map(([label, items]) => `<section><h3>${label}</h3><ul>${items.map((item) => `<li>${link(item, current)}</li>`).join('')}</ul></section>`).join('')}
        </nav>
      </div>
      <div class="foot-meta">
        <span>Erotica · Concept editorial</span>
        <a href="https://avyron.ro/">Design și dezvoltare <strong>AVYRON</strong></a>
        <a class="foot-top" href="#inceput">Sus <span aria-hidden="true">↑</span></a>
      </div>
    </div>
  </footer>`;
}

function shell({title, description, current, body, book}) {
  const nav = navs.map((item) => link(item, current)).join('');
  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#1e1117">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ro_RO">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/fonts.css">
<link rel="stylesheet" href="style.css">
<script src="app.js" defer></script>
</head>
<body>
<a class="skip" href="#continut">Sari la conținut</a>
<header class="site-head" id="inceput" tabindex="-1">
  <div class="wrap head-inner">
  ${logo}
  <button class="menu-button" type="button" aria-expanded="false" aria-controls="navigatie" hidden>${menu}<span>Meniu</span></button>
  <nav id="navigatie" aria-label="Navigare principală">${nav}</nav>
  </div>
</header>
<main id="continut">${body}</main>
${footer(current, book)}
${floatingContacts}
${configuredNumber ? '' : `<dialog id="dialog-comanda" aria-labelledby="titlu-dialog"><div class="dialog-inner">
 <form method="dialog"><button class="dialog-close" aria-label="Închide dialogul">${close}</button></form>
 <span class="eyebrow">MESAJ DEMONSTRATIV</span><h2 id="titlu-dialog">Mesaj pentru WhatsApp</h2>
 <p>Poți copia acest exemplu de mesaj. Numărul de contact va fi adăugat în versiunea finală.</p>
 <label for="draft">Mesaj precompletat</label><textarea id="draft" rows="5" readonly></textarea>
 <div class="dialog-actions"><button class="button button-wine" id="copy-draft" type="button">Copiază mesajul</button><span id="copy-status" role="status"></span></div>
 </div></dialog>`}
</body></html>`;
}

function cover(b, large = false) {
  return `<div class="cover-mat mat-${b.cover}${large ? ' cover-large' : ''}"><div class="cover cover-${b.cover}" aria-hidden="true">
    <img src="assets/${b.slug}.webp" alt="" width="460" height="747" ${large ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    <span class="cover-rule"></span><span class="cover-title">${escape(b.title)}</span><span class="cover-imprint">EROTICA</span>
  </div></div>`;
}

function cards(list) {
  return `<div class="book-grid">${list.map((b) => `<article class="book-card" data-category="${b.category}">
    ${cover(b)}
    <div class="book-meta"><span class="eyebrow">${b.type}</span><span aria-hidden="true">${diagonal}</span></div>
    <h3><a class="book-card-link" href="${bookUrl(b)}">${b.title}</a></h3>
    <p>${b.line}</p>
  </article>`).join('')}</div>`;
}

const intro = (eyebrow, title, desc) => `<div class="page-band"><div class="wrap page-intro"><p class="eyebrow kicker">${eyebrow}</p><h1>${title}</h1><p>${desc}</p></div></div>`;
const note = '<p class="demo-note">Titlurile, coperțile și fragmentele sunt ilustrative.</p>';
const featuredBook = books.find((book) => book.slug === 'cheia-de-chihlimbar');
const bestseller = `<section class="bestseller" id="bestseller" aria-labelledby="bestseller-title">
  <div class="wrap bestseller-grid">
    <div class="bestseller-copy">
      <h2 id="bestseller-title">Bestseller</h2>
      <h3>${featuredBook.title}</h3>
      <p>${featuredBook.description}</p>
      <a class="button button-wine" href="${bookUrl(featuredBook)}">Descoperă cartea ${arrow}</a>
      <p class="demo-note">Titlu ilustrativ ales pentru această secțiune.</p>
    </div>
    ${cover(featuredBook)}
  </div>
</section>`;

const recommendations = readingChoices.map((choice) => ({
  ...choice,
  book: books.find((book) => book.slug === choice.slug),
}));

const readingGuide = `<section class="reading-guide" aria-labelledby="reading-title">
  <div class="wrap">
    <div class="section-top"><h2 id="reading-title">Alege următoarea <em>lectură.</em></h2>
      <a class="text-link" href="ghid-de-lectura.html">Vezi ghidul ${diagonal}</a>
    </div>
    <ul class="reading-list">${recommendations.map(({id, occasion, teaser, book}) => `<li>
      <h3>${occasion}</h3>
      <p>${teaser}</p>
      <a class="text-link" href="ghid-de-lectura.html#${id}">${book.title} ${diagonal}</a>
    </li>`).join('')}</ul>
  </div>
</section>`;

const partnerPhoto = `<picture>
  <source media="(max-width: 720px)" srcset="assets/parteneri-640.webp">
  <img src="assets/parteneri-960.webp" alt="" width="960" height="640" loading="lazy" decoding="async">
</picture>`;

const partners = `<section class="partners" id="parteneri" tabindex="-1" aria-labelledby="partners-title">
  <div class="wrap partners-grid">
    ${partnerPhoto}
    <div class="partners-copy">
      <h2 id="partners-title">Devino <em>partener.</em></h2>
      <p>Ai o librărie, coordonezi un club de lectură sau organizezi evenimente literare? Spune-ne ce ai în minte, de la o selecție de titluri pentru librărie până la o întâlnire de lectură.</p>
      <div class="partner-actions">
        <a class="button button-gold" href="parteneri.html">Vezi opțiunile de colaborare ${arrow}</a>
        ${whatsappLink('Discută o colaborare', 'text-link', partnerDraft, 'parteneri.html#mesaj-colaborare')}
      </div>
    </div>
  </div>
</section>`;

const homepage = shell({
  current:'home', title:'Erotica — Cărți despre dorință și intimitate', description:'Descoperă o colecție de romane și proză scurtă despre dorință și intimitate. Explorează titlurile și vezi cum funcționează comanda prin WhatsApp.',
  body:`<section class="hero"><div class="wrap hero-grid">
   <div class="hero-copy"><p class="eyebrow kicker">COLECȚIE DE LITERATURĂ</p>
   <h1>Cărți despre<br>dorință <em>și intimitate.</em></h1>
   <p class="hero-lede">Romane și povestiri despre apropiere, lucruri nespuse și întâlniri care schimbă ceva.</p>
   <div class="hero-actions"><a class="button button-gold" href="colectie.html">Explorează colecția ${arrow}</a><a class="text-link" href="comanda.html">Cum comanzi ${diagonal}</a></div>
   <div class="hero-foot">${bookIcon}<span>Comenzi direct pe WhatsApp</span></div></div>
   <figure class="hero-art">
     <img src="assets/hero-840.webp" srcset="assets/hero-560.webp 560w, assets/hero-840.webp 840w, assets/hero-1120.webp 1120w" sizes="(max-width: 720px) 92vw, (max-width: 1260px) 48vw, 596px" width="840" height="1050" fetchpriority="high" alt="O carte cu copertă burgund și titlu auriu, lângă un trandafir uscat">
     <div class="art-frame"></div><figcaption><span>DIN COLECȚIE</span><a href="${bookUrl(books[0])}">Arta dorinței ${diagonal}</a></figcaption>
   </figure></div></section>
   ${bestseller}
   <section class="collection"><div class="wrap">
   <div class="section-top"><div><h2>Din colecție</h2></div><a class="text-link" href="colectie.html">Toate cărțile ${diagonal}</a></div>
   ${cards(books)}${note}</div></section>
   ${readingGuide}
   <section class="editorial"><div class="wrap editorial-grid"><div class="editorial-art" aria-hidden="true">${star}<span>E<span>.</span></span></div><div class="editorial-copy"><p class="eyebrow kicker">DESPRE EROTICA</p><h2>Ce rămâne <em>între rânduri.</em></h2><p>Erotica aduce în prim-plan felul în care literatura vorbește despre dorință: prin tăceri, apropieri și alegeri pe care personajele nu le înțeleg întotdeauna de la început.</p><a class="text-link" href="despre.html">Descoperă proiectul ${diagonal}</a></div></div></section>
   ${partners}`
});

const catalog = shell({
  current:'catalog', title:'Colecția de cărți | Erotica', description:'Explorează romanele și proza scurtă din colecția Erotica. Citește prezentările și fragmentele demonstrative.',
  body:`${intro('BIBLIOTECĂ','Colecția <em>Erotica.</em>','Romane și proză scurtă despre dorință, intimitate și lucrurile pe care le spunem prea târziu.')}
  <section class="collection catalog-page" aria-labelledby="catalog-heading"><div class="wrap">
  <h2 id="catalog-heading" class="visually-hidden">Titlurile colecției</h2>
  <div class="filters" hidden role="group" aria-label="Filtrează după gen">
  <button type="button" data-filter="all" aria-pressed="true">Toate</button><button type="button" data-filter="roman" aria-pressed="false">Romane</button><button type="button" data-filter="proza" aria-pressed="false">Proză scurtă</button>
  <span id="filter-status" role="status"></span></div>
  ${cards(books)}${note}</div></section>`
});

const details = books.map((b) => [bookUrl(b), shell({
  current:'book', book:b, title:`${b.title} | Erotica`, description:`${b.line} Citește prezentarea și un fragment ilustrativ.`,
  body:`<div class="wrap detail-wrap">
    <nav class="breadcrumb" aria-label="Traseu"><a href="index.html">Acasă</a><span aria-hidden="true">/</span><a href="colectie.html">Colecția</a><span aria-hidden="true">/</span><span aria-current="page">${b.title}</span></nav>
    <article class="detail-grid">
      ${cover(b, true)}
      <div class="detail-copy"><p class="eyebrow kicker">${b.type} · TITLU ILUSTRATIV</p><h1>${b.title}</h1><p class="detail-line">${b.line}</p><p>${b.description}</p>
      <details class="excerpt" id="fragment"><summary>Citește un fragment</summary><blockquote>${b.excerpt}</blockquote><p>Fragment ilustrativ.</p></details>
      ${whatsapp('Întreabă pe WhatsApp','button button-wine',b.title)}
      </div>
    </article>
  </div><section class="collection detail-more"><div class="wrap"><div class="section-top"><div><p class="eyebrow kicker">DIN ACEEAȘI COLECȚIE</p><h2>Alte lecturi</h2></div><a class="text-link" href="colectie.html">Toate cărțile ${diagonal}</a></div>${cards(books.filter((other) => other !== b))}</div></section>`
})]);

const about = shell({
 current:'about', title:'Despre proiectul editorial | Erotica', description:'Erotica este un concept editorial dedicat literaturii despre dorință, apropiere și intimitate.',
 body:`${intro('PROIECT EDITORIAL','Despre <em>Erotica.</em>','Un loc pentru cărți în care apropierea se construiește din gesturi mici, tăceri și cuvinte atent alese.')}
 <section class="editorial about-page"><div class="wrap editorial-grid"><div class="editorial-art" aria-hidden="true">${star}<span>E<span>.</span></span></div><div class="editorial-copy"><p class="eyebrow kicker">DIRECȚIA COLECȚIEI</p><h2>Intimitatea, <em>în literatură.</em></h2><p>Un roman are spațiu pentru o relație care se schimbă în ani. O povestire poate surprinde schimbarea într-o singură seară. Colecția propune ambele ritmuri și te lasă să alegi cu ce începi.</p><p>Acest site prezintă o direcție editorială. Titlurile, coperțile și fragmentele sunt exemple create pentru prototip.</p><a class="text-link" href="colectie.html">Explorează colecția ${diagonal}</a></div></div></section>`
});

const order = shell({
 current:'order', title:'Cum comanzi prin WhatsApp | Erotica', description:'Află cum alegi o carte și cum ceri pe WhatsApp informații despre disponibilitate, preț și livrare.',
 body:`${intro('COMENZI DIRECTE','Cum <em>comanzi.</em>','Alegi o carte, trimiți un mesaj pe WhatsApp și stabilești detaliile în conversație.')}
 <section class="collection order-page" aria-labelledby="order-heading"><div class="wrap">
 <h2 id="order-heading" class="visually-hidden">Pașii pentru comandă</h2>
 <ol class="steps"><li><span>01</span><h3>Alegi o carte</h3><p>Deschide fișa unui titlu din <a href="colectie.html">colecție</a> și citește descrierea sau fragmentul.</p></li><li><span>02</span><h3>Trimiți un mesaj</h3><p>Butonul WhatsApp pregătește un mesaj cu titlul cărții. Îl poți verifica înainte de trimitere.</p></li><li><span>03</span><h3>Confirmi detaliile</h3><p>Cere informații despre disponibilitate, preț și livrare direct în conversație.</p></li></ol>
 <div class="order-example" id="mesaj"><div><p class="eyebrow kicker">${configuredNumber ? 'CONTACT PENTRU COMENZI' : 'DEMONSTRAȚIE'}</p><h2>${configuredNumber ? 'Comenzi prin WhatsApp' : 'Încearcă mesajul'}</h2><p>${configuredNumber ? 'Număr de WhatsApp: +' + escape(configuredNumber) : 'În acest prototip poți vedea și copia un mesaj de exemplu. Comenzile vor fi activate după confirmarea numărului de WhatsApp.'}</p></div>
 ${configuredNumber ? whatsapp('Deschide WhatsApp','button button-wine') : `<button type="button" class="button button-wine" data-draft="${escape(message(''))}" hidden>${whats}<span>Vezi mesajul de exemplu</span></button><noscript><p>${message('')}</p></noscript>`}</div>
 ${configuredNumber ? '' : `<details class="excerpt partner-example" id="mesaj-partener"><summary>Mesaj pentru o colaborare</summary><blockquote>${escape(partnerDraft)}</blockquote><p><a href="parteneri.html">Vezi opțiunile de colaborare</a></p></details>`}
 ${contactActions.some(({destination}) => !destination) ? `<div class="contact-demo">${contactActions.filter(({destination}) => !destination).map(({id, label, unavailable}) => `<details class="excerpt" id="${id}"><summary>${label}</summary><p>${unavailable}</p></details>`).join('')}</div>` : ''}
 <p class="order-help"><a class="text-link" href="intrebari-frecvente.html">Întrebări despre preț, plată și livrare ${diagonal}</a></p>
 </div></section>`
});

const readingPage = shell({
  current:'reading',
  title:'Ghid de lectură | Erotica',
  description:'Alege între proză scurtă, un roman de weekend și o lectură pentru club. Descoperă de ce se potrivește fiecare carte și citește un fragment.',
  body:`${intro('RECOMANDĂRI', 'Ghid de <em>lectură.</em>', 'Alege după timpul pe care îl ai și după discuția pe care ai vrea s-o pornești. Fiecare recomandare duce la un fragment din carte.')}
    <section class="collection guide-page" aria-label="Recomandări de lectură">
      <div class="wrap">
        <nav class="section-nav" aria-label="Alege ocazia">
          ${recommendations.map(({id, occasion}) => `<a href="#${id}">${occasion}</a>`).join('')}
        </nav>
        ${recommendations.map(({id, occasion, recommendation, prompt, book}) => `<article class="guide-entry" id="${id}">
          ${cover(book)}
          <div>
            <p class="eyebrow kicker">${occasion}</p>
            <h2>${book.title}</h2>
            <p>${recommendation}</p>
            <p class="guide-prompt"><strong>Întrebare de lectură</strong> ${prompt}</p>
            <a class="button button-wine" href="${bookUrl(book)}#fragment">Citește fragmentul ${arrow}</a>
          </div>
        </article>`).join('')}
        ${note}
      </div>
    </section>`,
});

const partnersPage = shell({
  current:'partners',
  title:'Parteneriate pentru librării, cluburi și evenimente | Erotica',
  description:'Vezi cum poți propune o colaborare cu Erotica pentru o librărie, un club de lectură sau un eveniment literar.',
  body:`${intro('COLABORĂRI', 'Devino <em>partener.</em>', 'Spune-ne unde ai vrea să ajungă cărțile Erotica. Alege tipul de colaborare și pornește de la un mesaj potrivit propunerii tale.')}
    <section class="collection partner-page" aria-labelledby="partner-types">
      <div class="wrap">
        <div class="partner-lead">
          <div><h2 id="partner-types">Cum putem colabora</h2><p>O selecție de titluri, o lectură de grup sau un eveniment pornesc de la detalii diferite. Trimite-ne câteva informații despre proiectul tău ca să putem discuta concret.</p></div>
          ${partnerPhoto}
        </div>
        <div class="partner-options">
          ${partnerOptions.map(({id, title, description, draft, action}) => `<article id="${id}">
            <h3>${title}</h3>
            <p>${description}</p>
            ${whatsappLink(action, 'button button-wine', draft, `#mesaj-${id}`)}
            ${configuredNumber ? '' : `<details class="excerpt" id="mesaj-${id}"><summary>Vezi mesajul de exemplu</summary><blockquote>${escape(draft)}</blockquote></details>`}
          </article>`).join('')}
        </div>
        ${configuredNumber ? '' : `<details class="excerpt partner-example" id="mesaj-colaborare"><summary>Mesaj general de colaborare</summary><blockquote>${escape(partnerDraft)}</blockquote></details>`}
      </div>
    </section>`,
});

const faqPage = shell({
  current:'faq',
  title:'Întrebări frecvente despre cărți și comenzi | Erotica',
  description:'Află cum întrebi despre disponibilitate, preț, plată și livrare sau cum ceri mai multe cărți în același mesaj.',
  body:`${intro('COMENZI PRIN WHATSAPP', 'Întrebări <em>frecvente.</em>', 'Răspunsuri despre alegerea cărților și detaliile pe care le poți stabili înainte de confirmarea unei comenzi.')}
    <section class="collection faq-page" aria-label="Răspunsuri despre comenzi">
      <div class="wrap faq-grid">
        <div class="faq-list">
          ${questions.map(([id, question, answer]) => `<details class="faq-item" id="${id}"${id === 'disponibilitate' ? ' open' : ''}>
            <summary>${question}</summary><p>${answer}</p>
          </details>`).join('')}
        </div>
        <aside class="faq-aside"><h2>Cum comanzi</h2><p>Vezi pașii și încearcă un mesaj înainte să alegi ce vrei să întrebi.</p>
          <a class="text-link" href="comanda.html">Vezi pașii comenzii ${diagonal}</a>
        </aside>
      </div>
    </section>`,
});

await rm(dist, {recursive:true, force:true});
await mkdir(new URL('assets/', dist), {recursive:true});
const pages = [
  ['index.html', homepage],
  ['colectie.html', catalog],
  ['despre.html', about],
  ['comanda.html', order],
  ['ghid-de-lectura.html', readingPage],
  ['parteneri.html', partnersPage],
  ['intrebari-frecvente.html', faqPage],
  ...details,
];
await Promise.all(pages.map(([file, markup]) => writeFile(new URL(file,dist), markup)));
for (const file of ['style.css', 'app.js', 'robots.txt', '_headers']) await cp(new URL(file,root), new URL(file,dist));
for (const file of await readdir(new URL('assets/',root))) if (!file.endsWith('.md')) await cp(new URL(`assets/${file}`,root), new URL(`assets/${file}`,dist));
console.log(`Erotica: ${pages.length} pagini statice în ${fileURLToPath(dist)}`);
