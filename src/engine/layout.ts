import type { Font } from "opentype.js";

/** All composed monograms share this SVG viewBox size (square, in user units). */
export const VIEWBOX_SIZE = 1000;

const PADDING_RATIO = 0.08;

export interface PositionedLetter {
  letter: string;
  /** Baseline x, in viewBox units. */
  x: number;
  /** Baseline y, in viewBox units. */
  y: number;
  /** Font size (em height in viewBox units) this letter is rendered at. */
  fontSize: number;
}

export interface Layout {
  letters: PositionedLetter[];
}

/**
 * Positions 1-3 letters of `font` within a VIEWBOX_SIZE x VIEWBOX_SIZE square,
 * centered and scaled to fill the available space (minus padding) without
 * overflowing either dimension. Pure function of its inputs — no DOM, no
 * globals (CLAUDE.md).
 */
export function layoutLetters(letters: string, font: Font): Layout {
  const chars = [...letters];
  if (chars.length < 1 || chars.length > 3) {
    throw new Error(`layoutLetters expects 1-3 letters, got ${chars.length}`);
  }

  const available = VIEWBOX_SIZE * (1 - PADDING_RATIO * 2);

  // Pass 1, at a reference font size: measure total width and height.
  const reference = VIEWBOX_SIZE;
  const referenceWidth = chars.reduce(
    (sum, ch) => sum + font.getAdvanceWidth(ch, reference),
    0,
  );
  const referenceHeight =
    ((font.ascender - font.descender) / font.unitsPerEm) * reference;

  // Fit whichever dimension is tighter — never overflow the canvas.
  const scale = Math.min(
    available / referenceWidth,
    available / referenceHeight,
  );
  const fontSize = reference * scale;

  // Pass 2, at the real font size: measure the actual total width to center it.
  const advances = chars.map((ch) => font.getAdvanceWidth(ch, fontSize));
  const actualWidth = advances.reduce((sum, a) => sum + a, 0);

  const ascenderHeight = (font.ascender / font.unitsPerEm) * fontSize;
  const descenderHeight = (font.descender / font.unitsPerEm) * fontSize;
  const glyphHeight = ascenderHeight - descenderHeight;
  const topY = (VIEWBOX_SIZE - glyphHeight) / 2;
  const baselineY = topY + ascenderHeight;

  let cursorX = (VIEWBOX_SIZE - actualWidth) / 2;
  const positioned: PositionedLetter[] = chars.map((letter, i) => {
    const entry: PositionedLetter = {
      letter,
      x: cursorX,
      y: baselineY,
      fontSize,
    };
    cursorX += advances[i] ?? 0;
    return entry;
  });

  return { letters: positioned };
}
