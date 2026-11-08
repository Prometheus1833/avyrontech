import wellness480 from "@/assets/showcase-wellness-v2-480.webp";
import wellness960 from "@/assets/showcase-wellness-v2-960.webp";
import wellness1600 from "@/assets/showcase-wellness-v2-1600.webp";
import wellnessAvif480 from "@/assets/showcase-wellness-v2-480.avif";
import wellnessAvif960 from "@/assets/showcase-wellness-v2-960.avif";
import wellnessAvif1600 from "@/assets/showcase-wellness-v2-1600.avif";
import retreat640 from "@/assets/showcase-retreat-v2-640.webp";
import retreat1024 from "@/assets/showcase-retreat-v2-1024.webp";
import retreat1600 from "@/assets/showcase-retreat-v2-1600.webp";
import retreatAvif640 from "@/assets/showcase-retreat-v2-640.avif";
import retreatAvif1024 from "@/assets/showcase-retreat-v2-1024.avif";
import retreatAvif1600 from "@/assets/showcase-retreat-v2-1600.avif";
import restaurant640 from "@/assets/showcase-restaurant-v2-640.webp";
import restaurant1024 from "@/assets/showcase-restaurant-v2-1024.webp";
import restaurantAvif640 from "@/assets/showcase-restaurant-v2-640.avif";
import restaurantAvif1024 from "@/assets/showcase-restaurant-v2-1024.avif";
import professional640 from "@/assets/showcase-professional-v2-640.webp";
import professional1024 from "@/assets/showcase-professional-v2-1024.webp";
import professionalAvif640 from "@/assets/showcase-professional-v2-640.avif";
import professionalAvif1024 from "@/assets/showcase-professional-v2-1024.avif";
import local640 from "@/assets/showcase-local-v2-640.webp";
import local1024 from "@/assets/showcase-local-v2-1024.webp";
import localAvif640 from "@/assets/showcase-local-v2-640.avif";
import localAvif1024 from "@/assets/showcase-local-v2-1024.avif";
export const wellnessImage = {
  src: wellness1600,
  srcSet: `${wellness480} 480w, ${wellness960} 960w, ${wellness1600} 1600w`,
  avifSet: `${wellnessAvif480} 480w, ${wellnessAvif960} 960w, ${wellnessAvif1600} 1600w`,
  width: 1600,
  height: 900,
};
export const showcasePhotos = {
  wellness: wellnessImage,
  travel: {
    src: retreat1600,
    srcSet: `${retreat640} 640w, ${retreat1024} 1024w, ${retreat1600} 1600w`,
    avifSet: `${retreatAvif640} 640w, ${retreatAvif1024} 1024w, ${retreatAvif1600} 1600w`,
    width: 1600,
    height: 900,
  },
  restaurant: {
    src: restaurant1024,
    srcSet: `${restaurant640} 640w, ${restaurant1024} 1024w`,
    avifSet: `${restaurantAvif640} 640w, ${restaurantAvif1024} 1024w`,
    width: 1024,
    height: 768,
  },
  professional: {
    src: professional1024,
    srcSet: `${professional640} 640w, ${professional1024} 1024w`,
    avifSet: `${professionalAvif640} 640w, ${professionalAvif1024} 1024w`,
    width: 1024,
    height: 768,
  },
  local: {
    src: local1024,
    srcSet: `${local640} 640w, ${local1024} 1024w`,
    avifSet: `${localAvif640} 640w, ${localAvif1024} 1024w`,
    width: 1024,
    height: 768,
  },
};
export function showcasePhoto(key: keyof typeof showcasePhotos) {
  const p = showcasePhotos[key];
  return {
    image: p.src,
    imageSet: p.srcSet,
    imageAvifSet: p.avifSet,
    imageWidth: p.width,
    imageHeight: p.height,
  };
}
