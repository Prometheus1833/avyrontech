import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The depth field behind the process page: a slab of brand-tinted points that
 * drifts on its own and parallaxes with scroll, so the page reads as one
 * continuous space rather than a stack of sections.
 *
 * Deliberately minimal — points, no lights, no post-processing, one draw call.
 * The component is lazy-loaded so three never reaches any other route's bundle,
 * and it bails out entirely on reduced-motion or when WebGL is unavailable.
 */

const COUNT_DESKTOP = 2600;
const COUNT_MOBILE = 900;

export default function ProcessBackdrop() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the page is complete without this layer.
    }

    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const count = mobile ? COUNT_MOBILE : COUNT_DESKTOP;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 120);
    camera.position.z = 26;

    // Read the brand ramp off the theme so the field recolours with it.
    const css = getComputedStyle(document.documentElement);
    const hsl = (token: string, fallback: string) => {
      const v = css.getPropertyValue(token).trim() || fallback;
      const [h, s, l] = v.split(/\s+/);
      return new THREE.Color().setHSL(
        parseFloat(h) / 360,
        parseFloat(s) / 100,
        parseFloat(l) / 100,
      );
    };
    const ramp = [
      hsl("--brand", "264 90% 62%"),
      hsl("--brand-2", "200 95% 55%"),
      hsl("--brand-3", "330 85% 65%"),
    ];

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 78;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 78;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 46;
      const c = ramp[Math.floor(Math.random() * ramp.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // PointsMaterial draws hard squares by default; a radial sprite turns each
    // point into a soft disc, which is what reads as depth rather than noise.
    const sprite = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      if (!g) return null;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();

    const material = new THREE.PointsMaterial({
      map: sprite ?? undefined,
      alphaMap: sprite ?? undefined,
      size: 0.42,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const field = new THREE.Points(geometry, material);
    scene.add(field);

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    const render = () => {
      if (!running) return;
      const t = clock.getElapsedTime();
      // Scroll drives depth; time keeps it alive when the page is still.
      const progress = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      field.rotation.y = t * 0.018 + progress * 0.5;
      field.rotation.x = Math.sin(t * 0.09) * 0.05;
      camera.position.z = 26 - progress * 9;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onResize = () => {
      if (!el.clientWidth || !el.clientHeight) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Stop burning frames when the tab is hidden.
    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        clock.getDelta();
        raf = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      sprite?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)]"
    />
  );
}
