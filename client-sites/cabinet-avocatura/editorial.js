(() => {
 'use strict';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const animations=new Set();
 const stop=()=>{animations.forEach(animation=>animation.cancel());animations.clear();};
 const onPreference=()=>{if(reduced.matches)stop();};
 if(reduced.addEventListener)reduced.addEventListener('change',onPreference);else reduced.addListener?.(onPreference);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 if(reduced.matches||navigator.connection?.saveData||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
 // Content is visible by default. Entry animations never gate reading or navigation.
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   observer.unobserve(entry.target);
   if(reduced.matches||document.hidden)continue;
   try{
    const animation=entry.target.animate([{opacity:.78,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:520,easing:'cubic-bezier(.2,.7,.2,1)',fill:'none'});
    animations.add(animation);
    animation.onfinish=()=>animations.delete(animation);
    animation.oncancel=()=>animations.delete(animation);
   }catch{/* Unsupported animation leaves the default visible content intact. */}
  }
 },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
 document.querySelectorAll('.hero-visual,.section-head,.about-photo,.values-grid,.service-section,.audience-guide>article,.footer-invitation').forEach(element=>observer.observe(element));
})();
