import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { publicComment, requireUserId } from "./model";

const MAX_LENGTH = 1200;

/** The discussion on an event. Public to read, signed-in to join. */
export const list = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    const ordered = rows.sort((a, b) => a.createdAt - b.createdAt);

    return await Promise.all(
      ordered.map(async (row) => ({
        ...publicComment(row),
        attachmentUrl:
          row.attachmentId === undefined
            ? null
            : await ctx.storage.getUrl(row.attachmentId),
      })),
    );
  },
});

/**
 * A short-lived URL the browser can upload a file to. Signed-in only, so an
 * anonymous visitor cannot fill the deployment's storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    eventId: v.id("events"),
    body: v.string(),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, body, attachmentId, attachmentName }) => {
    const userId = await requireUserId(ctx);
    const text = body.trim();
    if (text.length < 3) {
      throw new Error("Write a little more before posting.");
    }
    if (text.length > MAX_LENGTH) {
      throw new Error(`Keep it under ${MAX_LENGTH.toLocaleString()} characters.`);
    }

    const event = await ctx.db.get(eventId);
    if (event === null) throw new Error("That event no longer exists.");

    // A storage id that resolves to nothing would leave a broken link behind.
    if (attachmentId !== undefined) {
      const url = await ctx.storage.getUrl(attachmentId);
      if (url === null) throw new Error("That upload did not finish. Try again.");
    }

    const user = await ctx.db.get(userId);
    const authorName =
      user?.name?.trim() || user?.email?.split("@")[0] || "Attendee";

    const id = await ctx.db.insert("comments", {
      eventId,
      userId,
      authorName,
      authorCompany: user?.company?.trim() || undefined,
      body: text,
      attachmentId,
      attachmentName: attachmentName?.trim().slice(0, 120) || undefined,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/** Authors can remove their own posts; the owning business can moderate any. */
export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const userId = await requireUserId(ctx);
    const comment = await ctx.db.get(commentId);
    if (comment === null) return { removed: false };

    if (comment.userId !== userId) {
      const event = await ctx.db.get(comment.eventId);
      const fest = event === null ? null : await ctx.db.get(event.festId);
      if (fest === null || fest.ownerId !== userId) {
        throw new Error("You can only remove your own posts.");
      }
    }

    if (comment.attachmentId !== undefined) {
      await ctx.storage.delete(comment.attachmentId);
    }
    await ctx.db.delete(commentId);
    return { removed: true };
  },
});
