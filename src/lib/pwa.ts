export type InstallPrompt = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let prompt:InstallPrompt|null=null;
export const takeInstallPrompt=()=>prompt;
export const clearInstallPrompt=()=>{prompt=null;window.dispatchEvent(new Event('avyron:install-state'));};
export function initPwa(){
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event as InstallPrompt;window.dispatchEvent(new Event('avyron:install-state'));});
 window.addEventListener('appinstalled',clearInstallPrompt);
 const resume=()=>{if(navigator.onLine&&document.visibilityState==='visible')window.dispatchEvent(new Event('avyron:resume'));};
 window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
 if('serviceWorker' in navigator&&import.meta.env.PROD&&['avyron.ro','www.avyron.ro','app.avyron.ro','localhost','127.0.0.1'].includes(location.hostname)){
  window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{
   const notify=()=>window.dispatchEvent(new CustomEvent('avyron:pwa-update',{detail:reg}));
   if(reg.waiting)notify();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{if(reg.waiting&&navigator.serviceWorker.controller)notify();}));
  }).catch(()=>{ /* Installation remains available via the browser when offline setup fails. */ });});
 }
}
