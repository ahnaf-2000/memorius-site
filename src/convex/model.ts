import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** "Operations Summit 2026" -> "operations-summit-2026" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Short, human-readable booking reference, e.g. "MEM-7K4Q2M". */
export function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MEM-${code}`;
}

/** Signed-in user id, or throw a message the interface can show as-is. */
export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">["_id"]> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Please sign in to continue.");
  }
  return userId;
}

export type SeatState = "open" | "few" | "full" | "closed" | "past";

/** Short label for the availability state, shown next to the status dot. */
export const SEAT_STATE_LABEL: Record<SeatState, string> = {
  open: "Open",
  few: "Almost full",
  full: "Waiting list",
  closed: "Booking closed",
  past: "Finished",
};

/**
 * Derived availability. Never stored, so the badge on an event can never drift
 * away from the numbers it is based on.
 */
export function seatState(
  event: Pick<
    Doc<"events">,
    "capacity" | "seatsTaken" | "startTime" | "registrationClosesAt"
  >,
  now = Date.now(),
): SeatState {
  if (event.startTime < now) return "past";
  const remaining = Math.max(0, event.capacity - event.seatsTaken);
  if (remaining === 0) return "full";
  if (
    event.registrationClosesAt !== undefined &&
    event.registrationClosesAt < now
  ) {
    return "closed";
  }
  if (remaining <= Math.max(3, Math.round(event.capacity * 0.15))) return "few";
  return "open";
}

/** A programme phase, derived from its dates. */
export function festPhase(
  fest: Pick<Doc<"fests">, "startDate" | "endDate">,
  now = Date.now(),
): "upcoming" | "live" | "past" {
  const end = fest.endDate ?? fest.startDate;
  if (now < fest.startDate) return "upcoming";
  if (now > end) return "past";
  return "live";
}

/**
 * Public shape of an event — availability and pricing resolved for the client.
 *
 * Every event on the platform is free of charge, so the price a page quotes is
always zero: a place never costs anything, whoever wrote the row. Whatever the
legacy `price` column still holds is therefore never what a visitor is shown.
 */
export function publicEvent(event: Doc<"events">, now = Date.now()) {
  const state = seatState(event, now);
  return {
    _id: event._id,
    festId: event.festId,
    title: event.title,
    slug: event.slug,
    category: event.category,
    summary: event.summary ?? null,
    description: event.description ?? null,
    format: event.format,
    startTime: event.startTime,
    endTime: event.endTime,
    venue: event.venue,
    host: event.host ?? null,
    capacity: event.capacity,
    seatsTaken: event.seatsTaken,
    remaining: Math.max(0, event.capacity - event.seatsTaken),
    price: 0,
    registrationClosesAt: event.registrationClosesAt ?? null,
    state,
    stateLabel: SEAT_STATE_LABEL[state],
    accepting: state !== "past" && state !== "closed",
  };
}

export type PublicEvent = ReturnType<typeof publicEvent>;

/** Public shape of a booking row. */
export function publicBooking(booking: Doc<"registrations">) {
  return {
    _id: booking._id,
    eventId: booking.eventId,
    festId: booking.festId,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod ?? null,
    amountPaid: booking.amountPaid,
    promoCode: booking.promoCode ?? null,
    discount: booking.discount ?? 0,
    reference: booking.reference,
    createdAt: booking.createdAt,
    fullName: booking.fullName,
    email: booking.email,
    phone: booking.phone ?? null,
    organization: booking.organization ?? null,
    notes: booking.notes ?? null,
  };
}

export type PublicBooking = ReturnType<typeof publicBooking>;

/** Public shape of a programme row. */
export function publicFest(fest: Doc<"fests">, now = Date.now()) {
  return {
    _id: fest._id,
    organization: fest.organization,
    name: fest.name,
    slug: fest.slug,
    summary: fest.summary ?? null,
    description: fest.description ?? null,
    venue: fest.venue ?? null,
    startDate: fest.startDate,
    endDate: fest.endDate ?? null,
    status: fest.status,
    owned: fest.ownerId !== undefined,
    showcase: fest.showcase === true,
    phase: festPhase(fest, now),
  };
}

export type PublicFest = ReturnType<typeof publicFest>;

/** Public shape of a comment on an event. */
export function publicComment(comment: Doc<"comments">) {
  return {
    _id: comment._id,
    eventId: comment.eventId,
    userId: comment.userId,
    authorName: comment.authorName,
    authorCompany: comment.authorCompany ?? null,
    body: comment.body,
    attachmentName: comment.attachmentName ?? null,
    createdAt: comment.createdAt,
  };
}

export type PublicComment = ReturnType<typeof publicComment>;

/**
 * Slug that is unique inside a table. Appends -2, -3 ... until it is free.
 */
export async function uniqueSlug(
  ctx: MutationCtx,
  table: "fests" | "events",
  base: string,
): Promise<string> {
  const root = slugify(base) || "untitled";
  let candidate = root;
  let n = 2;
  for (;;) {
    const clash =
      table === "fests"
        ? await ctx.db
            .query("fests")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .unique()
        : await ctx.db
            .query("events")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .unique();
    if (clash === null) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}
