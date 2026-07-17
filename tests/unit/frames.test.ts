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

// Issue #65 second follow-up: fading the letters' own opacity toward the
// fill's flat color produced no visible difference at all (there was
// nothing *underneath* the fill to reveal) — a real hole through the fill
// is needed instead, via an SVG mask.
describe("composeFrame (fill cutout, issue #65 second follow-up)", () => {
  const CUTOUT = '<path d="M0 0 L10 10"/>';

  it("ignores cutout entirely when fill is not set", () => {
    expect(composeFrame("circle", { cutout: CUTOUT })).toBe(
      composeFrame("circle"),
    );
  });

  it("wraps the cutout in a <mask> and applies it to the fill shape, not the stroke", () => {
    const svg = composeFrame("circle", { fill: "#00ff00", cutout: CUTOUT });
    expect(svg).toContain("<mask");
    expect(svg).toContain(CUTOUT);
    const maskIdMatch = svg.match(/<mask id="([^"]+)"/);
    expect(maskIdMatch).not.toBeNull();
    const maskId = maskIdMatch![1];
    // The fill shape carries the mask reference; the stroke does not — only
    // one "mask=" attribute in the whole output (the fill's).
    expect(svg).toContain(`fill="#00ff00" mask="url(#${maskId})"`);
    expect(svg.match(/ mask=/g)).toHaveLength(1);
  });

  it("draws the cutout in black over a white copy of the fill shape (mask semantics: white keeps, black hides)", () => {
    const svg = composeFrame("circle", { fill: "#00ff00", cutout: CUTOUT });
    const maskContent = svg.match(/<mask[^>]*>(.*?)<\/mask>/)![1];
    expect(maskContent).toContain('fill="white"');
    expect(maskContent).toContain('<g fill="black">');
  });

  it("gives identical fills different mask ids when the cutout differs, so multiple cutout monograms in one document don't collide", () => {
    const a = composeFrame("circle", { fill: "#00ff00", cutout: CUTOUT });
    const b = composeFrame("circle", {
      fill: "#00ff00",
      cutout: '<path d="M5 5 L20 20"/>',
    });
    const idOf = (svg: string) => svg.match(/<mask id="([^"]+)"/)![1];
    expect(idOf(a)).not.toBe(idOf(b));
  });

  it("is a pure function with cutout set too", () => {
    expect(composeFrame("diamond", { fill: "#123456", cutout: CUTOUT })).toBe(
      composeFrame("diamond", { fill: "#123456", cutout: CUTOUT }),
    );
  });
});
