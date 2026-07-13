import { describe, expect, it } from "vitest";
import {
  groupEntriesByMonth,
  hasUnseenEntries,
  latestEntryId,
  type ChangelogEntry,
} from "../../src/lib/changelog";

const entries: ChangelogEntry[] = [
  { id: "2026-08-02-b", date: "2026-08-02", en: "b", de: "b" },
  { id: "2026-08-01-a", date: "2026-08-01", en: "a", de: "a" },
  { id: "2026-07-11-c", date: "2026-07-11", en: "c", de: "c" },
];

describe("groupEntriesByMonth", () => {
  it("merges adjacent entries from the same month, preserving order", () => {
    expect(groupEntriesByMonth(entries)).toEqual([
      { monthKey: "2026-08", entries: [entries[0], entries[1]] },
      { monthKey: "2026-07", entries: [entries[2]] },
    ]);
  });

  it("returns an empty list for no entries", () => {
    expect(groupEntriesByMonth([])).toEqual([]);
  });
});

describe("latestEntryId", () => {
  it("returns the id of the first (newest) entry", () => {
    expect(latestEntryId(entries)).toBe("2026-08-02-b");
  });

  it("returns undefined for an empty list", () => {
    expect(latestEntryId([])).toBeUndefined();
  });
});

describe("hasUnseenEntries", () => {
  it("is true when nothing has been seen yet", () => {
    expect(hasUnseenEntries(entries, null)).toBe(true);
  });

  it("is true when the last-seen id is older than the newest entry", () => {
    expect(hasUnseenEntries(entries, "2026-08-01-a")).toBe(true);
  });

  it("is false once the newest entry has been seen", () => {
    expect(hasUnseenEntries(entries, "2026-08-02-b")).toBe(false);
  });

  it("is false for an empty list regardless of last-seen id", () => {
    expect(hasUnseenEntries([], null)).toBe(false);
  });
});
