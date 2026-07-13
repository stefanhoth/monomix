import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLastSeenEntryId,
  markEntrySeen,
} from "../../src/lib/changelog-storage";

describe("changelog seen storage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips the last-seen entry id through localStorage", () => {
    expect(getLastSeenEntryId()).toBeNull();
    markEntrySeen("2026-07-13-whats-new");
    expect(getLastSeenEntryId()).toBe("2026-07-13-whats-new");
  });

  it("getLastSeenEntryId returns null when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(getLastSeenEntryId()).toBeNull();
  });

  it("markEntrySeen does not throw when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => markEntrySeen("2026-07-13-whats-new")).not.toThrow();
  });
});
