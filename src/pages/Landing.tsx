import { EventDirectory } from "@/components/site/EventDirectory";
import { EventSlideshow } from "@/components/site/EventSlideshow";
import { PAYMENT_OPTIONS } from "@/components/site/PaymentMethods";
import { StatusDot } from "@/components/site/EventList";
import { ProgrammeCard } from "@/components/site/FestCard";
import { PromoBand } from "@/components/site/PromoBand";
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
import { INTRO_PART_MS, introPlays } from "@/lib/intro";
import {
  dayParts,
  formatTimeRange,
  priceLabel,
  relativeDay,
  seatSummary,
} from "@/lib/format";
import type { EventListItem, ProgrammeListItem } from "@/lib/types";
import { useQuery } from "convex/react";
import {
  AnimatePresence,
  motion,
  useCycle,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
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
import {
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
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

const COMET_DISPLAY_NAMES = [
  "Sparkles",
  "Star",
  "Ticket",
  "Handshake",
  "Globe",
  "ShoppingBag",
  "CalendarCheck",
  "TrendingUp",
  "GaugeCircle",
  "Building2",
  "Layers3",
  "ArrowRight",
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

/** Staged entrance for the hero: the badge, headline, copy and actions arrive in order. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [offset] = useState(() =>
    introPlays() ? INTRO_PART_MS / 1000 - 0.2 : 0,
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: offset + delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Scroll-entrance for the grids further down the page. */
function Rise({
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
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A gentle pointer tilt for the hero card. */
function Tilt({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const spring = { stiffness: 180, damping: 18 };
  const srx = useSpring(rx, spring);
  const sry = useSpring(ry, spring);

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 5);
    rx.set(-py * 5);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
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

/** A swash that draws itself under a word once the page has settled. */
function Swash({ children }: { children: ReactNode }) {
  const [offset] = useState(() =>
    introPlays() ? INTRO_PART_MS / 1000 - 0.2 : 0,
  );
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 220 12"
        className="absolute -bottom-2 left-0 h-2.5 w-full"
        fill="none"
      >
        <motion.path
          d="M3 9C60 3 150 2 217 7"
          stroke="var(--warm)"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: offset + 0.9, ease: EASE }}
        />
      </svg>
    </span>
  );
}

/** A small claim that drifts beside the hero card. */
function FloatChip(props: {
  className: string;
  delay: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "absolute z-10 hidden items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-lift backdrop-blur-sm lg:flex",
        props.className,
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={
        reduced
          ? { opacity: 1, scale: 1 }
          : { opacity: 1, scale: 1, y: [0, -7, 0] }
      }
      transition={{
        opacity: { delay: props.delay, duration: 0.5, ease: EASE },
        scale: { delay: props.delay, duration: 0.5, ease: EASE },
        y: reduced
          ? undefined
          : {
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: props.delay,
            },
      }}
    >
      {props.children}
    </motion.div>
  );
}

/** Marquee of words that never stops moving. */
function Marquee({ words }: { words: string[] }) {
  const doubled = [...words, ...words];
  return (
    <div
      aria-hidden="true"
      className="marquee overflow-hidden border-y border-border bg-card/60 py-3.5"
    >
      <div className="marquee-track flex w-max items-center">
        {doubled.map((word, index) => (
          <span key={index} className="flex items-center whitespace-nowrap">
            <span className="font-display px-4 text-[13px] tracking-[0.02em] text-muted-foreground">
              {word}
            </span>
            <span className="text-[9px] text-warm">✦</span>
          </span>
        ))}
      </div>
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

function FeatureCard({
  feature,
  index,
}: {
  feature: typeof FEATURES[number];
  index: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={feature.title}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: reduced ? 0 : 0.55,
        delay: reduced ? 0 : index * 0.06,
        ease: EASE,
      }}
      className="group h-full rounded-lg border border-border bg-card p-6 shadow-hairline transition-colors hover:border-foreground/15"
    >
      <span
        className={cn(
          "icon-chip transition-transform duration-500 ease-quint group-hover:-rotate-6 group-hover:scale-110",
          feature.tint,
        )}
      >
        <feature.icon className="size-4" />
      </span>
      <h3 className="mt-5 text-[15px] font-medium tracking-[-0.015em]">
        {feature.title}
      </h3>
      <p className="mt-2.5 text-[12.5px] leading-6 text-muted-foreground">
        {feature.copy}
      </p>
    </motion.div>
  );
}

function FeatureDetail({
  strip = false,
}: {
  strip?: boolean;
}) {
  const reduced = useReducedMotion();
  const [key, cycle] = useCycle(COMET_DISPLAY_NAMES);

  return (
    <div
      className={cn(
        "rounded-xl border border-brand-line/40 bg-brand-soft/20 px-5 py-5 mt-12",
        strip ? "mt-12" : "mt-12",
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{
            duration: reduced ? 0 : 0.4,
            ease: EASE,
          }}
          className="flex items-center justify-center gap-4 text-center"
        >
          <span className="label-eyebrow text-brand">Fun fact</span>
          <span className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
            Did you know Memorius lets a single event carry a shop, a snack counter and a sponsorship pitch all at once?
          </span>
          <span
            className={cn(
              "chip chip-plum text-[11px] font-normal tracking-[0.04em]",
              reduced ? "opacity-70" : "animate-pulse",
            )}
          >
            Now you know
          </span>
        </motion.div>
      </AnimatePresence>

      <div
        className={cn(
          "relative mt-5 flex h-10 w-full overflow-hidden rounded-full bg-brand-soft/40",
          reduced && "opacity-0",
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center gap-6 py-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.section
              key={String(i)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2 text-[11px] text-brand"
            >
              <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[9px] tracking-wider uppercase">
                {FEATURES[i % FEATURES.length].title.split(" ")[0]}
              </span>
            </motion.section>
          ))}
        </div>
        <motion.div
          animate={reduced ? undefined : { x: [0, 100] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 24,
              ease: "linear",
            },
          }}
          className="absolute inset-y-0 left-0 w-[200%] bg-gradient-to-r from-transparent via-brand-soft/40 to-transparent"
        />
      </div>
    </div>
  );
}

function CometStream({
  chipIcon,
  reduced,
  key,
}: {
  chipIcon: ReactNode;
  reduced: boolean;
  key: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.9 }}
        transition={{ duration: reduced ? 0 : 0.55, ease: EASE }}
        className="absolute -right-3 top-20 z-0 h-7 w-7"
      >
        {chipIcon}
      </motion.div>
    </AnimatePresence>
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

  const reduced = useReducedMotion() ?? false;
  const cometIcon: ReactNode = reduced
    ? <Sparkles className={"size-7 text-brand opacity-70"} />
    : <Sparkles className={"size-7 text-brand"} />;

  const cometKey = reduced ? "Sparkles" : COMET_DISPLAY_NAMES[0];

  const marqueeWords = Array.from(
    new Set([
      "Conferences",
      "Workshops",
      "Seminars",
      "Hackathons",
      ...(events ?? []).map((event) => event.category),
      "Book in a minute",
      "Pay your way",
      "Sponsor a season",
    ]),
  );

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
          <div
            aria-hidden="true"
            className="drift-a pointer-events-none absolute -top-24 right-[6%] size-72 rounded-full bg-brand/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="drift-b pointer-events-none absolute top-44 -left-12 size-64 rounded-full bg-warm/20 blur-3xl"
          />
          <div className="relative grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-20">
            <div>
              <Reveal>
                <Badge
                  variant="outline"
                  className="rounded-full border-border px-3 py-1 text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase"
                >
                  Events, merchandise, sponsorship, promotions — one place
                </Badge>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-8 text-[44px] leading-[1.02] font-medium tracking-[-0.04em] text-balance sm:text-[62px]">
                  Find your next event, and{" "}
                  <em className="font-display font-normal italic">
                    <Swash>book it</Swash>
                  </em>{" "}
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
              <div className="relative">
                <FloatChip className="-top-5 right-6 rotate-3" delay={1.0}>
                  <Ticket className="size-3 text-brand" />
                  Booked in a minute
                </FloatChip>
                <FloatChip className="top-1/2 -left-7 -rotate-2" delay={1.25}>
                  <Sparkles className="size-3 text-warm" />
                  Memo answers live
                </FloatChip>
                <FloatChip className="-bottom-5 right-10 rotate-2" delay={1.5}>
                  <Handshake className="size-3 text-plum" />
                  Sponsor in four tiers
                </FloatChip>
                <CometStream chipIcon={cometIcon} reduced={reduced} key={cometKey} />
                {nextEvent === undefined ? (
                  <Skeleton className="h-[440px] w-full rounded-lg" />
                ) : (
                  <Tilt>
                    <NextEventCard event={nextEvent} />
                  </Tilt>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        <Marquee words={marqueeWords} />

        {/* Promotions in flight */}
        <PromoBand />

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
              ].map((role, index) => (
                <Rise key={role.title} delay={index * 0.08} className="h-full">
                  <div className="group surface-card flex h-full flex-col justify-between rounded-lg border border-border bg-card p-6 shadow-hairline hover:border-foreground/15">
                    <div>
                      <span
                        className={cn(
                          "icon-chip transition-transform duration-500 ease-quint group-hover:-rotate-6 group-hover:scale-110",
                          role.tint,
                        )}
                      >
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
                </Rise>
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
              {FLOW.map((step, index) => (
                <Rise key={step.index} delay={index * 0.06}>
                  <div className="bg-background px-0 pt-8 sm:px-7 sm:pt-10 sm:first:pl-0 sm:last:pr-0">
                    <span className="font-display text-[15px] text-brand tabular-nums">
                      {step.index}
                    </span>
                    <h3 className="mt-5 text-[17px] font-medium tracking-[-0.02em]">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-xs text-[13px] leading-6 text-muted-foreground">
                      {step.copy}
                    </p>
                  </div>
                </Rise>
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
        <section className="band-warm relative overflow-hidden border-t border-border">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-9 h-32 bg-gradient-to-b from-transparent via-brand-soft/30 to-transparent"
          />
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <SectionHeading
              eyebrow="Everything included"
              title="The parts other platforms charge extra for, already in."
              description="Selling, sponsorship, feedback, payments and a price that knows where the customer is — all inside the same calendar."
            />            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  feature={feature}
                  index={index}
                />
              ))}
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-3 rounded-xl border border-brand-line/40 bg-brand-soft/20 px-5 py-5">
              <span className="label-eyebrow mr-1 text-brand">Also inside</span>
              <span className="chip chip-cool">{PAYMENT_OPTIONS[0].name}</span>
              <span className="chip chip-warm">{PAYMENT_OPTIONS[1].name}</span>
              <span className="chip chip-plum">{PAYMENT_OPTIONS[2].name}</span>
              <span className="chip chip-cool">{PAYMENT_OPTIONS[3].name}</span>
            </div>

            <FeatureDetail strip />
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
        <section className="relative overflow-hidden border-t border-border">
          <div
            aria-hidden="true"
            className="breathe glow-soft pointer-events-none absolute inset-x-0 top-0 h-72"
          />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
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
                className="sheen h-11 gap-2 rounded-full px-6 text-[14px]"
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
