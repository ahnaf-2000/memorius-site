import {
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameYear,
} from "date-fns";
import { BASE_CURRENCY, formatLocalPrice } from "./pricing";
import type {
  BookingView,
  EventView,
  PaymentMethod,
  PaymentStatus,
  SeatState,
} from "./types";

/**
 * Prices are held in minor units of the base currency and quoted in the
 * visitor's own market, which is why every amount goes through this one call.
 */
export const CURRENCY = BASE_CURRENCY;

export function formatMoney(minorUnits: number) {
  return formatLocalPrice(minorUnits);
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  "on-site": "On site",
  bkash: "bKash",
  nagad: "Nagad",
  "google-pay": "Google Pay",
  paypal: "PayPal",
};

export function paymentMethodLabel(method: PaymentMethod) {
  return METHOD_LABEL[method];
}

/** The methods a customer can choose at checkout, in the order we show them. */
export const PAYMENT_METHODS: PaymentMethod[] = [
  "bkash",
  "nagad",
  "google-pay",
  "paypal",
  "card",
  "on-site",
];

/** "No charge" reads better than "$0" on a public page. */
export function priceLabel(minorUnits: number) {
  return minorUnits === 0 ? "No charge" : formatMoney(minorUnits);
}

/**
 * Status colours are tokens, not fixed hues, so the colour-blind palette can
 * swap green for blue without touching a single component.
 */
export const seatTone: Record<SeatState, string> = {
  open: "tone-open",
  few: "tone-few",
  full: "tone-neutral",
  closed: "tone-neutral",
  past: "tone-muted",
};

export const paymentTone: Record<PaymentStatus, string> = {
  paid: "tone-open",
  due: "tone-few",
  waived: "tone-muted",
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
