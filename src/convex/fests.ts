import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  programmeAccess,
  publicEvent,
  publicFest,
  requireUserId,
  uniqueSlug,
} from "./model";

/** Long enough for a real sentence, short enough to stay one. */
const TEMPLATE_LIMITS = {
  subject: 160,
  heading: 120,
  intro: 900,
  closing: 300,
} as const;

/**
 * The organizer's own wording, tidied. An empty template is no template: the
 * product's sentence is used instead of a blank line in someone's inbox.
 */
function cleanTemplate(template: {
  subject?: string;
  heading?: string;
  intro?: string;
  closing?: string;
}) {
  const clean = {
    subject: template.subject?.trim().slice(0, TEMPLATE_LIMITS.subject),
    heading: template.heading?.trim().slice(0, TEMPLATE_LIMITS.heading),
    intro: template.intro?.trim().slice(0, TEMPLATE_LIMITS.intro),
    closing: template.closing?.trim().slice(0, TEMPLATE_LIMITS.closing),
  };
  const written = Object.values(clean).filter(
    (value) => value !== undefined && value !== "",
  );
  if (written.length === 0) return undefined;
  return {
    subject: clean.subject || undefined,
    heading: clean.heading || undefined,
    intro: clean.intro || undefined,
    closing: clean.closing || undefined,
  };
}

const emailTemplateArg = v.object({
  subject: v.optional(v.string()),
  heading: v.optional(v.string()),
  intro: v.optional(v.string()),
  closing: v.optional(v.string()),
});

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
      .map((event) => publicEvent(event, now, fest));

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

/**
 * Programme details, cancellation policy and the wording of its emails.
 *
 * A manager may edit them — that is what a manager is for — but the settings
 * themselves are visible to every reader of the catalogue, so a change here
 * changes what a customer is told before they book.
 */
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
    /** Minor units charged when a place is released after the free window. */
    cancellationFee: v.optional(v.number()),
    cancellationWindowHours: v.optional(v.number()),
    emailTemplate: v.optional(emailTemplateArg),
  },
  handler: async (ctx, { id, ...patch }) => {
    const access = await programmeAccess(ctx, id, "manager");
    const fest = access.fest;
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
      ...(patch.cancellationFee !== undefined
        ? { cancellationFee: Math.max(0, Math.round(patch.cancellationFee)) }
        : {}),
      ...(patch.cancellationWindowHours !== undefined
        ? {
            cancellationWindowHours: Math.min(
              720,
              Math.max(0, Math.round(patch.cancellationWindowHours)),
            ),
          }
        : {}),
      ...(patch.emailTemplate !== undefined
        ? { emailTemplate: cleanTemplate(patch.emailTemplate) }
        : {}),
    });
    return { slug: fest.slug };
  },
});

/**
 * The programmes this account runs or helps run, with each one's own settings.
 *
 * The console reads this rather than `mine`, because a collaborator has to see
 * the programme they were invited to — and because the cancellation policy and
 * the email wording belong to the programme, not to whoever opened the page.
 */
export const console = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];
    const now = Date.now();

    const owned = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const links = await ctx.db
      .query("collaborators")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = links.filter((link) => link.status === "active");
    const shared = (
      await Promise.all(active.map((link) => ctx.db.get(link.festId)))
    ).filter((fest) => fest !== null);

    const seen = new Set<string>();
    const all = [...owned, ...shared].filter((fest) => {
      if (seen.has(fest._id)) return false;
      seen.add(fest._id);
      return true;
    });

    const rows = await Promise.all(
      all.map(async (fest) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_fest", (q) => q.eq("festId", fest._id))
          .collect();
        const team = await ctx.db
          .query("collaborators")
          .withIndex("by_fest", (q) => q.eq("festId", fest._id))
          .collect();
        const link = active.find((row) => row.festId === fest._id);
        const isOwner = fest.ownerId === userId;
        return {
          ...publicFest(fest, now),
          eventCount: events.length,
          seatsTaken: events.reduce((sum, event) => sum + event.seatsTaken, 0),
          capacity: events.reduce((sum, event) => sum + event.capacity, 0),
          role: isOwner ? ("owner" as const) : (link?.role ?? "viewer"),
          isOwner,
          canEdit: isOwner || link?.role === "manager" || link?.role === "editor",
          cancellationFee: fest.cancellationFee ?? 0,
          cancellationWindowHours: fest.cancellationWindowHours ?? 48,
          emailTemplate: fest.emailTemplate ?? null,
          teamSize: team.filter((row) => row.status === "active").length,
          pendingInvites: team.filter((row) => row.status === "invited").length,
        };
      }),
    );

    return rows.sort((a, b) => a.startDate - b.startDate);
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
