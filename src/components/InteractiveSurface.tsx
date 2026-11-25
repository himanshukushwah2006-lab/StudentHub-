import { useEffect, useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

function canUseFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return fine && !reduced;
}

export function SpotlightCard({
  children,
  className = "",
  style,
  tilt = true,
  maxTilt = 4,
  as = "div",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tilt?: boolean;
  maxTilt?: number;
  as?: "div" | "section" | "button";
  onClick?: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || !canUseFinePointer()) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      el.style.setProperty("--mx", `${x.toFixed(1)}px`);
      el.style.setProperty("--my", `${y.toFixed(1)}px`);
      el.style.setProperty("--spotlight-opacity", "1");

      if (tilt && rect.width > 0 && rect.height > 0) {
        const px = x / rect.width - 0.5;
        const py = y / rect.height - 0.5;
        const rotateY = (px * maxTilt * 2).toFixed(2);
        const rotateX = (-py * maxTilt * 2).toFixed(2);
        el.style.transform = `perspective(960px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
      } else {
        el.style.transform = "translateY(-2px)";
      }
    });
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    el.style.setProperty("--spotlight-opacity", "0");
    el.style.transform = "";
  };

  const mergedClass = `glass-panel spotlight-card ${className}`;

  if (as === "button") {
    return (
      <button
        ref={(node) => {
          ref.current = node;
        }}
        type="button"
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={style}
        className={mergedClass}
      >
        {children}
      </button>
    );
  }

  if (as === "section") {
    return (
      <section
        ref={(node) => {
          ref.current = node;
        }}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={style}
        className={mergedClass}
      >
        {children}
      </section>
    );
  }

  return (
    <div
      ref={(node) => {
        ref.current = node;
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={mergedClass}
    >
      {children}
    </div>
  );
}

export function MagneticButton({
  children,
  className = "",
  strength = 0.22,
  maxOffset = 6,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  strength?: number;
  maxOffset?: number;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onMouseMove?.(e);
    const el = ref.current;
    if (!el || !canUseFinePointer() || props.disabled) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const dx = (clientX - (rect.left + rect.width / 2)) * strength;
      const dy = (clientY - (rect.top + rect.height / 2)) * strength;
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, dx));
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, dy));
      el.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0)`;
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onMouseLeave?.(e);
    const el = ref.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    el.style.transform = "";
  };

  return (
    <button
      ref={ref}
      {...props}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </button>
  );
}
