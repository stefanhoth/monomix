/**
 * Pure "is this a first run" predicate (issue #13: initials-reveal
 * onboarding). Deliberately decoupled from any specific storage backend —
 * it takes a small plain input rather than reading localStorage/IndexedDB
 * itself — so it's unit-testable without touching `window`. That decoupling
 * is what let #14 (IndexedDB Projects/autosave) widen what feeds
 * `onboardingComplete` at the App.svelte call site — "onboarded OR any
 * Project exists" — without this function itself changing at all.
 */
export interface OnboardingState {
  /** Has the user finished onboarding — submitted initials or skipped —
   * OR does a Project already exist? App.svelte ORs together the
   * localStorage flag (src/lib/onboarding.ts) and "does any Project exist"
   * (src/lib/project-store.ts) before calling this predicate; see #14. */
  onboardingComplete: boolean;
}

export function isFirstRun(state: OnboardingState): boolean {
  return !state.onboardingComplete;
}
