/** Rebuilds the social cover from the committed real-site captures. Local only. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g"><stop stop-color="#332845"/><stop offset="1" stop-color="#080a11"/></radialGradient></defs><rect width="1200" height="630" fill="#080a11"/><ellipse cx="925" cy="295" rx="480" ry="440" fill="url(#g)"/><path d="M50 70H1150M50 560H1150" stroke="#c4b5e9" stroke-opacity=".25"/><text x="55" y="122" fill="#bcb5d0" font-family="sans-serif" font-size="15" letter-spacing="6">AVYRON / SELECTED WORK</text><text x="51" y="237" fill="#f3f2ef" font-family="sans-serif" font-size="65" font-weight="600" letter-spacing="-3">Digital projects.</text><text x="54" y="304" fill="#c4b5e9" font-family="serif" font-style="italic" font-size="53">Distinct identities.</text><text x="56" y="380" fill="#b6bbcc" font-family="sans-serif" font-size="19">Websites. Brands. Platforms.</text><text x="56" y="520" fill="#e0d9ef" font-family="sans-serif" font-size="18" letter-spacing="2">AVYRON.RO / PORTOFOLIU</text></svg>`;
const cards = [];
for (const [i, key] of ["ruller", "clarlumanari", "flawlesstudio"].entries()) {
  const image = await sharp(
    `${root}/src/assets/portfolio-showcase/${key}-1280.webp`,
  )
    .resize(460, 288)
    .toBuffer();
  const frame = await sharp({
    create: { width: 472, height: 300, channels: 4, background: "#292535" },
  })
    .composite([{ input: image, left: 6, top: 6 }])
    .png()
    .rotate(-6 + i * 4, { background: "#00000000" })
    .toBuffer();
  cards.push({ input: frame, left: 630 + i * 13, top: 65 + i * 105 });
}
await mkdir(`${root}/public/og`, { recursive: true });
await sharp(Buffer.from(svg))
  .composite(cards)
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(`${root}/public/og/portfolio-2026.jpg`);
console.log("Portfolio social cover generated (1200×630).");
