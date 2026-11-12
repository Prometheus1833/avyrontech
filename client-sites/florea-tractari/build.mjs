import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const source = new URL('./site/', import.meta.url);
const offline = process.argv.includes('--offline');
const output = new URL(offline ? './dist-offline/' : './dist/', import.meta.url);
const configuration = await readFile(new URL('./contact.local.json', import.meta.url), 'utf8')
  .then(JSON.parse)
  .catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return {};
  });

const phone = process.env.FLOREA_PHONE || configuration.phone;
if (phone && !/^\+407\d{8}$/.test(phone)) {
  throw new Error('FLOREA_PHONE trebuie să fie un număr mobil românesc în format internațional.');
}
const localPhone = phone ? ('0' + phone.slice(3)).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : '';
const whatsapp = phone ? `https://wa.me/${phone.slice(1)}` : '';
const contactPage = 'contact.html';
const demoOrigin = 'https://demo8.avyron.eu/';
const shareImage = new URL('assets/florea-tractari-preview.jpg', demoOrigin).href;
const shareImageAlt = 'Autoplatformă albă cu girofar, pe un drum la marginea Bucureștiului';
const message = 'Bună! Am nevoie de o platformă auto. Vă pot trimite locația și detaliile mașinii?';
const callHref = phone ? `tel:${phone}` : contactPage;
const whatsappHref = whatsapp ? `${whatsapp}?text=${encodeURIComponent(message)}` : contactPage;

const pages = {
  home: {
    path: 'index.html', label: 'Acasă',
    title: 'Tractări auto București–Ilfov și transport național | Florea Tractări',
    shareTitle: 'Florea Tractări | Platformă auto în toată România',
    shareDescription: 'Tractări auto în București și Ilfov. Transport pe platformă oriunde în România, pentru mașini imobilizate sau curse programate.',
    description: 'Florea Tractări. Platformă auto pentru mașini imobilizate în București și Ilfov și transport auto pe platformă în toată România. Solicitări prin telefon sau WhatsApp.',
  },
  towing: {
    path: 'tractari-auto.html', label: 'Tractări auto',
    title: 'Tractări auto pe platformă în București și Ilfov | Florea Tractări',
    description: 'Ai o mașină imobilizată sau avariată? Cere tractare auto pe platformă în București și Ilfov. Comunică locația, starea mașinii și destinația.',
  },
  transport: {
    path: 'transport-auto.html', label: 'Transport național',
    title: 'Transport auto pe platformă în România | Florea Tractări',
    description: 'Transport auto pe platformă între localități din România. Trimite punctele de preluare și predare, modelul mașinii și data dorită.',
  },
  area: {
    path: 'arie-acoperire.html', label: 'Acoperire',
    title: 'Arie de acoperire pentru tractări auto | București, Ilfov și România',
    description: 'Tractări în București și Ilfov, cu punct de plecare în Gruiu. Solicită transport auto pe platformă între localități din România.',
  },
  contact: {
    path: contactPage, label: 'Contact',
    title: 'Contact pentru tractări auto și transport | Florea Tractări',
    description: 'Cere o platformă auto prin telefon sau pregătește pe WhatsApp o solicitare cu locația, destinația și datele mașinii.',
  },
};

const icons = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 18.1 18.1 0 0 1-7.9-2.8 17.7 17.7 0 0 1-5.4-5.4 18.1 18.1 0 0 1-2.8-8A2 2 0 0 1 5.7 3h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 2.1L9.3 11a14.5 14.5 0 0 0 4.7 4.7l1.4-1.3a2 2 0 0 1 2.1-.5l2.8.5a2 2 0 0 1 1.7 2.5Z"/>',
  whatsapp: '<path fill="currentColor" stroke="none" d="M12.03 2A9.93 9.93 0 0 0 3.45 17L2 22l5.14-1.35A9.95 9.95 0 1 0 12.03 2Zm0 18.23c-1.54 0-3.04-.42-4.34-1.2l-.31-.19-3.05.8.81-2.96-.2-.32a8.27 8.27 0 1 1 7.09 3.87Zm4.54-6.18c-.25-.12-1.48-.72-1.71-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.15.17-.29.19-.54.06-.25-.12-1.05-.38-2-1.23-.74-.65-1.24-1.46-1.38-1.71-.15-.25-.02-.38.11-.5l.37-.43c.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.22.9 2.4 1.02 2.57.12.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.52.59.19 1.13.16 1.56.1.47-.07 1.48-.61 1.69-1.19.2-.59.2-1.08.14-1.19-.06-.1-.22-.16-.48-.29Z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  diagonal: '<path d="M6 18 18 6M7 6h11v11"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  road: '<path d="M8 3 3 21M16 3l5 18M12 3v3m0 4v4m0 4v3"/>',
  truck: '<path d="M3 8v8h2m4 0h5m5 0h2v-5l-3-4h-4v9M3 12h11"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
}

