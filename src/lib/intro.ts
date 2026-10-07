/**
 * The opening sequence is a shared fact, not a private detail of one component:
 * the hero waits for it, and it is remembered per session so nobody has to sit
 * through it twice. Everything about whether it plays, and how long it holds,
 * lives here.
 */
export const INTRO_SEEN_KEY = "memorius.intro.v1";

/** How long the panels hold before they part, in milliseconds. */
export const INTRO_PART_MS = 2300;

/** Whole sequence, including the exit, in milliseconds. */
export const INTRO_TOTAL_MS = 3300;

/** Sessions that have already watched it. */
function alreadySeen() {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "seen";
  } catch {
    // Private mode with storage blocked: play it, it costs two seconds.
    return false;
  }
}

/**
 * Whether the sequence will play for this visit. `?intro=1` replays it on
 * demand, which is what a demo or a screen recording needs.
 */
export function introPlays(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (new URLSearchParams(window.location.search).get("intro") === "1") {
    return true;
  }
  return !alreadySeen();
}

/** Marks the sequence as watched for the rest of the session. */
export function rememberIntro() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "seen");
  } catch {
    // Nothing to do: it simply plays again next time.
  }
}
