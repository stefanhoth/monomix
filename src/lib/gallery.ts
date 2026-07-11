import type { Design, LetterCount } from "../engine";

/** Only Designs that support the current Letter Count show in the gallery. */
export function filterDesignsByLetterCount(
  designs: Design[],
  count: LetterCount,
): Design[] {
  return designs.filter((d) => d.supports.includes(count));
}

/**
 * Keeps the current selection if it's still in `available` (e.g. after a
 * Letter Count change); otherwise falls back to the first available Design.
 * Throws if `available` is empty — the catalog always has entries for every
 * Letter Count (tests/unit/designs.test.ts), so an empty list here would
 * mean the catalog itself is broken, not a normal runtime state to recover from.
 */
export function resolveSelectedDesignId(
  currentId: string | undefined,
  available: Design[],
): string {
  if (currentId && available.some((d) => d.id === currentId)) {
    return currentId;
  }
  const fallback = available[0];
  if (!fallback) {
    throw new Error(
      "resolveSelectedDesignId: no Designs available to fall back to",
    );
  }
  return fallback.id;
}
