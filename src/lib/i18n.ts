import { useCallback, useSyncExternalStore } from "react";

/**
 * Language, and the small dictionary the interface reads from.
 *
 * Two rules shape this file, and they are the whole point of it:
 *
 * 1. The language only ever changes because the visitor said so. It is never
 *    inferred from the browser, the IP address, or the country chosen in the
 *    preferences menu — moving region quotes prices differently, it does not
 *    speak for the reader.
 * 2. It survives the visit. The choice is kept in the browser next to the
 *    theme, so someone who picked a language is not asked again.
 *
 * The dictionary is deliberately small for now: the furniture that every page
 * shares (navigation, the preferences menu) and the page a stranger is most
 * likely to meet first — the one that does not exist. Anything missing falls
 * back to English rather than to an empty string, so a half-translated
 * interface still reads as a finished one.
 */

export type LanguageCode = "en" | "es" | "fr" | "de" | "bn";

export const LANGUAGES: {
  code: LanguageCode;
  name: string;
  native: string;
  flag: string;
}[] = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
];

const ENGLISH = {
  "nav.catalogue": "Catalogue",
  "nav.programmes": "Programmes",
  "nav.report": "Report",
  "nav.contact": "Contact",
  "nav.admin": "Admin",
  "nav.myBookings": "My bookings",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.browseEvents": "Browse events",

  "prefs.language": "Language",
  "prefs.languageNote":
    "Chosen once, and yours — changing your region never changes the language.",
  "prefs.appearance": "Appearance",
  "prefs.palette": "Palette",
  "prefs.currency": "Currency",
  "prefs.region": "Region",

  "notFound.eyebrow": "Wrong turn",
  "notFound.title": "This page isn't here — and that is on us, not on you.",
  "notFound.lead":
    "The link that brought you here points at something that no longer exists. Nothing you did broke it, and nothing of yours is lost.",
  "notFound.returning": "Taking you back to where you were in {n}…",
  "notFound.returningHome": "Taking you home in {n}…",
  "notFound.cancelled": "Auto-return stopped. Stay as long as you like.",
  "notFound.hold": "Press Esc to stop the countdown.",
  "notFound.back": "Take me back",
  "notFound.explore": "Keep exploring",
  "notFound.home": "Go home",
} as const;

export type TranslationKey = keyof typeof ENGLISH;

const SPANISH: Partial<Record<TranslationKey, string>> = {
  "nav.catalogue": "Catálogo",
  "nav.programmes": "Programas",
  "nav.report": "Informe",
  "nav.contact": "Contacto",
  "nav.admin": "Administración",
  "nav.myBookings": "Mis reservas",
  "nav.signIn": "Iniciar sesión",
  "nav.signOut": "Cerrar sesión",
  "nav.browseEvents": "Ver eventos",
  "prefs.language": "Idioma",
  "prefs.languageNote":
    "Se elige una vez y es tuya: cambiar de región nunca cambia el idioma.",
  "prefs.appearance": "Apariencia",
  "prefs.palette": "Paleta",
  "prefs.currency": "Moneda",
  "prefs.region": "Región",
  "notFound.eyebrow": "Camino equivocado",
  "notFound.title": "Esta página no está aquí, y la culpa es nuestra, no tuya.",
  "notFound.lead":
    "El enlace que te trajo hasta aquí apunta a algo que ya no existe. No rompiste nada y no se ha perdido nada tuyo.",
  "notFound.returning": "Te devolvemos a donde estabas en {n}…",
  "notFound.returningHome": "Te llevamos al inicio en {n}…",
  "notFound.cancelled":
    "Vuelta automática detenida. Quédate todo el tiempo que quieras.",
  "notFound.hold": "Pulsa Esc para detener la cuenta atrás.",
  "notFound.back": "Volver",
  "notFound.explore": "Seguir explorando",
  "notFound.home": "Ir al inicio",
};

const FRENCH: Partial<Record<TranslationKey, string>> = {
  "nav.catalogue": "Catalogue",
  "nav.programmes": "Programmes",
  "nav.report": "Rapport",
  "nav.contact": "Contact",
  "nav.admin": "Administration",
  "nav.myBookings": "Mes réservations",
  "nav.signIn": "Se connecter",
  "nav.signOut": "Se déconnecter",
  "nav.browseEvents": "Voir les événements",
  "prefs.language": "Langue",
  "prefs.languageNote":
    "Choisie une fois, et à vous : changer de région ne change jamais la langue.",
  "prefs.appearance": "Apparence",
  "prefs.palette": "Palette",
  "prefs.currency": "Devise",
  "prefs.region": "Région",
  "notFound.eyebrow": "Fausse route",
  "notFound.title":
    "Cette page n'est pas là — c'est notre faute, pas la vôtre.",
  "notFound.lead":
    "Le lien qui vous a mené ici pointe vers quelque chose qui n'existe plus. Rien de votre fait ne l'a cassé, et rien de vous n'est perdu.",
  "notFound.returning": "Retour là où vous étiez dans {n}…",
  "notFound.returningHome": "Retour à l'accueil dans {n}…",
  "notFound.cancelled":
    "Retour automatique arrêté. Restez autant que vous voulez.",
  "notFound.hold": "Appuyez sur Échap pour arrêter le compte à rebours.",
  "notFound.back": "Revenir en arrière",
  "notFound.explore": "Continuer d'explorer",
  "notFound.home": "Aller à l'accueil",
};

