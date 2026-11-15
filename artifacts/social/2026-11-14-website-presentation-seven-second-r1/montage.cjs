const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const temp = path.join(root,'.video-tmp');
const output = path.join(root,'exports','reel-draft-1080x1920.webm');
fs.mkdirSync(temp,{recursive:true});
const frames = [1,2,3,4,5,6].map((n)=>`data:image/png;base64,${fs.readFileSync(path.join(root,'exports',`reel-${String(n).padStart(2,'0')}-1080x1920.png`)).toString('base64')}`);
const durations = [2400,2800,3000,3000,3400,4000];

(async()=>{
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1080,height:1920},recordVideo:{dir:temp,size:{width:1080,height:1920}}});
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><head><style>
    html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#070A10}
    #stage{position:relative;width:1080px;height:1920px;overflow:hidden}
    .frame{position:absolute;inset:-22px;width:1124px;height:1964px;object-fit:cover;opacity:0;transform:scale(1.032);filter:blur(2px);transition:opacity 420ms ease,filter 420ms ease}
    .frame.active{opacity:1;filter:blur(0);animation:drift var(--duration) cubic-bezier(.2,.64,.3,1) forwards}
    .scan{position:absolute;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#C9FF68 30%,#5EE7F7 70%,transparent);box-shadow:0 0 28px rgba(94,231,247,.45);opacity:0}
    .scan.go{animation:scan 1250ms ease-out}
    @keyframes drift{0%{transform:scale(1.032) translate3d(0,12px,0)}100%{transform:scale(1.006) translate3d(0,-8px,0)}}
    @keyframes scan{0%{top:18%;opacity:0}15%{opacity:.7}85%{opacity:.7}100%{top:76%;opacity:0}}
  </style></head><body><div id="stage"><img id="a" class="frame"><img id="b" class="frame"><div id="scan" class="scan"></div></div><script>
    const sources=${JSON.stringify(frames)},durations=${JSON.stringify(durations)},layers=[a,b];let active=0;
    (async()=>{for(let i=0;i<sources.length;i++){const next=layers[active],prev=layers[1-active];next.src=sources[i];await next.decode();next.style.setProperty('--duration',durations[i]+'ms');next.classList.remove('active');void next.offsetWidth;next.classList.add('active');prev.classList.remove('active');scan.classList.remove('go');void scan.offsetWidth;scan.classList.add('go');await new Promise(r=>setTimeout(r,durations[i]));active=1-active;}document.body.dataset.done='1';})();
  </script></body></html>`,{waitUntil:'load'});
  await page.waitForFunction(()=>document.body.dataset.done==='1',null,{timeout:26000});
  const video=page.video();
  await context.close();
  await video.saveAs(output);
  await browser.close();
  fs.rmSync(temp,{recursive:true,force:true});
})().catch((error)=>{console.error(error);process.exit(1)});
