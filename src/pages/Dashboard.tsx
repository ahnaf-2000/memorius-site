import { StatusDot } from "@/components/site/EventList";
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
  formatTimeRange,
  fromDateTimeInput,
  initials,
  relativeDay,
  toDateTimeInput,
} from "@/lib/format";
import type { AttendeeView, FestListItem, RegistrationView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  CalendarDays,
  Loader2,
  LogOut,
  Plus,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

/* ------------------------------------------------------------------ fields */

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

const inputClass = "h-10 bg-background shadow-none";

function nextWeekAt(hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(hour, 0, 0, 0);
  return toDateTimeInput(date.getTime());
}

/* -------------------------------------------------------- create a festival */

function CreateFestDialog() {
  const createFest = useMutation(api.fests.create);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    organization: "",
    name: "",
    venue: "",
    summary: "",
    startDate: nextWeekAt(9),
    endDate: nextWeekAt(18),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startDate = fromDateTimeInput(form.startDate);
    const endDate = fromDateTimeInput(form.endDate);
    if (startDate === null || endDate === null) {
      setError("Add a start and end date for the festival.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createFest({
        organization: form.organization,
        name: form.name,
        venue: form.venue,
        summary: form.summary,
        startDate,
        endDate,
      });
      toast.success("Festival created", {
        description: "Add its first event to open registration.",
      });
      setOpen(false);
      setForm({
        organization: "",
        name: "",
        venue: "",
        summary: "",
        startDate: nextWeekAt(9),
        endDate: nextWeekAt(18),
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
          New festival
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            New festival
          </DialogTitle>
          <DialogDescription>
            A festival is the season that holds your events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="org" label="Organization">
            <Input
              id="org"
              required
              value={form.organization}
              onChange={(e) =>
                setForm({ ...form, organization: e.target.value })
              }
              placeholder="DRMC IT Club"
              className={inputClass}
            />
          </FormField>
          <FormField id="name" label="Festival name">
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="9th Tech Carnival 2026"
              className={inputClass}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="start" label="Starts">
              <Input
                id="start"
                type="datetime-local"
                required
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField id="end" label="Ends">
              <Input
                id="end"
                type="datetime-local"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField id="venue" label="Venue">
            <Input
              id="venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="Central Auditorium"
              className={inputClass}
            />
          </FormField>
          <FormField id="summary" label="One-line summary">
            <Textarea
              id="summary"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="What the festival is for, in a sentence."
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
              Publish festival
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------- add an event */

function AddEventDialog({ festId }: { festId: Id<"fests"> }) {
  const createEvent = useMutation(api.events.create);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "Session",
    venue: "",
    capacity: "40",
    fee: "",
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
        capacity: Number(form.capacity) || 1,
        fee: form.fee,
        summary: form.summary,
        description: form.description,
        startTime,
        endTime,
      });
      toast.success("Event added", { description: form.title });
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
            Registration opens as soon as the event is published.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="title" label="Event title">
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="AI Web Development Contest"
              className={inputClass}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="category" label="Category">
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Contest"
                className={inputClass}
              />
            </FormField>
            <FormField id="capacity" label="Capacity">
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="eventStart" label="Starts">
              <Input
                id="eventStart"
                type="datetime-local"
                required
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField id="eventEnd" label="Ends">
              <Input
                id="eventEnd"
                type="datetime-local"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="eventVenue" label="Venue">
              <Input
                id="eventVenue"
                required
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="Lab 301, CSE Building"
                className={inputClass}
              />
            </FormField>
            <FormField id="fee" label="Fee">
              <Input
                id="fee"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                placeholder="Free entry"
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField id="eventSummary" label="Summary">
            <Textarea
              id="eventSummary"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="One sentence for the event list."
              className="bg-background shadow-none"
            />
          </FormField>
          <FormField id="eventDescription" label="Description">
            <Textarea
              id="eventDescription"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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

/* ------------------------------------------------------------ guest lists */

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
          Guests
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
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
              Only the organizing account can read this list.
            </p>
          ) : guests.length === 0 ? (
            <p className="px-1 py-6 text-[13px] text-muted-foreground">
              No registrations yet. This list updates the moment somebody
              registers.
            </p>
          ) : (
            <ul>
              {guests.map((guest: AttendeeView) => (
                <li
                  key={guest._id}
                  className="flex items-center justify-between gap-4 border-b border-border px-1 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {guest.fullName}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {guest.email}
                      {guest.organization !== null && ` · ${guest.organization}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
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

/* -------------------------------------------------------- delete controls */

function DeleteFestButton({
  festId,
  name,
}: {
  festId: Id<"fests">;
  name: string;
}) {
  const removeFest = useMutation(api.fests.remove);
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
            This removes the festival, its events and every registration
            attached to them. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep festival</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await removeFest({ id: festId });
                toast.success("Festival deleted");
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
            The event and its registrations are removed for everyone.
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

/* -------------------------------------------------------------- the studio */

type StudioEvent = {
  _id: Id<"events">;
  title: string;
  slug: string;
  venue: string;
  startTime: number;
  endTime: number;
  capacity: number;
  seatsTaken: number;
  remaining: number;
  state: string;
  stateLabel: string;
  confirmed: number;
  waitlisted: number;
  festName: string;
};

function StudioEventRow({ event }: { event: StudioEvent }) {
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
        <div className="flex items-center gap-2">
          <GuestsDialog eventId={event._id} title={event.title} />
          <DeleteEventButton eventId={event._id} title={event.title} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          ["Confirmed", String(event.confirmed)],
          ["Waitlisted", String(event.waitlisted)],
          ["Seats taken", `${event.seatsTaken}/${event.capacity}`],
          ["Remaining", String(event.remaining)],
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
          <div className="h-px bg-foreground/45" style={{ width: `${claimed}%` }} />
        </div>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <StatusDot state="open" />
          {claimed}% claimed
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ my schedule */

function ScheduleRow({
  registration,
}: {
  registration: RegistrationView;
}) {
  const cancelRegistration = useMutation(api.registrations.cancel);
  const event = registration.event;
  if (event === null) return null;
  const parts = dayParts(event.startTime);
  const released = registration.status === "cancelled";

  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-5 border-b border-border py-5 sm:grid-cols-[auto_1fr_auto] sm:gap-7">
      <div className="flex w-14 flex-col items-center rounded-md border border-border bg-card py-2.5 sm:w-16">
        <span className="text-[10px] leading-none font-medium tracking-[0.14em] text-muted-foreground">
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
          className="text-[15px] font-medium tracking-[-0.012em] hover:underline hover:decoration-border hover:underline-offset-4"
        >
          {event.title}
        </Link>
        <p className="mt-1.5 truncate text-[13px] text-muted-foreground">
          {registration.fest?.name}
          <span className="px-1.5 text-border">·</span>
          {event.venue}
          <span className="px-1.5 text-border">·</span>
          <span className="tabular-nums">
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className={cn(
              "flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase",
              released ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <StatusDot state={released ? "closed" : "open"} />
            {registration.status === "waitlisted" ? "Waitlisted" : released ? "Released" : "Confirmed"}
          </span>
          <span className="font-display text-[12px] tracking-[0.05em] text-muted-foreground">
            {registration.reference}
          </span>
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        {!released && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-[12px] text-muted-foreground"
              >
                Release
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Release this seat?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your place is offered to the next person on the waitlist.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await cancelRegistration({
                        registrationId: registration._id,
                      });
                      toast.success("Seat released");
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  }}
                >
                  Release seat
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

/* -------------------------------------------------------------------- page */

export default function Dashboard() {
  useEnsureSeeded();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const registrations = useQuery(api.registrations.mine);
  const myFests = useQuery(api.fests.mine);
  const organized = useQuery(api.events.organized);
  const [tab, setTab] = useState<"schedule" | "studio">("schedule");

  // The active tab is styled from state rather than a data-* variant so the
  // switch is never dependent on how the variant compiles.
  const tabClass = (value: "schedule" | "studio") =>
    cn(
      "h-full rounded-full px-4 text-[13px] transition-colors",
      tab === value
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground",
    );

  const upcoming = (registrations ?? []).filter(
    (row) => row.upcoming && row.status !== "cancelled",
  );
  const settled = (registrations ?? []).filter(
    (row) => !row.upcoming || row.status === "cancelled",
  );

  const eventsFor = (festId: Id<"fests">) =>
    (organized ?? []).filter((event) => event.festId === festId);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-24 sm:px-8 sm:pt-16">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-10">
            <div>
              <p className="label-eyebrow">Studio</p>
              <h1 className="mt-4 text-[32px] leading-[1.06] font-medium tracking-[-0.035em] sm:text-[38px]">
                {user?.name ? user.name.split(" ")[0] : "Welcome"}
                <span className="text-muted-foreground">’s desk</span>
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-muted-foreground">
                Everything you have signed up for, and everything you run, on
                one page.
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

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as "schedule" | "studio")}
            className="mt-10 gap-0"
          >
            <TabsList className="h-10 rounded-full border border-border bg-transparent p-1">
              <TabsTrigger value="schedule" className={tabClass("schedule")}>
                My schedule
              </TabsTrigger>
              <TabsTrigger value="studio" className={tabClass("studio")}>
                Organizer studio
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-10">
              <section>
                <div className="flex items-baseline justify-between border-b border-border pb-3">
                  <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                    Ahead of you
                  </p>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {upcoming.length}{" "}
                    {upcoming.length === 1 ? "registration" : "registrations"}
                  </span>
                </div>

                {registrations === undefined ? (
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
                      Nothing on your schedule yet
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
                      Find an event, hold a seat, and it appears here with its
                      reference code.
                    </p>
                    <Button asChild className="mt-6 h-9 rounded-full px-5 text-[13px]">
                      <Link to="/events">
                        <Ticket className="size-3.5" />
                        Browse events
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div>
                    {upcoming.map((row) => (
                      <ScheduleRow key={row._id} registration={row} />
                    ))}
                  </div>
                )}
              </section>

              {settled.length > 0 && (
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      History
                    </p>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {settled.length}
                    </span>
                  </div>
                  {settled.map((row) => (
                    <ScheduleRow key={row._id} registration={row} />
                  ))}
                </section>
              )}
            </TabsContent>

            <TabsContent value="studio" className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="label-eyebrow">Festivals you run</p>
                  <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                    Create a festival, fill it with events, and monitor every
                    registration as it lands.
                  </p>
                </div>
                <CreateFestDialog />
              </div>

              {myFests === undefined ? (
                <div className="mt-10 space-y-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              ) : myFests.length === 0 ? (
                <div className="mt-10 rounded-lg border border-dashed border-border py-20 text-center">
                  <p className="text-[15px] font-medium tracking-[-0.012em]">
                    You are not running a festival yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-muted-foreground">
                    The showcase festivals in the calendar belong to a demo
                    organization. Create your own and it appears in the public
                    directory straight away.
                  </p>
                  <Button asChild variant="outline" className="mt-6 h-9 rounded-full px-5 text-[13px] shadow-none">
                    <Link to="/fests">See how a festival is structured</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-10 space-y-8">
                  {myFests.map((fest: FestListItem) => (
                    <section
                      key={fest._id}
                      className="overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5">
                        <div>
                          <p className="label-eyebrow">{fest.organization}</p>
                          <h2 className="mt-2.5 text-[17px] font-medium tracking-[-0.02em]">
                            {fest.name}
                          </h2>
                          <p className="mt-1.5 text-[12px] text-muted-foreground tabular-nums">
                            {formatDateRange(fest.startDate, fest.endDate)}
                            <span className="px-1.5 text-border">·</span>
                            {fest.eventCount}{" "}
                            {fest.eventCount === 1 ? "event" : "events"}
                            <span className="px-1.5 text-border">·</span>
                            {fest.seatsTaken}/{fest.capacity} seats claimed
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AddEventDialog festId={fest._id} />
                          <DeleteFestButton festId={fest._id} name={fest.name} />
                        </div>
                      </div>

                      {eventsFor(fest._id).length === 0 ? (
                        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                          No events yet. Add the first one and registration
                          opens immediately.
                        </p>
                      ) : (
                        eventsFor(fest._id).map((event) => (
                          <StudioEventRow key={event._id} event={event} />
                        ))
                      )}
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
