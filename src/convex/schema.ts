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
 * Platform shape: Organization -> Fest -> Event -> Registration.
 *
 * An organization (the account that owns a fest) hosts many fests, each fest
 * holds many events, and a registration always belongs to exactly one event.
 * Keeping the fest id on the registration lets organizers read a whole
 * festival's sign-ups without walking every event.
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

export const registrationStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("waitlisted"),
  v.literal("cancelled"),
);
export type RegistrationStatus = Infer<typeof registrationStatusValidator>;

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
      headline: v.optional(v.string()), // short role / company shown on the profile
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /** A festival: a dated container of events, owned by one organization. */
    fests: defineTable({
      organization: v.string(), // e.g. "DRMC IT Club"
      name: v.string(),
      slug: v.string(),
      summary: v.optional(v.string()),
      description: v.optional(v.string()),
      venue: v.optional(v.string()),
      startDate: v.number(), // ms epoch
      endDate: v.optional(v.number()),
      status: festStatusValidator,
      ownerId: v.optional(v.id("users")), // absent for the read-only showcase fests
      showcase: v.optional(v.boolean()), // seeded example data
      createdAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_start", ["startDate"])
      .index("by_owner", ["ownerId"]),

    /** An event inside a fest — the thing people actually register for. */
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
      seatsTaken: v.number(), // kept in step with registrations on write
      fee: v.optional(v.string()),
      registrationClosesAt: v.optional(v.number()),
      showcase: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_fest", ["festId"])
      .index("by_slug", ["slug"])
      .index("by_start", ["startTime"]),

    /** One person's place at one event. */
    registrations: defineTable({
      eventId: v.id("events"),
      festId: v.id("fests"),
      userId: v.id("users"),
      fullName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      organization: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: registrationStatusValidator,
      reference: v.string(), // short confirmation code shown to the attendee
      createdAt: v.number(),
    })
      .index("by_event", ["eventId"])
      .index("by_user", ["userId"])
      .index("by_fest", ["festId"])
      .index("by_event_user", ["eventId", "userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
