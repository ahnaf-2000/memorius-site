import { EventDirectory } from "@/components/site/EventDirectory";
import { EventSlideshow } from "@/components/site/EventSlideshow";
import { PAYMENT_OPTIONS } from "@/components/site/PaymentMethods";
import { StatusDot } from "@/components/site/EventList";
import { ProgrammeCard } from "@/components/site/FestCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useCountUp } from "@/hooks/use-count-up";
import { useEnsureSeeded } from "@/hooks/use-seed";
import {
  dayParts,
  formatTimeRange,
  priceLabel,
  relativeDay,
  seatSummary,
} from "@/lib/format";
import type { EventListItem, ProgrammeListItem } from "@/lib/types";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  GaugeCircle,
  Globe,
  Handshake,
  Layers3,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const EASE = [0.16, 1, 0.3, 1] as const;

const FLOW = [
  {
    index: "01",
    title: "Business",
    copy: "One account holds every programme it runs and every booking it takes.",
  },
  {
    index: "02",
    title: "Programme",
    copy: "A named season with its own dates, venue and public page.",
  },
  {
    index: "03",
    title: "Event",
    copy: "Date, time, venue, places and price on a single page.",
  },
  {
    index: "04",
    title: "Booking",
    copy: "A held place, a payment record, and a line on your own schedule.",
  },
];

const FEATURES = [
  {
    icon: ShoppingBag,
    title: "Merchandise and snacks",
    copy: "List a tote, a pin or the coffee cart on the event itself. Attendees build a basket and collect at the desk.",
    tint: "icon-chip-warm",
  },
  {
    icon: Handshake,
    title: "Sponsorship in four tiers",
    copy: "Community, Silver, Gold and Lead partner. Pledges arrive against the programme or one event, ready to confirm.",
    tint: "icon-chip-plum",
  },
  {
    icon: Star,
    title: "Ratings and reviews",
    copy: "One rating per attendee, averaged onto the event card, so the next customer reads what the room said.",
    tint: "",
  },
  {
    icon: TrendingUp,
    title: "Revenue on one screen",
    copy: "Places, shop orders and sponsorship in a single ledger, split into collected, promised and still due.",
    tint: "icon-chip-cool",
  },
  {
    icon: Globe,
    title: "Prices in your market",
    copy: "Quote in BDT, USD, GBP or anywhere else. The figure follows the visitor's country, and can be changed any time.",
    tint: "icon-chip-cool",
  },
  {
    icon: Sparkles,
    title: "An assistant, always on",
    copy: "Memo answers from the live catalogue — dates, prices, places left, how to pay — from any page, day or night.",
    tint: "icon-chip-warm",
  },
];

const FAQ = [
  {
    q: "How do payments work, and where does the money go?",
    a: "Checkout accepts bKash, Nagad, Google Pay, PayPal, card, or settling at the desk. Every payment is recorded against a reference and appears in the organizer's revenue screen, which is also where they set where payouts should land.",
  },
  {
    q: "Can prices be shown in my own currency?",
    a: "Yes. Choose your country from the menu in the header and every amount on the site is requoted locally, from the Bangla taka to the US dollar. Signed-in accounts remember the choice.",
  },
  {
    q: "What can an organizer actually sell?",
    a: "Three things on the same event: places at the event, merchandise to take home, and snacks or drinks for the day. Sponsorship is sold at programme or event level, in four tiers.",
  },
  {
    q: "Is there a dark theme? What about colour vision?",
    a: "There is a dark appearance and a colour-blind palette, chosen separately so you can have either, or both. The palette swaps the red and green status colours for blue and orange, which stay distinguishable.",
  },
  {
    q: "What happens when an event is full?",
    a: "New bookings join the waiting list instead of being refused, and they are promoted automatically the moment a place is released — in the order they arrived, without anyone mailing a list.",
  },
];

/**
 * Staged entrance for the hero: the badge, headline, copy and actions arrive in
 * order rather than all at once. Driven from mount rather than from an
 * intersection observer, so the page can never start blank if the observer is
 * slow to report.
 */
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

function Stat({ count, label }: { count?: number; label: string }) {
  const shown = useCountUp(count);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[28px] leading-none tabular-nums">
        {count === undefined ? "—" : shown.toLocaleString("en-US")}
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
    <div className="surface-card rounded-lg border border-border bg-card shadow-hairline hover:border-foreground/15">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <p className="label-eyebrow">Next available</p>
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
            ["Price per place", priceLabel(event.price)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-6"
            >
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

      <div className="flex items-center gap-3 border-t border-border px-6 py-4">
        <Button asChild size="sm" className="h-9 gap-1.5 rounded-full px-4">
          <Link to={`/events/${event.slug}`}>
            Reserve a place
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
        <span className="text-[12px] text-muted-foreground">
          {event.category}
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
          className="h-px bg-foreground/45 transition-[width] duration-700 ease-quint"
          style={{ width: `${claimed}%` }}
        />
      </div>
    </div>
  );
}

