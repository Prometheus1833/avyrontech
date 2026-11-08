import sharp from "sharp";
import { stat } from "node:fs/promises";
const sources = [
  [
    "wellness",
    "design/visual-masters/showcase-wellness-v2.png",
    [480, 960, 1600],
  ],
  [
    "retreat",
    "design/visual-masters/showcase-retreat-v2.png",
    [640, 1024, 1600],
  ],
  ["restaurant", "src/assets/work-restaurant-new.jpg", [640, 1024]],
  ["professional", "src/assets/work-lawyer-new.jpg", [640, 1024]],
  ["local", "src/assets/work-local-new.jpg", [640, 1024]],
];
for (const [name, file, widths] of sources) {
  const metadata = await sharp(file).metadata();
  for (const width of widths) {
    if (width > metadata.width)
      throw new Error(
        `${name}: refusing to invent native detail through upscaling`,
      );
    for (const format of ["webp", "avif"]) {
      const path = `src/assets/showcase-${name}-v2-${width}.${format}`;
      await sharp(file)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        [format]({ quality: format === "webp" ? 87 : 67, effort: 5 })
        .toFile(path);
      console.log(path, (await stat(path)).size);
    }
  }
}
