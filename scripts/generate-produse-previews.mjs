/** Original illustrations for catalog cards. No demo execution, remote assets or browser required. */
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(root, "public/previews/produse");
const bundle = await build({ entryPoints: [resolve(root, "scripts/produse-catalog-entry.ts")], bundle: true, write: false, format: "esm", platform: "neutral" });
const { ITEMS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const box = (x, y, w, h, fill = "#141e32", stroke = "#556787", r = 10) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const line = (x, y, w, fill = "#8190ae", h = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;
const dot = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
const path = (d, stroke = "url(#accent)", width = 3) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const text = (x, y, words, size = 22, color = "#f0f4fc") => `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="700">${words}</text>`;
const top = (x = 94, y = 48, w = 292, h = 204) => box(x, y, w, h) + path(`M${x} ${y+25}h${w}`, "#405274", 1) + [0,1,2].map(i => dot(x+14+10*i,y+13,2.6,i===0?"#f4adac":"#8296b8")).join("");
const card = (x, y, w = 92, h = 96) => box(x,y,w,h,"#1a2943","#647798") + box(x+10,y+10,w-20,36,"url(#accent)","none",5) + line(x+10,y+57,w-28,"#cad9ed") + line(x+10,y+70,w-40,"#7c92b7");
const points = (x, y, n = 8) => Array.from({length:n},(_,i)=>dot(x+(i%4)*11,y+Math.floor(i/4)*11,2.4,"#f2f6fd")).join("");

const favicon = () => top(108,62,264,164) + box(127,73,144,28,"#2e3c59","none",6) + box(138,80,13,13,"url(#accent)","none",3) + line(159,84,78,"#bbcbe1",4) + box(192,114,96,87,"url(#accent)","#e0edff",21) + text(209,172,"AV",42,"#10182a") + box(150,162,24,24,"url(#accent)","none",6) + text(154,179,"AV",12,"#11192a") + box(307,148,38,38,"url(#accent)","none",10) + text(311,173,"AV",18,"#11192a");
const button = () => box(116,112,248,70,"url(#accent)","#edf4ff",35) + path("M190 146h100m-16-13 16 13-16 13","#15243b",5) + `<ellipse cx="325" cy="168" rx="44" ry="39" fill="none" stroke="#fff" stroke-opacity=".45"/>` + path("M328 169l30 12-12 4-6 12z","#f4f7ff",3);
const cards = () => [112,196,280].map((x,i)=>card(x,92+(i===1?-17:12),88,112)).join("");
const table = () => top() + Array.from({length:5},(_,i)=>box(110,87+i*29,259,24,i===1?"#2c3e61":"#1b2840","none",4)+line(122,97+i*29,51,"#b2c1dc",4)+line(206,97+i*29,43,"#8ea0c0",4)+line(304,97+i*29,46,i===1?"url(#accent)":"#7b91b7",4)).join("");
const forms = () => top(136,44,208,212)+line(158,85,89,"#eaf1ff",7)+[0,1,2].map(i=>box(158,106+i*33,162,24,"#1b2841",i===0?"#bbd3f5":"#526888",6)+line(168,116+i*33,55,"#9fb2d0",4)).join("")+box(158,207,162,26,"url(#accent)","none",8)+line(212,218,56,"#22314b");
const toast = () => [0,1,2].map(i=>box(109+i*14,69+i*54,240,46,"#1e2d47","#637799",10)+dot(132+i*14,92+i*54,9,i===0?"#76ddc3":i===1?"#f4bf82":"#a5bafd")+line(152+i*14,84+i*54,103,"#d6e4f7")+line(152+i*14,97+i*54,74,"#879fc5",4)).join("");
const textScene = () => top()+line(120,106,48,"url(#accent)",5)+text(119,149,"Aa",46)+line(204,127,135,"#d5e5fe",11)+line(204,148,114,"url(#accent)",11)+line(120,176,151,"#8ca3c8",5)+line(120,190,123,"#677da2",5);
const page = () => top()+line(116,96,75,"url(#accent)",5)+line(116,111,123,"#e4eeff",12)+line(116,130,98,"#c3d5ef",8)+box(116,153,76,19,"url(#accent)","none",8)+box(266,88,96,84,"url(#accent)","none",10)+[116,202,288].map(x=>box(x,189,73,41,"#233450","#5d7499",7)+line(x+9,205,51,"#9eb3d6",5)).join("");
const prices = () => [97,195,293].map((x,i)=>box(x,89-(i===1?14:0),90,127,"#182741",i===1?"#cadbff":"#54678b",10)+line(x+13,108-(i===1?14:0),36,"#a9bfdf")+text(x+13,147-(i===1?14:0),i===0?"€":i===1?"€€":"€€€",23)+line(x+13,162-(i===1?14:0),62,"#9ab0d5",4)+box(x+13,179-(i===1?14:0),63,19,"url(#accent)","none",6)).join("");
const timeline = () => path("M112 140H368","#51658a",4)+[115,199,281,365].map((x,i)=>dot(x,140,12,i===1?"#f7f9ff":"#9bb8ef")+box(x-28,171,57,29,"#22344f","#607496",6)+line(x-18,184,36,i===1?"#d6e9ff":"#9cb4d7",4)).join("");
const image = () => top()+box(113,88,254,140,"#263757","none",8)+dot(313,123,17,"#f7d397")+`<path d="M114 223l63-74 56 51 38-42 96 65z" fill="url(#accent)"/>`+path("M242 88v140","#e3edff",2)+dot(242,158,12,"#eff5ff")+path("m237 158 3-3m7 3-3 3","#1c2b46",2);
const tools = () => top(101,49,278,204)+box(118,88,128,69,"#233450","#5d7193",7)+text(129,131,"= 120",28)+box(257,88,104,69,"url(#accent)","none",7)+text(280,132,"%",32,"#132341")+[0,1,2].map(i=>line(119,179+i*15,216-i*30,i===0?"#d6e7ff":"#91a8cb",5)).join("");
const api = () => top(106,52,268,197)+text(123,122,"{",37,"#bad7ff")+text(338,201,"}",37,"#bad7ff")+[0,1,2,3].map(i=>line(156+i%2*16,115+i*21,121-i*12,i%2?"#a9bedd":"url(#accent)",5)).join("");
const document = () => box(153,50,174,204,"#1a2940","#7892b3",12)+line(175,78,64,"url(#accent)",9)+[0,1,2,3].map(i=>path(`M176 ${113+i*31}l4 4 8-9`,"#9ce5cf",2)+line(197,110+i*31,98-i%2*23,"#adc1df",5)).join("");
const visual = (item) => {
  if (item.demo === "globe" || item.demo === "osm-map" || item.demo === "api-geo")
    return `<g transform="translate(240 150)"><circle r="92" fill="#172643" stroke="#b1cef6" stroke-width="2"/><ellipse rx="50" ry="92" fill="none" stroke="#7899c8"/><ellipse rx="92" ry="43" fill="none" stroke="#7899c8"/><path d="M-90 0H90M0-90V90" stroke="#8aaadb"/><path d="M-61 29Q-10-82 63-38" fill="none" stroke="url(#accent)" stroke-width="4"/><circle cx="-61" cy="29" r="6" fill="#fff"/><circle cx="63" cy="-38" r="6" fill="#fff"/></g>`;
  return Array.from({length:92},(_,i)=>{const theta=i*2.399963; const z=1-2*(i+.5)/92; const radius=Math.sqrt(1-z*z); return dot(240+Math.cos(theta)*radius*115,150+(Math.sin(theta)*radius*.72+z*.45)*106,2+radius*2,i%5===0?"#eef5ff":"url(#accent)");}).join("");
};
const qr = () => box(160,70,160,160,"#d9e8ff","none",15) + [[182,91],[252,91],[182,161]].map(([x,y])=>box(x,y,43,43,"#1d2a41","none",5)+box(x+9,y+9,25,25,"#d9e8ff","none",4)+box(x+15,y+15,13,13,"#1d2a41","none",2)).join("") + points(256,168,8).replaceAll("#f2f6fd","#1d2a41");

function motif(item) {
  const key = item.demo || item.slug;
  if (key === "favicon-studio") return favicon();
  if (/qr/.test(key)) return qr();
  if (/toasts|dynamic-island|tooltip/.test(key)) return toast();
  if (/button|magnetic|whatsapp/.test(key)) return button();
  if (/csv|table|compare-plan/.test(key)) return table();
  if (/login|input|billing|dropzone|consent|command-palette/.test(key)) return forms();
  if (/split|scramble|type-hero|ticker|marquee|meta-tags/.test(key)) return textScene();
  if (/price|pricing|plan-compare/.test(key)) return prices();
  if (/timeline|stepper|progress|tabs/.test(key)) return timeline();
  if (/image|displacement|before-after|parallax|palette|contrast/.test(key)) return image();
  if (/map|geo|globe/.test(key)) return visual(item);
  if (/card|spotlight|testimonial|carousel|logo-wall/.test(key)) return cards();
  if (item.type === "api") return api();
  if (item.type === "doc") return document();
  if (item.type === "effect" || item.gpu) return visual(item);
  if (item.type === "tool") return tools();
  if (item.type === "logo") return favicon();
  return page();
}

await mkdir(out, { recursive: true });
let changed = 0;
for (const item of ITEMS) {
  const hue = Number(item.hue);
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><defs><radialGradient id="glow" cx=".5" cy=".62" r=".68"><stop stop-color="hsl(${hue},45%,28%)"/><stop offset="1" stop-color="#090f1d"/></radialGradient><linearGradient id="accent" x2="1" y2="1"><stop stop-color="hsl(${hue},91%,77%)"/><stop offset="1" stop-color="hsl(${(hue+48)%360},82%,68%)"/></linearGradient><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 24V0h24" fill="none" stroke="#d8e4ff" stroke-opacity=".06"/></pattern></defs><rect width="480" height="300" fill="url(#glow)"/><rect width="480" height="300" fill="url(#grid)"/>${motif(item)}</svg>`;
  const data = await sharp(Buffer.from(xml)).webp({ quality: 83 }).toBuffer();
  const target = resolve(out, `${item.slug}.webp`);
  if ((await readFile(target).catch(() => null))?.equals(data)) continue;
  await writeFile(target, data);
  changed++;
}
console.log(`Product previews: ${ITEMS.length} WebP, ${changed} updated.`);
