import { COUNTRIES } from "@/lib/pricing";

/**
 * Where the visitor is, from their IP address — so the first price they ever
 * see is quoted in their own money rather than in dollars.
 *
 * Two things matter more than accuracy here. The first is that nothing is
 * allowed to hold up a page: both lookups are keyless, CORS-enabled and backed
 * by a short timeout, and every failure path ends in a quiet `null` that leaves
 * the site on its default market. The second is that this is only ever a
 * starting point — `applyDetectedCountry` refuses to overwrite a market
 * somebody picked for themselves, so a guess can never become a decision.
 */

/** The Eurozone is one market here, not twenty, so it resolves as one. */
const EUROZONE = new Set([
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
]);

/** Keyless, CORS-enabled, tried in order. */
const ENDPOINTS: { url: string; iso: (body: unknown) => string | null }[] = [
  { url: "https://api.country.is/", iso: (body) => coded(body, "country") },
  { url: "https://ipwho.is/", iso: (body) => coded(body, "country_code") },
];

/** Read a two-letter ISO code out of a lookup response, or nothing. */
function coded(body: unknown, key: string): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.length === 2
    ? value.toUpperCase()
    : null;
}

/**
 * Map an ISO 3166 code onto the markets the product actually offers. Anything
 * we do not quote in returns null rather than guessing at the nearest one.
 */
export function toMarket(iso: string): string | null {
  if (EUROZONE.has(iso)) return "EU";
  return COUNTRIES.some((country) => country.code === iso) ? iso : null;
}

/**
 * The visitor's market, or null if the network, a content blocker or the
 * service itself declines to say. Never throws, and never takes longer than the
 * caller's timeout.
 */
export async function detectCountry(
  signal?: AbortSignal,
): Promise<string | null> {
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint.url, {
        signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) continue;
      const iso = endpoint.iso(await response.json());
      if (iso === null) continue;
      const market = toMarket(iso);
      if (market !== null) return market;
    } catch {
      // Blocked, offline, timed out, or malformed — try the next one, then
      // give up quietly and leave the default market in place.
    }
  }
  return null;
}
