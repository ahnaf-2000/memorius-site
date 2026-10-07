import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { countUse, resolveDiscount } from "./campaigns";
import { makeReference, requireUserId } from "./model";
import { paymentMethodValidator, productKindValidator } from "./schema";

const MAX_LINES = 12;
const MAX_QUANTITY = 20;

/** Anything not paid up front is carried as due at the desk. */
function settlesImmediately(method: string) {
  return method !== "on-site";
}

/**
 * The shop attached to one event: merchandise to keep, snacks for the day.
 * Only what is still in stock is returned, with the remaining count.
 */
export const forEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const rows = await ctx.db
      .query("products")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return rows
      .filter((row) => row.active && Math.max(0, row.stock - row.sold) > 0)
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "merchandise" ? -1 : 1))
      .map((row) => ({
        _id: row._id,
        name: row.name,
        kind: row.kind,
        description: row.description ?? null,
        price: row.price,
        available: Math.max(0, row.stock - row.sold),
      }));
  },
});

/** Everything on the shelf for one event, including what has sold out. */
export const managed = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const event = await ctx.db.get(eventId);
    if (event === null) return [];
    const fest = await ctx.db.get(event.festId);
    if (fest === null || fest.ownerId !== userId) return [];

    const rows = await ctx.db
      .query("products")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((row) => ({
        _id: row._id,
        name: row.name,
        kind: row.kind,
        description: row.description ?? null,
        price: row.price,
        stock: row.stock,
        sold: row.sold,
        available: Math.max(0, row.stock - row.sold),
        active: row.active,
      }));
  },
});

/** Put something new on sale. Only the business running the event may do it. */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    kind: productKindValidator,
    description: v.optional(v.string()),
    price: v.number(),
    stock: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event === null) throw new Error("That event no longer exists.");
    const fest = await ctx.db.get(event.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("That event belongs to another business.");
    }

    const name = args.name.trim();
    if (name.length < 2) throw new Error("Give the item a name.");
    if (!Number.isFinite(args.price) || args.price < 0) {
      throw new Error("Enter a price of zero or more.");
    }
    if (!Number.isFinite(args.stock) || args.stock < 1) {
      throw new Error("Enter how many you have to sell.");
    }

    await ctx.db.insert("products", {
      eventId: args.eventId,
      festId: event.festId,
      name,
      kind: args.kind,
      description: args.description?.trim() || undefined,
      price: Math.round(args.price),
      stock: Math.round(args.stock),
      sold: 0,
      active: true,
      createdAt: Date.now(),
    });

    return { created: true as const };
  },
});

/** Take something off sale, along with any stock record for it. */
export const remove = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await requireUserId(ctx);
    const product = await ctx.db.get(productId);
    if (product === null) return { removed: false as const };
    const fest = await ctx.db.get(product.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("That item belongs to another business.");
    }
    await ctx.db.delete(productId);
    return { removed: true as const };
  },
});

/**
 * Check out a basket. Prices come from the products themselves, never from the
 * client, and stock is decremented in the same transaction that records the
 * order so the shelf can never oversell.
 */
export const checkout = mutation({
  args: {
    eventId: v.id("events"),
    items: v.array(
      v.object({ productId: v.id("products"), quantity: v.number() }),
    ),
    paymentMethod: paymentMethodValidator,
    fullName: v.string(),
    email: v.string(),
    country: v.string(),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event === null) throw new Error("That event no longer exists.");

    const lines = args.items.filter((line) => line.quantity > 0);
    if (lines.length === 0) throw new Error("Your basket is empty.");
    if (lines.length > MAX_LINES) throw new Error("That is too many items.");

    const fullName = args.fullName.trim();
    const email = args.email.trim().toLowerCase();
    if (!fullName) throw new Error("Add the name for the order.");
    if (!email.includes("@")) throw new Error("Add a valid email address.");

    const prepared = [];
    for (const line of lines) {
      const quantity = Math.min(MAX_QUANTITY, Math.round(line.quantity));
      if (quantity < 1) continue;
      const product = await ctx.db.get(line.productId);
      if (product === null || product.eventId !== args.eventId) {
        throw new Error("One of those items is no longer available.");
      }
      const available = Math.max(0, product.stock - product.sold);
      if (available < quantity) {
        throw new Error(`Only ${available} left of ${product.name}.`);
      }
      prepared.push({ product, quantity });
    }
    if (prepared.length === 0) throw new Error("Your basket is empty.");

    const subtotal = prepared.reduce(
      (sum, line) => sum + line.product.price * line.quantity,
      0,
    );
    const promo = args.promoCode
      ? await resolveDiscount(ctx, { code: args.promoCode, subtotal })
      : null;
    const discount = promo?.discount ?? 0;
    const total = Math.max(0, subtotal - discount);
    const paid = settlesImmediately(args.paymentMethod);
    const reference = makeReference();

    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      festId: event.festId,
      userId,
      items: prepared.map((line) => ({
        productId: line.product._id,
        name: line.product.name,
        kind: line.product.kind,
        unitPrice: line.product.price,
        quantity: line.quantity,
      })),
      subtotal,
      country: args.country,
      paymentMethod: args.paymentMethod,
      paymentStatus: paid ? "paid" : "due",
      amountPaid: paid ? total : 0,
      promoCode: promo?.code,
      discount,
      reference,
      fullName,
      email,
      status: "placed",
      createdAt: Date.now(),
    });

    for (const line of prepared) {
      await ctx.db.patch(line.product._id, {
        sold: line.product.sold + line.quantity,
      });
    }
    if (promo !== null) await countUse(ctx, promo.campaign._id);

    return {
      orderId,
      reference,
      subtotal,
      discount,
      total,
      promoCode: promo?.code ?? null,
      paymentStatus: paid ? ("paid" as const) : ("due" as const),
      lineCount: prepared.length,
    };
  },
});

/** The signed-in customer's own shop orders. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return Promise.all(
      rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20)
        .map(async (row) => {
          const event = await ctx.db.get(row.eventId);
          return {
            _id: row._id,
            reference: row.reference,
            subtotal: row.subtotal,
            paymentMethod: row.paymentMethod,
            paymentStatus: row.paymentStatus,
            status: row.status,
            createdAt: row.createdAt,
            items: row.items,
            eventTitle: event?.title ?? "Removed event",
            eventSlug: event?.slug ?? "",
            eventStart: event?.startTime ?? 0,
          };
        }),
    );
  },
});
