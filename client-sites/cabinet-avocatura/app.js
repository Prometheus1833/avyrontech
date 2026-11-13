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
 const desktopMenu=window.matchMedia('(min-width: 1021px)');
 const desktopChange=e=>{if(e.matches)closeMenu();};
 if(desktopMenu.addEventListener)desktopMenu.addEventListener('change',desktopChange);else desktopMenu.addListener?.(desktopChange);

 const languageControl=document.querySelector('#language-control');
 const languageToggle=document.querySelector('#language-toggle');
 const languageOption=document.querySelector('#language-option');
 function closeLanguage(restore=false){if(!languageControl)return;languageControl.open=false;if(restore)languageToggle?.focus();}
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
 accessibilityToggle?.addEventListener('click',()=>{const open=accessibilityPanel.hidden;closeMenu();closeLanguage();accessibilityPanel.hidden=!open;accessibilityToggle.setAttribute('aria-expanded',String(open));});
 document.querySelector('#accessibility-close')?.addEventListener('click',()=>closeAccessibility(true));
 textIncrease?.addEventListener('click',()=>{textLevel=Math.min(2,textLevel+1);applyDisplay();});
 textDecrease?.addEventListener('click',()=>{textLevel=Math.max(0,textLevel-1);applyDisplay();});
 contrastToggle?.addEventListener('click',()=>{highContrast=!highContrast;applyDisplay();});
 document.querySelector('#accessibility-reset')?.addEventListener('click',()=>{textLevel=0;highContrast=false;applyDisplay(false);try{localStorage.removeItem(preferenceKey);}catch{}});
 languageToggle?.addEventListener('click',()=>{closeMenu();closeAccessibility();});
 languageToggle?.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();closeMenu();closeAccessibility();languageControl.open=true;languageOption?.focus();}});
 document.addEventListener('click',e=>{if(!e.target.closest('.language-control'))closeLanguage();});
 document.addEventListener('focusin',e=>{if(!e.target.closest('.language-control'))closeLanguage();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&languageControl?.open)closeLanguage(true);});
 menu?.addEventListener('click',()=>{closeAccessibility();closeLanguage();});
 document.addEventListener('click',e=>{if(!e.target.closest('.accessibility-control'))closeAccessibility();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&accessibilityPanel&&!accessibilityPanel.hidden)closeAccessibility(true);});

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
