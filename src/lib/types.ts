import type { Id } from "@/convex/_generated/dataModel";

/**
 * View models for the data the Convex queries return.
 *
 * These mirror the server mappers so presentation components can take plain
 * props while keeping the document ids branded, which is what lets a component
 * hand an id straight back to a mutation.
 */

export type SeatState = "open" | "few" | "full" | "closed" | "past";
export type ProgrammePhase = "upcoming" | "live" | "past";
export type PaymentStatus = "paid" | "due" | "waived";
export type PaymentMethod = "card" | "on-site";
export type BookingStatus = "confirmed" | "waitlisted" | "cancelled";

export interface EventView {
  _id: Id<"events">;
  festId: Id<"fests">;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  description: string | null;
  format: "in-person" | "online" | "hybrid";
  startTime: number;
  endTime: number;
  venue: string;
  host: string | null;
  capacity: number;
  seatsTaken: number;
  remaining: number;
  /** Minor units. Zero means no charge. */
  price: number;
  registrationClosesAt: number | null;
  state: SeatState;
  stateLabel: string;
  accepting: boolean;
}

export interface EventListItem extends EventView {
  festName: string;
  festSlug: string;
  organization: string;
}

export interface ProgrammeView {
  _id: Id<"fests">;
  organization: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  venue: string | null;
  startDate: number;
  endDate: number | null;
  status: "draft" | "published" | "archived";
  owned: boolean;
  showcase: boolean;
  phase: ProgrammePhase;
}

export interface ProgrammeListItem extends ProgrammeView {
  eventCount: number;
  seatsTaken: number;
  capacity: number;
  /** Only the public programme directory computes these. */
  categories?: string[];
}

export interface BookingView {
  _id: Id<"registrations">;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  amountPaid: number;
  reference: string;
  createdAt: number;
  fullName: string;
  email: string;
  eventId: Id<"events">;
  event: EventView | null;
  fest: ProgrammeView | null;
  upcoming: boolean;
}

export interface GuestView {
  _id: Id<"registrations">;
  fullName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  notes: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  amountPaid: number;
  reference: string;
  createdAt: number;
}

export interface BusinessBookingView extends GuestView {
  eventTitle: string;
  eventSlug: string;
  eventStart: number;
  price: number;
  programmeName: string;
}

export interface CommentView {
  _id: Id<"comments">;
  eventId: Id<"events">;
  userId: Id<"users">;
  authorName: string;
  authorCompany: string | null;
  body: string;
  attachmentName: string | null;
  /** Resolved from storage when the post is read. */
  attachmentUrl: string | null;
  createdAt: number;
}
