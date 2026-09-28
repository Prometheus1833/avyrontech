import { useEffect, useRef } from "react";

/**
 * DisplacementImage — Avyron Products (avyron.ro/produse)
 * Imaginea se undulează sub cursor, printr-un shader WebGL2 pe o singură
 * textură. `<img>` rămâne în DOM pentru SEO și pentru fallback.
 */

const VERT = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uMouse; uniform float uStrength, uRadius, uTime, uPresence;
void main(){
  vec2 p = uv;
  float d = distance(p, uMouse);
  float fall = exp(-d*d/max(.0001,uRadius*uRadius));
  vec2 dir = normalize(p - uMouse + 1e-5);
  float wave = sin(d*28. - uTime*3.2);
  p += dir * wave * fall * uStrength * uPresence;
  vec3 col = texture(uTex, clamp(p, .001, .999)).rgb;
  // Aberație cromatică fină, doar în zona deformată.
  col.r = texture(uTex, clamp(p + dir*.004*fall*uPresence, .001, .999)).r;
  col.b = texture(uTex, clamp(p - dir*.004*fall*uPresence, .001, .999)).b;
  o = vec4(col, 1.);
}`;

type Props = { src: string; alt: string; strength?: number; radius?: number; className?: string };

export function DisplacementImage({ src, alt, strength = 0.035, radius = 0.28, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = wrap.current;
    if (!canvas || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) return;

    const sh = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uStrength = gl.getUniformLocation(prog, "uStrength");
    const uRadius = gl.getUniformLocation(prog, "uRadius");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uPresence = gl.getUniformLocation(prog, "uPresence");

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    let ready = false;
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      ready = true;
    };

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(host.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
      canvas.height = Math.max(1, Math.floor(host.clientHeight * Math.min(window.devicePixelRatio || 1, 2)));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, presence: 0, tp: 0 };
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      mouse.tx = (event.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (event.clientY - rect.top) / rect.height;
      mouse.tp = 1;
    };
    const onLeave = () => (mouse.tp = 0);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!ready) return;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      mouse.presence += (mouse.tp - mouse.presence) * 0.08;
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uStrength, strength);
      gl.uniform1f(uRadius, radius);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uPresence, mouse.presence);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src, strength, radius]);

  return (
    <div ref={wrap} className={className} style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}>
      <img src={src} alt={alt} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
      <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

export default DisplacementImage;
