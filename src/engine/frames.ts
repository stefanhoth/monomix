import { VIEWBOX_SIZE } from "./layout";
import { sanitizeColor } from "./color";
import { DIAMOND_ASPECT } from "./shape";

/**
 * Frames are independent decorative rings around the letters (CONTEXT.md),
 * not a clip mask — they're positioned purely relative to the fixed
 * VIEWBOX_SIZE canvas, not the letters' actual rendered ink extent. Basic
 * parametric geometry only; motif/advanced frames are deferred
 * (docs/BACKLOG.md). "diamond-narrow"/"diamond-wide" (issue #61) mirror the
 * matching non-1:1 diamond Shape variants (src/engine/shape.ts).
 */
export type FrameShapeKind =
  | "circle"
  | "square"
  | "diamond"
  | "diamond-narrow"
  | "diamond-wide"
  | "dotted-circle"
  | "dashed-circle";

export interface Frame {
  id: string;
  name: string;
  /** null for the "No Frame" entry. */
  shape: FrameShapeKind | null;
}

export const NO_FRAME_ID = "none";

export const FRAMES: Frame[] = [
  { id: NO_FRAME_ID, name: "No Frame", shape: null },
  { id: "circle", name: "Circle", shape: "circle" },
  { id: "square", name: "Square", shape: "square" },
  { id: "diamond", name: "Diamond", shape: "diamond" },
  { id: "diamond-narrow", name: "Narrow Diamond", shape: "diamond-narrow" },
  { id: "diamond-wide", name: "Wide Diamond", shape: "diamond-wide" },
  { id: "dotted-circle", name: "Dotted Circle", shape: "dotted-circle" },
  { id: "dashed-circle", name: "Dashed Circle", shape: "dashed-circle" },
];

/**
 * Distance from the canvas edge to the Frame's outer boundary, in viewBox
 * units. Fixed (issue #36) — unlike v1, a Frame no longer moves when Frame
 * Gap changes; only the lettering scales inside it (see src/engine/fit.ts).
 */
export const FRAME_MARGIN = 40;
export const DEFAULT_STROKE_WIDTH = 20;
/** Default Frame Gap (CONTEXT.md): the inner breathing room, not a canvas margin. */
export const DEFAULT_GAP = 40;
const CENTER = VIEWBOX_SIZE / 2;

/**
 * The bare geometry for `shape` at half-extent `r`, with `attrs` (fill/
 * stroke/dash) applied — shared between the stroked ring and the optional
 * interior fill so both draw from the same shape math. The three dash
 * variants (dotted/dashed-circle) all share plain "circle" geometry here;
 * their dash pattern is purely a stroke attribute applied by the caller.
 */
function shapeGeometry(
  shape: FrameShapeKind,
  r: number,
  attrs: string,
): string {
  switch (shape) {
    case "circle":
    case "dotted-circle":
    case "dashed-circle":
      return `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" ${attrs}/>`;
    case "square":
      return `<rect x="${CENTER - r}" y="${CENTER - r}" width="${r * 2}" height="${r * 2}" ${attrs}/>`;
    case "diamond": {
      const d = `M${CENTER} ${CENTER - r} L${CENTER + r} ${CENTER} L${CENTER} ${CENTER + r} L${CENTER - r} ${CENTER} Z`;
      return `<path d="${d}" ${attrs}/>`;
    }
    case "diamond-narrow": {
      const rx = r * DIAMOND_ASPECT;
      const d = `M${CENTER} ${CENTER - r} L${CENTER + rx} ${CENTER} L${CENTER} ${CENTER + r} L${CENTER - rx} ${CENTER} Z`;
      return `<path d="${d}" ${attrs}/>`;
    }
    case "diamond-wide": {
      const ry = r * DIAMOND_ASPECT;
      const d = `M${CENTER} ${CENTER - ry} L${CENTER + r} ${CENTER} L${CENTER} ${CENTER + ry} L${CENTER - r} ${CENTER} Z`;
      return `<path d="${d}" ${attrs}/>`;
    }
  }
}

export interface FrameOptions {
  color?: string;
  strokeWidth?: number;
  /** Solid interior fill, out to the Frame's outer boundary (issue #65
   * follow-up: without *some* filled area, reduced Letter Opacity has
   * nothing to cut a visible hole in — a bare stroked ring plus a
   * transparent background just disappears). Omitted (or "transparent")
   * keeps the original unfilled-ring look. */
  fill?: string;
}

/** `frameId`'s Shape, or null for "No Frame" — used by the fit stage to pick
 * which geometric norm the lettering must be fitted against. */
export function frameShapeFor(frameId: string): FrameShapeKind | null {
  return FRAMES.find((f) => f.id === frameId)?.shape ?? null;
}

/**
 * Half-extent (in viewBox units, same units the fit stage's norms expect)
 * available inside a Frame's inner stroke edge at Frame Gap 0 — the Frame's
 * fixed outer position (FRAME_MARGIN) minus the ring's own stroke width.
 * Clamped so a pathological custom strokeWidth can't go negative.
 */
export function frameInnerExtent(
  strokeWidth: number = DEFAULT_STROKE_WIDTH,
): number {
  return Math.max(CENTER - FRAME_MARGIN - strokeWidth, 0);
}

/**
 * Renders `frameId`'s shape as an SVG fragment — a stroked ring, optionally
 * preceded by a solid interior fill (`options.fill`) — or "" for "No Frame"
 * / an id with no shape. Pure function — no DOM.
 */
export function composeFrame(
  frameId: string,
  options: FrameOptions = {},
): string {
  const frame = FRAMES.find((f) => f.id === frameId);
  if (!frame) {
    throw new Error(`Unknown frame id "${frameId}"`);
  }
  if (frame.shape === null) {
    return "";
  }

  const strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const color = sanitizeColor(options.color, "currentColor");

  // Radius/half-extent of the stroke centerline, at its fixed position.
  // Clamped so a pathological custom strokeWidth never produces a negative
  // (invalid) radius.
  const r = Math.max(CENTER - FRAME_MARGIN - strokeWidth / 2, 0);

  const dash =
    frame.shape === "dotted-circle"
      ? ' stroke-dasharray="2 14" stroke-linecap="round"'
      : frame.shape === "dashed-circle"
        ? ' stroke-dasharray="50 24"'
        : "";
  const strokeMarkup = shapeGeometry(
    frame.shape,
    r,
    `fill="none" stroke="${color}" stroke-width="${strokeWidth}"${dash}`,
  );

  // Fill draws first, at the outer boundary (FRAME_MARGIN, independent of
  // strokeWidth) rather than the stroke's inner edge — so the stroke sits
  // on top of the fill as a border rather than leaving an unfilled gap
  // between them. Omitted entirely (not just "" fill) when unset/
  // transparent, so every existing Frame's output stays byte-identical.
  const fillColor = sanitizeColor(options.fill, "transparent");
  const fillMarkup =
    fillColor === "transparent"
      ? ""
      : shapeGeometry(
          frame.shape,
          Math.max(CENTER - FRAME_MARGIN, 0),
          `fill="${fillColor}"`,
        );

  return fillMarkup + strokeMarkup;
}
