/**
 * Minimal localStorage-backed stand-in for "has the user finished
 * onboarding?" (issue #13). A thin DOM-adjacent read/write wrapper only —
 * the actual first-run decision logic lives in src/lib/first-run.ts
 * (isFirstRun), which stays storage-agnostic and unit-tested without
 * touching `window`.
 *
 * This runs on the app startup path (it decides first-run before the UI
 * renders), so reads/writes are guarded: a throwing localStorage (Safari
 * private mode, storage-blocked/enterprise contexts, some webviews)
 * degrades gracefully instead of crashing the app — treated as
 * not-yet-onboarded on read, silently ignored on write.
 *
 * TODO(#14): once IndexedDB Project persistence lands, "first run?" should
 * really mean "no Project exists yet." Replace or extend this module to
 * source that (e.g. querying the project store) — isFirstRun()'s signature
 * won't need to change, only what feeds `onboardingComplete`.
 */
const STORAGE_KEY = "monomix:onboarded";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage unavailable (private mode, blocked storage, etc.) — don't
    // block the user from proceeding; it just won't persist this session.
  }
}
