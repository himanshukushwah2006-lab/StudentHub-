import { useEffect, useRef } from "react";
import { useTheme } from "@/src/lib/settings";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  colorIndex: number;
  depth: number;
}

const rippleListeners = new Set<(x: number, y: number) => void>();

export function triggerClickRipple(x: number, y: number) {
  rippleListeners.forEach((cb) => cb(x, y));
}

const DARK_PARTICLE_COLORS = [
  "34, 211, 238", // electric cyan
  "59, 130, 246", // royal blue
  "139, 92, 246", // violet
  "192, 132, 252", // soft purple
];

const LIGHT_PARTICLE_COLORS = [
  "2, 132, 199",
  "37, 99, 235",
  "99, 102, 241",
  "124, 58, 237",
];

function createParticles(width: number, height: number, count: number): DustParticle[] {
  const list: DustParticle[] = [];
  for (let i = 0; i < count; i++) {
    const depth = 0.35 + Math.random() * 0.85;
    list.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22 * depth,
      vy: (-0.08 - Math.random() * 0.22) * depth,
      size: 0.9 + Math.random() * 1.9,
      baseAlpha: 0.16 + Math.random() * 0.38,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.016,
      colorIndex: i % DARK_PARTICLE_COLORS.length,
      depth,
    });
  }
  return list;
}

