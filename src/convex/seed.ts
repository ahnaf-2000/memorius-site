import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

/**
 * Version of the showcase catalogue. Bumping this replaces showcase data left
 * behind by an earlier version — and only showcase data, never a programme a
 * business created itself.
 */
const SHOWCASE_VERSION = 7;

/** What is on sale at every seeded event: merchandise to keep, snacks for the day. */
const SHOP_STOCK = [
  {
    name: "Programme Tote Bag",
    kind: "merchandise" as const,
    description: "Heavyweight cotton, printed with the programme mark.",
    price: 2400,
    stock: 120,
    sold: 34,
  },
  {
    name: "Enamel Pin Set",
    kind: "merchandise" as const,
    description: "Three pins in a printed card sleeve.",
    price: 1200,
    stock: 200,
    sold: 61,
  },
  {
    name: "Notebook & Pen",
    kind: "merchandise" as const,
    description: "A5, dotted pages, hard cover, lies flat.",
    price: 1800,
    stock: 150,
    sold: 47,
  },
  {
    name: "Coffee & Pastry",
    kind: "snack" as const,
    description: "Served from 08:30 at the atrium counter.",
    price: 850,
    stock: 300,
    sold: 128,
  },
  {
    name: "Afternoon Snack Box",
    kind: "snack" as const,
    description: "Fruit, nuts and something sweet for the second session.",
    price: 1100,
    stock: 250,
    sold: 74,
  },
] as const;

/**
 * The detail block on a seeded event: who may attend, who is on stage, the
 * organizer's own note, and anything announced after publication. Kept beside
 * the catalogue rather than inline so the shape of an event stays readable.
 */
const DETAILS: Record<
  string,
  {
    eligibility: string;
    chiefGuest?: string;
    specialGuests?: string[];
    organizerNotes?: string;
    /** Days before the start that booking shuts. Omit for no deadline. */
    closesInDays?: number;
    announcements?: { title: string; body: string; daysAgo: number }[];
  }
> = {
  "supply-chain-resilience-forum": {
    eligibility: "Professionals",
    chiefGuest: "Amelia Sinclair, Chair, Freight Standards Board",
    specialGuests: [
      "Dr. Alastair Whitfield, Meridian Faculty",
      "Priya Raman, Northwind Retail",
      "Tom Achterberg, Vantage Freight",
    ],
    organizerNotes:
      "Lunch and refreshments are included. Bring a laptop if you want to keep your own supplier risk map.",
    closesInDays: 3,
    announcements: [
      {
        title: "Doors open at 08:30",
        body: "Registration is on the ground floor and the first session starts at 09:00 sharp.",
        daysAgo: 6,
      },
      {
        title: "Case review moves to Studio 3",
        body: "The afternoon case review needs the smaller room to keep the group workable.",
        daysAgo: 2,
      },
    ],
  },
  "ai-in-operations-workshop": {
    eligibility: "Professionals",
    specialGuests: ["Dr. Alastair Whitfield, Meridian Faculty"],
    organizerNotes:
      "Twelve workstations are available; bringing your own laptop is recommended.",
    closesInDays: 2,
  },
  "the-next-decade-of-logistics-keynote": {
    eligibility: "Open to everyone",
    chiefGuest: "Dr. Alastair Whitfield",
    specialGuests: ["Halima Yusuf, Arden Logistics"],
    announcements: [
      {
        title: "Seating is unreserved",
        body: "The room holds three hundred. Doors close at 18:00, when the address begins.",
        daysAgo: 1,
      },
    ],
  },
  "operations-networking-dinner": {
    eligibility: "Members only",
    organizerNotes:
      "Seating is assigned in advance — tell us who you would like to sit with when you book.",
    closesInDays: 5,
  },
  "data-strategy-intensive": {
    eligibility: "Professionals",
    chiefGuest: "Priya Raman",
    specialGuests: ["Elena Moretti, Corso Analytics"],
    organizerNotes:
      "Places are limited to sixty so that every table keeps a working ratio of eight to one.",
    closesInDays: 4,
    announcements: [
      {
        title: "Workbook published",
        body: "The strategy template is on its way to your inbox — print it if you prefer paper.",
        daysAgo: 3,
      },
    ],
  },
  "metrics-that-matter": {
    eligibility: "Professionals",
    specialGuests: ["Priya Raman, Northwind Retail"],
    organizerNotes: "Bring your current reporting pack; we work on it directly.",
  },
  "analytics-roundtable": {
    eligibility: "By invitation",
    organizerNotes:
      "No slides and no recording. A short written summary is shared with attendees only.",
    closesInDays: 6,
  },
  "client-onboarding-masterclass": {
    eligibility: "Members only",
    specialGuests: ["Client Services, Meridian Group"],
    closesInDays: 7,
  },
  "quarterly-planning-clinic": {
    eligibility: "Open to everyone",
    organizerNotes:
      "Bring the quarter you are about to commit to; we write the plan up before you leave.",
    closesInDays: 1,
  },
  "open-house-meet-the-team": {
    eligibility: "Open to everyone",
    specialGuests: ["The Meridian client team"],
    organizerNotes:
      "Nothing to prepare and no dress code — come as you are and ask anything.",
  },
};

