import { EventList, StatusDot } from "@/components/site/EventList";
import { EventReviews } from "@/components/site/EventReviews";
import { EventShop } from "@/components/site/EventShop";
import { EventSponsors } from "@/components/site/EventSponsors";
import {
  MethodPicker,
  TestModeNote,
} from "@/components/site/PaymentMethods";
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
  durationLabel,
  errorMessage,
  formatLongDate,
  formatMoney,
  formatTimeRange,
  initials,
  priceLabel,
  relativeDay,
  seatSummary,
} from "@/lib/format";
import type { CommentView, EventView, PaymentMethod } from "@/lib/types";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Paperclip,
  Users,
  X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 text-[13px]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------- booking rail */

function BookingPanel({
  event,
  programmeName,
  programmeSlug,
}: {
  event: EventView;
  programmeName: string | null;
  programmeSlug: string | null;
}) {
  const { user, isAuthenticated } = useAuth();
  const book = useMutation(api.registrations.book);
  const cancelBooking = useMutation(api.registrations.cancel);
  const detail = useQuery(api.events.getBySlug, { slug: event.slug });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: user?.company ?? "",
    notes: "",
  });
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PaymentMethod>("bkash");
  const [step, setStep] = useState<"details" | "checkout">("details");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    reference: string;
    status: string;
    paymentStatus: string;
    amountPaid: number;
    bookingId: Id<"registrations">;
  } | null>(null);

  // Fields read from the account until the customer edits them. Deriving this
  // during render keeps the prefill out of an effect.
  const fullName = edited.fullName
    ? form.fullName
    : form.fullName || (user?.name ?? "");
  const email = edited.email ? form.email : form.email || (user?.email ?? "");

  const update = (key: keyof typeof form) => (value: string) => {
    setEdited((previous) => ({ ...previous, [key]: true }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const existing = detail?.viewer.booking ?? null;
  const activeBooking =
    existing !== null && existing.status !== "cancelled" ? existing : null;
  const claimed =
    event.capacity === 0
      ? 0
      : Math.round((event.seatsTaken / event.capacity) * 100);
  const isFull = event.state === "full";
  const closed = !event.accepting;
  const payable = event.price > 0;

  const reference = receipt?.reference ?? activeBooking?.reference ?? null;
  const paymentStatus =
    receipt?.paymentStatus ?? activeBooking?.paymentStatus ?? null;
  const amountPaid = receipt?.amountPaid ?? activeBooking?.amountPaid ?? 0;
  const bookingId: Id<"registrations"> | null =
    receipt?.bookingId ?? activeBooking?._id ?? null;

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await book({
        eventId: event._id,
        ...form,
        fullName,
        email,
        paymentMethod: payable ? method : undefined,
      });
      setReceipt({
        reference: result.reference,
        status: result.status,
        paymentStatus: result.paymentStatus,
        amountPaid: result.amountPaid,
        bookingId: result.bookingId,
      });
      toast.success(
        result.status === "waitlisted"
          ? "Added to the waiting list"
          : result.alreadyBooked
            ? "You already have this place"
            : "Place booked",
        { description: `Reference ${result.reference} · ${event.title}` },
      );
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  async function release(id: Id<"registrations">) {
    try {
      await cancelBooking({ registrationId: id });
      setReceipt(null);
      setStep("details");
      toast.success("Booking cancelled");
    } catch (cancelError) {
      toast.error(errorMessage(cancelError));
    }
  }

  function paymentLine() {
    if (paymentStatus === "waived") return "No charge";
    if (paymentStatus === "paid") return `${formatMoney(amountPaid)} paid`;
    return `${formatMoney(event.price)} due on the day`;
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="label-eyebrow">Booking</p>
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
          <div
            className="h-px bg-foreground/45 transition-[width] duration-700 ease-quint"
            style={{ width: `${claimed}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
          <span>{priceLabel(event.price)} per place</span>
          <span className="tabular-nums">{event.seatsTaken} booked</span>
        </div>
      </div>

      {reference !== null && paymentStatus !== null ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="border-t border-border px-6 py-6"
        >
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="text-tone-open size-4" />
            <p className="text-[14px] font-medium tracking-[-0.012em]">
              {activeBooking?.status === "waitlisted"
                ? "On the waiting list"
                : "Place booked"}
            </p>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            {activeBooking?.status === "waitlisted"
              ? "The room is full. You move onto the guest list automatically if a place is released."
              : "Bring this reference with you — it is your place on the guest list."}
          </p>

          <div className="mt-5 rounded-md border border-dashed border-border bg-background px-4 py-3">
            <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Reference
            </p>
            <p className="font-display mt-1 text-[20px] tracking-[0.06em]">
              {reference}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <CreditCard className="size-3.5" />
              {paymentLine()}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button asChild size="sm" className="h-9 rounded-full">
              <Link to="/dashboard">
                <CalendarCheck className="size-3.5" />
                View my bookings
              </Link>
            </Button>
            {bookingId !== null && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-full text-[13px] text-muted-foreground"
                  >
                    Cancel booking
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
                      onClick={() => void release(bookingId)}
                    >
                      Cancel booking
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
              : "Booking has closed"}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            The programme is still open — there are other events in{" "}
            {programmeName ?? "this programme"}.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-5 h-9 w-full rounded-full shadow-none"
          >
            <Link to={programmeSlug ? `/programmes/${programmeSlug}` : "/events"}>
              See the full programme
            </Link>
          </Button>
        </div>
      ) : !isAuthenticated ? (
        <div className="border-t border-border px-6 py-6">
          <p className="text-[14px] font-medium tracking-[-0.012em]">
            {isFull ? "Join the waiting list" : "Book your place"}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            Sign in once and these fields arrive filled in — your name and email
            come straight from your account.
          </p>
          <Button asChild size="sm" className="mt-5 h-9 w-full rounded-full">
            <Link to={`/auth?returnTo=%2Fevents%2F${event.slug}`}>
              Sign in to continue
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : step === "details" ? (
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            setError(null);
            if (!fullName.trim() || !email.includes("@")) {
              setError("Add a name and a valid email address to continue.");
              return;
            }
            setStep("checkout");
          }}
          className="animate-rise space-y-4 border-t border-border px-6 py-6"
        >
          <p className="text-[14px] font-medium tracking-[-0.012em]">
            {isFull ? "Join the waiting list" : "Book your place"}
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
            label="Company"
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
              Notes for the organiser
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

          <Button type="submit" className="h-10 w-full rounded-full">
            Continue to checkout
            <ArrowRight className="size-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Nothing is taken until you confirm on the next step.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            void confirm();
          }}
          className="animate-rise space-y-5 border-t border-border px-6 py-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-medium tracking-[-0.012em]">
              Checkout
            </p>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Edit details
            </button>
          </div>

          <dl className="space-y-3 rounded-md border border-border bg-background px-4 py-4">
            <SummaryRow label="Event" value={event.title} />
            <SummaryRow label="When" value={formatLongDate(event.startTime)} />
            <SummaryRow
              label="Time"
              value={formatTimeRange(event.startTime, event.endTime)}
            />
            <SummaryRow label="Attendee" value={fullName} />
            <div className="border-t border-border pt-3">
              <SummaryRow
                label="Price per place"
                value={priceLabel(event.price)}
              />
              <div className="mt-3 flex items-baseline justify-between gap-6">
                <dt className="text-[13px] font-medium">Total</dt>
                <dd className="font-display text-[18px] tabular-nums">
                  {priceLabel(event.price)}
                </dd>
              </div>
            </div>
          </dl>

          {payable ? (
            <div className="space-y-2.5">
              <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                Payment
              </p>
              <MethodPicker value={method} onChange={setMethod} />
              <TestModeNote />
            </div>
          ) : (
            <p className="rounded-md border border-border bg-background px-4 py-3 text-[12px] leading-5 text-muted-foreground">
              This event is free of charge. Nothing is collected at checkout.
            </p>
          )}

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
              <Check className="size-4" />
            )}
            {isFull
              ? "Join the waiting list"
              : payable && method !== "on-site"
                ? `Pay ${formatMoney(event.price)} and confirm`
                : "Confirm booking"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {payable && method === "on-site"
              ? `${formatMoney(event.price)} stays due until the event.`
              : "A reference appears immediately after you confirm."}
          </p>
        </form>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- discussion */

function Discussion({ eventId }: { eventId: Id<"events"> }) {
  const { isAuthenticated, user } = useAuth();
  const comments = useQuery(api.comments.list, { eventId });
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);
  const generateUploadUrl = useMutation(api.comments.generateUploadUrl);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function clearFile() {
    setFile(null);
    if (fileInput.current !== null) fileInput.current.value = "";
  }

  async function submit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const text = body.trim();
    if (text.length < 3) return;
    setPending(true);
    try {
      // Upload first, so a failed transfer never leaves a post behind without
      // the file it promised.
      let attachmentId: Id<"_storage"> | undefined;
      if (file !== null) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) {
          throw new Error("That upload did not finish. Please try again.");
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        attachmentId = storageId;
      }

      await addComment({
        eventId,
        body: text,
        attachmentId,
        attachmentName: file?.name,
      });
      setBody("");
      clearFile();
      toast.success("Posted");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  const rows = (comments ?? []) as CommentView[];

  return (
    <section className="mt-16">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <h2 className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
          Questions and notes
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {comments === undefined ? "" : rows.length}
        </span>
      </div>

      {isAuthenticated ? (
        <form onSubmit={submit} className="mt-6">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="Ask a question, or leave a note for the other attendees."
            className="bg-card shadow-none"
          />
          {file !== null && (
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px]">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove attachment"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              Posting as {user?.name ?? user?.email ?? "you"}.
            </p>
            <div className="flex items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(changeEvent) =>
                  setFile(changeEvent.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={pending}
                className="h-8 gap-1.5 rounded-full border-border px-4 text-[12px] shadow-none"
              >
                <Paperclip className="size-3.5" />
                Attach
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending || body.trim().length < 3}
                className="h-8 rounded-full px-4 text-[12px]"
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Post
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-6 rounded-md border border-border bg-card px-4 py-3.5 text-[13px] leading-6 text-muted-foreground">
          <Link
            to="/auth"
            className="text-foreground underline decoration-border underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <div className="mt-8">
        {comments === undefined ? (
          <div className="space-y-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[13px] leading-6 text-muted-foreground">
            Nothing here yet. Ask the first question, or share a document the
            other attendees might need.
          </p>
        ) : (
          <ul className="space-y-6">
            {rows.map((comment) => (
              <li key={comment._id} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-[10px] font-medium">
                  {initials(comment.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-[13px] font-medium tracking-[-0.01em]">
                      {comment.authorName}
                    </p>
                    {comment.authorCompany !== null && (
                      <p className="text-[12px] text-muted-foreground">
                        {comment.authorCompany}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNowStrict(comment.createdAt)} ago
                    </p>
                    {comment.userId === user?._id && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await removeComment({ commentId: comment._id });
                          } catch (error) {
                            toast.error(errorMessage(error));
                          }
                        }}
                        className="text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground whitespace-pre-line">
                    {comment.body}
                  </p>
                  {comment.attachmentUrl !== null && (
                    <a
                      href={comment.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] transition-colors hover:border-foreground/25"
                    >
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {comment.attachmentName ?? "Attached file"}
                      </span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- page */

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
              It may have been removed from its programme, or the link may have
              changed.
            </p>
            <Button asChild className="mt-8 h-10 rounded-full px-5">
              <Link to="/events">Back to the catalogue</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { event, fest, alsoInProgramme } = data;
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
            Back to the catalogue
          </Link>
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <div className="mt-8 grid gap-14 lg:grid-cols-[1.35fr_0.65fr] lg:gap-20">
            <article className="min-w-0">
              {fest !== null && (
                <p className="label-eyebrow">
                  <Link
                    to={`/programmes/${fest.slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {fest.organization}
                  </Link>
                  <span className="px-2 text-border">·</span>
                  <Link
                    to={`/programmes/${fest.slug}`}
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
                  value={`${formatTimeRange(event.startTime, event.endTime)} · ${durationLabel(
                    event.startTime,
                    event.endTime,
                  )}`}
                />
                <Fact
                  icon={<MapPin className="size-3.5" />}
                  label="Venue"
                  value={event.venue}
                />
                <Fact
                  icon={<Users className="size-3.5" />}
                  label="Places"
                  value={`${event.capacity} places · ${event.seatsTaken} booked · ${priceLabel(event.price)} each`}
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
                <h2 className="label-eyebrow">Booking and payment</h2>
                <ul className="mt-6 max-w-2xl space-y-4 border-t border-border pt-6">
                  {[
                    event.price === 0
                      ? "There is no charge for this event."
                      : `${formatMoney(event.price)} per place. Pay by bKash, Nagad, Google Pay, PayPal or card at checkout, or settle on the day.`,
                    event.capacity - event.seatsTaken > 0
                      ? `${event.capacity - event.seatsTaken} places remain. Once they are gone, new bookings join the waiting list.`
                      : "The room is full. New bookings join the waiting list and are promoted automatically.",
                    "A booking reference is issued immediately and appears on your own schedule.",
                    "Cancelling releases your place to the next customer on the waiting list.",
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-[13px] leading-6">
                      <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Discussion eventId={event._id} />

              <EventShop eventId={event._id} eventSlug={event.slug} />

              {fest !== null && (
                <EventSponsors
                  festId={event.festId}
                  eventId={event._id}
                  eventTitle={event.title}
                  eventSlug={event.slug}
                  programmeName={fest.name}
                />
              )}

              <EventReviews eventId={event._id} />

              {alsoInProgramme.length > 0 && fest !== null && (
                <section className="mt-16">
                  <h2 className="label-eyebrow">Also in {fest.name}</h2>
                  <div className="mt-5">
                    <EventList
                      items={alsoInProgramme}
                      grouped={false}
                      showProgramme={false}
                    />
                  </div>
                </section>
              )}
            </article>

            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <BookingPanel
                event={event}
                programmeName={fest?.name ?? null}
                programmeSlug={fest?.slug ?? null}
              />
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
