/**
 * Avyron logo stage — a small WebGL2 renderer written for this page.
 *
 * One fixed full-screen canvas and one GL context for everything: the
 * cinematic background, then every logo "view" drawn into the rectangle
 * of its DOM element (viewport + scissor). No scene graph, no three.js:
 * two shader programs, one quad, a texture cache of distance fields.
 *
 * Views are registered with a DOM element and target parameters; the
 * engine eases current values towards targets every frame, so React never
 * re-renders for animation. Views off screen cost nothing.
 */

import { BG_FS, LOGO_FS, QUAD_VS } from "./shaders";
import { sdfFromMark, sdfFromText, type MarkDraw, type SdfTexture } from "./sdf";

export type Tier = "low" | "std" | "ultra";
export type Rgb = [number, number, number];
export type RotationMode = "idle" | "pointer" | "spin" | "manual";

export type ViewParams = {
  mark: string;
  markB: string | null;
  morph: number;
  material: [number, number, number, number];
  face: string;
  side: string;
  glow: string;
  depth: number;
  bevel: number;
  extrude: number;
  fill: number;
  reveal: number;
  rotation: RotationMode;
  yaw: number;
  pitch: number;
  scale: number;
};

export type ViewHandle = {
  set: (next: Partial<ViewParams>, instant?: boolean) => void;
  pointer: (x: number, y: number, active: boolean) => void;
  destroy: () => void;
};

const DEFAULTS: ViewParams = {
  mark: "studio",
  markB: null,
  morph: 0,
  material: [1, 0, 0, 0],
  face: "#c4b5fd",
  side: "#4c1d95",
  glow: "#a78bfa",
  depth: 0.2,
  bevel: 0.05,
  extrude: 1,
  fill: 1,
  reveal: 1,
  rotation: "idle",
  yaw: 0,
  pitch: 0,
  scale: 1,
};

type Tex = { tex: WebGLTexture; info: SdfTexture };

type View = {
  el: HTMLElement;
  target: ViewParams;
  cur: {
    morph: number;
    material: number[];
    face: Rgb;
    side: Rgb;
    glow: Rgb;
    depth: number;
    bevel: number;
    extrude: number;
    fill: number;
    reveal: number;
    yaw: number;
    pitch: number;
    scale: number;
  };
  pointer: { x: number; y: number; active: boolean };
  visible: boolean;
  seed: number;
  spin: number;
};

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function detectTier(): Tier {
  if (typeof window === "undefined") return "low";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const w = Math.min(window.innerWidth, window.screen?.width ?? window.innerWidth);
  if (w < 900 || cores <= 4 || mem <= 4) return "low";
  if (w >= 1280 && cores >= 8 && mem >= 8) return "ultra";
  return "std";
}

