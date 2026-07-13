import { describe, expect, it } from "vitest";
import {
  fitScale,
  fitCircleScale,
  scaleLayout,
  fitLayoutToFrame,
} from "../../src/engine/fit";
import { VIEWBOX_SIZE, type Layout } from "../../src/engine/layout";
import { frameInnerExtent } from "../../src/engine/frames";

describe("fitScale", () => {
  it("square: scales by the Chebyshev (max) norm — the larger half-extent must reach the boundary", () => {
    // 200x100 block (half-extents 100x50) fit into a 50-half-extent square:
    // the wider half-extent (100) is the binding constraint.
    expect(fitScale(200, 100, 50, "square")).toBeCloseTo(0.5);
  });

  it("square: a scale of 1 means the block's bounding box already touches the boundary", () => {
    // Half-extents 100x50 — the wider half-extent (100) already equals extent.
    expect(fitScale(200, 100, 100, "square")).toBeCloseTo(1);
  });

  it("circle: scales by the Euclidean (diagonal) norm", () => {
    // Half-extents 3 and 4 (a 3-4-5 triangle) have a half-diagonal of
    // exactly 5, so a circle of extent 5 needs no further scaling.
    expect(fitScale(6, 8, 5, "circle")).toBeCloseTo(1);
  });

  it("dotted-circle and dashed-circle share the circle's Euclidean norm", () => {
    expect(fitScale(6, 8, 5, "dotted-circle")).toBeCloseTo(1);
    expect(fitScale(6, 8, 5, "dashed-circle")).toBeCloseTo(1);
  });

  it("diamond: scales by the Manhattan (sum) norm — stricter than a circle at the same extent", () => {
    // Half-extents 3 and 2 sum to 5, so a diamond of extent 5 needs no
    // further scaling.
    expect(fitScale(6, 4, 5, "diamond")).toBeCloseTo(1);
  });

  it("a diamond permits a smaller block than a circle of the same extent", () => {
    // Same starting block, same extent — the diamond (L1) is always at
    // least as strict as the circle (L2) by the norm inequality.
    const diamondScale = fitScale(100, 100, 100, "diamond");
    const circleScale = fitScale(100, 100, 100, "circle");
    expect(diamondScale).toBeLessThan(circleScale);
  });

  it("gap 0 (the full extent): the natural block size only determines the scale ratio, not the outcome", () => {
    // Regardless of the block's starting size, the scaled result always
    // exactly reaches `extent` — this is what "0 = lettering fills the
    // Frame's inner boundary" (issue #36) means mechanically.
    const blocks: Array<{ w: number; h: number }> = [
      { w: 10, h: 10 },
      { w: 500, h: 20 },
      { w: 37, h: 812 },
    ];
    for (const { w, h } of blocks) {
      const extent = 200;
      const scale = fitScale(w, h, extent, "circle");
      const halfW = (w / 2) * scale;
      const halfH = (h / 2) * scale;
      expect(Math.sqrt(halfW ** 2 + halfH ** 2)).toBeCloseTo(extent);
    }
  });

  it("a shrinking extent (larger gap) always produces a smaller scale", () => {
    const scaleAtFullExtent = fitScale(300, 200, 200, "square");
    const scaleAtHalfExtent = fitScale(300, 200, 100, "square");
    expect(scaleAtHalfExtent).toBeLessThan(scaleAtFullExtent);
  });

  it("an extent of 0 (gap consumed the whole inner boundary) scales the block to nothing, not NaN or negative", () => {
    for (const shape of [
      "square",
      "circle",
      "diamond",
      "dotted-circle",
      "dashed-circle",
    ] as const) {
      const scale = fitScale(300, 200, 0, shape);
      expect(scale).toBe(0);
      expect(Number.isFinite(scale)).toBe(true);
    }
  });

  it("a degenerate zero-size block doesn't divide by zero", () => {
    expect(fitScale(0, 0, 200, "circle")).toBe(1);
  });
});

