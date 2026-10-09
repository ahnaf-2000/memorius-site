import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  cancellationPolicy,
  makeReference,
  programmeAccess,
  publicBooking,
  publicEvent,
  publicFest,
  requireUserId,
  seatState,
} from "./model";
import { appUrl, whenAndTime } from "./notifications";
import {
  DEFAULT_PARTICIPANT_CATEGORY,
  normalizeParticipantCategory,
  PARTICIPANT_CATEGORIES,
} from "./taxonomy";

/**
 * The statuses an organizer may decide on. "cancelled" is the customer's own
 * act; a desk that releases a place for them uses it deliberately and says why.
 */
const decisionValidator = v.union(
  v.literal("confirmed"),
  v.literal("waitlisted"),
  v.literal("cancelled"),
  v.literal("declined"),
);

/** A status that no longer holds a place. */
function vacates(status: string): boolean {
  return status === "cancelled" || status === "declined";
}

/**
 * Take a booking. When the room is full the booking is accepted as a waiting
 * list place rather than refused, which is what a customer expects from a
 * polished checkout.
 *
 * Every event on the platform is free, so a place carries no price, no
 * promotion and no method: it is recorded as waived with nothing to pay.
 */
export const book = mutation({
  args: {
    eventId: v.id("events"),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    notes: v.optional(v.string()),
    /** Who they are on the guest list; a delegate when they do not say. */
    participantCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event === null) throw new Error("That event no longer exists.");

    const state = seatState(event);
    if (state === "past") {
      throw new Error("This event has already taken place.");
    }
    if (state === "closed") {
      throw new Error("Booking has closed for this event.");
    }

    const fullName = args.fullName.trim();
    const email = args.email.trim().toLowerCase();
    if (!fullName) throw new Error("Please add the name for the booking.");
    if (!email.includes("@")) throw new Error("Please enter a valid email.");

    const status =
      event.seatsTaken >= event.capacity ? "waitlisted" : "confirmed";
    const participantCategory = normalizeParticipantCategory(
      args.participantCategory ?? DEFAULT_PARTICIPANT_CATEGORY,
    );

    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", userId),
      )
      .unique();

    if (existing !== null && existing.status !== "cancelled") {
      return {
        alreadyBooked: true,
        bookingId: existing._id,
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        amountPaid: existing.amountPaid,
        discount: 0,
        total: 0,
        promoCode: null,
        reference: existing.reference,
        placesRemaining: Math.max(0, event.capacity - event.seatsTaken),
      };
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        fullName,
        email,
        phone: args.phone?.trim() || undefined,
        organization: args.organization?.trim() || undefined,
        notes: args.notes?.trim() || undefined,
        participantCategory,
        status,
        paymentStatus: "waived",
        paymentMethod: undefined,
        amountPaid: 0,
        promoCode: undefined,
        discount: 0,
        // A re-booking is a fresh decision: the old one no longer applies.
        decidedAt: undefined,
        decisionNote: undefined,
        cancellationFee: undefined,
        checkedInAt: undefined,
        checkedInBy: undefined,
        reference: makeReference(),
        createdAt: Date.now(),
      });
      if (status === "confirmed") {
        await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken + 1 });
      }
      // A place taken again is a place confirmed again: the customer gets the
      // same personalised message, with the invoice, as a first booking.
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.bookingConfirmation,
        { registrationId: existing._id },
      );
      const refreshed = await ctx.db.get(existing._id);
      return {
        alreadyBooked: false,
        bookingId: existing._id,
        status,
        paymentStatus: "waived",
        amountPaid: 0,
        discount: 0,
        total: 0,
        promoCode: null,
        reference: refreshed?.reference ?? "",
        placesRemaining: Math.max(
          0,
          event.capacity - event.seatsTaken - (status === "confirmed" ? 1 : 0),
        ),
      };
    }

    const reference = makeReference();
    const bookingId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      festId: event.festId,
      userId,
      fullName,
      email,
      phone: args.phone?.trim() || undefined,
      organization: args.organization?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      participantCategory,
      status,
      paymentStatus: "waived",
      paymentMethod: undefined,
      amountPaid: 0,
      promoCode: undefined,
      discount: 0,
      reference,
      createdAt: Date.now(),
    });

    if (status === "confirmed") {
      await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken + 1 });
    }

    // The confirmation, with everything the customer needs at the door and the
    // invoice as a printable PDF, is assembled from the record just written.
    await ctx.scheduler.runAfter(0, internal.notifications.bookingConfirmation, {
      registrationId: bookingId,
    });

    return {
      alreadyBooked: false,
      bookingId,
      status,
      paymentStatus: "waived",
      amountPaid: 0,
      discount: 0,
      total: 0,
      promoCode: null,
      reference,
      placesRemaining: Math.max(
        0,
        event.capacity - event.seatsTaken - (status === "confirmed" ? 1 : 0),
      ),
    };
  },
});

