import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  makeReference,
  publicEvent,
  publicFest,
  requireUserId,
  seatState,
} from "./model";

/**
 * Claim a seat at an event. When the room is full the sign-up is accepted as
 * a waitlist place rather than rejected, which is what a busy attendee would
 * expect from a polished registration flow.
 */
export const register = mutation({
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
      throw new Error("Registration has closed for this event.");
    }

    const fullName = args.fullName.trim();
    const email = args.email.trim().toLowerCase();
    if (!fullName) throw new Error("Please add the name for the badge.");
    if (!email.includes("@")) throw new Error("Please enter a valid email.");

    const status = event.seatsTaken >= event.capacity ? "waitlisted" : "confirmed";

    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", userId),
      )
      .unique();

    if (existing !== null && existing.status !== "cancelled") {
      return {
        alreadyRegistered: true,
        registrationId: existing._id,
        status: existing.status,
        reference: existing.reference,
        seatsRemaining: Math.max(0, event.capacity - event.seatsTaken),
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
        reference: makeReference(),
        createdAt: Date.now(),
      });
      if (status === "confirmed") {
        await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken + 1 });
      }
      const refreshed = await ctx.db.get(existing._id);
      return {
        alreadyRegistered: false,
        registrationId: existing._id,
        status,
        reference: refreshed?.reference ?? "",
        seatsRemaining: Math.max(
          0,
          event.capacity - event.seatsTaken - (status === "confirmed" ? 1 : 0),
        ),
      };
    }

    const reference = makeReference();
    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      festId: event.festId,
      userId,
      fullName,
      email,
      phone: args.phone?.trim() || undefined,
      organization: args.organization?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      status,
      reference,
      createdAt: Date.now(),
    });

    if (status === "confirmed") {
      await ctx.db.patch(event._id, { seatsTaken: event.seatsTaken + 1 });
    }

    return {
      alreadyRegistered: false,
      registrationId,
      status,
      reference,
      seatsRemaining: Math.max(
        0,
        event.capacity - event.seatsTaken - (status === "confirmed" ? 1 : 0),
      ),
    };
  },
});

/**
 * Give up a seat. A confirmed attendee is replaced by the earliest person on
 * the waitlist, so the room stays full without ever overselling it.
 */
export const cancel = mutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, { registrationId }) => {
    const userId = await requireUserId(ctx);
    const registration = await ctx.db.get(registrationId);
    if (registration === null) return { cancelled: false };
    if (registration.userId !== userId) {
      throw new Error("That registration belongs to another account.");
    }
    if (registration.status === "cancelled") return { cancelled: true };

    await ctx.db.patch(registrationId, { status: "cancelled" });

    if (registration.status === "confirmed") {
      const event = await ctx.db.get(registration.eventId);
      if (event !== null) {
        const siblings = await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", registration.eventId))
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

    return { cancelled: true, promoted: registration.status === "confirmed" };
  },
});

/** The signed-in attendee's own schedule. */
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
          _id: row._id,
          status: row.status,
          reference: row.reference,
          createdAt: row.createdAt,
          fullName: row.fullName,
          email: row.email,
          eventId: row.eventId,
          event: event === null ? null : publicEvent(event, now),
          fest: fest === null ? null : publicFest(fest, now),
          upcoming: event !== null && event.endTime >= now,
        };
      }),
    );

    return hydrated.sort((a, b) => {
      const aTime = a.event?.startTime ?? 0;
      const bTime = b.event?.startTime ?? 0;
      return aTime - bTime;
    });
  },
});

/** The guest list for one event — organizer only. */
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

    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((row) => ({
        _id: row._id,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone ?? null,
        organization: row.organization ?? null,
        notes: row.notes ?? null,
        status: row.status,
        reference: row.reference,
        createdAt: row.createdAt,
      }));
  },
});
