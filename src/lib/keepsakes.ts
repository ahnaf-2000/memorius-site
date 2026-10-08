import { useSyncExternalStore } from "react";

/**
 * The keepsakes.
 *
 * The site already hid a few small rewards — a rail of chips, a name you can
 * spell, an old code — and each one was celebrated once and then forgotten.
 * This store is what makes them add up: every discovery is remembered in the
 * browser, counted against the full set, and read back by the tray that sits
 * in the corner of every page. Nothing here is a score, a streak or a
 * notification; it is a small cabinet of things you noticed.
 *
 * The catalogue is fixed on purpose. A keepsake only exists if something in
 * the product can hand it over, so the count a visitor sees is always the
 * count that is really reachable.
 */

export type KeepsakeGroup = "rail" | "secret" | "journey";

export type Keepsake = {
  id: string;
  label: string;
  hint: string;
  group: KeepsakeGroup;
};

/** The twelve chips in the rail near the foot of the home page. */
const RAIL_NAMES = [
  "A shop cart",
  "Four tiers",
  "One rating",
  "One ledger",
  "Local prices",
  "Memo",
  "Waiting list",
  "Six payment rails",
  "Live occupancy",
  "Many programmes",
  "A business page",
  "One-tap booking",
];

/** The thirteenth one, given for collecting all twelve. */
export const RAIL_MASTER_ID = "journey:every-chip";

const RAIL_HINT = "Tap it in the rail near the foot of the home page.";

/**
 * One id per chip, derived from its name, so the rail and the catalogue can
 * never disagree about what a chip is called.
 */
export function railKeepsakeId(name: string): string {
  return `rail:${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

export const KEEPSAKES: Keepsake[] = [
  ...RAIL_NAMES.map((name) => ({
    id: railKeepsakeId(name),
    label: name,
    hint: RAIL_HINT,
    group: "rail" as const,
  })),
  {
    id: "secret:name",
    label: "The name, spelt out",
    hint: "Spell the product's name anywhere on the site, outside a field.",
    group: "secret",
  },
  {
    id: "secret:konami",
    label: "The old code",
    hint: "Up, up, down, down, left, right, left, right, B, A.",
    group: "secret",
  },
  {
    id: "journey:memo",
    label: "Asked Memo something",
    hint: "The assistant answers on every page, model or no model.",
    group: "journey",
  },
  {
    id: "journey:report",
    label: "Read the platform report",
    hint: "Every figure the product holds, on one page at /report.",
    group: "journey",
  },
  {
    id: "journey:booked",
    label: "Booked a place",
    hint: "Reserve a seat on any event, waitlist or not.",
    group: "journey",
  },
  {
    id: "journey:order",
    label: "Ordered from a shop",
    hint: "Merchandise and snacks sit inside each event.",
    group: "journey",
  },
  {
    id: RAIL_MASTER_ID,
    label: "Every chip found",
    hint: "All twelve things in the rail, whenever you get there.",
    group: "journey",
  },
];

export const KEEPSAKE_GROUPS: { id: KeepsakeGroup; title: string }[] = [
  { id: "journey", title: "Milestones" },
  { id: "secret", title: "Secrets" },
  { id: "rail", title: "The rail" },
];

const STORAGE_KEY = "memorius:keepsakes:v1";

const KNOWN_IDS = new Set(KEEPSAKES.map((keepsake) => keepsake.id));

export type KeepsakeState = {
  /** Ids already found, in the order they were found. */
  found: string[];
  /** The one that arrived last, for the tray to announce. */
  latest: string | null;
};

function readStored(): KeepsakeState {
  if (typeof window === "undefined") return { found: [], latest: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { found: [], latest: null };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { found: [], latest: null };
    return {
      // Anything unknown (an older catalogue, a hand-edited key) is dropped.
      found: parsed.filter(
        (id): id is string => typeof id === "string" && KNOWN_IDS.has(id),
      ),
      latest: null,
    };
  } catch {
    return { found: [], latest: null };
  }
}

let state: KeepsakeState = readStored();

const listeners = new Set<() => void>();

function commit(next: KeepsakeState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.found));
    } catch {
      // A browser that refuses storage still keeps them for this visit.
    }
  }
  for (const listener of listeners) listener();
}

export function subscribeKeepsakes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current snapshot. The reference only changes when something is found. */
export function keepsakeState(): KeepsakeState {
  return state;
}

/**
 * Remember a discovery. Safe to call on every interaction: an id that is
 * unknown or already found does nothing, and the first find of each one
 * returns true exactly once.
 */
export function award(id: string): boolean {
  if (!KNOWN_IDS.has(id) || state.found.includes(id)) return false;

  const found = [...state.found, id];
  // The rail's twelve add up to a thirteenth, and it arrives by itself.
  if (
    id.startsWith("rail:") &&
    !found.includes(RAIL_MASTER_ID) &&
    RAIL_NAMES.every((name) => found.includes(railKeepsakeId(name)))
  ) {
    found.push(RAIL_MASTER_ID);
  }

  commit({ found, latest: found[found.length - 1] });
  return true;
}

export function keepsakeById(id: string): Keepsake | null {
  return KEEPSAKES.find((keepsake) => keepsake.id === id) ?? null;
}

/** The tray subscribes here: it re-renders when a keepsake is found. */
export function useKeepsakes(): KeepsakeState {
  return useSyncExternalStore(subscribeKeepsakes, keepsakeState, keepsakeState);
}
