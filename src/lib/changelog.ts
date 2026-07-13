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
  {
    id: "2026-07-13-whats-new",
    date: "2026-07-13",
    en: "This panel! A quick look at what's changed, with a badge here whenever there's something new.",
    de: "Dieses Panel! Ein schneller Überblick über Neuerungen, mit einem Hinweis hier, sobald es etwas Neues gibt.",
  },
  {
    id: "2026-07-13-i18n",
    date: "2026-07-13",
    en: "MonoMix now speaks German as well as English, matching your browser's language automatically.",
    de: "MonoMix spricht jetzt auch Deutsch, passend zur Sprache deines Browsers.",
  },
  {
    id: "2026-07-11-persistence",
    date: "2026-07-11",
    en: "Your work now saves itself as you go — reload anytime and pick up right where you left off. A Projects panel keeps your recent monograms within reach.",
    de: "Deine Arbeit wird jetzt automatisch gespeichert — lade jederzeit neu und mach genau dort weiter. Ein Projekte-Panel hält deine letzten Monogramme griffbereit.",
  },
  {
    id: "2026-07-11-onboarding",
    date: "2026-07-11",
    en: "First time here? Just enter your initials and watch your monogram gallery reveal itself.",
    de: "Zum ersten Mal hier? Gib einfach deine Initialen ein und sieh zu, wie sich deine Monogramm-Galerie entfaltet.",
  },
  {
    id: "2026-07-11-frames-colors",
    date: "2026-07-11",
    en: "Add a decorative Frame — circle, square, diamond, dotted, or dashed — and pick your own colors for letters, Frame, and background.",
    de: "Füge einen dekorativen Rahmen hinzu — Kreis, Quadrat, Raute, gepunktet oder gestrichelt — und wähle eigene Farben für Buchstaben, Rahmen und Hintergrund.",
  },
  {
    id: "2026-07-11-design-gallery",
    date: "2026-07-11",
    en: "A Design gallery shows every available style with your own letters, live — pick one and watch the preview update instantly.",
    de: "Eine Design-Galerie zeigt jeden verfügbaren Stil live mit deinen eigenen Buchstaben — wähle einen aus und die Vorschau aktualisiert sich sofort.",
  },
  {
    id: "2026-07-11-export",
    date: "2026-07-11",
    en: "Export your monogram as SVG, PNG, JPG, or PDF.",
    de: "Exportiere dein Monogramm als SVG, PNG, JPG oder PDF.",
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
