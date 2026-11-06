(() => {
 'use strict';
 const en = document.documentElement.lang === 'en';
 const locale = en ? 'en-GB' : 'ro-RO';
 const menu = document.querySelector('.menu-toggle');
 const nav = document.querySelector('#navigation');
 function closeMenu() { if (!menu || !nav) return; menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label',menu.dataset.open); nav.classList.remove('is-open'); }
 menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label',open ? menu.dataset.close : menu.dataset.open); nav?.classList.toggle('is-open',open); });
 document.addEventListener('keydown',e => { if(e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
 document.addEventListener('click',e => { if(!e.target.closest('.header')) closeMenu(); });
 window.matchMedia('(min-width: 1021px)').addEventListener('change',e => { if(e.matches) closeMenu(); });

 const accessibilityToggle=document.querySelector('#accessibility-toggle');
 const accessibilityPanel=document.querySelector('#accessibility-panel');
 const contrastToggle=document.querySelector('#contrast-toggle');
 const textIncrease=document.querySelector('#text-increase');
 const textDecrease=document.querySelector('#text-decrease');
 const sizeLabel=document.querySelector('#text-size-label');
 const preferenceKey='mg-accessibility-v1';
 const sizes=['normal','large','largest'];
 let textLevel=0,highContrast=false;
 function applyDisplay(save=true){
  document.documentElement.dataset.textSize=sizes[textLevel];
  document.documentElement.dataset.contrast=highContrast?'high':'normal';
  if(sizeLabel)sizeLabel.textContent=[100,115,130][textLevel]+'%';
  if(textIncrease)textIncrease.disabled=textLevel===2;
  if(textDecrease)textDecrease.disabled=textLevel===0;
  contrastToggle?.setAttribute('aria-pressed',String(highContrast));
  if(save)try{localStorage.setItem(preferenceKey,JSON.stringify({textLevel,highContrast}));}catch{}
 }
 function closeAccessibility(restore=false){
  if(!accessibilityPanel||!accessibilityToggle)return;
  accessibilityPanel.hidden=true;accessibilityToggle.setAttribute('aria-expanded','false');
  if(restore)accessibilityToggle.focus();
 }
 try{const saved=JSON.parse(localStorage.getItem(preferenceKey)||'null');if(saved&&typeof saved==='object'){if(Number.isInteger(saved.textLevel)&&saved.textLevel>=0&&saved.textLevel<=2)textLevel=saved.textLevel;highContrast=saved.highContrast===true;}}catch{}
 applyDisplay(false);
 accessibilityToggle?.addEventListener('click',()=>{const open=accessibilityPanel.hidden;closeMenu();accessibilityPanel.hidden=!open;accessibilityToggle.setAttribute('aria-expanded',String(open));});
 document.querySelector('#accessibility-close')?.addEventListener('click',()=>closeAccessibility(true));
 textIncrease?.addEventListener('click',()=>{textLevel=Math.min(2,textLevel+1);applyDisplay();});
 textDecrease?.addEventListener('click',()=>{textLevel=Math.max(0,textLevel-1);applyDisplay();});
 contrastToggle?.addEventListener('click',()=>{highContrast=!highContrast;applyDisplay();});
 document.querySelector('#accessibility-reset')?.addEventListener('click',()=>{textLevel=0;highContrast=false;applyDisplay(false);try{localStorage.removeItem(preferenceKey);}catch{}});
 menu?.addEventListener('click',()=>closeAccessibility());
 document.addEventListener('click',e=>{if(!e.target.closest('.accessibility-control'))closeAccessibility();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&accessibilityPanel&&!accessibilityPanel.hidden)closeAccessibility(true);});

 const booking = document.querySelector('[data-booking]');
 if (booking) {
  const todayParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const getPart = type => Number(todayParts.find(p=>p.type===type).value);
  const today = new Date(getPart('year'),getPart('month')-1,getPart('day'));
  let month = new Date(today.getFullYear(),today.getMonth(),1), selectedDay=null, selectedTime=null;
  const days = document.querySelector('#calendar-days');
  const times = document.querySelector('#time-slots');
  const review = document.querySelector('#review-booking');
  const dateKey = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  function summary() {
   const format = booking.querySelector('[name=format]:checked').value;
   const duration = booking.querySelector('[name=duration]:checked').value;
   document.querySelector('#summary-format').textContent = format === 'online' ? (en?'Online consultation':'Consultație online') : (en?'At the practice':'La cabinet');
   document.querySelector('#summary-duration').textContent = duration + ' min';
   document.querySelector('#summary-date').textContent = selectedDay ? selectedDay.toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'}) + (selectedTime?' · '+selectedTime:'') : (en?'Not selected':'Neselectate');
   review.disabled = !(selectedDay && selectedTime);
   document.querySelector('#booking-result').textContent='';
   const progress=document.querySelectorAll('.booking-progress li');
   progress.forEach((li,i)=> { if(i === (selectedTime?2:selectedDay?1:0)) li.setAttribute('aria-current','step'); else li.removeAttribute('aria-current'); });
  }
  function renderTimes() {
   times.replaceChildren();
   if (!selectedDay) { const p=document.createElement('p');p.className='fineprint';p.textContent=en?'Choose a date to see example times.':'Alegeți o dată pentru a vedea exemple de intervale.';times.append(p);return; }
   for(const time of ['09:00','11:00','14:00','16:00']) {
    const b=document.createElement('button');b.type='button';b.className='time-slot';b.textContent=time;b.setAttribute('aria-pressed',String(selectedTime===time));b.setAttribute('aria-label',(en?'Illustrative time slot ':'Interval ilustrativ ')+time+' · Europe/Bucharest');
    b.addEventListener('click',()=>{selectedTime=time;renderTimes();summary();});times.append(b);
   }
  }
  function renderCalendar() {
   document.querySelector('#calendar-month').textContent=month.toLocaleDateString(locale,{month:'long',year:'numeric'});
   const offset=(month.getDay()+6)%7;
   const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
   days.replaceChildren();
   for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.className='calendar-blank';blank.setAttribute('aria-hidden','true');days.append(blank);}
   for(let day=1;day<=count;day++) {
    const date=new Date(month.getFullYear(),month.getMonth(),day);
    const b=document.createElement('button');b.type='button';b.textContent=String(day);b.dataset.date=dateKey(date);b.disabled=date<=today||date.getDay()===0||date.getDay()===6;
    b.setAttribute('aria-label',date.toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(b.disabled?(en?' — unavailable':' — indisponibil'):(en?' — example availability':' — disponibilitate ilustrativă')));
    b.setAttribute('aria-pressed',String(!!selectedDay&&dateKey(selectedDay)===dateKey(date)));
    b.addEventListener('click',()=>{selectedDay=date;selectedTime=null;renderCalendar();renderTimes();summary();days.querySelector(`[data-date="${dateKey(date)}"]`)?.focus();});days.append(b);
   }
   const monthDifference=(month.getFullYear()-today.getFullYear())*12+month.getMonth()-today.getMonth();
   document.querySelector('[data-calendar-prev]').disabled=monthDifference<=0;
   document.querySelector('[data-calendar-next]').disabled=monthDifference>=5;
  }
  document.querySelector('[data-calendar-prev]').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar();});
  document.querySelector('[data-calendar-next]').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar();});
  booking.querySelectorAll('input').forEach(i=>i.addEventListener('change',summary));
  review.addEventListener('click',()=>{ if(review.disabled)return; document.querySelector('#booking-result').textContent=(en?'Demo reviewed: ':'Selecție demonstrativă verificată: ')+document.querySelector('#summary-date').textContent+(en?'. Nothing has been reserved or charged. Please contact the practice to arrange an actual meeting.':'. Nu s-a rezervat și nu s-a plătit nimic. Contactați cabinetul pentru o întâlnire reală.'); });
  renderCalendar();summary();
 }

 const editor=document.querySelector('#editor-form');
 if(editor) {
  const key='mg-editor-demo-'+(en?'en':'ro');
  const status=document.querySelector('#editor-status');
  const names=['headline','intro','articleTitle','articleBody','fee'];
  const data=()=>Object.fromEntries(names.map(n=>[n,editor.elements[n].value]));
  function preview(){const d=data(),out=document.querySelector('#editor-preview-content');out.replaceChildren();for(const [tag,value] of [['h2',d.headline],['p',d.intro],['h3',d.articleTitle],['p',d.articleBody],['p',d.fee?(en?'Draft fee: ':'Onorariu în ciornă: ')+d.fee+' RON':'']]){if(!value)continue;const el=document.createElement(tag);el.textContent=value;out.append(el);}}
  editor.addEventListener('submit',e=>{e.preventDefault();preview();status.textContent=en?'Local preview updated. The published website is unchanged.':'Previzualizare locală actualizată. Site-ul publicat nu este modificat.';});
  document.querySelector('#save-draft').addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify(data()));status.textContent=en?'Demonstration draft saved on this device.':'Ciornă demonstrativă salvată pe acest dispozitiv.';}catch{status.textContent=en?'Browser storage is unavailable. Export the draft instead.':'Stocarea în browser nu este disponibilă. Puteți exporta ciorna.';}});
  document.querySelector('#clear-draft').addEventListener('click',()=>{try{localStorage.removeItem(key);}catch{}editor.reset();preview();imageGeneration++;image.hidden=true;image.removeAttribute('src');status.textContent=en?'Local draft removed.':'Ciorna locală a fost ștearsă.';});
  document.querySelector('#export-draft').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({kind:'editorial-demo',language:en?'en':'ro',published:false,...data()},null,2)],{type:'application/json'});const link=document.createElement('a');const downloadURL=URL.createObjectURL(blob);link.href=downloadURL;link.download='manuela-galuscan-editorial-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(downloadURL),1000);status.textContent=en?'Draft exported. No online publication was performed.':'Ciornă exportată. Nu s-a efectuat nicio publicare online.';});
  let imageGeneration=0; const image=document.querySelector('#editor-preview-image');
  document.querySelector('#editor-image').addEventListener('change',async e=>{
   const file=e.target.files[0]; if(!file)return;
   const generation=++imageGeneration;
   if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>10*1024*1024){status.textContent=en?'Choose a JPEG, PNG, WebP or AVIF image under 10 MB.':'Alegeți o imagine JPEG, PNG, WebP sau AVIF de maximum 10 MB.';e.target.value='';return;}
   let bitmap;
   try {
    bitmap=await createImageBitmap(file);
    if(generation!==imageGeneration)return;
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>32000000)throw new Error('image-size');
    const scale=Math.min(1,1600/bitmap.width,1200/bitmap.height);
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d');if(!context)throw new Error('canvas-unavailable');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    // Decode into pixels and re-encode as PNG. Never expose the original file as a navigable Blob URL.
    image.src=canvas.toDataURL('image/png');image.hidden=false;
    status.textContent=en?'Image decoded locally as PNG; it is not included in the JSON export.':'Imagine decodată local în format PNG; nu este inclusă în exportul JSON.';
   } catch {
    if(generation===imageGeneration){e.target.value='';status.textContent=en?'This image could not be previewed safely. Choose another image or use the text editor.':'Această imagine nu a putut fi previzualizată în siguranță. Alegeți alta sau utilizați editorul de texte.';}
   } finally {bitmap?.close();}
  });
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')for(const n of names)if(typeof saved[n]==='string')editor.elements[n].value=saved[n];}catch{}
  preview();
 }
})();
