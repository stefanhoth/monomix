import type { Font } from "opentype.js";
import { layoutLetters, VIEWBOX_SIZE, type LayoutOptions } from "./layout";
import { pathCommandsToSvgData } from "./svg-path";

export interface ComposeOptions extends LayoutOptions {
  /** SVG path `d` data to clip the composed letters into (a Frame shape). No clip when omitted. */
  clipPathD?: string;
}

/**
 * Composes 1-3 letters of `font` into a single self-contained SVG string.
 * Pure function — no DOM, no fetch (font must already be loaded via
 * font-loader.ts). This is the core Designs (#6) and Frames (#7) build on.
 */
export function composeMonogram(
  letters: string,
  font: Font,
  options: ComposeOptions = {},
): string {
  const layout = layoutLetters(letters, font, options);

  const paths = layout.letters
    .map((positioned) => {
      const glyph = font.charToGlyph(positioned.letter);
      const path = glyph.getPath(
        positioned.x,
        positioned.y,
        positioned.fontSize,
      );
      return `<path d="${pathCommandsToSvgData(path.commands)}"/>`;
    })
    .join("");

  const glyphGroup = `<g fill="currentColor">${paths}</g>`;

  const content = options.clipPathD
    ? `<defs><clipPath id="mm-clip"><path d="${options.clipPathD}"/></clipPath></defs><g clip-path="url(#mm-clip)">${glyphGroup}</g>`
    : glyphGroup;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}">${content}</svg>`;
}
