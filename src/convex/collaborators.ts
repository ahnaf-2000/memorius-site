import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { programmeAccess, requireUserId } from "./model";

/**
 * Collaboration.
 *
 * An organizer should not have to hand over their password to get help running
 * a season, and should not have to keep helping forever once they have. An
 * invitation is therefore a row between an address and a programme: it is made
 * by the owner, it waits for the person to accept it, and revoking it ends that
 * one relationship without touching any other.
 *
 * Roles decide what the relationship may do, and the check is always made on
 * the server — the console only reflects what the table already says.
 */

const roleValidator = v.union(
  v.literal("manager"),
  v.literal("editor"),
  v.literal("viewer"),
);

function fold(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Ask someone to help run a programme. Owner only. */
export const invite = mutation({
  args: {
    festId: v.id("fests"),
    email: v.string(),
    name: v.optional(v.string()),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const fest = await ctx.db.get(args.festId);
    if (fest === null) throw new Error("That programme no longer exists.");
    if (fest.ownerId !== userId) {
      throw new Error("Only the owner can invite collaborators.");
    }

    const email = fold(args.email);
    if (!EMAIL_SHAPE.test(email)) {
      throw new Error("Please check the email address.");
    }

    const owner = await ctx.db.get(userId);
    if (owner !== null && fold(owner.email ?? "") === email) {
      throw new Error("You already run this programme.");
    }

    const rows = await ctx.db
      .query("collaborators")
      .withIndex("by_fest", (q) => q.eq("festId", args.festId))
      .collect();
    if (rows.some((row) => row.email === email && row.status !== "revoked")) {
      throw new Error("They are already on this programme's team.");
    }

    // A revoked invitation is a dead row: the same person can be invited again
    // and gets a fresh one, which keeps the history readable.
    const id = await ctx.db.insert("collaborators", {
      festId: args.festId,
      email,
      name: args.name?.trim() || undefined,
      role: args.role,
      status: "invited",
      invitedBy: userId,
      invitedAt: Date.now(),
    });

    return { id, email, role: args.role, status: "invited" as const };
  },
});

/** End someone's access, or cancel an invitation they never answered. */
export const revoke = mutation({
  args: { id: v.id("collaborators") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (row === null) return { revoked: false };
    const fest = await ctx.db.get(row.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("Only the owner can change who collaborates.");
    }
    await ctx.db.patch(id, { status: "revoked", respondedAt: Date.now() });
    return { revoked: true };
  },
});

/** Who is on this programme's team, as anyone on it may see. */
export const team = query({
  args: { festId: v.id("fests") },
  handler: async (ctx, { festId }) => {
    const access = await programmeAccess(ctx, festId, "viewer").catch(
      () => null,
    );
    if (access === null) return null;

    const rows = await ctx.db
      .query("collaborators")
      .withIndex("by_fest", (q) => q.eq("festId", festId))
      .collect();

    return {
      viewerRole: access.role,
      isOwner: access.isOwner,
      rows: rows
        .sort((a, b) => a.invitedAt - b.invitedAt)
        .map((row) => ({
          _id: row._id,
          email: row.email,
          name: row.name ?? null,
          role: row.role,
          status: row.status,
          invitedAt: row.invitedAt,
          respondedAt: row.respondedAt ?? null,
        })),
    };
  },
});

/**
 * The invitations waiting for the signed-in account.
 *
 * Matched on the address, because that is what the owner typed and what the
 * person can verify: an invitation is for whoever can read that mailbox.
 */
export const invites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];
    const user = await ctx.db.get(userId);
    if (user === null || user.email === undefined) return [];
    const email = fold(user.email);

    const rows = await ctx.db
      .query("collaborators")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const pending = rows.filter((row) => row.status === "invited");
    return Promise.all(
      pending.map(async (row) => {
        const fest = await ctx.db.get(row.festId);
        const inviter = await ctx.db.get(row.invitedBy);
        return {
          _id: row._id,
          festId: row.festId,
          role: row.role,
          invitedAt: row.invitedAt,
          programmeName: fest?.name ?? "Removed programme",
          programmeSlug: fest?.slug ?? "",
          organization: fest?.organization ?? "",
          invitedByName: inviter?.name ?? inviter?.email ?? "the organizer",
        };
      }),
    );
  },
});

/** Take it up, or turn it down. Either way the owner is told the answer. */
export const respond = mutation({
  args: { id: v.id("collaborators"), accept: v.boolean() },
  handler: async (ctx, { id, accept }) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (user === null) throw new Error("Please sign in to continue.");
    const row = await ctx.db.get(id);
    if (row === null) throw new Error("That invitation no longer exists.");
    if (row.email !== fold(user.email ?? "")) {
      throw new Error("That invitation is for another address.");
    }
    if (row.status !== "invited") {
      throw new Error("That invitation has already been answered.");
    }

    await ctx.db.patch(id, {
      status: accept ? "active" : "revoked",
      userId: accept ? userId : undefined,
      respondedAt: Date.now(),
    });

    return { accepted: accept };
  },
});
