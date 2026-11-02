import { describe, expect, it } from "vitest";
import {
  WORKSPACE_TABS,
  tabsForMode,
  tabForKey,
} from "../../src/lib/workspace-tabs";

describe("WORKSPACE_TABS", () => {
  it("lists the four sidebar tabs in their fixed visual order", () => {
    // Issue #47: Design | Frame | Colors | Export. The order is part of the
    // UI contract (roving arrow-key navigation below depends on it).
    expect(WORKSPACE_TABS).toEqual(["design", "frame", "colors", "export"]);
  });
});

describe("tabsForMode", () => {
  it("Full mode shows every tab", () => {
    expect(tabsForMode("full")).toEqual(WORKSPACE_TABS);
  });

  it("Easy mode hides Frame", () => {
    expect(tabsForMode("easy")).toEqual(["design", "colors", "export"]);
  });
});

describe("tabForKey (WAI-ARIA tabs keyboard model)", () => {
  it("ArrowRight moves to the next tab", () => {
    expect(tabForKey(WORKSPACE_TABS, "design", "ArrowRight")).toBe("frame");
    expect(tabForKey(WORKSPACE_TABS, "frame", "ArrowRight")).toBe("colors");
  });

  it("ArrowLeft moves to the previous tab", () => {
    expect(tabForKey(WORKSPACE_TABS, "export", "ArrowLeft")).toBe("colors");
    expect(tabForKey(WORKSPACE_TABS, "frame", "ArrowLeft")).toBe("design");
  });

  it("wraps around at both ends", () => {
    expect(tabForKey(WORKSPACE_TABS, "export", "ArrowRight")).toBe("design");
    expect(tabForKey(WORKSPACE_TABS, "design", "ArrowLeft")).toBe("export");
  });

  it("Home and End jump to the first and last tab", () => {
    expect(tabForKey(WORKSPACE_TABS, "colors", "Home")).toBe("design");
    expect(tabForKey(WORKSPACE_TABS, "frame", "End")).toBe("export");
  });

  it("returns undefined for keys the tablist does not handle", () => {
    // The caller must not preventDefault() on these — Tab must still leave
    // the tablist, and character keys must not be swallowed.
    expect(tabForKey(WORKSPACE_TABS, "design", "Tab")).toBeUndefined();
    expect(tabForKey(WORKSPACE_TABS, "design", "Enter")).toBeUndefined();
    expect(tabForKey(WORKSPACE_TABS, "design", "a")).toBeUndefined();
    expect(tabForKey(WORKSPACE_TABS, "design", "ArrowDown")).toBeUndefined();
  });

  it("operates over a narrower Easy-mode tab list, skipping Frame", () => {
    const easyTabs = tabsForMode("easy");
    expect(tabForKey(easyTabs, "design", "ArrowRight")).toBe("colors");
    expect(tabForKey(easyTabs, "colors", "ArrowRight")).toBe("export");
    expect(tabForKey(easyTabs, "export", "ArrowRight")).toBe("design");
  });
});
