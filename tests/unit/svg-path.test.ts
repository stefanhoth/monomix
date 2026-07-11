import { describe, expect, it } from "vitest";
import type { PathCommand } from "opentype.js";
import { pathCommandsToSvgData } from "../../src/engine/svg-path";

describe("pathCommandsToSvgData", () => {
  it("serializes each command type", () => {
    const commands: PathCommand[] = [
      { type: "M", x: 1, y: 2 },
      { type: "L", x: 3, y: 4 },
      { type: "Q", x1: 5, y1: 6, x: 7, y: 8 },
      { type: "C", x1: 9, y1: 10, x2: 11, y2: 12, x: 13, y: 14 },
      { type: "Z" },
    ];
    expect(pathCommandsToSvgData(commands)).toBe(
      "M1.00 2.00L3.00 4.00Q5.00 6.00 7.00 8.00C9.00 10.00 11.00 12.00 13.00 14.00Z",
    );
  });

  it("regression: never emits NaN for coordinates that float-point-drift to just above a whole number", () => {
    // 440.00000000000006 is the exact value that triggered opentype.js's
    // own toPathData() to emit "NaN" (see svg-path.ts doc comment) — its
    // decimal remainder (5.68e-14) is itself in exponential notation, which
    // breaks opentype's string-concatenation rounding trick.
    const commands: PathCommand[] = [
      {
        type: "Q",
        x1: 411.7073170731707,
        y1: 440.00000000000006,
        x: 412.2,
        y: 435.6,
      },
    ];
    const d = pathCommandsToSvgData(commands);
    expect(d).not.toContain("NaN");
    expect(d).toBe("Q411.71 440.00 412.20 435.60");
  });

  it("never emits NaN across a sweep of values near whole numbers", () => {
    for (let i = 0; i < 1000; i++) {
      const nearWhole = 100 + i * Number.EPSILON * 1e6;
      const d = pathCommandsToSvgData([
        { type: "L", x: nearWhole, y: nearWhole },
      ]);
      expect(d).not.toContain("NaN");
    }
  });
});
