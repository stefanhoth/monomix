/**
 * Pure "is this a first run" predicate (issue #13: initials-reveal
 * onboarding). Deliberately decoupled from any specific storage backend —
 * it takes a small plain input rather than reading localStorage/IndexedDB
 * itself — so it's unit-testable without touching `window` and so #14
 * (IndexedDB projects/autosave) can later feed it real persisted state
 * ("does any Project exist?") without this function changing at all.
 */
export interface OnboardingState {
  /** Has the user finished onboarding — submitted initials or skipped?
   * Today this is a bare localStorage flag (see src/lib/onboarding.ts).
   * TODO(#14): once Projects persist, widen this to "onboarded OR any
   * Project exists" at the call site — the predicate itself stays a
   * simple negation. */
  onboardingComplete: boolean;
}

export function isFirstRun(state: OnboardingState): boolean {
  return !state.onboardingComplete;
}
