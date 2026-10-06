import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** One curve for the whole product, so arrivals and reveals agree. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Wraps the routed page so that arriving anywhere feels like the same gesture:
 * a short fade with the content settling into place. The router keys this by
 * pathname, so the motion replays on navigation and never on a re-render.
 *
 * Kept to opacity plus a few pixels of travel: enough to read as a transition,
 * small enough that the sticky header inside it does not visibly jump. Once the
 * motion settles the transform is handed back as `none`, so the wrapper never
 * leaves a containing block behind for the sticky header.
 */
export function PageTransition({
  routeKey,
  children,
}: {
  routeKey: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={routeKey}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.44, ease: EASE_OUT }}
      transformTemplate={(_latest, generated) =>
        generated === "none" || generated === "translateY(0px)"
          ? "none"
          : generated
      }
      className="flex min-h-screen flex-col"
    >
      {children}
    </motion.div>
  );
}
