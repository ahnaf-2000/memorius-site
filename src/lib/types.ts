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
export type PaymentMethod =
  | "card"
  | "on-site"
  | "bkash"
  | "nagad"
  | "google-pay"
  | "paypal";
export type Persona = "organizer" | "participant" | "sponsor";
export type ProductKind = "merchandise" | "snack";
export type OrderStatus = "placed" | "ready" | "collected" | "cancelled";
export type SponsorshipTier = "community" | "silver" | "gold" | "lead";
export type SponsorshipStatus = "pledged" | "confirmed" | "paid";
export type BookingStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "declined";

/** Who a participant is on the guest list, as the organizer can filter on. */
export type ParticipantCategory =
  | "delegate"
  | "student"
  | "speaker"
  | "press"
  | "volunteer"
  | "guest"
  | "staff";

/** What a collaborator may do on someone else's programme. */
export type CollaboratorRole = "manager" | "editor" | "viewer";
export type CollaboratorStatus = "invited" | "active" | "revoked";

/** The wording an organizer may rewrite on the post-booking email. */
export interface EmailTemplateView {
  subject?: string;
  heading?: string;
  intro?: string;
  closing?: string;
}

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
  /** Minor units. Zero means no charge — and zero is every event. */
  price: number;
  /** The moment booking shuts, or null when the event stays open until full. */
  registrationClosesAt: number | null;
  /** Who may attend. Never null: an event that says nothing is open. */
  eligibility: string;
  chiefGuest: string | null;
  specialGuests: string[];
  /** The organizer's own note, printed as None when they left none. */
  organizerNotes: string | null;
  /** Newest first, as the organizer published them. */
  announcements: {
    title: string;
    body: string;
    at: number;
    emailed?: number;
    emailedAt?: number;
  }[];
  /** Minor units charged when a place is released after the free window. */
  cancellationFee: number;
  cancellationWindowHours: number;
  /** When releasing a place stops being free, or null when it always is. */
  freeCancellationUntil: number | null;
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
  participantCategory: ParticipantCategory | null;
  decidedAt: number | null;
  decisionNote: string | null;
  cancellationFee: number | null;
  checkedInAt: number | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  amountPaid: number;
  promoCode: string | null;
  discount: number;
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
  participantCategory: ParticipantCategory | null;
  decidedAt: number | null;
  decisionNote: string | null;
  cancellationFee: number | null;
  checkedInAt: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  notes: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  amountPaid: number;
  promoCode: string | null;
  discount: number;
  reference: string;
  createdAt: number;
}

export interface BusinessBookingView extends GuestView {
  eventTitle: string;
  eventSlug: string;
  eventStart: number;
  eventId: Id<"events">;
  festId: Id<"fests">;
  eventCategory: string;
  /** Whether this account may decide on the booking, or only read it. */
  canDecide: boolean;
  price: number;
  programmeName: string;
}

/** One day of the booking chart. */
export interface BookingDayPoint {
  at: number;
  count: number;
}

export interface AnalyticsEventRow {
  eventId: Id<"events">;
  festId: Id<"fests">;
  title: string;
  slug: string;
  category: string;
  startTime: number;
  capacity: number;
  seatsTaken: number;
  remaining: number;
  confirmed: number;
  waitlisted: number;
  declined: number;
  cancelled: number;
  checkedIn: number;
  lateReleases: number;
  releaseFeeRecorded: number;
  bookings: number;
  fill: number;
  upcoming: boolean;
  announcements: number;
}

/** Everything the organizer analytics panel draws. */
export interface AnalyticsOverview {
  totals: {
    programmes: number;
    events: number;
    upcoming: number;
    bookings: number;
    confirmed: number;
    waitlisted: number;
    declined: number;
    cancelled: number;
    checkedIn: number;
    capacity: number;
    seatsTaken: number;
    fill: number;
    releaseRate: number;
    attendanceRate: number;
    awaitingDecision: number;
    announcements: number;
    emailedAnnouncements: number;
  };
  series: BookingDayPoint[];
  byProgramme: {
    festId: Id<"fests">;
    name: string;
    organization: string;
    slug: string;
    events: number;
    seatsTaken: number;
    capacity: number;
    bookings: number;
    fill: number;
  }[];
  byCategory: {
    category: string;
    events: number;
    seatsTaken: number;
    capacity: number;
  }[];
  byParticipantCategory: { category: string; count: number }[];
  events: AnalyticsEventRow[];
  busiest: AnalyticsEventRow | null;
  programmes: { _id: Id<"fests">; name: string; organization: string }[];
}

