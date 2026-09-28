import { useEffect, useRef } from "react";
import * as THREE from "three";
import { detectTier } from "../lib/capability";
import type { DemoProps } from "./registry";

/**
 * Glob din puncte cu arce animate. Punctele sunt distribuite Fibonacci pe
 * sferă; arcele sunt curbe quadratice între orașe, desenate ca linii cu
 * dash animat. Rotire liberă cu inerție.
 */
const CITIES: Array<[string, number, number]> = [
  ["Iași", 47.16, 27.59],
  ["București", 44.43, 26.1],
  ["Londra", 51.5, -0.13],
  ["Berlin", 52.52, 13.4],
  ["Madrid", 40.42, -3.7],
  ["New York", 40.71, -74.01],
  ["Dubai", 25.2, 55.27],
  ["Singapore", 1.35, 103.82],
];

const toVector = (lat: number, lon: number, radius: number) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
};

export default function GlobeDemo({ active }: DemoProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || detectTier() === "none") return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / Math.max(1, el.clientHeight), 0.1, 100);
    camera.position.set(0, 0, 5.4);
    const group = new THREE.Group();
    scene.add(group);

    // Punctele globului.
    const count = 2600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;
      positions[i * 3] = Math.cos(theta) * Math.sin(phi) * 1.8;
      positions[i * 3 + 1] = Math.cos(phi) * 1.8;
      positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * 1.8;
    }
    const dots = new THREE.BufferGeometry();
    dots.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    group.add(new THREE.Points(dots, new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.022, transparent: true, opacity: 0.6, sizeAttenuation: true })));

    // Sfera interioară, ca globul să nu pară gol.
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1.78, 48, 32), new THREE.MeshBasicMaterial({ color: 0x0a1626, transparent: true, opacity: 0.85 })));

    // Arcele dintre orașe.
    const arcs: THREE.Line[] = [];
    for (let i = 0; i < CITIES.length - 1; i++) {
      const from = toVector(CITIES[i][1], CITIES[i][2], 1.8);
      const to = toVector(CITIES[i + 1][1], CITIES[i + 1][2], 1.8);
      const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(1.8 + from.distanceTo(to) * 0.35);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
      const material = new THREE.LineDashedMaterial({ color: 0xa78bfa, dashSize: 0.18, gapSize: 0.5, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      arcs.push(line);
      group.add(line);

      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.copy(from);
      group.add(marker);
    }

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    let dragging = false;
    let lx = 0;
    let ly = 0;
    let velX = 0;
    let velY = 0.0025;
    let rotX = 0.25;
    let rotY = 0;
    const down = (event: PointerEvent) => {
      dragging = true;
      lx = event.clientX;
      ly = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      velY = (event.clientX - lx) * 0.005;
      velX = (event.clientY - ly) * 0.004;
      lx = event.clientX;
      ly = event.clientY;
    };
    const up = () => (dragging = false);
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);

    let frame = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!active || document.visibilityState !== "visible") return;
      rotY += velY + 0.0022;
      rotX = THREE.MathUtils.clamp(rotX + velX, -0.8, 0.8);
      velX *= 0.92;
      velY *= 0.94;
      group.rotation.set(rotX, rotY, 0);
      for (const [index, arc] of arcs.entries()) {
        const material = arc.material as THREE.LineDashedMaterial;
        material.dashSize = 0.12 + 0.14 * (0.5 + 0.5 * Math.sin(now / 900 + index));
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [active]);

  return <div ref={host} className="h-full w-full" />;
}
