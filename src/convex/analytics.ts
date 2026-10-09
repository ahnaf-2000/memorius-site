import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireUserId } from "./model";

/**
 * The organizer's numbers.
 *
 * Everything here is counted from the rows themselves — no running totals are
 * stored, so a statistic can never be a remembered lie. One read builds the
 * whole panel: the programmes this account runs or helps run, their events, and
 * every booking on them. At the size a season reaches this is a handful of
 * indexed reads, and the alternative (five queries, five round trips, five
 * chances to disagree) is worse.
 */

const DAY = 24 * 60 * 60 * 1000;

/** The fourteen days ending today, oldest first, in the reader's own clock. */
function bookingSeries(bookings: Doc<"registrations">[], now: number) {
  const start = new Date(now - 13 * DAY);
  start.setHours(0, 0, 0, 0);
  const buckets = new Map<number, number>();
  for (let i = 0; i < 14; i += 1) buckets.set(start.getTime() + i * DAY, 0);

  for (const booking of bookings) {
    const day = new Date(booking.createdAt);
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([at, count]) => ({ at, count }));
}

export const overview = query({
  args: { festId: v.optional(v.id("fests")) },
  handler: async (ctx, { festId }) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (userId === null) return null;

    const owned = await ctx.db
      .query("fests")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const links = await ctx.db
      .query("collaborators")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const shared = (
      await Promise.all(
        links
          .filter((link) => link.status === "active")
          .map((link) => ctx.db.get(link.festId)),
      )
    ).filter((fest): fest is Doc<"fests"> => fest !== null);

    const every = [...owned, ...shared];
    const scope =
      festId === undefined
        ? every
        : every.filter((fest) => fest._id === festId);
    if (festId !== undefined && scope.length === 0) return null;

    const now = Date.now();
    const events = (
      await Promise.all(
        scope.map((fest) =>
          ctx.db
            .query("events")
            .withIndex("by_fest", (q) => q.eq("festId", fest._id))
            .collect(),
        ),
      )
    ).flat();
    const eventById = new Map(events.map((event) => [event._id, event]));

    const bookings = (
      await Promise.all(
        events.map((event) =>
          ctx.db
            .query("registrations")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect(),
        ),
      )
    ).flat();

    const confirmed = bookings.filter((row) => row.status === "confirmed");
    const waitlisted = bookings.filter((row) => row.status === "waitlisted");
    const declined = bookings.filter((row) => row.status === "declined");
    const cancelled = bookings.filter((row) => row.status === "cancelled");
    const checkedIn = confirmed.filter((row) => row.checkedInAt !== undefined);

    const capacity = events.reduce((sum, event) => sum + event.capacity, 0);
    const taken = events.reduce((sum, event) => sum + event.seatsTaken, 0);

    /** Every participant category, including the ones nobody chose. */
    const categoryCounts = new Map<string, number>();
    for (const row of bookings) {
      const key = row.participantCategory ?? "unspecified";
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }

    const byProgramme = scope.map((fest) => {
      const own = events.filter((event) => event.festId === fest._id);
      const seats = own.reduce((sum, event) => sum + event.seatsTaken, 0);
      const places = own.reduce((sum, event) => sum + event.capacity, 0);
      const rows = bookings.filter((row) =>
        own.some((event) => event._id === row.eventId),
      );
      return {
        festId: fest._id,
        name: fest.name,
        organization: fest.organization,
        slug: fest.slug,
        events: own.length,
        seatsTaken: seats,
        capacity: places,
        bookings: rows.filter(
          (row) => row.status !== "cancelled" && row.status !== "declined",
        ).length,
        fill: places === 0 ? 0 : Math.round((seats / places) * 100),
      };
    });

    const byCategory = Array.from(
      events.reduce((map, event) => {
        const row = map.get(event.category) ?? {
          category: event.category,
          events: 0,
          seatsTaken: 0,
          capacity: 0,
        };
        row.events += 1;
        row.seatsTaken += event.seatsTaken;
        row.capacity += event.capacity;
        map.set(event.category, row);
        return map;
      }, new Map<string, { category: string; events: number; seatsTaken: number; capacity: number }>()),
    )
      .map(([, row]) => row)
      .sort((a, b) => b.seatsTaken - a.seatsTaken);

    const rows = events
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .map((event) => {
        const own = bookings.filter((row) => row.eventId === event._id);
        const live = own.filter(
          (row) => row.status !== "cancelled" && row.status !== "declined",
        );
        const confirmedHere = own.filter((row) => row.status === "confirmed");
        const releasedLate = own.filter(
          (row) => row.status === "cancelled" && (row.cancellationFee ?? 0) > 0,
        );
        return {
          eventId: event._id,
          festId: event.festId,
          title: event.title,
          slug: event.slug,
          category: event.category,
          startTime: event.startTime,
          capacity: event.capacity,
          seatsTaken: event.seatsTaken,
          remaining: Math.max(0, event.capacity - event.seatsTaken),
          confirmed: confirmedHere.length,
          waitlisted: own.filter((row) => row.status === "waitlisted").length,
          declined: own.filter((row) => row.status === "declined").length,
          cancelled: own.filter((row) => row.status === "cancelled").length,
          checkedIn: confirmedHere.filter((row) => row.checkedInAt !== undefined)
            .length,
          lateReleases: releasedLate.length,
          releaseFeeRecorded: releasedLate.reduce(
            (sum, row) => sum + (row.cancellationFee ?? 0),
            0,
          ),
          bookings: live.length,
          fill:
            event.capacity === 0
              ? 0
              : Math.round((event.seatsTaken / event.capacity) * 100),
          upcoming: event.startTime > now,
          announcements: (event.announcements ?? []).length,
        };
      });

    const busiest = rows
      .filter((row) => row.upcoming)
      .sort((a, b) => b.fill - a.fill)[0];

    return {
      totals: {
        programmes: scope.length,
        events: events.length,
        upcoming: events.filter((event) => event.startTime > now).length,
        bookings: bookings.length,
        confirmed: confirmed.length,
        waitlisted: waitlisted.length,
        declined: declined.length,
        cancelled: cancelled.length,
        checkedIn: checkedIn.length,
        capacity,
        seatsTaken: taken,
        fill: capacity === 0 ? 0 : Math.round((taken / capacity) * 100),
        releaseRate:
          bookings.length === 0
            ? 0
            : Math.round((cancelled.length / bookings.length) * 100),
        attendanceRate:
          confirmed.length === 0
            ? 0
            : Math.round((checkedIn.length / confirmed.length) * 100),
        awaitingDecision: waitlisted.length,
        announcements: events.reduce(
          (sum, event) => sum + (event.announcements ?? []).length,
          0,
        ),
        emailedAnnouncements: events.reduce(
          (sum, event) =>
            sum +
            (event.announcements ?? []).filter(
              (note) => note.emailedAt !== undefined,
            ).length,
          0,
        ),
      },
      series: bookingSeries(bookings, now),
      byProgramme: byProgramme.sort((a, b) => b.seatsTaken - a.seatsTaken),
      byCategory,
      byParticipantCategory: Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      events: rows,
      busiest: busiest ?? null,
      programmes: scope.map((fest) => ({
        _id: fest._id,
        name: fest.name,
        organization: fest.organization,
      })),
    };
  },
});
