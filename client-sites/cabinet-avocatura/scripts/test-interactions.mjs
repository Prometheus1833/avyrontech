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
 if(window.document.querySelector('[data-booking]'))window.eval(await readFile('booking.js','utf8'));
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
 assert.equal(d.querySelector('#preferred-date').min,'2026-11-06');
 assert(d.querySelector('#request-review').hidden);
 d.querySelector('#preferred-date').value='2026-11-09';
 const time=d.querySelector('#preferred-time');time.value='morning';time.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert(d.querySelector('#summary-date').textContent.includes('09:00'));
 const duration=d.querySelector('#consultation-duration');duration.value='60';duration.dispatchEvent(new w.Event('change',{bubbles:true}));assert(d.querySelector('#summary-duration').textContent.includes('60'));
 const office=d.querySelector('[name=format][value=office]');office.checked=true;office.dispatchEvent(new w.Event('change',{bubbles:true}));assert(d.querySelector('#summary-format').textContent.includes(prefix==='/'?'La cabinet':'At the practice'));
 const deadline=d.querySelector('#request-deadline');deadline.value='yes';deadline.dispatchEvent(new w.Event('change',{bubbles:true}));assert(!d.querySelector('#deadline-field').hidden);assert(!d.querySelector('#deadline-alert').hidden);
 const deadlineDate=d.querySelector('#deadline-date');deadlineDate.value='2026-11-30';deadlineDate.dispatchEvent(new w.Event('input',{bubbles:true}));assert(d.querySelector('#deadline-alert').hidden);
 deadlineDate.value='2026-11-08';deadlineDate.dispatchEvent(new w.Event('input',{bubbles:true}));assert(!d.querySelector('#deadline-alert').hidden);
 deadline.value='no';deadline.dispatchEvent(new w.Event('change',{bubbles:true}));assert(d.querySelector('#deadline-field').hidden);assert.equal(deadlineDate.value,'');
 const description=d.querySelector('#situation-description');description.value='<img src=x onerror=alert(1)> întrebarea principală';description.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert(d.querySelector('#request-preview').textContent.includes(description.value));assert(!d.querySelector('#request-preview img'),'description renders as text');assert(d.querySelector('#situation-count').textContent.startsWith(String(description.value.length)));
 d.querySelector('#consultation-request').dispatchEvent(new w.Event('submit',{cancelable:true}));assert(!d.querySelector('#request-review').hidden);assert.equal(d.activeElement,d.querySelector('#request-preview'));
 const contactEmail=new URL(d.querySelector('[data-booking-contact=email]').href);assert(contactEmail.searchParams.get('body').includes(description.value));assert(contactEmail.searchParams.get('body').includes('09:00'));
 area.value='drept-comercial';area.dispatchEvent(new w.Event('change',{bubbles:true}));assert(decodeURIComponent(d.querySelector('[data-booking-contact=whatsapp]').href).includes(prefix==='/'?'Drept comercial':'Commercial law'));assert(d.querySelector('#area-guidance').textContent.length>20);
 // Selection uses file metadata only, rejects unsupported types and never reads or uploads contents.
 const docs=d.querySelector('#request-documents');
 w.FileReader=class{constructor(){throw new Error('File contents must not be read');}};
 w.fetch=()=>{throw new Error('Requests must stay local');};
 function files(items){Object.defineProperty(docs,'files',{value:items,configurable:true});docs.dispatchEvent(new w.Event('change',{bubbles:true}));}
 files([new w.File(['example'],'contract-privat.pdf',{type:'application/pdf'})]);assert.equal(d.querySelectorAll('#document-list li').length,1);assert(!d.querySelector('#attachment-reminder').hidden);assert(!decodeURIComponent(d.querySelector('[data-booking-contact=email]').href).includes('contract-privat.pdf'),'filenames are not disclosed in draft');
 files([new w.File(['html'],'attack.html',{type:'text/html'})]);assert.equal(d.querySelectorAll('#document-list li').length,0);assert(d.querySelector('#document-status').textContent.includes('PDF'));
 files(Array.from({length:4},(_,i)=>new w.File(['x'],i+'.pdf',{type:'application/pdf'})));assert.equal(d.querySelectorAll('#document-list li').length,0);
 files([{name:'large.pdf',type:'application/pdf',size:11*1024*1024}]);assert.equal(d.querySelectorAll('#document-list li').length,0);
 files([new w.File(['x'],'safe.pdf',{type:'application/pdf'})]);d.querySelector('#clear-documents').click();assert.equal(d.querySelectorAll('#document-list li').length,0);assert(d.querySelector('#attachment-reminder').hidden);
 assert.equal(w.localStorage.length,0,'no questionnaire persistence');
 d.querySelector('#consultation-request').reset();await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(description.value,'');assert.equal(d.querySelector('#situation-count').textContent,'0 / 1200');assert(d.querySelector('#request-review').hidden);assert.equal(d.querySelector('#preferred-date').value,'');
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
console.log('PASS: RO/EN navigation, keyboard dismissal, consultation questionnaire, preferred date/time, contextual drafts, safe local file selection and full reset, safe editor rendering and local draft lifecycle.');
