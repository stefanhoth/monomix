import { describe, expect, it } from "vitest";
import { COLOR_PRESETS } from "../../src/lib/color-presets";
import { dictionary } from "../../src/lib/i18n/dictionary";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

describe("COLOR_PRESETS", () => {
  it("has no duplicate ids", () => {
    const ids = COLOR_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is a handful — small enough to render as one screenful of swatches", () => {
    expect(COLOR_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(COLOR_PRESETS.length).toBeLessThanOrEqual(8);
  });

  it("every preset's colors are valid hex, and its name is a real dictionary key", () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset.lettersColor).toMatch(HEX_COLOR);
      if (preset.backgroundKind === "color") {
        expect(preset.backgroundColor).toMatch(HEX_COLOR);
      }
      expect(dictionary).toHaveProperty(preset.nameKey);
    }
  });
});
