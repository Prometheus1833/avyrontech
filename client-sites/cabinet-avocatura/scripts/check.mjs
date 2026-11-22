import { readFile, stat, access } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { firm } from '../content.mjs';

const routes=JSON.parse(await readFile('dist/route-manifest.json','utf8'));
const known=new Set(routes.map(r=>r.path));
const titles=new Set();
const failures=[];
let links=0,assets=0;
for(const route of routes) {
 const html=await readFile(`dist${route.path}index.html`,'utf8');
 const check=(condition,message)=>{if(!condition)failures.push(route.path+': '+message);};
 check(html.startsWith('<!doctype html>'),'HTML doctype');
 check(html.includes(`<html lang="${route.lang}">`),'correct language');
 check((html.match(/<h1[ >]/g)||[]).length===1,'exactly one h1');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 check(!!title&&!titles.has(title),'unique title');titles.add(title);
 check(html.includes('name="description"'),'description');
 check(!/Sector 6|District 6|Cabinet de avocat(?:<| )/i.test(html),'outdated identity or location');
 check(html.includes('id="accessibility-toggle"'),'accessibility control');
 check(html.includes('id="language-toggle"'),'compact language switch');
 check(html.includes('hero-mobile')||route.key!=='home','mobile hero art direction');
 check(html.includes('legal-cinematic-v3-mobile'),'cinematic mobile footer');
 check(html.includes('data-practice-carousel')===['home','practices'].includes(route.key),'carousel only on practice collections');
 check(html.includes('data-article-carousel')===(route.key==='home'),'editorial carousel only on home');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);check(new Set(ids).size===ids.length,'unique IDs for independent carousel controls');
 check(html.includes('class="floating-contact"')===(route.key==='home'),'floating contact only on landing');
 for(const link of html.matchAll(/href="(mailto:[^"]+|https:\/\/wa\.me\/[^"]+)"/g)){const target=new URL(link[1]);if(target.protocol==='mailto:'){check(target.pathname===firm.email,'email destination');check(!!target.searchParams.get('subject')&&!!target.searchParams.get('body'),'email draft');}else{check(target.pathname==='/40723228582','WhatsApp destination');check(!!target.searchParams.get('text'),'WhatsApp draft');}}
 check(html.includes('name="robots" content="noindex, follow"'),'demo noindex');
 if(route.key==='practice'){for(const id of ['servicii','abordare','pregatire','intrebari','solicitare'])check(html.includes('id="'+id+'"'),'practice section '+id);check((html.match(/<details>/g)||[]).length>=3,'substantive practice FAQ');}
 if(route.key==='article')check(html.includes('article-contents'),'article contents');
 check(html.includes('viewport-fit=cover'),'safe-area viewport');
 check(html.includes('href="#main"'),'skip link');
 check(html.includes('<details class="language-control"')&&html.includes('<summary id="language-toggle"')&&html.includes('id="language-option"'),'explicit language disclosure');
 check(html.includes(`rel="canonical" href="${firm.origin}${route.path}"`),'canonical');
 for(const language of ['ro','en','x-default']) check(html.includes(`hreflang="${language}"`),'hreflang '+language);
 check(html.includes('property="og:image"'),'social image');
 for(const field of ['og:site_name','og:title','og:description','og:image:alt'])check(new RegExp('property="'+field+'" content="[^"<]+"').test(html),'complete preview '+field);
 check(/name="twitter:description" content="[^"<]+"/.test(html),'complete card description');
 check(!/[§↗→←↓↑Ⅱ▷⌂◐]/.test(html.split('<body')[1]),'no font-dependent decorative glyphs');
 if(route.key==='home')check(html.includes('data-icon="calendar"'),'consultation calendar pictogram');
 const json=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
 try{const data=JSON.parse(json);if(route.key==='home'||route.key==='practice')check(data.mainEntity?.areaServed?.name==='Romania','nationwide service area');if(route.key!=='home'){check(data.breadcrumb?.['@type']==='BreadcrumbList','breadcrumb schema');const trail=data.breadcrumb?.itemListElement||[];check(trail.length>=2&&trail.every((entry,i)=>entry.position===i+1),'breadcrumb order');check(trail[trail.length-1]?.item===firm.origin+route.path,'breadcrumb canonical destination');}}catch{check(false,'valid structured data');}
 for(const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
  const target=match[1];
  if(!target.startsWith('/'))continue;
  links++;
  if(target.endsWith('/'))check(known.has(target),'broken route '+target);
  else{try{await access(path.join('dist',target));assets++;}catch{check(false,'missing asset '+target);}}
 }
 for(const match of html.matchAll(/srcset="([^"]+)"/g))for(const candidate of match[1].split(',').map(s=>s.trim().split(' ')[0])){try{await access(path.join('dist',candidate));}catch{check(false,'missing srcset asset '+candidate);}}
 for(const img of html.matchAll(/<img\b[^>]*>/g))check(/\balt="[^"]*"/.test(img[0]),'image needs alt');
 if(route.key!=='studio')check(!/<input[^>]+(?:type="(?:email|password)"|name="(?:email|name)")/.test(html),'demo must not collect client data');
 if(route.key==='booking'){check(html.includes('id="consultation-request"')&&html.includes('id="request-review" hidden'),'request starts with editable preferences');check(html.includes('Europe/Bucharest'),'explicit booking timezone');}
 check(!/href="(?:javascript:|")/.test(html),'no inert links');
 for(const anchor of html.matchAll(/href="#([^"]*)"/g))check(!!anchor[1]&&html.includes('id="'+anchor[1]+'"'),'local anchor '+anchor[1]);
 check(!/https:\/\/(?:fonts\.googleapis|fonts\.gstatic|images\.unsplash)/.test(html),'no third-party runtime media');
}
for(const name of ['editorial','sans']) {
 const css=await readFile(`dist/assets/fonts-v2/${name}.css`,'utf8');
 assert(!css.includes('https://'),'Fonts must be self-hosted');
 for(const m of css.matchAll(/url\(([^)]+)\)/g))await access(`dist/assets/fonts-v2/${m[1]}`);
}
const budgets=[['app.js',6000],['booking.js',4200],['booking.css',4200],['styles.css',10000],['motion.js',4000],['motion.css',4500],['editorial.js',1600],['editorial.css',4500],['visual.css',3000]];
for(const [file,budget] of budgets){const size=gzipSync(await readFile('dist/'+file)).length;assert(size<=budget,`${file}: ${size} gzip bytes > ${budget}`);console.log(`${file}: ${size} bytes gzip (budget ${budget})`);}
assert((await stat('dist/assets/consultation-v2-hero-mobile-480.avif')).size<100000,'mobile hero exceeds 100KB');
assert((await stat('dist/assets/consultation-v2-hero-desktop-800.avif')).size<260000,'desktop hero exceeds 260KB');
assert.equal(routes.filter(r=>r.lang==='ro').length,routes.filter(r=>r.lang==='en').length,'bilingual route parity');
assert.equal(routes.filter(r=>r.key==='practice').length,12,'all six bilingual practices');
assert.equal(routes.filter(r=>r.key==='article').length,6,'all three bilingual articles');
assert((await readFile('dist/404.html','utf8')).includes('404'),'404 page');
assert((await readFile('dist/_headers','utf8')).includes("form-action 'none'"),'no form submissions');
assert((await readFile('styles.css','utf8')).includes('prefers-reduced-motion'),'reduced-motion support');
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${routes.length} pages, ${links} internal references, ${assets} direct assets, metadata, locale parity, font files, data minimisation and budgets.`);
