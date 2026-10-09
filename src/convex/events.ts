import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  programmeAccess,
  publicBooking,
  publicEvent,
  requireUserId,
  uniqueSlug,
} from "./model";
import { internal } from "./_generated/api";
import { appUrl } from "./notifications";
import { normalizeCategory, normalizeEligibility } from "./taxonomy";

const formatValidator = v.union(
  v.literal("in-person"),
  v.literal("online"),
  v.literal("hybrid"),
);

/** Trim the guest list, drop the blanks and remember nothing was said twice. */
function cleanGuests(names: string[] | undefined): string[] | undefined {
  if (names === undefined) return undefined;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (trimmed.length === 0 || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }
  return cleaned.length === 0 ? undefined : cleaned;
}

/** The whole catalogue in one reactive read, each row carrying its programme. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db.query("events").collect();
    const fests = await ctx.db.query("fests").collect();
    const festById = new Map(fests.map((fest) => [fest._id, fest]));

    return events
      .map((event) => {
        const fest = festById.get(event.festId);
        return {
          // The programme rides along because the cancellation policy lives on
          // it: an event that says nothing inherits the season's answer.
          ...publicEvent(event, now, fest ?? null),
          festName: fest?.name ?? "Unassigned",
          festSlug: fest?.slug ?? "",
          organization: fest?.organization ?? "",
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
  },
});

/** A single event, its programme, and the viewer's own booking if there is one. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (event === null) return null;

    const now = Date.now();
    const fest = await ctx.db.get(event.festId);
    const userId = await requireUserId(ctx).catch(() => null);

    const booking =
      userId === null
        ? null
        : ((await ctx.db
            .query("registrations")
            .withIndex("by_event_user", (q) =>
              q.eq("eventId", event._id).eq("userId", userId),
            )
            .unique()) ?? null);

    const siblings = await ctx.db
      .query("events")
      .withIndex("by_fest", (q) => q.eq("festId", event.festId))
      .collect();

    const commentCount = (
      await ctx.db
        .query("comments")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect()
    ).length;

    return {
      event: publicEvent(event, now, fest),
      fest:
        fest === null
          ? null
          : {
              name: fest.name,
              slug: fest.slug,
              organization: fest.organization,
            },
      viewer: {
        signedIn: userId !== null,
        booking: booking === null ? null : publicBooking(booking),
      },
      commentCount,
      alsoInProgramme: siblings
        .filter((sibling) => sibling._id !== event._id)
        .sort((a, b) => a.startTime - b.startTime)
        .map((sibling) => publicEvent(sibling, now, fest))
        .slice(0, 4),
    };
  },
});

/** Every event is free, so the admin console no longer tracks revenue. */
export const organized = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return [];
    const now = Date.now();

    const fests = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const rows = await Promise.all(
      fests.map(async (fest) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_fest", (q) => q.eq("festId", fest._id))
          .collect();
        return Promise.all(
          events.map(async (event) => {
            const bookings = await ctx.db
              .query("registrations")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect();
            const live = bookings.filter((row) => row.status !== "cancelled");
            return {
              ...publicEvent(event, now, fest),
              festName: fest.name,
              festSlug: fest.slug,
              confirmed: live.filter((row) => row.status === "confirmed").length,
              waitlisted: live.filter((row) => row.status === "waitlisted")
                .length,
              cancelled: bookings.length - live.length,
              collected: 0,
              outstanding: 0,
            };
          }),
        );
      }),
    );

    return rows.flat().sort((a, b) => a.startTime - b.startTime);
  },
});

