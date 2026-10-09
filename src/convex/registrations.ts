import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  makeReference,
  publicBooking,
  publicEvent,
  publicFest,
  requireUserId,
  seatState,
} from "./model";

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
        status,
        paymentStatus: "waived",
        paymentMethod: undefined,
        amountPaid: 0,
        promoCode: undefined,
        discount: 0,
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
    if (booking === null) return { cancelled: false };
    if (booking.userId !== userId) {
      throw new Error("That booking belongs to another account.");
    }
    if (booking.status === "cancelled") return { cancelled: true };

    await ctx.db.patch(registrationId, { status: "cancelled" });

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

    return { cancelled: true, promoted: booking.status === "confirmed" };
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
    if (fest === null || fest.ownerId !== userId) return null;

    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return {
      price: 0,
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
                price: 0,
                programmeName: fest.name,
              };
            }),
          );
        }),
      )
    ).flat();

    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  },
});
