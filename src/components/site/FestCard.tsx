import { formatDateRange } from "@/lib/format";
import type { ProgrammeListItem, ProgrammePhase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

const PHASE: Record<ProgrammePhase, { label: string; dot: string }> = {
  upcoming: { label: "Upcoming", dot: "bg-stone-300" },
  live: { label: "Running now", dot: "bg-emerald-600" },
  past: { label: "Archive", dot: "bg-stone-300" },
};

export function ProgrammePhaseTag({ phase }: { phase: ProgrammePhase }) {
  const config = PHASE[phase];
  return (
    <span className="flex items-center gap-2 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
      <span
        className={cn("size-1.5 rounded-full", config.dot)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

export function ProgrammeCard({ programme }: { programme: ProgrammeListItem }) {
  const claimed =
    programme.capacity === 0
      ? 0
      : Math.round((programme.seatsTaken / programme.capacity) * 100);

  return (
    <Link
      to={`/programmes/${programme.slug}`}
      className="group surface-card flex h-full flex-col justify-between rounded-lg border border-border bg-card p-7 shadow-hairline hover:border-foreground/15"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <p className="label-eyebrow">{programme.organization}</p>
          <ProgrammePhaseTag phase={programme.phase} />
        </div>
        <h3 className="mt-6 text-[19px] leading-[1.3] font-medium tracking-[-0.02em] text-balance">
          {programme.name}
        </h3>
        {programme.summary !== null && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-muted-foreground">
            {programme.summary}
          </p>
        )}
      </div>

      <div className="mt-9">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span className="tabular-nums">
            {formatDateRange(programme.startDate, programme.endDate)}
          </span>
          <span className="tabular-nums">
            {programme.eventCount}{" "}
            {programme.eventCount === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="mt-4 h-px w-full overflow-hidden bg-border">
          <div
            className="h-px bg-foreground/40 transition-[width] duration-700 ease-quint"
            style={{ width: `${claimed}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
          <span className="tabular-nums">{claimed}% of places booked</span>
          <span className="flex -translate-x-1 items-center gap-1.5 text-foreground/70 opacity-0 transition-[opacity,transform] duration-300 ease-soft group-hover:translate-x-0 group-hover:opacity-100">
            View programme
            <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