export const create = mutation({
  args: {
    festId: v.id("fests"),
    title: v.string(),
    category: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    format: v.optional(formatValidator),
    startTime: v.number(),
    endTime: v.number(),
    venue: v.string(),
    host: v.optional(v.string()),
    capacity: v.number(),
    registrationClosesAt: v.optional(v.number()),
    eligibility: v.optional(v.string()),
    chiefGuest: v.optional(v.string()),
    specialGuests: v.optional(v.array(v.string())),
    organizerNotes: v.optional(v.string()),
    cancellationFee: v.optional(v.number()),
    cancellationWindowHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // An editor is exactly whoever may put an event on the programme: the owner
    // and the collaborators the owner trusted with it.
    await programmeAccess(ctx, args.festId, "editor");
    if (args.endTime < args.startTime) {
      throw new Error("The end time has to come after the start time.");
    }
    const slug = await uniqueSlug(ctx, "events", args.title);
    const id = await ctx.db.insert("events", {
      festId: args.festId,
      title: args.title.trim(),
      slug,
      category: normalizeCategory(args.category),
      summary: args.summary?.trim() || undefined,
      description: args.description?.trim() || undefined,
      format: args.format ?? "in-person",
      startTime: args.startTime,
      endTime: args.endTime,
      venue: args.venue.trim(),
      host: args.host?.trim() || undefined,
      capacity: Math.max(1, Math.round(args.capacity)),
      seatsTaken: 0,
      // Every event on the platform is free of charge.
      price: 0,
      registrationClosesAt: args.registrationClosesAt,
      eligibility: normalizeEligibility(args.eligibility ?? ""),
      chiefGuest: args.chiefGuest?.trim() || undefined,
      specialGuests: cleanGuests(args.specialGuests),
      organizerNotes: args.organizerNotes?.trim() || undefined,
      cancellationFee:
        args.cancellationFee === undefined
          ? undefined
          : Math.max(0, Math.round(args.cancellationFee)),
      cancellationWindowHours:
        args.cancellationWindowHours === undefined
          ? undefined
          : Math.min(720, Math.max(0, Math.round(args.cancellationWindowHours))),
      createdAt: Date.now(),
    });
    return { id, slug };
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    format: v.optional(formatValidator),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    venue: v.optional(v.string()),
    host: v.optional(v.string()),
    capacity: v.optional(v.number()),
    registrationClosesAt: v.optional(v.number()),
    eligibility: v.optional(v.string()),
    chiefGuest: v.optional(v.string()),
    specialGuests: v.optional(v.array(v.string())),
    organizerNotes: v.optional(v.string()),
    /** A cancellation policy for this event alone, overriding the programme. */
    cancellationFee: v.optional(v.number()),
    cancellationWindowHours: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const event = await ctx.db.get(id);
    if (event === null) throw new Error("That event no longer exists.");
    await programmeAccess(ctx, event.festId, "editor");
    if (patch.endTime !== undefined && patch.startTime !== undefined && patch.endTime < patch.startTime) {
      throw new Error("The end time has to come after the start time.");
    }
    await ctx.db.patch(id, {
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.category !== undefined
        ? { category: normalizeCategory(patch.category) }
        : {}),
      ...(patch.summary !== undefined
        ? { summary: patch.summary.trim() || undefined }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description.trim() || undefined }
        : {}),
      ...(patch.format !== undefined ? { format: patch.format } : {}),
      ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
      ...(patch.endTime !== undefined ? { endTime: patch.endTime } : {}),
      ...(patch.venue !== undefined ? { venue: patch.venue.trim() } : {}),
      ...(patch.host !== undefined
        ? { host: patch.host.trim() || undefined }
        : {}),
      ...(patch.capacity !== undefined
        ? { capacity: Math.max(1, Math.round(patch.capacity)) }
        : {}),
      ...(patch.registrationClosesAt !== undefined
        ? { registrationClosesAt: patch.registrationClosesAt }
        : {}),
      ...(patch.eligibility !== undefined
        ? { eligibility: normalizeEligibility(patch.eligibility) }
        : {}),
      ...(patch.chiefGuest !== undefined
        ? { chiefGuest: patch.chiefGuest.trim() || undefined }
        : {}),
      ...(patch.specialGuests !== undefined
        ? { specialGuests: cleanGuests(patch.specialGuests) }
        : {}),
      ...(patch.organizerNotes !== undefined
        ? { organizerNotes: patch.organizerNotes.trim() || undefined }
        : {}),
      ...(patch.cancellationFee !== undefined
        ? { cancellationFee: Math.max(0, Math.round(patch.cancellationFee)) }
        : {}),
      ...(patch.cancellationWindowHours !== undefined
        ? {
            cancellationWindowHours: Math.min(
              720,
              Math.max(0, Math.round(patch.cancellationWindowHours)),
            ),
          }
        : {}),
    });
    return { slug: event.slug };
  },
});

