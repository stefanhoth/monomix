import { describe, expect, it } from "vitest";
import { FONTS } from "../../src/engine/fonts";

describe("font catalog", () => {
  it("resolves a url for every catalog entry", () => {
    expect(FONTS.length).toBe(17);
    for (const font of FONTS) {
      expect(font.url).toMatch(/font\.ttf$/);
    }
  });

  it("has unique ids", () => {
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
