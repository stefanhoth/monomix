import { LOCALES, type Locale } from "./dictionary";

const DEFAULT_LOCALE: Locale = "en";

export function isSupportedLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

/**
 * Picks a supported Locale from a BCP-47 language tag such as "de-DE" or
 * "en-US" (i.e. `navigator.language`). Storage-agnostic and DOM-free so it's
 * directly unit-testable; the reactive/localStorage half lives in
 * store.svelte.ts.
 */
export function resolveBrowserLocale(languageTag: string | undefined): Locale {
  if (!languageTag) return DEFAULT_LOCALE;
  const primary = languageTag.split("-")[0]?.toLowerCase();
  return primary && isSupportedLocale(primary) ? primary : DEFAULT_LOCALE;
}
