import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { countUse, resolveDiscount } from "./campaigns";
import { makeReference, requireUserId } from "./model";
import { paymentMethodValidator as methodValidator } from "./schema";

/** Everything except settling at the desk is taken as settled on the spot. */
function settlesImmediately(method: string) {
  return method !== "on-site";
}

/**
 * The signed-in customer's own shop orders, newest first. A place at an event
 * is free, so the shelf is the only place money is spent here.
 */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const hydrated = await Promise.all(
      rows.map(async (row) => {
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

    return hydrated.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** What is on sale at one event, as the customer buying it sees it. */
export const forEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return products
      .filter((product) => product.active)
      .map((product) => ({
        _id: product._id,
        name: product.name,
        kind: product.kind,
        description: product.description ?? null,
        price: product.price,
        available: Math.max(0, product.stock - product.sold),
      }));
  },
});

/**
 * Take an order. The basket is priced on the server from the shelf itself, so
 * a discount can only ever be worked out from a code the server accepted.
 */
export const checkout = mutation({
  args: {
    eventId: v.id("events"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      }),
    ),
    paymentMethod: methodValidator,
    fullName: v.string(),
    email: v.string(),
    country: v.string(),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event === null) throw new Error("That event no longer exists.");

    const productRows = await Promise.all(
      args.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (product === null) throw new Error("Unknown shop item.");
        if (product.eventId !== args.eventId) {
          throw new Error("That item does not belong to this event.");
        }
        const available = product.stock - product.sold;
        if (item.quantity < 1) {
          throw new Error(`Choose at least one of ${product.name}.`);
        }
        if (available < item.quantity) {
          throw new Error(`Only ${available} left of ${product.name}.`);
        }
        return product;
      }),
    );

    const fullName = args.fullName.trim();
    const email = args.email.trim().toLowerCase();
    if (!fullName) throw new Error("Please add the name for the order.");
    if (!email.includes("@")) throw new Error("Please enter a valid email.");

    const subtotal = args.items.reduce(
      (sum, item, index) => sum + productRows[index].price * item.quantity,
      0,
    );
    // A promotion is resolved on the server, from the code alone — the client
    // never states what the discount is.
    const promo =
      args.promoCode === undefined || args.promoCode.trim().length === 0
        ? null
        : await resolveDiscount(ctx, { code: args.promoCode, subtotal });
    const discount = promo?.discount ?? 0;
    const total = Math.max(0, subtotal - discount);
    const paymentStatus = settlesImmediately(args.paymentMethod)
      ? "paid"
      : "due";

    const reference = makeReference();
    const orderId = await ctx.db.insert("orders", {
      eventId: args.eventId,
      festId: event.festId,
      userId,
      items: args.items.map((item, index) => ({
        productId: item.productId,
        name: productRows[index].name,
        kind: productRows[index].kind,
        unitPrice: productRows[index].price,
        quantity: item.quantity,
      })),
      subtotal,
      promoCode: promo?.code,
      discount,
      country: args.country,
      paymentMethod: args.paymentMethod,
      paymentStatus,
      amountPaid: paymentStatus === "paid" ? total : 0,
      reference,
      fullName,
      email,
      status: "placed",
      createdAt: Date.now(),
    });

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product === null) continue;
      await ctx.db.patch(item.productId, { sold: product.sold + item.quantity });
    }
    if (promo !== null) await countUse(ctx, promo.campaign._id);

    return {
      orderId,
      reference,
      subtotal,
      discount,
      promoCode: promo?.code ?? null,
      paymentStatus,
      amountPaid: paymentStatus === "paid" ? total : 0,
    };
  },
});

/** The shelf for one event, as the business that runs it sees it. */
export const managed = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];

    const event = await ctx.db.get(eventId);
    if (event === null) return [];
    const fest = await ctx.db.get(event.festId);
    if (fest === null || fest.ownerId !== userId) return [];

    const products = await ctx.db
      .query("products")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    return products.map((product) => ({
      _id: product._id,
      eventId: product.eventId,
      name: product.name,
      kind: product.kind,
      description: product.description ?? null,
      price: product.price,
      stock: product.stock,
      sold: product.sold,
      available: Math.max(0, product.stock - product.sold),
      active: product.active,
    }));
  },
});

/** Put something on sale at one of the events this account runs. */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    kind: v.union(v.literal("merchandise"), v.literal("snack")),
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
      throw new Error("Only the owning account can add items here.");
    }

    const name = args.name.trim();
    if (!name) throw new Error("Give the item a name.");
    const price = Math.max(0, Math.round(args.price));
    const stock = Math.max(0, Math.round(args.stock));

    const id = await ctx.db.insert("products", {
      eventId: args.eventId,
      festId: event.festId,
      name,
      kind: args.kind,
      description: args.description?.trim() || undefined,
      price,
      stock,
      sold: 0,
      active: true,
      createdAt: Date.now(),
    });

    return { id, name, price };
  },
});

/** Take something off the shelf. Orders already placed keep their record. */
export const remove = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await requireUserId(ctx);
    const product = await ctx.db.get(productId);
    if (product === null) return { removed: false };
    const fest = await ctx.db.get(product.festId);
    if (fest === null || fest.ownerId !== userId) {
      throw new Error("Only the owning account can remove items here.");
    }
    await ctx.db.delete(productId);
    return { removed: true };
  },
});
