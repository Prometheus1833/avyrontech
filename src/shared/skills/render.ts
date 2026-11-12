import {creativePreview,mediaPrompt,CREATIVE_VERSION,CREATIVE_CHECKS} from "./creative";
import type { SkillBrief, SkillSlug } from "./model";
import { NICHE_PROFILES } from "./catalog";
import { leadWhatsAppUrl } from "../leadArchive";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const conceptLooks = new Map([
  ["beauty", "material"], ["food", "material"], ["retail", "material"],
  ["hospitality", "depth"], ["real-estate", "depth"],
  ["recycling", "route"], ["transport", "route"],
  ["design", "grid"], ["construction", "grid"], ["automotive", "grid"], ["business", "grid"],
  ["medical", "calm"], ["legal", "editorial"],
]);

export function renderSkillPreview(slug: SkillSlug, b: SkillBrief) {
  if(slug!=="site-builder")return creativePreview(slug,b);
  const p = NICHE_PROFILES.find((x) => x.id === b.domain) || NICHE_PROFILES[0];
  const message = encodeURIComponent(
    `Bună! Aș dori să discut conceptul pentru ${b.business}.`,
  );
  const phone =
      "+" +
      new URL(
        leadWhatsAppUrl(b.phone || "+40734605055") ||
          "https://wa.me/40734605055",
      ).pathname.slice(1),
    email = b.email || "contact@avyron.ro";
  const contactLabel =
    b.phone || b.email ? "Contact" : "Discută conceptul cu AVYRON";
  const socials = (
    [
      ["Facebook", b.facebook],
      ["Instagram", b.instagram],
      ["TikTok", b.tiktok],
    ] as const
  )
    .map(([label, url]) =>
      url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`
        : `<span>${label} · de configurat</span>`,
    )
    .join("");
  const look = conceptLooks.get(p.id) || "editorial";
  return `<!doctype html><html lang="ro"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>${esc(b.business)} · concept AVYRON</title><style>
*{box-sizing:border-box}html{color-scheme:dark;background:${p.background};scroll-behavior:smooth;scroll-padding-top:90px;scrollbar-color:#7776 transparent;scrollbar-width:thin}body{margin:0;color:#f6f3ee;background:${p.background};font:16px/1.6 system-ui,-apple-system,sans-serif}a{color:inherit;text-decoration:none}a:focus-visible{outline:3px solid ${p.accent};outline-offset:5px}header{position:sticky;top:12px;z-index:5;max-width:1100px;margin:12px auto -70px;width:calc(100% - 28px);display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #fff3;padding:14px 20px;border-radius:18px;background:#152023ed;backdrop-filter:blur(22px)}header strong{max-width:60%;overflow-wrap:anywhere}nav{display:flex;gap:18px;font-size:13px}section,footer{padding:clamp(34px,6vw,76px) max(22px,calc((100% - 1050px)/2));position:relative}h1,h2,h3{overflow-wrap:anywhere}h1{font-size:clamp(35px,6.2vw,78px);line-height:1.08;letter-spacing:-.045em;max-width:820px;margin:18px 0 22px}h2{font-size:clamp(25px,3.2vw,42px);line-height:1.15;letter-spacing:-.025em;margin:12px 0 25px}h3{font-size:20px}p{max-width:65ch;color:#e2e2df;overflow-wrap:anywhere}.eyebrow{font-size:11px;letter-spacing:.19em;color:${p.accent};text-transform:uppercase}.hero{padding-top:155px;min-height:580px;overflow:hidden;background:radial-gradient(ellipse at 82% 24%,${p.accent}38,transparent 38%),linear-gradient(145deg,#0000,#0009)}.hero:after{content:"";position:absolute;right:-60px;top:80px;width:clamp(240px,42vw,560px);aspect-ratio:1;border-radius:50%;border:1px solid ${p.accent}66;box-shadow:0 0 120px ${p.accent}20,inset 0 0 100px ${p.accent}12;transform:rotate(-25deg) scaleY(.75);pointer-events:none}.hero>*{position:relative;z-index:1}.cta{display:inline-flex;align-items:center;min-height:46px;padding:10px 20px;border-radius:999px;background:${p.accent};color:${p.background};font-weight:700}.hero small{display:block;margin-top:28px;color:#c8c8c0}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.cards article{padding:24px;border:1px solid #fff2;border-radius:20px;background:#ffffff06;transition:transform .2s,background .2s}.cards article:hover,.cards article:focus-within{transform:translateY(-4px);background:#ffffff0e}.num{color:${p.accent};font-size:13px}.band{background:#ffffff04;border-block:1px solid #fff1}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.socials{display:flex;flex-wrap:wrap;gap:12px}.socials>*{border:1px solid #fff3;padding:10px 16px;border-radius:14px;font-size:14px;min-height:44px}.socials span{color:#b9bcb9}.floating{position:fixed;right:16px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:9}.floating a{width:46px;height:46px;display:grid;place-items:center;border:1px solid #fff4;border-radius:15px;background:${p.background};box-shadow:0 8px 24px #0005;font-size:20px}footer{padding-bottom:100px;background:radial-gradient(ellipse at 12% 90%,${p.accent}22,transparent 65%),#0003;border-top:1px solid #fff1}footer small{color:#bdc2c1}.monogram{display:grid;place-items:center;min-height:200px;font-size:60px;color:${p.accent};border:1px solid #fff2}.m0{border-radius:24px}.m1{font-family:Georgia,serif;letter-spacing:-.1em}.m2{border-radius:50%}.art{height:360px;border-radius:28px;border:1px solid #fff2;background:radial-gradient(ellipse at 70% 30%,${p.accent}9a,transparent 40%),radial-gradient(circle at 20% 80%,${p.accent}44,transparent 55%),linear-gradient(135deg,#fff1,#0008);display:flex;align-items:end;padding:22px}.art span{font-size:12px;background:#0008;padding:8px;border-radius:10px}
[data-look="material"] .hero{background:radial-gradient(ellipse at 84% 40%,var(--concept-accent-soft) 0%,transparent 65%),linear-gradient(115deg,#060810dd 25%,#161321)}
[data-look="material"] .hero:after{border-radius:38% 62% 65% 35%;background:repeating-linear-gradient(115deg,transparent 0 13px,#fff1 14px 15px);opacity:.42}
[data-look="depth"] .hero:after{border-radius:28px;transform:rotate(-12deg) skew(-12deg);background:#ffffff06;box-shadow:-28px 28px 0 #fff1,-56px 56px 0 #fff1}
[data-look="route"] .hero:after{border-radius:28% 68% 27% 62%;border:2px dashed var(--concept-accent);box-shadow:0 0 0 28px #fff1,inset 0 0 0 28px #fff1;opacity:.5}
[data-look="grid"] .hero:after{border-radius:24px;background:repeating-linear-gradient(0deg,#fff2 0 1px,transparent 1px 26px),repeating-linear-gradient(90deg,#fff2 0 1px,transparent 1px 26px);transform:rotate(-8deg) scale(.9);opacity:.5}
[data-look="calm"] .hero:after,[data-look="editorial"] .hero:after{display:none}
[data-look="calm"] .hero{background:linear-gradient(135deg,#ffffff06,transparent 72%)}
[data-look="editorial"] .hero{background:linear-gradient(110deg,#080b13 5%,transparent 78%)}
[data-look="editorial"] .hero h1{font-family:Georgia,serif;letter-spacing:-.026em}
@media(prefers-reduced-motion:no-preference){@supports(animation-timeline:view()){[data-look="editorial"] .cards article,[data-look="material"] .cards article{animation:concept-enter linear both;animation-timeline:view();animation-range:entry 8% entry 90%}@keyframes concept-enter{from{opacity:.76;translate:0 10px}to{opacity:1;translate:0 0}}}}
@media(max-width:640px){header{padding:12px 14px}nav a:not(:last-child){display:none}.cards,.steps{grid-template-columns:1fr;gap:12px}.hero{padding-top:140px;min-height:530px}.hero:after{opacity:.5}.cards article{padding:20px}.floating{right:10px}.art{height:260px}section,footer{padding-right:66px}.hero h1{font-size:clamp(28px,7vw,42px)}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:after{transition:none!important;transform:none!important}}
</style></head><body data-look="${look}" style="--concept-accent:${p.accent};--concept-accent-soft:${p.accent}55"><header><strong>${esc(b.business)}</strong><nav aria-label="Navigare concept"><a href="#servicii">Servicii</a><a href="#proces">Proces</a><a href="#contact">${esc(contactLabel)}</a></nav></header><main><section class="hero"><p class="eyebrow">${esc(b.activity)}</p><h1>${esc(p.headline)}</h1><p>${esc(b.objective)}</p><a class="cta" href="#contact">Să discutăm ↗</a><small>Concept vizual AVYRON · Conținutul și oferta necesită confirmare</small></section><section id="servicii"><p class="eyebrow">CLARITATE · RELEVANȚĂ · EXPERIENȚĂ</p><h2>Tot ce contează, într-un singur loc.</h2><div class="cards">${p.sections.map((s, i) => `<article><span class="num">0${i + 1}</span><h3>${esc(s)}</h3><p>${esc(b.activity)} — structură propusă, de personalizat cu informațiile confirmate ale afacerii.</p></article>`).join("")}</div></section><section id="proces" class="band"><p class="eyebrow">FĂRĂ PAȘI INUTILI</p><h2>De la prima discuție la direcția potrivită.</h2><div class="steps">${["Ne cunoaștem", "Definim ce contează", "Construim împreună"].map((s, i) => `<div><span class="num">0${i + 1}</span><h3>${s}</h3><p>Detaliile, disponibilitatea și etapele sunt confirmate înainte de colaborare.</p></div>`).join("")}</div></section><section id="contact"><p class="eyebrow">URMĂTORUL PAS</p><h2>O conversație bună începe simplu.</h2><p>${esc(b.preferences || "Direcția vizuală se adaptează identității, publicului și preferințelor tale.")}</p><a class="cta" href="https://wa.me/${phone.replace(/\D/g, "")}?text=${message}" target="_blank" rel="noopener noreferrer">${esc(contactLabel)} ↗</a></section><section class="band"><p class="eyebrow">URMĂREȘTE-NE</p><h2>Rămânem aproape.</h2><div class="socials">${socials}</div></section></main><footer><strong>${esc(b.business)}</strong><p>${esc(b.activity)}</p><small>Mockup privat, nepublicat. Contactele implicite sunt AVYRON și sunt folosite numai pentru discuția despre concept. Datele legale și politicile site-ului final se completează după verificare.</small></footer><aside class="floating" aria-label="Contact rapid"><a aria-label="Apel pentru concept" href="tel:${esc(phone)}" title="Apel pentru concept">↗</a><a aria-label="WhatsApp pentru concept" href="https://wa.me/${phone.replace(/\D/g, "")}?text=${message}" target="_blank" rel="noopener noreferrer" title="WhatsApp pentru concept">W</a><a aria-label="Email pentru concept" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Concept " + b.business)}&amp;body=${message}" title="Email pentru concept">@</a></aside></body></html>`;
}
export function preparedBrief(slug: SkillSlug, b: SkillBrief, context: string) {
  const title =
    slug === "site-builder"
      ? "Plan de website și instrucțiuni Codex"
      : slug === "logo-engine"
        ? "Brief de identitate și handoff Logo Studio"
        : "Direcție vizuală și prompt de imagine";
  return `# ${title}\n\n## Brief\n- Afacere: ${b.business}\n- Activitate: ${b.activity}\n- Domeniu: ${b.domain}\n- Obiectiv: ${b.objective}\n- Preferințe: ${b.preferences || "De stabilit cu beneficiarul"}\n\n## Execuție\n${slug === "media-generate" ? "Standard creativ " + CREATIVE_VERSION + "\n\nPrompt exact pentru model:\n" + mediaPrompt(b) + "\nImaginea finală nu a fost generată de acest flux." : slug === "logo-engine" ? `Standard creativ ${CREATIVE_VERSION}. Tip: ${b.logo.kind}; paletă: ${b.logo.palette}; semnătură: ${b.logo.tagline||"fără"}. Simboluri: ${b.logo.symbols||"de explorat"}. De evitat: ${b.logo.avoid||"mărci existente"}. Explorează trei direcții distincte: Structură, Semnătură și Ritm. SVG-urile sunt repere de compoziție, nu logo final original; textul necesită verificarea fonturilor și contururi finale. Continuă în produsul Logo Studio potrivit comenzii și licenței.` : "Construiește un landing cu minimum cinci secțiuni utile, navigare liquid glass cu fallback lizibil, hero cinematic, carduri compacte, proces clar, urmărește-ne și footer profund. Trei acțiuni flotante cu contacte validate. Adaptare la nișă, fără copierea identității altui client."}\n\n## Date de confirmat înainte de livrare\n${slug === "site-builder" ? "- Textele și oferta exactă, activele și drepturile de utilizare.\n- Contactele, cele trei conturi sociale și informațiile juridice.\n- Funcționalitățile reale, formularul, integrările și politica de publicare." : slug === "logo-engine" ? "- Denumirea exactă, utilizările și caracterul mărcii.\n- Drepturile asupra fonturilor și simbolurilor; cercetarea de marcă separată.\n- Pachetul și licența comandate; conceptul SVG nu reprezintă livrare contractuală finală." : "- Utilizarea, cropurile și drepturile asupra referințelor.\n- Rezoluția reală a fișierului și eventualele transformări.\n- Textul se compune separat în layout; aprobarea și distribuirea sunt operațiuni distincte."}\n\n## Context reutilizabil aprobat\n${context}\n\n## Verificare\n${slug === "site-builder" ? "320/390/768px și desktop; tastatură; contrast; reduced-motion; fără WebGL; CTA/linkuri; fără overflow; metadata și noindex pentru concept." : CREATIVE_CHECKS[slug].map(c=>"- "+c).join("\n")} Nu publica și nu transmite automat.\n`;
}
