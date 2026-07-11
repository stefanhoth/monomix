/**
 * Minimal localStorage-backed stand-in for "has the user finished
 * onboarding?" (issue #13). A thin DOM-adjacent read/write wrapper only —
 * the actual first-run decision logic lives in src/lib/first-run.ts
 * (isFirstRun), which stays storage-agnostic and unit-tested without
 * touching `window`.
 *
 * TODO(#14): once IndexedDB Project persistence lands, "first run?" should
 * really mean "no Project exists yet." Replace or extend this module to
 * source that (e.g. querying the project store) — isFirstRun()'s signature
 * won't need to change, only what feeds `onboardingComplete`.
 */
const STORAGE_KEY = "monomix:onboarded";

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}
