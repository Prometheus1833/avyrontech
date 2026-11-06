(() => {
 'use strict';
 const form=document.querySelector('#consultation-request');
 if(!form)return;
 const en=document.documentElement.lang==='en', L=(ro,eng)=>en?eng:ro;
 const $=id=>document.getElementById(id), value=id=>$(id).value;
 const label=id=>$(id).selectedOptions[0].textContent;
 const todayParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=type=>todayParts.find(p=>p.type===type).value;
 const today=`${part('year')}-${part('month')}-${part('day')}`;
 $('preferred-date').min=today;
 const requestedArea=new URLSearchParams(location.search).get('area');
 if([...$('consultation-area').options].some(o=>o.value===requestedArea))$('consultation-area').value=requestedArea;
 let documents=[],prepared=false;
 const guide={
  'dreptul-familiei':L('Puteți preciza obiectul discuției și dacă există un element internațional, fără date despre minori.','You can identify the issue and any international connection, without information about children.'),
  'succesiuni-si-mosteniri':L('Puteți menționa dacă succesiunea a fost deschisă și ce aspect doriți să clarificați.','You can mention whether succession proceedings have begun and what you want to clarify.'),
  'drept-imobiliar':L('Indicați tipul imobilului și obiectul solicitării, fără adresa exactă sau date cadastrale.','Indicate the property type and question, without its exact address or registry details.'),
  'drept-civil-si-creante':L('Puteți menționa tipul raportului contractual și rezultatul urmărit.','You can mention the type of contractual relationship and your intended outcome.'),
  'dreptul-muncii':L('Indicați dacă sunteți angajat sau angajator și tipul actului ori al măsurii discutate.','Mention whether you are an employee or employer and the type of document or measure involved.'),
  'drept-comercial':L('Indicați tipul contractului sau al operațiunii și obiectivul societății, fără informații comerciale confidențiale.','Indicate the contract or transaction type and the company’s objective, without confidential business information.')
 };
 const displayDate=raw=>{if(!raw)return '';const [y,m,d]=raw.split('-').map(Number);return new Intl.DateTimeFormat(en?'en-GB':'ro-RO',{day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d));};
 function selectedFormat(){return form.querySelector('[name=format]:checked').value==='office'?L('La cabinet','At the practice'):L('Online','Online');}
 function timePreference(){return [displayDate(value('preferred-date')),value('preferred-time')==='flexible'?'':label('preferred-time')].filter(Boolean).join(' · ')||L('De stabilit împreună','To be arranged');}
 function draft(){
  const rows=[L('Bună ziua,','Good afternoon,'),'',L('Doresc să stabilesc o consultație juridică.','I would like to arrange a legal consultation.'),`${L('Domeniu','Practice area')}: ${label('consultation-area')}`,`${L('Format','Format')}: ${selectedFormat()}`,`${L('Durată preferată','Preferred duration')}: ${label('consultation-duration')}`,`${L('Preferință de timp','Time preference')}: ${timePreference()} (Europe/Bucharest)`];
  for(const [id,name] of [['request-person',L('Solicitare pentru','Request for')],['request-stage',L('Etapa situației','Current stage')],['request-scope',L('Context','Context')],['request-deadline',L('Termen','Deadline')]])if(value(id))rows.push(`${name}: ${label(id)}${id==='request-deadline'&&value(id)==='yes'&&value('deadline-date')?' · '+displayDate(value('deadline-date')):''}`);
  const description=value('situation-description').trim().slice(0,1200);
  if(description)rows.push('',L('Situația pe scurt:','Brief outline:'),description);
  if(documents.length)rows.push('',L('Am documente relevante pentru discuție. Vă rog să îmi indicați canalul potrivit pentru transmitere.','I have relevant documents for the discussion. Please advise on a suitable transfer channel.'));
  rows.push('',L('Vă rog să îmi comunicați disponibilitatea, onorariul și pașii următori. Vă mulțumesc.','Please let me know your availability, fees and next steps. Thank you.'));
  return rows.join('\n');
 }
 function update(){
  $('summary-area').textContent=value('consultation-area')?label('consultation-area'):L('Îndrumare inițială','Initial guidance');
  $('summary-format').textContent=selectedFormat();$('summary-duration').textContent=label('consultation-duration');$('summary-date').textContent=timePreference();
  $('situation-count').textContent=Math.min(value('situation-description').length,1200)+' / 1200';
  $('area-guidance').textContent=guide[value('consultation-area')]||'';
  const deadlineKnown=value('request-deadline')==='yes';$('deadline-field').hidden=!deadlineKnown;
  if(!deadlineKnown)$('deadline-date').value='';
  const deadline=deadlineKnown?value('deadline-date'):'';
  const days=deadline?(Date.parse(deadline+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000:null;
  $('deadline-alert').hidden=!(value('request-deadline')==='unsure'||deadlineKnown&&(days===null||days<=7));
  const message=draft();$('request-preview').textContent=message;$('attachment-reminder').hidden=!documents.length;
  document.querySelectorAll('[data-booking-contact]').forEach(link=>{link.href=link.dataset.bookingContact==='whatsapp'?'https://wa.me/'+link.dataset.destination+'?text='+encodeURIComponent(message):'mailto:'+link.dataset.destination+'?subject='+encodeURIComponent(L('Solicitare de consultație juridică','Legal consultation request')+(value('consultation-area')?' · '+label('consultation-area'):''))+'&body='+encodeURIComponent(message);});
  if(prepared)$('request-status').textContent=L('Rezumat actualizat.','Summary updated.');
 }
 function clearFiles(){documents=[];$('request-documents').value='';$('document-list').replaceChildren();$('clear-documents').hidden=true;$('document-status').textContent='';}
 $('request-documents').addEventListener('change',()=>{
  const files=[...$('request-documents').files];
  clearFiles();
  const validType=f=>/\.(pdf|jpe?g|png)$/i.test(f.name)&&(!f.type||['application/pdf','image/jpeg','image/png'].includes(f.type));
  if(files.length>3||files.reduce((sum,f)=>sum+f.size,0)>10*1024*1024||files.some(f=>!validType(f))){$('document-status').textContent=L('Alegeți cel mult 3 fișiere PDF, JPG sau PNG, de maximum 10 MB în total.','Choose up to 3 PDF, JPG or PNG files, totalling no more than 10 MB.');update();return;}
  documents=files.map(f=>({name:f.name,size:f.size}));
  for(const file of documents){const li=document.createElement('li'),name=document.createElement('span'),size=document.createElement('small');name.textContent=file.name;size.textContent=file.size<1024*1024?Math.ceil(file.size/1024)+' KB':(file.size/1024/1024).toFixed(1)+' MB';li.append(name,size);$('document-list').append(li);}
  $('clear-documents').hidden=!documents.length;
  $('document-status').textContent=documents.length?L('Documente selectate local. Le puteți atașa separat după stabilirea canalului de transfer.','Documents selected locally. You can attach them separately after agreeing a transfer channel.'):'';
  update();
 });
 $('clear-documents').addEventListener('click',()=>{clearFiles();update();});
 form.addEventListener('input',update);form.addEventListener('change',update);
 form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;prepared=true;update();$('request-review').hidden=false;$('request-start-hint').hidden=true;$('request-status').textContent=L('Mesaj pregătit. Alegeți e-mailul sau WhatsApp pentru a continua.','Message prepared. Choose email or WhatsApp to continue.');$('request-preview').focus();});
 $('edit-request').addEventListener('click',()=>$('consultation-area').focus());
 form.addEventListener('reset',()=>{prepared=false;clearFiles();$('request-review').hidden=true;$('request-start-hint').hidden=false;$('request-status').textContent=L('Răspunsurile au fost șterse.','Your answers have been cleared.');setTimeout(update,0);});
 update();
})();
