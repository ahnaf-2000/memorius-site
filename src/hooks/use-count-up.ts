import { useEffect, useRef, useState } from "react";

/**
 * Counts from zero to the target once the number is known, so a stat block
 * arrives rather than simply appearing. Deliberately short — the figure has to
 * be readable almost immediately — and it holds still for anyone who has asked
 * for less motion.
 */
export function useCountUp(target: number | undefined, duration = 850) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target === undefined) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const span = reduced ? 0 : duration;
    const start = performance.now();

    const step = (now: number) => {
      const progress = span === 0 ? 1 : Math.min(1, (now - start) / span);
      // Ease out cubic: quick to arrive, gentle to settle.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}