export function AmbientBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme] = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer =
      window.matchMedia && window.matchMedia("(pointer: fine)").matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pointer = {
      x: width * 0.58,
      y: height * 0.28,
      targetX: width * 0.58,
      targetY: height * 0.28,
      active: false,
    };

    const ripples: Ripple[] = [];
    const particleCount = prefersReduced ? 0 : width < 768 ? 20 : 46;
    let particles = createParticles(width, height, particleCount);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!prefersReduced) {
        const nextCount = width < 768 ? 20 : 46;
        if (particles.length !== nextCount) {
          particles = createParticles(width, height, nextCount);
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (e: PointerEvent) => {
      if (!finePointer) return;
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const addRipple = (x: number, y: number) => {
      if (prefersReduced) return;
      ripples.push({
        x,
        y,
        radius: 6,
        maxRadius: 108,
        alpha: 0.48,
      });
      if (ripples.length > 10) ripples.shift();
    };

    if (finePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }
    rippleListeners.add(addRipple);

    let rafId = 0;
    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Smooth fluid interpolation toward cursor
      pointer.x += (pointer.targetX - pointer.x) * 0.085;
      pointer.y += (pointer.targetY - pointer.y) * 0.085;

      // 1. Multi-tone radial mouse follow spotlight (cyan -> royal blue -> purple)
      if (finePointer && pointer.active && !prefersReduced) {
        const outerRadius = 460;
        const halo = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          outerRadius
        );

        if (theme === "dark") {
          halo.addColorStop(0, "rgba(34, 211, 238, 0.145)");
          halo.addColorStop(0.28, "rgba(59, 130, 246, 0.085)");
          halo.addColorStop(0.58, "rgba(139, 92, 246, 0.045)");
          halo.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          halo.addColorStop(0, "rgba(2, 132, 199, 0.095)");
          halo.addColorStop(0.32, "rgba(37, 99, 235, 0.05)");
          halo.addColorStop(0.62, "rgba(124, 58, 237, 0.025)");
          halo.addColorStop(1, "rgba(255, 255, 255, 0)");
        }

        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);

        // Tighter luminous core right around the cursor
        const core = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 120);
        if (theme === "dark") {
          core.addColorStop(0, "rgba(103, 232, 249, 0.12)");
          core.addColorStop(0.55, "rgba(168, 85, 247, 0.04)");
          core.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          core.addColorStop(0, "rgba(14, 165, 233, 0.08)");
          core.addColorStop(1, "rgba(255, 255, 255, 0)");
        }
        ctx.fillStyle = core;
        ctx.fillRect(pointer.x - 120, pointer.y - 120, 240, 240);
      }

      // 2. Subtle floating glowing dust particles reacting softly to mouse parallax
      const palette = theme === "dark" ? DARK_PARTICLE_COLORS : LIGHT_PARTICLE_COLORS;
      const parallaxX = finePointer && pointer.active ? (pointer.x / width - 0.5) * 18 : 0;
      const parallaxY = finePointer && pointer.active ? (pointer.y / height - 0.5) * 14 : 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const drawX = p.x - parallaxX * p.depth;
        const drawY = p.y - parallaxY * p.depth;
        const twinkle = 0.55 + 0.45 * Math.sin(frame * p.speed + p.phase);

        // Gently brighten particles near cursor spotlight
        let boost = 1;
        if (finePointer && pointer.active) {
          const dx = drawX - pointer.x;
          const dy = drawY - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 48400) {
            boost = 1 + (1 - Math.sqrt(distSq) / 220) * 0.9;
          }
        }

        const alpha = Math.min(0.85, p.baseAlpha * twinkle * boost * (theme === "dark" ? 1 : 0.72));
        const rgb = palette[p.colorIndex];

        // Soft glowing aura around larger motes
        if (p.size > 1.7) {
          ctx.beginPath();
          ctx.arc(drawX, drawY, p.size * 3.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${(alpha * 0.22).toFixed(3)})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // 3. Synchronized acoustic click ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += (r.maxRadius - r.radius) * 0.13 + 1.15;
        r.alpha *= 0.91;

        if (r.alpha <= 0.01 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle =
          theme === "dark"
            ? `rgba(34, 211, 238, ${r.alpha.toFixed(3)})`
            : `rgba(2, 132, 199, ${(r.alpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = 1.45;
        ctx.stroke();

        if (r.radius > 16) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.62, 0, Math.PI * 2);
          ctx.strokeStyle =
            theme === "dark"
              ? `rgba(168, 85, 247, ${(r.alpha * 0.5).toFixed(3)})`
              : `rgba(99, 102, 241, ${(r.alpha * 0.35).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      if (!prefersReduced) {
        rafId = requestAnimationFrame(draw);
      }
    };

    if (!prefersReduced) {
      rafId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      if (finePointer) {
        window.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerleave", onPointerLeave);
      }
      rippleListeners.delete(addRipple);
    };
  }, [theme]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Layer 1: Deep midnight navy / studio alabaster gradient atmosphere */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(1280px 720px at 14% -8%, rgba(14, 165, 233, 0.17), transparent 62%), radial-gradient(960px 640px at 88% 6%, rgba(99, 102, 241, 0.19), transparent 60%), radial-gradient(880px 560px at 52% 108%, rgba(139, 92, 246, 0.14), transparent 62%), linear-gradient(180deg, #030610 0%, #070d1e 50%, #040712 100%)"
              : "radial-gradient(1100px 620px at 14% -10%, rgba(14, 165, 233, 0.14), transparent 58%), radial-gradient(920px 560px at 88% 6%, rgba(99, 102, 241, 0.12), transparent 56%), radial-gradient(780px 500px at 50% 105%, rgba(139, 92, 246, 0.09), transparent 58%), linear-gradient(180deg, #f8fafd 0%, #eff4fb 55%, #eaf0f8 100%)",
        }}
      />

      {/* Layer 2: Blurred Aurora Light Wave 1 (electric cyan & royal blue ribbon) */}
      <div
        className="animate-aurora-wave-1 absolute -top-36 -left-1/4 h-[34rem] w-[135vw] rounded-[100%] blur-[110px]"
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(108deg, rgba(6, 182, 212, 0.24) 0%, rgba(59, 130, 246, 0.22) 45%, rgba(139, 92, 246, 0.16) 78%, transparent 100%)"
              : "linear-gradient(108deg, rgba(14, 165, 233, 0.16) 0%, rgba(59, 130, 246, 0.14) 48%, rgba(139, 92, 246, 0.11) 82%, transparent 100%)",
        }}
      />

      {/* Layer 3: Blurred Aurora Light Wave 2 (violet, purple & cyan counter-wave) */}
      <div
        className="animate-aurora-wave-2 absolute -right-1/4 bottom-[-14rem] h-[36rem] w-[130vw] rounded-[100%] blur-[120px]"
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(252deg, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.2) 46%, rgba(34, 211, 238, 0.17) 80%, transparent 100%)"
              : "linear-gradient(252deg, rgba(139, 92, 246, 0.14) 0%, rgba(99, 102, 241, 0.12) 48%, rgba(14, 165, 233, 0.11) 82%, transparent 100%)",
        }}
      />

      {/* Layer 4: Ambient card-back lighting pools for layered depth */}
      <div
        className="animate-ambient-slow absolute left-[18%] top-[22%] h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(circle, rgba(34, 211, 238, 0.11) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(2, 132, 199, 0.09) 0%, transparent 70%)",
        }}
      />
      <div
        className="animate-ambient-slower absolute right-[12%] top-[36%] h-[30rem] w-[30rem] rounded-full blur-3xl"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Layer 5: Architectural fine coordinate grid masked radially */}
      <div
        className="bg-architectural-grid absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 25%, black 35%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 25%, black 35%, transparent 100%)",
        }}
      />

      {/* Layer 6: Interactive cursor spotlight + floating dust particles + click acoustic ripples */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
