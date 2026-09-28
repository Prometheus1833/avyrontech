import { useEffect, useRef } from "react";
import type { Tier } from "../lib/capability";

/**
 * Fundalul persistent al paginii: un singur fragment shader WebGL2, fără
 * three.js, randat sub rezoluția ecranului. Nuanța urmează secțiunea activă
 * (variabila CSS --pa-hue de pe .pa-root), iar la trecerea dintre secțiuni un
 * impuls fin de refracție străbate câmpul — asta leagă secțiunile între ele.
 */

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uHue; uniform float uScroll; uniform float uPulse; uniform vec2 uMouse;
out vec4 o;
vec3 hsl(float h, float s, float l){ vec3 rgb = clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); return l + s*(rgb-.5)*(1.-abs(2.*l-1.)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 q = (gl_FragCoord.xy - .5*uRes) / uRes.y;
  float t = uTime*.035;
  vec2 m = (uMouse - .5) * vec2(uRes.x/uRes.y, 1.);
  float d = length(q - m);
  q += normalize(q - m + 1e-4) * uPulse * .08 * exp(-d*2.);
  float n = fbm(q*1.4 + vec2(t, -t*.6) + uScroll*.6);
  float n2 = fbm(q*2.6 - vec2(t*.8, t) + n);
  float h = uHue/360.;
  vec3 a = hsl(h, .75, .10);
  vec3 b = hsl(fract(h + .12), .85, .17);
  vec3 col = mix(vec3(.028,.033,.05), a, smoothstep(.25,.9,n));
  col = mix(col, b, smoothstep(.55,.95,n2)*.55);
  col += hsl(h,.9,.55) * .06 * exp(-d*3.);
  float vig = smoothstep(1.25,.25,length(uv-.5)*1.4);
  col *= mix(.55,1.,vig);
  col += (hash(gl_FragCoord.xy + uTime) - .5) / 255.;
  o = vec4(col,1.);
}`;

export default function Backdrop({ tier }: { tier: Tier }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uTime = u("uTime"), uHue = u("uHue"), uScroll = u("uScroll"), uPulse = u("uPulse"), uMouse = u("uMouse");

    const scale = tier === "high" ? 0.6 : tier === "mid" ? 0.45 : 0.33;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const root = document.querySelector<HTMLElement>(".pa-root");
    let hue = 265;
    let lastTarget = 265;
    let pulse = 0;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const onVis = () => (visible = document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible) return;
      const target = Number(root ? getComputedStyle(root).getPropertyValue("--pa-hue") : 265) || 265;
      if (Math.abs(target - lastTarget) > 1) {
        pulse = 1;
        lastTarget = target;
      }
      hue += (target - hue) * 0.04;
      pulse *= 0.94;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uHue, hue);
      gl.uniform1f(uScroll, window.scrollY / maxScroll);
      gl.uniform1f(uPulse, pulse);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [tier]);

  return <canvas ref={ref} aria-hidden="true" className="fixed inset-0 -z-10 h-full w-full" style={{ imageRendering: "auto" }} />;
}
