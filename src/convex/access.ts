import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ROLES } from "./schema";

/**
 * Who owns and who polices the platform.
 *
 * Everything else in this product is scoped to one account: a business sees its
 * own programmes, an attendee sees their own bookings, and nobody can reach
 * across. That is the right default, and it is also why there has to be exactly
 * one deliberate exception — somebody has to answer for the whole site.
 *
 * Two levels, and only two:
 *
 *   owner      One account, named here. Full control: it can appoint and
 *              remove moderators, read the account directory and remove
 *              anything published on the platform.
 *   moderator  Appointed by the owner from the directory. Can moderate —
 *              remove a comment or a review anywhere — and nothing else.
 *
 * The allowlist is a constant rather than a row so that ownership cannot be
 * granted by anyone who gets a write into the database, and cannot be lost by
 * an errant update. To hand the site to someone else, edit this list.
 */
export const OWNER_EMAILS: readonly string[] = ["ahnaf2010muhtasim@gmail.com"];

export type StaffLevel = "owner" | "moderator" | "none";

export interface Viewer {
  signedIn: boolean;
  userId: Doc<"users">["_id"] | null;
  email: string | null;
  name: string | null;
  level: StaffLevel;
  isOwner: boolean;
  isModerator: boolean;
  /** Owner or moderator: may moderate anything, anywhere. */
  isStaff: boolean;
}

const NOBODY: Viewer = {
  signedIn: false,
  userId: null,
  email: null,
  name: null,
  level: "none",
  isOwner: false,
  isModerator: false,
  isStaff: false,
};

/** Addresses are compared folded: nobody should be locked out by capitals. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (email === null || email === undefined) return false;
  const needle = email.trim().toLowerCase();
  return OWNER_EMAILS.some((owner) => owner.toLowerCase() === needle);
}

/**
 * Resolve what the caller is allowed to do. The owner is decided by email, the
 * moderator by the role written on the account, so a moderator can be removed
 * without touching this file and the owner cannot be removed at all.
 */
export async function resolveViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return NOBODY;

  const user = await ctx.db.get(userId);
  if (user === null) return NOBODY;

  const email = user.email ?? null;
  if (isOwnerEmail(email)) {
    return {
      signedIn: true,
      userId,
      email,
      name: user.name ?? null,
      level: "owner",
      isOwner: true,
      isModerator: false,
      isStaff: true,
    };
  }

  const isModerator = user.role === ROLES.MEMBER;
  return {
    signedIn: true,
    userId,
    email,
    name: user.name ?? null,
    level: isModerator ? "moderator" : "none",
    isOwner: false,
    isModerator,
    isStaff: isModerator,
  };
}

/** Owner only. Throws a message the interface can show as-is. */
export async function requireOwner(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer> {
  const viewer = await resolveViewer(ctx);
  if (!viewer.signedIn) throw new Error("Please sign in to continue.");
  if (!viewer.isOwner) {
    throw new Error("Only the site owner can do that.");
  }
  return viewer;
}

/** Owner or moderator. */
export async function requireStaff(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer> {
  const viewer = await resolveViewer(ctx);
  if (!viewer.signedIn) throw new Error("Please sign in to continue.");
  if (!viewer.isStaff) {
    throw new Error("That is a moderator-only action.");
  }
  return viewer;
}

/** True when the caller may moderate anything — used to widen the remove paths. */
export async function mayModerate(
  ctx: QueryCtx | MutationCtx,
): Promise<boolean> {
  const viewer = await resolveViewer(ctx);
  return viewer.isStaff;
}

/** What the signed-in visitor is, for the interface to read. Never throws. */
export const viewer = query({
  args: {},
  handler: async (ctx): Promise<Viewer> => await resolveViewer(ctx),
});

/**
 * Record the owner on their own account. Signing in is the only event that can
 * reach this, and the email check happens here on the server — the client can
 * call it all it likes and still be refused.
 *
 * Returns whether anything changed, so the caller can stay silent otherwise.
 */
export const claim = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { claimed: false };

    const user = await ctx.db.get(userId);
    if (user === null || !isOwnerEmail(user.email)) {
      return { claimed: false };
    }
    if (user.role === ROLES.ADMIN) return { claimed: false };

    await ctx.db.patch(userId, { role: ROLES.ADMIN });
    return { claimed: true };
  },
});

/**
 * The account directory: who is here, and who is trusted with moderation.
 * Owner only — an ordinary account has no business reading the customer list.
 */
