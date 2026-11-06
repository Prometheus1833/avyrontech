import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';

const script=await readFile('app.js','utf8');
async function open(route,search='') {
 const html=await readFile('dist'+route+'index.html','utf8');
 const dom=new JSDOM(html,{url:'https://cabinet-avocatura.avyron.eu'+route+search,runScripts:'outside-only',pretendToBeVisual:true});
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
 const {dom,w,d,errors}=await open(booking,'?area=dreptul-familiei');
 const area=d.querySelector('#consultation-area');assert.equal(area.value,'dreptul-familiei');assert(decodeURIComponent(d.querySelector('[data-booking-contact=email]').href).includes(prefix==='/'?'Dreptul familiei':'Family law'));
 const menu=d.querySelector('.menu-toggle');menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true');assert(d.querySelector('#navigation').classList.contains('is-open'));
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(menu.getAttribute('aria-expanded'),'false');
 const switcher=d.querySelector('#language-toggle');
 assert.equal(switcher.textContent.trim(),prefix==='/'?'RO':'EN');
 assert.equal(new URL(switcher.href).pathname,prefix==='/'?'/en/appointments/':'/programari/');
 const accessibility=d.querySelector('#accessibility-toggle'),panel=d.querySelector('#accessibility-panel');
 assert(panel.hidden);accessibility.click();assert(!panel.hidden);
 d.querySelector('#text-increase').click();assert.equal(d.querySelector('#text-size-label').textContent,'115%');
 d.querySelector('#text-increase').click();assert.equal(d.querySelector('#text-size-label').textContent,'130%');
 assert(d.querySelector('#text-increase').disabled);
 d.querySelector('#contrast-toggle').click();assert.equal(d.querySelector('#contrast-toggle').getAttribute('aria-pressed'),'true');
 assert.equal(d.documentElement.dataset.contrast,'high');
 assert.equal(JSON.parse(w.localStorage.getItem('mg-accessibility-v1')).textLevel,2);
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert(panel.hidden);assert.equal(d.activeElement,accessibility);
 accessibility.click();d.querySelector('#accessibility-reset').click();assert.equal(d.querySelector('#text-size-label').textContent,'100%');assert.equal(d.documentElement.dataset.contrast,'normal');assert.equal(w.localStorage.getItem('mg-accessibility-v1'),null);
 d.body.click();assert(panel.hidden);
 assert(d.querySelector('[data-calendar-prev]').disabled);
 assert(d.querySelector('#review-booking').disabled);
 const available=d.querySelector('#calendar-days button:not(:disabled)');assert(available,'calendar has example availability');available.click();
 assert.equal(d.querySelectorAll('.time-slot').length,4);
 assert(d.querySelector('#review-booking').disabled,'date alone must not enable review');
 d.querySelector('.time-slot').click();assert(!d.querySelector('#review-booking').disabled);
 d.querySelector('#review-booking').click();assert(d.querySelector('#booking-result').textContent.includes(prefix==='/'?'Nu s-a rezervat':'Nothing has been reserved'));
 const contactEmail=new URL(d.querySelector('[data-booking-contact=email]').href);assert(contactEmail.searchParams.get('body').includes(d.querySelector('.time-slot[aria-pressed=true]').textContent));
 const duration=d.querySelector('[name=duration][value="60"]');duration.checked=true;duration.dispatchEvent(new w.Event('change'));assert.equal(d.querySelector('#summary-duration').textContent,'60 min');assert.equal(d.querySelector('#booking-result').textContent,'','changes clear stale result');
 const office=d.querySelector('[name=format][value=office]');office.checked=true;office.dispatchEvent(new w.Event('change'));assert(d.querySelector('#summary-format').textContent.includes(prefix==='/'?'La cabinet':'At the practice'));
 for(let i=0;i<5;i++)d.querySelector('[data-calendar-next]').click();assert(d.querySelector('[data-calendar-next]').disabled);
 for(let i=0;i<5;i++)d.querySelector('[data-calendar-prev]').click();assert(d.querySelector('[data-calendar-prev]').disabled);
 const selected=d.querySelector('#calendar-days button[aria-pressed=true]');assert(selected,'selected date persists while browsing months');
 const next=d.querySelectorAll('#calendar-days button:not(:disabled)')[1];next.click();assert(d.querySelector('#review-booking').disabled,'changing date clears previous time');
 area.value='drept-comercial';area.dispatchEvent(new w.Event('change'));assert(decodeURIComponent(d.querySelector('[data-booking-contact=whatsapp]').href).includes(prefix==='/'?'Drept comercial':'Commercial law'));
 assert.equal(errors.length,0,errors.join('\n'));dom.window.close();

 const studio=await open(prefix+(prefix==='/'?'administrare/':'editor/'));
 const form=studio.d.querySelector('#editor-form');
 const unsafe='<img src=x onerror=alert(1)>';
 form.elements.headline.value=unsafe;form.dispatchEvent(new studio.w.Event('submit',{cancelable:true,bubbles:true}));
 assert.equal(studio.d.querySelector('#editor-preview-content h2').textContent,unsafe);
 assert.equal(studio.d.querySelector('#editor-preview-content img'),null,'editor must not interpret HTML');
 studio.d.querySelector('#save-draft').click();
 assert.equal(JSON.parse(studio.w.localStorage.getItem('mg-editor-demo-'+(prefix==='/'?'ro':'en'))).headline,unsafe);
 const imageInput=studio.d.querySelector('#editor-image');
 const safePNG='data:image/png;base64,iVBORw0KGgo=';
 studio.w.createImageBitmap=async file=>{if(file.name==='invalid.png')throw new Error('decode-failed');return {width:20,height:10,close(){}};};
 studio.w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
 studio.w.HTMLCanvasElement.prototype.toDataURL=()=>safePNG;
 function selectFile(name,type){Object.defineProperty(imageInput,'files',{value:[new studio.w.File(['test'],name,{type})],configurable:true});imageInput.dispatchEvent(new studio.w.Event('change'));}
 selectFile('valid.png','image/png');await new Promise(resolve=>studio.w.setTimeout(resolve,0));
 assert.equal(studio.d.querySelector('#editor-preview-image').src,safePNG,'image preview must use re-encoded raster output');
 selectFile('invalid.png','image/png');await new Promise(resolve=>studio.w.setTimeout(resolve,0));
 assert.equal(studio.d.querySelector('#editor-preview-image').src,safePNG,'failed image decoding must preserve only prior safe pixels');
 assert(studio.d.querySelector('#editor-status').textContent.includes(prefix==='/'?'în siguranță':'safely'));
 selectFile('attack.html','text/html');await new Promise(resolve=>studio.w.setTimeout(resolve,0));
 assert.equal(studio.d.querySelector('#editor-preview-image').src,safePNG,'HTML files must be rejected');
 studio.d.querySelector('#clear-draft').click();assert.equal(studio.w.localStorage.length,0);
 assert(studio.d.querySelector('#editor-preview-image').hidden,'clearing a draft also removes image preview');
 assert.notEqual(studio.d.querySelector('#editor-preview-content h2').textContent,unsafe);
 assert.equal(studio.errors.length,0,studio.errors.join('\n'));studio.dom.window.close();
}
console.log('PASS: RO/EN navigation, keyboard dismissal, calendar bounds, date/time selection, duration/format updates, no false booking confirmation, safe editor rendering and local draft lifecycle.');
