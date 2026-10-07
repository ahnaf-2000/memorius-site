import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./model";
import {
  paymentMethodValidator,
  sponsorshipStatusValidator,
  sponsorshipTierValidator,
} from "./schema";

/**
 * Suggested amounts per tier, in minor units of the base currency. A sponsor
 * can always pledge a different figure — this is a starting point, not a rule.
 */
export const TIERS = [
  {
    id: "community" as const,
    name: "Community",
    amount: 50_000,
    blurb: "Support for the room: refreshments, materials, the small things.",
  },
  {
    id: "silver" as const,
    name: "Silver",
    amount: 150_000,
    blurb: "Logo on the programme page and two places at the anchor event.",
  },
  {
    id: "gold" as const,
    name: "Gold",
    amount: 400_000,
    blurb: "A named session, a stand in the atrium, and six places across the week.",
  },
  {
    id: "lead" as const,
    name: "Lead partner",
    amount: 1_000_000,
    blurb: "The programme carries your name, and your people open the keynote.",
  },
];

/** The tier table, so the interface and the ledger never drift apart. */
export const options = query({
  args: {},
  handler: async () => TIERS,
});

/** Who is backing this event, and the programme it sits inside. */
export const forEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (event === null) return [];

    const programmeLevel = await ctx.db
      .query("sponsorships")
      .withIndex("by_fest", (q) => q.eq("festId", event.festId))
      .collect();
    const eventLevel = await ctx.db
      .query("sponsorships")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    const seen = new Set<string>();
    const rows = [...eventLevel, ...programmeLevel].filter((row) => {
      if (seen.has(row._id)) return false;
      seen.add(row._id);
      return true;
    });

    return rows
      .sort((a, b) =>
        b.amount === a.amount ? a.createdAt - b.createdAt : b.amount - a.amount,
      )
      .map((row) => ({
        _id: row._id,
        company: row.company,
        tier: row.tier,
        amount: row.amount,
        message: row.message ?? null,
        status: row.status,
        eventId: row.eventId ?? null,
      }));
  },
});

/** Back an event, or the programme around it, with money and a message. */
export const pledge = mutation({
  args: {
    festId: v.id("fests"),
    eventId: v.optional(v.id("events")),
    company: v.string(),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    tier: sponsorshipTierValidator,
    amount: v.number(),
    message: v.optional(v.string()),
    paymentMethod: paymentMethodValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const fest = await ctx.db.get(args.festId);
    if (fest === null) throw new Error("That programme no longer exists.");

    const company = args.company.trim();
    if (company.length < 2) throw new Error("Add the company name.");
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Enter the amount you would like to pledge.");
    }

    const sponsorshipId = await ctx.db.insert("sponsorships", {
      festId: args.festId,
      eventId: args.eventId,
      userId,
      company,
      contactName: args.contactName?.trim() || undefined,
      email: args.email?.trim().toLowerCase() || undefined,
      tier: args.tier,
      amount: Math.round(args.amount),
      message: args.message?.trim() || undefined,
      paymentMethod: args.paymentMethod,
      status: "pledged",
      createdAt: Date.now(),
    });

    return { sponsorshipId, status: "pledged" as const };
  },
});

/** Sponsorships this account has pledged. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("sponsorships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return Promise.all(
      rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (row) => {
          const fest = await ctx.db.get(row.festId);
          const event = row.eventId === undefined ? null : await ctx.db.get(row.eventId);
          return {
            _id: row._id,
            company: row.company,
            tier: row.tier,
            amount: row.amount,
            status: row.status,
            paymentMethod: row.paymentMethod,
            createdAt: row.createdAt,
            programmeName: fest?.name ?? "Removed programme",
            programmeSlug: fest?.slug ?? "",
            eventTitle: event?.title ?? null,
          };
        }),
    );
  },
});

/** Every pledge made towards the programmes this business runs. */
export const forOrganizer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const rows = (
      await Promise.all(
        fests.map(async (fest) => {
          const pledges = await ctx.db
            .query("sponsorships")
            .withIndex("by_fest", (q) => q.eq("festId", fest._id))
            .collect();
          return Promise.all(
            pledges.map(async (row) => {
              const event = row.eventId === undefined ? null : await ctx.db.get(row.eventId);
              return {
                _id: row._id,
                company: row.company,
                contactName: row.contactName ?? null,
                email: row.email ?? null,
                tier: row.tier,
                amount: row.amount,
                message: row.message ?? null,
                status: row.status,
                paymentMethod: row.paymentMethod,
                createdAt: row.createdAt,
                programmeName: fest.name,
                eventTitle: event?.title ?? null,
              };
            }),
          );
        }),
      )
    ).flat();

    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Confirm a pledge, or mark the money as landed. Organizers only. */
export const setStatus = mutation({
  args: {
    sponsorshipId: v.id("sponsorships"),
    status: sponsorshipStatusValidator,
  },
  handler: async (ctx, { sponsorshipId, status }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(sponsorshipId);
    if (row === null) throw new Error("That pledge no longer exists.");
    const fest = await ctx.db.get(row.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("That pledge belongs to another business.");
    }
    await ctx.db.patch(sponsorshipId, { status });
    return { status };
  },
});
