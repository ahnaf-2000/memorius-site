import { useSyncExternalStore } from "react";

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

const fallback = COUNTRIES[0];

export function countryByCode(code: string): CountryOption {
  return COUNTRIES.find((country) => country.code === code) ?? fallback;
}

/* ------------------------------------------------------------------ store */

const STORAGE_KEY = "memorius.country";
const listeners = new Set<() => void>();

let activeCode = (() => {
  if (typeof window === "undefined") return DEFAULT_COUNTRY;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored !== null && COUNTRIES.some((c) => c.code === stored)
    ? stored
    : DEFAULT_COUNTRY;
})();

function emit() {
  for (const listener of listeners) listener();
}

export function setActiveCountry(code: string) {
  if (!COUNTRIES.some((country) => country.code === code)) return;
  activeCode = code;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // A blocked storage quota must never stop the switch from applying.
  }
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

/* --------------------------------------------------------------- display */

/** Convert a base-currency minor amount into the local major amount. */
export function toLocalAmount(baseMinorUnits: number, country: CountryOption) {
  return (baseMinorUnits / 100) * country.rate;
}

/** Base-currency minor units for a figure typed in the organizer's own market. */
export function fromLocalAmount(localMajor: number, country: CountryOption) {
  if (!Number.isFinite(localMajor)) return 0;
  return Math.round((localMajor / country.rate) * 100);
}

/** The symbol for the active market, for inputs that want it as a prefix. */
export function activeSymbol() {
  const country = countryByCode(activeCode);
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
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
  country: CountryOption = countryByCode(activeCode),
) {
  const amount = toLocalAmount(baseMinorUnits, country);
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** The local figure split into number and symbol, for display blocks. */
export function formatLocalParts(
  baseMinorUnits: number,
  country: CountryOption = countryByCode(activeCode),
) {
  const amount = toLocalAmount(baseMinorUnits, country);
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  const parts = new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
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