describe("fitCircleScale (issue #37: fitting an already-warped, circular Shape block into a Frame)", () => {
  it("square and circle Frames give a disc the same scale — its boundary already IS the extremal shape a Euclidean disc is measured against in both norms", () => {
    expect(fitCircleScale(100, 200, "square")).toBeCloseTo(2);
    expect(fitCircleScale(100, 200, "circle")).toBeCloseTo(2);
    expect(fitCircleScale(100, 200, "dotted-circle")).toBeCloseTo(2);
    expect(fitCircleScale(100, 200, "dashed-circle")).toBeCloseTo(2);
  });

  it("at that scale, the disc's radius exactly reaches `extent` for square/circle Frames", () => {
    const scale = fitCircleScale(100, 200, "circle");
    expect(100 * scale).toBeCloseTo(200);
  });

  it("a diamond Frame is stricter than a circle/square Frame at the same extent — its closest boundary point to center sits at 45 degrees, not on an axis", () => {
    const diamondScale = fitCircleScale(100, 200, "diamond");
    const circleScale = fitCircleScale(100, 200, "circle");
    expect(diamondScale).toBeLessThan(circleScale);
    expect(diamondScale).toBeCloseTo(200 / (100 * Math.SQRT2));
  });

  it("regression: does NOT reuse fitScale's rectangular-corner formula (which would wrongly shrink a circle Frame's fit to ~70.7% and a diamond Frame's to 50%)", () => {
    // Before the fix, composeShapedLetters called
    // fitScale(2*radius, 2*radius, extent, shape) — treating the disc as if
    // it were a square block whose CORNERS must reach the boundary. That
    // under-fits both the circle and diamond norms versus the correct
    // "a disc's own boundary is what matters" formula asserted above.
    const radius = 100;
    const extent = 200;
    const buggyCircleScale = fitScale(radius * 2, radius * 2, extent, "circle");
    const buggyDiamondScale = fitScale(
      radius * 2,
      radius * 2,
      extent,
      "diamond",
    );
    expect(fitCircleScale(radius, extent, "circle")).toBeGreaterThan(
      buggyCircleScale,
    );
    expect(fitCircleScale(radius, extent, "diamond")).toBeGreaterThan(
      buggyDiamondScale,
    );
  });

  it("a shrinking extent (larger gap) always produces a smaller scale", () => {
    expect(fitCircleScale(100, 100, "circle")).toBeLessThan(
      fitCircleScale(100, 200, "circle"),
    );
  });

  it("an extent of 0 scales the disc to nothing, not NaN or negative", () => {
    for (const shape of ["square", "circle", "diamond"] as const) {
      expect(fitCircleScale(100, 0, shape)).toBe(0);
    }
  });

  it("a degenerate zero-radius disc doesn't divide by zero", () => {
    expect(fitCircleScale(0, 200, "circle")).toBe(1);
  });
});

describe("scaleLayout", () => {
  const layout: Layout = {
    letters: [
      { letter: "A", x: 400, y: 600, fontSize: 300 },
      { letter: "B", x: 600, y: 600, fontSize: 300 },
    ],
    blockWidth: 400,
    blockHeight: 200,
  };
  const CENTER = VIEWBOX_SIZE / 2;

  it("scales font sizes and block dimensions by the given factor", () => {
    const scaled = scaleLayout(layout, 0.5);
    expect(scaled.letters.map((l) => l.fontSize)).toEqual([150, 150]);
    expect(scaled.blockWidth).toBe(200);
    expect(scaled.blockHeight).toBe(100);
  });

  it("scales positions about the canvas center, keeping the block centered", () => {
    const scaled = scaleLayout(layout, 0.5);
    const [a, b] = scaled.letters;
    if (!a || !b) throw new Error("expected two positioned letters");
    // x=400 is 100 units left of center (500); at half scale that becomes 50.
    expect(a.x).toBe(CENTER - 50);
    expect(b.x).toBe(CENTER + 50);
  });

  it("a scale of 1 is a no-op on the geometry", () => {
    const scaled = scaleLayout(layout, 1);
    expect(scaled.letters).toEqual(layout.letters);
    expect(scaled.blockWidth).toBe(layout.blockWidth);
    expect(scaled.blockHeight).toBe(layout.blockHeight);
  });
});

describe("fitLayoutToFrame", () => {
  const layout: Layout = {
    letters: [{ letter: "A", x: 500, y: 500, fontSize: 400 }],
    blockWidth: 400,
    blockHeight: 200,
  };

  it("is a no-op for 'No Frame' (id 'none') or an unrecognized id", () => {
    expect(fitLayoutToFrame(layout, { id: "none" })).toEqual(layout);
    expect(fitLayoutToFrame(layout, { id: "not-a-real-frame" })).toEqual(
      layout,
    );
  });

  it("at gap 0, scales the block to exactly reach the Frame's inner extent", () => {
    const fitted = fitLayoutToFrame(layout, { id: "circle", gap: 0 });
    const extent = frameInnerExtent();
    const halfW = fitted.blockWidth / 2;
    const halfH = fitted.blockHeight / 2;
    expect(Math.sqrt(halfW ** 2 + halfH ** 2)).toBeCloseTo(extent);
  });

  it("a larger gap produces a smaller fitted block than a smaller gap", () => {
    const smallGap = fitLayoutToFrame(layout, { id: "square", gap: 10 });
    const largeGap = fitLayoutToFrame(layout, { id: "square", gap: 200 });
    expect(largeGap.blockWidth).toBeLessThan(smallGap.blockWidth);
  });

  it("defaults gap to DEFAULT_GAP when omitted, matching an explicit call", () => {
    const omitted = fitLayoutToFrame(layout, { id: "circle" });
    const explicit = fitLayoutToFrame(layout, { id: "circle", gap: 40 });
    expect(omitted).toEqual(explicit);
  });
});
