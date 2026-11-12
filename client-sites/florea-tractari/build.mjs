import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

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
const shareImage = new URL('assets/fma/distribuire-fma.jpg', demoOrigin).href;
const shareImageAlt = 'Platforma albă FMA Tractări cu un SUV vișiniu, pe marginea unui drum';
const message = 'Bună, FMA Tractări! Am nevoie de o platformă auto. Vă pot trimite locația și detaliile mașinii?';
const callHref = phone ? `tel:${phone}` : contactPage;
const whatsappHref = whatsapp ? `${whatsapp}?text=${encodeURIComponent(message)}` : contactPage;

const pages = {
  home: {
    path: 'index.html', label: 'Acasă',
    title: 'Tractări auto București–Ilfov și transport național | FMA',
    shareTitle: 'FMA Tractări | Platformă auto în toată România',
    shareDescription: 'Tractări auto în București și Ilfov. Transport național pe platformă pentru autoturisme, SUV-uri și autoutilitare.',
    description: 'Tractări auto în București și Ilfov și transport pe platformă în toată România. Cere o estimare pentru autoturisme, SUV-uri, dube sau utilaje.',
  },
  towing: {
    path: 'tractari-auto.html', label: 'Tractări auto',
    title: 'Tractări auto pe platformă în București și Ilfov | FMA Tractări',
    description: 'Ai o mașină imobilizată sau avariată? Cere tractare auto pe platformă în București și Ilfov. Comunică locația, starea mașinii și destinația.',
  },
  transport: {
    path: 'transport-auto.html', label: 'Transport național',
    title: 'Transport auto pe platformă în România | FMA Tractări',
    description: 'Transport auto pe platformă între localități din România. Trimite punctele de preluare și predare, modelul mașinii și data dorită.',
  },
  area: {
    path: 'arie-acoperire.html', label: 'Acoperire',
    title: 'Zone de preluare și transport auto | FMA Tractări',
    description: 'Tractări în București și Ilfov, cu punct de plecare în Gruiu. Solicită transport auto pe platformă între localități din România.',
  },
  contact: {
    path: contactPage, label: 'Contact',
    title: 'Contact pentru tractări auto și transport | FMA Tractări',
    description: 'Cere o platformă auto prin telefon sau pregătește pe WhatsApp o solicitare cu locația, destinația și datele mașinii.',
  },
};

const icons = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 18.1 18.1 0 0 1-7.9-2.8 17.7 17.7 0 0 1-5.4-5.4 18.1 18.1 0 0 1-2.8-8A2 2 0 0 1 5.7 3h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 2.1L9.3 11a14.5 14.5 0 0 0 4.7 4.7l1.4-1.3a2 2 0 0 1 2.1-.5l2.8.5a2 2 0 0 1 1.7 2.5Z"/>',
  whatsapp: '<path fill="currentColor" stroke="none" d="M12.03 2A9.93 9.93 0 0 0 3.45 17L2 22l5.14-1.35A9.95 9.95 0 1 0 12.03 2Zm0 18.23c-1.54 0-3.04-.42-4.34-1.2l-.31-.19-3.05.8.81-2.96-.2-.32a8.27 8.27 0 1 1 7.09 3.87Zm4.54-6.18c-.25-.12-1.48-.72-1.71-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.15.17-.29.19-.54.06-.25-.12-1.05-.38-2-1.23-.74-.65-1.24-1.46-1.38-1.71-.15-.25-.02-.38.11-.5l.37-.43c.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.22.9 2.4 1.02 2.57.12.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.52.59.19 1.13.16 1.56.1.47-.07 1.48-.61 1.69-1.19.2-.59.2-1.08.14-1.19-.06-.1-.22-.16-.48-.29Z"/>',
  previous: '<path d="M20 12H5m6 6-6-6 6-6"/>',
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

const brand = `<a class="brand" href="index.html" aria-label="FMA Tractări, acasă"><img src="assets/fma/logo-288.webp" width="288" height="101" alt="FMA Tractări"></a>`;
const callButton = (label = localPhone || 'Sună acum') => `<a class="button button-primary" href="${callHref}">${icon('phone')}${label}</a>`;
const waButton = (label = 'Trimite locația') => `<a class="button button-outline" href="${whatsappHref}">${icon('whatsapp')}${label}</a>`;
const linkArrow = (href, label) => `<a class="text-link" href="${href}">${label}${icon('arrow')}</a>`;
const eyebrow = (label) => `<p class="eyebrow">${label}</p>`;

