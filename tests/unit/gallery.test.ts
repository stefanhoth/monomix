import { describe, expect, it } from "vitest";
import {
  filterDesignsByLetterCount,
  resolveSelectedDesignId,
} from "../../src/lib/gallery";
import type { Design } from "../../src/engine";

function design(id: string, supports: Design["supports"]): Design {
  return {
    id,
    name: id,
    fontId: "cinzel",
    arrangement: "horizontal",
    supports,
  };
}

const DESIGNS: Design[] = [
  design("a-classic", [1, 2, 3]),
  design("a-stacked", [2, 3]),
  design("b-classic", [1, 2, 3]),
];

describe("filterDesignsByLetterCount", () => {
  it("includes only Designs that support the given count", () => {
    expect(filterDesignsByLetterCount(DESIGNS, 1).map((d) => d.id)).toEqual([
      "a-classic",
      "b-classic",
    ]);
    expect(filterDesignsByLetterCount(DESIGNS, 2).map((d) => d.id)).toEqual([
      "a-classic",
      "a-stacked",
      "b-classic",
    ]);
  });
});

describe("resolveSelectedDesignId", () => {
  it("keeps the current selection when it's still available", () => {
    const available = filterDesignsByLetterCount(DESIGNS, 3);
    expect(resolveSelectedDesignId("a-stacked", available)).toBe("a-stacked");
  });

  it("falls back to the first available Design when the current selection is no longer supported", () => {
    const available = filterDesignsByLetterCount(DESIGNS, 1); // a-stacked doesn't support 1
    expect(resolveSelectedDesignId("a-stacked", available)).toBe("a-classic");
  });

  it("falls back when there is no current selection", () => {
    const available = filterDesignsByLetterCount(DESIGNS, 2);
    expect(resolveSelectedDesignId(undefined, available)).toBe("a-classic");
  });

  it("throws if no Designs are available to fall back to", () => {
    expect(() => resolveSelectedDesignId("anything", [])).toThrow();
  });
});
