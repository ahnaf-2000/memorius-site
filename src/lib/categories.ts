/**
 * The catalogue taxonomy, read by the browser.
 *
 * The list itself lives next to the server functions that validate against it
 * (`convex/taxonomy.ts`), so the chips a visitor can filter on and the values a
 * write is allowed to store are the same list by construction.
 */
export {
  CATEGORY_BLURB,
  ELIGIBILITY_LEVELS,
  EVENT_CATEGORIES,
  OPEN_CATEGORY,
  OPEN_ELIGIBILITY,
  isEligibilityLevel,
  isEventCategory,
  normalizeCategory,
  normalizeEligibility,
  type EligibilityLevel,
  type EventCategory,
} from "@/convex/taxonomy";
