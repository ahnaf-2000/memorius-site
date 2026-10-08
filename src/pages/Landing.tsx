import { MEMO_OPEN_EVENT } from "@/components/site/AssistantDock";
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
  CometRail,
  Float,
  FloatingObjects,
  Magnetic,
  ParticleField,
  SpotlightCard,
  SplitWords,
  celebrate,
  type RailItem,
} from "@/components/site/LiveMotion";
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
  formatMoney,
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
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  FileText,
  GaugeCircle,
  Globe,
  Handshake,
  Layers3,
  MessageSquare,
  Printer,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
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

/** Facts that take turns inside the features band. */
const FACTS = [
  {
    label: "Shop on site",
    copy: "One event carries places, merchandise and a snack counter in the same checkout.",
  },
  {
    label: "Four tiers",
    copy: "Sponsorship attaches to a whole programme or a single night, from Community to Lead partner.",
  },
  {
    label: "One ledger",
    copy: "Money taken, promised and still due are three columns on one screen, never three exports.",
  },
  {
    label: "One vote each",
    copy: "Reviews are one per attendee and averaged onto the event card, in the open.",
  },
  {
    label: "Any market",
    copy: "Prices follow the visitor's country, so the same event reads in taka, dollars or pounds.",
  },
  {
    label: "Never stuck",
    copy: "A full event takes a waiting list and promotes the next name the moment a place is released.",
  },
];

/** Four claims that orbit the hero card, on a slow shared clock. */
const HERO_ORBIT = [
  { icon: Ticket, tint: "var(--brand)" },
  { icon: Handshake, tint: "var(--plum)" },
  { icon: ShoppingBag, tint: "var(--warm)" },
  { icon: Sparkles, tint: "var(--cool)" },
];

/** Second marquee row: the promises, kept short enough to read sideways. */
const VOICES = [
  "Two fields and a click",
  "No shared inbox",
  "Waiting lists promote themselves",
  "One ledger for places and shop",
  "Prices in your market",
  "Rated by the room",
  "Sponsors see where it went",
  "Memo answers day or night",
];

/** The twelve small things hidden in the easter-egg rail. */
const EASTER_EGGS: RailItem[] = [
  { name: "A shop cart", icon: ShoppingBag, tint: "var(--warm)" },
  { name: "Four tiers", icon: Handshake, tint: "var(--plum)" },
  { name: "One rating", icon: Star, tint: "var(--brand)" },
  { name: "One ledger", icon: TrendingUp, tint: "var(--cool)" },
  { name: "Local prices", icon: Globe, tint: "var(--brand)" },
  { name: "Memo", icon: Sparkles, tint: "var(--warm)" },
  { name: "Waiting list", icon: CalendarCheck, tint: "var(--cool)" },
  { name: "Six payment rails", icon: Ticket, tint: "var(--warm)" },
  { name: "Live occupancy", icon: GaugeCircle, tint: "var(--brand)" },
  { name: "Many programmes", icon: Layers3, tint: "var(--plum)" },
  { name: "A business page", icon: Building2, tint: "var(--cool)" },
  { name: "One-tap booking", icon: ArrowRight, tint: "var(--warm)" },
];

type FeatureKind = "shop" | "tiers" | "stars" | "ledger" | "fx" | "memo";

const FEATURES: {
  icon: typeof ShoppingBag;
  title: string;
  copy: string;
  tint: string;
  kind: FeatureKind;
}[] = [
  {
    icon: ShoppingBag,
    kind: "shop",
    title: "Merchandise and snacks",
    copy: "List a tote, a pin or the coffee cart on the event itself. Attendees build a basket and collect at the desk.",
    tint: "icon-chip-warm",
  },
  {
    icon: Handshake,
    kind: "tiers",
    title: "Sponsorship in four tiers",
    copy: "Community, Silver, Gold and Lead partner. Pledges arrive against the programme or one event, ready to confirm.",
    tint: "icon-chip-plum",
  },
  {
    icon: Star,
    kind: "stars",
    title: "Ratings and reviews",
    copy: "One rating per attendee, averaged onto the event card, so the next customer reads what the room said.",
    tint: "",
  },
  {
    icon: TrendingUp,
    kind: "ledger",
    title: "Revenue on one screen",
    copy: "Places, shop orders and sponsorship in a single ledger, split into collected, promised and still due.",
    tint: "icon-chip-cool",
  },
  {
    icon: Globe,
    kind: "fx",
    title: "Prices in your market",
    copy: "Quote in BDT, USD, GBP or anywhere else. The figure follows the visitor's country, and can be changed any time.",
    tint: "icon-chip-cool",
  },
  {
    icon: Sparkles,
    kind: "memo",
    title: "An assistant, always on",
    copy: "Memo is tuned on the live catalogue, so dates, prices and places left are quoted from the same records the pages print — and it will write the invitation or the agenda around them.",
    tint: "icon-chip-warm",
  },
];