const mark = '<svg class="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path fill="currentColor" d="M19 7h26l-6 8H13l6-8Zm-9 12h23l-6 8H4l6-8ZM3 31h13L9 41H3V31Z"/></svg>';
const brand = `<a class="brand" href="index.html" aria-label="Florea Tractări, acasă">${mark}<span><strong>FLOREA</strong> <span>TRACTĂRI</span></span></a>`;
const callButton = (label = localPhone || 'Sună acum') => `<a class="button button-primary" href="${callHref}">${icon('phone')}${label}</a>`;
const waButton = (label = 'Scrie pe WhatsApp') => `<a class="button button-outline" href="${whatsappHref}">${icon('whatsapp')}${label}</a>`;
const linkArrow = (href, label) => `<a class="text-link" href="${href}">${label}${icon('arrow')}</a>`;
const eyebrow = (label) => `<p class="eyebrow">${label}</p>`;

function nav(active) {
  const links = Object.entries(pages).map(([key, page]) =>
    `<a href="${page.path}"${key === active ? ' aria-current="page"' : ''}>${page.label}</a>`).join('');
  return `<header class="masthead">
    <div class="wrap masthead-inner">
      ${brand}
      <nav class="desktop-nav" aria-label="Navigare principală">${links}</nav>
      <a class="header-call" href="${callHref}">${icon('phone')}<span>Sună acum</span></a>
      <details class="mobile-menu">
        <summary aria-label="Meniu">${icon('menu')}</summary>
        <nav aria-label="Navigare principală">${links}</nav>
      </details>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wrap footer-main">
      <div>${brand}<p>Tractări auto în București și Ilfov.<br>Transport pe platformă în România.</p></div>
      <nav aria-label="Pagini utile">
        <a href="${pages.towing.path}">Tractări auto</a><a href="${pages.transport.path}">Transport național</a><a href="${pages.area.path}">Arie de acoperire</a>
      </nav>
      <div class="footer-contact"><p>Gruiu, județul Ilfov</p>
        <a href="${callHref}">${icon('phone')}${localPhone || 'Contact'}</a>
        <a href="${whatsappHref}">${icon('whatsapp')}WhatsApp</a>
      </div>
    </div>
    <div class="wrap footer-end"><span>Florea Tractări</span><span>Concept vizual realizat de AVYRON</span></div>
  </footer>
  <div class="float-actions" role="group" aria-label="Contact rapid">
    <a class="float-call" href="${callHref}" aria-label="Sună Florea Tractări">${icon('phone')}</a>
    <a class="float-whatsapp" href="${whatsappHref}" aria-label="Scrie Florea Tractări pe WhatsApp">${icon('whatsapp')}</a>
  </div>`;
}

function heroImage() {
  return `<picture class="hero-media">
    <source media="(max-width: 760px)" type="image/avif" srcset="assets/platforma-mobil-720.avif 720w, assets/platforma-mobil-1080.avif 1080w" sizes="100vw">
    <source media="(max-width: 760px)" type="image/webp" srcset="assets/platforma-mobil-720.webp 720w, assets/platforma-mobil-1080.webp 1080w" sizes="100vw">
    <source type="image/avif" srcset="assets/platforma-1280.avif 1280w, assets/platforma-1920.avif 1920w" sizes="100vw">
    <img src="assets/platforma-1280.webp" srcset="assets/platforma-1280.webp 1280w, assets/platforma-1920.webp 1920w" sizes="100vw"
      width="1920" height="800" fetchpriority="high" alt="Autoplatformă albă cu rampă și girofar pe un drum la marginea Bucureștiului">
  </picture>`;
}

const scenes = {
  incarcare: { width: 1440, height: 960, alt: 'Autoturism argintiu în curs de încărcare pe o platformă auto' },
  transport: { width: 1440, height: 960, alt: 'Autoturism fixat pe o platformă albă pregătită pentru transport' },
  traseu: { width: 1440, height: 810, alt: 'Platformă cu un autoturism transportat pe autostradă, la poalele munților' },
};

