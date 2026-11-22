import { articles } from './articles.mjs';

const labels = {
  ro: {
    blog: 'Blog', title: 'Ghiduri pentru câini și pisici',
    intro: 'Sfaturi practice pentru drum, consultație și următoarea programare.',
    all: 'Toate articolele', back: 'Înapoi la blog', example: 'Articol demonstrativ',
    previous: 'Articole anterioare', next: 'Articole următoare', source: 'Sursă: FelineVMA',
  },
  en: {
    blog: 'Blog', title: 'Guides for dogs and cats',
    intro: 'Practical tips for travel, appointments and keeping track of the next visit.',
    all: 'All articles', back: 'Back to the blog', example: 'Sample article',
    previous: 'Previous articles', next: 'Next articles', source: 'Source: FelineVMA',
  },
};

function picture(article, lang, assets, full = false) {
  const sizes = full ? '(max-width: 850px) calc(100vw - 36px), 820px' : '(max-width: 700px) 82vw, (max-width: 1020px) 44vw, 450px';
  return `<img src="${assets}${article.image}-640.webp"
    srcset="${assets}${article.image}-640.webp 640w, ${assets}${article.image}-1120.webp 1120w"
    sizes="${sizes}" width="640" height="427" alt="${full ? article[lang].alt : ''}"
    ${full ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
}

export function blogCards(lang, assets) {
  return articles.map(article => {
    const entry = article[lang];
    return `<li class="journal-item"><article class="journal-card">
      <a href="${article.slug}.html">
        ${picture(article, lang, assets)}
        <div class="journal-copy">
          <p class="journal-category">${entry.category}</p>
          <h3>${entry.title}</h3>
          <p>${entry.summary}</p>
          <span class="journal-arrow" aria-hidden="true">↗</span>
        </div>
      </a>
    </article></li>`;
  }).join('');
}

export function blogCarousel(lang, assets) {
  const text = labels[lang];
  return `<section class="journal-band" id="blog" aria-labelledby="journal-heading" data-journal>
    <div class="wrap section">
      <header class="journal-header">
        <div><p class="eyebrow">${text.blog}</p><h2 id="journal-heading">${text.title}</h2><p>${text.intro}</p></div>
        <a class="text-link" href="blog.html">${text.all} <span aria-hidden="true">↗</span></a>
      </header>
      <ul class="journal-track" id="journal-track" tabindex="0" aria-labelledby="journal-heading">${blogCards(lang, assets)}</ul>
      <div class="journal-controls" hidden>
        <button type="button" data-journal-prev aria-controls="journal-track" aria-label="${text.previous}">←</button>
        <button type="button" data-journal-next aria-controls="journal-track" aria-label="${text.next}">→</button>
      </div>
    </div>
  </section>`;
}

export function blogIndex(lang, assets) {
  const text = labels[lang];
  return `<section class="wrap section journal-index"><header><h1>${text.title}</h1><p>${text.intro}</p></header>
    <h2 class="sr-only">${text.all}</h2><ul class="journal-grid">${blogCards(lang, assets)}</ul></section>`;
}

export function articlePage(article, lang, assets) {
  const text = labels[lang];
  const entry = article[lang];
  const sections = entry.sections.map(([title, body]) => `<section><h2>${title}</h2><p>${body}</p></section>`).join('');
  return `<article class="wrap journal-article">
    <a class="text-link" href="blog.html"><span aria-hidden="true">←</span> ${text.back}</a>
    <header><p class="journal-category">${entry.category} · ${text.example}</p><h1>${entry.title}</h1><p>${entry.summary}</p></header>
    ${picture(article, lang, assets, true)}
    <div class="journal-body">${sections}${article.source ? `<p><a class="text-link" href="${article.source}">${text.source}</a></p>` : ''}</div>
  </article>`;
}
