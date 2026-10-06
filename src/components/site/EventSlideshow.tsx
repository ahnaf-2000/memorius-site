import { StatusDot } from "@/components/site/EventList";
import { Button } from "@/components/ui/button";
import {
  dayParts,
  formatTimeRange,
  priceLabel,
  relativeDay,
  seatSummary,
} from "@/lib/format";
import type { EventListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link } from "react-router";

/** Long enough to read a title, a venue and a price without feeling rushed. */
const AUTOPLAY_MS = 7000;
const EASE = [0.16, 1, 0.3, 1] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** One slide: the whole event, set as type rather than as a photograph. */
function Slide({ event }: { event: EventListItem }) {
  const parts = dayParts(event.startTime);

  return (
    <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-12">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
          <span className="text-foreground/75">
            {relativeDay(event.startTime)}
          </span>
          <span aria-hidden="true" className="text-border">
            /
          </span>
          <span>{event.category}</span>
          <span aria-hidden="true" className="text-border">
            /
          </span>
          <span className="capitalize">{event.format}</span>
        </div>

        <h3 className="font-display mt-5 text-[30px] leading-[1.08] tracking-[-0.025em] text-balance sm:text-[36px]">
          {event.title}
        </h3>

        <p className="mt-4 max-w-lg text-[13.5px] leading-6 text-muted-foreground">
          {event.summary ??
            event.description ??
            `${event.festName} at ${event.venue}.`}
        </p>

        <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6 text-[13px] sm:grid-cols-3">
          {[
            ["Time", formatTimeRange(event.startTime, event.endTime)],
            ["Venue", event.venue],
            ["Programme", event.festName],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1.5 truncate tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Button asChild size="sm" className="h-9 gap-1.5 rounded-full px-4">
            <Link to={`/events/${event.slug}`}>
              {event.state === "full" ? "Join the waiting list" : "Reserve a place"}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <span className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
            <StatusDot state={event.state} />
            {seatSummary(event)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-7 sm:w-44 sm:flex-col sm:items-stretch sm:gap-0">
        <div className="flex w-[5.5rem] shrink-0 flex-col items-center rounded-md border border-border bg-background px-4 py-4 sm:w-auto sm:py-6">
          <span className="text-[10px] leading-none tracking-[0.2em] text-muted-foreground uppercase">
            {parts.weekday}
          </span>
          <span className="font-display mt-2 text-[38px] leading-none tabular-nums sm:text-[46px]">
            {parts.day}
          </span>
          <span className="mt-2 text-[10px] leading-none tracking-[0.18em] text-muted-foreground uppercase">
            {parts.month} {parts.year}
          </span>
        </div>

        <div className="min-w-0 sm:mt-6">
          <p className="label-eyebrow">Price per place</p>
          <p className="font-display mt-2 text-[22px] leading-none tabular-nums">
            {priceLabel(event.price)}
          </p>
          <p className="mt-3 text-[12px] leading-5 text-muted-foreground tabular-nums">
            {event.remaining} of {event.capacity} places still open
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Rotates through every event that is currently open for booking, so a visitor
 * can see the whole calendar without setting a single filter. Advance is held
 * whenever the pointer or focus is inside the card, and stops entirely for
 * anyone who has asked for less motion — the arrows and the rail still work.
 */
export function EventSlideshow({ events }: { events: EventListItem[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = events.length;
  const current = count === 0 ? 0 : index % count;
  const active = events[current];
  const rotating = !reduced && !paused && count > 1;

  const step = useCallback(
    (delta: number) => {
      setIndex((position) => {
        if (count === 0) return 0;
        return (((position + delta) % count) + count) % count;
      });
    },
    [count],
  );

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => {
      setIndex((position) => (position + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, count, index]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  }

  if (active === undefined) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-14 text-center">
        <p className="text-[14px] text-muted-foreground">
          Nothing is on sale this minute. The next programme appears here the
          moment it is published.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-6 h-9 rounded-full border-border px-4 text-[13px] shadow-none"
        >
          <Link to="/programmes">Browse programmes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      {/* Stage */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Events open for booking"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onKeyDown={onKeyDown}
        className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-hairline"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span
              className="relative inline-flex size-1.5 shrink-0"
              aria-hidden="true"
            >
              {rotating && (
                <span className="animate-halo absolute inset-0 rounded-full bg-brand" />
              )}
              <span className="size-1.5 rounded-full bg-brand" />
            </span>
            <p className="label-eyebrow">
              {rotating ? "Rotating" : "Paused"} · {count}{" "}
              {count === 1 ? "event" : "events"}
            </p>
          </div>
          <span className="font-display text-[13px] text-muted-foreground tabular-nums">
            {pad(current + 1)} / {pad(count)}
          </span>
        </div>

        <div className="min-h-[380px] flex-1 px-6 py-8 sm:min-h-[340px] sm:px-8 sm:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active._id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8, transition: { duration: 0.22, ease: EASE } }
              }
              transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
            >
              <Slide event={active} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-6 border-t border-border px-6 py-4 sm:px-8">
          <div className="flex items-center gap-1.5">
            {events.map((event, position) => (
              <button
                key={event._id}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Show ${event.title}`}
                aria-current={position === current ? "true" : undefined}
                className={cn(
                  "h-[3px] rounded-full transition-[width,background-color] duration-500 ease-quint",
                  position === current
                    ? "w-7 bg-foreground"
                    : "w-3 bg-border hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => step(-1)}
              aria-label="Previous event"
              className="rounded-full border-border shadow-none"
            >
              <ArrowLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => step(1)}
              aria-label="Next event"
              className="rounded-full border-border shadow-none"
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Time until the next slide, drawn along the bottom edge. */}
        {rotating && (
          <motion.span
            key={current}
            aria-hidden="true"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
            className="absolute bottom-0 left-0 h-px bg-brand"
          />
        )}
      </div>

      {/* Index: every event in the rotation, visible at once. */}
      <aside className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="label-eyebrow">Open for booking</p>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {count} {count === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="max-h-[26rem] overflow-y-auto">
          {events.map((event, position) => (
            <button
              key={event._id}
              type="button"
              onClick={() => setIndex(position)}
              aria-current={position === current ? "true" : undefined}
              className={cn(
                "relative flex w-full items-baseline gap-3 border-b border-border px-5 py-3.5 text-left transition-colors duration-300 ease-soft last:border-b-0 hover:bg-accent/50",
                position === current && "bg-brand-soft",
              )}
            >
              {position === current && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-px bg-brand"
                />
              )}
              <span
                className={cn(
                  "font-display w-5 shrink-0 text-[12px] tabular-nums",
                  position === current ? "text-brand" : "text-muted-foreground",
                )}
              >
                {pad(position + 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium tracking-[-0.012em]">
                  {event.title}
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                  {relativeDay(event.startTime)} · {event.venue}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-border px-5 py-4">
          <Link
            to="/events"
            className="link-quiet text-[12px] text-muted-foreground"
          >
            Open the full catalogue
          </Link>
        </div>
      </aside>
    </div>
  );
}
