import { useEffect, useState } from "react";

type Parts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Milliseconds left, floored at zero. */
  remaining: number;
  ended: boolean;
};

function split(remaining: number): Parts {
  const seconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    remaining,
    ended: remaining <= 0,
  };
}

/**
 * Counts down to a moment, once a second and only while it matters. Used for
 * promotions, where "ends in 6 days" becomes "ends in 04:12:39" as the deadline
 * comes into view — the same information, made urgent at the right time.
 */
export function useCountdown(target: number | undefined, enabled = true): Parts | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || target === undefined) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled, target]);

  if (target === undefined) return null;
  return split(Math.max(0, target - now));
}
