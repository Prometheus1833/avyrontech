const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = __dirname;
const dirs = Object.fromEntries(['sources','masters','exports','previews'].map((name) => [name, path.join(root,name)]));
Object.values(dirs).forEach((dir) => fs.mkdirSync(dir,{recursive:true}));

const C = {
  bg:'#070A10', bg2:'#0E1420', panel:'#111A29', panel2:'#151F31', white:'#F7F8FB',
  muted:'#AEB8C9', line:'#2D3B52', cyan:'#5EE7F7', violet:'#9678FF', lime:'#C9FF68',
  coral:'#FF8D78', amber:'#FFD277', black:'#05070B'
};
const esc = (value) => String(value).replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[c]));
const sourceData = (name) => `data:image/png;base64,${fs.readFileSync(path.join(dirs.sources,name)).toString('base64')}`;
const shot = {
  heroD: sourceData('portfolio-hero-desktop-3840x2160.png'),
  heroM: sourceData('portfolio-hero-mobile-1080x1920.png'),
  processD: sourceData('portfolio-process-desktop-3840x2160.png'),
  serviceD: sourceData('avyron-service-desktop-3840x2160.png')
};
const logoData = `data:image/webp;base64,${fs.readFileSync(path.join(dirs.sources,'avyron-logo.webp')).toString('base64')}`;

