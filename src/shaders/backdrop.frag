// Fundalul persistent al Bibliotecii.
//
// Un singur plan pe tot ecranul, în spatele conținutului. Nuanța urmărește
// secțiunea activă, iar la trecerea dintre secțiuni un impuls de refracție
// străbate câmpul — de acolo vine senzaţia de tranziție cinematică, fără să
// montăm o scenă nouă la fiecare capitol.

precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uHue;
uniform float uProgress;
uniform float uWarp;
uniform float uQuality;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  // Pe treptele slabe renunțăm la ultimele octave: diferența se vede în fps,
  // aproape deloc în imagine.
  float octaves = mix(3.0, 5.0, uQuality);
  for (int i = 0; i < 5; i++) {
    if (float(i) >= octaves) break;
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;

  // Impulsul de tranziție: un inel care pleacă din centru și deformează câmpul.
  float ring = uWarp * exp(-pow((length(p) - (1.0 - uWarp) * 1.2) * 3.5, 2.0));
  p += normalize(p + 1e-5) * ring * 0.12;

  float t = uTime * 0.035;
  float field = fbm(p * 2.1 + vec2(t, uProgress * 1.6));
  field += 0.45 * fbm(p * 4.3 - vec2(t * 1.7, uProgress * 0.9));

  float hue = uHue / 360.0;
  vec3 deep = hsl2rgb(vec3(hue, 0.55, 0.035 + field * 0.03));
  vec3 glow = hsl2rgb(vec3(fract(hue + 0.08), 0.58, 0.17 + field * 0.09));

  float band = smoothstep(0.35, 0.95, field);
  vec3 color = mix(deep, glow, band * 0.42);

  // Praf de stele, mai dens sus, ca profunzimea să nu vină doar din culoare.
  vec2 starGrid = floor(uv * uResolution / 3.0);
  float star = step(0.9975, hash(starGrid));
  color += vec3(star) * (0.22 + 0.28 * sin(uTime * 1.6 + hash(starGrid) * 30.0)) * (1.0 - uv.y * 0.5);

  // Marginile se sting, ca textul de deasupra să rămână lizibil.
  float vignette = smoothstep(1.25, 0.25, length(p));
  color *= 0.22 + vignette * 0.5;
  color += ring * 0.1;

  gl_FragColor = vec4(color, 1.0);
}
