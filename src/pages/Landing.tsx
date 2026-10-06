import { EventDirectory } from "@/components/site/EventDirectory";
import { FestCard } from "@/components/site/FestCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StatusDot } from "@/components/site/EventList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useEnsureSeeded } from "@/hooks/use-seed";
import {
  dayParts,
  formatTimeRange,
  relativeDay,
  seatSummary,
} from "@/lib/format";
import type { EventListItem, FestListItem } from "@/lib/types";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  GaugeCircle,
  Layers3,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const EASE = [0.16, 1, 0.3, 1] as const;

const FLOW = [
  {
    index: "01",
    title: "Organization",
    copy: "One account owns every festival it runs, and every registration it collects.",
  },
  {
    index: "02",
    title: "Festival",
    copy: "Each fest holds its own programme, dates, venue and public page.",
  },
  {
    index: "03",
    title: "Event",
    copy: "Date, time, venue, capacity and registration information on a single page.",
  },
  {
    index: "04",
    title: "Registration",
    copy: "A held seat, a confirmation code, and a place on your own schedule.",
  },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[28px] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

function NextEventCard({ event }: { event: EventListItem }) {
  const parts = dayParts(event.startTime);
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <p className="label-eyebrow">Next on the calendar</p>
        <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {relativeDay(event.startTime)}
        </span>
      </div>

      <div className="px-6 pt-7 pb-6">
        <div className="flex items-start gap-5">
          <div className="flex w-16 shrink-0 flex-col items-center rounded-md border border-border py-3">
            <span className="text-[10px] leading-none font-medium tracking-[0.14em] text-muted-foreground">
              {parts.month}
            </span>
            <span className="font-display mt-1.5 text-[30px] leading-none tabular-nums">
              {parts.day}
            </span>
            <span className="mt-1.5 text-[10px] leading-none tracking-[0.1em] text-muted-foreground">
              {parts.weekday}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-[17px] leading-[1.3] font-medium tracking-[-0.02em] text-balance">
              {event.title}
            </h3>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {event.festName}
            </p>
          </div>
        </div>

        <dl className="mt-7 space-y-3.5 border-t border-border pt-6 text-[13px]">
          {[
            ["Time", formatTimeRange(event.startTime, event.endTime)],
            ["Venue", event.venue],
            ["Category", event.category],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-6">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="truncate text-right">{value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-6">
            <dt className="shrink-0 text-muted-foreground">Availability</dt>
            <dd className="flex items-center gap-2">
              <StatusDot state={event.state} />
              <span className="tabular-nums">{seatSummary(event)}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-6 py-4">
        <Button asChild size="sm" className="h-9 gap-1.5 rounded-full px-4">
          <Link to={`/events/${event.slug}`}>
            Reserve a seat
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
        <span className="text-[12px] text-muted-foreground">
          {event.fee ?? "Free entry"}
        </span>
      </div>
    </div>
  );
}

function DemandRow({ event }: { event: EventListItem }) {
  const claimed =
    event.capacity === 0
      ? 0
      : Math.round((event.seatsTaken / event.capacity) * 100);
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-6">
        <p className="truncate text-[13px] font-medium tracking-[-0.01em]">
          {event.title}
        </p>
        <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
          {event.seatsTaken}/{event.capacity}
        </span>
      </div>
      <div className="mt-3 h-px w-full bg-border">
        <div
          className="h-px bg-foreground/45"
          style={{ width: `${claimed}%` }}
        />
      </div>
    </div>
  );
}

export default function Landing() {
  useEnsureSeeded();
  const events = useQuery(api.events.list);
  const fests = useQuery(api.fests.list);

  const upcoming = (events ?? []).filter((event) => event.state !== "past");
  const nextEvent = upcoming[0];
  const totalCapacity = (events ?? []).reduce(
    (sum, event) => sum + event.capacity,
    0,
  );
  const totalClaimed = (events ?? []).reduce(
    (sum, event) => sum + event.seatsTaken,
    0,
  );
  const mostInDemand = [...(events ?? [])]
    .filter((event) => event.state !== "past")
    .sort(
      (a, b) =>
        b.seatsTaken / Math.max(1, b.capacity) -
        a.seatsTaken / Math.max(1, a.capacity),
    )
    .slice(0, 3);

  const number = (value: number) => value.toLocaleString("en-US");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pt-20 pb-24 sm:px-8 sm:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-20">
            <div>
              <Reveal>
                <Badge
                  variant="outline"
                  className="rounded-full border-border px-3 py-1 text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase"
                >
                  Registration without the Google Form
                </Badge>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-8 text-[44px] leading-[1.02] font-medium tracking-[-0.04em] text-balance sm:text-[62px]">
                  Every event,{" "}
                  <em className="font-display font-normal italic">calmly</em>{" "}
                  organized.
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-7 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
                  Cadence is the registration desk for organizations that host
                  festivals. Browse every event across every fest, see exactly
                  what is left, and hold your place in under a minute.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 gap-2 rounded-full px-6 text-[14px]"
                  >
                    <Link to="/events">
                      Browse all events
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-11 rounded-full border-border px-6 text-[14px] shadow-none"
                  >
                    <Link to="/dashboard">For organizers</Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={0.26}>
                <div className="mt-14 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4">
                  <Stat
                    value={fests === undefined ? "—" : number(fests.length)}
                    label="Festivals"
                  />
                  <Stat
                    value={events === undefined ? "—" : number(events.length)}
                    label="Events"
                  />
                  <Stat
                    value={
                      events === undefined ? "—" : number(totalCapacity)
                    }
                    label="Seats offered"
                  />
                  <Stat
                    value={events === undefined ? "—" : number(totalClaimed)}
                    label="Seats claimed"
                  />
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.2} className="lg:pt-4">
              {nextEvent === undefined ? (
                <Skeleton className="h-[420px] w-full rounded-lg" />
              ) : (
                <NextEventCard event={nextEvent} />
              )}
            </Reveal>
          </div>
        </section>

        {/* The essentials: every event */}
        <section
          id="events"
          className="scroll-mt-24 border-t border-border bg-background"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="The essentials"
              title="Every event, across every festival."
              description="Search by name, venue or category. Seats update the moment somebody else takes one, so what you see is what is left."
              action={
                <Button
                  asChild
                  variant="ghost"
                  className="group h-9 gap-2 rounded-full px-4 text-[13px]"
                >
                  <Link to="/events">
                    Open the calendar
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              }
            />
            <div className="mt-10">
              <EventDirectory
                items={events}
                limit={5}
                moreHref="/events"
              />
            </div>
          </div>
        </section>

        {/* Festivals */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="Festivals"
              title="A festival is a season, not a spreadsheet."
              description="Each fest collects its own programme, so the whole line-up stays readable long after the last announcement."
              action={
                <Button
                  asChild
                  variant="ghost"
                  className="group h-9 gap-2 rounded-full px-4 text-[13px]"
                >
                  <Link to="/fests">
                    All festivals
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              }
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {fests === undefined
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-64 rounded-lg" />
                  ))
                : fests.map((fest: FestListItem) => (
                    <FestCard key={fest._id} fest={fest} />
                  ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="How it works"
              title="Four steps, in this order, every time."
              description="The structure that makes a programme legible: an organization runs festivals, a festival holds events, an event collects registrations."
            />
            <div className="mt-12 grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {FLOW.map((step) => (
                <div
                  key={step.index}
                  className="bg-background px-0 pt-8 sm:px-7 sm:pt-10 sm:first:pl-0 sm:last:pr-0"
                >
                  <span className="font-display text-[15px] text-muted-foreground tabular-nums">
                    {step.index}
                  </span>
                  <h3 className="mt-5 text-[17px] font-medium tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-xs text-[13px] leading-6 text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Organizers */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
              <div>
                <p className="label-eyebrow">For organizers</p>
                <h2 className="mt-3 text-[26px] leading-[1.2] font-medium tracking-[-0.028em] text-balance sm:text-[32px]">
                  Run the festival. Skip the spreadsheet.
                </h2>
                <p className="mt-5 max-w-lg text-[14px] leading-7 text-muted-foreground">
                  Publish a festival in a minute, add its events, and watch the
                  registrations arrive on one screen. No shared inbox, no
                  copying rows out of a form.
                </p>

                <ul className="mt-10 space-y-7 border-t border-border pt-8">
                  {[
                    {
                      icon: Layers3,
                      title: "Festivals and events, together",
                      copy: "Create a fest, then add events to it. Renaming or rescheduling never breaks a link.",
                    },
                    {
                      icon: CalendarCheck,
                      title: "Registrations that settle themselves",
                      copy: "Seats count down on their own, and a cancellation quietly promotes the next person on the waitlist.",
                    },
                    {
                      icon: GaugeCircle,
                      title: "One screen to monitor",
                      copy: "See confirmed, waitlisted and cancelled numbers per event without exporting anything.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-4">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-border">
                        <item.icon className="size-4 text-muted-foreground" />
                      </span>
                      <div>
                        <p className="text-[14px] font-medium tracking-[-0.012em]">
                          {item.title}
                        </p>
                        <p className="mt-1.5 max-w-md text-[13px] leading-6 text-muted-foreground">
                          {item.copy}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="mt-10 h-11 gap-2 rounded-full border-border px-6 text-[14px] shadow-none"
                >
                  <Link to="/dashboard">
                    Open the organizer studio
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <p className="label-eyebrow">Most in demand</p>
                  <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    Live seats
                  </span>
                </div>
                <div className="px-6 py-2">
                  {mostInDemand.length === 0 ? (
                    <div className="py-10">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="mt-4 h-3 w-1/2" />
                      <Skeleton className="mt-4 h-3 w-1/3" />
                    </div>
                  ) : (
                    mostInDemand.map((event) => (
                      <DemandRow key={event._id} event={event} />
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border px-6 py-4 text-[12px] text-muted-foreground">
                  <span>Updated as registrations arrive</span>
                  <Link
                    to="/fests"
                    className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                  >
                    Browse programmes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <h2 className="font-display mx-auto max-w-3xl text-[34px] leading-[1.12] tracking-[-0.02em] text-balance sm:text-[46px]">
              Hold your place in{" "}
              <em className="italic">under a minute</em>.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[14px] leading-7 text-muted-foreground">
              Create an account once, and every registration after that takes
              two fields and a click.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 gap-2 rounded-full px-6 text-[14px]"
              >
                <Link to="/auth?returnTo=%2Fevents">
                  Create your account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-11 rounded-full px-6 text-[14px]"
              >
                <Link to="/events">Keep browsing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
