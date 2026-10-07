import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./model";
import { paymentMethodValidator, personaValidator } from "./schema";

/**
 * One row per account: which side of the product it is here for, and which
 * market it trades from. Created lazily the first time someone signs in, so an
 * account is never blocked waiting for onboarding to finish.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile === null) return null;

    return {
      persona: profile.persona,
      country: profile.country,
      currency: profile.currency,
      payoutMethod: profile.payoutMethod ?? null,
      payoutDetails: profile.payoutDetails ?? null,
    };
  },
});

/** Write the pieces of the profile the interface owns. Anything omitted is left alone. */
export const save = mutation({
  args: {
    persona: v.optional(personaValidator),
    country: v.optional(v.string()),
    currency: v.optional(v.string()),
    payoutMethod: v.optional(paymentMethodValidator),
    payoutDetails: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const changes = {
      ...(args.persona !== undefined ? { persona: args.persona } : {}),
      ...(args.country !== undefined ? { country: args.country } : {}),
      ...(args.currency !== undefined ? { currency: args.currency } : {}),
      ...(args.payoutMethod !== undefined
        ? { payoutMethod: args.payoutMethod }
        : {}),
      ...(args.payoutDetails !== undefined
        ? { payoutDetails: args.payoutDetails.trim() || undefined }
        : {}),
      updatedAt: Date.now(),
    };

    if (existing === null) {
      await ctx.db.insert("profiles", {
        userId,
        persona: args.persona ?? "participant",
        country: args.country ?? "US",
        currency: args.currency ?? "USD",
        ...changes,
      });
    } else {
      await ctx.db.patch(existing._id, changes);
    }

    return { saved: true as const };
  },
});
