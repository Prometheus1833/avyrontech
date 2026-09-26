// PRZ-S2 — hero cu displacement.
//
// Textura e citită „cover", ca imaginea să umple planul fără deformare, apoi
// deplasată de o undă care pornește din poziția cursorului și se stinge cu
// distanța. Canalele R și B sunt eșantionate cu offseturi ușor diferite, ceea
// ce dă separarea cromatică de pe margini.
//
// Nota de culoare: textura e încărcată cu NoColorSpace și scriem direct în
// gl_FragColor, fără conversie. Rezultatul e identic cu imaginea sursă afișată
// ca <img>, deci posterul și efectul arată la fel în momentul schimbului.

precision highp float;

uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;
uniform vec2 uPointer;
uniform float uTime;
uniform float uHover;
uniform float uIntensity;

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 planeSize, vec2 imageSize) {
  vec2 ratio = vec2(
    min((planeSize.x / planeSize.y) / (imageSize.x / imageSize.y), 1.0),
    min((planeSize.y / planeSize.x) / (imageSize.y / imageSize.x), 1.0)
  );
  return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  vec2 uv = coverUv(vUv, uPlaneSize, uImageSize);

  vec2 pointer = uPointer * 0.5 + 0.5;
  vec2 delta = vUv - pointer;
  delta.x *= uPlaneSize.x / max(uPlaneSize.y, 0.0001);

  float dist = length(delta);
  float wave = sin(dist * 24.0 - uTime * 2.2) * exp(-dist * 5.0);
  float amount = wave * uHover * uIntensity;

  vec2 dir = delta / max(dist, 0.0001);
  vec2 offset = dir * amount * 0.05;

  float r = texture2D(uTexture, uv + offset * 1.08).r;
  float g = texture2D(uTexture, uv + offset).g;
  float b = texture2D(uTexture, uv + offset * 0.92).b;

  vec3 color = vec3(r, g, b);
  // Urmă caldă în jurul cursorului, în accentul paginii.
  color += vec3(0.55, 0.34, 0.12) * abs(amount) * 0.45;

  gl_FragColor = vec4(color, 1.0);
}
