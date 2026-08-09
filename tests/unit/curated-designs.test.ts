import { describe, expect, it } from "vitest";
import type { Font } from "opentype.js";
import { DESIGNS, FRAMES, composeMonogram } from "../../src/engine";
import {
  CURATED_DESIGNS,
  curatedDesignSettings,
  type CuratedDesignEntry,
} from "../../src/lib/curated-designs";
import {
  resolveProjectBackground,
  resolveProjectFrameFill,
  resolveProjectFramePaint,
  resolveProjectLettersPaint,
} from "../../src/lib/project";
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

describe("CURATED_DESIGNS", () => {
  it("has no duplicate ids", () => {
    const ids = CURATED_DESIGNS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stays a small, curated set — a handful of starting points, not a subset of the full catalog", () => {
    // EasyDesignGallery.svelte (the one consumer) renders every tile with
    // its true gradient/fill, same as this dataset's original one-time
    // jump-off-gallery incarnation — see docs/DECISIONS.md, 2026-08-08. This
    // size bound is about staying curated, not about render fidelity.
    expect(CURATED_DESIGNS.length).toBeGreaterThanOrEqual(6);
    expect(CURATED_DESIGNS.length).toBeLessThanOrEqual(9);
  });

  it.each(CURATED_DESIGNS)(
    "$id references a real Design supporting every Letter Count",
    (entry: CuratedDesignEntry) => {
      const settings = curatedDesignSettings(entry);
      const design = DESIGNS.find((d) => d.id === settings.designId);
      expect(design, `unknown designId "${settings.designId}"`).toBeDefined();
      // Curated entries deliberately stick to Designs that support 1-3
      // letters, so the gallery never needs to filter by Letter Count the
      // way the full DesignGallery does (see curated-designs.ts).
      expect(design?.supports).toEqual(expect.arrayContaining([1, 2, 3]));
    },
  );

  it.each(CURATED_DESIGNS)(
    "$id references a real Frame",
    (entry: CuratedDesignEntry) => {
      const settings = curatedDesignSettings(entry);
      const frame = FRAMES.find((f) => f.id === settings.frameId);
      expect(frame, `unknown frameId "${settings.frameId}"`).toBeDefined();
    },
  );

  it.each(
    CURATED_DESIGNS.flatMap((entry) =>
      ([1, 2, 3] as const).map((count) => ({ entry, count })),
    ),
  )(
    "$entry.id composes a valid monogram for $count-letter input",
    ({ entry, count }: { entry: CuratedDesignEntry; count: 1 | 2 | 3 }) => {
      const settings = curatedDesignSettings(entry);
      const design = DESIGNS.find((d) => d.id === settings.designId)!;
      const font = fontFor(design.fontId);
      const letters = SAMPLE_LETTERS[count]!;

      const svg = composeMonogram(letters, font, {
        arrangement: design.arrangement,
        shape: design.shape,
        frame: {
          id: settings.frameId,
          gap: settings.frameGap,
          color: resolveProjectFramePaint(settings),
          fill: resolveProjectFrameFill(settings),
        },
        lettersColor: resolveProjectLettersPaint(settings),
        lettersOpacity: settings.lettersOpacity,
        background: resolveProjectBackground(settings),
      });

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).not.toContain("NaN");
    },
  );

  it("never sets a background image (no shipped photo asset to seed it with)", () => {
    for (const entry of CURATED_DESIGNS) {
      expect(curatedDesignSettings(entry).backgroundKind).not.toBe("image");
    }
  });
});
