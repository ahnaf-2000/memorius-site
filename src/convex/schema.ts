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

/**
 * A place on a guest list. `declined` is the organizer's own answer — a
 * request they could not confirm — and is deliberately not the same as a
 * cancellation the customer chose.
 */
export const bookingStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("waitlisted"),
  v.literal("cancelled"),
  v.literal("declined"),
);
export type BookingStatus = Infer<typeof bookingStatusValidator>;

/**
 * Who a participant is on the guest list, chosen when they book and adjustable
 * by the organizer afterwards. It is what makes "show me the students" a
 * question the console can answer.
 */
export const participantCategoryValidator = v.union(
  v.literal("delegate"),
  v.literal("student"),
  v.literal("speaker"),
  v.literal("press"),
  v.literal("volunteer"),
  v.literal("guest"),
  v.literal("staff"),
);
export type ParticipantCategory = Infer<typeof participantCategoryValidator>;

/**
 * What a collaborator may do on someone else's programme.
 *
 * manager  everything the owner can do, except delete the programme or change
 *          who else collaborates on it
 * editor   events, announcements, email wording and the guest list
 * viewer   read only: the guest list and the analytics, nothing that writes
 */
export const collaboratorRoleValidator = v.union(
  v.literal("manager"),
  v.literal("editor"),
  v.literal("viewer"),
);
export type CollaboratorRole = Infer<typeof collaboratorRoleValidator>;

export const collaboratorStatusValidator = v.union(
  v.literal("invited"),
  v.literal("active"),
  v.literal("revoked"),
);
export type CollaboratorStatus = Infer<typeof collaboratorStatusValidator>;

/**
 * The wording an organizer can rewrite on the email a customer gets after
 * booking. Every field is optional: absent means the product's own sentence.
 */
export const emailTemplateValidator = v.object({
  subject: v.optional(v.string()),
  heading: v.optional(v.string()),
  intro: v.optional(v.string()),
  closing: v.optional(v.string()),
});
export type EmailTemplate = Infer<typeof emailTemplateValidator>;

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

/** A promotion takes a percentage off, or a fixed sum. */
export const campaignKindValidator = v.union(
  v.literal("percent"),
  v.literal("amount"),
);
export type CampaignKind = Infer<typeof campaignKindValidator>;

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
      /**
       * What releasing a place late costs. Kept on the programme so a whole
       * season shares one policy, and overridable per event below.
       */
      cancellationFee: v.optional(v.number()), // minor units, base currency
      /** Free to release until this many hours before the event starts. */
      cancellationWindowHours: v.optional(v.number()),
      /** The organizer's own wording for the post-booking email. */
      emailTemplate: v.optional(emailTemplateValidator),
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
      price: v.number(), // minor units; 0 means no charge, and 0 is every event
      registrationClosesAt: v.optional(v.number()),
      /** Who may attend. Absent means open to everyone. */
      eligibility: v.optional(v.string()),
      /** The headline guest, if the event has one. */
      chiefGuest: v.optional(v.string()),
      /** Everyone else named on the bill, in the order the organizer set. */
      specialGuests: v.optional(v.array(v.string())),
      /** The organizer's own note for attendees — printed as None when absent. */
      organizerNotes: v.optional(v.string()),
      /** A cancellation policy for this one event, overriding the programme. */
      cancellationFee: v.optional(v.number()),
      cancellationWindowHours: v.optional(v.number()),
      /** Everything announced after publication, newest first. */
      announcements: v.optional(
        v.array(
          v.object({
            title: v.string(),
            body: v.string(),
            at: v.number(),
            /** Guests emailed when it was posted, and when. */
            emailed: v.optional(v.number()),
            emailedAt: v.optional(v.number()),
          }),
        ),
      ),
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
      promoCode: v.optional(v.string()), // campaign code applied, if any
      discount: v.optional(v.number()), // minor units taken off by the code
      /** Who the participant is on this guest list. */
      participantCategory: v.optional(participantCategoryValidator),
      /** The organizer's own decision, with the note they attached to it. */
      decidedAt: v.optional(v.number()),
      decisionNote: v.optional(v.string()),
      /** Recorded when a place is released after the free window shuts. */
      cancellationFee: v.optional(v.number()),
      /** The door roster: who actually arrived, and who marked them in. */
      checkedInAt: v.optional(v.number()),
      checkedInBy: v.optional(v.id("users")),
      reference: v.string(), // booking reference shown to the customer
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_user", ["userId"])
      .index("by_fest", ["festId"])
      .index("by_event_user", ["eventId", "userId"]),

    /**
     * Someone an organizer has asked to help run a programme.
     *
     * Kept beside the programme rather than on the user, because access is a
     * property of the relationship: the same account can be a manager on one
     * season and a viewer on another, and revoking one leaves the other alone.
     */
    collaborators: defineTable({
      festId: v.id("fests"),
      email: v.string(), // folded to lower case; the invite is matched on it
      name: v.optional(v.string()),
      role: collaboratorRoleValidator,
      status: collaboratorStatusValidator,
      invitedBy: v.id("users"),
      userId: v.optional(v.id("users")), // set once they accept
      invitedAt: v.number(),
      respondedAt: v.optional(v.number()),
    })
      .index("by_fest", ["festId"])
      .index("by_email", ["email"])
      .index("by_user", ["userId"]),

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
      promoCode: v.optional(v.string()), // campaign code applied, if any
      discount: v.optional(v.number()), // minor units taken off by the code
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

    /**
     * A promotion in flight: a code that takes money off a place or a shop
     * order, inside a window, optionally capped by how many times it may be
     * used. A campaign sits on a programme, or on one event inside it.
     */
    campaigns: defineTable({
      festId: v.id("fests"),
      eventId: v.optional(v.id("events")),
      code: v.string(), // stored uppercase
      title: v.string(),
      blurb: v.optional(v.string()),
      kind: campaignKindValidator,
      value: v.number(), // percent when kind is percent, minor units otherwise
      startsAt: v.number(),
      endsAt: v.number(),
      maxUses: v.optional(v.number()),
      uses: v.number(),
      active: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_fest", ["festId"])
      .index("by_event", ["eventId"])
      .index("by_code", ["code"]),

    /**
     * One remembered answer from the assistant, keyed by the question plus a
     * signature of the catalogue it was written from, so a repeated question
     * costs nothing and a stale price is never repeated back.
     */
    assistantCache: defineTable({
      key: v.string(),
      reply: v.string(),
      provider: v.string(),
      createdAt: v.number(),
    }).index("by_key", ["key"]),

    /** A note from the contact page, kept with the reference we quote back. */
    messages: defineTable({
      name: v.string(),
      email: v.string(),
      topic: v.string(),
      subject: v.optional(v.string()),
      body: v.string(),
      reference: v.string(),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
