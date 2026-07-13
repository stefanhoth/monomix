import { translate, type DictKey, type Locale } from "./dictionary";
import { resolveBrowserLocale } from "./locale";
import { getStoredLocale, setStoredLocale } from "./storage";

/**
 * App-wide reactive locale, a plain module-level $state singleton — this is
 * a single-screen app (no routing/context tree to thread a store through),
 * so any component can import getLocale/setLocale/t directly. Defaults to a
 * stored manual override if one exists, else the browser language.
 */
const initialLocale =
  getStoredLocale() ?? resolveBrowserLocale(navigator.language);
document.documentElement.lang = initialLocale;
let locale = $state<Locale>(initialLocale);

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  locale = next;
  setStoredLocale(next);
  document.documentElement.lang = next;
}

export function t(key: DictKey, params?: Record<string, string>): string {
  return translate(key, locale, params);
}
