import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';

const script=await readFile('app.js','utf8');
async function open(route) {
 const html=await readFile('dist'+route+'index.html','utf8');
 const dom=new JSDOM(html,{url:'https://cabinet-avocatura.avyron.eu'+route,runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom;
 const NativeDate=window.Date;
 window.Date=class extends NativeDate {
  constructor(...args){super(...(args.length?args:['2026-11-06T10:00:00.000Z']));}
  static now(){return NativeDate.parse('2026-11-06T10:00:00.000Z');}
 };
 window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const errors=[];
 window.addEventListener('error',e=>errors.push(e.message));
 window.eval(script);
 return {dom,w:window,d:window.document,errors};
}
for(const prefix of ['/','/en/']) {
 const booking=prefix+(prefix==='/'?'programari/':'appointments/');
 const {dom,w,d,errors}=await open(booking);
 const menu=d.querySelector('.menu-toggle');menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true');assert(d.querySelector('#navigation').classList.contains('is-open'));
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(menu.getAttribute('aria-expanded'),'false');
 assert(d.querySelector('[data-calendar-prev]').disabled);
 assert(d.querySelector('#review-booking').disabled);
 const available=d.querySelector('#calendar-days button:not(:disabled)');assert(available,'calendar has example availability');available.click();
 assert.equal(d.querySelectorAll('.time-slot').length,4);
 assert(d.querySelector('#review-booking').disabled,'date alone must not enable review');
 d.querySelector('.time-slot').click();assert(!d.querySelector('#review-booking').disabled);
 d.querySelector('#review-booking').click();assert(d.querySelector('#booking-result').textContent.includes(prefix==='/'?'Nu s-a rezervat':'Nothing has been reserved'));
 const duration=d.querySelector('[name=duration][value="60"]');duration.checked=true;duration.dispatchEvent(new w.Event('change'));assert.equal(d.querySelector('#summary-duration').textContent,'60 min');assert.equal(d.querySelector('#booking-result').textContent,'','changes clear stale result');
 const office=d.querySelector('[name=format][value=office]');office.checked=true;office.dispatchEvent(new w.Event('change'));assert(d.querySelector('#summary-format').textContent.includes(prefix==='/'?'La cabinet':'At the practice'));
 for(let i=0;i<5;i++)d.querySelector('[data-calendar-next]').click();assert(d.querySelector('[data-calendar-next]').disabled);
 for(let i=0;i<5;i++)d.querySelector('[data-calendar-prev]').click();assert(d.querySelector('[data-calendar-prev]').disabled);
 const selected=d.querySelector('#calendar-days button[aria-pressed=true]');assert(selected,'selected date persists while browsing months');
 const next=d.querySelectorAll('#calendar-days button:not(:disabled)')[1];next.click();assert(d.querySelector('#review-booking').disabled,'changing date clears previous time');
 assert.equal(errors.length,0,errors.join('\n'));dom.window.close();

 const studio=await open(prefix+(prefix==='/'?'administrare/':'editor/'));
 const form=studio.d.querySelector('#editor-form');
 const unsafe='<img src=x onerror=alert(1)>';
 form.elements.headline.value=unsafe;form.dispatchEvent(new studio.w.Event('submit',{cancelable:true,bubbles:true}));
 assert.equal(studio.d.querySelector('#editor-preview-content h2').textContent,unsafe);
 assert.equal(studio.d.querySelector('#editor-preview-content img'),null,'editor must not interpret HTML');
 studio.d.querySelector('#save-draft').click();
 assert.equal(JSON.parse(studio.w.localStorage.getItem('mg-editor-demo-'+(prefix==='/'?'ro':'en'))).headline,unsafe);
 studio.d.querySelector('#clear-draft').click();assert.equal(studio.w.localStorage.length,0);
 assert.notEqual(studio.d.querySelector('#editor-preview-content h2').textContent,unsafe);
 assert.equal(studio.errors.length,0,studio.errors.join('\n'));studio.dom.window.close();
}
console.log('PASS: RO/EN navigation, keyboard dismissal, calendar bounds, date/time selection, duration/format updates, no false booking confirmation, safe editor rendering and local draft lifecycle.');
