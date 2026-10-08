import { celebrate } from "@/components/site/LiveMotion";
import {
  KEEPSAKE_GROUPS,
  KEEPSAKES,
  keepsakeById,
  useKeepsakes,
} from "@/lib/keepsakes";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The progress ring. It fills by stroke-dashoffset against a `pathLength` of
 * one, so the arc is complete and exact at every count, and it springs rather
 * than snaps — the same gesture the rest of the page uses.
 */
function ProgressRing({
  value,
  complete,
}: {
  value: number;
  complete: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <span className="relative grid size-9 shrink-0 place-items-center">
      <svg
        viewBox="0 0 36 36"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <motion.circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={complete ? "var(--warm)" : "var(--brand)"}
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          initial={false}
          animate={{ strokeDashoffset: 1 - value }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 20 }
          }
        />
      </svg>
      {complete ? (
        <Trophy
          className="relative size-3.5"
          style={{ color: "var(--warm)" }}
        />
      ) : (
        <Sparkles className="relative size-3.5 text-brand" />
      )}
    </span>
  );
}

/**
 * The keepsake tray.
 *
 * One small piece of furniture in the corner of every page, and it only
 * appears once a visitor has found something: a ring that fills as the set
 * completes, a card that names each new discovery as it lands, and a panel
 * that lists what is left to notice. It never interrupts — it waits to be
 * opened — and it remembers across visits.
 *
 * Renders nothing at all until the first keepsake is found, and nothing for
 * anyone who has asked for less motion beyond the ring's steady state.
 */
export function KeepsakeTray() {
  const { found, latest } = useKeepsakes();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<string | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const seen = useRef<string | null>(latest);

  const total = KEEPSAKES.length;
  const count = found.length;
  const complete = count === total;
  const foundSet = new Set(found);

  // A new find announces itself: one burst at the pill, and a card that names
  // it. The label comes from the catalogue, not from the caller.
  useEffect(() => {
    if (latest === null || latest === seen.current) return;
    seen.current = latest;
    const named = keepsakeById(latest);
    const rect = pillRef.current?.getBoundingClientRect();
    celebrate({
      x: rect === undefined ? 64 : rect.left + rect.width / 2,
      y: rect === undefined ? window.innerHeight - 40 : rect.top - 4,
      count: 34,
    });
    setCard(named === null ? null : named.id);
    const timer = window.setTimeout(() => setCard(null), 4200);
    return () => window.clearTimeout(timer);
  }, [latest]);

  // Escape, and a tap anywhere else, close the panel.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target === null) return;
      if (
        panelRef.current?.contains(target) === true ||
        pillRef.current?.contains(target) === true
      ) {
        return;
      }
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Nothing has been found yet: the tray is not on the page at all.
  if (count === 0) return null;

  const named = card === null ? null : keepsakeById(card);

  return (
    <div className="fixed bottom-5 left-4 z-50 flex flex-col items-start gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="keepsake-panel"
            id="keepsake-panel"
            ref={panelRef}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 340, damping: 28 }
            }
            className="max-h-[min(30rem,calc(100vh-9rem))] w-[min(22rem,calc(100vw-2rem))] origin-bottom-left overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-panel"
            role="dialog"
            aria-label="Keepsakes"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-eyebrow text-brand">Keepsakes</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  <span className="tabular-nums text-foreground">
                    {count} of {total}
                  </span>{" "}
                  found — the small things this site hides.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close the keepsake panel"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {KEEPSAKE_GROUPS.map((group) => {
                const items = KEEPSAKES.filter(
                  (keepsake) => keepsake.group === group.id,
                );
                const foundHere = items.filter((item) =>
                  foundSet.has(item.id),
                ).length;
                return (
                  <section key={group.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="label-eyebrow text-muted-foreground">
                        {group.title}
                      </h3>
                      <span className="text-[10.5px] tabular-nums text-muted-foreground">
                        {foundHere} / {items.length}
                      </span>
                    </div>
                    {/* The rail is visible on the home page, so its names are
                        not a secret; everything else keeps its name until it
                        is found, and shows only where to look. */}
                    <ul className="mt-2.5 space-y-2">
                      {items.map((item) => {
                        const isFound = foundSet.has(item.id);
                        const showHint = group.id !== "rail";
                        return (
                          <li
                            key={item.id}
                            className={cn(
                              "flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
                              isFound
                                ? "border-brand-line/60 bg-brand-soft/25"
                                : "border-dashed border-border",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                                isFound
                                  ? "bg-brand text-background"
                                  : "border border-border",
                              )}
                            >
                              {isFound && <Check className="size-2.5" />}
                              {!isFound && (
                                <span className="size-1 rounded-full bg-muted-foreground/50" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block text-[12.5px] leading-5",
                                  isFound
                                    ? "font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                {isFound || group.id === "rail"
                                  ? item.label
                                  : "Still hidden"}
                              </span>
                              {showHint && !isFound && (
                                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                                  {item.hint}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>

            <p className="mt-5 border-t border-border pt-3 text-[11.5px] leading-5 text-muted-foreground">
              {complete
                ? "Every one of them. Nothing else is hidden — the rest of the site is just the site."
                : "Nothing here is bought or unlocked. They are kept in this browser, and nobody else can see them."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {named !== null && !open && (
          <motion.div
            key={named.id}
            role="status"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 380, damping: 26 }
            }
            className="w-[min(19rem,calc(100vw-2rem))] origin-bottom-left rounded-xl border border-brand-line bg-card p-3 shadow-lift"
          >
            <p className="label-eyebrow text-brand">New keepsake</p>
            <p className="mt-1 text-[13px] font-medium tracking-[-0.012em]">
              {named.label}
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {count} of {total} found
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={pillRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="keepsake-panel"
        aria-label={`${count} of ${total} keepsakes found. ${
          open ? "Hide" : "Show"
        } the collection.`}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
        animate={
          card !== null && !reduced
            ? { opacity: 1, scale: [1, 1.05, 1] }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.6, ease: EASE }}
        whileHover={reduced ? undefined : { y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        className={cn(
          "flex items-center gap-2.5 rounded-full border bg-card/95 py-2 pl-2 pr-4 text-left shadow-lift backdrop-blur transition-colors",
          complete ? "border-warm/50" : "border-border hover:border-brand",
        )}
      >
        <ProgressRing value={count / total} complete={complete} />
        <span className="flex flex-col">
          <span className="text-[12.5px] leading-4 font-medium tracking-[-0.012em]">
            Keepsakes
          </span>
          <span className="text-[11px] leading-4 tabular-nums text-muted-foreground">
            {count} of {total}
          </span>
        </span>
      </motion.button>
    </div>
  );
}
