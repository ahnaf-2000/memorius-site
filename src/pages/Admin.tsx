import { ConsoleCampaigns } from "@/components/site/ConsoleCampaigns";
import { ConsoleReviews } from "@/components/site/ConsoleReviews";
import { ConsoleRevenue } from "@/components/site/ConsoleRevenue";
import { ConsoleShop } from "@/components/site/ConsoleShop";
import { ConsoleSponsorships } from "@/components/site/ConsoleSponsorships";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useEnsureSeeded } from "@/hooks/use-seed";
import {
  dayParts,
  errorMessage,
  formatDateRange,
  formatMoney,
  formatTimeRange,
  fromDateTimeInput,
  initials,
  paymentTone,
  relativeDay,
  toDateTimeInput,
} from "@/lib/format";
import type {
  BusinessBookingView,
  GuestView,
  ProgrammeListItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Cog,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

/* ------------------------------------------------------------------ fields */

const inputClass = "h-10 bg-background shadow-none";

function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function nextWeekAt(hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(hour, 0, 0, 0);
  return toDateTimeInput(date.getTime());
}

function Dot({ className }: { className: string }) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", className)}
      aria-hidden="true"
    />
  );
}

/* ----------------------------------------------------------- new programme */

function CreateProgrammeDialog() {
  const createProgramme = useMutation(api.fests.create);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    organization: "",
    name: "",
    venue: "",
    summary: "",
    startDate: nextWeekAt(9),
    endDate: nextWeekAt(17),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startDate = fromDateTimeInput(form.startDate);
    const endDate = fromDateTimeInput(form.endDate);
    if (startDate === null || endDate === null) {
      setError("Add a start and end date for the programme.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createProgramme({
        organization: form.organization,
        name: form.name,
        venue: form.venue,
        summary: form.summary,
        startDate,
        endDate,
      });
      toast.success("Programme created", {
        description: "Add its first event to open booking.",
      });
      setOpen(false);
      setForm({
        organization: "",
        name: "",
        venue: "",
        summary: "",
        startDate: nextWeekAt(9),
        endDate: nextWeekAt(17),
      });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5 rounded-full px-4 text-[13px]">
          <Plus className="size-3.5" />
          New programme
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            New programme
          </DialogTitle>
          <DialogDescription>
            A programme is the season that holds your events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="organization" label="Business">
            <Input
              id="organization"
              required
              value={form.organization}
              onChange={(event) =>
                setForm({ ...form, organization: event.target.value })
              }
              placeholder="Meridian Group"
              className={inputClass}
            />
          </FormField>
          <FormField id="name" label="Programme name">
            <Input
              id="name"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Operations Summit 2026"
              className={inputClass}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="startDate" label="Starts">
              <Input
                id="startDate"
                type="datetime-local"
                required
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField id="endDate" label="Ends">
              <Input
                id="endDate"
                type="datetime-local"
                required
                value={form.endDate}
                onChange={(event) =>
                  setForm({ ...form, endDate: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField id="venue" label="Venue">
            <Input
              id="venue"
              value={form.venue}
              onChange={(event) =>
                setForm({ ...form, venue: event.target.value })
              }
              placeholder="Meridian House, 42 Finsbury Square"
              className={inputClass}
            />
          </FormField>
          <FormField id="summary" label="One-line summary">
            <Textarea
              id="summary"
              rows={2}
              value={form.summary}
              onChange={(event) =>
                setForm({ ...form, summary: event.target.value })
              }
              placeholder="What the programme is for, in a sentence."
              className="bg-background shadow-none"
            />
          </FormField>
          {error !== null && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="rounded-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Publish programme
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- new event */

function AddEventDialog({ festId }: { festId: Id<"fests"> }) {
  const createEvent = useMutation(api.events.create);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "Session",
    venue: "",
    host: "",
    capacity: "40",
    price: "0",
    summary: "",
    description: "",
    startTime: nextWeekAt(9),
    endTime: nextWeekAt(12),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startTime = fromDateTimeInput(form.startTime);
    const endTime = fromDateTimeInput(form.endTime);
    if (startTime === null || endTime === null) {
      setError("Add a start and end time for the event.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createEvent({
        festId,
        title: form.title,
        category: form.category,
        venue: form.venue,
        host: form.host,
        capacity: Number(form.capacity) || 1,
        price: Math.round(Number(form.price || 0) * 100),
        summary: form.summary,
        description: form.description,
        startTime,
        endTime,
      });
      toast.success("Event published", { description: form.title });
      setOpen(false);
      setForm({ ...form, title: "", summary: "", description: "" });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3.5 text-[12px] shadow-none"
        >
          <Plus className="size-3.5" />
          Add event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            Add an event
          </DialogTitle>
          <DialogDescription>
            Booking opens as soon as the event is published.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="title" label="Event title">
            <Input
              id="title"
              required
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Supply Chain Resilience Forum"
              className={inputClass}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="category" label="Category">
              <Input
                id="category"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                placeholder="Forum"
                className={inputClass}
              />
            </FormField>
            <FormField id="capacity" label="Places">
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) =>
                  setForm({ ...form, capacity: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField id="price" label="Price per place">
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="startTime" label="Starts">
              <Input
                id="startTime"
                type="datetime-local"
                required
                value={form.startTime}
                onChange={(event) =>
                  setForm({ ...form, startTime: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField id="endTime" label="Ends">
              <Input
                id="endTime"
                type="datetime-local"
                required
                value={form.endTime}
                onChange={(event) =>
                  setForm({ ...form, endTime: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="venue" label="Venue">
              <Input
                id="venue"
                required
                value={form.venue}
                onChange={(event) =>
                  setForm({ ...form, venue: event.target.value })
                }
                placeholder="Main Hall, Meridian House"
                className={inputClass}
              />
            </FormField>
            <FormField id="host" label="Host">
              <Input
                id="host"
                value={form.host}
                onChange={(event) =>
                  setForm({ ...form, host: event.target.value })
                }
                placeholder="Operations Faculty"
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField id="summary" label="Summary">
            <Textarea
              id="summary"
              rows={2}
              value={form.summary}
              onChange={(event) =>
                setForm({ ...form, summary: event.target.value })
              }
              placeholder="One sentence for the catalogue."
              className="bg-background shadow-none"
            />
          </FormField>
          <FormField id="description" label="Description">
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="What happens on the day, and what to bring."
              className="bg-background shadow-none"
            />
          </FormField>
          {error !== null && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="rounded-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Publish event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------- guest list */

function GuestsDialog({
  eventId,
  title,
}: {
  eventId: Id<"events">;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const guests = useQuery(
    api.registrations.forEvent,
    open ? { eventId } : "skip",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
        >
          <Users className="size-3.5" />
          Guest list
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            Guest list
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[52vh] overflow-y-auto">
          {guests === undefined ? (
            <div className="space-y-3 px-1 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : guests === null ? (
            <p className="px-1 py-6 text-[13px] text-muted-foreground">
              Only the owning account can read this list.
            </p>
          ) : guests.bookings.length === 0 ? (
            <p className="px-1 py-6 text-[13px] text-muted-foreground">
              No bookings yet. This list updates the moment somebody books.
            </p>
          ) : (
            <ul>
              {guests.bookings.map((guest: GuestView) => (
                <li
                  key={guest._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-1 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {guest.fullName}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {guest.email}
                      {guest.organization !== null &&
                        ` · ${guest.organization}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="flex items-center gap-2 text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
                      <Dot className={paymentTone[guest.paymentStatus]} />
                      {guest.paymentStatus === "waived"
                        ? "No charge"
                        : `${formatMoney(guest.amountPaid || guests.price)} ${guest.paymentStatus}`}
                    </span>
                    <span className="font-display text-[12px] tracking-[0.04em] text-muted-foreground">
                      {guest.reference}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] tracking-[0.06em] uppercase",
                        guest.status === "confirmed"
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {guest.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- destructive */

function DeleteProgrammeButton({
  festId,
  name,
}: {
  festId: Id<"fests">;
  name: string;
}) {
  const removeProgramme = useMutation(api.fests.remove);
  const [pending, setPending] = useState(false);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${name}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the programme, its events, every booking and every
            post attached to them. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep programme</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await removeProgramme({ id: festId });
                toast.success("Programme deleted");
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setPending(false);
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteEventButton({
  eventId,
  title,
}: {
  eventId: Id<"events">;
  title: string;
}) {
  const removeEvent = useMutation(api.events.remove);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${title}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The event, its bookings and its discussion are removed for everyone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep event</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try {
                await removeEvent({ id: eventId });
                toast.success("Event deleted");
              } catch (error) {
                toast.error(errorMessage(error));
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ console */

type ConsoleEvent = {
  _id: Id<"events">;
  festId: Id<"fests">;
  title: string;
  slug: string;
  venue: string;
  startTime: number;
  endTime: number;
  capacity: number;
  seatsTaken: number;
  remaining: number;
  price: number;
  confirmed: number;
  waitlisted: number;
  collected: number;
  outstanding: number;
};

function ConsoleEventRow({ event }: { event: ConsoleEvent }) {
  const claimed =
    event.capacity === 0
      ? 0
      : Math.round((event.seatsTaken / event.capacity) * 100);

  return (
    <div className="border-b border-border px-5 py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to={`/events/${event.slug}`}
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium tracking-[-0.012em] hover:underline hover:decoration-border hover:underline-offset-4"
          >
            {event.title}
            <ArrowUpRight className="size-3.5 text-muted-foreground" />
          </Link>
          <p className="mt-1.5 text-[12px] text-muted-foreground tabular-nums">
            {relativeDay(event.startTime)}
            <span className="px-1.5 text-border">·</span>
            {formatTimeRange(event.startTime, event.endTime)}
            <span className="px-1.5 text-border">·</span>
            {event.venue}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <GuestsDialog eventId={event._id} title={event.title} />
          <DeleteEventButton eventId={event._id} title={event.title} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-5">
        {[
          ["Confirmed", String(event.confirmed)],
          ["Waiting list", String(event.waitlisted)],
          ["Places", `${event.seatsTaken}/${event.capacity}`],
          ["Collected", formatMoney(event.collected)],
          ["Outstanding", formatMoney(event.outstanding)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-1.5 text-[14px] tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border">
          <div
            className="h-px bg-foreground/45 transition-[width] duration-700 ease-quint"
            style={{ width: `${claimed}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {claimed}% booked
        </span>
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

export default function Admin() {
  useEnsureSeeded();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const programmes = useQuery(api.fests.mine);
  const events = useQuery(api.events.organized);
  const bookings = useQuery(api.registrations.forBusiness);
  const [tab, setTab] = useState<
    | "overview"
    | "revenue"
    | "campaigns"
    | "shop"
    | "sponsors"
    | "reviews"
    | "programmes"
  >("overview");
  // The shop hangs off one event at a time, so this tab keeps its own choice.
  const [shopEventId, setShopEventId] = useState<Id<"events"> | null>(null);

  const tabClass = (
    value:
      | "overview"
      | "revenue"
      | "campaigns"
      | "shop"
      | "sponsors"
      | "reviews"
      | "programmes",
  ) =>
    cn(
      "h-full rounded-full px-4 text-[13px] transition-[background-color,color,box-shadow] duration-200 ease-soft",
      tab === value
        ? "bg-foreground text-background shadow-hairline"
        : "text-muted-foreground hover:text-foreground",
    );

  const consoleEvents = (events ?? []) as ConsoleEvent[];
  const activeShopEventId = shopEventId ?? consoleEvents[0]?._id ?? null;
  const liveBookings = (bookings ?? []).filter(
    (row) => row.status !== "cancelled",
  );
  const placesBooked = consoleEvents.reduce(
    (sum, event) => sum + event.seatsTaken,
    0,
  );
  const collected = consoleEvents.reduce(
    (sum, event) => sum + event.collected,
    0,
  );
  const outstanding = consoleEvents.reduce(
    (sum, event) => sum + event.outstanding,
    0,
  );
  const waiting = consoleEvents.filter((event) => event.waitlisted > 0);

  const eventsFor = (festId: Id<"fests">) =>
    consoleEvents.filter((event) => event.festId === festId);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-24 sm:px-8 sm:pt-16">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-10">
            <div>
              <p className="label-eyebrow">Admin</p>
              <h1 className="mt-4 text-[32px] leading-[1.06] font-medium tracking-[-0.035em] sm:text-[38px]">
                Admin console
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-muted-foreground">
                Programmes, events, bookings and payments on one screen. Create
                a programme and it appears in the public catalogue immediately.
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

          <div className="grid grid-cols-2 gap-8 border-b border-border py-10 lg:grid-cols-4">
            <StatBlock
              value={bookings === undefined ? "—" : String(liveBookings.length)}
              label="Bookings"
            />
            <StatBlock
              value={events === undefined ? "—" : String(placesBooked)}
              label="Places booked"
            />
            <StatBlock
              value={events === undefined ? "—" : formatMoney(collected)}
              label="Collected"
            />
            <StatBlock
              value={events === undefined ? "—" : formatMoney(outstanding)}
              label="Outstanding"
            />
          </div>

          <Tabs
            value={tab}
            onValueChange={(value) =>
              setTab(
                value as
                  | "overview"
                  | "revenue"
                  | "campaigns"
                  | "shop"
                  | "sponsors"
                  | "reviews"
                  | "programmes",
              )
            }
            className="mt-10 gap-0"
          >
            <TabsList className="h-auto flex-wrap rounded-full border border-border bg-transparent p-1">
              <TabsTrigger value="overview" className={tabClass("overview")}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="revenue" className={tabClass("revenue")}>
                Revenue
              </TabsTrigger>
              <TabsTrigger value="campaigns" className={tabClass("campaigns")}>
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="shop" className={tabClass("shop")}>
                Shop
              </TabsTrigger>
              <TabsTrigger value="sponsors" className={tabClass("sponsors")}>
                Sponsors
              </TabsTrigger>
              <TabsTrigger value="reviews" className={tabClass("reviews")}>
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="programmes"
                className={tabClass("programmes")}
              >
                Programmes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="animate-rise mt-10">
              <div className="grid gap-14 lg:grid-cols-[1.4fr_0.6fr] lg:gap-16">
                <section>
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Recent bookings
                    </p>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Last {liveBookings.length}
                    </span>
                  </div>

                  {bookings === undefined ? (
                    <div className="space-y-4 py-6">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : liveBookings.length === 0 ? (
                    <p className="py-12 text-[13px] leading-6 text-muted-foreground">
                      No bookings yet. They appear here the moment a customer
                      confirms one.
                    </p>
                  ) : (
                    <ul>
                      {liveBookings.map((row: BusinessBookingView) => {
                        const parts = dayParts(row.eventStart);
                        return (
                          <li
                            key={row._id}
                            className="row-marker relative flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 pr-1 pl-1 transition-colors duration-300 ease-soft hover:bg-accent/40"
                          >
                            <div className="flex min-w-0 items-center gap-3.5">
                              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-[10px] font-medium">
                                {initials(row.fullName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium">
                                  {row.fullName}
                                </p>
                                <p className="truncate text-[12px] text-muted-foreground">
                                  {row.eventTitle}
                                  <span className="px-1.5 text-border">·</span>
                                  {row.programmeName}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-6">
                              <span className="hidden w-20 text-right text-[12px] text-muted-foreground tabular-nums sm:block">
                                {parts.day} {parts.month}
                              </span>
                              <span className="flex items-center gap-2 text-[12px] tabular-nums">
                                <Dot className={paymentTone[row.paymentStatus]} />
                                {row.paymentStatus === "waived"
                                  ? "No charge"
                                  : `${formatMoney(row.amountPaid || row.price)}`}
                              </span>
                              <span
                                className={cn(
                                  "w-20 text-right text-[11px] tracking-[0.06em] uppercase",
                                  row.status === "confirmed"
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {row.status}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="lg:pt-0">
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Needs attention
                    </p>
                  </div>
                  {events === undefined ? (
                    <Skeleton className="mt-6 h-24 w-full" />
                  ) : waiting.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-border bg-card px-5 py-6">
                      <p className="flex items-center gap-2 text-[13px] font-medium">
                        <Cog className="size-4 text-muted-foreground" />
                        Everything is settled
                      </p>
                      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
                        No waiting lists and nothing outstanding across your
                        programmes.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-2">
                      {waiting.slice(0, 4).map((event) => (
                        <li
                          key={event._id}
                          className="border-b border-border py-4"
                        >
                          <p className="flex items-start gap-2 text-[13px] leading-5">
                            <TriangleAlert className="text-tone-few mt-0.5 size-3.5 shrink-0" />
                            {event.title}
                          </p>
                          <p className="mt-2 text-[12px] text-muted-foreground tabular-nums">
                            {event.waitlisted} on the waiting list ·{" "}
                            {event.remaining} places left
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </TabsContent>

            <TabsContent value="programmes" className="animate-rise mt-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="label-eyebrow">Programmes you run</p>
                  <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                    Create a programme, fill it with events, set a price per
                    place, and follow every booking as it lands.
                  </p>
                </div>
                <CreateProgrammeDialog />
              </div>

              {programmes === undefined ? (
                <div className="mt-10 space-y-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              ) : programmes.length === 0 ? (
                <div className="mt-10 rounded-lg border border-dashed border-border py-20 text-center">
                  <p className="text-[15px] font-medium tracking-[-0.012em]">
                    You are not running a programme yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-muted-foreground">
                    The programmes in the catalogue belong to a demo business.
                    Create your own and it appears in the public directory
                    straight away.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-6 h-9 rounded-full px-5 text-[13px] shadow-none"
                  >
                    <Link to="/programmes">
                      See how a programme is structured
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-10 space-y-8">
                  {programmes.map((programme: ProgrammeListItem) => (
                    <section
                      key={programme._id}
                      className="overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5">
                        <div>
                          <p className="label-eyebrow">
                            {programme.organization}
                          </p>
                          <h2 className="mt-2.5 text-[17px] font-medium tracking-[-0.02em]">
                            {programme.name}
                          </h2>
                          <p className="mt-1.5 text-[12px] text-muted-foreground tabular-nums">
                            {formatDateRange(
                              programme.startDate,
                              programme.endDate,
                            )}
                            <span className="px-1.5 text-border">·</span>
                            {programme.eventCount}{" "}
                            {programme.eventCount === 1 ? "event" : "events"}
                            <span className="px-1.5 text-border">·</span>
                            {programme.seatsTaken}/{programme.capacity} places
                            booked
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AddEventDialog festId={programme._id} />
                          <DeleteProgrammeButton
                            festId={programme._id}
                            name={programme.name}
                          />
                        </div>
                      </div>

                      {eventsFor(programme._id).length === 0 ? (
                        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                          No events yet. Add the first one and booking opens
                          immediately.
                        </p>
                      ) : (
                        eventsFor(programme._id).map((event) => (
                          <ConsoleEventRow key={event._id} event={event} />
                        ))
                      )}
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="revenue" className="animate-rise mt-10">
              <ConsoleRevenue />
            </TabsContent>

            <TabsContent value="campaigns" className="animate-rise mt-10">
              <div className="max-w-3xl">
                <p className="label-eyebrow">Promotional campaigns</p>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                  A campaign is a code that takes money off a place or a shop
                  order while it runs. Live campaigns appear on the landing page
                  within the second, and every code is re-checked on the server
                  at checkout, so pausing one stops it everywhere at once.
                </p>
                <div className="mt-8">
                  <ConsoleCampaigns />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shop" className="animate-rise mt-10">
              <div className="max-w-3xl">
                <p className="label-eyebrow">Merchandise and snacks</p>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                  Put items on sale at an event. Attendees build a basket on the
                  event page and pay with the same methods as places, in their
                  own currency, and every order lands in Revenue.
                </p>

                {consoleEvents.length === 0 ? (
                  <p className="mt-8 text-[13px] text-muted-foreground">
                    Add an event first — the shop hangs off an event. Your
                    programmes live in the tab beside this one.
                  </p>
                ) : (
                  <>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {consoleEvents.map((event) => (
                        <button
                          key={event._id}
                          type="button"
                          onClick={() => setShopEventId(event._id)}
                          aria-pressed={activeShopEventId === event._id}
                          className={cn(
                            "chip",
                            activeShopEventId === event._id
                              ? "chip-tinted border-brand-line text-foreground"
                              : "",
                          )}
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                    {activeShopEventId !== null && (
                      <div className="mt-6 rounded-lg border border-border bg-card px-5 py-5">
                        <ConsoleShop eventId={activeShopEventId} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sponsors" className="animate-rise mt-10">
              <div className="max-w-3xl">
                <p className="label-eyebrow">Sponsorship</p>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                  Pledges come in from the event and programme pages, in four
                  tiers. Confirming a pledge moves it from promise to booking;
                  marking it paid records the money.
                </p>
                <div className="mt-8">
                  <ConsoleSponsorships />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="animate-rise mt-10">
              <div className="max-w-3xl">
                <p className="label-eyebrow">Reviews</p>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                  Ratings left by attendees, across every event you run. A
                  review can be withdrawn if it breaks your house rules.
                </p>
                <div className="mt-8">
                  <ConsoleReviews />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