/**
 * Give up a place. A confirmed customer is replaced by the earliest person on
 * the waiting list, so the room stays full without ever overselling it.
 */
export const cancel = mutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, { registrationId }) => {
    const userId = await requireUserId(ctx);
    const booking = await ctx.db.get(registrationId);
    if (booking === null) return { cancelled: false, fee: 0 };
    if (booking.userId !== userId) {
      throw new Error("That booking belongs to another account.");
    }
    if (vacates(booking.status)) return { cancelled: true, fee: 0 };

    // The policy is settled here, at the moment of release, and recorded on the
    // booking: a policy changed tomorrow cannot rewrite what was agreed today.
    const event = await ctx.db.get(booking.eventId);
    const fest = event === null ? null : await ctx.db.get(event.festId);
    const policy =
      event === null ? { fee: 0, hours: 0 } : cancellationPolicy(event, fest);
    const deadline = event === null
      ? null
      : event.startTime - policy.hours * 60 * 60 * 1000;
    const fee =
      policy.fee > 0 && deadline !== null && Date.now() > deadline
        ? policy.fee
        : 0;

    await ctx.db.patch(registrationId, {
      status: "cancelled",
      cancellationFee: fee === 0 ? undefined : fee,
    });

    if (booking.status === "confirmed") {
      const event = await ctx.db.get(booking.eventId);
      if (event !== null) {
        const siblings = await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", booking.eventId))
          .collect();
        const nextInLine = siblings
          .filter((row) => row.status === "waitlisted")
          .sort((a, b) => a.createdAt - b.createdAt)[0];
        if (nextInLine !== undefined) {
          await ctx.db.patch(nextInLine._id, { status: "confirmed" });
          // They were waiting for this: the confirmation goes out the moment
          // the place becomes theirs.
          await ctx.scheduler.runAfter(
            0,
            internal.notifications.bookingConfirmation,
            { registrationId: nextInLine._id },
          );
        } else {
          await ctx.db.patch(event._id, {
            seatsTaken: Math.max(0, event.seatsTaken - 1),
          });
        }
      }
    }

    return { cancelled: true, promoted: booking.status === "confirmed", fee };
  },
});

/**
 * The organizer's answer to one booking.
 *
 * A decision moves a place and then says so — the customer is emailed in the
 * same breath, because a status changed quietly in a console is the same as no
 * answer at all. Places are never oversold: confirming someone into a full room
 * is refused with the two ways out, rather than quietly adding a seventeenth
 * chair.
 */
