import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mayModerate } from "./access";
import { requireUserId } from "./model";

const MIN_BODY = 10;
const MAX_BODY = 900;

/** Everything said about one event, with the average the card shows. */
export const forEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    const total = rows.reduce((sum, row) => sum + row.rating, 0);
    const mine = rows.find((row) => row.userId === userId) ?? null;

    return {
      count: rows.length,
      average: rows.length === 0 ? null : total / rows.length,
      mineId: mine?._id ?? null,
      mineRating: mine?.rating ?? null,
      mineBody: mine?.body ?? null,
      items: rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((row) => ({
          _id: row._id,
          authorName: row.authorName,
          authorCompany: row.authorCompany ?? null,
          rating: row.rating,
          body: row.body,
          createdAt: row.createdAt,
          // A review left by a signed-in customer, not part of the demo data.
          fromAttendee: row.userId !== undefined,
        })),
    };
  },
});

/** Leave a review, or replace the one you already left for this event. */
export const add = mutation({
  args: { eventId: v.id("events"), rating: v.number(), body: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event === null) throw new Error("That event no longer exists.");

    const rating = Math.round(args.rating);
    if (rating < 1 || rating > 5) {
      throw new Error("Choose a rating between one and five.");
    }
    const body = args.body.trim().slice(0, MAX_BODY);
    if (body.length < MIN_BODY) {
      throw new Error("Tell us a little more — ten characters or so.");
    }

    const user = await ctx.db.get(userId);
    const authorName = user?.name ?? user?.email?.split("@")[0] ?? "Attendee";
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", userId),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        rating,
        body,
        authorName,
        createdAt: Date.now(),
      });
      return { updated: true as const };
    }

    await ctx.db.insert("reviews", {
      eventId: args.eventId,
      festId: event.festId,
      userId,
      authorName,
      authorCompany: user?.company,
      rating,
      body,
      createdAt: Date.now(),
    });

    return { updated: false as const };
  },
});

/** Withdraw a review — its author, or the business running the event. */
export const remove = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    const userId = await requireUserId(ctx);
    const review = await ctx.db.get(reviewId);
    if (review === null) return { removed: false as const };

    const fest = await ctx.db.get(review.festId);
    const isAuthor = review.userId === userId;
    const isOrganizer = fest !== null && fest.ownerId === userId;
    // A site moderator outranks both: it exists precisely for the review whose
    // author and organizer both refuse to take it down.
    if (!isAuthor && !isOrganizer && !(await mayModerate(ctx))) {
      throw new Error("That review belongs to someone else.");
    }

    await ctx.db.delete(reviewId);
    return { removed: true as const };
  },
});

/** What attendees said across the programmes this business runs. */
export const forOrganizer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { count: 0, average: null, items: [] };

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const rows = (
      await Promise.all(
        fests.map(async (fest) => {
          const events = await ctx.db
            .query("events")
            .withIndex("by_fest", (q) => q.eq("festId", fest._id))
            .collect();
          return (
            await Promise.all(
              events.map(async (event) => {
                const reviews = await ctx.db
                  .query("reviews")
                  .withIndex("by_event", (q) => q.eq("eventId", event._id))
                  .collect();
                return reviews.map((row) => ({
                  _id: row._id,
                  rating: row.rating,
                  body: row.body,
                  authorName: row.authorName,
                  authorCompany: row.authorCompany ?? null,
                  createdAt: row.createdAt,
                  eventTitle: event.title,
                  programmeName: fest.name,
                }));
              }),
            )
          ).flat();
        }),
      )
    ).flat();

    const total = rows.reduce((sum, row) => sum + row.rating, 0);
    return {
      count: rows.length,
      average: rows.length === 0 ? null : total / rows.length,
      items: rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40),
    };
  },
});
