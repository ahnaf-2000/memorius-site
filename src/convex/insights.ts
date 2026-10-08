import { query, type QueryCtx } from "./_generated/server";

/**
 * The platform, measured.
 *
 * One aggregate pass over the whole catalogue: what is on, what it has sold,
 * what the room said about it, and which promotions are currently in flight.
 * It is used twice — by the published report at the foot of the landing page,
 * and as grounding context for the assistant — so the same figures can never
 * disagree with each other. Only aggregate and catalogue-level facts leave
 * here; no customer names, emails or references.
 */

const PAID = "paid";
const CONFIRMED = "confirmed";

function total<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((running, row) => running + pick(row), 0);
}

/**
 * The aggregate pass itself, kept as a plain function so the same figures can
 * be typed and shared: the assistant grounds on exactly what the report prints.
 */
async function buildOverview(ctx: QueryCtx) {
  const now = Date.now();

  const [
    events,
    fests,
    registrations,
    orders,
    products,
    sponsorships,
    reviews,
    campaigns,
  ] = await Promise.all([
    ctx.db.query("events").collect(),
    ctx.db.query("fests").collect(),
    ctx.db.query("registrations").collect(),
    ctx.db.query("orders").collect(),
    ctx.db.query("products").collect(),
    ctx.db.query("sponsorships").collect(),
    ctx.db.query("reviews").collect(),
    ctx.db.query("campaigns").collect(),
  ]);

  const upcoming = events
    .filter((event) => event.endTime >= now)
    .sort((a, b) => a.startTime - b.startTime);
  const finished = events.filter((event) => event.endTime < now);
  const live = upcoming.filter((event) => event.seatsTaken < event.capacity);

  const capacity = total(upcoming, (event) => event.capacity);
  const booked = total(upcoming, (event) => event.seatsTaken);

  const held = registrations.filter((row) => row.status === CONFIRMED);
  const placesSold = held.length;
  const awaitingSettlement = held.filter(
    (row) => row.paymentStatus !== PAID,
  ).length;

  const ticketMoney = total(held, (row) => row.amountPaid);
  const settledOrders = orders.filter((row) => row.paymentStatus === PAID);
  const shopMoney = total(settledOrders, (row) => row.amountPaid);
  const shopItems = total(orders, (row) =>
    total(row.items, (line) => line.quantity),
  );

  const sponsorshipMoney = total(sponsorships, (row) => row.amount);
  const sponsorshipCollected = total(
    sponsorships.filter((row) => row.status === PAID),
    (row) => row.amount,
  );

  const ratingAverage =
    reviews.length === 0
      ? null
      : Math.round(
          (total(reviews, (row) => row.rating) / reviews.length) * 10,
        ) / 10;

  /** Fill rate per event, so the report can name what is selling fastest. */
  const byDemand = [...upcoming]
    .map((event) => ({
      title: event.title,
      programme: fests.find((fest) => fest._id === event.festId)?.name ?? "",
      category: event.category,
      startTime: event.startTime,
      venue: event.venue,
      capacity: event.capacity,
      booked: event.seatsTaken,
      price: event.price,
      fill:
        event.capacity === 0
          ? 0
          : Math.round((event.seatsTaken / event.capacity) * 100),
    }))
    .sort((a, b) => b.fill - a.fill);

  /** Category mix across what is still to come. */
  const categories = Array.from(
    upcoming.reduce((map, event) => {
      const current = map.get(event.category) ?? {
        events: 0,
        capacity: 0,
        booked: 0,
      };
      map.set(event.category, {
        events: current.events + 1,
        capacity: current.capacity + event.capacity,
        booked: current.booked + event.seatsTaken,
      });
      return map;
    }, new Map<string, { events: number; capacity: number; booked: number }>()),
  )
    .map(([name, row]) => ({
      name,
      ...row,
      fill:
        row.capacity === 0 ? 0 : Math.round((row.booked / row.capacity) * 100),
    }))
    .sort((a, b) => b.events - a.events);

  /** Where the money is arriving from, by rail. */
  const rails = Array.from(
    [...held, ...orders].reduce((map, row) => {
      const method = row.paymentMethod ?? "unrecorded";
      map.set(method, (map.get(method) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  const programmes = fests
    .map((fest) => {
      const own = events.filter((event) => event.festId === fest._id);
      const next = own
        .filter((event) => event.endTime >= now)
        .sort((a, b) => a.startTime - b.startTime)[0];
      return {
        name: fest.name,
        organization: fest.organization,
        slug: fest.slug,
        events: own.length,
        upcoming: own.filter((event) => event.endTime >= now).length,
        capacity: total(own, (event) => event.capacity),
        booked: total(own, (event) => event.seatsTaken),
        nextStart: next?.startTime ?? null,
      };
    })
    .sort((a, b) => (a.nextStart ?? 0) - (b.nextStart ?? 0));

  const promotions = campaigns
    .filter((row) => row.active && row.startsAt <= now && row.endsAt >= now)
    .sort((a, b) => a.endsAt - b.endsAt)
    .map((row) => ({
      code: row.code,
      title: row.title,
      kind: row.kind,
      value: row.value,
      endsAt: row.endsAt,
      remaining:
        row.maxUses === undefined ? null : Math.max(0, row.maxUses - row.uses),
      scope: row.eventId === undefined ? "programme" : "event",
      scopeName:
        (row.eventId === undefined
          ? fests.find((fest) => fest._id === row.festId)?.name
          : events.find((event) => event._id === row.eventId)?.title) ??
        "the catalogue",
    }));

  /** What the room said, averaged onto the events that have finished. */
  const rated = finished
    .map((event) => {
      const own = reviews.filter((row) => row.eventId === event._id);
      return {
        title: event.title,
        reviews: own.length,
        average:
          own.length === 0
            ? null
            : Math.round((total(own, (row) => row.rating) / own.length) * 10) /
              10,
      };
    })
    .filter((row) => row.reviews > 0)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  return {
    generatedAt: now,
    programmes: {
      count: fests.length,
      list: programmes.slice(0, 8),
    },
    events: {
      published: events.length,
      upcoming: upcoming.length,
      finished: finished.length,
      openForBooking: live.length,
      capacity,
      booked,
      placesLeft: Math.max(0, capacity - booked),
      occupancy: capacity === 0 ? 0 : Math.round((booked / capacity) * 100),
      firstStart: upcoming[0]?.startTime ?? null,
      lastStart: upcoming[upcoming.length - 1]?.startTime ?? null,
    },
    demand: byDemand.slice(0, 6),
    categories: categories.slice(0, 8),
    money: {
      ticketsCollected: ticketMoney,
      shopCollected: shopMoney,
      sponsorsPledged: sponsorshipMoney,
      sponsorsCollected: sponsorshipCollected,
      collected: ticketMoney + shopMoney,
      placesSold,
      awaitingSettlement,
      orders: orders.length,
      shopItems,
      averageTicket:
        placesSold === 0 ? 0 : Math.round(ticketMoney / placesSold),
    },
    shop: {
      products: products.length,
      inStock: products.filter((row) => row.active && row.stock - row.sold > 0)
        .length,
      merchandise: products.filter((row) => row.kind === "merchandise").length,
      snacks: products.filter((row) => row.kind === "snack").length,
    },
    sponsorship: {
      count: sponsorships.length,
      tiers: ["community", "silver", "gold", "lead"].map((tier) => ({
        tier,
        count: sponsorships.filter((row) => row.tier === tier).length,
        amount: total(
          sponsorships.filter((row) => row.tier === tier),
          (row) => row.amount,
        ),
      })),
    },
    reviews: {
      count: reviews.length,
      average: ratingAverage,
      rated: rated.slice(0, 4),
    },
    rails,
    promotions,
  };
}

export const overview = query({
  args: {},
  handler: buildOverview,
});

export type PlatformOverview = Awaited<ReturnType<typeof buildOverview>>;
