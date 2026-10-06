import { EventList, StatusDot } from "@/components/site/EventList";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useEnsureSeeded } from "@/hooks/use-seed";
import {
  errorMessage,
  formatLongDate,
  formatTimeRange,
  durationLabel,
  relativeDay,
  seatSummary,
} from "@/lib/format";
import type { EventView } from "@/lib/types";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  Clock,
  Loader2,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

const EASE = [0.16, 1, 0.3, 1] as const;

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-border py-5">
      <div className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <p className="mt-2.5 text-[14px] tracking-[-0.01em]">{value}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 bg-card shadow-none"
      />
    </div>
  );
}

function RegistrationPanel({
  event,
  festName,
  festSlug,
}: {
  event: EventView;
  festName: string | null;
  festSlug: string | null;
}) {
  const { user, isAuthenticated } = useAuth();
  const register = useMutation(api.registrations.register);
  const cancelRegistration = useMutation(api.registrations.cancel);
  const viewer = useQuery(api.events.getBySlug, { slug: event.slug });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    notes: "",
  });
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    reference: string;
    status: string;
    registrationId: Id<"registrations">;
  } | null>(null);

  // Fields read from the account until the attendee edits them. Deriving this
  // during render keeps the prefill out of an effect, so signing in cannot
  // trigger a second render pass over the whole panel.
  const fullName = edited.fullName
    ? form.fullName
    : form.fullName || (user?.name ?? "");
  const email = edited.email
    ? form.email
    : form.email || (user?.email ?? "");

  const update = (key: keyof typeof form) => (value: string) => {
    setEdited((previous) => ({ ...previous, [key]: true }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const existing = viewer?.viewer.registration ?? null;
  const activeRegistration =
    existing !== null && existing.status !== "cancelled" ? existing : null;
  const claimed =
    event.capacity === 0
      ? 0
      : Math.round((event.seatsTaken / event.capacity) * 100);
  const isFull = event.state === "full";
  const closed = !event.accepting;

  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await register({
        eventId: event._id,
        ...form,
        fullName,
        email,
      });
      setReceipt({
        reference: result.reference,
        status: result.status,
        registrationId: result.registrationId,
      });
      toast.success(
        result.status === "waitlisted"
          ? "You're on the waitlist"
          : result.alreadyRegistered
            ? "You're already registered"
            : "Seat confirmed",
        {
          description: `Reference ${result.reference} · ${event.title}`,
        },
      );
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  async function handleCancel(registrationId: Id<"registrations">) {
    try {
      await cancelRegistration({ registrationId });
      setReceipt(null);
      toast.success("Seat released");
    } catch (cancelError) {
      toast.error(errorMessage(cancelError));
    }
  }

  const reference = receipt?.reference ?? activeRegistration?.reference ?? null;
  const status = receipt?.status ?? activeRegistration?.status ?? null;
  // The receipt is set before the reactive query catches up, so prefer it.
  const registrationId: Id<"registrations"> | null =
    receipt?.registrationId ?? activeRegistration?._id ?? null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="label-eyebrow">Registration</p>
          <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase tabular-nums">
            {relativeDay(event.startTime)}
          </span>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-center gap-2 text-[13px]">
          <StatusDot state={event.state} />
          <span className="text-muted-foreground">{seatSummary(event)}</span>
        </div>
        <div className="mt-4 h-px w-full bg-border">
          <div className="h-px bg-foreground/45" style={{ width: `${claimed}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
          <span>{event.fee ?? "Free entry"}</span>
          <span className="tabular-nums">
            {event.seatsTaken} registered
          </span>
        </div>
      </div>

      {reference !== null && status !== null ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="border-t border-border px-6 py-6"
        >
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="size-4 text-emerald-600" />
            <p className="text-[14px] font-medium tracking-[-0.012em]">
              {status === "waitlisted" ? "On the waitlist" : "Seat confirmed"}
            </p>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            {status === "waitlisted"
              ? "The room is full. You move onto the guest list automatically if a seat is released."
              : "Bring this reference with you — it is your place on the guest list."}
          </p>
          <div className="mt-5 rounded-md border border-dashed border-border bg-background px-4 py-3">
            <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Reference
            </p>
            <p className="font-display mt-1 text-[20px] tracking-[0.06em]">
              {reference}
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Button asChild size="sm" className="h-9 rounded-full">
              <Link to="/dashboard">
                <CalendarCheck className="size-3.5" />
                View my schedule
              </Link>
            </Button>
            {registrationId !== null && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-full text-[13px] text-muted-foreground"
                  >
                    Release my seat
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Release this seat?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your place is offered to the next person on the waitlist.
                      You can register again while seats remain.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleCancel(registrationId)}
                    >
                      Release seat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>
      ) : closed ? (
        <div className="border-t border-border px-6 py-6">
          <p className="text-[14px] font-medium tracking-[-0.012em]">
            {event.state === "past"
              ? "This event has finished"
              : "Registration has closed"}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            The programme is still open — there are other events in{" "}
            {festName ?? "this festival"}.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-5 h-9 w-full rounded-full shadow-none"
          >
            <Link to={festSlug ? `/fests/${festSlug}` : "/events"}>
              See the full programme
            </Link>
          </Button>
        </div>
      ) : !isAuthenticated ? (
        <div className="border-t border-border px-6 py-6">
          <p className="text-[14px] font-medium tracking-[-0.012em]">
            {isFull ? "Join the waitlist" : "Reserve your seat"}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            Sign in once and this form is already filled in — your name and
            email come straight from your account.
          </p>
          <Button asChild size="sm" className="mt-5 h-9 w-full rounded-full">
            <Link to={`/auth?returnTo=%2Fevents%2F${event.slug}`}>
              Sign in to continue
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border-t border-border px-6 py-6"
        >
          <p className="text-[14px] font-medium tracking-[-0.012em]">
            {isFull ? "Join the waitlist" : "Reserve your seat"}
          </p>
          <Field
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={update("fullName")}
            placeholder="As it should appear on the badge"
            required
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={update("email")}
            placeholder="name@company.com"
            required
          />
          <Field
            id="organization"
            label="Organization"
            value={form.organization}
            onChange={update("organization")}
            placeholder="Where you work"
          />
          <Field
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={update("phone")}
            placeholder="Optional"
          />
          <div className="space-y-2">
            <Label
              htmlFor="notes"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              Notes for the organizers
            </Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(event) => update("notes")(event.target.value)}
              placeholder="Anything we should know"
              rows={3}
              className="bg-card shadow-none"
            />
          </div>

          {error !== null && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] leading-5 text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-full"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ticket className="size-4" />
            )}
            {isFull ? "Join the waitlist" : "Confirm registration"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            A confirmation reference appears immediately.
          </p>
        </form>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <Skeleton className="h-3 w-24" />
      <div className="mt-10 grid gap-14 lg:grid-cols-[1.35fr_0.65fr] lg:gap-20">
        <div className="space-y-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

export default function EventDetail() {
  useEnsureSeeded();
  const { slug } = useParams<{ slug: string }>();
  const data = useQuery(api.events.getBySlug, slug ? { slug } : "skip");

  if (data === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <DetailSkeleton />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto max-w-xl px-5 py-32 text-center sm:px-8">
            <p className="label-eyebrow">Not found</p>
            <h1 className="mt-4 text-[28px] font-medium tracking-[-0.03em]">
              That event is no longer listed.
            </h1>
            <p className="mt-4 text-[14px] leading-7 text-muted-foreground">
              It may have been removed from its festival, or the link may have
              changed.
            </p>
            <Button asChild className="mt-8 h-10 rounded-full px-5">
              <Link to="/events">Back to the calendar</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { event, fest, alsoInFest } = data;
  const paragraphs = (event.description ?? "").split("\n\n").filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
          <Link
            to="/events"
            className="group inline-flex items-center gap-2 text-[12px] tracking-[0.02em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            All events
          </Link>
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <div className="mt-8 grid gap-14 lg:grid-cols-[1.35fr_0.65fr] lg:gap-20">
            <article className="min-w-0">
              {fest !== null && (
                <p className="label-eyebrow">
                  <Link
                    to={`/fests/${fest.slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {fest.organization}
                  </Link>
                  <span className="px-2 text-border">·</span>
                  <Link
                    to={`/fests/${fest.slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {fest.name}
                  </Link>
                </p>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-6 text-[34px] leading-[1.06] font-medium tracking-[-0.035em] text-balance sm:text-[42px]"
              >
                {event.title}
              </motion.h1>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
                <span className="tracking-[0.02em]">{event.category}</span>
                <span className="text-border">·</span>
                <span className="capitalize">{event.format}</span>
                {event.host !== null && (
                  <>
                    <span className="text-border">·</span>
                    <span>Hosted by {event.host}</span>
                  </>
                )}
              </div>

              {event.summary !== null && (
                <p className="mt-9 max-w-2xl text-[16px] leading-8 text-foreground/85">
                  {event.summary}
                </p>
              )}

              <div className="mt-12 grid gap-x-10 border-t border-border sm:grid-cols-2">
                <Fact
                  icon={<CalendarCheck className="size-3.5" />}
                  label="Date"
                  value={formatLongDate(event.startTime)}
                />
                <Fact
                  icon={<Clock className="size-3.5" />}
                  label="Time"
                  value={`${formatTimeRange(event.startTime, event.endTime)} · ${durationLabel(event.startTime, event.endTime)}`}
                />
                <Fact
                  icon={<MapPin className="size-3.5" />}
                  label="Venue"
                  value={event.venue}
                />
                <Fact
                  icon={<Users className="size-3.5" />}
                  label="Capacity"
                  value={`${event.capacity} places · ${event.seatsTaken} taken`}
                />
              </div>

              {paragraphs.length > 0 && (
                <section className="mt-16">
                  <h2 className="label-eyebrow">About this event</h2>
                  <div className="mt-6 max-w-2xl space-y-5">
                    {paragraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-[14px] leading-7 text-muted-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-16">
                <h2 className="label-eyebrow">Registration information</h2>
                <ul className="mt-6 max-w-2xl space-y-4 border-t border-border pt-6">
                  {[
                    event.fee !== null
                      ? `Entry: ${event.fee}.`
                      : "Entry is free for registered attendees.",
                    `${event.capacity - event.seatsTaken > 0 ? `${event.capacity - event.seatsTaken} places remain` : "The room is full"} — once it is full, new registrations join the waitlist.`,
                    "A reference code is issued immediately and appears on your schedule.",
                    "Releasing a seat passes it to the next person on the waitlist.",
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-[13px] leading-6">
                      <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {alsoInFest.length > 0 && fest !== null && (
                <section className="mt-16">
                  <h2 className="label-eyebrow">
                    Also in {fest.name}
                  </h2>
                  <div className="mt-5">
                    <EventList items={alsoInFest} grouped={false} showFest={false} />
                  </div>
                </section>
              )}
            </article>

            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <RegistrationPanel
                event={event}
                festName={fest?.name ?? null}
                festSlug={fest?.slug ?? null}
              />
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
