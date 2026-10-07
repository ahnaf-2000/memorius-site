import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/**
 * Platform shape, in the order the product explains it:
 * Business -> Programme -> Event -> Booking.
 *
 * A business account runs programmes; a programme is a named season holding
 * events; an event is what a customer books and pays for. Keeping the
 * programme id on the booking lets the admin console read a whole season of
 * bookings without walking each event.
 */
export const festStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);
export type FestStatus = Infer<typeof festStatusValidator>;

export const eventFormatValidator = v.union(
  v.literal("in-person"),
  v.literal("online"),
  v.literal("hybrid"),
);
export type EventFormat = Infer<typeof eventFormatValidator>;

export const bookingStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("waitlisted"),
  v.literal("cancelled"),
);
export type BookingStatus = Infer<typeof bookingStatusValidator>;

export const paymentStatusValidator = v.union(
  v.literal("paid"),
  v.literal("due"),
  v.literal("waived"),
);
export type PaymentStatus = Infer<typeof paymentStatusValidator>;

export const paymentMethodValidator = v.union(
  v.literal("card"),
  v.literal("on-site"),
  v.literal("bkash"),
  v.literal("nagad"),
  v.literal("google-pay"),
  v.literal("paypal"),
);
export type PaymentMethod = Infer<typeof paymentMethodValidator>;

/** How someone uses the product: running it, attending it, or funding it. */
export const personaValidator = v.union(
  v.literal("organizer"),
  v.literal("participant"),
  v.literal("sponsor"),
);
export type Persona = Infer<typeof personaValidator>;

/** Merchandise is kept and worn; snacks are consumed on the day. */
export const productKindValidator = v.union(
  v.literal("merchandise"),
  v.literal("snack"),
);
export type ProductKind = Infer<typeof productKindValidator>;

export const orderStatusValidator = v.union(
  v.literal("placed"),
  v.literal("ready"),
  v.literal("collected"),
  v.literal("cancelled"),
);
export type OrderStatus = Infer<typeof orderStatusValidator>;

export const sponsorshipTierValidator = v.union(
  v.literal("community"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("lead"),
);
export type SponsorshipTier = Infer<typeof sponsorshipTierValidator>;

export const sponsorshipStatusValidator = v.union(
  v.literal("pledged"),
  v.literal("confirmed"),
  v.literal("paid"),
);
export type SponsorshipStatus = Infer<typeof sponsorshipStatusValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      company: v.optional(v.string()), // business the customer books on behalf of
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /** A programme: a named season of events, owned by one business account. */
    fests: defineTable({
      organization: v.string(), // the business that runs the programme
      name: v.string(),
      slug: v.string(),
      summary: v.optional(v.string()),
      description: v.optional(v.string()),
      venue: v.optional(v.string()),
      startDate: v.number(), // ms epoch
      endDate: v.optional(v.number()),
      status: festStatusValidator,
      ownerId: v.optional(v.id("users")), // absent for the read-only showcase programmes
      showcase: v.optional(v.boolean()), // seeded example data
      showcaseVersion: v.optional(v.number()), // lets the seed replace older showcase data
      createdAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_start", ["startDate"])
      .index("by_owner", ["ownerId"]),

    /** An event inside a programme — the thing customers book. */
    events: defineTable({
      festId: v.id("fests"),
      title: v.string(),
      slug: v.string(),
      category: v.string(),
      summary: v.optional(v.string()),
      description: v.optional(v.string()),
      format: eventFormatValidator,
      startTime: v.number(),
      endTime: v.number(),
      venue: v.string(),
      host: v.optional(v.string()),
      capacity: v.number(),
      seatsTaken: v.number(), // kept in step with bookings on write
      price: v.number(), // minor units; 0 means no charge
      registrationClosesAt: v.optional(v.number()),
      showcase: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_fest", ["festId"])
      .index("by_slug", ["slug"])
      .index("by_start", ["startTime"]),

    /** One customer's place at one event, with its payment record. */
    registrations: defineTable({
      eventId: v.id("events"),
      festId: v.id("fests"),
      userId: v.id("users"),
      fullName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      organization: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: bookingStatusValidator,
      paymentStatus: paymentStatusValidator,
      paymentMethod: v.optional(paymentMethodValidator),
      amountPaid: v.number(), // minor units actually settled
      reference: v.string(), // booking reference shown to the customer
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_user", ["userId"])
      .index("by_fest", ["festId"])
      .index("by_event_user", ["eventId", "userId"]),

    /** Customer posts on an event: a question, a note, a comment, a file. */
    comments: defineTable({
      eventId: v.id("events"),
      userId: v.id("users"),
      authorName: v.string(),
      authorCompany: v.optional(v.string()),
      body: v.string(),
      attachmentId: v.optional(v.id("_storage")), // content the customer uploaded
      attachmentName: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_user", ["userId"]),

    /**
     * What one account uses the product for, plus where it trades from. The
     * persona decides which half of the console opens first; the country
     * decides which currency prices are quoted in.
     */
    profiles: defineTable({
      userId: v.id("users"),
      persona: personaValidator,
      country: v.string(),
      currency: v.string(),
      // Where an organizer wants the money to land.
      payoutMethod: v.optional(paymentMethodValidator),
      payoutDetails: v.optional(v.string()),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    /** Something a customer can buy at an event: merchandise or a snack. */
    products: defineTable({
      eventId: v.id("events"),
      festId: v.id("fests"),
      name: v.string(),
      kind: productKindValidator,
      description: v.optional(v.string()),
      price: v.number(), // minor units, base currency
      stock: v.number(),
      sold: v.number(),
      active: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_fest", ["festId"]),

    /** A shop basket, checked out in one of the accepted payment methods. */
    orders: defineTable({
      eventId: v.id("events"),
      festId: v.id("fests"),
      userId: v.id("users"),
      items: v.array(
        v.object({
          productId: v.id("products"),
          name: v.string(),
          kind: productKindValidator,
          unitPrice: v.number(),
          quantity: v.number(),
        }),
      ),
      subtotal: v.number(),
      country: v.string(), // the market the order was placed from
      paymentMethod: paymentMethodValidator,
      paymentStatus: paymentStatusValidator,
      amountPaid: v.number(),
      reference: v.string(),
      fullName: v.string(),
      email: v.string(),
      status: orderStatusValidator,
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_fest", ["festId"])
      .index("by_user", ["userId"]),

    /** Money pledged towards a programme or one of its events. */
    sponsorships: defineTable({
      eventId: v.optional(v.id("events")),
      festId: v.id("fests"),
      userId: v.optional(v.id("users")),
      company: v.string(),
      contactName: v.optional(v.string()),
      email: v.optional(v.string()),
      tier: sponsorshipTierValidator,
      amount: v.number(),
      message: v.optional(v.string()),
      paymentMethod: paymentMethodValidator,
      status: sponsorshipStatusValidator,
      createdAt: v.number(),
    })
      .index("by_fest", ["festId"])
      .index("by_event", ["eventId"])
      .index("by_user", ["userId"]),

    /** One rating and a few lines from someone who attended. */
    reviews: defineTable({
      eventId: v.id("events"),
      festId: v.id("fests"),
      userId: v.optional(v.id("users")),
      authorName: v.string(),
      authorCompany: v.optional(v.string()),
      rating: v.number(), // 1 – 5
      body: v.string(),
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_user", ["userId"])
      .index("by_event_user", ["eventId", "userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