const text = (x,y,size,value,fill=C.white,weight=650,anchor='start',spacing=0) => `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(value)}</text>`;
const lineSet = (x,y,size,lines,gap,fill=C.white,weight=780) => lines.map((line,index)=>text(x,y+index*gap,size,line,fill,weight)).join('');
const defs = () => `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg2}"/></linearGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${C.cyan}"/><stop offset=".52" stop-color="${C.lime}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient>
  <filter id="shadow"><feDropShadow dx="0" dy="30" stdDeviation="32" flood-color="#000" flood-opacity=".42"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="70"/></filter>
  <clipPath id="rounded"><rect width="100%" height="100%" rx="42"/></clipPath>
</defs>`;
const background = (w,h) => `<rect width="${w}" height="${h}" fill="url(#bg)"/><circle cx="${w*.88}" cy="${h*.1}" r="${w*.3}" fill="${C.violet}" opacity=".12" filter="url(#soft)"/><circle cx="${w*.08}" cy="${h*.9}" r="${w*.25}" fill="${C.cyan}" opacity=".08" filter="url(#soft)"/><path d="M0 ${h*.7} C ${w*.28} ${h*.62}, ${w*.7} ${h*.82}, ${w} ${h*.66}" fill="none" stroke="${C.lime}" stroke-width="3" opacity=".1"/>`;
const svg = (w,h,body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${background(w,h)}${body}</svg>`);
const pill = (x,y,w,label,color=C.cyan) => `<rect x="${x}" y="${y}" width="${w}" height="70" rx="35" fill="${color}" opacity=".12" stroke="${color}" stroke-width="2"/>${text(x+w/2,y+46,25,label,color,800,'middle',1.1)}`;
const brand = (x,y,scale=1) => `<image href="${logoData}" x="${x}" y="${y-82*scale}" width="${112*scale}" height="${112*scale}" preserveAspectRatio="xMidYMid meet"/>`;
const counter = (x,y,value,color=C.lime) => `<circle cx="${x}" cy="${y}" r="96" fill="${color}" opacity=".14" stroke="${color}" stroke-width="4"/>${text(x,y+26,76,value,color,850,'middle')}`;
const frame = (x,y,w,h,href,label,mode='desktop') => {
  const imageFit = mode === 'mobile' ? 'xMidYMid slice' : 'xMidYMid slice';
  return `<g transform="translate(${x} ${y})" filter="url(#shadow)"><rect width="${w}" height="${h}" rx="44" fill="${C.panel}" stroke="${C.line}" stroke-width="4"/><rect x="18" y="18" width="${w-36}" height="${h-36}" rx="30" fill="#fff"/><image href="${href}" x="18" y="18" width="${w-36}" height="${h-36}" preserveAspectRatio="${imageFit}" clip-path="inset(0 round 30px)"/><rect x="42" y="${h-106}" width="${Math.min(w-84,Math.max(380,label.length*20))}" height="62" rx="31" fill="${C.black}" opacity=".9"/>${text(70,h-64,26,label,C.white,720)}</g>`;
};
const scanOverlay = (x,y,w,h) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="42" fill="none" stroke="${C.cyan}" stroke-width="5" stroke-dasharray="26 18" opacity=".55"/><line x1="0" y1="${h*.34}" x2="${w}" y2="${h*.34}" stroke="${C.lime}" stroke-width="6" opacity=".75"/><circle cx="${w*.78}" cy="${h*.34}" r="22" fill="${C.lime}"/><circle cx="${w*.78}" cy="${h*.34}" r="52" fill="none" stroke="${C.lime}" stroke-width="4" opacity=".45"/></g>`;
const footer = (w,h,index,total,label='TESTUL FĂRĂ LOGO') => `${brand(150,h-115,.9)}${text(w/2,h-112,28,label,C.muted,700,'middle',1.4)}${text(w-170,h-112,30,`${index}/${total}`,C.muted,800,'end')}`;
const safeZone = (w,h) => `<rect x="${w*.065}" y="${h*.085}" width="${w*.87}" height="${h*.805}" rx="40" fill="none" stroke="${C.coral}" stroke-width="3" stroke-dasharray="20 16" opacity=".18"/>`;

async function save(name,masterW,masterH,body,outW,outH){
  const master = path.join(dirs.masters,`${name}-master-${masterW}x${masterH}.png`);
  const output = path.join(dirs.exports,`${name}-${outW}x${outH}.png`);
  await sharp(svg(masterW,masterH,body)).png({compressionLevel:9}).toFile(master);
  await sharp(master).resize(outW,outH,{fit:'fill',kernel:'lanczos3'}).png({compressionLevel:9}).toFile(output);
  return output;
}

function instagramPages(w,h){
  return [
    `${pill(150,150,710,'DIAGNOSTIC • 7 SECUNDE',C.lime)}${counter(w-300,260,'7s',C.cyan)}${lineSet(150,510,132,['Acoperă logo-ul.','Site-ul mai spune','cine ești?'],158,C.white,850)}${text(155,1055,48,'Dacă răspunsul e „nu”, problema nu este logo-ul.',C.muted,520)}${frame(150,1270,w-300,2150,shot.heroD,'Interfață AVYRON nepublicată • exemplu de structură')}${scanOverlay(150,1270,w-300,2150)}${footer(w,h,1,5)}`,
    `${pill(150,150,690,'ÎNTREBAREA 1 • PENTRU CINE?',C.cyan)}${counter(290,520,'01',C.cyan)}${lineSet(520,470,112,['Vizitatorul se','recunoaște imediat?'],140)}${text(155,900,50,'Nu „servicii complete”. Ci situația pe care o rezolvi.',C.muted,520)}${frame(260,1120,2680,2290,shot.heroM,'Context înainte de ofertă • experiență mobilă','mobile')}${footer(w,h,2,5)}`,
    `${pill(150,150,690,'ÎNTREBAREA 2 • CE GĂSEȘTE?',C.violet)}${counter(290,520,'02',C.violet)}${lineSet(520,470,112,['Oferta este clară','fără explicații în plus?'],140)}${text(155,900,50,'Serviciul, diferența și dovada trebuie să stea în același traseu.',C.muted,520)}${frame(150,1110,w-300,2280,shot.processD,'Structură reală • proces și criterii vizibile')}${footer(w,h,3,5)}`,
    `${pill(150,150,700,'ÎNTREBAREA 3 • CE URMEAZĂ?',C.coral)}${counter(290,520,'03',C.coral)}${lineSet(520,470,112,['Există un pas','următor firesc?'],140)}${text(155,900,50,'Un singur CTA. Potrivit deciziei pe care vizitatorul o poate lua acum.',C.muted,520)}${frame(150,1110,w-300,2280,shot.serviceD,'Pagina oficială AVYRON • serviciu verificat')}${footer(w,h,4,5)}`,
    `${pill(150,150,680,'SALVEAZĂ TESTUL',C.lime)}${lineSet(150,470,124,['7 secunde.','3 întrebări.','0 șabloane generice.'],150,C.white,850)}${text(155,1020,50,'Un site de prezentare bun face afacerea inteligibilă',C.muted,520)}${text(155,1090,50,'înainte ca vizitatorul să caute logo-ul.',C.muted,520)}${frame(150,1270,w-300,1850,shot.serviceD,'Website de prezentare profesional • AVYRON')}${pill(150,3270,1810,'CTA INSTAGRAM • SALVEAZĂ TESTUL',C.cyan)}${footer(w,h,5,5)}`
  ];
}

function linkedInPages(w,h){
  return [
    `${pill(150,150,800,'LINKEDIN • DECIZIE DE BUSINESS',C.cyan)}${lineSet(150,480,120,['Un website de prezentare','nu este o broșură.'],148,C.white,850)}${text(155,850,55,'Este o interfață de decizie pentru viitorul client.',C.lime,680)}${frame(150,1070,w-300,2290,shot.heroD,'Material AVYRON nepublicat • analiză de structură')}${footer(w,h,1,4,'GRILĂ DE DECIZIE')}`,
    `${pill(150,150,620,'01 • RECUNOAȘTERE',C.cyan)}${lineSet(150,470,115,['„Este pentru mine?”'],145,C.white,850)}${text(155,720,54,'Mesajul de intrare trebuie să numească situația,',C.muted,520)}${text(155,795,54,'nu doar categoria serviciului.',C.muted,520)}${frame(230,1050,2740,2260,shot.heroM,'Primul ecran • mobil','mobile')}${footer(w,h,2,4,'GRILĂ DE DECIZIE')}`,
    `${pill(150,150,620,'02 • ÎNCREDERE',C.violet)}${lineSet(150,470,115,['„De ce să te cred?”'],145,C.white,850)}${text(155,720,54,'Procesul, criteriile și exemplele reduc incertitudinea',C.muted,520)}${text(155,795,54,'mai bine decât superlativele.',C.muted,520)}${frame(150,1050,w-300,2260,shot.processD,'Proces vizibil • fără rezultate inventate')}${footer(w,h,3,4,'GRILĂ DE DECIZIE')}`,
    `${pill(150,150,620,'03 • ACȚIUNE',C.coral)}${lineSet(150,470,115,['„Ce pot face acum?”'],145,C.white,850)}${text(155,720,54,'Un CTA clar încheie traseul. Restul este zgomot.',C.muted,520)}${frame(150,980,w-300,2050,shot.serviceD,'Serviciul AVYRON • destinație verificată')}${text(155,3200,45,'avyron.ro/servicii/website-prezentare-profesional',C.cyan,780)}${footer(w,h,4,4,'GRILĂ DE DECIZIE')}`
  ];
}

function verticalPages(w,h){
  return [
    `${safeZone(w,h)}${pill(150,260,650,'0–2 SEC • TESTUL',C.lime)}${counter(w-300,420,'7s',C.cyan)}${lineSet(150,720,132,['Acoperă logo-ul.','Ce afacere vezi?'],160,C.white,850)}${frame(150,1280,w-300,1830,shot.heroD,'Interfață reală • fără client inventat')}${scanOverlay(150,1280,w-300,1830)}${brand(150,3540,.9)}`,
    `${safeZone(w,h)}${pill(150,260,650,'2–5 SEC • ÎNTREBAREA 1',C.cyan)}${counter(260,720,'01',C.cyan)}${lineSet(500,650,105,['Pentru cine','este site-ul?'],130)}${text(155,1080,48,'Vizitatorul trebuie să se recunoască.',C.muted,520)}${frame(220,1300,1720,1850,shot.heroM,'Context recognoscibil • mobil','mobile')}${brand(150,3540,.9)}`,
    `${safeZone(w,h)}${pill(150,260,650,'5–8 SEC • ÎNTREBAREA 2',C.violet)}${counter(260,720,'02',C.violet)}${lineSet(500,650,105,['Ce poate găsi','fără să întrebe?'],130)}${text(155,1080,48,'Serviciu, diferență, dovadă.',C.muted,520)}${frame(150,1300,w-300,1850,shot.processD,'Structură AVYRON • proces clar')}${brand(150,3540,.9)}`,
    `${safeZone(w,h)}${pill(150,260,650,'8–11 SEC • ÎNTREBAREA 3',C.coral)}${counter(260,720,'03',C.coral)}${lineSet(500,650,105,['Care este','pasul următor?'],130)}${text(155,1080,48,'Un CTA. Exact când decizia e posibilă.',C.muted,520)}${frame(150,1300,w-300,1850,shot.serviceD,'Serviciul oficial AVYRON')}${brand(150,3540,.9)}`,
    `${safeZone(w,h)}${pill(150,260,650,'11–15 SEC • VERDICT',C.amber)}${lineSet(150,720,122,['Dacă totul depinde','de logo, site-ul','nu explică suficient.'],148,C.white,850)}${text(155,1290,48,'Personalizarea reală se vede în traseu.',C.lime,670)}${frame(150,1510,w-300,1520,shot.heroD,'Test fără logo • structură înainte de decor')}${brand(150,3540,.9)}`,
    `${safeZone(w,h)}${pill(150,260,650,'15–19 SEC • CTA',C.lime)}${lineSet(150,720,122,['Construiește un site','care se înțelege','înainte să se admire.'],148,C.white,850)}${text(155,1300,45,'Website de prezentare profesional • AVYRON',C.muted,560)}${frame(150,1510,w-300,1360,shot.serviceD,'Pagina serviciului verificată live')}${pill(150,3060,1510,'TIKTOK • SPUNE CE AI VĂZUT ÎN 7 SECUNDE',C.cyan)}${brand(150,3540,.9)}`
  ];
}

async function main(){
  const logoPng = path.join(dirs.sources,'avyron-logo.png');
  await sharp(path.join(dirs.sources,'avyron-logo.webp')).png().toFile(logoPng);

  const feedW=3200, feedH=4000;
  for (const [index,body] of instagramPages(feedW,feedH).entries()) await save(`instagram-carousel-${String(index+1).padStart(2,'0')}`,feedW,feedH,body,1080,1350);
  for (const [index,body] of linkedInPages(feedW,feedH).entries()) await save(`linkedin-document-${String(index+1).padStart(2,'0')}`,feedW,feedH,body,1080,1350);

  await save('facebook-page-diagnostic',3200,4000,`${pill(150,150,760,'FACEBOOK • TEST RAPID',C.lime)}${lineSet(150,470,124,['Site-ul tău trece','testul de 7 secunde?'],150,C.white,850)}${text(155,850,50,'Acoperă logo-ul și caută trei răspunsuri:',C.muted,520)}${counter(350,1190,'01',C.cyan)}${text(520,1175,55,'Pentru cine este?',C.white,780)}${counter(350,1510,'02',C.violet)}${text(520,1495,55,'Ce oferă concret?',C.white,780)}${counter(350,1830,'03',C.coral)}${text(520,1815,55,'Ce urmează?',C.white,780)}${frame(150,2130,2900,1230,shot.serviceD,'Website de prezentare profesional • AVYRON')}${text(155,3500,42,'avyron.ro/servicii/website-prezentare-profesional',C.cyan,780)}${footer(3200,4000,1,1,'DIAGNOSTIC WEBSITE')}`,1080,1350);

  await save('avyron-dev-behind-scenes',3200,4000,`${pill(150,150,840,'AVYRON DEV • DIN CULISE',C.violet)}${lineSet(150,470,118,['Înainte de culori,','testăm sensul.'],145,C.white,850)}${text(155,810,50,'Prima întrebare: site-ul se explică fără logo?',C.muted,520)}${frame(150,1010,2900,2300,shot.processD,'Captură de lucru • structură, nu decor')}${scanOverlay(150,1010,2900,2300)}${pill(150,3440,1550,'AUDIENȚĂ → DOVADĂ → ACȚIUNE',C.lime)}${footer(3200,4000,1,1,'PROCES AVYRON')}`,1080,1350);

  await save('threads-thesis',3200,1800,`${pill(150,130,700,'THREADS • O TEZĂ',C.cyan)}${lineSet(150,480,112,['Dacă schimbi logo-ul','și site-ul încă funcționează,'],135,C.white,850)}${text(155,790,112,'nu este personalizat suficient.',C.lime,850)}${frame(1830,240,1220,1050,shot.heroD,'Testul fără logo')}${text(155,1180,44,'Personalizarea reală nu este o paletă.',C.muted,540)}${text(155,1250,44,'Este ordinea în care afacerea devine ușor de înțeles.',C.muted,540)}${brand(150,1610,.9)}`,1600,900);

  const verticalW=2160, verticalH=3840;
  const vertical=verticalPages(verticalW,verticalH);
  for (const [index,body] of vertical.entries()) await save(`reel-${String(index+1).padStart(2,'0')}`,verticalW,verticalH,body,1080,1920);

  await save('story-01',verticalW,verticalH,`${safeZone(verticalW,verticalH)}${pill(150,260,670,'STORY • TEST INTERACTIV',C.lime)}${counter(verticalW-300,500,'7s',C.cyan)}${lineSet(150,800,128,['Acoperă logo-ul.','Înțelegi afacerea?'],154,C.white,850)}${frame(180,1330,1800,1710,shot.heroD,'Privește primul ecran')}${scanOverlay(180,1330,1800,1710)}${pill(410,3220,1340,'POLL NATIV • DA / PREA PUȚIN',C.violet)}${brand(150,3540,.9)}`,1080,1920);
  await save('story-02',verticalW,verticalH,`${safeZone(verticalW,verticalH)}${pill(150,260,670,'STORY • VERDICT',C.cyan)}${lineSet(150,720,120,['Personalizarea reală','se vede în traseu,','nu în decor.'],148,C.white,850)}${text(155,1280,48,'Pentru cine → ce găsește → ce urmează',C.lime,690)}${frame(150,1510,1860,1330,shot.serviceD,'Serviciul AVYRON • pagină verificată')}${pill(350,3070,1460,'REȚINE GRILA ÎN 3 ÎNTREBĂRI',C.cyan)}${text(1080,3280,31,'Frame informativ • fără al doilea CTA',C.muted,600,'middle')}${brand(150,3540,.9)}`,1080,1920);
  await save('whatsapp-status',verticalW,verticalH,`${safeZone(verticalW,verticalH)}${pill(150,260,610,'WHATSAPP STATUS',C.lime)}${counter(verticalW-300,500,'7s',C.cyan)}${lineSet(150,800,124,['Site-ul tău','se explică','fără logo?'],150,C.white,850)}${frame(150,1420,1860,1430,shot.heroD,'Test rapid • primul ecran')}${text(155,3050,48,'Pentru cine? Ce oferă? Ce urmează?',C.muted,600)}${brand(150,3540,.9)}`,1080,1920);

  const contactItems = [
    ['facebook-page-diagnostic-1080x1350.png',340,425],
    ['avyron-dev-behind-scenes-1080x1350.png',340,425],
    ['threads-thesis-1600x900.png',500,281],
    ['story-01-1080x1920.png',240,427],
    ['whatsapp-status-1080x1920.png',240,427]
  ];
  const composites=[];
  let x=30,y=90;
  for (let i=0;i<contactItems.length;i++){
    const [name,w,h]=contactItems[i];
    if(i===2){x=30;y=555;} else if(i===3){x=570;y=555;} else if(i===4){x=840;y=555;}
    composites.push({input:await sharp(path.join(dirs.exports,name)).resize(w,h).toBuffer(),left:x,top:y});
    if(i<2)x+=370;
  }
  await sharp({create:{width:1120,height:1020,channels:4,background:C.bg}}).composite(composites).png().toFile(path.join(dirs.previews,'platform-contact-sheet.png'));

  const igComps=[];
  for(let i=1;i<=5;i++) igComps.push({input:await sharp(path.join(dirs.exports,`instagram-carousel-${String(i).padStart(2,'0')}-1080x1350.png`)).resize(205,256).toBuffer(),left:20+(i-1)*218,top:70});
  await sharp({create:{width:1110,height:350,channels:4,background:C.bg}}).composite(igComps).png().toFile(path.join(dirs.previews,'instagram-contact-sheet.png'));

  const reelComps=[];
  for(let i=1;i<=6;i++) reelComps.push({input:await sharp(path.join(dirs.exports,`reel-${String(i).padStart(2,'0')}-1080x1920.png`)).resize(170,302).toBuffer(),left:20+(i-1)*180,top:70});
  await sharp({create:{width:1110,height:400,channels:4,background:C.bg}}).composite(reelComps).png().toFile(path.join(dirs.previews,'reel-contact-sheet.png'));

  const story = await sharp(path.join(dirs.exports,'story-02-1080x1920.png')).resize(340,604).toBuffer();
  const ui = `<rect x="370" y="40" width="360" height="680" rx="48" fill="#020305" stroke="${C.line}" stroke-width="4"/><image href="data:image/png;base64,${story.toString('base64')}" x="380" y="60" width="340" height="604"/><rect x="394" y="80" width="312" height="6" rx="3" fill="#fff" opacity=".8"/><circle cx="414" cy="120" r="18" fill="#fff" opacity=".85"/>${text(444,128,20,'avyrontech',C.white,720)}${text(550,748,20,'Simulare UI • nu este dovadă de publicare',C.muted,600,'middle')}`;
  await sharp(svg(1100,780,ui)).png().toFile(path.join(dirs.previews,'story-native-ui-preview.png'));
}

main().catch((error)=>{console.error(error);process.exit(1)});