export const decide = mutation({
  args: {
    registrationId: v.id("registrations"),
    status: decisionValidator,
    note: v.optional(v.string()),
    /** Who a participant is on this guest list, when it needs correcting. */
    participantCategory: v.optional(v.string()),
    /** Email the customer about it. On by default: a decision is news. */
    notify: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.registrationId);
    if (booking === null) throw new Error("That booking no longer exists.");
    const access = await programmeAccess(ctx, booking.festId, "editor");
    const event = await ctx.db.get(booking.eventId);
    if (event === null) throw new Error("That event no longer exists.");

    const wasHolding = booking.status === "confirmed";
    const willHold = args.status === "confirmed";

    if (!wasHolding && willHold && event.seatsTaken >= event.capacity) {
      throw new Error(
        "The room is full. Release a place first, or keep this booking on the waiting list.",
      );
    }

    if (wasHolding !== willHold) {
      await ctx.db.patch(event._id, {
        seatsTaken: Math.max(0, event.seatsTaken + (willHold ? 1 : -1)),
      });
    }

    const note = args.note?.trim().slice(0, 400);
    const decidedAt = Date.now();
    await ctx.db.patch(args.registrationId, {
      status: args.status,
      decidedAt,
      decisionNote: note === undefined || note === "" ? undefined : note,
      ...(args.participantCategory === undefined
        ? {}
        : {
            participantCategory: normalizeParticipantCategory(
              args.participantCategory,
            ),
          }),
      // A place the organizer takes back is not a late release by the customer,
      // so no cancellation fee is recorded against them.
      ...(args.status === "cancelled" || args.status === "declined"
        ? { cancellationFee: undefined, checkedInAt: undefined, checkedInBy: undefined }
        : {}),
    });

    // A place freed by a decision is offered to whoever is next in line.
    if (wasHolding && !willHold) {
      const siblings = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", booking.eventId))
        .collect();
      const nextInLine = siblings
        .filter((row) => row.status === "waitlisted")
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      if (nextInLine !== undefined) {
        await ctx.db.patch(nextInLine._id, { status: "confirmed" });
        await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken });
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.bookingConfirmation,
          { registrationId: nextInLine._id },
        );
      }
    }

    const notify = args.notify ?? true;
    if (notify) {
      const fest = access.fest;
      const { when, time } = whenAndTime(event.startTime, event.endTime);
      const decider = await ctx.db.get(access.userId);
      await ctx.scheduler.runAfter(0, internal.mail.sendDecisionEmail, {
        to: booking.email,
        fullName: booking.fullName,
        reference: booking.reference,
        status: args.status,
        eventTitle: event.title,
        programmeName: fest.name,
        organization: fest.organization,
        when,
        time,
        venue: event.venue,
        ...(note === undefined || note === "" ? {} : { note }),
        decidedByName:
          decider?.name ?? decider?.email ?? "the organizing team",
        eventUrl: `${appUrl()}/events/${event.slug}`,
      });
    }

    return { status: args.status, notified: notify };
  },
});

/**
 * The door roster.
 *
 * One press marks someone in or undoes it, and the mark carries who made it:
 * an attendance list that cannot be argued with is worth having, and an
 * attendance list that cannot be corrected is not.
 */
export const checkIn = mutation({
  args: { registrationId: v.id("registrations"), present: v.boolean() },
  handler: async (ctx, { registrationId, present }) => {
    const booking = await ctx.db.get(registrationId);
    if (booking === null) throw new Error("That booking no longer exists.");
    await programmeAccess(ctx, booking.festId, "editor");
    if (booking.status !== "confirmed") {
      throw new Error(
        "Only a confirmed place can be checked in. Confirm the booking first.",
      );
    }
    const userId = await requireUserId(ctx);
    await ctx.db.patch(registrationId, {
      checkedInAt: present ? Date.now() : undefined,
      checkedInBy: present ? userId : undefined,
    });
    return { present };
  },
});

/**
 * There is nothing to settle on a free event. A booking left carrying a balance
 * by an older, priced catalogue is cleared here, so a dashboard can never ask
 * for money that is no longer owed.
 */
