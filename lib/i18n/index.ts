import en from "./strings/en";
import fil from "./strings/fil";

export type Locale = "en" | "fil";
export type Strings = typeof en;

// Use a looser type so fil.ts literal strings don't need to match en.ts exactly.
// Both dictionaries have the same structure at runtime; only the values differ.
const dictionaries: Record<string, Record<string, unknown>> = {
  en: en as unknown as Record<string, unknown>,
  fil: fil as unknown as Record<string, unknown>,
};

/**
 * Get the dictionary for a locale.
 * Falls back to English if the key is missing in the requested locale.
 */
export function getDictionary(locale: Locale = "en"): Strings {
  return (dictionaries[locale] as unknown as Strings) || en;
}

/**
 * Resolve a locale from user preference, browser headers, or default.
 */
export function resolveLocale(preferred?: string | null, acceptLanguage?: string): Locale {
  if (preferred && preferred in dictionaries) {
    return preferred as Locale;
  }
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(",")[0].split("-")[0];
    if (preferredLocale === "fil" || preferredLocale === "tl") {
      return "fil";
    }
  }
  return "en";
}

/**
 * Dot-notation access to nested strings.
 * t('nav.dashboard') → 'Dashboard'
 * t('workers.trades.plumber') → 'Plumber'
 */
export function t(key: string, locale: Locale = "en"): string {
  const dict = getDictionary(locale);
  const keys = key.split(".");
  let current: unknown = dict;

  for (const k of keys) {
    if (current && typeof current === "object" && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k];
    } else {
      // Fallback to English
      const enDict = dictionaries.en;
      let enCurrent: unknown = enDict;
      for (const ek of keys) {
        if (enCurrent && typeof enCurrent === "object" && ek in (enCurrent as Record<string, unknown>)) {
          enCurrent = (enCurrent as Record<string, unknown>)[ek];
        } else {
          return key; // Return raw key as ultimate fallback
        }
      }
      return typeof enCurrent === "string" ? enCurrent : key;
    }
  }

  return typeof current === "string" ? current : key;
}
