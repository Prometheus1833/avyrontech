/* GLSL ES 3.00 sources for the logo stage. Kept in TS so the chunk needs no loader plugin. */

export const QUAD_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vNdc;
void main() {
  vNdc = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/**
 * Background: a dark studio. Two slow coloured light pools, drifting fog,
 * a soft light cone that follows the pointer and three layers of motes that
 * move at different speeds with the scroll (that parallax is the depth).
 */
export const BG_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vNdc;
out vec4 frag;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec2 uPointer;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform float uQuality;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uQuality + 1.0) break;
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
float motes(vec2 p, float scale, float speed, float seed) {
  p *= scale;
  p.y += uScroll * speed + uTime * 0.012 * speed;
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = hash(cell + seed);
  if (h < 0.86) return 0.0;
  vec2 o = vec2(hash(cell + seed + 3.1), hash(cell + seed + 7.7)) - 0.5;
  float d = length(f - o * 0.7);
  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + h) + h * 40.0);
  return smoothstep(0.06, 0.0, d) * tw;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 col = vec3(0.028, 0.024, 0.048);

  float fog = fbm(p * 1.4 + vec2(uTime * 0.012, -uScroll * 0.18));
  vec2 ca = vec2(-0.55 + 0.08 * sin(uTime * 0.05), 0.32 - uScroll * 0.04);
  vec2 cb = vec2(0.62 + 0.06 * cos(uTime * 0.043), -0.28 + uScroll * 0.03);
  float pa = exp(-dot(p - ca, p - ca) * 2.2);
  float pb = exp(-dot(p - cb, p - cb) * 2.6);
  col += uTintA * pa * (0.16 + 0.22 * fog);
  col += uTintB * pb * (0.12 + 0.2 * fog);

  // Light cone from above, leaning towards the pointer.
  float lean = uPointer.x * 0.18;
  float w = 0.22 + (0.5 - p.y) * 0.28;
  float cone = exp(-pow((p.x - lean * (0.5 - p.y)) / w, 2.0)) * smoothstep(-0.7, 0.55, p.y);
  col += mix(uTintA, vec3(1.0), 0.55) * cone * 0.045 * (0.6 + fog);

  col += vec3(0.85, 0.82, 1.0) * motes(p, 7.0, 0.35, 1.0) * 0.18;
  if (uQuality > 0.5) col += mix(uTintB, vec3(1.0), 0.4) * motes(p, 13.0, 0.75, 9.0) * 0.14;
  if (uQuality > 1.5) col += mix(uTintA, vec3(1.0), 0.3) * motes(p, 22.0, 1.4, 21.0) * 0.1;

  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.3, 1.0)));
  col *= 0.55 + 0.45 * vig;
  // Dither to kill 8-bit banding in the long gradients.
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  frag = vec4(col, 1.0);
}`;

/**
 * Logo: a flat signed-distance field extruded into a bevelled solid and
 * sphere-traced inside its bounding box. Two fields can be morphed. The
 * same pass renders the flat stages (outline, fill) used to tell the story
 * of how a logo is made, and a noise dissolve for reveals.
 */
export const LOGO_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vNdc;
out vec4 frag;

uniform sampler2D uSdfA;
uniform sampler2D uSdfB;
uniform vec3 uInfoA;   // aspect, texels->world, spread(texels)
uniform vec3 uInfoB;
uniform float uMorph;
uniform float uViewAspect;
uniform mat3 uRot;
uniform float uFit;
uniform float uDepth;
uniform float uBevel;
uniform float uExtrude;
uniform float uFill;
uniform float uReveal;
uniform vec4 uMat;     // metal, glass, neon, matte
uniform vec3 uFace;
uniform vec3 uSide;
uniform vec3 uGlow;
uniform float uTime;
uniform int uSteps;
uniform vec3 uLightDir;

const float WORLD_H = 2.5;

float sampleField(sampler2D t, vec3 info, vec2 xy) {
  vec2 half_ = vec2(info.x, 1.0) * (WORLD_H * 0.5);
  vec2 uv = xy / (half_ * 2.0) + 0.5;
  uv.y = 1.0 - uv.y;
  vec2 cuv = clamp(uv, vec2(0.0), vec2(1.0));
  float d = texture(t, cuv).r * info.y;
  vec2 outside = abs(uv - 0.5) - 0.5;
  d += length(max(outside, 0.0)) * half_.y * 2.0;
  return d;
}
// Cubic B-spline sampling from four bilinear taps (Sigg & Hadwiger): smooth gradients for normals.
vec4 cubicW(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}
float texCubic(sampler2D t, vec2 uv) {
  vec2 size = vec2(textureSize(t, 0));
  vec2 inv = 1.0 / size;
  uv = uv * size - 0.5;
  vec2 fxy = fract(uv);
  uv -= fxy;
  vec4 xc = cubicW(fxy.x);
  vec4 yc = cubicW(fxy.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  float s0 = texture(t, off.xz).r;
  float s1 = texture(t, off.yz).r;
  float s2 = texture(t, off.xw).r;
  float s3 = texture(t, off.yw).r;
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
float sampleFieldSmooth(sampler2D t, vec3 info, vec2 xy) {
  vec2 half_ = vec2(info.x, 1.0) * (WORLD_H * 0.5);
  vec2 uv = xy / (half_ * 2.0) + 0.5;
  uv.y = 1.0 - uv.y;
  vec2 cuv = clamp(uv, vec2(0.0), vec2(1.0));
  float d = texCubic(t, cuv) * info.y;
  vec2 outside = abs(uv - 0.5) - 0.5;
  d += length(max(outside, 0.0)) * half_.y * 2.0;
  return d;
}
float fieldSmooth(vec2 xy) {
  float a = sampleFieldSmooth(uSdfA, uInfoA, xy);
  if (uMorph <= 0.001) return a;
  return mix(a, sampleFieldSmooth(uSdfB, uInfoB, xy), uMorph);
}
float field(vec2 xy) {
  float a = sampleField(uSdfA, uInfoA, xy);
  if (uMorph <= 0.001) return a;
  float b = sampleField(uSdfB, uInfoB, xy);
  return mix(a, b, uMorph);
}
float halfDepth() { return max(0.004, uDepth * uExtrude); }
float solidOf(vec3 p, float d) {
  float h = halfDepth();
  float r = min(uBevel, h * 0.9);
  vec2 w = vec2(d + r, abs(p.z) - h + r);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - r;
}
float map(vec3 p) {
  p /= uFit;
  return solidOf(p, field(p.xy)) * uFit;
}
float mapSmooth(vec3 p) {
  p /= uFit;
  return solidOf(p, fieldSmooth(p.xy)) * uFit;
}
vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  float e = 0.006 * uFit;
  return normalize(k.xyy * mapSmooth(p + k.xyy * e) + k.yyx * mapSmooth(p + k.yyx * e) + k.yxy * mapSmooth(p + k.yxy * e) + k.xxx * mapSmooth(p + k.xxx * e));
}
vec2 boxHit(vec3 ro, vec3 rd, vec3 b) {
  vec3 m = 1.0 / rd;
  vec3 n = m * ro;
  vec3 k = abs(m) * b;
  vec3 t1 = -n - k;
  vec3 t2 = -n + k;
  float tN = max(max(t1.x, t1.y), t1.z);
  float tF = min(min(t2.x, t2.y), t2.z);
  return vec2(tN, tF);
}
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}

// Procedural product studio (world space): a large key softbox above-left of the
// camera, a cool fill on the right, a vertical strip, coloured rims behind.
vec3 env(vec3 d) {
  // Room: dark floor, soft grey ceiling.
  vec3 c = mix(vec3(0.02, 0.018, 0.034), vec3(0.2, 0.19, 0.26), smoothstep(-0.5, 1.0, d.y));
  // Big key softbox above-left of the camera: front faces pick it up as a broad sheen.
  float key = smoothstep(0.5, 0.96, dot(d, normalize(vec3(-0.3, 0.42, 0.86))));
  c += vec3(1.0, 0.97, 0.93) * key * 1.9;
  // Hard spec strip for the crisp line that travels across metal when it turns.
  float strip = smoothstep(0.05, 0.0, abs(d.x + 0.12 - d.y * 0.18)) * smoothstep(-0.1, 0.7, d.y) * step(0.0, d.z);
  c += vec3(1.0) * strip * 2.2;
  // Cool fill from the right.
  float fill = smoothstep(0.55, 0.97, dot(d, normalize(vec3(0.7, 0.05, 0.7))));
  c += vec3(0.75, 0.85, 1.0) * fill * 0.8;
  // Coloured rims from behind.
  c += uGlow * smoothstep(0.3, 1.0, dot(d, normalize(vec3(-0.9, 0.15, -0.35)))) * 0.9;
  c += vec3(0.62, 0.45, 1.0) * smoothstep(0.4, 1.0, dot(d, normalize(vec3(0.9, -0.05, -0.3)))) * 0.6;
  return c;
}
vec3 toWorld(vec3 v) { return v * uRot; }

void main() {
  float tanHalf = 0.32;
  vec3 ro = vec3(0.0, 0.0, 4.2);
  vec3 rd = normalize(vec3(vNdc.x * uViewAspect * tanHalf, vNdc.y * tanHalf, -1.0));
  vec3 roO = uRot * ro;
  vec3 rdO = uRot * rd;

  // Flat look: where the ray meets the logo plane.
  float tp = -roO.z / rdO.z;
  vec2 pp = (roO + rdO * tp).xy / uFit;
  float d2 = field(pp);
  float aa = max(fwidth(d2), 0.0015);
  float line = 1.0 - smoothstep(0.012, 0.012 + aa, abs(d2));
  float fill = 1.0 - smoothstep(-aa, aa, d2);
  vec3 flatCol = mix(vec3(0.85, 0.83, 0.95) * line, uFace, clamp(fill * uFill, 0.0, 1.0));
  float flatA = max(line * (1.0 - uFill * 0.4), fill * uFill);

  vec4 solid = vec4(0.0);
  float glow = 0.0;
  if (uExtrude > 0.001) {
    float h = halfDepth();
    float ax = max(uInfoA.x, uMorph > 0.001 ? uInfoB.x : 0.0);
    vec3 b = vec3(ax * WORLD_H * 0.5, WORLD_H * 0.5, h + 0.02) * uFit;
    vec2 bh = boxHit(roO, rdO, b);
    if (bh.x < bh.y && bh.y > 0.0) {
      float t = max(bh.x, 0.0);
      float minD = 1e3;
      bool hit = false;
      for (int i = 0; i < 96; i++) {
        if (i >= uSteps) break;
        vec3 p = roO + rdO * t;
        float d = map(p);
        minD = min(minD, d);
        if (d < 0.0012) { hit = true; break; }
        t += d * 0.92;
        if (t > bh.y) break;
      }
      glow = exp(-max(minD, 0.0) * 9.0 / uFit);
      if (hit) {
        vec3 p = roO + rdO * t;
        vec3 n = normalAt(p);
        vec3 po = p / uFit;
        float faceMask = smoothstep(h - uBevel * 1.4, h - uBevel * 0.2, abs(po.z));
        vec3 tint = mix(uSide, uFace, faceMask);
        vec3 v = -rdO;
        float nv = clamp(dot(n, v), 0.0, 1.0);
        float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
        vec3 nW = toWorld(n);
        vec3 vW = toWorld(v);
        float diff = clamp(dot(nW, normalize(uLightDir)), 0.0, 1.0);
        float wrap = clamp((dot(nW, normalize(uLightDir)) + 0.35) / 1.35, 0.0, 1.0);
        vec3 RW = reflect(-vW, nW);
        vec3 envR = env(RW);
        float dIn = field(po.xy);
        float rim = pow(1.0 - nv, 3.0);

        vec3 metal = envR * mix(tint, vec3(1.0), 0.1 + 0.5 * F) * 1.15 + tint * (0.1 + 0.18 * wrap);
        vec3 refr = env(refract(-vW, nW, 0.7));
        float thick = smoothstep(0.0, 0.3, -dIn);
        vec3 body = uFace * (0.35 + 0.55 * wrap);
        vec3 glass = mix(refr * mix(vec3(1.0), uFace, 0.7) * 1.1, body, 0.28 + 0.3 * thick);
        glass = mix(glass, envR, clamp(0.12 + F * 1.3, 0.0, 1.0)) + uGlow * rim * 0.6;
        float tube = smoothstep(0.03, 0.0, abs(dIn + 0.05)) * faceMask;
        vec3 neon = envR * 0.1 + tint * 0.15 * wrap + uGlow * tube * 2.6 + uGlow * rim * 0.5;
        vec3 matte = tint * (0.26 + 0.82 * wrap) + envR * 0.05 * (0.4 + F) + tint * rim * 0.22;

        vec3 c = metal * uMat.x + glass * uMat.y + neon * uMat.z + matte * uMat.w;
        c /= max(uMat.x + uMat.y + uMat.z + uMat.w, 0.0001);
        c = c * (1.0 + c / 4.0) / (1.0 + c);
        float alpha = 1.0 - uMat.y * 0.06;

        if (uReveal < 0.999) {
          float n3 = vnoise(po * 7.0 + uTime * 0.2);
          float edge = uReveal * 1.15 - 0.075;
          if (n3 > edge) { c = vec3(0.0); alpha = 0.0; }
          else c += uGlow * smoothstep(edge - 0.08, edge, n3) * 2.0;
        }
        solid = vec4(c * alpha, alpha);
      }
    }
  }

  float haloA = clamp((glow * uMat.z * 0.55 + glow * 0.05) * uExtrude * uReveal, 0.0, 0.85);
  vec4 flat_ = vec4(flatCol * flatA, flatA) * (1.0 - uExtrude);
  vec4 outc = solid * uExtrude + flat_ * (1.0 - solid.a * uExtrude);
  outc.rgb += uGlow * haloA * (1.0 - outc.a);
  outc.a += haloA * (1.0 - outc.a);
  frag = outc;
}`;