/** A programme as the console sees it, with its settings and the caller's role. */
export interface ConsoleProgrammeView extends ProgrammeListItem {
  role: "owner" | CollaboratorRole;
  isOwner: boolean;
  canEdit: boolean;
  cancellationFee: number;
  cancellationWindowHours: number;
  emailTemplate: EmailTemplateView | null;
  teamSize: number;
  pendingInvites: number;
}

/** One row of the collaboration table. */
export interface CollaboratorView {
  _id: Id<"collaborators">;
  email: string;
  name: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invitedAt: number;
  respondedAt: number | null;
}

/** An invitation waiting for the signed-in account. */
export interface InviteView {
  _id: Id<"collaborators">;
  festId: Id<"fests">;
  role: CollaboratorRole;
  invitedAt: number;
  programmeName: string;
  programmeSlug: string;
  organization: string;
  invitedByName: string;
}

export interface ProductView {
  _id: Id<"products">;
  name: string;
  kind: ProductKind;
  description: string | null;
  price: number;
  available: number;
}

/** What the organizer sees on the shelf, including what has sold out. */
export interface ManagedProductView extends ProductView {
  stock: number;
  sold: number;
  active: boolean;
}

export interface SponsorshipView {
  _id: Id<"sponsorships">;
  company: string;
  tier: SponsorshipTier;
  amount: number;
  message: string | null;
  status: SponsorshipStatus;
  eventId: Id<"events"> | null;
}

/** A pledge as the business sees it, with who to contact about it. */
export interface OrganizerSponsorshipView
  extends Omit<SponsorshipView, "eventId"> {
  contactName: string | null;
  email: string | null;
  paymentMethod: PaymentMethod;
  createdAt: number;
  programmeName: string;
  eventTitle: string | null;
}

export interface SponsorshipTierOption {
  id: SponsorshipTier;
  name: string;
  amount: number;
  blurb: string;
}

export interface ReviewView {
  _id: Id<"reviews">;
  authorName: string;
  authorCompany: string | null;
  rating: number;
  body: string;
  createdAt: number;
  fromAttendee: boolean;
}

export interface OrganizerReviewView
  extends Omit<ReviewView, "fromAttendee"> {
  eventTitle: string;
  programmeName: string;
}

export interface OrderLine {
  productId: Id<"products">;
  name: string;
  kind: ProductKind;
  unitPrice: number;
  quantity: number;
}

export interface OrderView {
  _id: Id<"orders">;
  reference: string;
  subtotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: number;
  items: OrderLine[];
  eventTitle: string;
  eventSlug: string;
  eventStart: number;
}

export interface ProfileView {
  persona: Persona;
  country: string;
  currency: string;
  payoutMethod: PaymentMethod | null;
  payoutDetails: string | null;
}

export interface RevenueEventRow {
  eventId: string;
  title: string;
  slug: string;
  startTime: number;
  programmeName: string;
  tickets: number;
  ticketPaid: number;
  ticketDue: number;
  shopPaid: number;
  shopDue: number;
  sponsors: number;
  sponsorValue: number;
  rating: number | null;
  reviewCount: number;
}

export interface RevenueOverview {
  programmes: number;
  tickets: number;
  ticketPaid: number;
  ticketDue: number;
  orders: number;
  shopPaid: number;
  shopDue: number;
  sponsors: number;
  sponsorPaid: number;
  sponsorConfirmed: number;
  sponsorPledged: number;
  collected: number;
  promised: number;
  reviewCount: number;
  rating: number | null;
  payoutMethod: PaymentMethod | null;
  payoutDetails: string | null;
  markets: { country: string; orders: number; value: number }[];
  events: RevenueEventRow[];
}

/** One turn in the assistant panel. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  /** Model name when a key is configured, or a note about the fallback. */
  meta?: string | null;
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