export default function Landing() {
  useEnsureSeeded();
  const events = useQuery(api.events.list);
  const programmes = useQuery(api.fests.list);

  const upcoming = (events ?? []).filter((event) => event.state !== "past");
  const nextEvent = upcoming[0];
  const totalCapacity = (events ?? []).reduce(
    (sum, event) => sum + event.capacity,
    0,
  );
  const totalBooked = (events ?? []).reduce(
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

  const loaded = events !== undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto w-full max-w-6xl px-5 pt-20 pb-24 sm:px-8 sm:pt-28">
          <div
            aria-hidden="true"
            className="glow-soft pointer-events-none absolute inset-x-[-10%] -top-40 h-[38rem]"
          />
          <div
            aria-hidden="true"
            className="grid-veil pointer-events-none absolute inset-x-0 -top-40 h-[38rem]"
          />
          <div className="relative grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-20">
            <div>
              <Reveal>
                <Badge
                  variant="outline"
                  className="rounded-full border-border px-3 py-1 text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase"
                >
                  Events, merchandise, sponsorship — one place
                </Badge>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-8 text-[44px] leading-[1.02] font-medium tracking-[-0.04em] text-balance sm:text-[62px]">
                  Find your next event, and{" "}
                  <em className="font-display font-normal italic">book it</em>{" "}
                  in a minute.
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-7 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
                  Memorius is the catalogue your customers browse and the
                  booking desk your business runs. Search every programme, open
                  an event, choose how you pay, and keep it all on one schedule.
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
                    <Link to="/admin">For businesses</Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={0.26}>
                <div className="mt-14 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4">
                  <Stat count={programmes?.length} label="Programmes" />
                  <Stat count={events?.length} label="Events" />
                  <Stat count={loaded ? totalCapacity : undefined} label="Places" />
                  <Stat count={loaded ? totalBooked : undefined} label="Booked" />
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.2} className="lg:pt-4">
              {nextEvent === undefined ? (
                <Skeleton className="h-[440px] w-full rounded-lg" />
              ) : (
                <NextEventCard event={nextEvent} />
              )}
            </Reveal>
          </div>
        </section>

        {/* Three ways in */}
        <section className="band-brand border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="Three ways in"
              title="Organizer, participant or sponsor — pick yours at the door."
              description="One account, three shapes. The role you choose decides what your dashboard opens on, and you can change it whenever the season does."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Building2,
                  title: "Organizer",
                  copy: "Publish programmes and events, sell places, merchandise and snacks, take sponsorship, and watch the money arrive on one screen.",
                  tint: "",
                  to: "/auth?returnTo=%2Fadmin",
                  cta: "Run a programme",
                },
                {
                  icon: Ticket,
                  title: "Participant",
                  copy: "See everything that is on, take a place in a minute, add something from the shop, and leave a review afterwards.",
                  tint: "icon-chip-cool",
                  to: "/events",
                  cta: "See what's on",
                },
                {
                  icon: Handshake,
                  title: "Sponsor",
                  copy: "Back a programme or a single event in four tiers, from Community to Lead partner, and follow where it goes.",
                  tint: "icon-chip-plum",
                  to: "/programmes",
                  cta: "Back an event",
                },
              ].map((role) => (
                <div
                  key={role.title}
                  className="surface-card flex flex-col justify-between rounded-lg border border-border bg-card p-6 shadow-hairline hover:border-foreground/15"
                >
                  <div>
                    <span className={cn("icon-chip", role.tint)}>
                      <role.icon className="size-4" />
                    </span>
                    <h3 className="mt-5 text-[17px] font-medium tracking-[-0.02em]">
                      {role.title}
                    </h3>
                    <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                      {role.copy}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-7 h-9 w-fit gap-1.5 rounded-full border-border px-4 text-[13px] shadow-none"
                  >
                    <Link to={role.to}>
                      {role.cta}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's on */}
        <section id="whats-on" className="scroll-mt-24 border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="What's on"
              title="Every event running now, without the searching."
              description="Nothing to filter and nothing to type. Every event open for booking passes through here in turn — date, venue, price and the places still left."
              action={
                <Button
                  asChild
                  variant="ghost"
                  className="group h-9 gap-2 rounded-full px-4 text-[13px]"
                >
                  <Link to="/events">
                    Open the full catalogue
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              }
            />
            <div className="mt-10">
              {events === undefined ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <Skeleton className="h-[30rem] rounded-lg" />
                  <Skeleton className="hidden h-[30rem] rounded-lg lg:block" />
                </div>
              ) : (
                <EventSlideshow events={upcoming} />
              )}
            </div>
          </div>
        </section>

        {/* The catalogue */}
        <section
          id="catalogue"
          className="scroll-mt-24 border-t border-border bg-background"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="The catalogue"
              title="Every event, open for booking."
              description="Search by name, venue or category. Availability updates the moment another customer books, so what you see is what is left."
              action={
                <Button
                  asChild
                  variant="ghost"
                  className="group h-9 gap-2 rounded-full px-4 text-[13px]"
                >
                  <Link to="/events">
                    Open the catalogue
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              }
            />
            <div className="mt-10">
              <EventDirectory items={events} limit={5} moreHref="/events" />
            </div>
          </div>
        </section>

        {/* Programmes */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="Programmes"
              title="A programme is a season, not a spreadsheet."
              description="Programmes group the events a business runs together, so a full calendar stays readable long after the last announcement."
              action={
                <Button
                  asChild
                  variant="ghost"
                  className="group h-9 gap-2 rounded-full px-4 text-[13px]"
                >
                  <Link to="/programmes">
                    All programmes
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              }
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {programmes === undefined
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-64 rounded-lg" />
                  ))
                : programmes.map((programme: ProgrammeListItem) => (
                    <ProgrammeCard
                      key={programme._id}
                      programme={programme}
                    />
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
              description="The structure that keeps a calendar legible: a business runs programmes, a programme holds events, an event takes bookings."
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

        {/* For businesses */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
              <div>
                <p className="label-eyebrow">For businesses</p>
                <h2 className="mt-3 text-[26px] leading-[1.2] font-medium tracking-[-0.028em] text-balance sm:text-[32px]">
                  Run the programme. Skip the spreadsheet.
                </h2>
                <p className="mt-5 max-w-lg text-[14px] leading-7 text-muted-foreground">
                  Publish a programme in a minute, add its events, set a price
                  per place, and watch bookings and payments arrive on one
                  screen. No shared inbox, no rows copied out of a form.
                </p>

                <ul className="mt-10 space-y-7 border-t border-border pt-8">
                  {[
                    {
                      icon: Layers3,
                      title: "Programmes and events, together",
                      copy: "Create a programme, then add events to it. Renaming or rescheduling never breaks a link.",
                    },
                    {
                      icon: CalendarCheck,
                      title: "Bookings that settle themselves",
                      copy: "Places count down on their own, and a cancellation quietly promotes the next customer on the waiting list.",
                    },
                    {
                      icon: GaugeCircle,
                      title: "One console to monitor",
                      copy: "See confirmed places, waiting lists, money taken and money outstanding per event, without exporting anything.",
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
                  <Link to="/admin">
                    Open the admin console
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <p className="label-eyebrow">Most in demand</p>
                  <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    Live availability
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
                  <span>Updated as bookings arrive</span>
                  <Link
                    to="/programmes"
                    className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                  >
                    Browse programmes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Everything included */}
        <section className="band-warm border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="Everything included"
              title="The parts other platforms charge extra for, already in."
              description="Selling, sponsorship, feedback, payments and a price that knows where the customer is — all inside the same calendar."
            />
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="bg-card p-6">
                  <span className={cn("icon-chip", feature.tint)}>
                    <feature.icon className="size-4" />
                  </span>
                  <h3 className="mt-5 text-[15px] font-medium tracking-[-0.015em]">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-[12.5px] leading-6 text-muted-foreground">
                    {feature.copy}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="label-eyebrow mr-1">Pay with</span>
              {PAYMENT_OPTIONS.map((option) => (
                <span key={option.id} className={cn("chip", option.tint)}>
                  {option.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="Questions"
              title="What people ask before their first booking."
            />
            <Accordion type="single" collapsible className="mt-8">
              {FAQ.map((item, index) => (
                <AccordionItem key={item.q} value={`q-${index}`}>
                  <AccordionTrigger className="text-left text-[14px] font-medium tracking-[-0.012em]">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[13px] leading-6 text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <h2 className="font-display mx-auto max-w-3xl text-[34px] leading-[1.12] tracking-[-0.02em] text-balance sm:text-[46px]">
              Take your place in <em className="italic">under a minute</em>.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[14px] leading-7 text-muted-foreground">
              Create an account once, and every booking after it takes two
              fields and a click.
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
