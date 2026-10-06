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
  formatMoney,
  formatTimeRange,
  initials,
  paymentTone,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  LogOut,
  Ticket,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

interface BookingEvent {
  _id: Id<"events">;
  slug: string;
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  price: number;
}

interface BookingRow {
  _id: Id<"registrations">;
  status: "confirmed" | "waitlisted" | "cancelled";
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
};

const STATUS_TONE: Record<BookingRow["status"], string> = {
  confirmed: "bg-emerald-600",
  waitlisted: "bg-amber-500",
  cancelled: "bg-stone-300",
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
            {booking.paymentStatus === "waived"
              ? "No charge"
              : booking.paymentStatus === "paid"
                ? `${formatMoney(booking.amountPaid)} paid`
                : `${formatMoney(event.price)} due`}
          </span>
          <span className="font-display text-[12px] tracking-[0.05em] text-muted-foreground">
            {booking.reference}
          </span>
        </div>
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
        {!released && booking.paymentStatus === "due" && (
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3.5 text-[12px]"
            onClick={async () => {
              try {
                await settle({ registrationId: booking._id });
                toast.success("Balance settled", {
                  description: `${formatMoney(event.price)} recorded against ${booking.reference}.`,
                });
              } catch (error) {
                toast.error(errorMessage(error));
              }
            }}
          >
            <CreditCard className="size-3.5" />
            Pay {formatMoney(event.price)}
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
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your place is offered to the next customer on the waiting
                  list. You can book again while places remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep booking</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await cancelBooking({ registrationId: booking._id });
                      toast.success("Booking cancelled");
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  }}
                >
                  Cancel booking
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

  const rows: BookingRow[] = bookings ?? [];
  const upcoming = rows.filter(
    (row) => row.upcoming && row.status !== "cancelled",
  );
  const settled = rows.filter(
    (row) => !row.upcoming || row.status === "cancelled",
  );
  const balance = rows
    .filter((row) => row.status !== "cancelled" && row.paymentStatus === "due")
    .reduce((sum, row) => sum + (row.event?.price ?? 0), 0);
  const held = rows.filter((row) => row.status === "confirmed").length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-24 sm:px-8 sm:pt-16">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-10">
            <div>
              <p className="label-eyebrow">Your account</p>
              <h1 className="mt-4 text-[32px] leading-[1.06] font-medium tracking-[-0.035em] sm:text-[38px]">
                Your bookings
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-muted-foreground">
                Everything you have booked, what is still to pay, and the
                references you need at the door.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
              value={bookings === undefined ? "—" : formatMoney(balance)}
              label="Balance outstanding"
            />
            <StatBlock
              value={bookings === undefined ? "—" : String(held)}
              label="Places held"
            />
          </div>

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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
