import type { Id } from "@/convex/_generated/dataModel";

/**
 * View models for the data the Convex queries return.
 *
 * These mirror the server mappers so presentation components can take plain
 * props while keeping the document ids branded, which is what lets a component
 * hand an id straight back to a mutation.
 */

export type SeatState = "open" | "few" | "full" | "closed" | "past";
export type FestPhase = "upcoming" | "live" | "past";

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
  fee: string | null;
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

export interface FestView {
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
  phase: FestPhase;
}

export interface FestListItem extends FestView {
  eventCount: number;
  seatsTaken: number;
  capacity: number;
  /** Only the public festival directory computes these. */
  categories?: string[];
}

export interface RegistrationView {
  _id: Id<"registrations">;
  status: "confirmed" | "waitlisted" | "cancelled";
  reference: string;
  createdAt: number;
  fullName: string;
  email: string;
  eventId: Id<"events">;
  event: EventView | null;
  fest: FestView | null;
  upcoming: boolean;
}

export interface AttendeeView {
  _id: Id<"registrations">;
  fullName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  notes: string | null;
  status: "confirmed" | "waitlisted" | "cancelled";
  reference: string;
  createdAt: number;
}
