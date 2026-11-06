(() => {
 'use strict';
 const en=document.documentElement.lang==='en';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const tasks=[];
 let frame=0,last=0;
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
 function tick(time){frame=0;const delta=Math.min(40,last?time-last:16);last=time;let again=false;for(const task of tasks)again=task(time,delta)||again;if(again)schedule();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else schedule();});

 document.querySelectorAll('[data-practice-carousel]').forEach(carousel=>{
  const viewport=carousel.querySelector('.carousel-viewport'),track=carousel.querySelector('.practice-track');
  const originals=[...track.children],pause=carousel.querySelector('[data-carousel-pause]');
  const status=carousel.querySelector('.carousel-status');
  let visible=false,hover=false,holding=false,userPaused=false,measure=true,period=0,position=0,manualUntil=0,drag=null,blockClickUntil=0,manualTween=null,pauseIntent=null;
  // Visual loop copies share cached assets. Only the six original links enter the accessibility tree and tab order.
  for(const side of ['before','after']){
   const copies=document.createDocumentFragment();
   for(const original of originals){const copy=original.cloneNode(true);copy.dataset.loopCopy=side;copy.setAttribute('aria-hidden','true');copy.tabIndex=-1;copies.append(copy);}
   if(side==='before')track.prepend(copies);else track.append(copies);
  }
  carousel.dataset.enhanced='true';
  function rotationControl(){
   pause.disabled=reduced.matches;
   pause.setAttribute('aria-pressed',String(userPaused||reduced.matches));
   pause.setAttribute('aria-label',reduced.matches?(en?'Automatic scrolling disabled by reduced-motion preference':'Derulare automată dezactivată prin preferința de mișcare redusă'):userPaused?(en?'Start automatic scrolling':'Pornește derularea automată'):(en?'Pause automatic scrolling':'Oprește derularea automată'));
   pause.querySelector('[data-carousel-motion-label]').textContent=reduced.matches?(en?'Manual':'Manual'):userPaused?(en?'Play':'Pornește'):(en?'Pause':'Pauză');
   pause.querySelector('[data-carousel-motion-icon]').textContent=userPaused||reduced.matches?'▷':'Ⅱ';
  }
  function wrap(){
   if(!period)return;
   const before=viewport.scrollLeft;let next=before;
   if(next<period-.5)next+=period;
   else if(next>=period*2-.5)next-=period;
   if(Math.abs(next-viewport.scrollLeft)>.5){viewport.scrollLeft=next;if(drag)drag.scroll+=next-before;}
   if(carousel.dataset.motion!=='running'||holding||manualTween||performance.now()<manualUntil)position=next;
  }
  function pauseForReading(){userPaused=true;rotationControl();schedule();}
  function move(direction){
   pauseForReading();manualUntil=performance.now()+650;
   const step=period/originals.length;
   const phase=(viewport.scrollLeft-period)/Math.max(step,1);
   const destination=direction>0?Math.floor(phase+.001)+1:Math.ceil(phase-.001)-1;
   manualTween={start:viewport.scrollLeft,end:period+destination*step,at:performance.now()};
   const index=(destination+originals.length)%originals.length;
   status.textContent=(en?'Practice area ':'Aria de practică ')+(index+1)+' / '+originals.length+': '+originals[index].querySelector('h3').textContent;
   schedule();
  }
  carousel.querySelector('[data-carousel-prev]').addEventListener('click',()=>move(-1));
  carousel.querySelector('[data-carousel-next]').addEventListener('click',()=>move(1));
  pause.addEventListener('pointerdown',()=>{pauseIntent=!userPaused;});
  pause.addEventListener('click',()=>{userPaused=pauseIntent===null?!userPaused:pauseIntent;pauseIntent=null;rotationControl();schedule();});
  carousel.addEventListener('focusin',pauseForReading);
  carousel.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;schedule();}});
  carousel.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hover=false;schedule();}});
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
  viewport.addEventListener('wheel',()=>{manualTween=null;manualUntil=performance.now()+1600;schedule();},{passive:true});
  viewport.addEventListener('scroll',()=>{wrap();schedule();},{passive:true});
  viewport.addEventListener('dragstart',e=>e.preventDefault());
  viewport.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   holding=true;manualTween=null;manualUntil=performance.now()+1600;
   if(e.pointerType==='mouse'){
    e.preventDefault();drag={id:e.pointerId,x:e.clientX,scroll:viewport.scrollLeft,moved:false};
   }
   schedule();
  });
  viewport.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const distance=e.clientX-drag.x;
   if(!drag.moved&&Math.abs(distance)>6){drag.moved=true;viewport.setPointerCapture?.(e.pointerId);viewport.classList.add('is-dragging');}
   if(drag.moved){e.preventDefault();viewport.scrollLeft=drag.scroll-distance;}
  });
  function release(e){
   if(drag&&e.pointerId!==undefined&&drag.id!==e.pointerId)return;
   if(drag?.moved)blockClickUntil=performance.now()+400;
   drag=null;holding=false;viewport.classList.remove('is-dragging');manualUntil=performance.now()+1200;schedule();
  }
  viewport.addEventListener('pointerup',release);
  viewport.addEventListener('pointercancel',e=>{if(e.pointerType==='mouse')release(e);});
  viewport.addEventListener('lostpointercapture',release);
  // Native touch scrolling retains browser inertia and vertical page scrolling.
  viewport.addEventListener('touchstart',()=>{holding=true;schedule();},{passive:true});
  viewport.addEventListener('touchend',release,{passive:true});
  viewport.addEventListener('touchcancel',release,{passive:true});
  window.addEventListener('pointerup',e=>{if(holding)release(e);},{passive:true});
  viewport.addEventListener('click',e=>{if(performance.now()<blockClickUntil){e.preventDefault();e.stopPropagation();}},true);
  if('ResizeObserver' in window)new ResizeObserver(()=>{measure=true;schedule();}).observe(viewport);
  else window.addEventListener('resize',()=>{measure=true;schedule();},{passive:true});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.05}).observe(carousel);
  else visible=true;
  reduced.addEventListener('change',()=>{rotationControl();schedule();});
  rotationControl();
  tasks.push((time,delta)=>{
   if(measure){
    measure=false;const old=period;period=originals[0].offsetLeft-track.firstElementChild.offsetLeft;
    if(period){position=period+(old?((position-old+old)%old)/old*period:0);viewport.scrollLeft=position;}
   }
   if(manualTween&&period){const fraction=reduced.matches?1:Math.min(1,(time-manualTween.at)/360);const ease=1-Math.pow(1-fraction,3);const raw=manualTween.start+(manualTween.end-manualTween.start)*ease;position=period+((raw-period)%period+period)%period;viewport.scrollLeft=position;if(fraction>=1)manualTween=null;else return true;}
   const running=visible&&!reduced.matches&&!userPaused&&!hover&&!holding&&period>0;
   carousel.dataset.motion=running?'running':'paused';
   if(!running)return false;
   if(time<manualUntil)return true;
   position+=delta*.032;
   if(position>=period*2)position-=period;
   viewport.scrollLeft=position;
   return true;
  });
 });

 document.querySelectorAll('[data-process]').forEach(journey=>{
  const progress=journey.querySelector('.process-progress'),steps=[...journey.querySelectorAll('.process-steps>li')];
  const rail=journey.querySelector('.process-rail>span'),count=journey.querySelector('[data-process-count]');
  const mobile=window.matchMedia('(max-width: 760px)');
  let visible=false,dirty=true,current=-1,previous=-1;
  progress.hidden=false;
  const invalidate=()=>{dirty=true;schedule();};
  window.addEventListener('scroll',invalidate,{passive:true});
  window.addEventListener('resize',invalidate,{passive:true});
  mobile.addEventListener('change',invalidate);
  if('ResizeObserver' in window)new ResizeObserver(invalidate).observe(journey);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;invalidate();}).observe(journey);
  else visible=true;
  tasks.push(()=>{
   if(!dirty||!visible||!mobile.matches)return false;
   dirty=false;
   const anchor=Math.max(document.querySelector('.header').getBoundingClientRect().height+progress.getBoundingClientRect().height+24,window.innerHeight*.58);
   const centers=steps.map(step=>{const rect=step.getBoundingClientRect();return rect.top+rect.height*.5;});
   const value=Math.max(0,Math.min(1,(anchor-centers[0])/Math.max(1,centers.at(-1)-centers[0])));
   const rounded=Math.round(value*100);
   const active=centers.reduce((best,center,i)=>Math.abs(center-anchor)<Math.abs(centers[best]-anchor)?i:best,0);
   if(rounded!==previous){rail.style.transform=`scaleX(${value})`;progress.setAttribute('aria-valuenow',String(rounded));previous=rounded;}
   if(active!==current){
    steps.forEach((step,i)=>{step.classList.toggle('is-active',i===active);step.classList.toggle('is-complete',i<active);if(i===active)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
    count.textContent='0'+(active+1)+' / 03';
    progress.setAttribute('aria-valuetext',(en?'Step ':'Etapa ')+(active+1)+' / 3: '+steps[active].querySelector('h3').textContent);
    current=active;
   }
   return false;
  });
 });
 schedule();
})();
