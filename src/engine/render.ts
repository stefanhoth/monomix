import type { Font } from "opentype.js";
import { layoutLetters, VIEWBOX_SIZE, type LayoutOptions } from "./layout";
import { pathCommandsToSvgData } from "./svg-path";
import { composeFrame, type FrameOptions } from "./frames";
import { sanitizeColor } from "./color";

export interface ComposeOptions extends LayoutOptions {
  /** A Frame (CONTEXT.md) to draw around the letters. Omit for "No Frame". */
  frame?: FrameOptions & { id: string };
  /** Letter fill color. Defaults to "currentColor". */
  lettersColor?: string;
  /** Background fill. Omit (or "transparent") for a transparent background — the default. */
  background?: string;
}

/**
 * Composes 1-3 letters of `font`, optionally with a Frame and colors, into a
 * single self-contained SVG string. Pure function — no DOM, no fetch (font
 * must already be loaded via src/lib/font-loader.ts). This is the core
 * Designs (#6) and Frames (#7) build on.
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

  const lettersColor = sanitizeColor(options.lettersColor, "currentColor");
  const glyphGroup = `<g fill="${lettersColor}">${paths}</g>`;
  const frameMarkup = options.frame
    ? composeFrame(options.frame.id, options.frame)
    : "";

  const background = sanitizeColor(options.background, "transparent");
  const backgroundMarkup =
    background === "transparent"
      ? ""
      : `<rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" fill="${background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}">${backgroundMarkup}${frameMarkup}${glyphGroup}</svg>`;
}
