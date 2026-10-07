import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./model";
import { campaignKindValidator } from "./schema";

const CODE_PATTERN = /^[A-Z0-9-]{3,16}$/;

/** A short, human label for what a campaign takes off. */
export function campaignLabel(campaign: {
  kind: "percent" | "amount";
  value: number;
}) {
  return campaign.kind === "percent"
    ? `${campaign.value}% off`
    : `${(campaign.value / 100).toFixed(campaign.value % 100 === 0 ? 0 : 2)} off`;
}

export function isLive(
  campaign: { active: boolean; startsAt: number; endsAt: number; maxUses?: number; uses: number },
  now = Date.now(),
) {
  if (!campaign.active) return false;
  if (now < campaign.startsAt || now > campaign.endsAt) return false;
  if (campaign.maxUses !== undefined && campaign.uses >= campaign.maxUses) {
    return false;
  }
  return true;
}

/**
 * The one place a promotion is turned into money. Bookings and shop orders both
 * come through here, so a discount can never be calculated two different ways.
 */
export async function resolveDiscount(
  ctx: QueryCtx | MutationCtx,
  { code, subtotal }: { code: string; subtotal: number },
) {
  const normalized = code.trim().toUpperCase();
  if (normalized.length === 0 || subtotal <= 0) return null;

  const campaign = await ctx.db
    .query("campaigns")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .unique();
  if (campaign === null || !isLive(campaign)) return null;

  const discount =
    campaign.kind === "percent"
      ? Math.round((subtotal * campaign.value) / 100)
      : Math.min(subtotal, campaign.value);
  if (discount <= 0) return null;

  return { campaign, code: normalized, discount };
}

/**
 * Where a campaign is in its life. Decided here so the console never has to
 * read the clock while rendering — the server owns the clock.
 */
export type CampaignState =
  | "running"
  | "paused"
  | "scheduled"
  | "claimed"
  | "finished";

export function campaignState(
  campaign: {
    active: boolean;
    startsAt: number;
    endsAt: number;
    maxUses?: number;
    uses: number;
  },
  now = Date.now(),
): CampaignState {
  if (isLive(campaign, now)) return "running";
  if (!campaign.active) return "paused";
  if (now < campaign.startsAt) return "scheduled";
  if (campaign.maxUses !== undefined && campaign.uses >= campaign.maxUses) {
    return "claimed";
  }
  return "finished";
}

/** Promotions that are running right now, soonest to end first. */
export const live = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("campaigns").collect();
    const now = Date.now();
    const running = rows.filter((row) => isLive(row, now)).sort((a, b) => a.endsAt - b.endsAt);

    return Promise.all(
      running.slice(0, 6).map(async (row) => {
        const fest = await ctx.db.get(row.festId);
        const event = row.eventId === undefined ? null : await ctx.db.get(row.eventId);
        return {
          _id: row._id,
          code: row.code,
          title: row.title,
          blurb: row.blurb ?? null,
          label: campaignLabel(row),
          endsAt: row.endsAt,
          remaining:
            row.maxUses === undefined ? null : Math.max(0, row.maxUses - row.uses),
          scope: event === null ? "programme" : "event",
          scopeName: event?.title ?? fest?.name ?? "a programme",
          programmeName: fest?.name ?? "",
          programmeSlug: fest?.slug ?? "",
          eventSlug: event?.slug ?? null,
        };
      }),
    );
  },
});

/**
 * Check a code before anyone commits to it, so the discount is visible while
 * the form is still being filled in.
 */
export const lookup = query({
  args: { code: v.string(), subtotal: v.number() },
  handler: async (ctx, { code, subtotal }) => {
    const resolved = await resolveDiscount(ctx, { code, subtotal });
    if (resolved === null) {
      return { valid: false as const, reason: "That code is not running right now." };
    }
    return {
      valid: true as const,
      code: resolved.code,
      title: resolved.campaign.title,
      label: campaignLabel(resolved.campaign),
      discount: resolved.discount,
      total: subtotal - resolved.discount,
    };
  },
});