export const settle = mutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, { registrationId }) => {
    const userId = await requireUserId(ctx);
    const booking = await ctx.db.get(registrationId);
    if (booking === null) throw new Error("That booking no longer exists.");
    if (booking.userId !== userId) {
      throw new Error("That booking belongs to another account.");
    }
    if (booking.status === "cancelled") {
      throw new Error("That booking has been released.");
    }
    if (booking.paymentStatus === "waived" && booking.amountPaid === 0) {
      return { settled: false, amountPaid: 0 };
    }
    await ctx.db.patch(registrationId, {
      paymentStatus: "waived",
      paymentMethod: undefined,
      amountPaid: 0,
      discount: 0,
    });
    return { settled: true, amountPaid: 0 };
  },
});

/** The signed-in customer's own bookings, soonest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();
    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const event = await ctx.db.get(row.eventId);
        const fest = event === null ? null : await ctx.db.get(event.festId);
        return {
          ...publicBooking(row),
          event: event === null ? null : publicEvent(event, now),
          fest: fest === null ? null : publicFest(fest, now),
          upcoming: event !== null && event.endTime >= now,
        };
      }),
    );

    return hydrated.sort(
      (a, b) => (a.event?.startTime ?? 0) - (b.event?.startTime ?? 0),
    );
  },
});

/**
 * The guest list for one event — owning account only. A place is free, so the
 * list carries who is coming rather than what they still owe.
 */
export const forEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return null;

    const event = await ctx.db.get(eventId);
    if (event === null) return null;
    const fest = await ctx.db.get(event.festId);
    if (fest === null) return null;
    const access = await programmeAccess(ctx, fest._id, "viewer").catch(
      () => null,
    );
    if (access === null) return null;

    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return {
      price: 0,
      role: access.role,
      canDecide: access.isOwner || access.role !== "viewer",
      policy: cancellationPolicy(event, fest),
      counts: {
        confirmed: rows.filter((row) => row.status === "confirmed").length,
        waitlisted: rows.filter((row) => row.status === "waitlisted").length,
        cancelled: rows.filter((row) => row.status === "cancelled").length,
        declined: rows.filter((row) => row.status === "declined").length,
        checkedIn: rows.filter((row) => row.checkedInAt !== undefined).length,
      },
      bookings: rows
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((row) => publicBooking(row)),
    };
  },
});

/** Every booking across the programmes this account runs, newest first. */
export const forBusiness = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const rows = (
      await Promise.all(
        fests.map(async (fest) => {
          const bookings = await ctx.db
            .query("registrations")
            .withIndex("by_fest", (q) => q.eq("festId", fest._id))
            .collect();
          return Promise.all(
            bookings.map(async (row) => {
              const event = await ctx.db.get(row.eventId);
              return {
                ...publicBooking(row),
                eventTitle: event?.title ?? "Removed event",
                eventSlug: event?.slug ?? "",
                eventStart: event?.startTime ?? 0,
                eventId: row.eventId,
                festId: fest._id,
                eventCategory: event?.category ?? "Open",
                canDecide: true,
                price: 0,
                programmeName: fest.name,
              };
            }),
          );
        }),
      )
    ).flat();

    // The whole directory, newest first: the console searches and filters it in
    // the browser, and a cap here would quietly hide the guests someone is
    // looking for.
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Set one participant's category, or the whole guest list's status, in bulk.
 *
 * The single-row decision above is the precise tool; this is the one an
 * organizer reaches for after a session when twelve people turned out to be
 * speakers. It is deliberately small: one event, one field, one value.
 */
export const relabel = mutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    participantCategory: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.registrationId);
    if (booking === null) throw new Error("That booking no longer exists.");
    if (booking.eventId !== args.eventId) {
      throw new Error("That booking belongs to another event.");
    }
    await programmeAccess(ctx, booking.festId, "editor");
    if (!(PARTICIPANT_CATEGORIES as readonly string[]).includes(args.participantCategory)) {
      throw new Error("Pick one of the guest list categories.");
    }
    await ctx.db.patch(args.registrationId, {
      participantCategory: normalizeParticipantCategory(
        args.participantCategory,
      ),
    });
    return { participantCategory: args.participantCategory };
  },
});
