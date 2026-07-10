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

export interface LayoutOptions {
  /**
   * Scale multiplier applied to the middle letter of a 3-letter monogram
   * (traditional monogram convention: surname initial emphasized). Ignored
   * for 1- and 2-letter monograms, which have no "middle". Defaults to 1
   * (no emphasis) — Designs opt into emphasis explicitly.
   */
  centerEmphasis?: number;
}

interface Slot {
  letter: string;
  relativeScale: number;
}

/**
 * Positions 1-3 letters of `font` within a VIEWBOX_SIZE x VIEWBOX_SIZE square,
 * centered and scaled to fill the available space (minus padding) without
 * overflowing either dimension. Pure function of its inputs — no DOM, no
 * globals (CLAUDE.md).
 */
export function layoutLetters(
  letters: string,
  font: Font,
  options: LayoutOptions = {},
): Layout {
  const chars = [...letters];
  if (chars.length < 1 || chars.length > 3) {
    throw new Error(`layoutLetters expects 1-3 letters, got ${chars.length}`);
  }

  const centerEmphasis = options.centerEmphasis ?? 1;
  const emphasisIndex = chars.length === 3 ? 1 : -1;
  const slots: Slot[] = chars.map((letter, i) => ({
    letter,
    relativeScale: i === emphasisIndex ? centerEmphasis : 1,
  }));
  const maxRelativeScale = Math.max(...slots.map((s) => s.relativeScale));

  const available = VIEWBOX_SIZE * (1 - PADDING_RATIO * 2);

  // Pass 1, at a reference font size: measure total width and tallest height.
  const reference = VIEWBOX_SIZE;
  const referenceWidth = slots.reduce(
    (sum, slot) =>
      sum + font.getAdvanceWidth(slot.letter, reference * slot.relativeScale),
    0,
  );
  const referenceHeight =
    ((font.ascender - font.descender) / font.unitsPerEm) *
    reference *
    maxRelativeScale;

  // Fit whichever dimension is tighter — never overflow the canvas.
  const scale = Math.min(
    available / referenceWidth,
    available / referenceHeight,
  );
  const baseFontSize = reference * scale;

  // Pass 2, at the real font size: measure the actual total width to center it.
  const sized = slots.map((slot) => {
    const fontSize = baseFontSize * slot.relativeScale;
    return {
      letter: slot.letter,
      fontSize,
      advance: font.getAdvanceWidth(slot.letter, fontSize),
    };
  });
  const actualWidth = sized.reduce((sum, s) => sum + s.advance, 0);

  const ascenderHeight =
    (font.ascender / font.unitsPerEm) * baseFontSize * maxRelativeScale;
  const descenderHeight =
    (font.descender / font.unitsPerEm) * baseFontSize * maxRelativeScale;
  const glyphHeight = ascenderHeight - descenderHeight;
  const topY = (VIEWBOX_SIZE - glyphHeight) / 2;
  const baselineY = topY + ascenderHeight;

  let cursorX = (VIEWBOX_SIZE - actualWidth) / 2;
  const positioned: PositionedLetter[] = sized.map((s) => {
    const entry: PositionedLetter = {
      letter: s.letter,
      x: cursorX,
      y: baselineY,
      fontSize: s.fontSize,
    };
    cursorX += s.advance;
    return entry;
  });

  return { letters: positioned };
}
