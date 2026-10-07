import { EASE_OUT } from "@/components/site/PageTransition";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The reveal used below the fold: content rises a few pixels and settles as it
 * enters the viewport, once. Kept deliberately small — the page should read as
 * composed, not as assembling itself — and disabled for anyone who has asked
 * for less motion.
 *
 * Only ever used on content that starts off-screen, so nothing can be left
 * invisible while an observer reports in.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -40px 0px" }}
      transition={{ duration: reduced ? 0.2 : 0.7, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
