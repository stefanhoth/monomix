import type { Font } from "opentype.js";
import {
  layoutLetters,
  VIEWBOX_SIZE,
  PADDING_RATIO,
  type Layout,
  type LayoutOptions,
} from "./layout";
import { pathCommandsToSvgData } from "./svg-path";
import {
  composeFrame,
  NO_FRAME_ID,
  DEFAULT_GAP,
  frameShapeFor,
  frameInnerExtent,
  type FrameOptions,
  type FrameShapeKind,
} from "./frames";
import { fitLayoutToFrame, fitScale } from "./fit";
import { sanitizeColor } from "./color";
import {
  warpPathCommands,
  scalePathCommands,
  type Shape,
  type LetterBlockBox,
} from "./shape";

const CENTER = VIEWBOX_SIZE / 2;
/** The half-extent a shaped Design's default (no-Frame) fit targets — the
 * same padded area layoutLetters already fits unshaped Designs into. */
const DEFAULT_SHAPE_EXTENT = (VIEWBOX_SIZE * (1 - PADDING_RATIO * 2)) / 2;

export interface ComposeOptions extends LayoutOptions {
  /** The Shape (CONTEXT.md) the arranged letters are pressed into. Omit (or
   * "none") to leave the arrangement undeformed. */
  shape?: Shape;
  /** A Frame (CONTEXT.md) to draw around the letters. Omit for "No Frame". */
  frame?: FrameOptions & {
    id: string;
    /** Frame Gap (CONTEXT.md): breathing room between the lettering and the
     * Frame's fixed inner boundary. 0 = lettering fills the boundary
     * exactly; larger values scale the lettering down (issue #36). */
    gap?: number;
  };
  /** Letter fill color. Defaults to "currentColor". */
  lettersColor?: string;
  /** Background fill. Omit (or "transparent") for a transparent background — the default. */
  background?: string;
}

/**
 * The extent/norm a shaped Design's warped block is fitted against: the
 * selected Frame's own fitting rule (issue #36) when there is one, else the
 * same padded canvas area unshaped Designs fit into by construction.
 */
function shapeFitTarget(frame: ComposeOptions["frame"]): {
  extent: number;
  normShape: FrameShapeKind;
} {
  if (frame && frame.id !== NO_FRAME_ID) {
    const frameShape = frameShapeFor(frame.id);
    if (frameShape) {
      const gap = frame.gap ?? DEFAULT_GAP;
      return {
        extent: Math.max(frameInnerExtent(frame.strokeWidth) - gap, 0),
        normShape: frameShape,
      };
    }
  }
  return { extent: DEFAULT_SHAPE_EXTENT, normShape: "square" };
}

/**
 * Renders the arranged letters warped into `shape` (ADR 0007): warps each
 * glyph's raw path into the Shape's silhouette relative to the whole letter
 * block, then scales the shaped result to fit the chosen Frame — or, with
 * no Frame, the same padded canvas area unshaped Designs fit into —
 * reusing fit.ts's `fitScale` rather than duplicating issue #36's fitting
 * rules.
 */
function composeShapedLetters(
  layout: Layout,
  font: Font,
  shape: Shape,
  frame: ComposeOptions["frame"],
): string {
  const box: LetterBlockBox = {
    centerX: CENTER,
    centerY: CENTER,
    halfWidth: layout.blockWidth / 2,
    halfHeight: layout.blockHeight / 2,
  };
  const warpedPaths = layout.letters.map((positioned) => {
    const glyph = font.charToGlyph(positioned.letter);
    const path = glyph.getPath(positioned.x, positioned.y, positioned.fontSize);
    return warpPathCommands(path.commands, box, shape);
  });

  const shapedRadius = Math.max(box.halfWidth, box.halfHeight);
  const { extent, normShape } = shapeFitTarget(frame);
  const scale = fitScale(shapedRadius * 2, shapedRadius * 2, extent, normShape);

  return warpedPaths
    .map((commands) => {
      const scaled = scalePathCommands(commands, scale, CENTER, CENTER);
      return `<path d="${pathCommandsToSvgData(scaled)}"/>`;
    })
    .join("");
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
  const baseLayout = layoutLetters(letters, font, options);
  const shape = options.shape ?? "none";

  let paths: string;
  if (shape === "none") {
    const layout =
      options.frame && options.frame.id !== NO_FRAME_ID
        ? fitLayoutToFrame(baseLayout, options.frame)
        : baseLayout;
    paths = layout.letters
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
  } else {
    paths = composeShapedLetters(baseLayout, font, shape, options.frame);
  }

  const lettersColor = sanitizeColor(options.lettersColor, "currentColor");
  const glyphGroup = `<g fill="${lettersColor}">${paths}</g>`;
  const frameMarkup = options.frame
    ? composeFrame(options.frame.id, {
        color: options.frame.color,
        strokeWidth: options.frame.strokeWidth,
      })
    : "";

  const background = sanitizeColor(options.background, "transparent");
  const backgroundMarkup =
    background === "transparent"
      ? ""
      : `<rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" fill="${background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}">${backgroundMarkup}${frameMarkup}${glyphGroup}</svg>`;
}