/** A handful of attendee voices, so every event page opens with a rating. */
const REVIEWS = [
  {
    author: "Priya Raman",
    company: "Northwind Retail",
    rating: 5,
    body: "The most useful day I have spent this year. Every session ended with a decision written down rather than a slide deck.",
    daysAgo: 96,
  },
  {
    author: "Tom Achterberg",
    company: "Vantage Freight",
    rating: 4,
    body: "Strong content and a genuinely well-run room. The afternoon ran slightly long, but the material held up.",
    daysAgo: 74,
  },
  {
    author: "Halima Yusuf",
    company: "Arden Logistics",
    rating: 5,
    body: "Small enough to ask questions, senior enough that the answers mattered. I brought two colleagues the following week.",
    daysAgo: 61,
  },
  {
    author: "Daniel Okafor",
    company: "Meridian Supply",
    rating: 4,
    body: "Practical, unhurried and free of sales pitches. The workbook alone was worth the place.",
    daysAgo: 52,
  },
  {
    author: "Sara Lindqvist",
    company: "Beacon Foods",
    rating: 5,
    body: "I came for one session and stayed for the whole programme. The roundtable was off the record in the best sense.",
    daysAgo: 40,
  },
  {
    author: "Marcus Bell",
    company: "Field & Co",
    rating: 3,
    body: "Good people, good venue. I would have liked more detail on the cost modelling section.",
    daysAgo: 33,
  },
  {
    author: "Yuki Tanaka",
    company: "Kita Manufacturing",
    rating: 5,
    body: "Booking took a minute and the reference worked at the door without a single question. The content was equally reliable.",
    daysAgo: 27,
  },
  {
    author: "Elena Moretti",
    company: "Corso Analytics",
    rating: 4,
    body: "A calm, well-organised event. The catered lunch and the coffee cart were a nice touch.",
    daysAgo: 19,
  },
] as const;

/**
 * Promotions already in flight when the catalogue is first opened, so the
 * campaign surfaces have something real to show.
 */
const CAMPAIGNS = [
  {
    festSlug: "operations-summit-2026",
    eventSlug: null,
    code: "EARLYBIRD",
    title: "Early bird — 15% off the summit shop",
    blurb:
      "The summit itself is free to attend. Take 15% off anything you buy from the shop at an Operations Summit event while the early bird runs.",
    kind: "percent" as const,
    value: 15,
    daysFrom: -6,
    daysTo: 24,
    maxUses: 250,
    uses: 43,
  },
  {
    festSlug: "data-leadership-2026",
    eventSlug: "data-strategy-intensive",
    code: "TEAM25",
    title: "Send the team — 25% off the shop",
    blurb:
      "Places at the Data Strategy Intensive cost nothing. This takes a quarter off anything you buy from its shop.",
    kind: "percent" as const,
    value: 25,
    daysFrom: -3,
    daysTo: 30,
    maxUses: 120,
    uses: 17,
  },
  {
    festSlug: "client-academy-2027",
    eventSlug: null,
    code: "MANCHESTER75",
    title: "Manchester launch — a fixed credit",
    blurb:
      "A credit towards anything in the shop at either Client Academy day, while the launch offer lasts.",
    kind: "amount" as const,
    value: 7500,
    daysFrom: -1,
    daysTo: 45,
    maxUses: 80,
    uses: 6,
  },
];

