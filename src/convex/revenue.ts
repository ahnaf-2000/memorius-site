import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

/**
 * One screen for everything a business has taken: places, shop orders,
 * sponsorships, and what is still owed. Read-only — nothing here changes a
 * record, so it can be left open on a second monitor without consequence.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    let ticketPaid = 0;
    let ticketDue = 0;
    let tickets = 0;
    let shopPaid = 0;
    let shopDue = 0;
    let orders = 0;
    let sponsorPaid = 0;
    let sponsorConfirmed = 0;
    let sponsorPledged = 0;
    let sponsors = 0;
    let reviewTotal = 0;
    let reviewCount = 0;

    const markets = new Map<string, { orders: number; value: number }>();
    const rows: {
      eventId: string;
      title: string;
      slug: string;
      startTime: number;
      programmeName: string;
      tickets: number;
      ticketPaid: number;
      ticketDue: number;
      shopPaid: number;
      shopDue: number;
      sponsors: number;
      sponsorValue: number;
      rating: number | null;
      reviewCount: number;
    }[] = [];

    for (const fest of fests) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();
      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();
      const shopOrders = await ctx.db
        .query("orders")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();
      const pledges = await ctx.db
        .query("sponsorships")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();

      for (const order of shopOrders) {
        if (order.status === "cancelled") continue;
        orders += 1;
        if (order.paymentStatus === "paid") shopPaid += order.amountPaid;
        else shopDue += order.subtotal;
        const bucket = markets.get(order.country) ?? { orders: 0, value: 0 };
        bucket.orders += 1;
        bucket.value += order.subtotal;
        markets.set(order.country, bucket);
      }

      for (const pledge of pledges) {
        sponsors += 1;
        if (pledge.status === "paid") sponsorPaid += pledge.amount;
        else if (pledge.status === "confirmed") sponsorConfirmed += pledge.amount;
        else sponsorPledged += pledge.amount;
      }

      for (const event of events) {
        const eventBookings = registrations.filter(
          (row) => row.eventId === event._id && row.status !== "cancelled",
        );
        const eventOrders = shopOrders.filter(
          (row) => row.eventId === event._id && row.status !== "cancelled",
        );
        const eventPledges = pledges.filter((row) => row.eventId === event._id);
        const eventReviews = await ctx.db
          .query("reviews")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const rowTicketPaid = eventBookings
          .filter((row) => row.paymentStatus === "paid")
          .reduce((sum, row) => sum + row.amountPaid, 0);
        const rowTicketDue = eventBookings
          .filter((row) => row.paymentStatus === "due")
          .reduce((sum, row) => sum + event.price, 0);
        const rowShopPaid = eventOrders
          .filter((row) => row.paymentStatus === "paid")
          .reduce((sum, row) => sum + row.amountPaid, 0);
        const rowShopDue = eventOrders
          .filter((row) => row.paymentStatus === "due")
          .reduce((sum, row) => sum + row.subtotal, 0);

        ticketPaid += rowTicketPaid;
        ticketDue += rowTicketDue;
        tickets += eventBookings.length;
        shopPaid += rowShopPaid;
        shopDue += rowShopDue;

        const rated = eventReviews.reduce((sum, row) => sum + row.rating, 0);
        reviewTotal += rated;
        reviewCount += eventReviews.length;

        rows.push({
          eventId: event._id,
          title: event.title,
          slug: event.slug,
          startTime: event.startTime,
          programmeName: fest.name,
          tickets: eventBookings.length,
          ticketPaid: rowTicketPaid,
          ticketDue: rowTicketDue,
          shopPaid: rowShopPaid,
          shopDue: rowShopDue,
          sponsors: eventPledges.length,
          sponsorValue: eventPledges.reduce((sum, row) => sum + row.amount, 0),
          rating:
            eventReviews.length === 0
              ? null
              : rated / eventReviews.length,
          reviewCount: eventReviews.length,
        });
      }
    }

    return {
      programmes: fests.length,
      tickets,
      ticketPaid,
      ticketDue,
      orders,
      shopPaid,
      shopDue,
      sponsors,
      sponsorPaid,
      sponsorConfirmed,
      sponsorPledged,
      collected: ticketPaid + shopPaid + sponsorPaid,
      promised: ticketDue + shopDue + sponsorConfirmed + sponsorPledged,
      reviewCount,
      rating: reviewCount === 0 ? null : reviewTotal / reviewCount,
      payoutMethod: profile?.payoutMethod ?? null,
      payoutDetails: profile?.payoutDetails ?? null,
      markets: Array.from(markets.entries())
        .map(([country, value]) => ({ country, ...value }))
        .sort((a, b) => b.value - a.value),
      events: rows.sort((a, b) => a.startTime - b.startTime),
    };
  },
});
