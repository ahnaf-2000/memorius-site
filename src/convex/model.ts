import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** "Tech Carnival 2026" -> "tech-carnival-2026" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Short, human-readable confirmation code, e.g. "CDN-7K4Q2M". */
export function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CDN-${code}`;
}

/** Signed-in user id, or throw a message the UI can show as-is. */
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

/** Short label for the seat state, used next to the status dot. */
export const SEAT_STATE_LABEL: Record<SeatState, string> = {
  open: "Open",
  few: "Almost full",
  full: "Waitlist",
  closed: "Closed",
  past: "Finished",
};

/**
 * Derived seat state. Never stored, so the badge on an event can never drift
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

/** A festival phase, derived from its dates. */
export function festPhase(
  fest: Pick<Doc<"fests">, "startDate" | "endDate">,
  now = Date.now(),
): "upcoming" | "live" | "past" {
  const end = fest.endDate ?? fest.startDate;
  if (now < fest.startDate) return "upcoming";
  if (now > end) return "past";
  return "live";
}

/** Public shape of an event — capacity maths resolved for the client. */
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
    fee: event.fee ?? null,
    registrationClosesAt: event.registrationClosesAt ?? null,
    state,
    stateLabel: SEAT_STATE_LABEL[state],
    accepting: state !== "past" && state !== "closed",
  };
}

export type PublicEvent = ReturnType<typeof publicEvent>;

/** Public shape of a registration row. */
export function publicRegistration(registration: Doc<"registrations">) {
  return {
    _id: registration._id,
    eventId: registration.eventId,
    festId: registration.festId,
    status: registration.status,
    reference: registration.reference,
    createdAt: registration.createdAt,
    fullName: registration.fullName,
    email: registration.email,
    phone: registration.phone ?? null,
    organization: registration.organization ?? null,
    notes: registration.notes ?? null,
  };
}

/** Public shape of a fest row. */
export function publicFest(
  fest: Doc<"fests">,
  now = Date.now(),
) {
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
