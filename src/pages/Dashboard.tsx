import { PreferencesMenu } from "@/components/site/PreferencesMenu";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useEnsureSeeded } from "@/hooks/use-seed";
import {
  dayParts,
  errorMessage,
  formatLongDate,
  formatMoney,
  formatTimeRange,
  initials,
  paymentMethodLabel,
  paymentTone,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { useProfile } from "@/hooks/use-profile";
import type { Persona } from "@/lib/types";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CreditCard,
  Handshake,
  LogOut,
  Package,
  Ticket,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import type { ParticipantCategory } from "@/lib/types";

interface BookingEvent {
  _id: Id<"events">;
  slug: string;
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  price: number;
  /** The policy the customer agreed to when they took the place. */
  cancellationFee: number;
  cancellationWindowHours: number;
  freeCancellationUntil: number | null;
}

interface BookingRow {
  _id: Id<"registrations">;
  status: "confirmed" | "waitlisted" | "cancelled" | "declined";
  participantCategory: ParticipantCategory | null;
  cancellationFee: number | null;
  checkedInAt: number | null;
  decidedAt: number | null;
  decisionNote: string | null;
  paymentStatus: "paid" | "due" | "waived";
  amountPaid: number;
  reference: string;
  upcoming: boolean;
  event: BookingEvent | null;
  fest: { name: string } | null;
}

const STATUS_LABEL: Record<BookingRow["status"], string> = {
  confirmed: "Confirmed",
  waitlisted: "Waiting list",
  cancelled: "Released",
  declined: "Not confirmed",
};

const STATUS_TONE: Record<BookingRow["status"], string> = {
  confirmed: "tone-open",
  waitlisted: "tone-few",
  cancelled: "tone-muted",
  declined: "tone-muted",
};

/** What the customer called themselves when they booked. */
const CATEGORY_LABEL: Record<ParticipantCategory, string> = {
  delegate: "Delegate",
  student: "Student",
  speaker: "Speaker",
  press: "Press",
  volunteer: "Volunteer",
  guest: "Guest",
  staff: "Staff",
};

const PERSONA_COPY: Record<
  Persona,
  { title: string; copy: string; cta: string; to: string }
> = {
  organizer: {
    title: "You are set up as an organizer",
    copy: "Publish programmes, add events, list merchandise and snacks, and watch every booking, order and pledge arrive on one revenue screen.",
    cta: "Open the console",
    to: "/admin",
  },
  participant: {
    title: "You are set up as a participant",
    copy: "Book places, add merchandise or snacks to your basket, and leave a review once you have been in the room.",
    cta: "Browse the catalogue",
    to: "/events",
  },
  sponsor: {
    title: "You are set up as a sponsor",
    copy: "Back a programme or a single event in one of four tiers. Every pledge you make appears below and in the organizer console.",
    cta: "Find a programme to back",
    to: "/programmes",
  },
};

function Dot({ className }: { className: string }) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", className)}
      aria-hidden="true"
    />
  );
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const cancelBooking = useMutation(api.registrations.cancel);
  const settle = useMutation(api.registrations.settle);
  const event = booking.event;
  if (event === null) return null;

  const released = booking.status === "cancelled";
  const parts = dayParts(event.startTime);
  // What releasing the place would cost if it were done right now. The policy
  // is quoted from the event, and the moment it stops being free is decided by
  // the server, not by this screen's clock.
  const late = event.freeCancellationUntil !== null && Date.now() > event.freeCancellationUntil;
  const feeNow = late ? event.cancellationFee : 0;
  const feeCharged = booking.cancellationFee ?? 0;

  return (
    <div className="group row-marker relative grid grid-cols-[auto_1fr] items-start gap-5 border-b border-border py-5 pr-1 pl-1 transition-colors duration-300 ease-soft hover:bg-accent/40 sm:grid-cols-[auto_1fr_auto] sm:gap-7">
      <div className="flex w-14 flex-col items-center rounded-md border border-border bg-card py-2.5 transition-[border-color,box-shadow] duration-300 ease-soft group-hover:border-foreground/15 group-hover:shadow-hairline sm:w-16">
        <span className="text-[10px] leading-none font-medium tracking-[0.14em] text-muted-foreground tabular-nums">
          {parts.month}
        </span>
        <span className="font-display mt-1 text-[24px] leading-none tabular-nums">
          {parts.day}
        </span>
        <span className="mt-1 text-[10px] leading-none tracking-[0.1em] text-muted-foreground">
          {parts.weekday}
        </span>
      </div>

      <div className="min-w-0">
        <Link
          to={`/events/${event.slug}`}
          className="link-quiet text-[15px] font-medium tracking-[-0.012em]"
        >
          {event.title}
        </Link>
        <p className="mt-1.5 truncate text-[13px] text-muted-foreground">
          {booking.fest?.name}
          <span className="px-1.5 text-border">·</span>
          {event.venue}
          <span className="px-1.5 text-border">·</span>
          <span className="tabular-nums">
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span
            className={cn(
              "flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase",
              released ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <Dot className={STATUS_TONE[booking.status]} />
            {STATUS_LABEL[booking.status]}
          </span>
          <span className="flex items-center gap-2 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            <Dot className={paymentTone[booking.paymentStatus]} />
            {booking.paymentStatus === "paid"
              ? `${formatMoney(booking.amountPaid)} paid`
              : "No charge"}
          </span>
          <span className="font-display text-[12px] tracking-[0.05em] text-muted-foreground">
            {booking.reference}
          </span>
          <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {CATEGORY_LABEL[booking.participantCategory ?? "guest"]}
          </span>
          {booking.checkedInAt !== null && (
            <span className="flex items-center gap-2 text-[11px] tracking-[0.08em] text-foreground uppercase">
              <Dot className="tone-open" />
              Checked in
            </span>
          )}
          {booking.cancellationFee !== null && booking.cancellationFee > 0 && (
            <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase tabular-nums">
              {formatMoney(booking.cancellationFee)} cancellation fee
            </span>
          )}
        </div>

        {booking.decisionNote !== null && (
          <p className="mt-3 max-w-xl rounded-md border border-dashed border-border px-3.5 py-2.5 text-[12.5px] leading-6 text-muted-foreground">
            From the organizer: {booking.decisionNote}
          </p>
        )}
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
        {!released && booking.paymentStatus === "due" && (
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3.5 text-[12px]"
            onClick={async () => {
              try {
                await settle({ registrationId: booking._id });
                toast.success("Balance cleared", {
                  description: `Places are free — nothing is owed on ${booking.reference}.`,
                });
              } catch (error) {
                toast.error(errorMessage(error));
              }
            }}
          >
            <CreditCard className="size-3.5" />
            Clear the balance
          </Button>
        )}
        {!released && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-[12px] text-muted-foreground"
              >
                Cancel
              </Button>
            </AlertDialogTrigger>              <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your place is offered to the next customer on the waiting
                  list. You can book again while places remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {feeNow > 0 ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[12.5px] leading-6 text-destructive">
                  This is a late release: {formatMoney(feeNow)} is recorded
                  against {booking.reference}. Releasing was free until{" "}
                  {event.freeCancellationUntil === null
                    ? "the event started"
                    : formatLongDate(event.freeCancellationUntil)}{" "}
                  — {event.cancellationWindowHours} hours before the start.
                </p>
              ) : event.cancellationFee > 0 ? (
                <p className="rounded-md border border-border px-3.5 py-2.5 text-[12.5px] leading-6 text-muted-foreground">
                  Nothing is charged: releasing a place is free until{" "}
                  {event.freeCancellationUntil === null
                    ? "the event starts"
                    : formatLongDate(event.freeCancellationUntil)}{" "}
                  ({event.cancellationWindowHours} hours before the start).
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Keep booking</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      const result = await cancelBooking({
                        registrationId: booking._id,
                      });
                      toast.success("Place released", {
                        description:
                          result.fee > 0
                            ? `${formatMoney(result.fee)} is recorded as a cancellation fee on ${booking.reference}.`
                            : "Nothing was charged.",
                      });
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  }}
                >
                  {feeNow > 0 ? "Release and accept the fee" : "Release the place"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
        >
          <Link to={`/events/${event.slug}`}>
            Open
            <ArrowUpRight className="size-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[26px] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

export default function Dashboard() {
  useEnsureSeeded();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const bookings = useQuery(api.registrations.mine);
  const { persona } = useProfile();
  const sponsorships = useQuery(api.sponsorships.mine);
  const orders = useQuery(api.shop.mine);
  const role = PERSONA_COPY[persona];
  const roleIcon =
    persona === "organizer" ? (
      <Building2 className="size-4" />
    ) : persona === "sponsor" ? (
      <Handshake className="size-4" />
    ) : (
      <Ticket className="size-4" />
    );

  const rows: BookingRow[] = bookings ?? [];
  const upcoming = rows.filter(
    (row) => row.upcoming && row.status !== "cancelled",
  );
  const settled = rows.filter(
    (row) => !row.upcoming || row.status === "cancelled",
  );
  const held = rows.filter((row) => row.status === "confirmed").length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-24 sm:px-8 sm:pt-16">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-10">
            <div>
              <p className="label-eyebrow">Your account</p>
              <h1 className="mt-4 text-[26px] leading-[1.2] font-light tracking-[-0.015em] sm:text-[32px]">
                Your bookings
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-muted-foreground">
                Everything you have booked, the references you need at the
                door, and nothing to pay — every place on the platform is free.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip chip-tinted hidden capitalize sm:inline-flex">
                {persona}
              </span>
              <span className="hidden items-center gap-2.5 rounded-full border border-border py-1.5 pr-4 pl-1.5 sm:flex">
                <span className="grid size-7 place-items-center rounded-full bg-foreground text-[10px] font-medium text-background">
                  {initials(user?.name ?? user?.email ?? "")}
                </span>
                <span className="max-w-[160px] truncate text-[12px] text-muted-foreground">
                  {user?.email ?? "Signed in"}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-4 text-[13px] shadow-none"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-8 border-b border-border py-10 sm:grid-cols-3">
            <StatBlock
              value={bookings === undefined ? "—" : String(upcoming.length)}
              label="Ahead of you"
            />
            <StatBlock
              value={bookings === undefined ? "—" : String(settled.length)}
              label="Finished or released"
            />
            <StatBlock
              value={bookings === undefined ? "—" : String(held)}
              label="Places held"
            />
          </div>

          <section className="mt-10 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-lg border border-border card-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="icon-chip shrink-0">{roleIcon}</span>
                  <div>
                    <p className="text-[14px] font-medium tracking-[-0.012em]">
                      {role.title}
                    </p>
                    <p className="mt-1.5 max-w-lg text-[12.5px] leading-6 text-muted-foreground">
                      {role.copy}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-full border-border px-4 text-[13px] shadow-none"
                >
                  <Link to={role.to}>
                    {role.cta}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <p className="label-eyebrow">Prices and appearance</p>
              <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">
                Every amount on the site is quoted in your market, and the
                appearance you choose follows you here.
              </p>
              <div className="mt-4">
                <PreferencesMenu />
              </div>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                Ahead of you
              </p>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {upcoming.length}{" "}
                {upcoming.length === 1 ? "booking" : "bookings"}
              </span>
            </div>

            {bookings === undefined ? (
              <div className="space-y-4 py-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="py-16 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-full border border-border">
                  <CalendarDays className="size-4 text-muted-foreground" />
                </span>
                <p className="mt-5 text-[15px] font-medium tracking-[-0.012em]">
                  Nothing booked yet
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
                  Find an event in the catalogue, take a place, and it will
                  appear here with its reference.
                </p>
                <Button
                  asChild
                  className="mt-6 h-9 rounded-full px-5 text-[13px]"
                >
                  <Link to="/events">
                    <Ticket className="size-3.5" />
                    Browse the catalogue
                  </Link>
                </Button>
              </div>
            ) : (
              upcoming.map((row) => <BookingCard key={row._id} booking={row} />)
            )}
          </section>

          {settled.length > 0 && (
            <section className="mt-16">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  Past and released
                </p>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {settled.length}
                </span>
              </div>
              {settled.map((row) => (
                <BookingCard key={row._id} booking={row} />
              ))}
            </section>
          )}
          {sponsorships !== undefined && sponsorships.length > 0 && (
            <section className="mt-16">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  Sponsorships you have pledged
                </p>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {sponsorships.length}
                </span>
              </div>
              <ul>
                {sponsorships.map((row) => (
                  <li
                    key={row._id}
                    className="row-marker relative flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 pl-1 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium tracking-[-0.012em]">
                        {row.company}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {row.programmeName}
                        {row.eventTitle !== null && (
                          <>
                            <span className="px-1.5 text-border">·</span>
                            {row.eventTitle}
                          </>
                        )}
                        <span className="px-1.5 text-border">·</span>
                        {paymentMethodLabel(row.paymentMethod)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "chip",
                          row.status === "paid"
                            ? "chip-tinted"
                            : row.status === "confirmed"
                              ? "chip-cool"
                              : "chip-warm",
                        )}
                      >
                        {row.status === "paid"
                          ? "Paid"
                          : row.status === "confirmed"
                            ? "Confirmed"
                            : "Pledged"}
                      </span>
                      <span className="font-display text-[16px] tabular-nums">
                        {formatMoney(row.amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {orders !== undefined && orders.length > 0 && (
            <section className="mt-16">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  Merchandise and snacks you ordered
                </p>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {orders.length}
                </span>
              </div>
              <ul>
                {orders.map((order) => (
                  <li
                    key={order._id}
                    className="row-marker relative flex flex-wrap items-start justify-between gap-4 border-b border-border py-4 pl-1 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <Package className="size-3.5 shrink-0 text-muted-foreground" />
                        <Link
                          to={`/events/${order.eventSlug}`}
                          className="link-quiet text-[14px] font-medium tracking-[-0.012em]"
                        >
                          {order.eventTitle}
                        </Link>
                      </div>
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        {order.items
                          .map((line) => `${line.quantity} × ${line.name}`)
                          .join(", ")}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {order.reference}
                        <span className="px-1.5 text-border">·</span>
                        {paymentMethodLabel(order.paymentMethod)}
                        <span className="px-1.5 text-border">·</span>
                        {order.paymentStatus === "paid"
                          ? "Settled"
                          : "Pay on collection"}
                      </p>
                    </div>
                    <span className="font-display text-[16px] tabular-nums">
                      {formatMoney(order.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