const TIER_CFG: Record<Tier, { dpr: number; steps: number; quality: number }> = {
  low: { dpr: 1, steps: 44, quality: 0 },
  std: { dpr: 1.5, steps: 60, quality: 1 },
  ultra: { dpr: 2, steps: 76, quality: 2 },
};

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader: ${log}`);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, QUAD_VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  return {
    p,
    u(name: string) {
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(p, name));
      return uniforms.get(name)!;
    },
  };
}

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

export class Stage {
  readonly tier: Tier;
  private gl: WebGL2RenderingContext;
  private bg: ReturnType<typeof program>;
  private logo: ReturnType<typeof program>;
  private vao: WebGLVertexArrayObject;
  private marks = new Map<string, { draw: MarkDraw; aspect: number }>();
  private textures = new Map<string, Tex>();
  private views = new Set<View>();
  private io: IntersectionObserver;
  private raf = 0;
  private last = 0;
  private time = 0;
  private dpr: number;
  private steps: number;
  private quality: number;
  private paused: boolean;
  private reduced: boolean;
  private tintA: Rgb = [0.55, 0.36, 0.98];
  private tintB: Rgb = [0.22, 0.71, 0.97];
  private tintTargetA: Rgb = [0.55, 0.36, 0.98];
  private tintTargetB: Rgb = [0.22, 0.71, 0.97];
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private slowFrames = 0;
  private watchEnabled = true;
  private beforeFrame: Array<(t: number) => void> = [];
  private dirty = true;
  private lastScroll = -1;
  private onPointer = (e: PointerEvent) => {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  private onResize = () => {
    this.resize();
    this.dirty = true;
  };
  private onVisibility = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, tier: Tier, reduced: boolean) {
    this.gl = gl;
    this.tier = tier;
    this.reduced = reduced;
    this.paused = reduced;
    const cfg = TIER_CFG[tier];
    this.dpr = Math.min(cfg.dpr, window.devicePixelRatio || 1);
    this.steps = cfg.steps;
    this.quality = cfg.quality;

    this.bg = program(gl, BG_FS);
    this.logo = program(gl, LOGO_FS);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          for (const v of this.views) if (v.el === e.target) v.visible = e.isIntersecting;
        }
        this.dirty = true;
      },
      { rootMargin: "15% 0px 15% 0px" },
    );

    this.resize();
    window.addEventListener("resize", this.onResize);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  /** Returns null when WebGL2 is missing or the shaders fail on this GPU. */
  static create(
    canvas: HTMLCanvasElement,
    opts: { tier?: Tier; reducedMotion?: boolean; watch?: boolean } = {},
  ): Stage | null {
    try {
      const gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      });
      if (!gl) return null;
      const stage = new Stage(canvas, gl, opts.tier ?? detectTier(), Boolean(opts.reducedMotion));
      stage.watchEnabled = opts.watch !== false;
      return stage;
    } catch (err) {
      console.warn("[logo3d] WebGL stage disabled:", err);
      return null;
    }
  }

  /** Register (or replace) a mark. Replacing drops its cached field, so views pick up the new drawing. */
  defineMark(key: string, draw: MarkDraw, aspect = 1) {
    this.marks.set(key, { draw, aspect });
    const old = this.textures.get(key);
    if (old) {
      this.gl.deleteTexture(old.tex);
      this.textures.delete(key);
      this.dirty = true;
    }
  }

  /** Run a callback at the start of every frame (used to drive smooth scrolling). */
  onBeforeFrame(cb: (t: number) => void) {
    this.beforeFrame.push(cb);
    return () => {
      this.beforeFrame = this.beforeFrame.filter((f) => f !== cb);
    };
  }

  setPalette(a: string, b: string) {
    this.tintTargetA = hexToRgb(a);
    this.tintTargetB = hexToRgb(b);
    this.dirty = true;
  }

  setPaused(paused: boolean) {
    this.paused = paused || this.reduced;
    this.dirty = true;
  }

  get isPaused() {
    return this.paused;
  }

  /** Current render settings, for QA (window.__avLogo3d). */
  get info() {
    return { tier: this.tier, dpr: this.dpr, steps: this.steps, views: this.views.size };
  }

  addView(el: HTMLElement, params: Partial<ViewParams>): ViewHandle {
    const target = { ...DEFAULTS, ...params };
    const view: View = {
      el,
      target,
      cur: {
        morph: target.morph,
        material: [...target.material],
        face: hexToRgb(target.face),
        side: hexToRgb(target.side),
        glow: hexToRgb(target.glow),
        depth: target.depth,
        bevel: target.bevel,
        extrude: target.extrude,
        fill: target.fill,
        reveal: target.reveal,
        yaw: target.yaw,
        pitch: target.pitch,
        scale: target.scale,
      },
      pointer: { x: 0, y: 0, active: false },
      visible: false,
      seed: Math.random() * 100,
      spin: 0,
    };
    this.views.add(view);
    this.io.observe(el);
    this.texture(target.mark);
    if (target.markB) this.texture(target.markB);
    this.dirty = true;
    return {
      set: (next, instant) => {
        Object.assign(view.target, next);
        if (next.mark) this.texture(next.mark);
        if (next.markB) this.texture(next.markB);
        if (instant) this.snap(view);
        this.dirty = true;
      },
      pointer: (x, y, active) => {
        view.pointer.x = x;
        view.pointer.y = y;
        view.pointer.active = active;
        this.dirty = true;
      },
      destroy: () => {
        this.io.unobserve(el);
        this.views.delete(view);
        this.dirty = true;
      },
    };
  }

  /** Render one view into a standalone 2D canvas (for the watermarked preview download). */
  snapshot(el: HTMLElement): HTMLCanvasElement | null {
    const view = [...this.views].find((v) => v.el === el);
    if (!view) return null;
    const rect = el.getBoundingClientRect();
    this.renderFrame(0, true);
    const gl = this.gl;
    const x = Math.max(0, Math.round(rect.left * this.dpr));
    const y = Math.max(0, Math.round((window.innerHeight - rect.bottom) * this.dpr));
    const w = Math.min(this.canvas.width - x, Math.round(rect.width * this.dpr));
    const h = Math.min(this.canvas.height - y, Math.round(rect.height * this.dpr));
    if (w <= 0 || h <= 0) return null;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    const img = ctx.createImageData(w, h);
    for (let row = 0; row < h; row++) {
      img.data.set(px.subarray((h - 1 - row) * w * 4, (h - row) * w * 4), row * w * 4);
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  destroy() {
    this.stop();
    this.io.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    for (const t of this.textures.values()) this.gl.deleteTexture(t.tex);
    this.textures.clear();
    this.views.clear();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  // ---------------------------------------------------------------- internals

  private texture(key: string): Tex | null {
    const hit = this.textures.get(key);
    if (hit) return hit;
    let info: SdfTexture | null = null;
    if (key.startsWith("text:")) info = sdfFromText(key.slice(5));
    else {
      const mark = this.marks.get(key);
      if (mark) info = sdfFromMark(mark.draw, this.tier === "low" ? 224 : 320, mark.aspect);
    }
    if (!info) return null;
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, info.width, info.height, 0, gl.RED, gl.FLOAT, info.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const entry = { tex, info };
    this.textures.set(key, entry);
    // Text fields are throwaway: keep the cache from growing while someone types.
    const texts = [...this.textures.keys()].filter((k) => k.startsWith("text:"));
    if (texts.length > 6) {
      const inUse = new Set([...this.views].flatMap((v) => [v.target.mark, v.target.markB]));
      for (const k of texts.slice(0, texts.length - 6)) {
        if (inUse.has(k)) continue;
        gl.deleteTexture(this.textures.get(k)!.tex);
        this.textures.delete(k);
      }
    }
    return entry;
  }

  private resize() {
    const w = Math.max(1, Math.round(window.innerWidth * this.dpr));
    const h = Math.max(1, Math.round(window.innerHeight * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      for (const cb of this.beforeFrame) cb(t);
      this.watch(dt);
      this.renderFrame(dt, false);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Frame-time guard: if the device can't keep up, render fewer pixels. Never goes back up. */
  private watch(dt: number) {
    if (!this.watchEnabled || this.paused || dt <= 0) return;
    if (dt > 1 / 32) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 24 && this.dpr > 0.62) {
      this.dpr = Math.max(0.62, this.dpr * 0.84);
      this.steps = Math.max(36, Math.round(this.steps * 0.88));
      this.slowFrames = 0;
      this.resize();
    }
  }

  private snap(v: View) {
    const t = v.target;
    v.cur.morph = t.morph;
    v.cur.material = [...t.material];
    v.cur.face = hexToRgb(t.face);
    v.cur.side = hexToRgb(t.side);
    v.cur.glow = hexToRgb(t.glow);
    v.cur.depth = t.depth;
    v.cur.bevel = t.bevel;
    v.cur.extrude = t.extrude;
    v.cur.fill = t.fill;
    v.cur.reveal = t.reveal;
    v.cur.scale = t.scale;
  }

  private ease(v: View, dt: number): boolean {
    const t = v.target;
    const c = v.cur;
    const k = this.reduced ? 60 : 5.5;
    let moving = false;
    const step = (a: number, b: number, kk = k) => {
      const n = damp(a, b, kk, dt);
      if (Math.abs(n - b) > 1e-3) moving = true;
      return Math.abs(n - b) < 1e-4 ? b : n;
    };
    c.morph = step(c.morph, t.morph, k * 0.7);
    for (let i = 0; i < 4; i++) c.material[i] = step(c.material[i], t.material[i]);
    const face = hexToRgb(t.face);
    const side = hexToRgb(t.side);
    const glow = hexToRgb(t.glow);
    for (let i = 0; i < 3; i++) {
      c.face[i] = step(c.face[i], face[i]);
      c.side[i] = step(c.side[i], side[i]);
      c.glow[i] = step(c.glow[i], glow[i]);
    }
    c.depth = step(c.depth, t.depth);
    c.bevel = step(c.bevel, t.bevel);
    c.extrude = step(c.extrude, t.extrude, k * 1.4);
    c.fill = step(c.fill, t.fill, k * 1.4);
    c.reveal = step(c.reveal, t.reveal, k * 0.6);
    c.scale = step(c.scale, t.scale);

    // Rotation.
    let yaw = t.yaw;
    let pitch = t.pitch;
    const live = !this.paused;
    if (t.rotation === "idle" && live) {
      yaw = t.yaw + Math.sin(this.time * 0.42 + v.seed) * 0.38;
      pitch = t.pitch + Math.sin(this.time * 0.31 + v.seed * 1.7) * 0.12;
    } else if (t.rotation === "pointer") {
      const px = v.pointer.active ? v.pointer.x : this.pointer.sx;
      const py = v.pointer.active ? v.pointer.y : this.pointer.sy;
      const drift = live ? Math.sin(this.time * 0.4 + v.seed) * 0.12 : 0;
      yaw = t.yaw + px * 0.55 + drift;
      pitch = t.pitch - py * 0.3;
    } else if (t.rotation === "spin") {
      if (live) v.spin += dt * 0.9;
      yaw = t.yaw + v.spin;
      pitch = t.pitch + (live ? Math.sin(this.time * 0.5) * 0.1 : 0);
    }
    c.yaw = this.reduced ? yaw : step(c.yaw, yaw, 4);
    c.pitch = this.reduced ? pitch : step(c.pitch, pitch, 4);
    return moving;
  }

  private renderFrame(dt: number, force: boolean) {
    const gl = this.gl;
    const scroll = window.scrollY;
    const scrolled = scroll !== this.lastScroll;
    this.lastScroll = scroll;
    if (!this.paused) this.time += dt;

    this.pointer.sx = damp(this.pointer.sx, this.pointer.x, 2.5, dt);
    this.pointer.sy = damp(this.pointer.sy, this.pointer.y, 2.5, dt);
    for (let i = 0; i < 3; i++) {
      this.tintA[i] = damp(this.tintA[i], this.tintTargetA[i], 1.6, dt || 1);
      this.tintB[i] = damp(this.tintB[i], this.tintTargetB[i], 1.6, dt || 1);
    }

    let moving = false;
    for (const v of this.views) if (this.ease(v, dt || 1)) moving = true;
    const tintMoving =
      Math.abs(this.tintA[0] - this.tintTargetA[0]) + Math.abs(this.tintB[2] - this.tintTargetB[2]) > 0.002;
    if (this.paused && !force && !this.dirty && !scrolled && !moving && !tintMoving) return;
    this.dirty = false;

    const W = this.canvas.width;
    const H = this.canvas.height;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.useProgram(this.bg.p);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.bg.u("uRes"), W, H);
    gl.uniform1f(this.bg.u("uTime"), this.time);
    gl.uniform1f(this.bg.u("uScroll"), scroll / Math.max(1, window.innerHeight));
    gl.uniform2f(this.bg.u("uPointer"), this.pointer.sx, this.pointer.sy);
    gl.uniform3fv(this.bg.u("uTintA"), this.tintA);
    gl.uniform3fv(this.bg.u("uTintB"), this.tintB);
    gl.uniform1f(this.bg.u("uQuality"), this.quality);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.SCISSOR_TEST);
    gl.useProgram(this.logo.p);
    const vh = window.innerHeight;
    const lightDir = [-0.4, 0.55, 0.73];
    for (const v of this.views) {
      if (!v.visible) continue;
      const r = v.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width < 2 || r.height < 2) continue;
      const a = this.texture(v.target.mark);
      if (!a) continue;
      const b = v.target.markB ? this.texture(v.target.markB) : null;
      const x = Math.round(r.left * this.dpr);
      const y = Math.round((vh - r.bottom) * this.dpr);
      const w = Math.round(r.width * this.dpr);
      const h = Math.round(r.height * this.dpr);
      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);

      const c = v.cur;
      const aspect = r.width / r.height;
      const visH = 4.2 * 0.32;
      const visW = visH * aspect;
      const morph = b ? c.morph : 0;
      const cw = Math.max(a.info.contentHalf[0], b ? b.info.contentHalf[0] * morph : 0);
      const ch = Math.max(a.info.contentHalf[1], b ? b.info.contentHalf[1] * morph : 0);
      const fit = Math.min(visH / (ch + 0.12), visW / (cw + 0.12)) * 0.86 * c.scale;

      const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
      const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
      // R = Ry(yaw) * Rx(pitch), uploaded row-major so the shader receives R^T (the inverse).
      const R = [cy, sy * sp, sy * cp, 0, cp, -sp, -sy, cy * sp, cy * cp];

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform1i(this.logo.u("uSdfA"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, (b ?? a).tex);
      gl.uniform1i(this.logo.u("uSdfB"), 1);
      const info = (t: Tex) => [t.info.aspect, 2.5 / t.info.height, t.info.spread];
      gl.uniform3fv(this.logo.u("uInfoA"), info(a));
      gl.uniform3fv(this.logo.u("uInfoB"), info(b ?? a));
      gl.uniform1f(this.logo.u("uMorph"), morph);
      gl.uniform1f(this.logo.u("uViewAspect"), aspect);
      gl.uniformMatrix3fv(this.logo.u("uRot"), false, R);
      gl.uniform1f(this.logo.u("uFit"), fit);
      gl.uniform1f(this.logo.u("uDepth"), c.depth);
      gl.uniform1f(this.logo.u("uBevel"), c.bevel);
      gl.uniform1f(this.logo.u("uExtrude"), c.extrude);
      gl.uniform1f(this.logo.u("uFill"), c.fill);
      gl.uniform1f(this.logo.u("uReveal"), c.reveal);
      gl.uniform4fv(this.logo.u("uMat"), c.material);
      gl.uniform3fv(this.logo.u("uFace"), c.face);
      gl.uniform3fv(this.logo.u("uSide"), c.side);
      gl.uniform3fv(this.logo.u("uGlow"), c.glow);
      gl.uniform1f(this.logo.u("uTime"), this.time);
      gl.uniform1i(this.logo.u("uSteps"), this.steps);
      gl.uniform3fv(this.logo.u("uLightDir"), lightDir);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.SCISSOR_TEST);
  }
}
