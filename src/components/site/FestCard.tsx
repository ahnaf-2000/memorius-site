import { formatDateRange } from "@/lib/format";
import type { FestListItem, FestPhase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

const PHASE: Record<FestPhase, { label: string; dot: string }> = {
  upcoming: { label: "Upcoming", dot: "bg-stone-300" },
  live: { label: "Happening now", dot: "bg-emerald-600" },
  past: { label: "Archive", dot: "bg-stone-300" },
};

export function FestPhaseTag({ phase }: { phase: FestPhase }) {
  const config = PHASE[phase];
  return (
    <span className="flex items-center gap-2 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function FestCard({ fest }: { fest: FestListItem }) {
  const claimed =
    fest.capacity === 0 ? 0 : Math.round((fest.seatsTaken / fest.capacity) * 100);

  return (
    <Link
      to={`/fests/${fest.slug}`}
      className="group flex h-full flex-col justify-between rounded-lg border border-border bg-card p-7 transition-colors hover:border-foreground/20"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <p className="label-eyebrow">{fest.organization}</p>
          <FestPhaseTag phase={fest.phase} />
        </div>
        <h3 className="mt-6 text-[19px] leading-[1.3] font-medium tracking-[-0.02em] text-balance">
          {fest.name}
        </h3>
        {fest.summary !== null && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-muted-foreground">
            {fest.summary}
          </p>
        )}
      </div>

      <div className="mt-9">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span className="tabular-nums">
            {formatDateRange(fest.startDate, fest.endDate)}
          </span>
          <span className="tabular-nums">
            {fest.eventCount} {fest.eventCount === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="mt-4 h-px w-full overflow-hidden bg-border">
          <div
            className="h-px bg-foreground/40 transition-all duration-500"
            style={{ width: `${claimed}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
          <span className="tabular-nums">{claimed}% of seats claimed</span>
          <span className="flex items-center gap-1.5 text-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
            View lineup
            <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
