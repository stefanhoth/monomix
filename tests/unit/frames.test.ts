import { describe, expect, it } from "vitest";
import { FRAMES, NO_FRAME_ID, composeFrame } from "../../src/engine/frames";

const SHAPED_FRAME_IDS = FRAMES.filter((f) => f.shape !== null).map(
  (f) => f.id,
);

describe("FRAMES catalog", () => {
  it("has no duplicate ids", () => {
    const ids = FRAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes No Frame as a valid, default-shaped entry", () => {
    const noFrame = FRAMES.find((f) => f.id === NO_FRAME_ID);
    expect(noFrame).toBeDefined();
    expect(noFrame?.shape).toBeNull();
  });

  it("has more than one real shape (a small catalog, not just No Frame)", () => {
    expect(SHAPED_FRAME_IDS.length).toBeGreaterThanOrEqual(3);
  });
});

describe("composeFrame", () => {
  it("throws for an unknown frame id", () => {
    expect(() => composeFrame("not-a-real-frame")).toThrow();
  });

  it("produces no markup for No Frame", () => {
    expect(composeFrame(NO_FRAME_ID)).toBe("");
  });

  it.each(SHAPED_FRAME_IDS)(
    "%s produces valid, unfilled stroke geometry at a range of stroke widths",
    (id) => {
      for (const strokeWidth of [1, 20, 100, 300]) {
        const svg = composeFrame(id, { strokeWidth });
        expect(svg.length).toBeGreaterThan(0);
        expect(svg).toContain('fill="none"');
        expect(svg).toContain("stroke=");
        expect(svg).not.toContain("NaN");
        expect(svg).not.toContain("-r=");
        expect(svg).not.toMatch(/r="-/);
      }
    },
  );

  it("clamps to a non-negative radius instead of producing invalid geometry for an extreme stroke width", () => {
    const svg = composeFrame("circle", { strokeWidth: 10000 });
    expect(svg).toContain('r="0"');
  });

  it("sits at a fixed position regardless of Frame Gap — gap is not one of its options", () => {
    // Issue #36: the Frame no longer moves when Frame Gap changes, only the
    // lettering scales inside it (src/engine/fit.ts), so composeFrame's own
    // geometry is independent of any gap value.
    expect(composeFrame("circle")).toBe(composeFrame("circle", {}));
  });

  it("respects a custom color and stroke width", () => {
    const svg = composeFrame("circle", { color: "#ff0000", strokeWidth: 5 });
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('stroke-width="5"');
  });

  it("is a pure function: identical input produces identical output", () => {
    expect(composeFrame("diamond", { strokeWidth: 30 })).toBe(
      composeFrame("diamond", { strokeWidth: 30 }),
    );
  });
});

// Issue #65 follow-up: without *some* filled area, reduced Letter Opacity
// has nothing to cut a visible stencil out of — a bare stroked ring plus a
// transparent Background just disappears (issue #65 comment).
describe("composeFrame (interior fill, issue #65 follow-up)", () => {
  it("omits any fill markup by default, unchanged from before the option existed", () => {
    expect(composeFrame("circle")).not.toContain('fill="#');
  });

  it.each(SHAPED_FRAME_IDS)(
    "%s draws a filled shape before its stroke when fill is set",
    (id) => {
      const svg = composeFrame(id, { fill: "#00ff00" });
      expect(svg.indexOf('fill="#00ff00"')).toBeLessThan(
        svg.indexOf('fill="none"'),
      );
      expect(svg).not.toContain("NaN");
    },
  );

  it("leaves the stroked ring exactly as before when fill is added (additive, not a replacement)", () => {
    const unfilled = composeFrame("circle", { color: "#ff0000" });
    const filled = composeFrame("circle", {
      color: "#ff0000",
      fill: "#00ff00",
    });
    expect(filled).toContain(unfilled);
  });

  it("treats an explicit 'transparent' fill the same as omitting it", () => {
    expect(composeFrame("circle", { fill: "transparent" })).toBe(
      composeFrame("circle"),
    );
  });

  it("sanitizes an unsafe fill color instead of injecting it", () => {
    const svg = composeFrame("circle", {
      fill: 'red" onload="alert(1)',
    });
    expect(svg).not.toContain("onload");
  });

  it("is a pure function with fill set too", () => {
    expect(composeFrame("square", { fill: "#123456" })).toBe(
      composeFrame("square", { fill: "#123456" }),
    );
  });
});