function scene(name, { eager = false, full = false } = {}) {
  const { width, height, alt } = scenes[name];
  const sizes = full ? '100vw' : '(max-width: 760px) 95vw, (max-width: 1280px) 49vw, 620px';
  const srcset = (format) => [560, 960, 1440].map((size) => `assets/${name}-${size}.${format} ${size}w`).join(', ');
  return `<picture class="scene">
    <source type="image/avif" srcset="${srcset('avif')}" sizes="${sizes}">
    <img src="assets/${name}-960.webp" srcset="${srcset('webp')}" sizes="${sizes}" width="${width}" height="${height}"
      ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} alt="${alt}">
  </picture>`;
}

const questions = [
  ['Cât costă o tractare auto?', 'Estimarea depinde de distanță, de tipul vehiculului și de condițiile de încărcare. Trimite adresele de preluare și predare, modelul mașinii și câteva detalii despre starea ei.'],
  ['Ce detalii trimit pe WhatsApp?', 'Trimite locația sau un pin pe hartă, destinația, marca și modelul mașinii. Spune dacă se poate deplasa pe roți și dacă accesul este dificil. Poți atașa fotografii direct în conversație.'],
  ['Pot programa un transport în alt județ?', 'Da. Spune de unde trebuie preluată mașina, unde trebuie să ajungă și în ce zi. Disponibilitatea se stabilește pentru traseul și data cerute.'],
  ['Mașina se află într-o parcare cu acces limitat. Ce fac?', 'Precizează înălțimea de acces, locul în care e parcată mașina și dacă poate fi mutată. Aceste detalii ajută la evaluarea posibilității de preluare.'],
];

function faq(items = questions) {
  return `<section class="section faq light">
    <div class="wrap faq-grid">
      <div>${eyebrow('Întrebări frecvente')}<h2>Înainte de plecare.</h2><p>Informațiile care ajută la stabilirea preluării și a traseului.</p></div>
      <div class="faq-items">${items.map(([question, answer]) =>
        `<details><summary><span>${question}</span>${icon('plus')}</summary><p>${answer}</p></details>`).join('')}</div>
    </div>
  </section>`;
}

function finalCta() {
  return `<section class="contact-band">
    <div class="wrap band-inner">
      <div>${eyebrow('Solicită o platformă')}<h2>Spune-ne unde e mașina.</h2><p>Transmite locația, destinația și starea vehiculului.</p></div>
      <div class="actions">${callButton()}${waButton('WhatsApp')}</div>
    </div>
  </section>`;
}

const steps = [
  ['Comunici locația', 'Sună sau trimite un pin pe WhatsApp și spune ce s-a întâmplat cu mașina.'],
  ['Stabilim traseul', 'Indici destinația. Discutăm condițiile de preluare, disponibilitatea și costul.'],
  ['Mașina pleacă pe platformă', 'După confirmare, vehiculul este preluat și transportat la adresa stabilită.'],
];

function processSection() {
  return `<section class="section process light"><div class="wrap">
    ${eyebrow('Cum funcționează')}<h2>De la locație la destinație.</h2>
    <ol class="step-grid">${steps.map(([title, description], i) =>
      `<li><span class="step-number" aria-hidden="true">0${i + 1}</span><h3>${title}</h3><p>${description}</p></li>`).join('')}</ol>
  </div></section>`;
}

function home() {
  return `<section class="hero">
    ${heroImage()}
    <div class="wrap hero-inner">
      ${eyebrow('Platformă auto · București și Ilfov')}
      <h1>Tractări auto <span>în toată România.</span></h1>
      <p class="hero-intro">Intervenim în București și Ilfov și transportăm mașini pe platformă oriunde în țară.</p>
      <div class="actions">${callButton()}${waButton()}</div>
    </div>
    <span class="hero-road" aria-hidden="true"></span>
  </section>
  <div class="service-strip">
    <div class="wrap strip-grid">
      <div>${icon('pin')}<span><strong>București și Ilfov</strong><small>Preluări locale</small></span></div>
      <div>${icon('truck')}<span><strong>Transport pe platformă</strong><small>Până la adresa indicată</small></span></div>
      <div>${icon('road')}<span><strong>Curse în toată România</strong><small>Transport între localități</small></span></div>
    </div>
  </div>
  <section class="section light services">
    <div class="wrap">
      <div class="section-heading">
        <div>${eyebrow('Servicii')}<h2>Tractare și transport auto.</h2></div>
        <p>O platformă pentru mașina rămasă pe drum sau pentru un transport programat.</p>
      </div>
      <div class="service-grid">
        <article class="service-card">
          <a href="${pages.towing.path}" class="card-link">
            ${scene('incarcare')}
            <div class="card-copy"><div><p class="card-label">București · Ilfov</p><h3>Tractări auto</h3><p>Preluăm mașina imobilizată sau avariată și o ducem la service ori la adresa aleasă.</p></div><span class="card-arrow">${icon('diagonal')}</span></div>
          </a>
        </article>
        <article class="service-card">
          <a href="${pages.transport.path}" class="card-link">
            ${scene('transport')}
            <div class="card-copy"><div><p class="card-label">În toată România</p><h3>Transport auto național</h3><p>Planificăm preluarea și predarea mașinii pe traseul de care ai nevoie.</p></div><span class="card-arrow">${icon('diagonal')}</span></div>
          </a>
        </article>
      </div>
    </div>
  </section>
  <section class="area-banner">
    ${scene('traseu', { full: true })}
    <div class="wrap area-inner">
      ${eyebrow('Arie de acoperire')}
      <h2>Din Ilfov,<br>în toată țara.</h2>
      <p>Plecăm din Gruiu și preluăm mașini din București și Ilfov. Pentru distanțe mai lungi, stabilim cursa după punctele de preluare și predare.</p>
      ${linkArrow(pages.area.path, 'Vezi aria de acoperire')}
    </div>
  </section>
  ${processSection()}${faq()}${finalCta()}`;
}