const FAQ = [
  {
    q: "What is Memo, exactly?",
    a: "The assistant built into the product. Every question is answered with the live catalogue written into the prompt — programmes, dates, prices, places left, promotions and reviews — so the figures it quotes are the figures on the page. It will also do an ordinary task: an invitation, a social post, an agenda, a comparison, a translation. A general answer always finishes on this site, with the page where the result belongs.",
  },
  {
    q: "Can I take the numbers away with me?",
    a: "Yes — the platform report at the foot of this page, or /report, prints to A4 and downloads as a spreadsheet: places sold and still open, occupancy, revenue by rail, sponsorship against its four tiers, the promotions running and how the room rated each event. Aggregate figures only, never anything personal.",
  },
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
    q: "Does the assistant need a model key?",
    a: "No. It runs on the platform's built-in model from the first page load, and adding your own key — or pointing ASSISTANT_MODEL at a fine-tune trained on your programmes — takes over the moment it is present. If a model is slow or unreachable, the same catalogue snapshot answers by rule within twelve seconds, so the dock is never a dead end.",
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
      <span className="font-display text-[24px] leading-none tabular-nums">
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
function Marquee({
  words,
  reverse = false,
  tone = "warm",
}: {
  words: string[];
  reverse?: boolean;
  tone?: "warm" | "plum";
}) {
  const doubled = [...words, ...words];
  return (
    <div
      aria-hidden="true"
      className="marquee overflow-hidden border-y border-border bg-card/60 py-3.5"
    >
      <div
        className="marquee-track flex w-max items-center"
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {doubled.map((word, index) => (
          <span key={index} className="flex items-center whitespace-nowrap">
            <span className="font-display px-4 text-[13px] tracking-[0.02em] text-muted-foreground">
              {word}
            </span>
            <span
              className={cn(
                "text-[9px]",
                tone === "plum" ? "text-plum" : "text-warm",
              )}
            >
              ✦
            </span>
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
            <span className="font-display mt-1.5 text-[25px] leading-none tabular-nums">
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
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="h-px origin-left bg-foreground/45"
          style={{ width: `${claimed}%` }}
        />
      </div>
    </div>
  );
}

/** Which companion tint belongs to a feature chip. */
function tintOf(tint: string): string {
  if (tint === "icon-chip-warm") return "var(--warm)";
  if (tint === "icon-chip-plum") return "var(--plum)";
  if (tint === "icon-chip-cool") return "var(--cool)";
  return "var(--brand)";
}

/**
 * A feature card with three things happening at once when the pointer is on
 * it: the surface leans toward the cursor and carries a light that follows,
 * the icon sits inside a slowly turning dashed ring, and the rule under the
 * copy draws itself in.
 */
/**
 * A small animated specimen for every promise, so the card demonstrates the
 * feature instead of only describing it. Each one runs on its own clock and
 * holds still for anyone who has asked for less motion.
 */
function ShopDemo({ tint }: { tint: string }) {
  const reduced = useReducedMotion();
  const items = ["Tote", "Pin", "Coffee"];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => (
        <motion.span
          key={item}
          className="chip"
          initial={reduced === true ? undefined : { opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: index * 0.1, duration: 0.4, ease: EASE }}
        >
          {item}
        </motion.span>
      ))}
      <motion.span
        className="chip chip-tinted"
        style={{ ["--chip-tint" as string]: tint }}
        animate={reduced === true ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        Basket · 3
      </motion.span>
    </div>
  );
}

function TiersDemo() {
  const reduced = useReducedMotion();
  const tiers = ["Community", "Silver", "Gold", "Lead"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced === true) return;
    const id = window.setInterval(
      () => setActive((current) => (current + 1) % tiers.length),
      1500,
    );
    return () => window.clearInterval(id);
  }, [reduced, tiers.length]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tiers.map((tier, index) => (
        <span
          key={tier}
          className={cn(
            "chip transition-all duration-500",
            index === active && "chip-tinted chip-plum scale-105",
          )}
        >
          {tier}
        </span>
      ))}
    </div>
  );
}

function StarsDemo() {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.span
            key={n}
            initial={reduced === true ? undefined : { opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              delay: n * 0.09,
              type: "spring",
              stiffness: 320,
              damping: 17,
            }}
            className="text-warm"
          >
            <Star className="size-4" fill="currentColor" strokeWidth={0} />
          </motion.span>
        ))}
      </span>
      <span className="text-[11px] text-muted-foreground">4.8 from 26</span>
    </div>
  );
}