export const directory = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    await requireOwner(ctx);

    const rows = await ctx.db.query("users").collect();
    const needle = search?.trim().toLowerCase() ?? "";

    return rows
      .filter((user) => {
        if (needle === "") return true;
        return (
          (user.email ?? "").toLowerCase().includes(needle) ||
          (user.name ?? "").toLowerCase().includes(needle)
        );
      })
      .map((user) => ({
        _id: user._id,
        name: user.name ?? null,
        email: user.email ?? null,
        isAnonymous: user.isAnonymous === true,
        role: user.role ?? null,
        isOwner: isOwnerEmail(user.email),
        isModerator: user.role === ROLES.MEMBER,
      }))
      .sort((a, b) => {
        // The owner first, then moderators, then everyone else by address.
        const rank = (row: { isOwner: boolean; isModerator: boolean }) =>
          row.isOwner ? 0 : row.isModerator ? 1 : 2;
        const byRank = rank(a) - rank(b);
        if (byRank !== 0) return byRank;
        return (a.email ?? "").localeCompare(b.email ?? "");
      })
      .slice(0, 200);
  },
});

/**
 * Appoint or remove a moderator.
 *
 * The owner's own row is untouchable: ownership is not a role stored in the
 * database, so demoting it can only ever be a lie, and a site with no owner is
 * a site nobody can fix. Everyone else can be promoted, demoted, and promoted
 * again.
 */
export const setModerator = mutation({
  args: {
    userId: v.id("users"),
    moderator: v.boolean(),
  },
  handler: async (ctx, { userId, moderator }) => {
    const owner = await requireOwner(ctx);

    const user = await ctx.db.get(userId);
    if (user === null) throw new Error("That account no longer exists.");
    if (isOwnerEmail(user.email)) {
      throw new Error("The owner's own access cannot be changed.");
    }
    if (userId === owner.userId) {
      throw new Error("You already have full access.");
    }

    await ctx.db.patch(userId, {
      role: moderator ? ROLES.MEMBER : ROLES.USER,
    });
    return { moderator };
  },
});

/**
 * The moderation queue: everything published across the whole platform, newest
 * first, with enough context to judge it. Staff only.
 */
export const moderationQueue = query({
  args: {},
  handler: async (ctx) => {
    const viewerNow = await resolveViewer(ctx);
    if (!viewerNow.isStaff) return { comments: [], reviews: [] };

    const [comments, reviews] = await Promise.all([
      ctx.db.query("comments").collect(),
      ctx.db.query("reviews").collect(),
    ]);

    /** Resolve an event to its programme so a post can be judged in context. */
    async function contextFor(eventId: Doc<"comments">["eventId"]) {
      const event = await ctx.db.get(eventId);
      if (event === null) return { eventTitle: null, programmeName: null };
      const fest = await ctx.db.get(event.festId);
      return {
        eventTitle: event.title,
        programmeName: fest?.name ?? null,
      };
    }

    const recentComments = await Promise.all(
      comments
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30)
        .map(async (row) => ({
          _id: row._id,
          body: row.body,
          authorName: row.authorName,
          attachmentName: row.attachmentName ?? null,
          createdAt: row.createdAt,
          ...(await contextFor(row.eventId)),
        })),
    );

    const recentReviews = await Promise.all(
      reviews
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30)
        .map(async (row) => ({
          _id: row._id,
          body: row.body,
          rating: row.rating,
          authorName: row.authorName,
          createdAt: row.createdAt,
          ...(await contextFor(row.eventId)),
        })),
    );

    return { comments: recentComments, reviews: recentReviews };
  },
});

/** How much is out there, for the control panel header. Never for the public. */
export const platformCounts = query({
  args: {},
  handler: async (ctx) => {
    const viewerNow = await resolveViewer(ctx);
    if (!viewerNow.isStaff) return null;

    const [users, fests, events, bookings, comments, reviews] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("fests").collect(),
        ctx.db.query("events").collect(),
        ctx.db.query("registrations").collect(),
        ctx.db.query("comments").collect(),
        ctx.db.query("reviews").collect(),
      ]);

    return {
      accounts: users.length,
      programmes: fests.length,
      events: events.length,
      bookings: bookings.length,
      comments: comments.length,
      reviews: reviews.length,
      moderators: users.filter((user) => user.role === ROLES.MEMBER).length,
    };
  },
});
