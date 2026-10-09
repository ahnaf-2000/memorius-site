import { mutation, query } from "./_generated/server";
import { programmeAccess, requireUserId } from "./model";

/**
 * The demo programme, for people who arrive to look rather than to run.
 *
 * The showcase catalogue is seeded on every deployment so the directory has
 * something in it. The console is a different question: an account that has
 * never created a programme sees empty screens, which is a poor way to judge an
 * organizer tool. Pressing once here gives that account the showcase programme
 * as a collaborator at manager level, so the participants, the analytics, the
 * decisions and the roster all appear — without handing over ownership of the
 * seeded data, and without pretending the visitor created any of it.
 *
 * It is idempotent: pressing twice changes nothing and reports so.
 */

/** A readable address for an account with no email, so the row is never blank. */
function addressOf(email: string | undefined, userId: string): string {
  return (email ?? `${userId}@demo.memorius.events`).trim().toLowerCase();
}

export const claim = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    const email = addressOf(user?.email, userId);

    const fests = await ctx.db.query("fests").collect();
    const showcase = fests.filter((fest) => fest.showcase === true);
    if (showcase.length === 0) {
      return { claimed: 0, note: "No showcase programme on this deployment." };
    }

    let claimed = 0;
    let already = 0;

    for (const fest of showcase) {
      if (fest.ownerId === userId) {
        already += 1;
        continue;
      }

      const rows = await ctx.db
        .query("collaborators")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();

      const active = rows.find(
        (row) => row.userId === userId && row.status === "active",
      );
      if (active !== undefined) {
        already += 1;
        continue;
      }

      // Someone may already have been invited to this address: claiming takes
      // that invitation up rather than leaving a second row beside it.
      const invited = rows.find(
        (row) => row.email === email && row.status === "invited",
      );
      if (invited !== undefined) {
        await ctx.db.patch(invited._id, {
          status: "active",
          userId,
          respondedAt: Date.now(),
        });
        claimed += 1;
        continue;
      }

      await ctx.db.insert("collaborators", {
        festId: fest._id,
        email,
        name: user?.name ?? "Demo visitor",
        role: "manager",
        status: "active",
        invitedBy: userId,
        userId,
        invitedAt: Date.now(),
        respondedAt: Date.now(),
      });
      claimed += 1;
    }

    return { claimed, already };
  },
});

/**
 * Whether this account is already on the showcase team, and what it can see.
 * The console reads this to decide whether to offer the button at all.
 */
export const state = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) {
      return { showcase: 0, joined: 0, ready: false };
    }

    const fests = await ctx.db.query("fests").collect();
    const showcase = fests.filter((fest) => fest.showcase === true);

    let joined = 0;
    for (const fest of showcase) {
      const access = await programmeAccess(ctx, fest._id, "viewer").catch(
        () => null,
      );
      if (access !== null) joined += 1;
    }

    return {
      showcase: showcase.length,
      joined,
      ready: showcase.length > 0 && joined === 0,
    };
  },
});
