import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { publicEvent, requireUserId, uniqueSlug } from "./model";

const formatValidator = v.union(
  v.literal("in-person"),
  v.literal("online"),
  v.literal("hybrid"),
);

/**
 * The whole event catalogue in one reactive read, each row carrying its
 * festival. The dataset for version 1 is small, so the directory filters
 * client-side for instant keystroke feedback instead of round-tripping.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db.query("events").collect();
    const fests = await ctx.db.query("fests").collect();
    const festById = new Map(fests.map((fest) => [fest._id, fest]));

    return events
      .map((event) => {
        const fest = festById.get(event.festId);
        return {
          ...publicEvent(event, now),
          festName: fest?.name ?? "Unassigned",
          festSlug: fest?.slug ?? "",
          organization: fest?.organization ?? "",
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
  },
});

/** A single event, its festival, and the viewer's own registration if any. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (event === null) return null;

    const now = Date.now();
    const fest = await ctx.db.get(event.festId);
    const userId = await requireUserId(ctx).catch(() => null);

    const registration =
      userId === null
        ? null
        : ((await ctx.db
            .query("registrations")
            .withIndex("by_event_user", (q) =>
              q.eq("eventId", event._id).eq("userId", userId),
            )
            .unique()) ?? null);

    const siblings = await ctx.db
      .query("events")
      .withIndex("by_fest", (q) => q.eq("festId", event.festId))
      .collect();

    return {
      event: publicEvent(event, now),
      fest: fest === null ? null : { name: fest.name, slug: fest.slug, organization: fest.organization },
      viewer: {
        signedIn: userId !== null,
        registration:
          registration === null
            ? null
            : {
                _id: registration._id,
                status: registration.status,
                reference: registration.reference,
                fullName: registration.fullName,
                email: registration.email,
                createdAt: registration.createdAt,
              },
      },
      alsoInFest: siblings
        .filter((sibling) => sibling._id !== event._id)
        .sort((a, b) => a.startTime - b.startTime)
        .map((sibling) => publicEvent(sibling, now))
        .slice(0, 4),
    };
  },
});

/** Events across every festival this account owns, with attendance counts. */
export const organized = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];
    const now = Date.now();

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const rows = await Promise.all(
      fests.map(async (fest) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_fest", (q) => q.eq("festId", fest._id))
          .collect();
        return Promise.all(
          events.map(async (event) => {
            const registrations = await ctx.db
              .query("registrations")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect();
            const confirmed = registrations.filter(
              (r) => r.status === "confirmed",
            ).length;
            const waitlisted = registrations.filter(
              (r) => r.status === "waitlisted",
            ).length;
            return {
              ...publicEvent(event, now),
              festName: fest.name,
              festSlug: fest.slug,
              confirmed,
              waitlisted,
              cancelled: registrations.length - confirmed - waitlisted,
            };
          }),
        );
      }),
    );

    return rows.flat().sort((a, b) => a.startTime - b.startTime);
  },
});

export const create = mutation({
  args: {
    festId: v.id("fests"),
    title: v.string(),
    category: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    format: v.optional(formatValidator),
    startTime: v.number(),
    endTime: v.number(),
    venue: v.string(),
    host: v.optional(v.string()),
    capacity: v.number(),
    fee: v.optional(v.string()),
    registrationClosesAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const fest = await ctx.db.get(args.festId);
    if (fest === null) throw new Error("That festival no longer exists.");
    if (fest.ownerId !== userId) {
      throw new Error("Only the organizing account can add events here.");
    }
    if (args.endTime < args.startTime) {
      throw new Error("The end time has to come after the start time.");
    }
    const slug = await uniqueSlug(ctx, "events", args.title);
    const id = await ctx.db.insert("events", {
      festId: args.festId,
      title: args.title.trim(),
      slug,
      category: args.category.trim() || "Session",
      summary: args.summary?.trim() || undefined,
      description: args.description?.trim() || undefined,
      format: args.format ?? "in-person",
      startTime: args.startTime,
      endTime: args.endTime,
      venue: args.venue.trim(),
      host: args.host?.trim() || undefined,
      capacity: Math.max(1, Math.round(args.capacity)),
      seatsTaken: 0,
      fee: args.fee?.trim() || undefined,
      registrationClosesAt: args.registrationClosesAt,
      createdAt: Date.now(),
    });
    return { id, slug };
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    format: v.optional(formatValidator),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    venue: v.optional(v.string()),
    host: v.optional(v.string()),
    capacity: v.optional(v.number()),
    fee: v.optional(v.string()),
    registrationClosesAt: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(id);
    if (event === null) throw new Error("That event no longer exists.");
    const fest = await ctx.db.get(event.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("Only the organizing account can edit this event.");
    }
    await ctx.db.patch(id, {
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.category !== undefined
        ? { category: patch.category.trim() || "Session" }
        : {}),
      ...(patch.summary !== undefined
        ? { summary: patch.summary.trim() || undefined }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description.trim() || undefined }
        : {}),
      ...(patch.format !== undefined ? { format: patch.format } : {}),
      ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
      ...(patch.endTime !== undefined ? { endTime: patch.endTime } : {}),
      ...(patch.venue !== undefined ? { venue: patch.venue.trim() } : {}),
      ...(patch.host !== undefined ? { host: patch.host.trim() || undefined } : {}),
      ...(patch.capacity !== undefined
        ? { capacity: Math.max(1, Math.round(patch.capacity)) }
        : {}),
      ...(patch.fee !== undefined ? { fee: patch.fee.trim() || undefined } : {}),
      ...(patch.registrationClosesAt !== undefined
        ? { registrationClosesAt: patch.registrationClosesAt }
        : {}),
    });
    return { slug: event.slug };
  },
});

/** Remove an event and every registration attached to it. */
export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(id);
    if (event === null) return { removed: false };
    const fest = await ctx.db.get(event.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("Only the organizing account can delete this event.");
    }
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", id))
      .collect();
    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }
    await ctx.db.delete(id);
    return { removed: true };
  },
});
