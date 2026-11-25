import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 620): number {
  const [value, setValue] = useState(target);
  const previousRef = useRef(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      previousRef.current = target;
      setValue(target);
      return;
    }

    const startValue = previousRef.current;
    const diff = target - startValue;
    if (diff === 0) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = startValue + diff * eased;
      setValue(next);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        previousRef.current = target;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}