function pageHero(section, headline, introduction, photo) {
  return `<section class="inner-hero">
    <div class="wrap inner-grid">
      <div class="inner-copy">
        ${eyebrow(section)}<h1>${headline}</h1>
        <p>${introduction}</p>
        <div class="actions">${callButton()}${waButton()}</div>
      </div>
      ${scene(photo, { eager: true })}
    </div>
  </section>`;
}

function guidance(title, introduction, items) {
  return `<section class="section light"><div class="wrap info-grid">
    <div>${eyebrow('Detalii de preluare')}<h2>${title}</h2><p>${introduction}</p></div>
    <ul class="check-list">${items.map(([heading, body]) =>
      `<li>${icon('check')}<div><h3>${heading}</h3><p>${body}</p></div></li>`).join('')}</ul>
  </div></section>`;
}

function towing() {
  return pageHero('București și Ilfov', 'Tractări auto <span>pe platformă.</span>',
    'Dacă mașina a rămas imobilizată, contactează-ne pentru preluare. O putem duce la service, acasă sau la adresa pe care o indici.', 'incarcare')
    + guidance('Ce ne spui la primul contact.', 'Cu aceste detalii putem evalua preluarea și îți putem comunica o estimare pentru traseul cerut.', [
      ['Locația exactă', 'Trimite adresa, un reper sau un pin pe hartă. Spune dacă ești într-o parcare, pe un drum local sau pe autostradă.'],
      ['Mașina și starea ei', 'Spune marca, modelul și dacă roțile se mișcă. Menționează eventualele avarii care pot îngreuna încărcarea.'],
      ['Destinația', 'Spune-ne adresa de predare sau numele service-ului unde vrei să ajungă mașina.'],
    ]) + faq([questions[0], questions[1], questions[3]]) + finalCta();
}

function transport() {
  return pageHero('Curse în România', 'Transport auto <span>la nivel național.</span>',
    'Ai nevoie să muți o mașină între localități? Trimite ruta și data dorită pentru a discuta transportul pe platformă.', 'transport')
    + guidance('Planificăm preluarea și predarea.', 'Poți solicita o cursă din București sau Ilfov către alt județ ori poți verifica disponibilitatea pentru un traseu între alte localități.', [
      ['Ruta completă', 'Trimite cele două localități și, dacă le cunoști, adresele de încărcare și descărcare.'],
      ['Data și accesul', 'Menționează intervalul dorit și dacă vehiculul se află într-un spațiu îngust sau cu acces restricționat.'],
      ['Tipul mașinii', 'Precizează modelul și starea vehiculului pentru a discuta condițiile de încărcare.'],
    ]) + faq([questions[2], questions[0]]) + finalCta();
}

function area() {
  const zones = [
    ['București', 'Solicită o preluare din oraș și indică sectorul, strada și destinația.'],
    ['Ilfov', 'Punctul de plecare este Gruiu. Trimite locația exactă dacă ești într-o comună sau pe un drum județean.'],
    ['România', 'Pentru transport între județe, spune localitățile, data dorită și starea vehiculului.'],
  ];
  return pageHero('Arie de acoperire', 'București–Ilfov. <span>Curse naționale.</span>',
    'Florea Tractări pornește din Gruiu, Ilfov. Pentru o preluare locală sau un transport în alt județ, contactează-ne cu detaliile traseului.', 'traseu')
    + `<section class="section light"><div class="wrap">
      ${eyebrow('Zone deservite')}<h2>Unde preluăm mașina.</h2>
      <div class="zone-grid">${zones.map(([name, description], i) => `<article><div class="zone-icon">${icon(i === 2 ? 'road' : 'pin')}</div><h3>${name}</h3><p>${description}</p></article>`).join('')}</div>
      ${linkArrow(pages.transport.path, 'Detalii despre transportul național')}
    </div></section>` + finalCta();
}

