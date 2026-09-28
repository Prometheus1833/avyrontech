import { useEffect, useRef } from "react";
import { num } from "./_props";
import type { DemoProps } from "./registry";

/** Fire de lumină: straturi sumate aditiv, tonemapping și dither. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime, uHue; uniform vec2 uMouse; out vec4 o;
vec3 hsl(float h,float s,float l){vec3 r=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return l+s*(r-.5)*(1.-abs(2.*l-1.));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 q=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 m=(uMouse-.5)*vec2(uRes.x/uRes.y,1.);
  float d=length(q-m);
  q=rot(.35*exp(-d*2.5))*q;
  vec3 col=vec3(0.);
  float t=uTime*.25;
  for(float i=0.;i<26.;i++){
    float k=i/26.;
    vec2 p=q;
    p.y+=sin(p.x*2.2+t+ i*.35)*.22 + sin(p.x*4.7-t*.7+i)*.06;
    p*=1.+k*.6;
    float glow=.006/ (abs(p.y)+.006);
    col+= hsl(fract(uHue/360.+k*.12),.8,.55)*glow*(.35+.65*(1.-k));
  }
  col*=smoothstep(1.25,.25,length(uv-.5)*1.35);
  // Tonemap ACES aproximativ + gamma + dither contra benzilor.
  col=(col*(2.51*col+.03))/(col*(2.43*col+.59)+.14);
  col=pow(max(col,0.),vec3(.4545));
  col+=(hash(gl_FragCoord.xy+uTime)-.5)/255.;
  o=vec4(col,1.);
}`;

export default function LightStrandsDemo({ values, active }: DemoProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hue = num(values.hue, 200);
  const speed = num(values.speed, 1);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      canvas.style.background = "linear-gradient(160deg,#04121b,#0a2a3a,#050a12)";
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uHue = gl.getUniformLocation(prog, "uHue");
    const uMouse = gl.getUniformLocation(prog, "uMouse");

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * 0.55));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * 0.55));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (event.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (event.clientY - rect.top) / rect.height;
    };
    canvas.addEventListener("pointermove", onMove);

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!active) return;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.uniform1f(uHue, hue);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [hue, speed, active]);

  return <canvas ref={ref} aria-hidden className="h-full w-full" />;
}
