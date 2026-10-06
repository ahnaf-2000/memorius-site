import {
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameYear,
} from "date-fns";
import type {
  BookingView,
  EventView,
  PaymentStatus,
  SeatState,
} from "./types";

/** Prices are held in minor units and shown in one currency across the product. */
export const CURRENCY = "USD";

export function formatMoney(minorUnits: number) {
  const whole = minorUnits % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(minorUnits / 100);
}

/** "No charge" reads better than "$0" on a public page. */
export function priceLabel(minorUnits: number) {
  return minorUnits === 0 ? "No charge" : formatMoney(minorUnits);
}

/** The one colour allowed to interrupt the monochrome palette: a status dot. */
export const seatTone: Record<SeatState, string> = {
  open: "bg-emerald-600",
  few: "bg-amber-500",
  full: "bg-stone-400",
  closed: "bg-stone-400",
  past: "bg-stone-300",
};

export const paymentTone: Record<PaymentStatus, string> = {
  paid: "bg-emerald-600",
  due: "bg-amber-500",
  waived: "bg-stone-300",
};

export function dayParts(ts: number) {
  return {
    weekday: format(ts, "EEE").toUpperCase(),
    day: format(ts, "d"),
    month: format(ts, "MMM").toUpperCase(),
    year: format(ts, "yyyy"),
  };
}

/** Plain-language availability, used by event rows, cards and the booking rail. */
export function seatSummary(event: EventView) {
  if (event.state === "past") return "Finished";
  if (event.state === "closed") return "Booking closed";
  if (event.state === "full") return "Join the waiting list";
  return `${event.remaining} of ${event.capacity} places available`;
}

/** What the customer owes, or has already settled. */
export function paymentSummary(
  booking: Pick<BookingView, "paymentStatus" | "amountPaid">,
  price: number,
) {
  if (booking.paymentStatus === "waived" || price === 0) return "No charge";
  if (booking.paymentStatus === "paid") {
    return `${formatMoney(booking.amountPaid)} paid`;
  }
  return `${formatMoney(price)} due`;
}

export function formatTime(ts: number) {
  return format(ts, "HH:mm");
}

export function formatTimeRange(start: number, end: number) {
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

/** "Thursday, 12 November 2026" */
export function formatLongDate(ts: number) {
  return format(ts, "EEEE, d MMMM yyyy");
}

/** "12 – 15 November 2026", collapsing shared month and year. */
export function formatDateRange(start: number, end?: number | null) {
  if (end === undefined || end === null || end === start) {
    return format(start, "d MMMM yyyy");
  }
  if (isSameMonth(start, end)) {
    return `${format(start, "d")} – ${format(end, "d MMMM yyyy")}`;
  }
  if (isSameYear(start, end)) {
    return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

/** "Today", "Tomorrow", "In 6 days", then falls back to a date. */
export function relativeDay(ts: number, now = Date.now()) {
  const days = differenceInCalendarDays(ts, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days <= 14) return `In ${days} days`;
  return format(ts, "d MMM yyyy");
}

export function durationLabel(start: number, end: number) {
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Group events into day buckets, keeping chronological order. */
export function groupByDay<T extends { startTime: number }>(items: T[]) {
  const buckets = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of items) {
    const key = format(item.startTime, "yyyy-MM-dd");
    const existing = buckets.get(key);
    if (existing === undefined) {
      buckets.set(key, {
        key,
        label: format(item.startTime, "EEEE, d MMMM"),
        items: [item],
      });
    } else {
      existing.items.push(item);
    }
  }
  return Array.from(buckets.values());
}

/** Value for a <input type="datetime-local">. */
export function toDateTimeInput(ts: number) {
  return format(ts, "yyyy-MM-dd'T'HH:mm");
}

/** Parse a <input type="datetime-local"> value back into epoch ms. */
export function fromDateTimeInput(value: string): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

/**
 * Convex wraps thrown messages in transport noise. Surface the sentence the
 * server actually wrote so a form can show something a person can act on.
 */
export function errorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return (
    raw
      .replace(/^\[?CONVEX[^\]]*\]?\s*/i, "")
      .split("Uncaught Error: ")
      .pop()
      ?.split("Server Error")
      .pop()
      ?.replace(/^\s*Called by client\s*$/i, "")
      .trim() || "Something went wrong. Please try again."
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