function LedgerDemo() {
  const reduced = useReducedMotion();
  const rows = [
    { label: "Collected", width: "78%", tone: "bg-brand" },
    { label: "Promised", width: "46%", tone: "bg-plum" },
    { label: "Still due", width: "18%", tone: "bg-warm" },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-[68px] shrink-0 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            {row.label}
          </span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <motion.span
              className={cn("absolute inset-y-0 left-0 rounded-full", row.tone)}
              initial={reduced === true ? undefined : { width: 0 }}
              whileInView={{ width: row.width }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, delay: index * 0.15, ease: EASE }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function CurrencyDemo() {
  const reduced = useReducedMotion();
  const quotes = [
    { code: "BDT", price: "৳1,850" },
    { code: "USD", price: "$15" },
    { code: "GBP", price: "£12" },
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced === true) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % quotes.length),
      2200,
    );
    return () => window.clearInterval(id);
  }, [reduced, quotes.length]);

  const quote = quotes[index % quotes.length];

  return (
    <div className="flex items-center gap-3">
      <span className="relative inline-flex h-6 min-w-[68px] items-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={quote.code}
            initial={reduced === true ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced === true ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="font-display text-[19px] leading-none tabular-nums"
          >
            {quote.price}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="chip chip-tinted chip-cool">{quote.code}</span>
    </div>
  );
}

function MemoDemoLine() {
  const reduced = useReducedMotion();
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (reduced === true) return;
    const id = window.setInterval(
      () => setRound((current) => current + 1),
      7200,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[11.5px] text-muted-foreground">
      <Sparkles className="size-3.5 shrink-0 text-brand" />
      <span className="truncate">
        <TypedLine
          key={round}
          text="Which event is next? — and draft the invite."
          speed={46}
        />
      </span>
    </div>
  );
}

/** Picks the specimen the card should show. */
function FeatureDemo({ kind, tint }: { kind: FeatureKind; tint: string }) {
  switch (kind) {
    case "shop":
      return <ShopDemo tint={tint} />;
    case "tiers":
      return <TiersDemo />;
    case "stars":
      return <StarsDemo />;
    case "ledger":
      return <LedgerDemo />;
    case "fx":
      return <CurrencyDemo />;
    case "memo":
      return <MemoDemoLine />;
  }
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const tint = tintOf(feature.tint);

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{
        duration: reduced ? 0 : 0.7,
        delay: reduced ? 0 : index * 0.07,
        ease: EASE,
      }}
      onHoverStart={() => setActive(true)}
      onHoverEnd={() => setActive(false)}
      className="h-full"
    >
      <SpotlightCard
        tint={tint}
        className="h-full rounded-lg border border-border bg-card p-6 shadow-hairline transition-colors hover:border-foreground/20"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="relative inline-grid place-items-center">
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1.5 rounded-xl border border-dashed"
              style={{
                borderColor: `color-mix(in oklch, ${tint} 34%, transparent)`,
              }}
              animate={
                active && !reduced
                  ? { rotate: 360, opacity: 1 }
                  : { rotate: 0, opacity: 0 }
              }
              transition={
                active && !reduced
                  ? {
                      rotate: { repeat: Infinity, duration: 9, ease: "linear" },
                      opacity: { duration: 0.3 },
                    }
                  : { duration: 0.35 }
              }
            />
            <span
              className={cn(
                "icon-chip transition-transform duration-500 ease-quint group-hover:-rotate-6 group-hover:scale-110",
                feature.tint,
              )}
            >
              <feature.icon className="size-4" />
            </span>
          </span>
          <span className="font-display text-[13px] tabular-nums text-muted-foreground/70">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="mt-5 flex min-h-[2.5rem] items-center">
          <FeatureDemo kind={feature.kind} tint={tint} />
        </div>

        <h3 className="mt-4 text-[15px] font-medium tracking-[-0.015em]">
          {feature.title}
        </h3>
        <p className="mt-2.5 text-[12.5px] leading-6 text-muted-foreground">
          {feature.copy}
        </p>
        <span
          aria-hidden="true"
          className="mt-5 block h-px w-full origin-left scale-x-0 bg-brand/30 transition-transform duration-700 ease-quint group-hover:scale-x-100"
        />
      </SpotlightCard>
    </motion.div>
  );
}

/**
 * A line of claims that takes turns in place: the facts are short, the
 * rotation is slow, and the dots are also buttons for anyone who would
 * rather hold the page still.
 */
