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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { errorMessage, initials, relativeDay } from "@/lib/format";
import type {
  BookingStatus,
  BusinessBookingView,
  ParticipantCategory,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Undo2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

/**
 * The participant directory.
 *
 * One searchable table across every programme this account runs or helps run,
 * because the question an organizer actually asks is "where is Ayesha's booking"
 * and not "which season was that in". Search, filter and decide all happen
 * against the rows the server already returned, so a keystroke never waits on a
 * round trip.
 */

const STATUS_OPTIONS: { id: BookingStatus; label: string; blurb: string }[] = [
  {
    id: "confirmed",
    label: "Confirmed",
    blurb: "Holding a place. Counted in the room and on the door roster.",
  },
  {
    id: "waitlisted",
    label: "Waiting list",
    blurb: "No place yet: they move up automatically when one is released.",
  },
  {
    id: "declined",
    label: "Declined",
    blurb: "The desk could not confirm this place. Nothing is owed.",
  },
  {
    id: "cancelled",
    label: "Released",
    blurb: "No longer attending. The place is offered to the next in line.",
  },
];

const PARTICIPANT_CATEGORIES: {
  id: ParticipantCategory;
  name: string;
}[] = [
  { id: "delegate", name: "Delegate" },
  { id: "student", name: "Student" },
  { id: "speaker", name: "Speaker" },
  { id: "press", name: "Press" },
  { id: "volunteer", name: "Volunteer" },
  { id: "guest", name: "Guest" },
  { id: "staff", name: "Staff" },
];

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  waitlisted: "Waiting list",
  cancelled: "Released",
  declined: "Declined",
};

const STATUS_TONE: Record<BookingStatus, string> = {
  confirmed: "tone-open",
  waitlisted: "tone-few",
  cancelled: "tone-muted",
  declined: "tone-muted",
};

function Dot({ className }: { className: string }) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", className)}
      aria-hidden="true"
    />
  );
}

