import { copy, pages } from './content.mjs';
import { siteDefaults } from './site-config.mjs';

const paths = {
  pin:'<path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2A18 18 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.7a2 2 0 0 1-.5 2.1L8 9.6a15 15 0 0 0 6.4 6.4l1.1-1.1a2 2 0 0 1 2.1-.5l2.7.5a2 2 0 0 1 1.7 2Z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  up:'<path d="M6 18 18 6M8 6h10v10"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 10h18m-12 5h6"/>',
  paw:'<ellipse cx="4.5" cy="10" rx="2" ry="2.8" transform="rotate(-25 4.5 10)"/><ellipse cx="9" cy="6" rx="2" ry="2.8" transform="rotate(-10 9 6)"/><ellipse cx="15" cy="6" rx="2" ry="2.8" transform="rotate(10 15 6)"/><ellipse cx="19.5" cy="10" rx="2" ry="2.8" transform="rotate(25 19.5 10)"/><path d="M6.2 17.6c.2-1.5 1.9-2.5 3.1-4 1.4-1.8 4-1.8 5.4 0 1.2 1.5 2.9 2.5 3.1 4 .3 2.4-2.2 3.2-4.1 2.3-1.1-.5-2.3-.5-3.4 0-1.9.9-4.4.1-4.1-2.3Z"/>',
  stethoscope:'<path d="M5 3H3v5a5 5 0 0 0 10 0V3h-2M5 2v3m6-3v3M8 13v3a5 5 0 0 0 10 0v-3"/><circle cx="18" cy="10" r="3"/>',
  shield:'<path d="M12 22S4 18 4 11V5l8-3 8 3v6c0 7-8 11-8 11Z"/><path d="M9 11h6m-3-3v6"/>',
  heart:'<path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z"/><path d="M6 12h3l2-3 2 5 2-2h3"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  chat:'<path d="M20.5 11.5a8.5 8.5 0 0 1-12.3 7.6L4 20l1.1-4A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M9 8c.2 4 2.4 6 6 6l1-1.3-2.2-1.2-.8 1c-1.2-.4-2.2-1.4-2.5-2.5l.9-.8L10.2 7Z"/>',
};
const ico = (name, cls='') => `<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const route = (key, lang) => pages.find(p=>p[0]===key)[lang==='ro'?1:2];
const ids = ['consultatii','preventie','controale'];
const dates = ['2027-04-15','2027-04-22','2027-05-06'];
const fmt = (date, lang) => new Intl.DateTimeFormat(lang==='ro'?'ro-RO':'en-GB',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date));
const options = arr => arr.map((label,i)=>`<option value="${i}">${esc(label)}</option>`).join('');
const label = text=>`<span class="eyebrow">${esc(text)}</span>`;
const btn = (text, icon='arrow', cls='btn btn-primary')=>`<button type="button" class="${cls}" data-book>${ico(icon)}${esc(text)}</button>`;
const link = (text, href, icon='arrow', cls='btn btn-secondary')=>`<a class="${cls}" href="${esc(href)}">${esc(text)}${ico(icon)}</a>`;

export function render(lang, current, config = siteDefaults, { draft = false } = {}){
  const t=copy[lang], alt=lang==='ro'?'en':'ro', a=lang==='ro'?'assets/':'../assets/';
  const clinic = config.clinic;
  const editorial = config.locales[lang];
  const address = clinic.street;
  const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address + ', ' + clinic.city);
  const weekdays = clinic.weekdays || t.hours[4];
  const saturday = clinic.saturday || t.hours[4];
  const sunday = clinic.sunday || t.hours[4];
  const r=(k)=>route(k,lang);
  const name=clinic.name;
  const tel='tel:'+clinic.tel;
  const mail='mailto:'+clinic.email+'?subject='+encodeURIComponent(name+' — '+(lang==='ro'?'Întrebare':'Enquiry'));
  const wa='https://wa.me/'+clinic.tel.slice(1)+'?text='+encodeURIComponent(lang==='ro'?'Bună ziua, aș dori informații despre o vizită la Pets Arca lui Noe.':'Hello, I would like to ask about a visit to Pets Arca lui Noe.');
  const lng=lang==='ro'?'en/'+route(current,alt):'../'+route(current,alt);
  const nav=pages.map(([k],i)=>`<a ${k===current?'aria-current="page"':''} href="${r(k)}">${t.nav[i]}</a>`).join('');
  const brand=`<a href="${r('home')}" class="brand"><span class="brand-mark">${ico('paw')}</span><span class="brand-label"><strong>${esc(name)}</strong><small>${t.clinic}</small></span></a>`;
  const head=(arr)=>`<header class="wrap subhead">${label(arr[0])}<h1>${arr[1]}</h1><p>${arr[2]}</p></header>`;
  const photo=(type, eager=false)=>`<img src="${a}${type}-1120.webp" srcset="${a}${type}-640.webp 640w, ${a}${type}-1120.webp 1120w${eager&&type==='veterinar'?', '+a+type+'-1536.webp 1536w':''}" sizes="(max-width: 700px) calc(100vw - 36px), (max-width: 1200px) 52vw, 690px" width="${eager&&type==='veterinar'?1536:1120}" height="${eager&&type==='veterinar'?1024:747}" ${eager?'fetchpriority="high"':'loading="lazy" decoding="async"'} alt="${type==='veterinar'?t.hero[7]:t.catAlt}">`;
  const contactItems=`<div class="contact-links"><div>${ico('pin')}<div><small>${t.contactLabel[0]}</small><a href="${esc(maps)}">${esc(address)}, ${esc(clinic.city)}</a></div></div><div>${ico('phone')}<div><small>${t.contactLabel[1]}</small><a href="${tel}">${esc(clinic.phone)}</a></div></div><div>${ico('mail')}<div><small>${t.contactLabel[2]}</small><a href="${esc(mail)}">${esc(clinic.email)}</a></div></div></div>`;
  const listSteps=(data)=>`<ol class="steps">${data.map(([a,b],i)=>`<li><span>0${i+1}</span><div><h3>${a}</h3><p>${b}</p></div></li>`).join('')}</ol>`;
  const faq=`<section class="faq"><h2>${t.faqTitle}</h2>${editorial.faq.map(({question, answer})=>`<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('')}</section>`;
  const d=t.demo;
  const emailCard=(dynamic=false)=>`<div class="email-card"><div class="email-chrome"><span>${ico('mail')}${d.example}</span><span class="email-dots" aria-hidden="true">•••</span></div><div class="email-inner"><p class="email-to">${d.to}</p><h3>${d.heading}</h3><p>${d.hi}<br>${d.intro}</p><div class="email-due">${ico('calendar')}<div><strong ${dynamic?'data-demo-reason':''}>${d.options[0]}</strong><br><time ${dynamic?'data-demo-due':''} datetime="${dates[0]}">${fmt(dates[0],lang)}</time></div></div>${btn(d.action,'arrow','email-action')}<p class="email-end">${d.closing}</p></div></div>`;
  const serviceCards=(detailed=false)=>`<div class="service-grid">${editorial.services.map(({title,description,preparation},i)=>`<article class="service-card" id="${ids[i]}"><div class="service-top"><span class="icon-bubble">${ico(t.services[i][0])}</span></div><h3>${esc(title)}</h3><p>${esc(description)}</p>${detailed?`<p class="service-detail">${esc(preparation)}</p>${btn(editorial.bookingLabel,'arrow','text-link')}`:link(t.serviceInfo,r('services')+'#'+ids[i],'up','text-link')}</article>`).join('')}</div>`;

  const bodies = {
    home:()=>`
      <section class="hero wrap"><div class="hero-copy">${label(t.clinic + ' · ' + clinic.city)}<h1>${esc(editorial.heroTitle)}<br><em>${esc(editorial.heroAccent)}</em></h1><p>${esc(editorial.heroDescription)}</p><div class="actions">${btn(editorial.bookingLabel,'calendar')}${link(t.hero[4],r('services'))}</div></div><div class="hero-image">${photo(clinic.image,true)}</div></section>
      <div class="wrap home-practical" aria-label="${t.nav[4]}"><a href="${esc(maps)}">${ico('pin')}<span><strong>${esc(address)}</strong><small>${esc(clinic.city)}</small></span>${ico('up','practical-arrow')}</a><a href="${r('contact')}">${ico('calendar')}<span><strong>${t.hours[1]} · ${esc(weekdays)}</strong><small>${t.hours[0]}</small></span>${ico('arrow','practical-arrow')}</a><a href="${tel}">${ico('phone')}<span><strong>${esc(clinic.phone)}</strong><small>${t.call}</small></span>${ico('up','practical-arrow')}</a></div>
      <section class="care wrap section"><header class="section-head"><div>${label(t.nav[1])}<h2>${esc(editorial.servicesTitle)}</h2></div><p>${esc(editorial.servicesDescription)}</p></header>${serviceCards()}<div class="section-end"><small>${t.serviceNote}</small>${link(t.serviceMore,r('services'),'arrow','text-link')}</div></section>
      <section class="reminder-band"><div class="wrap reminder-grid"><div>${label(t.nav[3])}<h2>${esc(editorial.reminderTitle)}</h2><p>${esc(editorial.reminderDescription)}</p>${link(t.reminder[3],r('reminders'),'arrow','btn btn-light')}<small class="on-dark-note">${t.reminder[4]}</small></div>${emailCard()}</div></section>
      <section class="wrap section visit-feature"><div class="feature-image">${photo('pisica')}</div><div>${label(t.nav[2])}<h2>${esc(editorial.visitTitle)}</h2><p>${esc(editorial.visitDescription)}</p>${listSteps(t.visitSteps)}${link(t.visitLink,r('visit'),'arrow','text-link')}</div></section>
      <section class="contact-band"><div class="wrap contact-feature"><div>${label(t.nav[4])}<h2>${esc(editorial.contactTitle)}</h2><p>${esc(editorial.contactDescription)}</p>${link(t.nav[4],r('contact'))}</div>${faq}</div></section>`,
    services:()=>`${head(t.serviceTitle)}<section class="wrap inner-section" aria-labelledby="service-list-title"><h2 id="service-list-title" class="sr-only">${t.serviceTitle[0]}</h2>${serviceCards(true)}<p class="muted">${t.serviceNote}</p></section><section class="contact-band"><div class="wrap contact-feature"><div>${label(t.nav[2])}<h2>${esc(editorial.visitTitle)}</h2><p>${esc(editorial.visitDescription)}</p>${link(t.visitLink,r('visit'))}</div>${faq}</div></section>`,
    visit:()=>`${head([t.nav[2], esc(editorial.visitTitle), esc(editorial.visitDescription)])}<section class="wrap inner-section visit-feature"><div class="feature-image">${photo('pisica')}</div><div><h2 class="sr-only">${t.visitPrep}</h2>${listSteps(t.visitSteps)}${btn(editorial.bookingLabel,'calendar')}</div></section><section class="contact-band"><div class="wrap contact-feature"><div>${label(t.nav[4])}<h2>${esc(editorial.contactTitle)}</h2><p>${esc(editorial.contactDescription)}</p>${link(t.directions,maps,'up')}</div>${faq}</div></section>`,
    reminders:()=>`${head(t.reminderTitle)}<section class="reminder-band"><div class="wrap reminder-grid" data-reminder data-dates="${dates.join(',')}"><div>${label(t.reminder[4])}<h2>${d.title}</h2><div class="controls"><label>${d.label}<select data-reminder-type>${options(d.options)}</select></label><label>${d.timing}<select data-reminder-days>${[1,3,7].map((n,i)=>`<option value="${n}" ${n===3?'selected':''}>${d.days[i]}</option>`).join('')}</select></label></div><dl class="timeline" aria-live="polite"><div><dt>${d.send}</dt><dd><time data-demo-send datetime="2027-04-12">${fmt('2027-04-12',lang)}</time></dd></div><div><dt>${d.due}</dt><dd><time data-demo-due datetime="${dates[0]}">${fmt(dates[0],lang)}</time></dd></div></dl><small class="on-dark-note">${d.disclaimer}</small></div>${emailCard(true)}</div></section><section class="wrap section workflow"><h2>${t.reminder[4]}</h2>${listSteps(t.reminderSteps)}</section>`,
    contact:()=>`${head([t.nav[4], esc(editorial.contactTitle), esc(editorial.contactDescription)])}<section class="wrap inner-section contact-grid" aria-label="${t.nav[4]}"><div class="contact-panel">${contactItems}<div class="actions">${link(t.directions,maps,'up','btn btn-primary')}${link(t.call,tel,'phone')}</div></div><div class="contact-panel"><h2>${t.hours[0]}</h2><dl class="hours"><div><dt>${t.hours[1]}</dt><dd>${esc(weekdays)}</dd></div><div><dt>${t.hours[2]}</dt><dd>${esc(saturday)}</dd></div><div><dt>${t.hours[3]}</dt><dd>${esc(sunday)}</dd></div></dl><p class="muted">${t.hours[5]}</p></div></section><section class="contact-band"><div class="wrap contact-feature"><div>${label(t.form.kicker)}<h2>${esc(editorial.bookingLabel)}</h2><p>${t.form.intro}</p>${btn(editorial.bookingLabel,'calendar')}</div>${faq}</div></section>`,
  };
  const title=(current==='home' && editorial.seoTitle) || (current==='home'?t.clinic+' · '+clinic.city:t.nav[pages.findIndex(p=>p[0]===current)])+' | '+name;
  const description=current==='home'?(editorial.seoDescription || editorial.heroDescription):({services:t.serviceTitle,visit:[null,null,editorial.visitDescription],reminders:t.reminderTitle,contact:[null,null,editorial.contactDescription]}[current][2]);
  const f=t.form;
  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#193b31"><title>${esc(title)}</title><link rel="icon" href="${a}mark.svg" type="image/svg+xml"><link rel="stylesheet" href="${a}site.css"><script defer src="${a}site.js"></script></head>
<body>
  <a class="skip" href="#main">${t.skip}</a>
  <header class="masthead"><div class="utility"><div class="wrap utility-inner"><a class="utility-location" href="${esc(maps)}">${ico('pin')}<span class="utility-address">${esc(address)}</span><span>, ${esc(clinic.city)}</span></a><div class="utility-end"><a href="${tel}">${ico('phone')}${esc(clinic.phone)}</a><span class="utility-preview">${draft ? (lang === 'ro' ? 'Ciornă site' : 'Site draft') : t.preview}</span></div></div></div>
  <div class="nav-surface"><div class="wrap nav-inner">${brand}<nav aria-label="${t.footer[2]}" class="nav-desktop">${nav}</nav><div class="nav-actions"><div class="langs" aria-label="Limbă / Language"><span aria-current="true">${lang.toUpperCase()}</span><a lang="${alt}" hreflang="${alt}" href="${lng}" aria-label="${lang==='ro'?'EN — English':'RO — Română'}">${alt.toUpperCase()}</a></div>${btn(editorial.bookingLabel,'calendar','btn btn-primary nav-book')}<details class="mobile-nav"><summary aria-label="${t.menu}">${ico('menu')}</summary><nav aria-label="${t.footer[2]}">${nav}</nav></details></div></div></div></header>
  <main id="main" tabindex="-1">${editorial.announcement ? `<div class="site-announcement"><div class="wrap">${esc(editorial.announcement)}</div></div>` : ''}${bodies[current]()}</main>
  <footer class="footer"><div class="wrap"><div class="footer-grid"><div>${brand}<p class="footer-line">${t.footer[0]}<br><em>${t.footer[1]}</em></p></div><div><h2>${t.footer[2]}</h2><nav aria-label="${t.footer[2]} · ${esc(name)}">${nav}</nav></div><div><h2>${t.nav[4]}</h2>${contactItems}<h2 class="social-title">${t.follow}</h2><small>${t.followNote}</small></div></div><div class="footer-bottom"><span>${t.footer[4]}</span><span>${t.footer[3]}</span></div></div></footer>
  <aside class="quick" aria-label="${t.nav[4]}"><a href="${tel}" title="${t.call}" aria-label="${t.call}">${ico('phone')}</a>${clinic.whatsapp ? `<a href="${esc(wa)}" title="${t.whatsapp}" aria-label="${t.whatsapp}">${ico('chat')}</a>` : ''}<a href="${esc(mail)}" title="${t.email}" aria-label="${t.email}">${ico('mail')}</a></aside>
  <dialog id="booking" aria-labelledby="booking-title"><button class="dialog-close" type="button" data-dialog-close aria-label="${t.close}">${ico('close')}</button><div data-book-step>${label(f.kicker)}<h2 id="booking-title">${esc(editorial.bookingLabel)}</h2><p>${f.intro}</p><form><label>${f.pet}<select name="pet">${options(f.pets)}</select></label><label>${f.reason}<select name="reason">${options(editorial.services.map(service=>service.title))}</select></label><label>${f.period}<select name="period">${options(f.periods)}</select></label><button class="btn btn-primary" type="submit">${f.action}${ico('arrow')}</button></form></div><div data-book-result hidden>${label(f.kicker)}<h2 tabindex="-1">${f.result}</h2><dl class="booking-result"><div><dt>${f.pet}</dt><dd data-result="pet"></dd></div><div><dt>${f.reason}</dt><dd data-result="reason"></dd></div><div><dt>${f.period}</dt><dd data-result="period"></dd></div></dl><p>${f.summary}</p><div class="actions">${link(t.call,tel,'phone','btn btn-primary')}<button type="button" class="text-link" data-book-reset>${f.restart}</button></div></div></dialog>
  <noscript><div class="noscript"><a href="${tel}">${t.call} · ${esc(clinic.phone)}</a></div></noscript>
</body></html>
`;
}