const GERMAN: Partial<Record<TranslationKey, string>> = {
  "nav.catalogue": "Katalog",
  "nav.programmes": "Programme",
  "nav.report": "Bericht",
  "nav.contact": "Kontakt",
  "nav.admin": "Verwaltung",
  "nav.myBookings": "Meine Buchungen",
  "nav.signIn": "Anmelden",
  "nav.signOut": "Abmelden",
  "nav.browseEvents": "Events ansehen",
  "prefs.language": "Sprache",
  "prefs.languageNote":
    "Einmal gewählt und dann Ihre: Die Region ändert die Sprache nie.",
  "prefs.appearance": "Darstellung",
  "prefs.palette": "Palette",
  "prefs.currency": "Währung",
  "prefs.region": "Region",
  "notFound.eyebrow": "Falsche Abzweigung",
  "notFound.title": "Diese Seite gibt es nicht — unser Fehler, nicht Ihrer.",
  "notFound.lead":
    "Der Link, der Sie hierher geführt hat, zeigt auf etwas, das nicht mehr existiert. Sie haben nichts kaputt gemacht, und nichts von Ihnen ist verloren.",
  "notFound.returning": "Zurück, wo Sie waren, in {n}…",
  "notFound.returningHome": "Zur Startseite in {n}…",
  "notFound.cancelled":
    "Automatische Rückkehr gestoppt. Bleiben Sie, solange Sie mögen.",
  "notFound.hold": "Esc drücken, um den Countdown zu stoppen.",
  "notFound.back": "Zurück",
  "notFound.explore": "Weiter entdecken",
  "notFound.home": "Zur Startseite",
};

const BENGALI: Partial<Record<TranslationKey, string>> = {
  "nav.catalogue": "ক্যাটালগ",
  "nav.programmes": "প্রোগ্রাম",
  "nav.report": "রিপোর্ট",
  "nav.contact": "যোগাযোগ",
  "nav.admin": "অ্যাডমিন",
  "nav.myBookings": "আমার বুকিং",
  "nav.signIn": "সাইন ইন",
  "nav.signOut": "সাইন আউট",
  "nav.browseEvents": "ইভেন্ট দেখুন",
  "prefs.language": "ভাষা",
  "prefs.languageNote":
    "একবার বেছে নিলেই এটি আপনার — অঞ্চল বদলালেও ভাষা বদলায় না।",
  "prefs.appearance": "চেহারা",
  "prefs.palette": "প্যালেট",
  "prefs.currency": "মুদ্রা",
  "prefs.region": "অঞ্চল",
  "notFound.eyebrow": "ভুল পথ",
  "notFound.title": "পেজটি এখানে নেই — দায়টা আমাদের, আপনার নয়।",
  "notFound.lead":
    "যে লিংকটি আপনাকে এখানে এনেছে সেটি এখন আর নেই। আপনি কিছু ভাঙেননি, আপনার কিছুই হারায়নি।",
  "notFound.returning": "আপনাকে আগের জায়গায় নিয়ে যাচ্ছি {n}…",
  "notFound.returningHome": "হোমপেজে নিয়ে যাচ্ছি {n}…",
  "notFound.cancelled": "স্বয়ংক্রিয় প্রত্যাবর্তন বন্ধ। যতক্ষণ চান থাকুন।",
  "notFound.hold": "কাউন্টডাউন থামাতে Esc চাপুন।",
  "notFound.back": "ফিরে যান",
  "notFound.explore": "আরও ঘুরে দেখুন",
  "notFound.home": "হোমপেজে যান",
};

const DICTIONARIES: Record<
  LanguageCode,
  Partial<Record<TranslationKey, string>>
> = {
  en: ENGLISH,
  es: SPANISH,
  fr: FRENCH,
  de: GERMAN,
  bn: BENGALI,
};

const STORAGE_KEY = "memorius:language:v1";

const KNOWN = new Set(LANGUAGES.map((language) => language.code));

function readStored(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw !== null && KNOWN.has(raw as LanguageCode)
      ? (raw as LanguageCode)
      : "en";
  } catch {
    return "en";
  }
}

function applyToDocument(language: LanguageCode) {
  if (typeof document === "undefined") return;
  // Screen readers, hyphenation and the browser's own spell check all key off
  // this, so it follows the choice rather than the region.
  document.documentElement.lang = language;
}

let current: LanguageCode = readStored();
applyToDocument(current);

const listeners = new Set<() => void>();

/** Only ever called from the menu — never from a location guess. */
export function setLanguage(language: LanguageCode) {
  if (!KNOWN.has(language) || language === current) return;
  current = language;
  applyToDocument(language);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // A browser that refuses storage still switches for this visit.
    }
  }
  for (const listener of listeners) listener();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function currentLanguage(): LanguageCode {
  return current;
}

export function languageByCode(code: LanguageCode) {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

/** English is the floor: a missing key reads as a finished sentence, not a gap. */
export function translate(
  language: LanguageCode,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let out = DICTIONARIES[language][key] ?? ENGLISH[key];
  if (vars !== undefined) {
    for (const [name, value] of Object.entries(vars)) {
      // split/join rather than replaceAll: the project's TS lib predates it.
      out = out.split(`{${name}}`).join(String(value));
    }
  }
  return out;
}

export function useLanguage(): LanguageCode {
  return useSyncExternalStore(
    subscribeLanguage,
    currentLanguage,
    currentLanguage,
  );
}

/** The dictionary bound to the current language, for use inside components. */
export function useT() {
  const language = useLanguage();
  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(language, key, vars),
    [language],
  );
}
