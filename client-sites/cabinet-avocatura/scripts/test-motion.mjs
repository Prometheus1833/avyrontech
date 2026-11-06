import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
const source=await readFile('motion.js','utf8');
for(const lang of ['ro','en']){
 const html=await readFile(lang==='ro'?'dist/index.html':'dist/en/index.html','utf8');
 const dom=new JSDOM(html,{url:'https://cabinet-avocatura.avyron.eu/'+(lang==='en'?'en/':''),runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,viewport=d.querySelector('.carousel-viewport'),carousel=d.querySelector('[data-practice-carousel]');
 let clock=0,nextFrame=0,scroll=0,hidden=false;const frames=new Map(),media=new Map(),observers=[];
 Object.defineProperty(w,'innerHeight',{value:800});
 Object.defineProperty(w.performance,'now',{value:()=>clock});Object.defineProperty(d,'hidden',{get:()=>hidden});
 w.requestAnimationFrame=cb=>{frames.set(++nextFrame,cb);return nextFrame;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.matchMedia=query=>{if(!media.has(query))media.set(query,{matches:query.includes('max-width'),listeners:[],addEventListener(type,cb){this.listeners.push(cb);}});return media.get(query);};
 w.IntersectionObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(target){this.target=target;this.cb([{target,isIntersecting:true}]);}};
 w.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb();}};
 Object.defineProperty(w.HTMLElement.prototype,'offsetLeft',{get(){return this.classList.contains('practice-card')?[...this.parentElement.children].indexOf(this)*344:0;}});
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.matches('.header'))return {height:80};if(this.matches('.process-progress'))return {height:80};if(this.matches('.process-steps>li'))return {top:1000+[...this.parentElement.children].indexOf(this)*300-scroll,height:200};return {top:0,height:500};};
 function advance(ms){for(let end=clock+ms;clock<end;){clock=Math.min(end,clock+20);const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(clock);assert(frames.size<=1,'one shared frame scheduler');}}
 function pointer(type,x=500){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x});Object.defineProperties(e,{pointerType:{value:'mouse'},pointerId:{value:1}});viewport.dispatchEvent(e);}
 const errors=[];w.addEventListener('error',e=>errors.push(e.message));w.eval(source);advance(20);
 const period=6*344;
 assert.equal(d.querySelectorAll('.practice-card:not([data-loop-copy])').length,6);assert.equal(d.querySelectorAll('[data-loop-copy][aria-hidden=true][tabindex="-1"]').length,12);
 let before=viewport.scrollLeft;advance(300);assert(viewport.scrollLeft>before,'right-to-left motion');
 pointer('pointerdown');before=viewport.scrollLeft;advance(500);assert.equal(viewport.scrollLeft,before,'press pauses motion');pointer('pointerup');advance(1400);assert(viewport.scrollLeft>before,'release resumes after an interval');
 viewport.dispatchEvent(new w.Event('touchstart'));viewport.scrollLeft+=180;viewport.dispatchEvent(new w.Event('scroll'));before=viewport.scrollLeft;advance(400);assert.equal(viewport.scrollLeft,before,'native touch interaction pauses autoplay');viewport.dispatchEvent(new w.Event('touchend'));advance(1400);assert(viewport.scrollLeft>before,'native touch release resumes from the new position');
 d.querySelector('.practice-card:not([data-loop-copy])').focus();advance(40);before=viewport.scrollLeft;advance(300);assert.equal(viewport.scrollLeft,before,'focus stops motion');
 const play=d.querySelector('[data-carousel-pause]');assert.equal(play.getAttribute('aria-pressed'),'true');play.click();advance(300);assert(viewport.scrollLeft>before,'explicit play resumes');
 d.querySelector('[data-carousel-next]').click();before=viewport.scrollLeft;advance(400);assert(viewport.scrollLeft>before&&viewport.scrollLeft-before<=344,'next aligns the following card');assert(Math.abs((viewport.scrollLeft-period)%344)<1,'arrows finish at a card boundary');assert(d.querySelector('.carousel-status').textContent.includes('/ 6'));
 viewport.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));before=viewport.scrollLeft;advance(400);assert(Math.abs(viewport.scrollLeft-before+344)<1,'keyboard moves back');
 play.click();advance(80000);assert(viewport.scrollLeft>=period&&viewport.scrollLeft<period*2,'loop remains within equivalent window');
 const observer=observers.find(o=>o.target===carousel);observer.cb([{isIntersecting:false}]);advance(30);before=viewport.scrollLeft;advance(300);assert.equal(viewport.scrollLeft,before,'offscreen stops');assert.equal(frames.size,0,'offscreen does not keep scheduler alive');observer.cb([{isIntersecting:true}]);advance(50);
 hidden=true;d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,0);hidden=false;d.dispatchEvent(new w.Event('visibilitychange'));advance(50);
 const reduced=media.get('(prefers-reduced-motion: reduce)');reduced.matches=true;reduced.listeners.forEach(cb=>cb({matches:true}));advance(30);before=viewport.scrollLeft;advance(200);assert.equal(viewport.scrollLeft,before,'reduced motion disables autoplay');assert(play.disabled);
 d.querySelector('[data-carousel-next]').click();advance(20);assert(viewport.scrollLeft>before&&viewport.scrollLeft-before<=344,'manual navigation remains available');
 const progress=d.querySelector('.process-progress'),fill=d.querySelector('.process-fill');
 assert.equal(d.querySelectorAll('[data-process] .process-steps>li').length,3,'exactly three content cards');
 assert.equal(d.querySelectorAll('[data-process] [role=progressbar]').length,1,'one continuous rail');
 assert.equal(progress.getAttribute('aria-orientation'),'vertical');
 assert.equal(d.querySelector('.progress-caption,[data-process-count],.process-rail'),null,'no extra notification or horizontal progress');
 for(const [position,expected]of [[400,0],[736,25],[936,50],[1136,75],[1400,100],[736,25]]){
  scroll=position;w.dispatchEvent(new w.Event('scroll'));advance(20);assert.equal(progress.getAttribute('aria-valuenow'),String(expected),'continuous forward and reverse reading progress');assert(Math.abs(parseFloat(fill.style.transform.slice(7))-expected/100)<1e-9);
 }
 scroll=936;w.dispatchEvent(new w.Event('scroll'));advance(20);assert.equal(d.querySelectorAll('.process-steps>[aria-current=step]').length,1);assert.equal(d.querySelector('.process-steps>[aria-current=step] .step-number').textContent,'02');
 const mobile=media.get('(max-width: 760px)');mobile.matches=false;mobile.listeners.forEach(cb=>cb({matches:false}));advance(20);assert(progress.hidden,'rail hidden on desktop');mobile.matches=true;mobile.listeners.forEach(cb=>cb({matches:true}));advance(20);assert(!progress.hidden,'rail restored on mobile');
 assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
}
console.log('PASS: RO/EN carousel direction, press pause, focus/resume, arrows/keyboard, loop bounds, hidden/offscreen idle, reduced motion and scroll-linked progress.');
