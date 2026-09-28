import { useEffect, useRef } from "react";
import { num } from "./_props";
import type { DemoProps } from "./registry";

/** Aurora: un singur fragment shader WebGL2, la jumătate de rezoluție. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uHue; out vec4 o;
vec3 hsl(float h,float s,float l){vec3 r=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return l+s*(r-.5)*(1.-abs(2.*l-1.));}
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec2 q=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uTime*.06; vec3 col=vec3(.02,.025,.04);
  for(float i=0.;i<4.;i++){
    float band=fbm(vec2(q.x*1.6+i*.7+t, q.y*.8 - t*.5 + i));
    float y=q.y+ (band-.5)*.9 + i*.12 - .2;
    float glow=exp(-abs(y)*7.);
    col += hsl(fract(uHue/360.+i*.06),.85,.55)*glow*.5;
  }
  col*= smoothstep(1.3,.2,length(uv-.5)*1.3);
  col += (h1(gl_FragCoord.xy+uTime)-.5)/255.;
  o=vec4(col,1.);
}`;

export default function AuroraDemo({ values, active }: DemoProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const hue = num(values.hue, 170);
  const speed = num(values.speed, 1);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      canvas.style.background = "linear-gradient(160deg,#08131a,#0d2b33,#071018)";
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

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * 0.5));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * 0.5));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!active) return;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.uniform1f(uHue, hue);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [hue, speed, active]);

  return <canvas ref={ref} aria-hidden className="h-full w-full" />;
}
