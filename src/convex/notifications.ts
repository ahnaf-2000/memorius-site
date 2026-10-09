import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { cancellationPolicy } from "./model";
import { OPEN_ELIGIBILITY } from "./taxonomy";

/**
 * Turning a booking into an email.
 *
 * The booking mutation writes the row and schedules this; everything the
 * message quotes — the programme, the deadline, the guests, the announcements —
 * is read here, after the write, so the customer is never told something the
 * record does not say. Sending happens out of band, so a mail provider having a
 * bad afternoon can never cost a customer their place.
 *
 * Times are stored absolutely. They are written into the message in the
 * catalogue's own timezone (EVENT_TIMEZONE, Europe/London by default) rather
 * than the server's, so a 10:00 event is not announced as 04:00.
 */

const TIME_ZONE = process.env.EVENT_TIMEZONE ?? "Europe/London";

function dateAndTime(ms: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    ...options,
  }).format(new Date(ms));
}

/** "Saturday, 14 March 2026" */
export function longDate(ms: number) {
  return dateAndTime(ms, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "10:00" */
function clock(ms: number) {
  return dateAndTime(ms, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * One line for the whole booking: the day, then the hours. An event that runs
 * past midnight — or across days — says so rather than pretending it ends the
 * same afternoon.
 */
export function whenAndTime(start: number, end: number) {
  const sameDay = longDate(start) === longDate(end);
  return sameDay
    ? { when: longDate(start), time: `${clock(start)} – ${clock(end)}` }
    : {
        when: `${longDate(start)} → ${longDate(end)}`,
        time: `Starts ${clock(start)}, ends ${clock(end)}`,
      };
}

/** The deadline, or the reason there is not one. */
function deadlineText(closesAt: number | undefined) {
  if (closesAt === undefined) return "Open until the last place is taken";
  if (closesAt < Date.now()) return "Booking has closed";
  return `${longDate(closesAt)}, ${clock(closesAt)}`;
}

/**
 * The address the links in the message point at.
 *
 * APP_URL is the web app's own origin — the one an organizer sets when the
 * project gets its domain. Without it the links fall back to the public name
 * rather than to CONVEX_SITE_URL, which serves the API and not these pages.
 */
export function appUrl(): string {
  const base =
    process.env.APP_URL ??
    process.env.PUBLIC_SITE_URL ??
    process.env.WEB_URL ??
    "https://memorius.events";
  return base.replace(/\/+$/, "");
}

/**
 * The personalised confirmation for one booking, with its invoice.
 *
 * Called for fresh bookings and for the person promoted off the waiting list,
 * who has waited for exactly this message.
 */
export const bookingConfirmation = internalMutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, { registrationId }) => {
    const booking = await ctx.db.get(registrationId);
    if (booking === null) return null;
    if (booking.status === "cancelled") return null;

    const event = await ctx.db.get(booking.eventId);
    if (event === null) return null;
    const fest = await ctx.db.get(event.festId);

    const { when, time } = whenAndTime(event.startTime, event.endTime);
    const announcements = (event.announcements ?? [])
      .slice()
      .sort((a, b) => b.at - a.at)
      .map((note) => ({
        title: note.title,
        body: note.body,
        at: longDate(note.at),
      }));

    const site = appUrl();
    const policy = cancellationPolicy(event, fest);

    await ctx.scheduler.runAfter(0, internal.mail.sendBookingConfirmation, {
      to: booking.email,
      template: fest?.emailTemplate ?? null,
      participantCategory: booking.participantCategory ?? "guest",
      cancellationFee: policy.fee,
      cancellationWindowHours: policy.hours,
      fullName: booking.fullName,
      reference: booking.reference,
      status: booking.status,
      eventTitle: event.title,
      programmeName: fest?.name ?? "Programme",
      organization: fest?.organization ?? "Memorius",
      when,
      time,
      venue: event.venue,
      category: event.category,
      eligibility: event.eligibility ?? OPEN_ELIGIBILITY,
      deadline: deadlineText(event.registrationClosesAt),
      chiefGuest: event.chiefGuest ?? "None",
      specialGuests: event.specialGuests ?? [],
      organizerNotes: event.organizerNotes ?? "None",
      announcements,
      invoiceUrl: `${site}/dashboard`,
      eventUrl: `${site}/events/${event.slug}`,
    });

    return { scheduled: true as const, reference: booking.reference };
  },
});
