import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const SEEN_KEY = "memorius.intro.v1";
/** Long enough to read the name and the promise, short enough to forgive. */
const HOLD_MS = 2500;
const PART_AT = 1.5;

const WORDS = "MEMORIUS".split("");

function shouldPlay() {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(SEEN_KEY) === "seen") return false;
  } catch {
    return false;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The opening sequence. Two opaque halves sit over the page while the name
 * assembles letter by letter, then part vertically and leave the site exactly
 * where it would have been. It plays once per session, never for anyone who has
 * asked for less motion, and any click or key press ends it immediately.
 */
export function OpeningIntro() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(shouldPlay);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    try {
      window.sessionStorage.setItem(SEEN_KEY, "seen");
    } catch {
      // Private mode: the intro simply plays again next time.
    }
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(close, HOLD_MS);
    const onKey = () => close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open || reduced === true) return null;

  return (
    <div
      role="presentation"
      onClick={close}
      className="fixed inset-0 z-[100] cursor-pointer select-none"
    >
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.9, delay: PART_AT, ease: EASE }}
        className="absolute inset-x-0 top-0 h-1/2 overflow-hidden border-b border-border/60 bg-background"
      >
        <div className="glow-soft absolute inset-0" aria-hidden="true" />
      </motion.div>

      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "100%" }}
        transition={{ duration: 0.9, delay: PART_AT, ease: EASE }}
        className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-background"
      >
        <div
          className="glow-soft absolute inset-0 rotate-180 opacity-70"
          aria-hidden="true"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, delay: PART_AT - 0.15 }}
        className="relative grid h-full place-items-center px-6"
      >
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="label-eyebrow"
          >
            Business events, end to end
          </motion.p>

          <h1 className="mt-6 flex flex-wrap justify-center">
            {WORDS.map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.24 + index * 0.042,
                  ease: EASE,
                }}
                className="font-display text-[38px] tracking-[0.14em] sm:text-[62px]"
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, delay: 0.62, ease: EASE }}
            className="mx-auto mt-7 h-px w-40 origin-left bg-brand sm:w-72"
            aria-hidden="true"
          />

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0, ease: EASE }}
            className="mx-auto mt-7 max-w-md text-[13px] leading-6 text-muted-foreground"
          >
            Programmes, places, merchandise, snacks and sponsorship — one
            calendar, one ledger.
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: PART_AT, ease: "linear" }}
        className="absolute bottom-0 left-0 h-px bg-brand/70"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={close}
        className="absolute top-6 right-6 text-[10px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Skip
      </button>
    </div>
  );
}
