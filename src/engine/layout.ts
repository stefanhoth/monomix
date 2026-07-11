import type { Font } from "opentype.js";

/** All composed monograms share this SVG viewBox size (square, in user units). */
export const VIEWBOX_SIZE = 1000;

const PADDING_RATIO = 0.08;
/** Gap between rows in a "stacked" arrangement, as a fraction of row height. */
const ROW_GAP_RATIO = 0.08;

export type Arrangement = "horizontal" | "stacked";

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
  /** How the letters are arranged relative to each other. Defaults to "horizontal". */
  arrangement?: Arrangement;
}

/** Converts a font-units metric (e.g. font.ascender) to viewBox units at fontSize. */
function emToViewBoxUnits(
  fontUnits: number,
  font: Font,
  fontSize: number,
): number {
  return (fontUnits / font.unitsPerEm) * fontSize;
}

/** The font size that fits both a measured width and height into `available`, never overflowing. */
function fitFontSize(
  referenceWidth: number,
  referenceHeight: number,
  available: number,
  reference: number,
): number {
  const scale = Math.min(
    available / referenceWidth,
    available / referenceHeight,
  );
  return reference * scale;
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

  return options.arrangement === "stacked"
    ? layoutStacked(chars, font)
    : layoutHorizontal(chars, font);
}

/** Letters side by side on one baseline, sharing the available width. */
function layoutHorizontal(chars: string[], font: Font): Layout {
  const available = VIEWBOX_SIZE * (1 - PADDING_RATIO * 2);
  const reference = VIEWBOX_SIZE;

  // Pass 1, at a reference font size: measure total width and height.
  const referenceWidth = chars.reduce(
    (sum, ch) => sum + font.getAdvanceWidth(ch, reference),
    0,
  );
  const referenceHeight = emToViewBoxUnits(
    font.ascender - font.descender,
    font,
    reference,
  );
  const fontSize = fitFontSize(
    referenceWidth,
    referenceHeight,
    available,
    reference,
  );

  // Pass 2, at the real font size: measure the actual total width to center it.
  const advances = chars.map((ch) => font.getAdvanceWidth(ch, fontSize));
  const actualWidth = advances.reduce((sum, a) => sum + a, 0);

  const ascenderHeight = emToViewBoxUnits(font.ascender, font, fontSize);
  const descenderHeight = emToViewBoxUnits(font.descender, font, fontSize);
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

/** One letter per row, each centered horizontally, stacked top to bottom. */
function layoutStacked(chars: string[], font: Font): Layout {
  const available = VIEWBOX_SIZE * (1 - PADDING_RATIO * 2);
  const reference = VIEWBOX_SIZE;
  const n = chars.length;

  // Pass 1, at a reference font size: measure the widest letter and total stack height.
  const referenceWidth = Math.max(
    ...chars.map((ch) => font.getAdvanceWidth(ch, reference)),
  );
  const rowHeightRef = emToViewBoxUnits(
    font.ascender - font.descender,
    font,
    reference,
  );
  const referenceHeight = rowHeightRef * (n + (n - 1) * ROW_GAP_RATIO);
  const fontSize = fitFontSize(
    referenceWidth,
    referenceHeight,
    available,
    reference,
  );

  const rowHeight = emToViewBoxUnits(
    font.ascender - font.descender,
    font,
    fontSize,
  );
  const rowGap = rowHeight * ROW_GAP_RATIO;
  const ascenderHeight = emToViewBoxUnits(font.ascender, font, fontSize);
  const totalStackHeight = rowHeight * n + rowGap * (n - 1);
  const topY = (VIEWBOX_SIZE - totalStackHeight) / 2;

  const positioned: PositionedLetter[] = chars.map((letter, i) => {
    const width = font.getAdvanceWidth(letter, fontSize);
    const x = (VIEWBOX_SIZE - width) / 2;
    const y = topY + i * (rowHeight + rowGap) + ascenderHeight;
    return { letter, x, y, fontSize };
  });

  return { letters: positioned };
}
