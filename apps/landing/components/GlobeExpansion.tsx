"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SectionEyebrow } from "./ui/SectionEyebrow";

// Country the globe rotates to face at each step.
const STEPS = [
  { lon: -70.6, lat: -33.4 }, // Chile (Santiago)
  { lon: -100, lat: 23 }, // Mexico
  { lon: -55, lat: -19 }, // Brazil & Paraguay
];

// Callout anchors: which countries get a labelled line at each step.
type Ann = {
  key: string;
  names: { es: string; en: string };
  match: string[]; // GeoJSON NAME values to highlight
  lat: number;
  lon: number;
  steps: number[];
  off: { dx: number; dy: number };
};
const ANN: Ann[] = [
  { key: "cl", names: { es: "Chile", en: "Chile" }, match: ["Chile"], lat: -33.4, lon: -70.6, steps: [0], off: { dx: -150, dy: -70 } },
  { key: "mx", names: { es: "México", en: "Mexico" }, match: ["Mexico"], lat: 23.6, lon: -102, steps: [1], off: { dx: 140, dy: -90 } },
  { key: "br", names: { es: "Brasil", en: "Brazil" }, match: ["Brazil"], lat: -10, lon: -52, steps: [2], off: { dx: 150, dy: -60 } },
  { key: "py", names: { es: "Paraguay", en: "Paraguay" }, match: ["Paraguay"], lat: -23.4, lon: -58, steps: [2], off: { dx: -175, dy: -20 } },
];

// --- Tunable framing constants ---
const FOV = 30;
const CAMERA_Z = 3.15;
const GLOBE_Y = -0.12;
const CAMERA_Y = 0.32;
const DEG = Math.PI / 180;

