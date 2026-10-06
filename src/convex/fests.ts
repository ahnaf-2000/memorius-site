import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { publicEvent, publicFest, requireUserId, uniqueSlug } from "./model";

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

/** Every programme, soonest first, with its event and booking rollup. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fests = await ctx.db.query("fests").collect();
    const rows = await Promise.all(
      fests.map(async (fest) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_fest", (q) => q.eq("festId", fest._id))
          .collect();
        const categories = Array.from(new Set(events.map((e) => e.category)));
        return {
          ...publicFest(fest, now),
          eventCount: events.length,
          seatsTaken: events.reduce((sum, e) => sum + e.seatsTaken, 0),
          capacity: events.reduce((sum, e) => sum + e.capacity, 0),
          categories: categories.slice(0, 4),
        };
      }),
    );
    return rows.sort((a, b) => a.startDate - b.startDate);
  },
});

/** A single programme plus its full event list. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const fest = await ctx.db
      .query("fests")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (fest === null) return null;

    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_fest", (q) => q.eq("festId", fest._id))
      .collect();

    const sorted = events
      .sort((a, b) => a.startTime - b.startTime)
      .map((event) => publicEvent(event, now));

    return {
      fest: {
        ...publicFest(fest, now),
        eventCount: sorted.length,
        seatsTaken: sorted.reduce((sum, e) => sum + e.seatsTaken, 0),
        capacity: sorted.reduce((sum, e) => sum + e.capacity, 0),
      },
      events: sorted,
    };
  },
});

/** Programmes this account runs — the business's own shelf. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];
    const now = Date.now();
    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    return Promise.all(
      fests.map(async (fest) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_fest", (q) => q.eq("festId", fest._id))
          .collect();
        return {
          ...publicFest(fest, now),
          eventCount: events.length,
          seatsTaken: events.reduce((sum, e) => sum + e.seatsTaken, 0),
          capacity: events.reduce((sum, e) => sum + e.capacity, 0),
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    organization: v.string(),
    name: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const slug = await uniqueSlug(ctx, "fests", args.name);
    const id = await ctx.db.insert("fests", {
      organization: args.organization.trim(),
      name: args.name.trim(),
      slug,
      summary: args.summary?.trim() || undefined,
      description: args.description?.trim() || undefined,
      venue: args.venue?.trim() || undefined,
      startDate: args.startDate,
      endDate: args.endDate,
      status: args.status ?? "published",
      ownerId: userId,
      createdAt: Date.now(),
    });
    return { id, slug };
  },
});

export const update = mutation({
  args: {
    id: v.id("fests"),
    name: v.optional(v.string()),
    organization: v.optional(v.string()),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUserId(ctx);
    const fest = await ctx.db.get(id);
    if (fest === null) throw new Error("That programme no longer exists.");
    if (fest.ownerId !== userId) {
      throw new Error("Only the owning account can edit this programme.");
    }
    await ctx.db.patch(id, {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.organization !== undefined
        ? { organization: patch.organization.trim() }
        : {}),
      ...(patch.summary !== undefined
        ? { summary: patch.summary.trim() || undefined }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description.trim() || undefined }
        : {}),
      ...(patch.venue !== undefined
        ? { venue: patch.venue.trim() || undefined }
        : {}),
      ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
      ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    });
    return { slug: fest.slug };
  },
});

/** Delete a programme together with its events, bookings and discussion. */
export const remove = mutation({
  args: { id: v.id("fests") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const fest = await ctx.db.get(id);
    if (fest === null) return { removed: false };
    if (fest.ownerId !== userId) {
      throw new Error("Only the owning account can delete this programme.");
    }
    const events = await ctx.db
      .query("events")
      .withIndex("by_fest", (q) => q.eq("festId", id))
      .collect();
    for (const event of events) {
      const bookings = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      for (const booking of bookings) {
        await ctx.db.delete(booking._id);
      }
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(event._id);
    }
    await ctx.db.delete(id);
    return { removed: true };
  },
});