function FactStrip() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % FACTS.length),
      5200,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  const fact = FACTS[index];

  return (
    <div className="mt-12 overflow-hidden rounded-xl border border-brand-line/40 bg-brand-soft/20 px-5 py-6">
      <div className="flex items-center justify-between gap-4">
        <span className="label-eyebrow text-brand">Fun fact</span>
        <div className="flex items-center gap-1.5">
          {FACTS.map((item, dot) => (
            <button
              key={item.label}
              type="button"
              aria-label={`Show: ${item.label}`}
              onClick={() => setIndex(dot)}
              className={cn(
                "h-1 rounded-full transition-all duration-500 ease-quint",
                dot === index
                  ? "w-7 bg-brand"
                  : "w-2.5 bg-brand/25 hover:bg-brand/50",
              )}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-4 min-h-[4.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={fact.label}
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: 14, filter: "blur(6px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: -14, filter: "blur(6px)" }
            }
            transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-2"
          >
            <span className="font-display text-[20px] leading-none">
              {fact.label}
            </span>
            <span className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
              {fact.copy}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Four chips orbiting the hero card. The ring turns, each icon counter-turns
 * so it stays upright, and the whole thing is hidden below lg where there is
 * no room for it.
 */
function OrbitCluster() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-10 -left-8 hidden size-44 lg:block"
    >
      <motion.div
        className="relative size-full"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      >
        {HERO_ORBIT.map((item, index) => {
          const angle = (index / HERO_ORBIT.length) * Math.PI * 2;
          return (
            <span
              key={index}
              className="absolute grid size-9 place-items-center rounded-full border border-border bg-card/90 shadow-lift backdrop-blur-sm"
              style={{
                top: `${50 + 42 * Math.sin(angle)}%`,
                left: `${50 + 42 * Math.cos(angle)}%`,
                transform: "translate(-50%, -50%)",
                color: item.tint,
              }}
            >
              <motion.span
                animate={reduced ? undefined : { rotate: -360 }}
                transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
                className="grid place-items-center"
              >
                <item.icon className="size-4" />
              </motion.span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * A small ticker of activity for the demand panel: one event at a time, the
 * way a booking desk reads. It uses the live rows, so it can only ever say
 * something the catalogue already says.
 */
function LivePulse({ events }: { events: EventListItem[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = events.length;

  useEffect(() => {
    if (reduced || count === 0) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      4200,
    );
    return () => window.clearInterval(id);
  }, [reduced, count]);

  if (count === 0) {
    return (
      <span className="text-[12px] text-muted-foreground">
        Updated as bookings arrive
      </span>
    );
  }

  const event = events[index % count];

  return (
    <span className="relative flex min-h-5 items-center gap-2 text-[12px] text-muted-foreground">
      <span className="relative grid size-2 place-items-center">
        <span className="tone-open absolute size-1.5 rounded-full" />
        <span className="tone-open absolute size-1.5 animate-halo rounded-full" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${event._id}-${index}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
          className="truncate"
        >
          <span className="tabular-nums">
            {event.seatsTaken}/{event.capacity}
          </span>{" "}
          taken at {event.title}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * The assistant, given the room to explain itself: what it is tuned on, what
 * it will do beyond the catalogue, and a transcript that types itself out of
 * the same records this page reads.
 */
const MEMO_POINTS = [
  {
    icon: Sparkles,
    title: "Tuned on this catalogue",
    copy: "Every programme, event, price, place count, promotion and review is written into the prompt before the model is asked anything, so it quotes the figure that is on the page today.",
  },
  {
    icon: MessageSquare,
    title: "General tasks as well as site questions",
    copy: "Ask for an invitation, a social post, an agenda, a checklist, a comparison, a rewrite, a translation or a calculation. Memo does the work, not just the lookup.",
  },
  {
    icon: Globe,
    title: "Every answer lands back on the site",
    copy: "A general answer ends with the page it belongs on and the step that publishes it — the draft becomes the event description in the admin console, under the programme it belongs to.",
  },
  {
    icon: Zap,
    title: "Built to be quick",
    copy: "The catalogue is read in the same breath as the model call, a repeated question is answered from a cache, a slow model is cut off at twelve seconds, and with no key at all the catalogue still answers by rule.",
  },
];

type MemoExchange = { question: string; answer: string; source: string };

/** One line, typed out the way the dock writes it. */
function TypedLine({ text, speed }: { text: string; speed: number }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced === true) return;
    let shown = 0;
    const id = window.setInterval(() => {
      shown += 1;
      setCount(shown);
      if (shown >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed, reduced]);

  const visible = reduced === true ? text : text.slice(0, count);
  const typing = reduced !== true && count < text.length;

  return (
    <span>
      {visible}
      {typing && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[2px] bg-brand"
        />
      )}
    </span>
  );
}

/**
 * Once the question has been typed, the answer arrives — with the badge that
 * says where it came from, so the panel is honest about which mode it is in.
 */
function MemoTranscript({
  exchange,
  provider,
}: {
  exchange: MemoExchange;
  provider: string | null;
}) {
  const reduced = useReducedMotion();
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (reduced === true) return;
    const id = window.setTimeout(
      () => setAnswered(true),
      Math.min(3400, exchange.question.length * 24 + 600),
    );
    return () => window.clearTimeout(id);
  }, [exchange.question, reduced]);

  const revealed = reduced === true || answered;

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={reduced === true ? undefined : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex justify-end"
      >
        <p className="max-w-[86%] rounded-lg bg-foreground px-3.5 py-2.5 text-[12.5px] leading-6 text-background">
          <TypedLine text={exchange.question} speed={24} />
        </p>
      </motion.div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            key="answer"
            initial={reduced === true ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex justify-start"
          >
            <div className="max-w-[92%] rounded-lg border border-border bg-background px-3.5 py-2.5 text-[12.5px] leading-6">
              <TypedLine text={exchange.answer} speed={9} />
              <span className="mt-2.5 block text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                {provider === null
                  ? exchange.source
                  : `${exchange.source} · ${provider}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemoSection({ events }: { events: EventListItem[] | undefined }) {
  const reduced = useReducedMotion();
  const status = useQuery(api.assistant.status);
  const stats = useQuery(api.insights.overview);
  const [index, setIndex] = useState(0);

  const exchanges = useMemo<MemoExchange[]>(() => {
    const next = (events ?? []).find((event) => event.state !== "past");
    const when = next === undefined ? "" : relativeDay(next.startTime);
    const where = next === undefined ? "" : next.venue;

    return [
      {
        question: "Which event is next, and how many places are left?",
        answer:
          next === undefined
            ? "Nothing is open for booking yet. Publish a programme in the admin console and it appears here within the second — I read the same records this page does, not a copy."
            : `“${next.title}” opens ${when.toLowerCase()} at ${where}, ${priceLabel(next.price).toLowerCase()}. ${next.remaining} of ${next.capacity} places are still open — the event lives at /events/${next.slug}, where a place is held in one click.`,
        source: "Live catalogue",
      },
      {
        question: "Draft a short invitation I can post today.",
        answer:
          next === undefined
            ? "“Our next programme is taking shape — dates land on this page first.” Use that as the programme summary, and the first event you add gives it a date to point at."
            : `“${next.title} — ${when}, ${where}. ${next.remaining} places left, ${priceLabel(next.price).toLowerCase()}. Reserve: /events/${next.slug}” · Drop that into the event description in the admin console and it becomes the copy on the event page and in the programme listing.`,
        source: "Draft, then the next step",
      },
      {
        question: "Give me three lines to send a sponsor.",
        answer:
          stats === undefined
            ? "Three lines are easy once the report is open — the figures come straight from the platform report at /report."
            : `${stats.events.upcoming} events are still to come across ${stats.programmes.count} programmes, ${stats.events.occupancy}% of places are already taken, and the room averages ${stats.reviews.average ?? "—"}/5 across ${stats.reviews.count} reviews. Sponsorship runs in four tiers, Community to Lead partner — a pledge lands on the programme page under /programmes.`,
        source: "General task",
      },
    ];
  }, [events, stats]);

  useEffect(() => {
    if (reduced === true) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % exchanges.length),
      13000,
    );
    return () => window.clearInterval(id);
  }, [reduced, exchanges.length]);

  const configured = status?.configured ?? false;
  const exchange = exchanges[index % exchanges.length];

  function askMemo(question?: string) {
    celebrate({ count: 26 });
    window.dispatchEvent(
      new CustomEvent(MEMO_OPEN_EVENT, { detail: { question } }),
    );
  }

  return (
    <section id="assistant" className="scroll-mt-24 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <SectionHeading
          eyebrow="The assistant"
          title="Memo — a model tuned on this catalogue, and on everything around it."
          description="Grounded in the same records the pages read, comfortable with an ordinary task, and always finishing on the page where the answer belongs."
          action={
            <Magnetic pull={0.12}>
              <Button
                type="button"
                size="lg"
                className="h-11 gap-2 rounded-full px-6 text-[14px]"
                onClick={() => askMemo()}
              >
                <Sparkles className="size-4" />
                Ask Memo now
              </Button>
            </Magnetic>
          }
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.92fr] lg:gap-14">
          <div className="space-y-7">
            {MEMO_POINTS.map((point, order) => (
              <motion.div
                key={point.title}
                initial={reduced === true ? undefined : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  delay: order * 0.08,
                  ease: EASE,
                }}
                className="group flex gap-4 border-t border-border pt-6"
              >
                <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-dashed border-brand-line"
                    animate={reduced === true ? undefined : { rotate: 360 }}
                    transition={{
                      duration: 26,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <span className="icon-chip group-hover:scale-110">
                    <point.icon className="size-4" />
                  </span>
                </span>
                <div>
                  <h3 className="text-[15px] font-medium tracking-[-0.015em]">
                    {point.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-[13px] leading-6 text-muted-foreground">
                    {point.copy}
                  </p>
                </div>
              </motion.div>
            ))}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="relative grid size-2 place-items-center">
                  <span
                    className={cn(
                      "absolute size-1.5 rounded-full",
                      configured ? "tone-open" : "bg-warm",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute size-1.5 animate-halo rounded-full",
                      configured ? "tone-open" : "bg-warm",
                    )}
                  />
                </span>
                {status === undefined
                  ? "Checking the model key…"
                  : configured
                    ? `Answering with ${status.provider}${status.model === null ? "" : ` · ${status.model}`}`
                    : "Catalogue mode — the rule-based brain answers until a model key is added"}
              </span>
              <span>Signed out is fine. Keep a conversation across pages.</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="relative grid size-9 place-items-center">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-dashed border-brand-line"
                    animate={reduced === true ? undefined : { rotate: -360 }}
                    transition={{
                      duration: 18,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <Sparkles className="size-4 text-brand" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium tracking-[-0.012em]">
                    Memo, on the landing page
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Three exchanges, typed from the live records.
                  </p>
                </div>
              </div>

              <div className="min-h-[13.5rem] px-5 py-5">
                <MemoTranscript
                  key={index}
                  exchange={exchange}
                  provider={configured ? (status?.provider ?? null) : null}
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {exchanges.map((item, dot) => (
                    <button
                      key={item.question}
                      type="button"
                      aria-label={item.question}
                      onClick={() => setIndex(dot)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        dot === index % exchanges.length
                          ? "w-6 bg-brand"
                          : "w-1.5 bg-border hover:bg-brand-line",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => askMemo(exchange.question)}
                  className="group inline-flex items-center gap-1.5 text-[12px] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  Ask this for real
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="label-eyebrow">Try one of these</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {exchanges.map((item) => (
                  <Magnetic key={item.question} pull={0.06}>
                    <button
                      type="button"
                      onClick={() => askMemo(item.question)}
                      className="chip chip-tinted chip-cool text-left"
                    >
                      {item.question}
                    </button>
                  </Magnetic>
                ))}
              </div>
              <p className="mt-5 text-[12px] leading-6 text-muted-foreground">
                Memo opens in the corner of the page, keeps the thread while you
                browse, and answers from the same records the catalogue prints —
                a price you were quoted is a price on an event page.
              </p>
            </div>{" "}
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="label-eyebrow">Bring your own model</p>
              <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
                Memo runs on the platform's built-in model with nothing to
                configure. Adding your own key is a choice, not a requirement:{" "}
                <code className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                  GROQ_API_KEY
                </code>
                ,{" "}
                <code className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                  GEMINI_API_KEY
                </code>{" "}
                or{" "}
                <code className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                  OPENAI_API_KEY
                </code>{" "}
                in the project's Keys tab takes over the moment it is present.
              </p>
              <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
                Point{" "}
                <code className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                  ASSISTANT_MODEL
                </code>{" "}
                at a fine-tune trained on your own programmes, venues and tone
                and that model answers instead — the grounding, the cache, the
                twelve-second ceiling and the catalogue fallback all stay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The report band: the same aggregate pass the assistant is grounded on, laid
 * out as a document of its own. It sits at the foot of the page because the
 * numbers are the point here, not the pitch.
 */
function ReportBand() {
  const reduced = useReducedMotion();
  const stats = useQuery(api.insights.overview);

  return (
    <section
      id="report"
      className="relative scroll-mt-24 overflow-hidden border-t border-border"
    >
      <div
        aria-hidden="true"
        className="glow-soft pointer-events-none absolute inset-x-0 top-0 h-72"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Rise>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-hairline">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
              <div>
                <p className="label-eyebrow text-brand">Platform report</p>
                <h2 className="mt-4 font-display text-[22px] leading-[1.2] tracking-[-0.01em] text-balance sm:text-[28px]">
                  Every figure on this platform, in one document.
                </h2>
                <p className="mt-5 max-w-xl text-[14px] leading-7 text-muted-foreground">
                  Places sold and still open, occupancy, revenue by rail,
                  sponsorship against its four tiers, promotions in flight and
                  what the room rated — read straight from the live records, on
                  one page, ready to print or save as a PDF.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Magnetic pull={0.12}>
                    <Button
                      asChild
                      size="lg"
                      className="sheen h-11 gap-2 rounded-full px-6 text-[14px]"
                    >
                      <Link to="/report">
                        <FileText className="size-4" />
                        Open the report
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </Magnetic>
                  <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Printer className="size-3.5" />
                    Prints to A4, or saves as a PDF
                  </span>
                </div>
              </div>

              <Float y={5} duration={14}>
                <div className="rounded-lg border border-border bg-background p-6">
                  <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                    <span className="label-eyebrow inline-flex items-center gap-2">
                      <motion.span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-brand"
                        animate={
                          reduced === true
                            ? undefined
                            : { opacity: [1, 0.25, 1], scale: [1, 1.5, 1] }
                        }
                        transition={{ duration: 2.6, repeat: Infinity }}
                      />
                      Generated live
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {stats === undefined
                        ? "Reading the records…"
                        : `Updated ${new Date(stats.generatedAt).toLocaleString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}`}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7">
                    <Stat count={stats?.programmes.count} label="Programmes" />
                    <Stat
                      count={stats?.events.upcoming}
                      label="Events to come"
                    />
                    <Stat count={stats?.money.placesSold} label="Places sold" />
                    <Stat
                      count={stats?.events.placesLeft}
                      label="Places still open"
                    />
                    <div className="flex flex-col gap-1.5">
                      <span className="font-display text-[24px] leading-none tabular-nums">
                        {stats === undefined
                          ? "—"
                          : formatMoney(stats.money.collected)}
                      </span>
                      <span className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        Collected so far
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-display text-[24px] leading-none tabular-nums">
                        {stats === undefined || stats.reviews.average === null
                          ? "—"
                          : `${stats.reviews.average}/5`}
                      </span>
                      <span className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        From {stats?.reviews.count ?? "—"} reviews
                      </span>
                    </div>
                  </div>

                  <p className="mt-6 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
                    Aggregate figures only — no customer names, emails or
                    references leave the platform.
                  </p>
                </div>
              </Float>
            </div>
          </div>
        </Rise>
      </div>
    </section>
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

  // The hero waits for the opening sequence to part before it arrives.
  const [heroDelay] = useState(() =>
    introPlays() ? INTRO_PART_MS / 1000 - 0.2 : 0,
  );

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
          <ParticleField className="inset-x-[-6%] top-[-4rem] h-[calc(100%+6rem)] w-[112%] opacity-80" />
          <FloatingObjects />
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
                <h1 className="mt-8 text-[30px] leading-[1.14] font-light tracking-[-0.015em] text-balance sm:text-[40px]">
                  <SplitWords
                    text="Find your next event, and"
                    delay={heroDelay}
                  />{" "}
                  <em className="font-display font-normal italic">
                    <Swash>book it</Swash>
                  </em>{" "}
                  <SplitWords text="in a minute." delay={heroDelay + 0.38} />
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
                  <Magnetic>
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
                  </Magnetic>
                  <Magnetic pull={0.08}>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-11 rounded-full border-border px-6 text-[14px] shadow-none"
                    >
                      <Link to="/admin">For businesses</Link>
                    </Button>
                  </Magnetic>
                </div>
              </Reveal>

              <Reveal delay={0.26}>
                <div className="mt-14 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4">
                  <Stat count={programmes?.length} label="Programmes" />
                  <Stat count={events?.length} label="Events" />
                  <Stat
                    count={loaded ? totalCapacity : undefined}
                    label="Places"
                  />
                  <Stat
                    count={loaded ? totalBooked : undefined}
                    label="Booked"
                  />
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
                <OrbitCluster />
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

          {/* A quiet cue that the page keeps going, for anyone who needs it. */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: heroDelay + 1.4, duration: 0.9 }}
            className="pointer-events-none absolute inset-x-0 bottom-4 hidden justify-center lg:flex"
          >
            <span className="flex flex-col items-center gap-2 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
              Scroll
              <span className="relative block h-10 w-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-x-0 top-0 h-4 bg-brand"
                  animate={reduced ? undefined : { y: [-18, 44] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </span>
            </span>
          </motion.div>
        </section>

        <Marquee words={marqueeWords} />
        <Marquee words={VOICES} reverse tone="plum" />

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
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-70px" }}
                  transition={{
                    duration: 0.7,
                    delay: index * 0.09,
                    ease: EASE,
                  }}
                  className="h-full"
                >
                  <SpotlightCard
                    tint={tintOf(role.tint)}
                    className="h-full rounded-lg border border-border bg-card p-6 shadow-hairline"
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <motion.span
                          whileHover={
                            reduced
                              ? undefined
                              : { rotate: [0, -8, 6, 0], scale: 1.08 }
                          }
                          transition={{ duration: 0.5 }}
                          className={cn("icon-chip", role.tint)}
                        >
                          <role.icon className="size-4" />
                        </motion.span>
                        <h3 className="mt-5 text-[17px] font-medium tracking-[-0.02em]">
                          {role.title}
                        </h3>
                        <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                          {role.copy}
                        </p>
                      </div>
                      <Magnetic pull={0.08}>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="group mt-7 h-9 w-fit gap-1.5 rounded-full border-border px-4 text-[13px] shadow-none"
                        >
                          <Link to={role.to}>
                            {role.cta}
                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </Button>
                      </Magnetic>
                    </div>
                  </SpotlightCard>
                </motion.div>
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
                    <ProgrammeCard key={programme._id} programme={programme} />
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
            {/* One rule is drawn across the four steps, then each node pops in
                behind it, so the order is legible before any copy is read. */}
            <div className="relative mt-12">
              <motion.span
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.2, ease: EASE }}
                className="absolute inset-x-0 top-[7px] hidden h-px origin-left bg-gradient-to-r from-brand/60 via-border to-border lg:block"
              />
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {FLOW.map((step, index) => (
                  <Rise key={step.index} delay={index * 0.08}>
                    <div className="group relative">
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 18,
                          delay: 0.15 + index * 0.16,
                        }}
                        className="relative z-10 grid size-[15px] place-items-center rounded-full border border-border bg-background"
                      >
                        <span className="size-1.5 rounded-full bg-brand transition-transform duration-500 ease-quint group-hover:scale-150" />
                      </motion.span>
                      <span className="font-display mt-5 block text-[15px] text-brand tabular-nums">
                        {step.index}
                      </span>
                      <h3 className="mt-2 text-[17px] font-medium tracking-[-0.02em]">
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
          </div>
        </section>

        {/* The assistant */}
        <MemoSection events={events} />

        {/* For businesses */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
              <div>
                <p className="label-eyebrow">For businesses</p>
                <h2 className="mt-3 text-[20px] leading-[1.35] font-normal tracking-[-0.01em] text-balance sm:text-[24px]">
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
                <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
                  <LivePulse events={mostInDemand} />
                  <Link
                    to="/programmes"
                    className="text-[12px] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
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
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  feature={feature}
                  index={index}
                />
              ))}
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-3">
              <span className="label-eyebrow mr-1 text-brand">Also inside</span>
              {PAYMENT_OPTIONS.slice(0, 4).map((option, index) => (
                <Magnetic key={option.name} pull={0.07}>
                  <span
                    className={cn(
                      "chip chip-tinted",
                      index % 3 === 0
                        ? "chip-cool"
                        : index % 3 === 1
                          ? "chip-warm"
                          : "chip-plum",
                    )}
                  >
                    {option.name}
                  </span>
                </Magnetic>
              ))}
              {PAYMENT_OPTIONS.length > 4 && (
                <span className="text-[12px] text-muted-foreground">
                  and {PAYMENT_OPTIONS.length - 4} more at the desk
                </span>
              )}
            </div>

            <FactStrip />

            <CometRail items={EASTER_EGGS} />
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
          <FloatingObjects />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <motion.h2
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", stiffness: 170, damping: 20 }}
              className="font-display mx-auto max-w-3xl text-[26px] leading-[1.18] tracking-[-0.008em] text-balance sm:text-[34px]"
            >
              Take your place in <em className="italic">under a minute</em>.
            </motion.h2>
            <p className="mx-auto mt-6 max-w-xl text-[14px] leading-7 text-muted-foreground">
              Create an account once, and every booking after it takes two
              fields and a click.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Magnetic>
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
              </Magnetic>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-11 rounded-full px-6 text-[14px]"
              >
                <Link to="/events">Keep browsing</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[12px] text-muted-foreground">
              <button
                type="button"
                onClick={() => celebrate({ count: 96 })}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 transition-colors hover:border-foreground/25 hover:text-foreground"
              >
                <motion.span
                  aria-hidden="true"
                  animate={
                    reduced
                      ? undefined
                      : { rotate: [0, 20, -14, 0], scale: [1, 1.15, 1] }
                  }
                  transition={{
                    duration: 3.4,
                    repeat: Infinity,
                    repeatDelay: 1.6,
                  }}
                  className="text-warm"
                >
                  ✦
                </motion.span>
                Toss some confetti
              </button>
              <span>
                or spell{" "}
                <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] tracking-[0.14em]">
                  memorius
                </kbd>{" "}
                anywhere on the page
              </span>
            </div>
          </div>
        </section>
        {/* The report, at the foot of the page */}
        <ReportBand />
      </main>

      <SiteFooter />
    </div>
  );
}
