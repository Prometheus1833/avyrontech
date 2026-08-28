import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "news");

const shell = ({ start, end, glow, body }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${start}"/><stop offset="1" stop-color="${end}"/>
    </linearGradient>
    <radialGradient id="halo"><stop stop-color="${glow}" stop-opacity=".42"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#fff" stroke-opacity=".055"/></pattern>
    <filter id="soft"><feGaussianBlur stdDeviation="24"/></filter>
    <filter id="shadow"><feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#020617" flood-opacity=".5"/></filter>
  </defs>
  <rect width="1200" height="630" rx="34" fill="url(#bg)"/>
  <rect width="1200" height="630" rx="34" fill="url(#grid)"/>
  <circle cx="950" cy="120" r="340" fill="url(#halo)" filter="url(#soft)"/>
  <circle cx="120" cy="590" r="260" fill="url(#halo)" opacity=".55" filter="url(#soft)"/>
  ${body}
</svg>`;

const covers = [
  {
    file: "meta-abonamente-branduri-2026.webp",
    svg: shell({ start: "#07111f", end: "#29104a", glow: "#d946ef", body: `
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">
        <rect x="158" y="92" width="332" height="454" rx="44" fill="#0f172a" fill-opacity=".82" stroke="#f0abfc" stroke-opacity=".55" stroke-width="3"/>
        <rect x="186" y="138" width="276" height="132" rx="24" fill="#a855f7" fill-opacity=".13" stroke="#e879f9" stroke-opacity=".5"/>
        <circle cx="234" cy="184" r="19" fill="#f0abfc" fill-opacity=".8" stroke="none"/><path d="M278 177h126M278 207h84" stroke="#f5d0fe" stroke-opacity=".78" stroke-width="12"/>
        <rect x="186" y="300" width="125" height="106" rx="22" fill="#ec4899" fill-opacity=".18" stroke="#f9a8d4" stroke-opacity=".5"/><rect x="337" y="300" width="125" height="106" rx="22" fill="#8b5cf6" fill-opacity=".2" stroke="#c4b5fd" stroke-opacity=".5"/>
        <path d="M210 459h228" stroke="#f5d0fe" stroke-opacity=".45" stroke-width="10"/><path d="M210 493h156" stroke="#f5d0fe" stroke-opacity=".28" stroke-width="10"/>
        <path d="M604 152c125-104 301-79 385 28 86 109 41 284-86 348" stroke="#f0abfc" stroke-opacity=".24" stroke-width="3" stroke-dasharray="7 14"/>
        <circle cx="687" cy="211" r="68" fill="#ec4899" fill-opacity=".14" stroke="#f9a8d4" stroke-opacity=".65" stroke-width="3"/><path d="M650 211h74M687 174v74" stroke="#fce7f3" stroke-width="8"/>
        <circle cx="908" cy="198" r="38" fill="#8b5cf6" fill-opacity=".22" stroke="#c4b5fd" stroke-opacity=".68"/><circle cx="1009" cy="328" r="52" fill="#d946ef" fill-opacity=".18" stroke="#f0abfc" stroke-opacity=".68"/><circle cx="819" cy="440" r="46" fill="#a855f7" fill-opacity=".18" stroke="#e9d5ff" stroke-opacity=".68"/>
        <path d="M745 219l125-15M943 228l44 59M970 367l-110 52M785 415l-73-149" stroke="#f5d0fe" stroke-opacity=".5" stroke-width="3"/>
      </g>` }),
  },
  {
    file: "site-prezentare-afacere-2026.webp",
    svg: shell({ start: "#061827", end: "#063e4c", glow: "#22d3ee", body: `
      <g filter="url(#shadow)">
        <rect x="120" y="88" width="960" height="470" rx="34" fill="#071b2b" fill-opacity=".86" stroke="#67e8f9" stroke-opacity=".48" stroke-width="3"/>
        <path d="M120 156h960" stroke="#67e8f9" stroke-opacity=".25" stroke-width="2"/><circle cx="167" cy="122" r="8" fill="#fb7185"/><circle cx="194" cy="122" r="8" fill="#fbbf24"/><circle cx="221" cy="122" r="8" fill="#34d399"/>
        <rect x="162" y="202" width="432" height="286" rx="24" fill="#0e7490" fill-opacity=".24"/><circle cx="378" cy="345" r="105" fill="#22d3ee" fill-opacity=".15"/><path d="M278 385l65-72 52 44 91-98 62 126z" fill="#67e8f9" fill-opacity=".42"/>
        <rect x="646" y="210" width="302" height="28" rx="14" fill="#cffafe" fill-opacity=".88"/><rect x="646" y="263" width="252" height="14" rx="7" fill="#a5f3fc" fill-opacity=".38"/><rect x="646" y="292" width="278" height="14" rx="7" fill="#a5f3fc" fill-opacity=".24"/><rect x="646" y="338" width="132" height="52" rx="26" fill="#06b6d4"/><rect x="796" y="338" width="128" height="52" rx="26" fill="none" stroke="#67e8f9" stroke-opacity=".56" stroke-width="2"/>
        <rect x="646" y="430" width="91" height="58" rx="16" fill="#22d3ee" fill-opacity=".12"/><rect x="752" y="430" width="91" height="58" rx="16" fill="#22d3ee" fill-opacity=".12"/><rect x="858" y="430" width="91" height="58" rx="16" fill="#22d3ee" fill-opacity=".12"/>
        <path d="M1003 423l-36 91 33-12 15 38 25-10-16-38 32-14z" fill="#ecfeff" stroke="#0891b2" stroke-width="4"/>
      </g>` }),
  },
  {
    file: "proces-produs-digital-avyron.webp",
    svg: shell({ start: "#0b1025", end: "#321158", glow: "#a78bfa", body: `
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">
        <path d="M164 322h824" stroke="#c4b5fd" stroke-opacity=".34" stroke-width="5" stroke-dasharray="8 14"/>
        <path d="M312 322l-22-18m22 18-22 18M520 322l-22-18m22 18-22 18M728 322l-22-18m22 18-22 18M936 322l-22-18m22 18-22 18" stroke="#ddd6fe" stroke-opacity=".65" stroke-width="5"/>
        <g stroke-width="3"><circle cx="178" cy="322" r="92" fill="#7c3aed" fill-opacity=".16" stroke="#c4b5fd"/><circle cx="386" cy="322" r="92" fill="#8b5cf6" fill-opacity=".18" stroke="#c4b5fd"/><circle cx="594" cy="322" r="92" fill="#a855f7" fill-opacity=".17" stroke="#e9d5ff"/><circle cx="802" cy="322" r="92" fill="#6366f1" fill-opacity=".18" stroke="#c7d2fe"/><circle cx="1010" cy="322" r="92" fill="#06b6d4" fill-opacity=".14" stroke="#a5f3fc"/></g>
        <path d="M141 322l24 24 49-52M350 285h72v74h-72zM371 274v22m30-22v22M556 350l38-76 38 76M570 326h49M764 282h76v80h-76zM782 304h40M782 326h40M982 322l20 20 40-46" stroke="#f5f3ff" stroke-width="8"/>
        <circle cx="178" cy="172" r="8" fill="#c4b5fd" stroke="none"/><circle cx="386" cy="472" r="8" fill="#c4b5fd" stroke="none"/><circle cx="594" cy="156" r="8" fill="#e9d5ff" stroke="none"/><circle cx="802" cy="476" r="8" fill="#c7d2fe" stroke="none"/><circle cx="1010" cy="164" r="8" fill="#a5f3fc" stroke="none"/>
      </g>` }),
  },
  {
    file: "identitate-digitala-conversie.webp",
    svg: shell({ start: "#160b25", end: "#461241", glow: "#fb7185", body: `
      <g fill="none" stroke-linecap="round" filter="url(#shadow)">
        <circle cx="356" cy="315" r="205" fill="#ec4899" fill-opacity=".08" stroke="#f9a8d4" stroke-opacity=".2"/>
        <path d="M356 156c-88 0-159 71-159 159 0 56 29 105 72 134M356 201c-63 0-114 51-114 114 0 48 30 89 72 106M356 246c-38 0-69 31-69 69 0 35 26 64 60 68M356 291c-13 0-24 11-24 24s11 24 24 24 24-11 24-24" stroke="#fbcfe8" stroke-width="11" stroke-opacity=".82"/>
        <path d="M411 184c61 24 104 83 104 152 0 55-27 104-69 134M430 239c30 21 49 56 49 96 0 36-17 68-44 89M411 291c8 13 12 28 12 44 0 20-7 39-19 54" stroke="#f9a8d4" stroke-width="9" stroke-opacity=".52"/>
        <rect x="650" y="138" width="386" height="354" rx="34" fill="#111827" fill-opacity=".7" stroke="#f9a8d4" stroke-opacity=".4" stroke-width="3"/>
        <circle cx="746" cy="246" r="48" fill="#fb7185" fill-opacity=".75"/><path d="M830 222h143M830 258h102" stroke="#fce7f3" stroke-width="14" stroke-opacity=".76"/>
        <path d="M700 348h286M700 386h236M700 424h266" stroke="#fbcfe8" stroke-width="12" stroke-opacity=".28"/>
        <circle cx="1008" cy="128" r="13" fill="#fef3c7" stroke="none"/><path d="M1008 83v22m0 46v22m-45-45h22m46 0h22" stroke="#fde68a" stroke-width="7"/>
      </g>` }),
  },
  {
    file: "seo-google-ai-search-2026.webp",
    svg: shell({ start: "#06172a", end: "#0d3b3a", glow: "#34d399", body: `
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">
        <circle cx="355" cy="292" r="172" fill="#10b981" fill-opacity=".09" stroke="#6ee7b7" stroke-width="18" stroke-opacity=".85"/><path d="M475 414l136 136" stroke="#a7f3d0" stroke-width="34"/>
        <path d="M229 295c54-59 101-38 142-4s83 47 132-31" stroke="#d1fae5" stroke-width="12"/><circle cx="229" cy="295" r="12" fill="#d1fae5" stroke="none"/><circle cx="371" cy="291" r="12" fill="#d1fae5" stroke="none"/><circle cx="503" cy="260" r="12" fill="#d1fae5" stroke="none"/>
        <rect x="686" y="116" width="372" height="392" rx="36" fill="#071a25" fill-opacity=".78" stroke="#6ee7b7" stroke-opacity=".38" stroke-width="3"/>
        <path d="M747 417v-96h54v96M832 417V251h54v166M917 417V182h54v235" fill="#10b981" fill-opacity=".28" stroke="#6ee7b7" stroke-width="3"/>
        <path d="M743 186c48 11 87 4 117-28 44 58 92 56 141 5" stroke="#a7f3d0" stroke-width="8"/><circle cx="743" cy="186" r="9" fill="#d1fae5" stroke="none"/><circle cx="860" cy="158" r="9" fill="#d1fae5" stroke="none"/><circle cx="1001" cy="163" r="9" fill="#d1fae5" stroke="none"/>
        <path d="M748 460h246" stroke="#6ee7b7" stroke-opacity=".3" stroke-width="10"/>
      </g>` }),
  },
  {
    file: "securitate-website-afaceri-mici.webp",
    svg: shell({ start: "#07111e", end: "#162c45", glow: "#60a5fa", body: `
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">
        <path d="M600 92c133 75 271 65 342 78v154c0 123-80 211-342 250-262-39-342-127-342-250V170c71-13 209-3 342-78z" fill="#2563eb" fill-opacity=".14" stroke="#93c5fd" stroke-width="5"/>
        <path d="M600 146c98 51 198 49 261 57v116c0 87-56 151-261 192-205-41-261-105-261-192V203c63-8 163-6 261-57z" stroke="#60a5fa" stroke-opacity=".48" stroke-width="3"/>
        <rect x="478" y="274" width="244" height="188" rx="32" fill="#071a2e" fill-opacity=".86" stroke="#bfdbfe" stroke-width="4"/>
        <path d="M526 274v-39c0-97 148-97 148 0v39" stroke="#dbeafe" stroke-width="22"/>
        <circle cx="600" cy="354" r="29" fill="#60a5fa" stroke="none"/><path d="M600 378v34" stroke="#bfdbfe" stroke-width="15"/>
        <circle cx="286" cy="144" r="9" fill="#93c5fd" stroke="none"/><circle cx="926" cy="118" r="9" fill="#93c5fd" stroke="none"/><circle cx="992" cy="460" r="9" fill="#93c5fd" stroke="none"/><circle cx="186" cy="454" r="9" fill="#93c5fd" stroke="none"/>
        <path d="M295 153l97 80M917 127l-103 91M983 451l-117-50M195 445l125-45" stroke="#60a5fa" stroke-opacity=".35" stroke-width="3" stroke-dasharray="6 12"/>
      </g>` }),
  },
];

await Promise.all(covers.map(({ file, svg }) => sharp(Buffer.from(svg)).webp({ quality: 82, effort: 6 }).toFile(path.join(outputDir, file))));
console.log(`Generated ${covers.length} editorial covers in ${outputDir}`);