/**
 * Post an announcement on an event that is already published.
 *
 * This is the one detail that keeps moving after publication — a room change,
 * a start time, a guest who can no longer come — so it is the one detail the
 * organizer can add to without rewriting anything already promised. The event
 * page shows it at once, and it travels with every confirmation sent after it
 * is posted.
 */
export const announce = mutation({
  args: { id: v.id("events"), title: v.string(), body: v.string() },
  handler: async (ctx, { id, title, body }) => {
    const event = await ctx.db.get(id);
    if (event === null) throw new Error("That event no longer exists.");
    await programmeAccess(ctx, event.festId, "editor");

    const cleanTitle = title.trim().slice(0, 120);
    const cleanBody = body.trim().slice(0, 1200);
    if (cleanTitle.length < 3) {
      throw new Error("Give the announcement a short heading.");
    }
    if (cleanBody.length < 8) {
      throw new Error("Add a sentence about what has changed.");
    }

    // The newest twenty are kept, so a long-running event cannot grow a
    // document that will not fit in one read.
    const announcements = [
      ...(event.announcements ?? []),
      { title: cleanTitle, body: cleanBody, at: Date.now() },
    ].slice(-20);

    await ctx.db.patch(id, { announcements });
    return { posted: announcements.length };
  },
});

/** Take one back down — it was posted in error, or it no longer applies. */
export const retract = mutation({
  args: { id: v.id("events"), at: v.number() },
  handler: async (ctx, { id, at }) => {
    const event = await ctx.db.get(id);
    if (event === null) throw new Error("That event no longer exists.");
    await programmeAccess(ctx, event.festId, "editor");

    const announcements = (event.announcements ?? []).filter(
      (note) => note.at !== at,
    );
    await ctx.db.patch(id, { announcements });
    return { remaining: announcements.length };
  },
});

/**
 * Send one announcement to everyone holding a place.
 *
 * The announcement is already on the event page; this is the organizer saying
 * it out loud as well. It is stamped when it goes out, so nobody is emailed the
 * same news twice — a second attempt is refused rather than repeated. The send
 * is capped at two hundred guests per announcement: past that, a season needs a
 * mailing list rather than a button.
 */
export const broadcast = mutation({
  args: { id: v.id("events"), at: v.number() },
  handler: async (ctx, { id, at }) => {
    const event = await ctx.db.get(id);
    if (event === null) throw new Error("That event no longer exists.");
    const access = await programmeAccess(ctx, event.festId, "editor");

    const note = (event.announcements ?? []).find((row) => row.at === at);
    if (note === undefined) {
      throw new Error("That announcement is no longer on the event.");
    }
    if (note.emailedAt !== undefined) {
      throw new Error("That announcement has already been emailed.");
    }

    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", id))
      .collect();
    const recipients = rows.filter(
      (row) => row.status === "confirmed" || row.status === "waitlisted",
    );
    if (recipients.length === 0) {
      throw new Error("Nobody holds a place yet, so there is nobody to tell.");
    }

    const sentAt = Date.now();
    const reach = Math.min(recipients.length, 200);
    await ctx.db.patch(id, {
      announcements: (event.announcements ?? []).map((row) =>
        row.at === at ? { ...row, emailed: reach, emailedAt: sentAt } : row,
      ),
    });

    for (const recipient of recipients.slice(0, 200)) {
      await ctx.scheduler.runAfter(0, internal.mail.sendAnnouncementBroadcast, {
        to: recipient.email,
        fullName: recipient.fullName,
        reference: recipient.reference,
        eventTitle: event.title,
        title: note.title,
        body: note.body,
        organization: access.fest.organization,
        programmeName: access.fest.name,
        eventUrl: `${appUrl()}/events/${event.slug}`,
      });
    }

    return { recipients: reach, skipped: recipients.length - reach };
  },
});

/** Remove an event, its bookings and its discussion. */
export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (event === null) return { removed: false };
    // Deleting takes the bookings with it, so it needs a manager.
    await programmeAccess(ctx, event.festId, "manager");
    const bookings = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", id))
      .collect();
    for (const booking of bookings) await ctx.db.delete(booking._id);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", id))
      .collect();
    for (const comment of comments) await ctx.db.delete(comment._id);
    await ctx.db.delete(id);
    return { removed: true };
  },
});
