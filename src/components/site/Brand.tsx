import { cn } from "@/lib/utils";
import { Link } from "react-router";

/**
 * Cadence mark: three rules of falling length, like a schedule settling into
 * place. Drawn with currentColor so it stays monochrome in every context.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
        <rect
          x="0"
          y="1"
          width="12"
          height="1.6"
          rx="0.8"
          className="text-background"
        />
        <rect
          x="0"
          y="5.2"
          width="8.2"
          height="1.6"
          rx="0.8"
          className="text-background"
        />
        <rect
          x="0"
          y="9.4"
          width="4.6"
          height="1.6"
          rx="0.8"
          className="text-background"
        />
      </svg>
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
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
    >
      <BrandMark />
      {showWord && (
        <span className="text-[15px] font-medium tracking-[-0.015em]">
          Cadence
        </span>
      )}
    </Link>
  );
}
