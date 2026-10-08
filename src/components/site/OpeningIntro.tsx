import { useCountUp } from "@/hooks/use-count-up";
import {
  INTRO_PART_MS,
  INTRO_TOTAL_MS,
  introPlays,
  rememberIntro,
} from "@/lib/intro";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const RISE = [0.22, 1, 0.36, 1] as const;
const PART_AT = INTRO_PART_MS / 1000;
const LETTERS = "MEMORIUS".split("");
const STAGES = ["Programme", "Event", "Booking"];

/** One drawn rule of the mark: it grows from its left edge into place. */
function Rule({
  y,
  width,
  fill,
  delay,
}: {
  y: number;
  width: number;
  fill: string;
  delay: number;
}) {
  return (
    <motion.rect
      x={26}
      y={y}
      height={6}
      rx={3}
      fill={fill}
      initial={{ width: 0 }}
      animate={{ width }}
      transition={{ duration: 0.62, delay, ease: RISE }}
    />
  );
}

/**
 * The opening sequence.
 *
 * Two opaque halves hold the site while a large Memorius mark draws itself a
 * rule at a time — the register settling, which is what the mark means — the
 * name rises letter by letter out of a blur, and a hairline counts the sequence
 * in. Then the seam between the halves opens and the site is simply there,
 * already composed underneath.
 *
 * It plays once per session, is skipped entirely for anyone who has asked for
 * less motion, and any click or key ends it immediately. `?intro=1` replays it.
 */
export function OpeningIntro() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(introPlays);
  const [parting, setParting] = useState(false);
  const close = useCallback(() => {
    setParting(true);
    window.setTimeout(() => setOpen(false), 620);
  }, []);

  const percent = useCountUp(open ? 100 : undefined, 1700);

  useEffect(() => {
    if (!open) return;
    rememberIntro();
    document.body.style.overflow = "hidden";
    const partTimer = window.setTimeout(() => setParting(true), INTRO_PART_MS);
    const endTimer = window.setTimeout(() => setOpen(false), INTRO_TOTAL_MS);
    const onKey = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onKey);
    return () => {
      window.clearTimeout(partTimer);
      window.clearTimeout(endTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open || reduced === true) return null;

  const eased = parting;

  return (
    <div role="presentation" className="fixed inset-0 z-[100] select-none">
      {/* The two halves, and the seam they open along. */}
      {(["top", "bottom"] as const).map((half) => (
        <motion.div
          key={half}
          initial={{ y: 0 }}
          animate={{ y: eased ? (half === "top" ? "-100%" : "100%") : 0 }}
          transition={{ duration: 1, ease: EASE }}
          className={
            half === "top"
              ? "absolute inset-x-0 top-0 h-1/2 overflow-hidden border-b border-border/50 bg-background"
              : "absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-background"
          }
        >
          <div
            aria-hidden="true"
            className={
              half === "top"
                ? "glow-soft absolute inset-0"
                : "glow-soft absolute inset-0 rotate-180 opacity-70"
            }
          />
          <div
            aria-hidden="true"
            className="grid-veil absolute inset-0 opacity-70"
          />
        </motion.div>
      ))}

      <motion.div
        aria-hidden="true"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: eased ? 0 : 1 }}
        transition={{
          duration: eased ? 0.4 : 1.15,
          delay: eased ? 0 : 0.05,
          ease: EASE,
        }}
        className="absolute top-1/2 left-1/2 h-px w-[min(78vw,46rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-brand to-transparent"
      />

      {/* The content, held between the two halves and centred on the seam. */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: eased ? 0 : 1, scale: eased ? 1.04 : 1 }}
        transition={{ duration: 0.5, ease: RISE }}
        className="relative grid h-full place-items-center px-6"
      >
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
            className="relative mx-auto w-fit"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 animate-halo rounded-[24px] bg-brand/25"
            />
            <svg
              viewBox="0 0 96 96"
              className="size-[62px] overflow-visible drop-shadow-[0_10px_30px_rgba(20,45,58,0.28)] sm:size-[76px]"
              role="img"
              aria-label="Memorius"
            >
              <defs>
                <linearGradient id="intro-mark" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#316274" />
                  <stop offset="0.55" stopColor="#24505F" />
                  <stop offset="1" stopColor="#1B3B49" />
                </linearGradient>
              </defs>
              <rect width="96" height="96" rx="22" fill="url(#intro-mark)" />
              <Rule y={28} width={44} fill="#FFFFFF" delay={0.24} />
              <Rule y={45} width={30} fill="#FFFFFF" delay={0.36} />
              <motion.rect
                x={26}
                y={62}
                height={6}
                rx={3}
                fill="#F0B67F"
                initial={{ width: 0, opacity: 0.4 }}
                animate={{ width: 16, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5, ease: RISE }}
              />
            </svg>
          </motion.div>

          <h1 className="mt-8 flex flex-wrap justify-center">
            {LETTERS.map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.85,
                  delay: 0.44 + index * 0.055,
                  ease: EASE,
                }}
                className="font-display text-[24px] tracking-[0.16em] sm:text-[36px]"
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.05, ease: EASE }}
            className="mt-4 text-[11px] tracking-[0.3em] text-muted-foreground uppercase"
          >
            Events, considered end to end
          </motion.p>

          <div className="mt-9 flex items-center justify-center gap-4">
            {STAGES.map((stage, index) => (
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 1.15 + index * 0.09,
                  ease: EASE,
                }}
                className="flex items-center gap-4 text-[10px] tracking-[0.18em] text-muted-foreground uppercase"
              >
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full bg-border"
                  />
                )}
                {stage}
              </motion.span>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.3 }}
            className="mx-auto mt-10 flex w-56 items-center gap-3 sm:w-72"
          >
            <div className="h-px flex-1 bg-border">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: PART_AT - 0.3, ease: "linear" }}
                className="h-px origin-left bg-brand"
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {String(percent).padStart(3, "0")}
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: eased ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        onClick={close}
        className="absolute right-5 bottom-5 flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-[10px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-foreground/25 hover:text-foreground sm:right-7 sm:bottom-7"
      >
        Skip
        <span aria-hidden="true" className="text-[9px] opacity-60">
          any key
        </span>
      </motion.button>
    </div>
  );
}
