import { ConsoleAnalytics } from "@/components/site/ConsoleAnalytics";
import { ConsoleCampaigns } from "@/components/site/ConsoleCampaigns";
import { ConsoleCollaborators } from "@/components/site/ConsoleCollaborators";
import { ConsoleParticipants } from "@/components/site/ConsoleParticipants";
import { ConsoleProgrammeSettings } from "@/components/site/ConsoleProgrammeSettings";
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
  ConsoleProgrammeView,
  GuestView,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ELIGIBILITY_LEVELS,
  EVENT_CATEGORIES,
  OPEN_ELIGIBILITY,
} from "@/lib/categories";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Cog,
  Loader2,
  LogOut,
  Megaphone,
  Plus,
  Send,
  Trash2,
  TriangleAlert,
  Users,
  X,
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
    category: EVENT_CATEGORIES[0] as string,
    venue: "",
    host: "",
    capacity: "40",
    summary: "",
    description: "",
    startTime: nextWeekAt(9),
    endTime: nextWeekAt(12),
    eligibility: OPEN_ELIGIBILITY as string,
    chiefGuest: "",
    specialGuests: "",
    organizerNotes: "",
    deadline: "",
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startTime = fromDateTimeInput(form.startTime);
    const endTime = fromDateTimeInput(form.endTime);
    if (startTime === null || endTime === null) {
      setError("Add a start and end time for the event.");
      return;
    }
    const deadline = fromDateTimeInput(form.deadline);
    if (deadline !== null && deadline > startTime) {
      setError("The booking deadline has to fall before the event starts.");
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
        summary: form.summary,
        description: form.description,
        startTime,
        endTime,
        eligibility: form.eligibility,
        chiefGuest: form.chiefGuest,
        specialGuests: form.specialGuests
          .split("\n")
          .map((name) => name.trim())
          .filter(Boolean),
        organizerNotes: form.organizerNotes,
        ...(deadline === null ? {} : { registrationClosesAt: deadline }),
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="category" label="Category">
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="category" className="h-10 w-full bg-background shadow-none">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="eligibility" label="Who may attend">
              <Select
                value={form.eligibility}
                onValueChange={(value) =>
                  setForm({ ...form, eligibility: value })
                }
              >
                <SelectTrigger id="eligibility" className="h-10 w-full bg-background shadow-none">
                  <SelectValue placeholder="Open to everyone" />
                </SelectTrigger>
                <SelectContent>
                  {ELIGIBILITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="deadline" label="Booking closes (optional)">
              <Input
                id="deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={(event) =>
                  setForm({ ...form, deadline: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField id="chiefGuest" label="Chief guest (optional)">
              <Input
                id="chiefGuest"
                value={form.chiefGuest}
                onChange={(event) =>
                  setForm({ ...form, chiefGuest: event.target.value })
                }
                placeholder="Priya Raman"
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField
            id="specialGuests"
            label="Special guests (one per line)"
          >
            <Textarea
              id="specialGuests"
              rows={3}
              value={form.specialGuests}
              onChange={(event) =>
                setForm({ ...form, specialGuests: event.target.value })
              }
              placeholder={
                "Dr. Alastair Whitfield, Meridian Faculty\nHalima Yusuf, Arden Logistics"
              }
              className="bg-background shadow-none"
            />
          </FormField>
          <FormField
            id="organizerNotes"
            label="Special notes from the organizer (optional)"
          >
            <Textarea
              id="organizerNotes"
              rows={2}
              value={form.organizerNotes}
              onChange={(event) =>
                setForm({ ...form, organizerNotes: event.target.value })
              }
              placeholder="Lunch is included; tell us who you would like to sit with."
              className="bg-background shadow-none"
            />
          </FormField>
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

/* ---------------------------------------------------------- announcements */

/**
 * The one thing that keeps changing after an event is published.
 *
 * Whatever the organizer writes here lands on the event page immediately and
 * travels in the confirmation email of everyone who books afterwards, so the
 * form says exactly that rather than promising an email that is not sent.
 */
function AnnounceDialog({ event }: { event: ConsoleEvent }) {
  const post = useMutation(api.events.announce);
  const retract = useMutation(api.events.retract);
  const broadcast = useMutation(api.events.broadcast);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notes = [...event.announcements].sort((a, b) => b.at - a.at);

  function reset() {
    setTitle("");
    setBody("");
    setError(null);
  }

  async function submit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await post({ id: event._id, title, body });
      toast.success("Announcement posted", {
        description: "It is on the event page now.",
      });
      reset();
    } catch (postError) {
      setError(errorMessage(postError));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
        >
          <Megaphone className="size-3.5" />
          Announce
          {notes.length > 0 && (
            <span className="text-muted-foreground tabular-nums">
              ({notes.length})
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            Announcements
          </DialogTitle>
          <DialogDescription>{event.title}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[34vh] overflow-y-auto">
          {notes.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-6 text-[13px] leading-6 text-muted-foreground">
              Nothing announced yet. A room move, a time change or a guest who
              cannot come belongs here.
            </p>
          ) : (
            <ul className="border-t border-border">
              {notes.map((note) => (
                <li
                  key={note.at}
                  className="flex items-start justify-between gap-4 border-b border-border py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium tracking-[-0.012em]">
                      {note.title}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
                      {note.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {relativeDay(note.at)}
                      {note.emailedAt !== undefined && (
                        <>
                          <span className="px-1.5 text-border">·</span>
                          emailed to {note.emailed}{" "}
                          {note.emailed === 1 ? "guest" : "guests"}
                        </>
                      )}
                    </p>
                    {note.emailedAt === undefined && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const result = await broadcast({
                              id: event._id,
                              at: note.at,
                            });
                            toast.success("Sent to the guest list", {
                              description: `${result.recipients} emailed about \u201c${note.title}\u201d.`,
                            });
                          } catch (broadcastError) {
                            toast.error(errorMessage(broadcastError));
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                      >
                        <Send className="size-3" />
                        Email the guest list
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Retract ${note.title}`}
                    onClick={async () => {
                      try {
                        await retract({ id: event._id, at: note.at });
                        toast.success("Announcement retracted");
                      } catch (retractError) {
                        toast.error(errorMessage(retractError));
                      }
                    }}
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={submit} className="space-y-3 border-t border-border pt-5">
          <FormField id="announce-title" label="Heading">
            <Input
              id="announce-title"
              required
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder="Room moved to Studio 2"
              className={inputClass}
            />
          </FormField>
          <FormField id="announce-body" label="What changed">
            <Textarea
              id="announce-body"
              rows={3}
              required
              value={body}
              onChange={(changeEvent) => setBody(changeEvent.target.value)}
              placeholder="Same time, same building — take the lift to the second floor."
              className="bg-background shadow-none"
            />
          </FormField>
          {error !== null && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-3 sm:items-center sm:justify-between">
            <span className="text-[11px] leading-5 text-muted-foreground">
              It appears on the event page at once, and in the confirmation
              email of everyone who books after it is posted.
            </span>
            <Button type="submit" disabled={pending} className="rounded-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Post announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Everything an organizer can change about a programme after publishing it. */
function ProgrammeSettingsDialog({
  programme,
}: {
  programme: ConsoleProgrammeView;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
        >
          <Cog className="size-3.5" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            Programme settings
          </DialogTitle>
          <DialogDescription>
            {programme.organization} · {programme.name}
          </DialogDescription>
        </DialogHeader>
        <ConsoleProgrammeSettings key={programme._id} programme={programme} />
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
            This removes the programme, its events, every booking and every post
            attached to them. It cannot be undone.
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
  announcements: {
    title: string;
    body: string;
    at: number;
    emailed?: number;
    emailedAt?: number;
  }[];
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
          <AnnounceDialog event={event} />
          <GuestsDialog eventId={event._id} title={event.title} />
          <DeleteEventButton eventId={event._id} title={event.title} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-5">
        {[
          ["Confirmed", String(event.confirmed)],
          ["Waiting list", String(event.waitlisted)],
          ["Places", `${event.seatsTaken}/${event.capacity}`],
          ["Places left", String(event.remaining)],
          ["Price", "Free"],
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

type AdminTab =
  | "overview"
  | "participants"
  | "analytics"
  | "team"
  | "revenue"
  | "campaigns"
  | "shop"
  | "sponsors"
  | "reviews"
  | "programmes";

export default function Admin() {
  useEnsureSeeded();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  // `console` rather than `mine`: it includes the programmes this account was
  // invited onto, each with its own settings and the caller's role.
  const programmes = useQuery(api.fests.console) as
    | ConsoleProgrammeView[]
    | undefined;
  const events = useQuery(api.events.organized);
  const bookings = useQuery(api.registrations.forBusiness);
  const [tab, setTab] = useState<AdminTab>("overview");
  // The shop hangs off one event at a time, so this tab keeps its own choice.
  const [shopEventId, setShopEventId] = useState<Id<"events"> | null>(null);
  // Collaboration is settled one programme at a time as well.
  const [teamFestId, setTeamFestId] = useState<Id<"fests"> | null>(null);
  const activeTeamFestId =
    teamFestId ?? programmes?.[0]?._id ?? null;

  const tabClass = (value: AdminTab) =>
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
              <h1 className="mt-4 text-[26px] leading-[1.2] font-light tracking-[-0.015em] sm:text-[32px]">
                Admin console
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-muted-foreground">
                Programmes, events, bookings and the shop on one screen. Create
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
              value={events === undefined ? "—" : String(consoleEvents.length)}
              label="Events published"
            />
            <StatBlock
              value={programmes === undefined ? "—" : String(programmes.length)}
              label="Programmes"
            />
          </div>

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as AdminTab)}
            className="mt-10 gap-0"
          >
            <TabsList className="h-auto flex-wrap rounded-full border border-border bg-transparent p-1">
              <TabsTrigger value="overview" className={tabClass("overview")}>
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="participants"
                className={tabClass("participants")}
              >
                Participants
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className={tabClass("analytics")}
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger value="team" className={tabClass("team")}>
                Collaboration
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
                                <Dot
                                  className={paymentTone[row.paymentStatus]}
                                />
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
                    Create a programme, fill it with events and follow every
                    booking as it lands — places are free, so there is no price
                    list to keep.
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
                  {programmes.map((programme) => (
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
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "chip",
                                programme.isOwner
                                  ? "chip-tinted border-brand-line text-foreground"
                                  : "",
                              )}
                            >
                              {programme.isOwner
                                ? "Owner"
                                : `You are ${programme.role}`}
                            </span>
                            <span className="chip">
                              {programme.cancellationFee === 0
                                ? "Free to release, any time"
                                : `${formatMoney(programme.cancellationFee)} fee after ${programme.cancellationWindowHours}h`}
                            </span>
                            <span className="chip">
                              {programme.teamSize === 0
                                ? "No collaborators"
                                : `${programme.teamSize} collaborator${programme.teamSize === 1 ? "" : "s"}`}
                              {programme.pendingInvites > 0 &&
                                ` · ${programme.pendingInvites} waiting`}
                            </span>
                            <span className="chip">
                              {programme.emailTemplate === null
                                ? "Product email wording"
                                : "Your own email wording"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ProgrammeSettingsDialog programme={programme} />
                          {programme.canEdit && (
                            <AddEventDialog festId={programme._id} />
                          )}
                          {programme.isOwner && (
                            <DeleteProgrammeButton
                              festId={programme._id}
                              name={programme.name}
                            />
                          )}
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

            <TabsContent
              value="participants"
              className="animate-rise mt-10"
            >
              <div className="max-w-2xl">
                <p className="label-eyebrow">Participants</p>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                  Every booking across every programme you run or help run, in
                  one place. Search it, filter it by category, decide on a place
                  and mark people in at the door — a decision emails the
                  participant the moment you save it.
                </p>
              </div>
              <div className="mt-8">
                <ConsoleParticipants />
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="animate-rise mt-10">
              <div className="max-w-2xl">
                <p className="label-eyebrow">Analytics</p>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                  How the season is going: places taken against capacity, where
                  the bookings came from, who is on the guest list and what is
                  waiting on a decision.
                </p>
              </div>
              <div className="mt-8">
                <ConsoleAnalytics />
              </div>
            </TabsContent>

            <TabsContent value="team" className="animate-rise mt-10">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="label-eyebrow">Collaboration</p>
                  <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                    Invite someone to help run a programme, choose what they may
                    do, and end their access whenever you like.
                  </p>
                </div>
                {(programmes ?? []).length > 0 && (
                  <Select
                    value={activeTeamFestId ?? ""}
                    onValueChange={(value) =>
                      setTeamFestId(value as Id<"fests">)
                    }
                  >
                    <SelectTrigger className="h-9 w-[16rem] bg-background shadow-none">
                      <SelectValue placeholder="Pick a programme" />
                    </SelectTrigger>
                    <SelectContent>
                      {(programmes ?? []).map((programme) => (
                        <SelectItem key={programme._id} value={programme._id}>
                          {programme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ConsoleCollaborators
                festId={activeTeamFestId}
                programmeName={
                  (programmes ?? []).find(
                    (programme) => programme._id === activeTeamFestId,
                  )?.name ?? null
                }
              />
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