/** Backers per programme, at programme level, in the four published tiers. */
const SPONSORS: Record<
  string,
  {
    company: string;
    contact: string;
    email: string;
    tier: "community" | "silver" | "gold" | "lead";
    amount: number;
    message: string;
    method: "card" | "on-site" | "bkash" | "nagad" | "google-pay" | "paypal";
    status: "pledged" | "confirmed" | "paid";
    daysAgo: number;
  }[]
> = {
  "operations-summit-2026": [
    {
      company: "Vantage Freight",
      contact: "Tom Achterberg",
      email: "tom@vantagefreight.example",
      tier: "lead",
      amount: 1_000_000,
      message: "Glad to back the summit again this year — the operations room is where our industry actually talks.",
      method: "paypal",
      status: "paid",
      daysAgo: 88,
    },
    {
      company: "Arden Logistics",
      contact: "Halima Yusuf",
      email: "halima@ardenlogistics.example",
      tier: "gold",
      amount: 400_000,
      message: "Supporting the workshop stream, with six places for our team.",
      method: "card",
      status: "confirmed",
      daysAgo: 46,
    },
    {
      company: "Brightline Couriers",
      contact: "Ada Mensah",
      email: "ada@brightline.example",
      tier: "community",
      amount: 50_000,
      message: "Happy to cover the refreshments cart.",
      method: "bkash",
      status: "pledged",
      daysAgo: 9,
    },
  ],
  "data-leadership-2026": [
    {
      company: "Corso Analytics",
      contact: "Elena Moretti",
      email: "elena@corsoanalytics.example",
      tier: "gold",
      amount: 400_000,
      message: "We would like to sponsor the metrics workshop.",
      method: "google-pay",
      status: "paid",
      daysAgo: 71,
    },
    {
      company: "Northwind Retail",
      contact: "Priya Raman",
      email: "priya@northwind.example",
      tier: "silver",
      amount: 150_000,
      message: "Backing the intensive, and sending four of our leads.",
      method: "nagad",
      status: "confirmed",
      daysAgo: 35,
    },
  ],
  "client-academy-2027": [
    {
      company: "Meridian Supply",
      contact: "Daniel Okafor",
      email: "daniel@meridiansupply.example",
      tier: "community",
      amount: 75_000,
      message: "A small contribution towards the Manchester days.",
      method: "card",
      status: "pledged",
      daysAgo: 12,
    },
  ],
};

