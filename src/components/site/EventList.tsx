import { Skeleton } from "@/components/ui/skeleton";
import {
  dayParts,
  formatTimeRange,
  groupByDay,
  relativeDay,
  seatSummary,
  seatTone,
} from "@/lib/format";
import type { EventListItem, EventView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

/** The one dot of colour in the whole interface. */
export function StatusDot({
  state,
  className,
}: {
  state: EventView["state"];
  className?: string;
}) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", seatTone[state], className)}
      aria-hidden="true"
    />
  );
}

export function EventRow({
  event,
  festName,
  showFest = true,
}: {
  event: EventListItem | EventView;
  festName?: string;
  showFest?: boolean;
}) {
  const parts = dayParts(event.startTime);
  const fest = festName ?? ("festName" in event ? event.festName : undefined);

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-border py-5 pr-1 pl-1 transition-colors hover:bg-accent/50 sm:gap-7 sm:py-6"
    >
      <div className="flex w-14 flex-col items-center justify-center rounded-md border border-border bg-card py-2.5 sm:w-16 sm:py-3">
        <span className="text-[10px] leading-none font-medium tracking-[0.14em] text-muted-foreground tabular-nums">
          {parts.month}
        </span>
        <span className="font-display mt-1 text-[26px] leading-none tabular-nums sm:text-[28px]">
          {parts.day}
        </span>
        <span className="mt-1 text-[10px] leading-none tracking-[0.1em] text-muted-foreground">
          {parts.weekday}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <h3 className="truncate text-[15px] font-medium tracking-[-0.012em]">
            {event.title}
          </h3>
          <span className="hidden shrink-0 text-[11px] tracking-[0.1em] text-muted-foreground uppercase sm:inline">
            {event.category}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[13px] text-muted-foreground">
          <span className="tabular-nums">
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
          <span className="px-1.5 text-border">·</span>
          {event.venue}
          {showFest && fest !== undefined && (
            <>
              <span className="px-1.5 text-border">·</span>
              {fest}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden text-right md:block">
          <div className="flex items-center justify-end gap-2">
            <StatusDot state={event.state} />
            <span className="text-[12px] text-muted-foreground">
              {seatSummary(event)}
            </span>
          </div>
          <div className="mt-1 text-[11px] tracking-[0.08em] text-muted-foreground/70 uppercase">
            {relativeDay(event.startTime)}
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/** Chronological list with quiet day headings. */
export function EventList({
  items,
  showFest = true,
  grouped = true,
}: {
  items: (EventListItem | EventView)[];
  showFest?: boolean;
  grouped?: boolean;
}) {
  if (!grouped) {
    return (
      <div className="border-t border-border">
        {items.map((event) => (
          <EventRow key={event._id} event={event} showFest={showFest} />
        ))}
      </div>
    );
  }

  const groups = groupByDay(items);

  return (
    <div>
      {groups.map((group, index) => (
        <section key={group.key} className={index === 0 ? "" : "mt-10"}>
          <div className="flex items-center gap-4">
            <p className="label-eyebrow shrink-0">{group.label}</p>
            <span className="h-px flex-1 bg-border" />
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {relativeDay(group.items[0].startTime)}
            </span>
          </div>
          <div className="mt-4 border-t border-border">
            {group.items.map((event) => (
              <EventRow key={event._id} event={event} showFest={showFest} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function EventListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border-t border-border">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-border py-6"
        >
          <Skeleton className="h-20 w-16 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
