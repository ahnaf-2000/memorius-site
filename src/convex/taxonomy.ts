/**
 * The taxonomy the catalogue is filed under.
 *
 * Categories are a closed list rather than free text: an event has to land in
 * one of these so a visitor can trust the filter chips, and so the same idea is
 * never filed three different ways. "Open" is the deliberate catch-all — an
 * event that fits nothing else is still visible, and the filter can always find
 * it by name.
 *
 * This lives inside the Convex folder because the server validates against it
 * on every write; the browser reads the same list through `@/lib/categories`,
 * so a chip can never be offered that the server would refuse.
 */

export const EVENT_CATEGORIES = [
  "Forum",
  "Workshop",
  "Keynote",
  "Course",
  "Roundtable",
  "Clinic",
  "Seminar",
  "Hackathon",
  "Meetup",
  "Social",
  "Open",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** The catch-all a category falls back to when nothing matches. */
export const OPEN_CATEGORY: EventCategory = "Open";

export function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Normalise whatever was typed into a category we can file. Matching is
 * case-insensitive, so "workshop" and "Workshop" land in the same place, and
 * anything unrecognised becomes Open rather than inventing a new chip.
 */
export function normalizeCategory(value: string): EventCategory {
  const trimmed = value.trim();
  const match = EVENT_CATEGORIES.find(
    (category) => category.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? OPEN_CATEGORY;
}

/** One sentence per category, for the filter menu and the event page. */
export const CATEGORY_BLURB: Record<EventCategory, string> = {
  Forum: "A full day of sessions and case reviews for a whole discipline.",
  Workshop: "Hands on, with work produced in the room rather than described.",
  Keynote: "A single address, usually in the evening, with questions after.",
  Course: "Taught, structured and led by a named faculty.",
  Roundtable: "A closed table of peers, off the record and unrecorded.",
  Clinic: "Bring the work you are stuck on and leave with it shaped.",
  Seminar: "A shorter talk with discussion, for a specialist audience.",
  Hackathon: "Teams building against the clock, judged on what runs.",
  Meetup: "Informal, repeated, and easy to drop into.",
  Social: "Dinner, drinks and the conversations that follow a session.",
  Open: "Nothing else fits — everyone is welcome and the door is wide.",
};

/**
 * Who may attend. Kept to a closed list for the same reason as categories: it
 * has to be filterable, and it has to mean the same thing on every event.
 */
export const ELIGIBILITY_LEVELS = [
  "Open to everyone",
  "Members only",
  "By invitation",
  "Professionals",
  "Students",
] as const;

export type EligibilityLevel = (typeof ELIGIBILITY_LEVELS)[number];

/** Events that say nothing about eligibility are open to everyone. */
export const OPEN_ELIGIBILITY: EligibilityLevel = "Open to everyone";

export function isEligibilityLevel(value: string): value is EligibilityLevel {
  return (ELIGIBILITY_LEVELS as readonly string[]).includes(value);
}

export function normalizeEligibility(value: string): EligibilityLevel {
  const trimmed = value.trim();
  const match = ELIGIBILITY_LEVELS.find(
    (level) => level.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? OPEN_ELIGIBILITY;
}

/**
 * Who a participant is on the guest list.
 *
 * Chosen by the customer when they book — a student knows they are one — and
 * adjustable by the organizer afterwards, because a speaker often books as a
 * delegate before anyone tells the desk. It is a closed list for the same
 * reason as the rest of the taxonomy: "students" has to mean the same thing in
 * the filter as it does on the booking.
 */
export const PARTICIPANT_CATEGORIES = [
  "delegate",
  "student",
  "speaker",
  "press",
  "volunteer",
  "guest",
  "staff",
] as const;

export type ParticipantCategory = (typeof PARTICIPANT_CATEGORIES)[number];

/** What a booking is when the customer says nothing. */
export const DEFAULT_PARTICIPANT_CATEGORY: ParticipantCategory = "delegate";

export const PARTICIPANT_CATEGORY_LABEL: Record<
  ParticipantCategory,
  { name: string; blurb: string }
> = {
  delegate: {
    name: "Delegate",
    blurb: "Here for the programme, booking on your own account.",
  },
  student: {
    name: "Student",
    blurb: "Attending in a student capacity, with a student's place.",
  },
  speaker: {
    name: "Speaker",
    blurb: "On the bill, or speaking in a session.",
  },
  press: {
    name: "Press",
    blurb: "Writing about it, with a notebook or a camera.",
  },
  volunteer: {
    name: "Volunteer",
    blurb: "Helping run the day rather than sitting through it.",
  },
  guest: {
    name: "Guest",
    blurb: "Invited by someone else on the programme.",
  },
  staff: {
    name: "Staff",
    blurb: "Working the event for the organization.",
  },
};

export function isParticipantCategory(
  value: string,
): value is ParticipantCategory {
  return (PARTICIPANT_CATEGORIES as readonly string[]).includes(value);
}

/** Anything unrecognised is a delegate: the plainest thing to be. */
export function normalizeParticipantCategory(
  value: string,
): ParticipantCategory {
  const trimmed = value.trim().toLowerCase();
  const match = PARTICIPANT_CATEGORIES.find(
    (category) => category === trimmed,
  );
  return match ?? DEFAULT_PARTICIPANT_CATEGORY;
}
