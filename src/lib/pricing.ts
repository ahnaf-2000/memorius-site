import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  currencyByCode,
  isKnownCurrency,
  type CurrencyOption,
} from "@/lib/currencies";
import { useSyncExternalStore } from "react";

export {
  CURRENCIES,
  DEFAULT_CURRENCY,
  currencyByCode,
  isKnownCurrency,
  type CurrencyOption,
};

/**
 * Prices are stored once, in minor units of the base currency (USD). What a
 * visitor sees is quoted in their own market instead, converted here at a
 * fixed indicative rate. One rate is baked in for every country: a live FX
 * feed belongs on the server, and swapping the numbers below is the whole
 * change needed to move to one.
 */
export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  locale: string;
  /** Units of local currency per 1 USD. */
  rate: number;
  flag: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States", currency: "USD", locale: "en-US", rate: 1, flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB", rate: 0.79, flag: "🇬🇧" },
  { code: "EU", name: "European Union", currency: "EUR", locale: "de-DE", rate: 0.92, flag: "🇪🇺" },
  { code: "BD", name: "Bangladesh", currency: "BDT", locale: "bn-BD", rate: 118, flag: "🇧🇩" },
  { code: "IN", name: "India", currency: "INR", locale: "en-IN", rate: 84, flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", currency: "PKR", locale: "en-PK", rate: 278, flag: "🇵🇰" },
  { code: "NG", name: "Nigeria", currency: "NGN", locale: "en-NG", rate: 1550, flag: "🇳🇬" },
  { code: "KE", name: "Kenya", currency: "KES", locale: "en-KE", rate: 129, flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", currency: "ZAR", locale: "en-ZA", rate: 18.2, flag: "🇿🇦" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", locale: "en-AE", rate: 3.67, flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", locale: "en-SA", rate: 3.75, flag: "🇸🇦" },
  { code: "SG", name: "Singapore", currency: "SGD", locale: "en-SG", rate: 1.34, flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", currency: "MYR", locale: "ms-MY", rate: 4.45, flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", currency: "IDR", locale: "id-ID", rate: 15_600, flag: "🇮🇩" },
  { code: "PH", name: "Philippines", currency: "PHP", locale: "en-PH", rate: 57, flag: "🇵🇭" },
  { code: "JP", name: "Japan", currency: "JPY", locale: "ja-JP", rate: 152, flag: "🇯🇵" },
  { code: "CN", name: "China", currency: "CNY", locale: "zh-CN", rate: 7.2, flag: "🇨🇳" },
  { code: "AU", name: "Australia", currency: "AUD", locale: "en-AU", rate: 1.52, flag: "🇦🇺" },
  { code: "CA", name: "Canada", currency: "CAD", locale: "en-CA", rate: 1.37, flag: "🇨🇦" },
  { code: "BR", name: "Brazil", currency: "BRL", locale: "pt-BR", rate: 5.45, flag: "🇧🇷" },
  { code: "MX", name: "Mexico", currency: "MXN", locale: "es-MX", rate: 18.4, flag: "🇲🇽" },
  { code: "TR", name: "Türkiye", currency: "TRY", locale: "tr-TR", rate: 34, flag: "🇹🇷" },
  { code: "EG", name: "Egypt", currency: "EGP", locale: "ar-EG", rate: 48, flag: "🇪🇬" },
  { code: "GH", name: "Ghana", currency: "GHS", locale: "en-GH", rate: 15.4, flag: "🇬🇭" },
];

export const BASE_CURRENCY = "USD";
export const DEFAULT_COUNTRY = "US";

/**
 * The three fields every money calculation needs. A market and a currency both
 * satisfy this shape, so either can be handed to the helpers below.
 */
export interface MoneyUnit {
  currency: string;
  locale: string;
  rate: number;
}

const fallback = COUNTRIES[0];

export function countryByCode(code: string): CountryOption {
  return COUNTRIES.find((country) => country.code === code) ?? fallback;
}

/* ------------------------------------------------------------------ store */

const STORAGE_KEY = "memorius.country";
/**
 * Where the visitor was last placed by something other than their own choice —
 * their account, or the country their IP address resolves to. Kept apart from
 * the explicit choice so travelling, or picking up a new device, can move the
 * default without ever overwriting a decision somebody made in the menu.
 */
const DETECTED_KEY = "memorius.country.detected";
/** A currency the visitor chose, and one placed for them from their account. */
const CURRENCY_KEY = "memorius.currency";
const DETECTED_CURRENCY_KEY = "memorius.currency.detected";
const listeners = new Set<() => void>();

/**
 * Whether a code is one of the markets the product quotes in. A type predicate
 * rather than a plain boolean, so a stored or detected code narrows to a real
 * market at the call site instead of staying `string | null`.
 */
export function isKnownCountry(code: string | null): code is string {
  return code !== null && COUNTRIES.some((country) => country.code === code);
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Whether the visitor has picked a market themselves, in this browser. */
export function hasChosenCountry(): boolean {
  if (typeof window === "undefined") return false;
  return isKnownCountry(readStored(STORAGE_KEY));
}

let activeCode = (() => {
  if (typeof window === "undefined") return DEFAULT_COUNTRY;
  const chosen = readStored(STORAGE_KEY);
  if (isKnownCountry(chosen)) return chosen;
  // A remembered guess paints correctly on the first frame, with no re-quote
  // waiting on a network round trip.
  const detected = readStored(DETECTED_KEY);
  return isKnownCountry(detected) ? detected : DEFAULT_COUNTRY;
})();

/**
 * The currency prices are actually quoted in. A visitor who has picked one
 * keeps it; a visitor who has not simply follows the market their region
 * resolved to, which is what makes choosing a region still choose a currency.
 */
let activeCurrencyCode = (() => {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  const chosen = readStored(CURRENCY_KEY);
  if (isKnownCurrency(chosen)) return chosen;
  const detected = readStored(DETECTED_CURRENCY_KEY);
  if (isKnownCurrency(detected)) return detected;
  return countryByCode(activeCode).currency;
})();

/** Whether the visitor has picked a currency of their own, in this browser. */
export function hasChosenCurrency(): boolean {
  if (typeof window === "undefined") return false;
  return isKnownCurrency(readStored(CURRENCY_KEY));
}

function emit() {
  for (const listener of listeners) listener();
}

export function setActiveCountry(code: string) {
  if (!isKnownCountry(code)) return;
  activeCode = code;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // A blocked storage quota must never stop the switch from applying.
  }
  // Choosing a region still moves the currency with it — a choice outranks a
  // consequence, so this does nothing once a currency has been picked.
  followMarketCurrency();
  emit();
}

/** The market's own currency, applied only when nothing was chosen. */
function followMarketCurrency() {
  if (hasChosenCurrency()) return;
  activeCurrencyCode = countryByCode(activeCode).currency;
}

/**
 * Quote prices in a currency of the visitor's own choosing, whatever their
 * region says. This is the axis that decides what a price *means*; the region
 * still decides how the number is written.
 */
export function setActiveCurrency(code: string) {
  if (!isKnownCurrency(code)) return;
  activeCurrencyCode = code;
  try {
    window.localStorage.setItem(CURRENCY_KEY, code);
  } catch {
    // A blocked storage quota must never stop the switch from applying.
  }
  emit();
}

/** A currency worked out from the account, rather than chosen in this browser. */
export function applyDetectedCurrency(code: string) {
  if (!isKnownCurrency(code) || hasChosenCurrency()) return;
  try {
    window.localStorage.setItem(DETECTED_CURRENCY_KEY, code);
  } catch {
    // Storage blocked: the switch below still applies for this visit.
  }
  if (code === activeCurrencyCode) return;
  activeCurrencyCode = code;
  emit();
}

/**
 * Place the visitor in a market that was worked out for them — from their
 * account, or from the country their IP address points to.
 *
 * Deliberately weaker than setActiveCountry: it refuses to touch a market
 * somebody chose themselves, and it is remembered under its own key, so a
 * choice and a guess can never be mistaken for one another.
 */
export function applyDetectedCountry(code: string) {
  if (!isKnownCountry(code) || hasChosenCountry()) return;
  try {
    window.localStorage.setItem(DETECTED_KEY, code);
  } catch {
    // Storage blocked: the switch below still applies for this visit.
  }
  if (code === activeCode) return;
  activeCode = code;
  followMarketCurrency();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useActiveCountry(): CountryOption {
  const code = useSyncExternalStore(
    subscribe,
    () => activeCode,
    () => DEFAULT_COUNTRY,
  );
  return countryByCode(code);
}

/** The currency prices are quoted in, with its own home-market formatting. */
export function useActiveCurrency(): CurrencyOption {
  const code = useSyncExternalStore(
    subscribe,
    () => activeCurrencyCode,
    () => DEFAULT_CURRENCY,
  );
  return currencyByCode(code);
}

/**
 * What the money helpers read: the chosen currency, formatted the way numbers
 * are written in the visitor's region.
 */
export function activeMoneyUnit(): MoneyUnit {
  return {
    currency: activeCurrencyCode,
    locale: countryByCode(activeCode).locale,
    rate: currencyByCode(activeCurrencyCode).rate,
  };
}

/* --------------------------------------------------------------- display */

/** Convert a base-currency minor amount into the local major amount. */
export function toLocalAmount(
  baseMinorUnits: number,
  unit: MoneyUnit = activeMoneyUnit(),
) {
  return (baseMinorUnits / 100) * unit.rate;
}

/** Base-currency minor units for a figure typed in the organizer's own market. */
export function fromLocalAmount(localMajor: number, unit: MoneyUnit) {
  if (!Number.isFinite(localMajor)) return 0;
  return Math.round((localMajor / unit.rate) * 100);
}

/** The symbol for the active market, for inputs that want it as a prefix. */
export function activeSymbol() {
  const unit = activeMoneyUnit();
  return new Intl.NumberFormat(unit.locale, {
    style: "currency",
    currency: unit.currency,
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? "";
}

/**
 * The one money formatter for the whole product. Whole amounts lose their
 * decimals, which is how prices read best on a card.
 */
export function formatLocalPrice(
  baseMinorUnits: number,
  unit: MoneyUnit = activeMoneyUnit(),
) {
  const amount = toLocalAmount(baseMinorUnits, unit);
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return new Intl.NumberFormat(unit.locale, {
    style: "currency",
    currency: unit.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** The local figure split into number and symbol, for display blocks. */
export function formatLocalParts(
  baseMinorUnits: number,
  unit: MoneyUnit = activeMoneyUnit(),
) {
  const amount = toLocalAmount(baseMinorUnits, unit);
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  const parts = new Intl.NumberFormat(unit.locale, {
    style: "currency",
    currency: unit.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: whole ? 0 : 2,
  }).formatToParts(amount);
  const symbol = parts.find((part) => part.type === "currency")?.value ?? "";
  const value = parts
    .filter((part) => part.type !== "currency")
    .map((part) => part.value)
    .join("")
    .trim();
  return { symbol, value };
}
