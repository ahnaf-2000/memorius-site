/**
 * Every currency the product can quote in.
 *
 * Deliberately wider than the market list in `pricing.ts`, because where a
 * visitor is and what they want to be quoted in are two different questions. A
 * visitor in Germany may well prefer to see dollars, and somebody running a
 * programme for an international audience will set one currency and leave it.
 *
 * Each entry carries its home market's locale and flag so a currency chosen on
 * its own still formats sensibly, and a rate in units per 1 USD on the same
 * fixed, indicative basis as the markets. A live FX feed belongs on the server;
 * replacing the numbers below is the whole change needed to move to one.
 */
export interface CurrencyOption {
  code: string;
  /** The same value as `code`, so a money helper can take this directly. */
  currency: string;
  name: string;
  /** How the amount is written: symbol, grouping and decimal mark. */
  locale: string;
  /** Units of this currency per 1 USD. */
  rate: number;
  flag: string;
}

export const DEFAULT_CURRENCY = "USD";

const TABLE: Omit<CurrencyOption, "currency">[] = [
  { code: "USD", name: "United States dollar", locale: "en-US", rate: 1, flag: "🇺🇸" },
  { code: "EUR", name: "Euro", locale: "de-DE", rate: 0.92, flag: "🇪🇺" },
  { code: "GBP", name: "British pound", locale: "en-GB", rate: 0.79, flag: "🇬🇧" },
  { code: "AED", name: "UAE dirham", locale: "en-AE", rate: 3.67, flag: "🇦🇪" },
  { code: "AUD", name: "Australian dollar", locale: "en-AU", rate: 1.52, flag: "🇦🇺" },
  { code: "BDT", name: "Bangladeshi taka", locale: "bn-BD", rate: 118, flag: "🇧🇩" },
  { code: "BRL", name: "Brazilian real", locale: "pt-BR", rate: 5.45, flag: "🇧🇷" },
  { code: "CAD", name: "Canadian dollar", locale: "en-CA", rate: 1.37, flag: "🇨🇦" },
  { code: "CHF", name: "Swiss franc", locale: "de-CH", rate: 0.88, flag: "🇨🇭" },
  { code: "CNY", name: "Chinese yuan", locale: "zh-CN", rate: 7.2, flag: "🇨🇳" },
  { code: "EGP", name: "Egyptian pound", locale: "ar-EG", rate: 48, flag: "🇪🇬" },
  { code: "GHS", name: "Ghanaian cedi", locale: "en-GH", rate: 15.4, flag: "🇬🇭" },
  { code: "HKD", name: "Hong Kong dollar", locale: "en-HK", rate: 7.8, flag: "🇭🇰" },
  { code: "IDR", name: "Indonesian rupiah", locale: "id-ID", rate: 15_600, flag: "🇮🇩" },
  { code: "INR", name: "Indian rupee", locale: "en-IN", rate: 84, flag: "🇮🇳" },
  { code: "JPY", name: "Japanese yen", locale: "ja-JP", rate: 152, flag: "🇯🇵" },
  { code: "KES", name: "Kenyan shilling", locale: "en-KE", rate: 129, flag: "🇰🇪" },
  { code: "KRW", name: "South Korean won", locale: "ko-KR", rate: 1340, flag: "🇰🇷" },
  { code: "MXN", name: "Mexican peso", locale: "es-MX", rate: 18.4, flag: "🇲🇽" },
  { code: "MYR", name: "Malaysian ringgit", locale: "ms-MY", rate: 4.45, flag: "🇲🇾" },
  { code: "NGN", name: "Nigerian naira", locale: "en-NG", rate: 1550, flag: "🇳🇬" },
  { code: "NZD", name: "New Zealand dollar", locale: "en-NZ", rate: 1.65, flag: "🇳🇿" },
  { code: "PHP", name: "Philippine peso", locale: "en-PH", rate: 57, flag: "🇵🇭" },
  { code: "PKR", name: "Pakistani rupee", locale: "en-PK", rate: 278, flag: "🇵🇰" },
  { code: "PLN", name: "Polish złoty", locale: "pl-PL", rate: 3.95, flag: "🇵🇱" },
  { code: "SAR", name: "Saudi riyal", locale: "en-SA", rate: 3.75, flag: "🇸🇦" },
  { code: "SEK", name: "Swedish krona", locale: "sv-SE", rate: 10.5, flag: "🇸🇪" },
  { code: "SGD", name: "Singapore dollar", locale: "en-SG", rate: 1.34, flag: "🇸🇬" },
  { code: "THB", name: "Thai baht", locale: "th-TH", rate: 34, flag: "🇹🇭" },
  { code: "TRY", name: "Turkish lira", locale: "tr-TR", rate: 34, flag: "🇹🇷" },
  { code: "VND", name: "Vietnamese đồng", locale: "vi-VN", rate: 25_400, flag: "🇻🇳" },
  { code: "ZAR", name: "South African rand", locale: "en-ZA", rate: 18.2, flag: "🇿🇦" },
  { code: "CZK", name: "Czech koruna", locale: "cs-CZ", rate: 22.8, flag: "🇨🇿" },
  { code: "DKK", name: "Danish krone", locale: "da-DK", rate: 6.85, flag: "🇩🇰" },
  { code: "NOK", name: "Norwegian krone", locale: "nb-NO", rate: 10.8, flag: "🇳🇴" },
  { code: "HUF", name: "Hungarian forint", locale: "hu-HU", rate: 355, flag: "🇭🇺" },
  { code: "ILS", name: "Israeli new shekel", locale: "he-IL", rate: 3.7, flag: "🇮🇱" },
];

/** The catalogue, ready to hand straight to any money helper. */
export const CURRENCIES: CurrencyOption[] = TABLE.map((entry) => ({
  ...entry,
  currency: entry.code,
}));

/** The currency a code refers to, falling back to the base currency. */
export function currencyByCode(code: string): CurrencyOption {
  return CURRENCIES.find((currency) => currency.code === code) ?? CURRENCIES[0];
}

/** Whether a code is one of the currencies we can quote in. */
export function isKnownCurrency(code: string | null): code is string {
  return code !== null && CURRENCIES.some((currency) => currency.code === code);
}
