"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  radius: number;
  depth: number; // 0 = far/dim/slow, 1 = near/bright/fast
  driftX: number;
  driftY: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  warm: boolean;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  life: number;
  maxLife: number;
};

const MAX_DPR = 2;
// How far (css px) the nearest stars slide when the pointer crosses the screen.
const POINTER_SHIFT = 14;

// The constellation Pyxis (the mariner's compass): α, β, γ and δ Pyxidis,
// as fractions of the viewport, drawn faintly in the hero sky.
const PYXIS = [
  { x: 0.78, y: 0.16, r: 2.2 }, // α
  { x: 0.755, y: 0.27, r: 1.6 }, // β
  { x: 0.735, y: 0.37, r: 1.9 }, // γ
  { x: 0.81, y: 0.33, r: 1.2 }, // δ
];
const PYXIS_LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
];

// One star per ~9000 css px², so a phone gets ~60 stars and a desktop ~150.
function starCount(width: number, height: number) {
  return Math.max(60, Math.min(170, Math.round((width * height) / 9000)));
}

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: starCount(width, height) }, () => {
    const depth = Math.pow(Math.random(), 2.2); // most stars are far away
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.35 + depth * 1.4 + Math.random() * 0.3,
      depth,
      driftX: (Math.random() - 0.5) * 0.02 * (0.4 + depth),
      driftY: (Math.random() - 0.5) * 0.02 * (0.4 + depth),
      twinkleSpeed: Math.random() * 0.018 + 0.004,
      twinkleOffset: Math.random() * Math.PI * 2,
      // a small share of the stars glow warm brass, matching the accent
      warm: Math.random() < 0.16,
    };
  });
}

function spawnShootingStar(width: number, height: number): ShootingStar {
  const speed = Math.random() * 5 + 6;
  const angle = Math.PI * (0.72 + Math.random() * 0.12); // down-left
  return {
    x: Math.random() * width * 0.6 + width * 0.4,
    y: Math.random() * height * 0.35,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len: Math.random() * 90 + 70,
    life: 0,
    maxLife: Math.random() * 40 + 40,
  };
}

/**
 * Starfield with depth: near stars are larger, brighter, drift faster,
 * parallax against the scroll and, on devices with a mouse, lean gently
 * toward the pointer. DPR-aware so stars stay crisp on retina displays.
 * The constellation Pyxis sits in the hero sky and fades as you scroll.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let shootingStars: ShootingStar[] = [];

    // Pointer parallax target (-1..1) and the eased value actually drawn.
    let targetPx = 0;
    let targetPy = 0;
    let px = 0;
    let py = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (event: PointerEvent) => {
      targetPx = (event.clientX / width) * 2 - 1;
      targetPy = (event.clientY / height) * 2 - 1;
    };
    if (finePointer && !prefersReducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    let frame = 0;
    let animationId: number | undefined;

    const drawConstellation = (scroll: number) => {
      // Fully visible at the top, gone once the hero has scrolled away.
      const visibility = Math.max(0, 1 - scroll / (height * 0.9));
      if (visibility <= 0) return;
      // On narrow screens the headline sits higher, so keep the figure in the top band.
      const ky = width < 640 ? 0.55 : 1;
      const pts = PYXIS.map((s) => ({
        x: s.x * width + px * POINTER_SHIFT * 0.6,
        y: s.y * height * ky - scroll * 0.1 + py * POINTER_SHIFT * 0.6,
        r: s.r,
      }));
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(242, 241, 238, ${0.18 * visibility})`;
      for (const [a, b] of PYXIS_LINES) {
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.stroke();
      }
      pts.forEach((p, i) => {
        const tw = 0.7 + 0.3 * Math.sin(frame * 0.02 + i * 1.7);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `rgba(234, 197, 124, ${0.35 * tw * visibility})`);
        g.addColorStop(1, "rgba(234, 197, 124, 0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 241, 238, ${0.95 * tw * visibility})`;
        ctx.fill();
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const scroll = window.scrollY || 0;
      px += (targetPx - px) * 0.04;
      py += (targetPy - py) * 0.04;

      for (const p of particles) {
        p.x = (p.x + p.driftX + width) % width;
        p.y = (p.y + p.driftY + height) % height;
        // near stars slide faster than the page (scroll) and lean toward the pointer
        const sx = p.x - px * POINTER_SHIFT * p.depth;
        const sy = (p.y - scroll * p.depth * 0.12 - py * POINTER_SHIFT * p.depth + height * 4) % height;
        const twinkle =
          0.35 + 0.65 * Math.abs(Math.sin(frame * p.twinkleSpeed + p.twinkleOffset));
        const alpha = twinkle * (0.3 + p.depth * 0.55);
        const rgb = p.warm ? "234, 197, 124" : "242, 241, 238";

        if (p.depth > 0.8) {
          // soft halo on the nearest stars
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.radius * 5);
          g.addColorStop(0, `rgba(${rgb}, ${alpha * 0.35})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.beginPath();
          ctx.arc(sx, sy, p.radius * 5, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.fill();
      }

      drawConstellation(scroll);

      if (!prefersReducedMotion && shootingStars.length < 1 && Math.random() < 0.0025) {
        shootingStars.push(spawnShootingStar(width, height));
      }

      shootingStars = shootingStars.filter((s) => s.life < s.maxLife);
      for (const s of shootingStars) {
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;
        const fade = Math.sin((s.life / s.maxLife) * Math.PI);
        const tailX = s.x - s.vx * (s.len / 10);
        const tailY = s.y - s.vy * (s.len / 10);
        const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(242, 241, 238, ${fade})`);
        gradient.addColorStop(1, "rgba(242, 241, 238, 0)");
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      frame += 1;
      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="particle-field"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
