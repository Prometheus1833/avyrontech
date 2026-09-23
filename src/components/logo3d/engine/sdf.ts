/**
 * Signed distance fields for flat marks.
 *
 * A logo is drawn once as a 2D mask; from the mask we compute, for every
 * texel, the signed distance to the outline (negative inside). The shader
 * extrudes that 2D field into a bevelled 3D solid, morphs between two
 * fields and draws outlines, fills and neon tubes from the same data.
 *
 * Exact Euclidean distance transform (Felzenszwalb & Huttenlocher, 2012),
 * O(n) per row/column, so a 256² mark takes a few milliseconds.
 */

const INF = 1e20;

/** 1D squared distance transform of f (in place into d), lower envelope of parabolas. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/** Squared distance transform of an initialised grid (0 = on a seed, INF = far). */
export function edtGrid(grid: Float64Array, w: number, h: number): Float64Array {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  return grid;
}

/** Squared distance from every cell to the nearest cell where `seed` is true. */
export function edt2d(seed: Uint8Array, w: number, h: number): Float64Array {
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = seed[i] ? 0 : INF;
  return edtGrid(grid, w, h);
}

/**
 * Signed distance (in texels) from an anti-aliased coverage mask (0–255).
 * Positive outside, negative inside. Edge texels seed the transform with their
 * sub-texel offset (the approach of Mapbox's tiny-sdf), so curves come out smooth
 * instead of snapping to the pixel grid.
 */
export function signedDistance(coverage: Uint8Array, w: number, h: number): Float32Array {
  const outer = new Float64Array(w * h);
  const inner = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = coverage[i] / 255;
    if (a >= 1) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const o = Math.max(0, 0.5 - a);
      const n = Math.max(0, a - 0.5);
      outer[i] = o * o;
      inner[i] = n * n;
    }
  }
  edtGrid(outer, w, h);
  edtGrid(inner, w, h);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  return smooth(out, w, h, 2);
}

/**
 * Separable [1 2 1] blur, a couple of passes. Removes the per-texel ripple the
 * transform leaves along slanted edges (visible as serrated bevels once lit);
 * the zero line only moves on sharp corners, which the bevel rounds anyway.
 */
export function smooth(field: Float32Array, w: number, h: number, passes: number): Float32Array {
  let src = field;
  let tmp = new Float32Array(w * h);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const l = src[row + Math.max(0, x - 1)];
        const r = src[row + Math.min(w - 1, x + 1)];
        tmp[row + x] = (l + 2 * src[row + x] + r) * 0.25;
      }
    }
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const up = Math.max(0, y - 1) * w;
      const dn = Math.min(h - 1, y + 1) * w;
      const row = y * w;
      for (let x = 0; x < w; x++) next[row + x] = (tmp[up + x] + 2 * tmp[row + x] + tmp[dn + x]) * 0.25;
    }
    src = next;
    tmp = new Float32Array(w * h);
  }
  return src;
}

export type MarkDraw = (ctx: CanvasRenderingContext2D, size: number) => void;

export type SdfTexture = {
  /** Signed distance in texels (negative inside), uploaded as a half-float texture. */
  data: Float32Array;
  width: number;
  height: number;
  /** width / height */
  aspect: number;
  /** Texels encoded by one full unit of the R8 range, divided by two. */
  spread: number;
  /** Half extents of the drawn content, in world units (texture height = WORLD_HEIGHT). */
  contentHalf: [number, number];
};

/** World height covered by a texture (see shader: y in [-1.25, 1.25]). */
export const WORLD_HEIGHT = 2.5;

function makeCanvas(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d", { willReadFrequently: true });
}

function finish(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spread: number,
  contentHalf: [number, number],
): SdfTexture {
  const img = ctx.getImageData(0, 0, w, h).data;
  const cov = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) cov[i] = img[i * 4 + 3];
  const sdf = signedDistance(cov, w, h);
  return { data: sdf, width: w, height: h, aspect: w / h, spread, contentHalf };
}

/** Square mark drawn by `draw` into a size² canvas (content should stay inside ~80% of it). */
export function sdfFromMark(draw: MarkDraw, size = 256): SdfTexture | null {
  const ctx = makeCanvas(size, size);
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.save();
  draw(ctx, size);
  ctx.restore();
  return finish(ctx, size, size, size * 0.09, [1.0, 1.0]);
}

export const TEXT_FONT = '800 {px}px "Avenir Next", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif';

/** A word set in the display face, as a wide field (height 160 texels). */
export function sdfFromText(text: string, height = 160): SdfTexture | null {
  const clean = text.trim().slice(0, 18) || "Avyron";
  const probe = makeCanvas(8, 8);
  if (!probe) return null;
  const px = Math.round(height * 0.5);
  const font = TEXT_FONT.replace("{px}", String(px));
  probe.font = font;
  const textWidth = probe.measureText(clean).width;
  const width = Math.min(1024, Math.max(height, Math.ceil(textWidth + height * 0.5)));
  const ctx = makeCanvas(width, height);
  if (!ctx) return null;
  ctx.font = font;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Squeeze very long names instead of clipping them.
  const room = width - height * 0.4;
  const scaleX = textWidth > room ? room / textWidth : 1;
  ctx.save();
  ctx.translate(width / 2, height * 0.53);
  ctx.scale(scaleX, 1);
  ctx.fillText(clean, 0, 0);
  ctx.restore();
  const toWorld = WORLD_HEIGHT / height;
  const drawnWidth = Math.min(textWidth, room);
  return finish(ctx, width, height, height * 0.09, [(drawnWidth / 2) * toWorld, px * 0.4 * toWorld]);
}
