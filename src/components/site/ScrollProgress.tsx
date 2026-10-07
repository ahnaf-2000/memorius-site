import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * A hairline that measures how far down the page you are. Two pixels of brand
 * colour at the very top of the viewport: it answers "how much is left?" without
 * taking a single pixel away from the content, and it is the one piece of chrome
 * that is always telling the truth about position.
 *
 * It sits above the sticky header (z-40) and below the opening sequence
 * (z-100), and it holds still for anyone who has asked for less motion.
 */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 40,
    mass: 0.3,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: reduced ? scrollYProgress : smoothed }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-brand via-warm to-plum"
    />
  );
}
