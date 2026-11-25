import type { CSSProperties } from "react";
import { useTheme } from "@/src/lib/settings";

interface FloatingParticleSpec {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  opacity: number;
  tone: "cyan" | "blue" | "violet";
}

const FLOATING_PARTICLES: FloatingParticleSpec[] = [
  { id: 1, left: "8%", top: "24%", size: 3, duration: 13, delay: -2, driftX: 18, opacity: 0.55, tone: "cyan" },
  { id: 2, left: "16%", top: "68%", size: 2.5, duration: 16, delay: -7, driftX: -14, opacity: 0.45, tone: "blue" },
  { id: 3, left: "23%", top: "42%", size: 3.5, duration: 18, delay: -4, driftX: 20, opacity: 0.5, tone: "violet" },
  { id: 4, left: "31%", top: "82%", size: 2.5, duration: 14, delay: -10, driftX: -18, opacity: 0.48, tone: "cyan" },
  { id: 5, left: "38%", top: "19%", size: 3, duration: 17, delay: -5, driftX: 12, opacity: 0.52, tone: "blue" },
  { id: 6, left: "45%", top: "58%", size: 2, duration: 15, delay: -11, driftX: -16, opacity: 0.42, tone: "violet" },
  { id: 7, left: "52%", top: "30%", size: 3.5, duration: 19, delay: -3, driftX: 22, opacity: 0.55, tone: "cyan" },
  { id: 8, left: "59%", top: "76%", size: 2.5, duration: 13, delay: -8, driftX: -12, opacity: 0.46, tone: "blue" },
  { id: 9, left: "66%", top: "48%", size: 3, duration: 16, delay: -1, driftX: 16, opacity: 0.5, tone: "violet" },
  { id: 10, left: "73%", top: "22%", size: 2.5, duration: 15, delay: -9, driftX: -20, opacity: 0.52, tone: "cyan" },
  { id: 11, left: "80%", top: "64%", size: 4, duration: 20, delay: -6, driftX: 14, opacity: 0.48, tone: "violet" },
  { id: 12, left: "87%", top: "36%", size: 2.5, duration: 14, delay: -12, driftX: -15, opacity: 0.54, tone: "blue" },
  { id: 13, left: "93%", top: "78%", size: 3, duration: 17, delay: -4, driftX: -18, opacity: 0.45, tone: "cyan" },
  { id: 14, left: "12%", top: "86%", size: 3.5, duration: 18, delay: -13, driftX: 16, opacity: 0.44, tone: "violet" },
  { id: 15, left: "48%", top: "90%", size: 2.5, duration: 15, delay: -6, driftX: 12, opacity: 0.48, tone: "cyan" },
  { id: 16, left: "76%", top: "88%", size: 3, duration: 19, delay: -2, driftX: -14, opacity: 0.46, tone: "blue" },
];

export function AtmosphereManager() {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const toneColors = isDark
    ? {
        cyan: "rgba(34, 211, 238, 0.9)",
        blue: "rgba(96, 165, 250, 0.9)",
        violet: "rgba(192, 132, 252, 0.9)",
      }
    : {
        cyan: "rgba(2, 132, 199, 0.65)",
        blue: "rgba(37, 99, 235, 0.6)",
        violet: "rgba(124, 58, 237, 0.55)",
      };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Dynamic CSS-Animated Background Gradient Blobs */}
      <div
        className="animate-blob-float-1 absolute -top-24 left-[8%] h-[28rem] w-[28rem] rounded-full blur-[96px] sm:h-[34rem] sm:w-[34rem]"
        style={{
          background: isDark
            ? "radial-gradient(circle at 40% 40%, rgba(34, 211, 238, 0.22) 0%, rgba(59, 130, 246, 0.14) 48%, transparent 74%)"
            : "radial-gradient(circle at 40% 40%, rgba(14, 165, 233, 0.14) 0%, rgba(59, 130, 246, 0.08) 50%, transparent 74%)",
        }}
      />

      <div
        className="animate-blob-float-2 absolute top-[28%] -right-24 h-[30rem] w-[30rem] rounded-full blur-[104px] sm:h-[38rem] sm:w-[38rem]"
        style={{
          background: isDark
            ? "radial-gradient(circle at 55% 45%, rgba(139, 92, 246, 0.22) 0%, rgba(168, 85, 247, 0.14) 45%, transparent 74%)"
            : "radial-gradient(circle at 55% 45%, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 48%, transparent 74%)",
        }}
      />

      <div
        className="animate-blob-float-3 absolute -bottom-28 left-[36%] h-[26rem] w-[32rem] rounded-full blur-[100px]"
        style={{
          background: isDark
            ? "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.18) 0%, rgba(34, 211, 238, 0.12) 45%, transparent 72%)"
            : "radial-gradient(circle at 50% 50%, rgba(2, 132, 199, 0.11) 0%, rgba(99, 102, 241, 0.07) 48%, transparent 72%)",
        }}
      />

      {/* Subtle Floating CSS Particles */}
      {FLOATING_PARTICLES.map((p) => {
        const color = toneColors[p.tone];
        const particleStyle = {
          left: p.left,
          top: p.top,
          width: `${p.size}px`,
          height: `${p.size}px`,
          backgroundColor: color,
          boxShadow: isDark ? `0 0 ${p.size * 3.5}px ${color}` : `0 0 ${p.size * 2.5}px ${color}`,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
          "--p-drift-x": `${p.driftX}px`,
          "--p-opacity": String(isDark ? p.opacity : p.opacity * 0.65),
        } as CSSProperties;

        return (
          <span
            key={p.id}
            style={particleStyle}
            className="animate-particle-drift absolute rounded-full"
          />
        );
      })}
    </div>
  );
}
