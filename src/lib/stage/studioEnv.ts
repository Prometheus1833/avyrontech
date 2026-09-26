import * as THREE from "three";

/**
 * Un mic studio de lumini, generat în cod.
 *
 * Materialele metalice nu au ce reflecta dacă scena n-are mediu: fără asta,
 * „metalul" iese negru, indiferent câte lumini adaugi. În loc să descărcăm un
 * HDRI de câțiva megabytes, desenăm un panoramic simplu pe canvas — o lumină
 * caldă principală, una rece de contur, podea închisă — și îl trecem prin
 * PMREM, exact ce face și un HDRI adevărat, doar că gratis și instant.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#2a2f3a");
  sky.addColorStop(0.42, "#767d8c");
  sky.addColorStop(0.52, "#0c0f16");
  sky.addColorStop(1, "#05070b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);

  const key = ctx.createRadialGradient(140, 66, 2, 140, 66, 120);
  key.addColorStop(0, "#fff4dd");
  key.addColorStop(1, "rgba(255,244,221,0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, 512, 256);

  const rim = ctx.createRadialGradient(392, 88, 2, 392, 88, 100);
  rim.addColorStop(0, "#a9c6ff");
  rim.addColorStop(1, "rgba(169,198,255,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, 512, 256);

  const source = new THREE.CanvasTexture(canvas);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(source).texture;
  pmrem.dispose();
  source.dispose();

  return environment;
}
