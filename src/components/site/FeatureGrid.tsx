import { EASE_OUT } from "@/components/site/PageTransition";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FEATURES, FEATURE_TONES, type FeatureTone } from "@/lib/features";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

/**
 * One tint per kind of reason, so a wall of a hundred squares reads as four
 * arguments rather than a hundred independent ones. The classes are written out
 * in full because Tailwind scans for literals, not for keys.
 */
const TONE_STYLE: Record<
  FeatureTone,
  { dot: string; icon: string; edge: string }
> = {
  booking: {
    dot: "bg-brand",
    icon: "text-brand",
    edge: "hover:border-brand/45",
  },
  programmes: {
    dot: "bg-warm",
    icon: "text-warm",
    edge: "hover:border-warm/50",
  },
  control: {
    dot: "bg-plum",
    icon: "text-plum",
    edge: "hover:border-plum/45",
  },
  craft: {
    dot: "bg-foreground/40",
    icon: "text-foreground/70",
    edge: "hover:border-foreground/25",
  },
};

/**
 * The wall: a hundred one-inch squares, each carrying a piece of the argument
 * for choosing this product over a plainer events site. Every square is a real
 * button, focusable and labelled, so the explanation is available to a keyboard
 * and to a screen reader and not only to a mouse.
 *
 * The squares are exactly one inch at the widest layout (96 CSS pixels) and
 * scale down on smaller screens, where an inch of text would be unreadable
 * rather than impressive.
 */
export function FeatureGrid() {
  const reduced = useReducedMotion();
  const animated = reduced !== true;

  const wall: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.008, delayChildren: 0.04 } },
  };

  const square: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.94 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.42, ease: EASE_OUT },
    },
  };

  return (
    <section
      id="reasons"
      className="relative scroll-mt-24 overflow-hidden border-t border-border"
    >
      <div
        aria-hidden="true"
        className="glow-soft pointer-events-none absolute inset-x-0 top-0 h-72"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <span className="label-eyebrow text-brand">Why Memorius</span>
          <h2 className="font-display mt-5 text-[24px] leading-[1.18] font-light tracking-[-0.016em] text-balance sm:text-[30px]">
            A hundred reasons, and a square to put each one in.
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
            Nothing below is on a roadmap: it is all in the product today. Hover
            or focus any square — one inch of it, on a wide screen — and the
            reason shows itself.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
          {FEATURE_TONES.map((tone) => (
            <span
              key={tone.id}
              className="inline-flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full", TONE_STYLE[tone.id].dot)}
              />
              {tone.name}
              <span className="tabular-nums text-muted-foreground/70">
                {FEATURES.filter((feature) => feature.tone === tone.id).length}
              </span>
            </span>
          ))}
        </div>

        <motion.ul
          variants={wall}
          initial={animated ? "hidden" : false}
          whileInView={animated ? "show" : undefined}
          viewport={{ once: true, amount: 0.03 }}
          className="mt-9 grid grid-cols-4 justify-items-center gap-1.5 sm:grid-cols-6 sm:gap-2 lg:grid-cols-8 xl:grid-cols-10"
        >
          {FEATURES.map((feature, index) => {
            const style = TONE_STYLE[feature.tone];
            const Icon = feature.icon;
            return (
              <motion.li
                key={feature.label}
                variants={animated ? square : undefined}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${feature.label}. ${feature.detail}`}
                      className={cn(
                        "group ease-soft relative flex size-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card/70 p-2 text-center transition-[transform,border-color,box-shadow] duration-300 sm:size-20 lg:size-24",
                        "hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                        style.edge,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute top-1 left-1.5 text-[9px] tabular-nums text-muted-foreground/60"
                      >
                        {index + 1}
                      </span>
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-3.5 transition-transform duration-300 group-hover:scale-110 sm:size-4",
                          style.icon,
                        )}
                      />
                      <span className="text-[9px] leading-[1.15] tracking-[-0.005em] text-foreground/85 sm:text-[10px]">
                        {feature.label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="max-w-[15rem] text-[11px] leading-5"
                  >
                    {/* The tooltip is an inverted chip, so the detail is set in
                        an inherited colour at lower emphasis rather than in
                        muted-foreground, which is tuned for the page behind it
                        and would vanish on this surface in dark mode. */}
                    <span className="block font-medium">
                      {index + 1}. {feature.label}
                    </span>
                    <span className="mt-0.5 block opacity-70">
                      {feature.detail}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </motion.li>
            );
          })}
        </motion.ul>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button
            asChild
            size="lg"
            className="sheen h-11 gap-2 rounded-full px-6 text-[14px]"
          >
            <Link to="/events">
              Browse the catalogue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-border px-6 text-[14px] shadow-none"
          >
            <Link to="/programmes">See the programmes</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