function nav(active) {
  const links = Object.entries(pages).map(([key, page]) =>
    `<a href="${page.path}"${key === active ? ' aria-current="page"' : ''}>${page.label}</a>`).join('')
    + `<a href="${active === 'home' ? '' : 'index.html'}#transporturi">Galerie</a>`;
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
    <div class="wrap footer-end"><span>FMA Tractări</span><span>Website realizat de AVYRON</span></div>
  </footer>
  <div class="float-actions" role="group" aria-label="Contact rapid">
    <a class="float-call" href="${callHref}" aria-label="Sună FMA Tractări"><span class="float-icon">${icon('phone')}</span><span class="float-label">Sună</span></a>
    <a class="float-whatsapp" href="${whatsappHref}" aria-label="Scrie FMA Tractări pe WhatsApp"><span class="float-icon">${icon('whatsapp')}</span><span class="float-label">WhatsApp</span></a>
  </div>`;
}

const media = [
  [10, 'SUV pe un traseu interurban', 'SUV vișiniu pe platforma FMA, lângă un drum cu viraje.', 'Pentru o preluare pe drum, trimite un pin și un reper vizibil.'],
  [13, 'Autoturism preluat din localitate', 'Autoturism roșu încărcat pe platforma albă.', 'Spune dacă roțile se pot mișca și dacă vehiculul poate fi accesat din stradă.'],
  [14, 'Autoutilitară cu box', 'Autoutilitară albă cu box, încărcată pe platforma FMA.', 'Indică înălțimea totală, masa și dacă vehiculul este încărcat.'],
  [11, 'Încărcător compact', 'Încărcător compact galben CASE, fotografiat din fața autoplatformei.', 'Trimite modelul utilajului și detalii despre accesul la locul de încărcare.'],
  [12, 'Încărcător fixat pe platformă', 'Vedere din spate a încărcătorului CASE, cu chingile vizibile.', 'Pentru estimare, precizează și ce accesorii trebuie transportate cu utilajul.'],
  [15, 'Utilaj pe o stradă rezidențială', 'Încărcător galben pe platforma FMA, fotografiat pe o stradă îngustă.', 'Menționează dacă strada este îngustă sau are restricții de acces.'],
  [1, 'SUV pe platformă', 'SUV argintiu pe platforma FMA, văzut din lateral.', 'Pentru SUV-uri, trimite modelul și starea vehiculului ca să putem confirma preluarea.'],
  [9, 'Autoturism pe platformă', 'Berlină gri pe autoplatforma albă, în lumină de seară.', 'Comunică locul de preluare și adresa de predare, fie că este un service sau o altă destinație.'],
  [3, 'Dubă de marfă', 'Dubă albă de marfă încărcată pe platformă într-o curte industrială.', 'Pentru o dubă, avem nevoie de model, dimensiuni și masa vehiculului.'],
  [6, 'Utilitară cu benă', 'Utilitară verde cu benă pe platforma FMA, la marginea drumului.', 'Pentru vehicule cu benă, precizează și dacă vehiculul are marfă la bord.'],
  [7, 'Microbuz pe platformă', 'Microbuz alb transportat pe platformă, fotografiat din spate.', 'Trimite înălțimea, lungimea și starea microbuzului pentru verificarea încărcării.'],
  [4, 'Autoutilitară cu platformă deschisă', 'Autoutilitară albă cu platformă deschisă, încărcată pe autoplatforma FMA.', 'Spune dacă vehiculul se deplasează și cum se poate ajunge la locul de preluare.'],
  [5, 'Miniexcavator', 'Miniexcavator turcoaz încărcat pe platformă.', 'Trimite modelul, masa și dimensiunile utilajului ca să putem evalua cursa.'],
  [8, 'Stivuitor', 'Stivuitor turcoaz pe platformă, lângă intrarea într-o curte.', 'La stivuitor contează inclusiv înălțimea catargului și accesul pentru încărcare.'],
  [2, 'Modul metalic', 'Modul metalic închis, așezat pe platforma FMA.', 'Pentru încărcături atipice, trimite fotografii și dimensiuni înainte de programare.'],
];

function picture(asset, { className = 'scene', width, height, widths, sizes, alt, eager = false }) {
  const srcset = (format) => widths.map((size) => `assets/fma/${asset}-${size}.${format} ${size}w`).join(', ');
  return `<picture class="${className}">
    <source type="image/avif" srcset="${srcset('avif')}" sizes="${sizes}">
    <img src="assets/fma/${asset}-${widths[0]}.webp" srcset="${srcset('webp')}" sizes="${sizes}" width="${width}" height="${height}"
      ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async" fetchpriority="low"'} alt="${alt}">
  </picture>`;
}

function heroImage() {
  return picture('hero-drum', {
    className: 'hero-media', width: 960, height: 720, widths: [480, 640, 960],
    sizes: '(max-width: 760px) 100vw, 67vw', alt: shareImageAlt, eager: true,
  });
}

function scene(number, { eager = false, sizes } = {}) {
  const [, , alt] = media.find(([id]) => id === number);
  return picture(`foto-${number}`, {
    width: number === 15 ? 576 : 960,
    height: number >= 10 ? (number === 15 ? 384 : 640) : (number === 1 ? 720 : 1280),
    widths: [480, number === 15 ? 576 : 960], alt, eager,
    sizes: sizes || '(max-width: 760px) 90vw, (max-width: 1280px) 47vw, 610px',
  });
}

function gallery() {
  return `<section id="transporturi" class="section gallery" aria-labelledby="gallery-title">
    <div class="wrap">
      <div class="section-heading">
        <div>${eyebrow('Galerie FMA')}<h2 id="gallery-title">Transporturi reale.</h2></div>
        <p>Autoturisme, dube și încărcături speciale, fotografiate pe platforma FMA.</p>
      </div>
      <div data-gallery aria-roledescription="carusel" role="region" aria-labelledby="gallery-title">
        <div class="gallery-controls" data-gallery-controls hidden>
          <button type="button" data-previous aria-label="Fotografia anterioară">${icon('previous')}</button>
          <p data-gallery-position aria-live="polite" aria-atomic="true"></p>
          <button type="button" data-next aria-label="Fotografia următoare">${icon('arrow')}</button>
        </div>
        <ul class="gallery-track" data-gallery-track tabindex="0" role="list" aria-label="Fotografii ale transporturilor">
          ${media.map(([number, title, , description]) => `<li>
            <figure class="gallery-card">
              ${scene(number, { sizes: '(max-width: 760px) 78vw, (max-width: 960px) 44vw, 430px' })}
              <figcaption><h3>${title}</h3><p>${description}</p></figcaption>
            </figure>
          </li>`).join('')}
        </ul>
      </div>
    </div>
  </section>`;
}

function videoSection() {
  const clips = [
    ['transport-duba', 'video-duba', 'Dubă de marfă pe platformă'],
    ['transport-platforma', 'video-poster', 'Utilitară cu benă pe platformă'],
  ];
  return `<section class="section light video-section">
    <div class="wrap video-grid">
      <div>${eyebrow('Video din teren')}<h2>Platforma în mers</h2>
        <p>Două transporturi filmate pe traseu, cu o dubă de marfă și o utilitară cu benă.</p>
        ${linkArrow(pages.transport.path, 'Cum programezi un transport')}
      </div>
      <div class="video-clips">
        ${clips.map(([file, poster, label]) => `<figure>
          <video controls playsinline preload="none" poster="assets/fma/${poster}.webp" width="478" height="850" aria-label="${label}">
            <source src="assets/fma/${file}.mp4" type="video/mp4">
            <a href="assets/fma/${file}.mp4">Deschide clipul</a>
          </video>
          <figcaption>${label}</figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>`;
}

const questions = [
  ['Cât costă o tractare auto?', 'Estimarea depinde de distanță, de tipul vehiculului și de condițiile de încărcare. Trimite adresele de preluare și predare, modelul mașinii și câteva detalii despre starea ei.'],
  ['Ce detalii trimit pe WhatsApp?', 'Trimite locația sau un pin pe hartă, destinația, marca și modelul mașinii. Spune dacă se poate deplasa pe roți și dacă accesul este dificil. Poți atașa fotografii direct în conversație.'],
  ['Pot solicita transport pentru o dubă sau un utilaj?', 'Trimite modelul, dimensiunile și masa. Pentru utilaje și încărcături atipice, atașează și fotografii. Confirmăm în funcție de încărcătură și de acces.'],
  ['Pot programa un transport în alt județ?', 'Da. Spune de unde trebuie preluată mașina, unde trebuie să ajungă și în ce zi. Disponibilitatea se stabilește pentru traseul și data cerute.'],
  ['Mașina se află într-o parcare cu acces limitat. Ce fac?', 'Precizează înălțimea de acces, locul în care e parcată mașina și dacă poate fi mutată. Aceste detalii ajută la evaluarea posibilității de preluare.'],
];

function faq(items = questions) {
  return `<section class="section faq light">
    <div class="wrap faq-grid">
      <div>${eyebrow('Întrebări frecvente')}<h2>Ce trebuie să știi.</h2><p>Detalii despre cost, acces și curse programate.</p></div>
      <div class="faq-items">${items.map(([question, answer]) =>
        `<details><summary><span>${question}</span>${icon('plus')}</summary><p>${answer}</p></details>`).join('')}</div>
    </div>
  </section>`;
}

function finalCta() {
  return `<section class="contact-band">
    <div class="wrap band-inner">
      <div><h2>Cere o estimare de transport</h2><p>Trimite adresa de preluare, destinația și detaliile vehiculului. Îți comunicăm disponibilitatea și costul pentru traseul tău.</p></div>
      <div class="actions">${callButton(localPhone ? `Sună la ${localPhone}` : 'Sună pentru detalii')}${waButton('Trimite ruta pe WhatsApp')}</div>
    </div>
  </section>`;
}

const steps = [
  ['Comunici locația', 'Sună sau trimite un pin pe WhatsApp și spune ce s-a întâmplat cu mașina.'],
  ['Stabilim traseul', 'Indici destinația. Discutăm condițiile de preluare, disponibilitatea și costul.'],
  ['Preluăm vehiculul', 'După confirmare, vehiculul este preluat și transportat la adresa stabilită.'],
];

function processSection() {
  return `<section class="section process light"><div class="wrap">
    ${eyebrow('Cum funcționează')}<h2>Cum soliciți o platformă.</h2>
    <ol class="step-grid">${steps.map(([title, description], i) =>
      `<li><span class="step-number" aria-hidden="true">0${i + 1}</span><h3>${title}</h3><p>${description}</p></li>`).join('')}</ol>
    <figure class="process-image">
      ${picture('ilustratie-incarcare', { width: 960, height: 640, widths: [480, 960], sizes: '(max-width: 760px) 90vw, 480px', alt: 'Ilustrație a unui autoturism urcat pe platformă cu troliu' })}
      <figcaption>Ilustrație generată cu AI</figcaption>
    </figure>
  </div></section>`;
}

function home() {
  return `<section class="hero">
    ${heroImage()}
    <div class="wrap hero-inner">
      <img class="hero-logo" src="assets/fma/logo-288.webp" srcset="assets/fma/logo-288.webp 288w, assets/fma/logo-624.webp 624w" sizes="(max-width: 760px) 144px, 232px" width="624" height="220" alt="" decoding="async">
      ${eyebrow('București · Ilfov · Național')}
      <h1>Tractări auto <span>în toată România.</span></h1>
      <p class="hero-intro">Preluare în București și Ilfov. Curse pe platformă în toată țara pentru autoturisme, SUV-uri, autoutilitare și utilaje.</p>
      <div class="actions hero-actions">${callButton(localPhone ? `Sună la ${localPhone}` : 'Sună pentru tractare')}${waButton('WhatsApp')}</div>
    </div>
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
        <div>${eyebrow('Servicii')}<h2>Tractare și transport auto</h2></div>
        <p>Preluări pentru vehicule imobilizate și transporturi programate între localități.</p>
      </div>
      <div class="service-grid">
        <article class="service-card">
          <a href="${pages.towing.path}" class="card-link">
            ${scene(13)}
            <div class="card-copy"><div><p class="card-label">București · Ilfov</p><h3>Tractări auto</h3><p>Preluăm mașina imobilizată sau avariată și o ducem la service ori la adresa aleasă.</p></div><span class="card-arrow">${icon('diagonal')}</span></div>
          </a>
        </article>
        <article class="service-card">
          <a href="${pages.transport.path}" class="card-link">
            ${scene(14)}
            <div class="card-copy"><div><p class="card-label">În toată România</p><h3>Transport auto național</h3><p>Planificăm preluarea și predarea mașinii pe traseul de care ai nevoie.</p></div><span class="card-arrow">${icon('diagonal')}</span></div>
          </a>
        </article>
      </div>
    </div>
  </section>
  ${gallery()}
  <section class="area-banner">
    ${picture('ilustratie-traseu', { width: 1280, height: 720, widths: [640, 1280], sizes: '100vw', alt: 'Ilustrație a unui transport pe platformă pe un drum de munte' })}
    <span class="image-credit">Ilustrație generată cu AI</span>
    <div class="wrap area-inner">
      ${eyebrow('Arie de acoperire')}
      <h2>Din Ilfov,<br>în toată țara.</h2>
      <p>Plecăm din Gruiu și preluăm mașini din București și Ilfov. Pentru distanțe mai lungi, stabilim cursa după punctele de preluare și predare.</p>
      ${linkArrow(pages.area.path, 'Vezi aria de acoperire')}
    </div>
  </section>
  ${processSection()}${videoSection()}${faq()}${finalCta()}`;
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
    'Dacă mașina a rămas imobilizată în București sau Ilfov, trimite locația exactă. O preluăm pe platformă și o ducem la service sau la adresa indicată.', 13)
    + guidance('Ce ne spui la primul contact.', 'Cu aceste detalii putem evalua preluarea și îți putem comunica o estimare pentru traseul cerut.', [
      ['Locația exactă', 'Trimite adresa, un reper sau un pin pe hartă. Spune dacă ești într-o parcare, pe un drum local sau pe autostradă.'],
      ['Mașina și starea ei', 'Spune marca, modelul și dacă roțile se mișcă. Menționează eventualele avarii care pot îngreuna încărcarea.'],
      ['Destinația', 'Spune-ne adresa de predare sau numele service-ului unde vrei să ajungă mașina.'],
    ]) + faq([questions[0], questions[1], questions[4]]) + finalCta();
}

function transport() {
  return pageHero('Curse în România', 'Transport auto <span>la nivel național.</span>',
    'Ai nevoie să muți o mașină între localități? Trimite ruta și data dorită pentru a discuta transportul pe platformă.', 14)
    + guidance('Planificăm preluarea și predarea.', 'Poți solicita o cursă din București sau Ilfov către alt județ ori poți verifica disponibilitatea pentru un traseu între alte localități.', [
      ['Ruta completă', 'Trimite cele două localități și, dacă le cunoști, adresele de încărcare și descărcare.'],
      ['Data și accesul', 'Menționează intervalul dorit și dacă vehiculul se află într-un spațiu îngust sau cu acces restricționat.'],
      ['Tipul mașinii', 'Precizează modelul și starea vehiculului. Pentru dube, utilaje și încărcături atipice, include masa și dimensiunile.'],
    ]) + faq([questions[2], questions[3], questions[0]]) + finalCta();
}

function area() {
  const zones = [
    ['București', 'Solicită o preluare din oraș și indică sectorul, strada și destinația.'],
    ['Ilfov', 'Punctul de plecare este Gruiu. Trimite locația exactă dacă ești într-o comună sau pe un drum județean.'],
    ['România', 'Pentru transport între județe, spune localitățile, data dorită și starea vehiculului.'],
  ];
  return pageHero('Arie de acoperire', 'București–Ilfov. <span>Curse naționale.</span>',
    'FMA Tractări pornește din Gruiu, Ilfov. Pentru o preluare locală sau un transport în alt județ, contactează-ne cu detaliile traseului.', 10)
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
        <p>Sună pentru o preluare sau trimite detaliile pe WhatsApp. Indică adresa de preluare, destinația și tipul vehiculului sau al utilajului.</p>
        ${phone ? `<div class="actions">${callButton()}${waButton()}</div>` : '<p>Contactele se configurează în versiunea de prezentare.</p>'}
      </div><div class="lane-pattern" aria-hidden="true"></div>
    </div>
  </section>
  <section class="section light contact-section">
    <div class="wrap info-grid">
      <div>${eyebrow('Solicitare de transport')}<h2>Pregătește detaliile.</h2>
        <p>După deschiderea conversației poți adăuga un pin de locație sau fotografii.</p>
        <ul class="contact-tips"><li>${icon('pin')}Punctul de preluare</li><li>${icon('road')}Destinația dorită</li><li>${icon('truck')}Starea vehiculului și condițiile de acces</li></ul>
      </div>
      ${phone ? `<form class="contact-form" data-whatsapp="${whatsapp}" hidden>
        <label for="pickup">Locația de preluare</label>
        <input id="pickup" name="pickup" required maxlength="140" placeholder="Ex. Gruiu, Ilfov">
        <label for="destination">Destinația</label>
        <input id="destination" name="destination" required maxlength="140" placeholder="Ex. Service în Voluntari">
        <label for="vehicle">Vehiculul și starea lui</label>
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
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#101824">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ro_RO">
  <meta property="og:site_name" content="FMA Tractări">
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
  <link rel="icon" href="assets/fma/favicon.png" type="image/png">
  ${offline ? '' : '<link rel="preload" href="assets/display-latin.woff2" as="font" type="font/woff2" crossorigin>'}
  <link rel="stylesheet" href="site.css">
  <script defer src="navigation.js"></script>
  ${key === 'home' ? '<script defer src="gallery.js"></script>' : ''}
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

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
// Keep the image URL used by links shared before the FMA rebrand.
await cp(new URL('assets/fma/distribuire-fma.jpg', output), new URL('assets/florea-tractari-preview.jpg', output));
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