function contact() {
  return `<section class="inner-hero contact-hero">
    <div class="wrap inner-grid">
      <div class="inner-copy">
        ${eyebrow('Contact · Gruiu, Ilfov')}
        <h1>Solicită <span>o platformă auto.</span></h1>
        <p>Sună pentru o preluare sau trimite detaliile pe WhatsApp. Spune unde este mașina și unde vrei să ajungă.</p>
        ${phone ? `<div class="actions">${callButton()}${waButton()}</div>` : '<p>Contactele se configurează în versiunea de prezentare.</p>'}
      </div><div class="lane-pattern" aria-hidden="true"></div>
    </div>
  </section>
  <section class="section light contact-section">
    <div class="wrap info-grid">
      <div>${eyebrow('Solicitare de transport')}<h2>Pregătește detaliile.</h2>
        <p>După deschiderea conversației poți adăuga un pin de locație sau fotografii.</p>
        <ul class="contact-tips"><li>${icon('pin')}Punctul de preluare</li><li>${icon('road')}Destinația dorită</li><li>${icon('truck')}Starea mașinii și accesul la ea</li></ul>
      </div>
      ${phone ? `<form class="contact-form" data-whatsapp="${whatsapp}" hidden>
        <label for="pickup">Locația de preluare</label>
        <input id="pickup" name="pickup" required maxlength="140" placeholder="Ex. Gruiu, Ilfov">
        <label for="destination">Destinația</label>
        <input id="destination" name="destination" required maxlength="140" placeholder="Ex. Service în Voluntari">
        <label for="vehicle">Mașina și situația</label>
        <textarea id="vehicle" name="vehicle" rows="3" required maxlength="500" placeholder="Ex. Opel Astra, nu mai pornește"></textarea>
        <button type="submit" class="button button-primary">${icon('whatsapp')}Deschide WhatsApp</button>
        <small>Mesajul se trimite din WhatsApp după ce îl verifici.</small>
      </form><noscript><div class="contact-form">${waButton()}</div></noscript>` : '<p>Contactul WhatsApp se configurează înainte de distribuirea conceptului.</p>'}
    </div>
  </section>${faq([questions[1], questions[0]])}`;
}

const content = { home, towing, transport, area, contact };

function html(key, page) {
  const shareTitle = page.shareTitle ?? page.title;
  const shareDescription = page.shareDescription ?? page.description;
  const pageUrl = new URL(key === 'home' ? '/' : page.path, demoOrigin).href;
  return `<!doctype html>
<html lang="ro" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#101824">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ro_RO">
  <meta property="og:site_name" content="Florea Tractări">
  <meta property="og:title" content="${shareTitle}">
  <meta property="og:description" content="${shareDescription}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${shareImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${shareImageAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${shareTitle}">
  <meta name="twitter:description" content="${shareDescription}">
  <meta name="twitter:image" content="${shareImage}">
  <meta name="twitter:image:alt" content="${shareImageAlt}">
  <link rel="icon" href="assets/florea.svg" type="image/svg+xml">
  ${offline ? '' : '<link rel="preload" href="assets/display-latin.woff2" as="font" type="font/woff2" crossorigin>'}
  <link rel="stylesheet" href="site.css">
  ${key === 'contact' && phone ? '<script defer src="contact.js"></script>' : ''}
</head>
<body>
  <a class="skip-link" href="#continut">Sari la conținut</a>
  ${nav(key)}
  <main id="continut" tabindex="-1">${content[key]()}</main>
  ${footer()}
</body>
</html>
`;
}

await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
if (offline) {
  const stylesheet = new URL('site.css', output);
  let css = await readFile(stylesheet, 'utf8');
  for (const name of ['display-ext.woff2', 'display-latin.woff2']) {
    const fontPath = 'assets/' + name;
    const font = await readFile(new URL(fontPath, output));
    css = css.replace(fontPath, 'data:font/woff2;base64,' + font.toString('base64'));
  }
  await writeFile(stylesheet, css);
}
await Promise.all(Object.entries(pages).map(([key, page]) => writeFile(new URL(page.path, output), html(key, page))));
console.log(`Generate ${Object.keys(pages).length} pagini pentru previzualizare locală.`);
