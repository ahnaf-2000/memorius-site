import { cn } from "@/lib/utils";
import { Link } from "react-router";

/**
 * The Memorius mark: three rules of falling length, like a register settling
 * line by line, with the last rule in warm accent — the line that closes an
 * entry. Drawn in SVG so it stays sharp at every size, and the rules ease into
 * their resting offsets when the lockup is hovered.
 */
export function BrandMark({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span
      className={cn(
        "group/mark relative inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-[7px]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 96 96" className="size-full">
        <defs>
          <linearGradient
            id="memorius-mark"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stopColor="#316274" />
            <stop offset="0.55" stopColor="#24505F" />
            <stop offset="1" stopColor="#1B3B49" />
          </linearGradient>
        </defs>
        <rect width="96" height="96" rx="22" fill="url(#memorius-mark)" />
        <g
          fill="#FFFFFF"
          fillOpacity="0.96"
          className={cn(
            "origin-left",
            animated &&
              "transition-transform duration-500 ease-soft group-hover/mark:scale-x-[1.06]",
          )}
        >
          <rect x="26" y="28" width="44" height="6" rx="3" />
          <rect x="26" y="45" width="30" height="6" rx="3" />
        </g>
        <rect
          x="26"
          y="62"
          width="16"
          height="6"
          rx="3"
          fill="#F0B67F"
          className={cn(
            animated &&
              "transition-transform duration-500 ease-soft group-hover/mark:translate-x-[4px]",
          )}
        />
      </svg>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent",
          animated &&
            "group-hover/mark:translate-x-full group-hover/mark:transition-transform group-hover/mark:duration-700",
        )}
      />
    </span>
  );
}

export function Brand({
  to = "/",
  className,
  showWord = true,
}: {
  to?: string;
  className?: string;
  showWord?: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label="Memorius — home"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
    >
      <BrandMark />
      {showWord && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-medium tracking-[-0.015em]">
            Memorius
          </span>
          <span className="label-eyebrow hidden text-[9px] text-muted-foreground sm:inline">
            Events
          </span>
        </span>
      )}
    </Link>
  );
}