// Local position on the unit sphere for a (lat,lon), matching three.js
// SphereGeometry equirectangular UVs (u=0 at lon -180, increasing east).
function localVec(lat: number, lon: number, r = 1) {
  const phi = (lon + 180) * DEG;
  const theta = (90 - lat) * DEG;
  return new THREE.Vector3(
    -r * Math.cos(phi) * Math.sin(theta),
    r * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// Orientation that brings (lat,lon) to face the camera (+Z) with north up.
function orientationFor(lat: number, lon: number) {
  const p0 = localVec(lat, lon).normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(p0, new THREE.Vector3(0, 0, 1));
  const north = localVec(lat + 0.5, lon).sub(localVec(lat - 0.5, lon)).normalize();
  north.addScaledVector(p0, -north.dot(p0)).normalize();
  const n1 = north.applyQuaternion(q1);
  const q2 = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -Math.atan2(n1.x, n1.y)
  );
  return q2.multiply(q1);
}

export function GlobeExpansion() {
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  // The globe walks through the countries on its own until the visitor
  // takes the controls; from then on it only moves when asked.
  const [manual, setManual] = useState(false);
  const go = (next: number | ((s: number) => number)) => {
    setManual(true);
    setStep(next);
  };
  useEffect(() => {
    if (manual) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [manual]);

  const mountRef = useRef<HTMLDivElement>(null);
  const targetQuatRef = useRef(orientationFor(STEPS[0].lat, STEPS[0].lon));
  const stepRef = useRef(step);
  const reduceRef = useRef(shouldReduceMotion);
  // The render loop reads these refs, so keep them in sync after each commit.
  useEffect(() => {
    stepRef.current = step;
    reduceRef.current = shouldReduceMotion;
  }, [step, shouldReduceMotion]);

  // Overlay element refs (dot, line, card) per annotation.
  const annEls = useRef<
    Record<string, { line?: SVGLineElement | null; dot?: SVGCircleElement | null; card?: HTMLDivElement | null }>
  >({});

  useEffect(() => {
    targetQuatRef.current = orientationFor(STEPS[step].lat, STEPS[step].lon);
  }, [step]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL (test env)
    }

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
    camera.position.set(0, CAMERA_Y, CAMERA_Z);
    camera.lookAt(0, GLOBE_Y + 0.08, 0);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const loader = new THREE.TextureLoader();
    const nightTex = loader.load("/globe/earth-night.jpg");
    nightTex.colorSpace = THREE.SRGBColorSpace;
    nightTex.anisotropy = maxAniso;

    const earthGroup = new THREE.Group();
    earthGroup.position.y = GLOBE_Y;
    scene.add(earthGroup);

    const earthMat = new THREE.MeshStandardMaterial({
      map: nightTex,
      emissiveMap: nightTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.5,
      roughness: 1,
      metalness: 0,
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat);
    earth.quaternion.copy(targetQuatRef.current);
    earthGroup.add(earth);

    // Atmosphere glow (fresnel, additive)
    const atmMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader:
        "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 2.6); i = clamp(i, 0.0, 1.0); gl_FragColor = vec4(0.35,0.62,1.0,1.0) * i; }",
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 64), atmMat);
    earthGroup.add(atmosphere);

    scene.add(new THREE.AmbientLight(0x2a3550, 0.7));
    const sun = new THREE.DirectionalLight(0xbcd4ff, 0.9);
    sun.position.set(-2.5, 0.6, 1.4);
    scene.add(sun);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 30 + Math.random() * 40;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      starPos[i * 3 + 2] = r * Math.cos(ph);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xf2f1ee, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.8 })
    );
    scene.add(stars);

    // --- Country borders (loaded async) ---
    const disposables: { dispose: () => void }[] = [starGeo, earthMat, atmMat];
    let cancelled = false;
    const highlightMats: THREE.LineBasicMaterial[] = [];

    const ringSegs = (ring: number[][], r: number, arr: number[]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = localVec(ring[i][1], ring[i][0], r);
        const b = localVec(ring[i + 1][1], ring[i + 1][0], r);
        arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    };
    const featureSegs = (feature: { geometry?: { type: string; coordinates: number[][][] | number[][][][] } }, r: number, arr: number[]) => {
      const g = feature.geometry;
      if (!g) return;
      const polys = g.type === "Polygon" ? [g.coordinates as number[][][]] : g.type === "MultiPolygon" ? (g.coordinates as number[][][][]) : [];
      for (const poly of polys) for (const ring of poly) ringSegs(ring, r, arr);
    };

    fetch("/globe/countries.geojson")
      .then((r) => r.json())
      .then((geo: { features: { properties: { NAME?: string }; geometry?: { type: string; coordinates: number[][][] | number[][][][] } }[] }) => {
        if (cancelled) return;
        const all: number[] = [];
        for (const f of geo.features) featureSegs(f, 1.003, all);
        const allGeo = new THREE.BufferGeometry();
        allGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(all), 3));
        const allMat = new THREE.LineBasicMaterial({ color: 0x6f8fb5, transparent: true, opacity: 0.28 });
        earth.add(new THREE.LineSegments(allGeo, allMat));
        disposables.push(allGeo, allMat);

        for (const a of ANN) {
          const seg: number[] = [];
          for (const f of geo.features) if (a.match.includes(f.properties?.NAME ?? "")) featureSegs(f, 1.006, seg);
          if (!seg.length) continue;
          const hGeo = new THREE.BufferGeometry();
          hGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(seg), 3));
          const hMat = new THREE.LineBasicMaterial({ color: 0xf0b34d, transparent: true, opacity: 0.95 });
          hMat.userData.key = a.key;
          highlightMats.push(hMat);
          earth.add(new THREE.LineSegments(hGeo, hMat));
          disposables.push(hGeo, hMat);
        }
      })
      .catch(() => {});

    const resize = () => {
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const globeCenter = new THREE.Vector3(0, GLOBE_Y, 0);
    const tmp = new THREE.Vector3();
    const nrm = new THREE.Vector3();

    let raf = 0;
    const animate = () => {
      const k = reduceRef.current ? 1 : 0.06;
      if (k >= 1) earth.quaternion.copy(targetQuatRef.current);
      else earth.quaternion.slerp(targetQuatRef.current, k);
      atmosphere.quaternion.copy(earth.quaternion);
      if (!reduceRef.current) stars.rotation.y += 0.0003;
      earth.updateWorldMatrix(true, false);

      // Highlight only the active step's countries.
      const active = stepRef.current;
      for (const m of highlightMats) {
        const ann = ANN.find((a) => a.key === m.userData.key);
        m.opacity = ann && ann.steps.includes(active) ? 0.95 : 0;
      }

      renderer.render(scene, camera);

      // Update HTML/SVG callouts.
      for (const a of ANN) {
        const els = annEls.current[a.key];
        if (!els) continue;
        const on = a.steps.includes(active);
        nrm.copy(localVec(a.lat, a.lon)).applyQuaternion(earth.quaternion);
        tmp.copy(nrm).multiplyScalar(1.002).add(globeCenter);
        const camDir = tmp.clone().sub(camera.position).normalize();
        const facing = nrm.dot(camDir) < -0.1; // surface point turned toward camera
        const visible = on && facing;
        if (els.card) els.card.style.opacity = visible ? "1" : "0";
        if (els.line) els.line.style.opacity = visible ? "1" : "0";
        if (els.dot) els.dot.style.opacity = visible ? "1" : "0";
        if (!visible) continue;
        tmp.project(camera);
        const sx = (tmp.x * 0.5 + 0.5) * width;
        const sy = (-tmp.y * 0.5 + 0.5) * height;
        const cardW = 128;
        const cx = Math.min(Math.max(sx + a.off.dx, 12), width - cardW - 12);
        const cy = Math.min(Math.max(sy + a.off.dy, 70), height - 120);
        if (els.card) {
          els.card.style.transform = `translate(${cx}px, ${cy}px)`;
        }
        if (els.dot) {
          els.dot.setAttribute("cx", String(sx));
          els.dot.setAttribute("cy", String(sy));
        }
        if (els.line) {
          els.line.setAttribute("x1", String(sx));
          els.line.setAttribute("y1", String(sy));
          els.line.setAttribute("x2", String(cx + (a.off.dx < 0 ? cardW : 0)));
          els.line.setAttribute("y2", String(cy + 16));
        }
      }

      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      earth.geometry.dispose();
      atmosphere.geometry.dispose();
      nightTex.dispose();
      for (const d of disposables) d.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  const atStart = step === 0;
  const atEnd = step === STEPS.length - 1;

  return (
    <section id="expansion" className="relative h-screen w-full overflow-hidden bg-pyxis-bg">
      <div ref={mountRef} data-testid="globe-canvas" className="absolute inset-0" aria-hidden="true" />

      {/* Callout lines + dots */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
        {ANN.map((a) => (
          <g key={a.key}>
            <line
              ref={(el) => {
                annEls.current[a.key] = { ...annEls.current[a.key], line: el };
              }}
              stroke="#f0b34d"
              strokeWidth="1"
              strokeOpacity="0.8"
              style={{ opacity: 0, transition: "opacity 0.3s" }}
            />
            <circle
              ref={(el) => {
                annEls.current[a.key] = { ...annEls.current[a.key], dot: el };
              }}
              r="3"
              fill="#f0b34d"
              style={{ opacity: 0, transition: "opacity 0.3s" }}
            />
          </g>
        ))}
      </svg>

      {/* Callout cards */}
      {ANN.map((a) => (
        <div
          key={a.key}
          ref={(el) => {
            annEls.current[a.key] = { ...annEls.current[a.key], card: el };
          }}
          className="pointer-events-none absolute left-0 top-0 z-10 rounded-md border border-pyxis-accent/40 bg-pyxis-bg/80 px-3 py-1.5 font-mono-label text-xs tracking-widest text-pyxis-fg backdrop-blur"
          style={{ opacity: 0, transition: "opacity 0.3s", width: 128 }}
        >
          {a.names[lang]}
        </div>
      ))}

      {/* Readability scrims */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-pyxis-bg via-pyxis-bg/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-pyxis-bg via-pyxis-bg/80 to-transparent" />

      {/* Heading */}
      <div className="absolute inset-x-0 top-0 z-20 px-6 pt-24 text-center">
        <SectionEyebrow>{t.expansion.eyebrow}</SectionEyebrow>
        <h2 className="font-display mx-auto mt-3 max-w-3xl text-2xl font-bold text-pyxis-fg sm:text-4xl">
          {t.expansion.headlinePre} <em className="text-pyxis-accent">{t.expansion.headlineEmphasis}</em>
        </h2>
      </div>

      {/* Arrows */}
      <button
        type="button"
        onClick={() => go((s) => Math.max(0, s - 1))}
        disabled={atStart}
        aria-label={t.expansion.prevLabel}
        className={`absolute left-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-pyxis-fg/20 bg-pyxis-bg/50 text-pyxis-fg backdrop-blur transition sm:left-8 ${
          atStart ? "cursor-not-allowed opacity-25" : "hover:border-pyxis-accent hover:text-pyxis-accent"
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => go((s) => Math.min(STEPS.length - 1, s + 1))}
        disabled={atEnd}
        aria-label={t.expansion.nextLabel}
        className={`absolute right-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-pyxis-fg/20 bg-pyxis-bg/50 text-pyxis-fg backdrop-blur transition sm:right-8 ${
          atEnd ? "cursor-not-allowed opacity-25" : "hover:border-pyxis-accent hover:text-pyxis-accent"
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-16 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-auto max-w-xl"
          >
            <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-pyxis-accent">
              {t.expansion.stages[step].tag}
            </p>
            <h3 className="font-display mt-2 text-3xl font-bold text-pyxis-fg">
              {t.expansion.stages[step].title}
            </h3>
            <p className="mt-2 text-pyxis-fg/85">{t.expansion.stages[step].body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-center gap-2">
          {t.expansion.stages.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => go(i)}
              aria-label={s.title}
              aria-current={i === step}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === step ? "w-6 bg-pyxis-accent" : "w-1.5 bg-pyxis-fg/25 hover:bg-pyxis-fg/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
