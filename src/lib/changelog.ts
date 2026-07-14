/**
 * Curated in-app "What's new?" data (issue #17, ADR 0005) — hand-written,
 * benefit-language entries for end users. Deliberately separate from the
 * technical CHANGELOG.md (Keep a Changelog, every user-visible PR) and the
 * CalVer GitHub Releases: this one is moderated, so release noise never
 * reaches the panel.
 *
 * Ordered newest first. `id` doubles as the "seen" marker (changelog-seen
 * logic below compares it against the last-seen id in storage), so it only
 * needs to change whenever a new entry is prepended — the date format and
 * entry count are free to evolve.
 */
export interface ChangelogEntry {
  id: string;
  /** ISO date (YYYY-MM-DD) — used only to group entries by month. */
  date: string;
  en: string;
  de: string;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  // Launch-day catalog: MonoMix ships today, so the panel describes the
  // product as it is — not an incremental "X changed" history predating a
  // launch no user ever saw.
  {
    id: "2026-07-14-launch",
    date: "2026-07-14",
    en: "MonoMix is here — mix your monogram live from curated Designs (classic circle and diamond monograms included), wrap it in a decorative Frame, and make the colors yours.",
    de: "MonoMix ist da — mixe dein Monogramm live aus kuratierten Designs (klassische Kreis- und Rauten-Monogramme inklusive), lege einen dekorativen Rahmen darum und mach die Farben zu deinen.",
  },
  {
    id: "2026-07-14-launch-export",
    date: "2026-07-14",
    en: "Take it with you: export as SVG, PNG, JPG, or PDF — in any size you need.",
    de: "Zum Mitnehmen: Export als SVG, PNG, JPG oder PDF — in jeder Größe, die du brauchst.",
  },
  {
    id: "2026-07-14-launch-remix",
    date: "2026-07-14",
    en: "Your work saves itself in your browser as you go, and any earlier Project can be remixed into a fresh one with a single click.",
    de: "Deine Arbeit speichert sich beim Arbeiten von selbst im Browser, und jedes frühere Projekt lässt sich mit einem Klick zu einem neuen remixen.",
  },
];

export interface ChangelogMonthGroup {
  /** "YYYY-MM" — pass to Intl.DateTimeFormat for a locale-aware label. */
  monthKey: string;
  entries: ChangelogEntry[];
}

/**
 * Groups entries by calendar month, preserving the input order within and
 * across groups. Assumes `entries` is already sorted newest-first (true of
 * CHANGELOG_ENTRIES above) — this only merges adjacent same-month entries,
 * it doesn't sort.
 */
export function groupEntriesByMonth(
  entries: ChangelogEntry[],
): ChangelogMonthGroup[] {
  const groups: ChangelogMonthGroup[] = [];
  for (const entry of entries) {
    const monthKey = entry.date.slice(0, 7);
    const current = groups.at(-1);
    if (current && current.monthKey === monthKey) {
      current.entries.push(entry);
    } else {
      groups.push({ monthKey, entries: [entry] });
    }
  }
  return groups;
}

/** The id new entries get compared against — undefined only if the list is ever empty. */
export function latestEntryId(entries: ChangelogEntry[]): string | undefined {
  return entries[0]?.id;
}

/**
 * Pure "is there something the user hasn't seen yet" predicate — takes the
 * last-seen id as a plain value rather than reading storage itself, so it's
 * directly unit-testable (mirrors src/lib/first-run.ts's split from its
 * localStorage-backed counterpart, src/lib/onboarding.ts). The localStorage
 * half lives in changelog-storage.ts.
 */
export function hasUnseenEntries(
  entries: ChangelogEntry[],
  lastSeenId: string | null,
): boolean {
  const latest = latestEntryId(entries);
  return latest !== undefined && latest !== lastSeenId;
}
