import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  makeReference,
  publicBooking,
  publicEvent,
  publicFest,
  requireUserId,
  seatState,
} from "./model";
import { paymentMethodValidator as methodValidator } from "./schema";

/** Everything except settling at the desk is taken as settled on the spot. */
function settlesImmediately(method: string) {
  return method !== "on-site";
}

/**
 * Take a booking. When the room is full the booking is accepted as a waiting
 * list place rather than refused, which is what a customer expects from a
 * polished checkout.
 *
 * Since every event is free, payment is always waived and there is no promo
 * path to resolve here — the booking only needs a name, an email, and a seat.
 */
export const book = mutation({
  args: {
    eventId: v.id("events"),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(methodValidator),
    promoCode: v.optional(v.string()),
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

    // Free events do not take promo codes or payment methods.
    if (args.promoCode !== undefined) {
      throw new Error("This event is free, so there are no promo codes.");
    }
    if (args.paymentMethod !== undefined) {
      throw new Error("This event is free, so there is no payment method to pick.");
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
        amountPaid: 0,
        reference: makeReference(),
        createdAt: Date.now(),
      });
      if (status === "confirmed") {
        await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken + 1 });
      }
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
      amountPaid: 0,
      discount: 0,
      reference,
      createdAt: Date.now(),
    });

    if (status === "confirmed") {
      await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken + 1 });
    }

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

/** Give up a place. A confirmed customer is replaced by the earliest person on
 * the waiting list, so the room stays full without ever overselling it. */
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

/** There is nothing to settle on a free event. */
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
    if (booking.paymentStatus !== "due") {
      return { settled: false, amountPaid: booking.amountPaid };
    }
    // The database may still hold legacy "due" rows for old paid events. Free
    // events never reach this branch, but clearing the balance here is harmless
    // if one does.
    await ctx.db.patch(registrationId, {
      paymentStatus: "waived",
      amountPaid: 0,
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

/** The guest list for one event, with payment state — owning account only. */
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

/** The shop is still supported, but every order is recorded as free. */
export const checkout = mutation({
  args: {
    eventId: v.id("events"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      }),
    ),
    paymentMethod: methodValidator,
    fullName: v.string(),
    email: v.string(),
    country: v.string(),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event === null) throw new Error("That event no longer exists.");

    const fest = await ctx.db.get(event.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("Only the owning account can check out here.");
    }

    const productRows = await Promise.all(
      args.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (product === null) throw new Error("Unknown shop item.");
        if (product.eventId !== args.eventId) {
          throw new Error("That item does not belong to this event.");
        }
        if (product.stock - product.sold < item.quantity) {
          throw new Error(`Only ${product.stock - product.sold} left of ${product.name}.`);
        }
        return product;
      }),
    );

    const subtotal = args.items.reduce(
      (sum, item, index) => sum + productRows[index].price * item.quantity,
      0,
    );

    const reference = makeReference();
    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      festId: event.festId,
      userId,
      items: args.items.map((item, index) => ({
        productId: item.productId,
        name: productRows[index].name,
        kind: productRows[index].kind,
        unitPrice: productRows[index].price,
        quantity: item.quantity,
      })),
      subtotal,
      promoCode: undefined,
      discount: 0,
      country: args.country,
      paymentMethod: args.paymentMethod,
      paymentStatus: "waived",
      amountPaid: 0,
      reference,
      fullName: args.fullName.trim(),
      email: args.email.trim().toLowerCase(),
      status: "placed",
      createdAt: Date.now(),
    });

    for (const item of args.items) {
      await ctx.db.patch(item.productId, {
        sold: (await ctx.db.get(item.productId))!.sold + item.quantity,
      });
    }

    return {
      orderId,
      reference,
      subtotal,
      discount: 0,
      promoCode: undefined,
      paymentStatus: "waived",
    };
  },
});

/** List shop items for one event, so the checkout can render them. */
export const forProducts = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (event === null) return [];

    const products = await ctx.db
      .query("products")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return products
      .filter((product) => product.active)
      .map((product) => ({
        _id: product._id,
        name: product.name,
        kind: product.kind,
        description: product.description,
        price: product.price,
        available: product.stock - product.sold,
      }));
  },
});