/** One decision, with the sentence that goes with it and a note if there is one. */
function DecideDialog({ row }: { row: BusinessBookingView }) {
  const decide = useMutation(api.registrations.decide);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<BookingStatus>(row.status);
  const [note, setNote] = useState(row.decisionNote ?? "");
  const [notify, setNotify] = useState(true);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await decide({
        registrationId: row._id,
        status,
        note: note.trim() === "" ? undefined : note,
        notify,
      });
      toast.success(`${row.fullName} is now ${STATUS_LABEL[status].toLowerCase()}`, {
        description: notify
          ? `Emailed to ${row.email} with the reference and the note.`
          : "Saved without emailing them.",
      });
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setStatus(row.status);
          setNote(row.decisionNote ?? "");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
        >
          <ClipboardCheck className="size-3.5" />
          Decide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            {row.fullName}
          </DialogTitle>
          <DialogDescription>
            {row.eventTitle} · {row.programmeName} · {row.reference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="label-eyebrow">Registration status</p>
          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStatus(option.id)}
                aria-pressed={status === option.id}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                  status === option.id
                    ? "border-foreground/25 bg-accent/50"
                    : "border-border hover:border-foreground/20",
                )}
              >
                <Dot className={STATUS_TONE[option.id]} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">
                    {option.blurb}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="label-eyebrow">Note for the participant (optional)</p>
          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Quoted word for word in the email they get."
            className="bg-background shadow-none"
          />
        </div>

        <label className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5 text-[12.5px]">
          <input
            type="checkbox"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
            className="size-4 accent-current"
          />
          Email them this decision
        </label>

        <DialogFooter className="gap-3 sm:items-center">
          <Button
            variant="ghost"
            className="rounded-full text-[13px]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={pending}
            className="gap-1.5 rounded-full"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ row }: { row: BusinessBookingView }) {
  const checkIn = useMutation(api.registrations.checkIn);
  const relabel = useMutation(api.registrations.relabel);
  const [busy, setBusy] = useState(false);

  const present = row.checkedInAt !== null;

  async function togglePresence() {
    setBusy(true);
    try {
      await checkIn({ registrationId: row._id, present: !present });
      toast.success(present ? "Checked out" : "Checked in", {
        description: `${row.fullName} · ${row.reference}`,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setCategory(category: string) {
    try {
      await relabel({
        eventId: row.eventId,
        registrationId: row._id,
        participantCategory: category,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <li className="row-marker relative grid gap-4 border-b border-border py-4 pr-1 pl-1 transition-colors duration-300 ease-soft hover:bg-accent/40 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-[10px] font-medium">
          {initials(row.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{row.fullName}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {row.email}
            {row.organization !== null && ` · ${row.organization}`}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <Link
          to={`/events/${row.eventSlug}`}
          className="link-quiet block truncate text-[12.5px] font-medium"
        >
          {row.eventTitle}
        </Link>
        <p className="truncate text-[11.5px] text-muted-foreground tabular-nums">
          {relativeDay(row.eventStart)}
          <span className="px-1.5 text-border">·</span>
          {row.programmeName}
          {row.organization !== null && (
            <>
              <span className="px-1.5 text-border">·</span>
              {row.organization}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className="flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase">
          <Dot className={STATUS_TONE[row.status]} />
          {STATUS_LABEL[row.status]}
        </span>

        <Select
          value={row.participantCategory ?? "delegate"}
          onValueChange={setCategory}
        >
          <SelectTrigger
            size="sm"
            aria-label={`Category for ${row.fullName}`}
            className="h-8 w-[8.5rem] rounded-full text-[12px] shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTICIPANT_CATEGORIES.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {row.canDecide && row.status === "confirmed" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePresence}
            disabled={busy}
            aria-pressed={present}
            className={cn(
              "h-8 gap-1.5 rounded-full px-3 text-[12px]",
              present ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : present ? (
              <Undo2 className="size-3.5" />
            ) : (
              <Check className="size-3.5" />
            )}
            {present ? "Checked in" : "Check in"}
          </Button>
        )}

        {row.canDecide && <DecideDialog row={row} />}
      </div>
    </li>
  );
}

export function ConsoleParticipants() {
  const rows = useQuery(api.registrations.forBusiness) as
    | BusinessBookingView[]
    | undefined;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [category, setCategory] = useState<"all" | ParticipantCategory>("all");
  const [programme, setProgramme] = useState<string>("all");
  const [event, setEvent] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const programmes = useMemo(
    () => Array.from(new Set((rows ?? []).map((row) => row.programmeName))).sort(),
    [rows],
  );
  const events = useMemo(
    () =>
      Array.from(new Set((rows ?? []).map((row) => row.eventTitle))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (
        category !== "all" &&
        (row.participantCategory ?? "delegate") !== category
      ) {
        return false;
      }
      if (programme !== "all" && row.programmeName !== programme) return false;
      if (event !== "all" && row.eventTitle !== event) return false;
      if (needle === "") return true;
      return [
        row.fullName,
        row.email,
        row.organization ?? "",
        row.reference,
        row.eventTitle,
        row.programmeName,
        row.decisionNote ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, status, category, programme, event]);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      total: list.length,
      confirmed: list.filter((row) => row.status === "confirmed").length,
      waitlisted: list.filter((row) => row.status === "waitlisted").length,
      declined: list.filter((row) => row.status === "declined").length,
      cancelled: list.filter((row) => row.status === "cancelled").length,
      checkedIn: list.filter((row) => row.checkedInAt !== null).length,
      speakers: list.filter((row) => row.participantCategory === "speaker")
        .length,
      filtered: filtered.length,
    };
  }, [rows, filtered.length]);

  const activeCount =
    (status === "all" ? 0 : 1) +
    (category === "all" ? 0 : 1) +
    (programme === "all" ? 0 : 1) +
    (event === "all" ? 0 : 1);

  function reset() {
    setQuery("");
    setStatus("all");
    setCategory("all");
    setProgramme("all");
    setEvent("all");
  }

  if (rows === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-6 border-b border-border pb-6 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Participants", String(counts.total)],
          ["Confirmed", String(counts.confirmed)],
          ["Waiting list", String(counts.waitlisted)],
          ["Checked in", String(counts.checkedIn)],
          ["Speakers", String(counts.speakers)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {label}
            </p>
            <p className="font-display mt-2 text-[20px] leading-none tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            placeholder="Search a name, an address, an organisation or a reference"
            aria-label="Search participants"
            className="h-11 rounded-lg border-border bg-card pr-10 pl-10 text-[14px] shadow-none focus-visible:border-foreground/25 focus-visible:ring-0"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            "flex h-11 items-center gap-2 rounded-lg border px-4 text-[12.5px] transition-colors",
            open || activeCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="tabular-nums">({activeCount})</span>
          )}
        </button>

        {(activeCount > 0 || query !== "") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="h-11 gap-1.5 rounded-lg px-3 text-[12.5px] text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}

        <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">
          {counts.filtered} of {counts.total} shown
        </span>
      </div>

      {open && (
        <div className="animate-rise mt-4 space-y-6 rounded-lg border border-border bg-card px-5 py-5">
          <div>
            <p className="label-eyebrow">Registration status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "confirmed", "waitlisted", "declined", "cancelled"] as const).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    aria-pressed={status === value}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
                      status === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {value === "all"
                      ? `Any (${counts.total})`
                      : `${STATUS_LABEL[value]} (${
                          value === "confirmed"
                            ? counts.confirmed
                            : value === "waitlisted"
                              ? counts.waitlisted
                              : value === "declined"
                                ? counts.declined
                                : counts.cancelled
                        })`}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="label-eyebrow">Participant category</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
                  category === "all"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                Every category
              </button>
              {PARTICIPANT_CATEGORIES.map((option) => {
                const count = (rows ?? []).filter(
                  (row) =>
                    (row.participantCategory ?? "delegate") === option.id,
                ).length;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCategory(option.id)}
                    aria-pressed={category === option.id}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
                      category === option.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {option.name}
                    <span className="ml-1.5 tabular-nums opacity-70">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="label-eyebrow">Programme</p>
              <Select value={programme} onValueChange={setProgramme}>
                <SelectTrigger className="mt-3 h-10 w-full bg-background shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every programme</SelectItem>
                  {programmes.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="label-eyebrow">Event</p>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger className="mt-3 h-10 w-full bg-background shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every event</SelectItem>
                  {events.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-muted-foreground">
          {(rows ?? []).length === 0
            ? "No participants yet. They appear the moment somebody books a place."
            : "Nobody matches those filters. Try a wider search or reset them."}
        </p>
      ) : (
        <ul className="mt-4">
          {filtered.slice(0, 200).map((row) => (
            <Row key={row._id} row={row} />
          ))}
        </ul>
      )}

      {filtered.length > 200 && (
        <p className="py-4 text-[12px] text-muted-foreground">
          Showing the newest 200 of {filtered.length}. Narrow the filters to see
          the rest.
        </p>
      )}
    </div>
  );
}
