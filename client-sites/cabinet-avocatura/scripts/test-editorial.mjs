import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import {practices,articles,translations} from '../content.mjs';
const coverage=[['extraneitate','autoritate părintească','locuinței copilului','relații personale','întreținere','paternității','adopție','partaj','protecție','haga'],['succesorale','partaj','liberalităților','certificatelor'],['revendicări','uzucapiune','servituți','grănițuire','indiviziune','evacuări','tulburarea de posesie'],['pretenții','contractuală','delictuală','anularea','rezoluțiunea','rezilierea','comerciale'],['concedierilor','disciplinare','salariale','negocierea','încetarea','angajați','angajatori'],['redactarea','verificarea','negocierea','executarea','consultanță','litigii']];
for(const [index,item] of practices.entries()){
 const serviceText=item.ro.services.join(' ').toLocaleLowerCase('ro');
 for(const term of coverage[index])assert(serviceText.includes(term),'brief service missing: '+term);
 for(const lang of ['ro','en']){
  const route=(lang==='ro'?'/arii-de-practica/':'/en/practice-areas/')+(lang==='ro'?item.slug:item.enSlug)+'/';
  const html=await readFile('dist'+route+'index.html','utf8');const d=new JSDOM(html).window.document;
  assert.equal(d.querySelectorAll('.practice-faq details').length,3);
  for(const link of d.querySelectorAll('.practice-quicknav a'))assert(d.querySelector(link.getAttribute('href')),'quick navigation must have a target');
  assert(d.querySelector('.detail-content').textContent.trim().split(/\s+/).length>=300,'practice dossier must contain useful extended content');
  assert(d.querySelector('meta[name=description]').content===item[lang].seoDescription);
  const data=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);assert.equal(data.breadcrumb.itemListElement.length,3);
 }
}
assert.equal(translations.ro.book,'Solicitați o consultație');
for(const article of articles)for(const lang of ['ro','en'])assert(article[lang].sections.length>=5,'extended guides need a useful reading structure');
const home=await readFile('dist/index.html','utf8'),entry=await readFile('editorial.js','utf8');
// An unsupported optional animation must never hide the default content.
const fallback=new JSDOM(home,{runScripts:'outside-only',pretendToBeVisual:true});fallback.window.matchMedia=()=>({matches:false,addListener(){}});fallback.window.eval(entry);assert(!fallback.window.document.querySelector('[style*="opacity: 0"]'));fallback.window.close();
const legacy=new JSDOM(home,{url:'https://cabinet-avocatura.avyron.eu/',runScripts:'outside-only',pretendToBeVisual:true});
legacy.window.matchMedia=()=>({matches:false,addListener(){}});legacy.window.Array.prototype.at=undefined;legacy.window.eval(await readFile('app.js','utf8'));legacy.window.eval(await readFile('motion.js','utf8'));legacy.window.document.querySelector('.menu-toggle').click();assert.equal(legacy.window.document.querySelector('.menu-toggle').getAttribute('aria-expanded'),'true');legacy.window.close();
const animated=new JSDOM(home,{runScripts:'outside-only',pretendToBeVisual:true});const w=animated.window;let reduced=false,preferenceChange,observed=[],cancelled=0;
w.matchMedia=()=>({get matches(){return reduced;},addEventListener(type,cb){preferenceChange=cb;}});
w.IntersectionObserver=class{constructor(callback){this.callback=callback;observed.push(this);}observe(target){this.callback([{target,isIntersecting:true}]);}unobserve(){}};
w.Element.prototype.animate=function(){return {cancel(){cancelled++;this.oncancel?.();}};};w.eval(entry);assert(observed.length>0);reduced=true;preferenceChange();assert(cancelled>0,'new reduced-motion preference cancels active entry animations');assert(!w.document.querySelector('[hidden].hero-visual'));animated.window.close();
console.log('PASS: complete brief service coverage, 12 extended practice dossiers, anchor navigation, breadcrumb hierarchy, three longer guides and non-blocking optional motion.');
