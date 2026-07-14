import { describe, expect, it } from "vitest";
import { WORKSPACE_TABS, tabForKey } from "../../src/lib/workspace-tabs";

describe("WORKSPACE_TABS", () => {
  it("lists the four sidebar tabs in their fixed visual order", () => {
    // Issue #47: Design | Frame | Colors | Export. The order is part of the
    // UI contract (roving arrow-key navigation below depends on it).
    expect(WORKSPACE_TABS).toEqual(["design", "frame", "colors", "export"]);
  });
});

describe("tabForKey (WAI-ARIA tabs keyboard model)", () => {
  it("ArrowRight moves to the next tab", () => {
    expect(tabForKey("design", "ArrowRight")).toBe("frame");
    expect(tabForKey("frame", "ArrowRight")).toBe("colors");
  });

  it("ArrowLeft moves to the previous tab", () => {
    expect(tabForKey("export", "ArrowLeft")).toBe("colors");
    expect(tabForKey("frame", "ArrowLeft")).toBe("design");
  });

  it("wraps around at both ends", () => {
    expect(tabForKey("export", "ArrowRight")).toBe("design");
    expect(tabForKey("design", "ArrowLeft")).toBe("export");
  });

  it("Home and End jump to the first and last tab", () => {
    expect(tabForKey("colors", "Home")).toBe("design");
    expect(tabForKey("frame", "End")).toBe("export");
  });

  it("returns undefined for keys the tablist does not handle", () => {
    // The caller must not preventDefault() on these — Tab must still leave
    // the tablist, and character keys must not be swallowed.
    expect(tabForKey("design", "Tab")).toBeUndefined();
    expect(tabForKey("design", "Enter")).toBeUndefined();
    expect(tabForKey("design", "a")).toBeUndefined();
    expect(tabForKey("design", "ArrowDown")).toBeUndefined();
  });
});
