import { describe, expect, it } from "vitest";
import type { Font } from "opentype.js";
import { DESIGNS } from "../../src/engine/designs";
import { composeMonogram } from "../../src/engine/render";
import { loadTestFont } from "./helpers/load-test-font";

const SAMPLE_LETTERS: Record<number, string> = { 1: "A", 2: "AB", 3: "ABC" };

const fontCache = new Map<string, Font>();
function fontFor(fontId: string): Font {
  const cached = fontCache.get(fontId);
  if (cached) return cached;
  const font = loadTestFont(fontId);
  fontCache.set(fontId, font);
  return font;
}

describe("DESIGNS catalog", () => {
  it("has at least 10 designs supporting 2- and 3-letter monograms", () => {
    const supports2 = DESIGNS.filter((d) => d.supports.includes(2));
    const supports3 = DESIGNS.filter((d) => d.supports.includes(3));
    expect(supports2.length).toBeGreaterThanOrEqual(10);
    expect(supports3.length).toBeGreaterThanOrEqual(10);
  });

  it("has at least a few designs supporting 1-letter monograms", () => {
    const supports1 = DESIGNS.filter((d) => d.supports.includes(1));
    expect(supports1.length).toBeGreaterThanOrEqual(3);
  });

  it("has no duplicate ids", () => {
    const ids = DESIGNS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least one circle Shape Design for every Letter Count (issue #37)", () => {
    for (const count of [1, 2, 3] as const) {
      const circleDesigns = DESIGNS.filter(
        (d) => d.shape === "circle" && d.supports.includes(count),
      );
      expect(circleDesigns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it.each(
    DESIGNS.flatMap((design) =>
      design.supports.map((count) => ({ design, count })),
    ),
  )(
    "$design.id composes a valid monogram for $count-letter input",
    ({ design, count }) => {
      const font = fontFor(design.fontId);
      const letters = SAMPLE_LETTERS[count];
      if (!letters) throw new Error(`no sample letters for count ${count}`);

      const svg = composeMonogram(letters, font, {
        arrangement: design.arrangement,
        shape: design.shape,
      });

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect((svg.match(/<path /g) ?? []).length).toBe(count);
      expect(svg).not.toContain("NaN");
    },
  );
});