/**
 * Demo catalogue for a business that runs events. Mirrors the real shape of the
 * product: one business running several programmes, each programme holding
 * several events, every event free to attend.
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
        const products = await ctx.db
          .query("products")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();
        for (const product of products) await ctx.db.delete(product._id);
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();
        for (const order of orders) await ctx.db.delete(order._id);
        const reviews = await ctx.db
          .query("reviews")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();
        for (const review of reviews) await ctx.db.delete(review._id);
        await ctx.db.delete(event._id);
      }
      const pledges = await ctx.db
        .query("sponsorships")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();
      for (const pledge of pledges) await ctx.db.delete(pledge._id);
      const campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_fest", (q) => q.eq("festId", fest._id))
        .collect();
      for (const campaign of campaigns) await ctx.db.delete(campaign._id);
      await ctx.db.delete(fest._id);
    }

    const now = Date.now();
    const seededEvents: {
      eventId: Id<"events">;
      festId: Id<"fests">;
      slug: string;
      title: string;
    }[] = [];
    const festIds: Record<string, Id<"fests">> = {};

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
        // A policy the showcase can be read against: two days' notice is free,
        // and a place released after that records $25 against the booking.
        cancellationFee: 2500,
        cancellationWindowHours: 48,
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
            price: 0,
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
            price: 0,
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
            price: 0,
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
            price: 0,
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
            price: 0,
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
            price: 0,
          },
          {
            title: "Open House — Meet the Team",
            category: "Open",
            summary:
              "An open evening with the team that runs your account, for anyone who is curious.",
            description:
              "No agenda and no slides. The client team is in the room for two hours to answer whatever you bring: how work is prioritised, what a retainer covers, who to call at 6pm on a Friday. Half the room usually stays afterwards.\n\nOpen to everyone, whether or not you work with us yet.",
            format: "in-person" as const,
            startTime: new Date(2027, 0, 22, 17, 30).getTime(),
            endTime: new Date(2027, 0, 22, 19, 30).getTime(),
            venue: "Atrium, Meridian Exchange",
            host: "Client Services",
            capacity: 120,
            seatsTaken: 38,
            price: 0,
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
            price: 0,
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
      festIds[programme.slug] = festId;
      for (const event of events) {
        const slug = event.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const detail = DETAILS[slug];
        const eventId = await ctx.db.insert("events", {
          ...event,
          festId,
          slug,
          showcase: true,
          createdAt: now,
          ...(detail === undefined
            ? {}
            : {
                eligibility: detail.eligibility,
                chiefGuest: detail.chiefGuest,
                specialGuests: detail.specialGuests,
                organizerNotes: detail.organizerNotes,
                registrationClosesAt:
                  detail.closesInDays === undefined
                    ? undefined
                    : event.startTime - detail.closesInDays * 86_400_000,
                announcements: detail.announcements?.map((note) => ({
                  title: note.title,
                  body: note.body,
                  at: now - note.daysAgo * 86_400_000,
                })),
              }),
        });
        seededEvents.push({ eventId, festId, slug, title: event.title });
      }
      for (const sponsor of SPONSORS[programme.slug] ?? []) {
        await ctx.db.insert("sponsorships", {
          festId,
          eventId: undefined,
          company: sponsor.company,
          contactName: sponsor.contact,
          email: sponsor.email,
          tier: sponsor.tier,
          amount: sponsor.amount,
          message: sponsor.message,
          paymentMethod: sponsor.method,
          status: sponsor.status,
          createdAt: now - sponsor.daysAgo * 86_400_000,
        });
      }
    }

    // Merchandise and snacks go on sale at every seeded event, so the shop has
    // something real in it the moment the catalogue is first opened.
    for (const [index, event] of seededEvents.entries()) {
      for (const item of SHOP_STOCK) {
        await ctx.db.insert("products", {
          eventId: event.eventId,
          festId: event.festId,
          name: item.name,
          kind: item.kind,
          description: item.description,
          price: item.price,
          stock: item.stock,
          sold: item.sold,
          active: true,
          createdAt: now,
        });
      }

      const picks = [
        REVIEWS[index % REVIEWS.length],
        REVIEWS[(index + 3) % REVIEWS.length],
      ];
      for (const review of picks) {
        await ctx.db.insert("reviews", {
          eventId: event.eventId,
          festId: event.festId,
          userId: undefined,
          authorName: review.author,
          authorCompany: review.company,
          rating: review.rating,
          body: review.body,
          createdAt: now - review.daysAgo * 86_400_000,
        });
      }
    }

    for (const campaign of CAMPAIGNS) {
      const festId = festIds[campaign.festSlug];
      if (festId === undefined) continue;
      const event = seededEvents.find((row) => row.slug === campaign.eventSlug);
      await ctx.db.insert("campaigns", {
        festId,
        eventId: event?.eventId,
        code: campaign.code,
        title: campaign.title,
        blurb: campaign.blurb,
        kind: campaign.kind,
        value: campaign.value,
        startsAt: now + campaign.daysFrom * 86_400_000,
        endsAt: now + campaign.daysTo * 86_400_000,
        maxUses: campaign.maxUses,
        uses: campaign.uses,
        active: true,
        createdAt: now,
      });
    }

    return { seeded: true as const, replaced: stale.length };
  },
});
