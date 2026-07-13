import type { Locale } from "./dictionary";
import { isSupportedLocale } from "./locale";

/**
 * localStorage-backed manual locale override — mirrors onboarding.ts's
 * guarded read/write pattern (Safari private mode, storage-blocked
 * contexts, etc. degrade gracefully instead of crashing the app).
 */
const STORAGE_KEY = "monomix:locale";

export function getStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable — the choice just won't persist this session.
  }
}