/** Campaigns the business can run, with their usage. */
export const forOrganizer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const now = Date.now();

    const rows = (
      await Promise.all(
        fests.map(async (fest) => {
          const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_fest", (q) => q.eq("festId", fest._id))
            .collect();
          return Promise.all(
            campaigns.map(async (row) => {
              const event =
                row.eventId === undefined ? null : await ctx.db.get(row.eventId);
              return {
                _id: row._id,
                code: row.code,
                title: row.title,
                blurb: row.blurb ?? null,
                kind: row.kind,
                value: row.value,
                label: campaignLabel(row),
                startsAt: row.startsAt,
                endsAt: row.endsAt,
                maxUses: row.maxUses ?? null,
                uses: row.uses,
                active: row.active,
                running: isLive(row, now),
                state: campaignState(row, now),
                programmeName: fest.name,
                eventTitle: event?.title ?? null,
              };
            }),
          );
        }),
      )
    ).flat();

    return rows.sort((a, b) => b.startsAt - a.startsAt);
  },
});

/** Start a promotion. Codes are stored uppercase and must be unique. */
export const create = mutation({
  args: {
    festId: v.id("fests"),
    eventId: v.optional(v.id("events")),
    code: v.string(),
    title: v.string(),
    blurb: v.optional(v.string()),
    kind: campaignKindValidator,
    value: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const fest = await ctx.db.get(args.festId);
    if (fest === null) throw new Error("That programme no longer exists.");
    if (fest.ownerId !== userId) {
      throw new Error("That programme belongs to another business.");
    }

    const code = args.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      throw new Error(
        "Codes use 3–16 letters, numbers or dashes, for example EARLYBIRD.",
      );
    }
    const clash = await ctx.db
      .query("campaigns")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (clash !== null && isLive(clash)) {
      throw new Error(`The code ${code} is already running.`);
    }

    const title = args.title.trim();
    if (title.length < 3) throw new Error("Give the campaign a name.");
    if (args.endsAt <= args.startsAt) {
      throw new Error("The campaign has to end after it starts.");
    }
    if (args.kind === "percent") {
      if (args.value < 1 || args.value > 90) {
        throw new Error("A percentage discount runs between 1 and 90.");
      }
    } else if (args.value < 100) {
      throw new Error("A fixed discount needs to be at least 1.00.");
    }

    const campaignId = await ctx.db.insert("campaigns", {
      festId: args.festId,
      eventId: args.eventId,
      code,
      title,
      blurb: args.blurb?.trim() || undefined,
      kind: args.kind,
      value: Math.round(args.value),
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      maxUses: args.maxUses,
      uses: 0,
      active: true,
      createdAt: Date.now(),
    });

    return { campaignId, code };
  },
});

/** Pause or restart a promotion. */
export const setActive = mutation({
  args: { campaignId: v.id("campaigns"), active: v.boolean() },
  handler: async (ctx, { campaignId, active }) => {
    const userId = await requireUserId(ctx);
    const campaign = await ctx.db.get(campaignId);
    if (campaign === null) throw new Error("That campaign no longer exists.");
    const fest = await ctx.db.get(campaign.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("That campaign belongs to another business.");
    }
    await ctx.db.patch(campaignId, { active });
    return { active };
  },
});

export const remove = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const userId = await requireUserId(ctx);
    const campaign = await ctx.db.get(campaignId);
    if (campaign === null) return { removed: false as const };
    const fest = await ctx.db.get(campaign.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("That campaign belongs to another business.");
    }
    await ctx.db.delete(campaignId);
    return { removed: true as const };
  },
});

/**
 * Count a use. Called from the booking and checkout paths once a discount has
 * actually been taken, so the cap reflects real redemptions only.
 */
export async function countUse(ctx: MutationCtx, campaignId: Id<"campaigns">) {
  const campaign = await ctx.db.get(campaignId);
  if (campaign === null) return;
  await ctx.db.patch(campaignId, { uses: campaign.uses + 1 });
}
