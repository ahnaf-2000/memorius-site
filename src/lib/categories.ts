/**
 * The catalogue taxonomy, read by the browser.
 *
 * The list itself lives next to the server functions that validate against it
 * (`convex/taxonomy.ts`), so the chips a visitor can filter on and the values a
 * write is allowed to store are the same list by construction.
 */
export {
  CATEGORY_BLURB,
  DEFAULT_PARTICIPANT_CATEGORY,
  ELIGIBILITY_LEVELS,
  EVENT_CATEGORIES,
  OPEN_CATEGORY,
  OPEN_ELIGIBILITY,
  PARTICIPANT_CATEGORIES,
  PARTICIPANT_CATEGORY_LABEL,
  isEligibilityLevel,
  isEventCategory,
  normalizeCategory,
  normalizeEligibility,
  normalizeParticipantCategory,
  type EligibilityLevel,
  type EventCategory,
  type ParticipantCategory,
} from "@/convex/taxonomy";
