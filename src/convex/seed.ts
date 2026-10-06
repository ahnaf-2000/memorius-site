import { mutation } from "./_generated/server";

/**
 * Version of the showcase catalogue. Bumping this replaces showcase data left
 * behind by an earlier version — and only showcase data, never a programme a
 * business created itself.
 */
const SHOWCASE_VERSION = 2;

/**
 * Demo catalogue for a business that sells places at its events. Mirrors the
 * real shape of the product: one business running several programmes, each
 * programme holding several events, each event priced per place.
 *
 * Idempotent, so it is safe to call on every visit.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("fests").collect();
    const upToDate = all.filter(
      (fest) => fest.showcase === true && fest.showcaseVersion === SHOWCASE_VERSION,
    );
    if (upToDate.length > 0) return { seeded: false as const, replaced: 0 };

    const stale = all.filter((fest) => fest.showcase === true);
    const owned = all.filter((fest) => fest.showcase !== true);
    // A catalogue the business built itself is never touched.
    if (stale.length === 0 && owned.length > 0) {
      return { seeded: false as const, replaced: 0 };
    }

    for (const fest of stale) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();
      for (const event of events) {
        const bookings = await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();
        for (const booking of bookings) await ctx.db.delete(booking._id);
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();
        for (const comment of comments) await ctx.db.delete(comment._id);
        await ctx.db.delete(event._id);
      }
      await ctx.db.delete(fest._id);
    }

    const now = Date.now();

    const programmes = [
      {
        organization: "Meridian Group",
        name: "Operations Summit 2026",
        slug: "operations-summit-2026",
        summary:
          "Four days of forums, workshops and roundtables for operations and supply chain leaders.",
        description:
          "The flagship programme of the year. A single-day forum anchors the week, supported by hands-on workshops, an evening keynote and a closed networking dinner for members.",
        venue: "Meridian House, 42 Finsbury Square",
        startDate: new Date(2026, 10, 12, 9, 0).getTime(),
        endDate: new Date(2026, 10, 15, 22, 30).getTime(),
        events: [
          {
            title: "Supply Chain Resilience Forum",
            category: "Forum",
            summary:
              "A full day on supplier risk, continuity planning and the cost of a broken link.",
            description:
              "A full-day forum for operations leaders, built around four working sessions and two case reviews. We cover supplier risk mapping, continuity planning, and what resilience actually costs against what an outage costs.\n\nLunch and refreshments are included. Sessions are recorded and shared with attendees the following week.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 12, 9, 0).getTime(),
            endTime: new Date(2026, 10, 12, 17, 0).getTime(),
            venue: "Main Hall, Meridian House",
            host: "Operations Faculty",
            capacity: 140,
            seatsTaken: 96,
            price: 22000,
          },
          {
            title: "AI in Operations Workshop",
            category: "Workshop",
            summary:
              "Build a working forecast on your own data, from first pass to a decision you can defend.",
            description:
              "A hands-on half day. Bring a dataset you already work with and leave with a forecasting model, a backtest, and a short written case for the decision it supports. Numbers are provided if you would rather not bring your own.\n\nTwelve workstations are available; bringing a laptop is recommended.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 13, 9, 30).getTime(),
            endTime: new Date(2026, 10, 13, 13, 0).getTime(),
            venue: "Studio 3, Meridian House",
            host: "Dr. Alastair Whitfield",
            capacity: 45,
            seatsTaken: 41,
            price: 34000,
          },
          {
            title: "The Next Decade of Logistics — Keynote",
            category: "Keynote",
            summary:
              "An evening address on what changes in freight, warehousing and last-mile delivery.",
            description:
              "A single evening address, followed by an open question session and drinks in the atrium. Seating is unreserved and the room holds three hundred.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 13, 18, 0).getTime(),
            endTime: new Date(2026, 10, 13, 19, 30).getTime(),
            venue: "Main Hall, Meridian House",
            host: "Meridian Group",
            capacity: 320,
            seatsTaken: 214,
            price: 0,
          },
          {
            title: "Operations Networking Dinner",
            category: "Social",
            summary:
              "A seated dinner for members, with a short address and no speeches after it.",
            description:
              "A seated three-course dinner on the terrace, limited to eighty places and open to members only. Seating is assigned in advance; tell us who you would like to sit with when you book.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 14, 19, 30).getTime(),
            endTime: new Date(2026, 10, 14, 22, 30).getTime(),
            venue: "The Terrace, Meridian House",
            host: "Meridian Group",
            capacity: 80,
            seatsTaken: 80,
            price: 13500,
          },
        ],
      },
      {
        organization: "Meridian Group",
        name: "Data Leadership Programme 2026",
        slug: "data-leadership-2026",
        summary:
          "Three days for teams that own data strategy: one intensive, one workshop, one roundtable.",
        description:
          "A practical programme for data leaders and the teams around them. The intensive sets the strategy, the workshop turns it into metrics, and the roundtable is where peers compare notes under Chatham House rules.",
        venue: "Meridian House, Studio 2",
        startDate: new Date(2026, 11, 3, 9, 0).getTime(),
        endDate: new Date(2026, 11, 5, 16, 0).getTime(),
        events: [
          {
            title: "Data Strategy Intensive",
            category: "Course",
            summary:
              "One day to produce a written data strategy your board will actually read.",
            description:
              "A full day of guided work with a Meridian faculty lead. You leave with a one-page strategy, a costed roadmap for the next four quarters, and a short list of the decisions you have to make first.\n\nPlaces are limited to sixty so that every table keeps a working ratio of eight to one.",
            format: "in-person" as const,
            startTime: new Date(2026, 11, 3, 9, 0).getTime(),
            endTime: new Date(2026, 11, 3, 16, 0).getTime(),
            venue: "Studio 2, Meridian House",
            host: "Dr. Alastair Whitfield",
            capacity: 60,
            seatsTaken: 52,
            price: 78000,
          },
          {
            title: "Metrics That Matter",
            category: "Workshop",
            summary:
              "Cut a metric tree down to the six numbers that change a decision.",
            description:
              "A half-day workshop on metric design. We take an inflated dashboard, define what each number is for, and remove everything that survives only because it was already there. Bring your current reporting pack.",
            format: "in-person" as const,
            startTime: new Date(2026, 11, 4, 10, 0).getTime(),
            endTime: new Date(2026, 11, 4, 13, 0).getTime(),
            venue: "Studio 4, Meridian House",
            host: "Priya Raman",
            capacity: 40,
            seatsTaken: 18,
            price: 26000,
          },
          {
            title: "Analytics Roundtable",
            category: "Roundtable",
            summary:
              "Twelve organisations, one table, no slides and no recording.",
            description:
              "An off-the-record roundtable for senior analytics leads. Twelve organisations, one table, and a facilitator who keeps the discussion on the decisions rather than the tooling. No slides, no recording, and a short written summary shared with attendees only.",
            format: "in-person" as const,
            startTime: new Date(2026, 11, 5, 14, 0).getTime(),
            endTime: new Date(2026, 11, 5, 16, 0).getTime(),
            venue: "Boardroom, Meridian House",
            host: "Priya Raman",
            capacity: 24,
            seatsTaken: 9,
            price: 0,
          },
        ],
      },
      {
        organization: "Meridian Group",
        name: "Client Academy 2027",
        slug: "client-academy-2027",
        summary:
          "Two days in Manchester for the people who onboard and plan with us.",
        description:
          "Client Academy is where new client teams meet ours. Two days, two sessions, and a clear handover on how we work together for the year ahead.",
        venue: "Meridian Exchange, Manchester",
        startDate: new Date(2027, 0, 22, 9, 30).getTime(),
        endDate: new Date(2027, 0, 23, 12, 30).getTime(),
        events: [
          {
            title: "Client Onboarding Masterclass",
            category: "Course",
            summary:
              "Everything a new client team needs in one day, with your own account lead.",
            description:
              "A full day with your account lead and two specialists. We cover how requests are raised, how work is prioritised, where the numbers live, and who to call when something is urgent. Each team leaves with a written ways-of-working agreement signed off by both sides.",
            format: "in-person" as const,
            startTime: new Date(2027, 0, 22, 9, 30).getTime(),
            endTime: new Date(2027, 0, 22, 15, 30).getTime(),
            venue: "Exchange Hall, Manchester",
            host: "Client Services",
            capacity: 90,
            seatsTaken: 62,
            price: 42000,
          },
          {
            title: "Quarterly Planning Clinic",
            category: "Clinic",
            summary:
              "Bring your next quarter and leave with a plan that has dates on it.",
            description:
              "A two-and-a-half hour clinic for client planning leads. Bring the quarter you are about to commit to; we pressure-test the sequencing, the dependencies and the dates, then write the plan up before you leave the room.",
            format: "in-person" as const,
            startTime: new Date(2027, 0, 23, 10, 0).getTime(),
            endTime: new Date(2027, 0, 23, 12, 30).getTime(),
            venue: "Room 2A, Meridian Exchange",
            host: "Client Services",
            capacity: 30,
            seatsTaken: 27,
            price: 15000,
          },
        ],
      },
    ];

    for (const programme of programmes) {
      const { events, ...fields } = programme;
      const festId = await ctx.db.insert("fests", {
        ...fields,
        status: "published",
        showcase: true,
        showcaseVersion: SHOWCASE_VERSION,
        createdAt: now,
      });
      for (const event of events) {
        await ctx.db.insert("events", {
          ...event,
          festId,
          slug: event.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
          showcase: true,
          createdAt: now,
        });
      }
    }

    return { seeded: true as const, replaced: stale.length };
  },
});
