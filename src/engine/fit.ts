import { VIEWBOX_SIZE, type Layout, type PositionedLetter } from "./layout";
import {
  frameInnerExtent,
  frameShapeFor,
  DEFAULT_GAP,
  type FrameShapeKind,
} from "./frames";
import { DIAMOND_ASPECT } from "./shape";

const CENTER = VIEWBOX_SIZE / 2;

/**
 * The "scale the letter block as a unit" machinery a Frame's fitting relies
 * on (issue #36) — later reused by the Shape warp stage (ADR 0007). A Frame
 * sits at a fixed position; the lettering is scaled so its bounding box's
 * corners just clear the Frame's silhouette, rather than the silhouette
 * moving to fit the lettering.
 *
 * Each Frame shape corresponds to a geometric norm bounding an axis-aligned
 * rectangle of half-width/half-height (w, h) within a silhouette of
 * half-extent `extent`:
 * - square (axis-aligned): Chebyshev/L-infinity — max(w, h) <= extent.
 * - circle (and its dotted/dashed variants): Euclidean/L2 — sqrt(w^2+h^2) <= extent.
 * - diamond (a square rotated 45°): Manhattan/L1 — w + h <= extent.
 * - diamond-narrow/diamond-wide (issue #61): the same Manhattan/L1 norm but
 *   scaled by DIAMOND_ASPECT along whichever axis is compressed, since their
 *   vertices sit at (extent, 0)/(0, extent*DIAMOND_ASPECT) — narrow — or the
 *   reverse — wide — rather than (extent, 0)/(0, extent).
 */
function shapeNormExtent(
  halfWidth: number,
  halfHeight: number,
  shape: FrameShapeKind,
): number {
  switch (shape) {
    case "square":
      return Math.max(halfWidth, halfHeight);
    case "diamond":
      return halfWidth + halfHeight;
    case "diamond-narrow":
      return halfWidth / DIAMOND_ASPECT + halfHeight;
    case "diamond-wide":
      return halfWidth + halfHeight / DIAMOND_ASPECT;
    case "circle":
    case "dotted-circle":
    case "dashed-circle":
      return Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
  }
}

/**
 * The uniform scale factor that resizes a `blockWidth` x `blockHeight`
 * letter block so its bounding-box corners exactly reach (or, for a smaller
 * `extent`, stay within) a Frame shape's half-extent. `extent` and the block
 * dimensions must be in the same units (viewBox units).
 */
export function fitScale(
  blockWidth: number,
  blockHeight: number,
  extent: number,
  shape: FrameShapeKind,
): number {
  const used = shapeNormExtent(blockWidth / 2, blockHeight / 2, shape);
  return used === 0 ? 1 : extent / used;
}

/**
 * The uniform scale factor that resizes a Euclidean disc of `radius` so it
 * exactly reaches (or, for a smaller `extent`, stays within) a Frame
 * shape's half-extent. Deliberately separate from `fitScale`: that function
 * assumes a rectangular block whose CORNERS are its farthest points from
 * center, but a disc is equidistant from its center in every direction, so
 * the binding constraint is each norm's worst-case value over the Euclidean
 * unit circle — 1 for square (L∞) and circle (L2), since a disc's boundary
 * already coincides with a circle's and just touches a square's flat edges
 * at its own radius, but sqrt(2) for diamond (L1), whose closest boundary
 * point to center sits at 45°, not on an axis (and, generalizing to a
 * diamond's DIAMOND_ASPECT-scaled narrow/wide variants (issue #61),
 * sqrt(1/DIAMOND_ASPECT² + 1) — same value for both, since compressing
 * either axis by DIAMOND_ASPECT brings that axis's edge equally close).
 * Used by the Shape warp stage (src/engine/shape.ts, ADR 0007) once letters
 * have been pressed into a circle: the warped block's own bounding box is a
 * square, not the letters' actual (round) silhouette, so `fitScale`'s
 * rectangular-corner assumption doesn't apply to it.
 */
function diamondWorstCaseNorm(shape: FrameShapeKind): number {
  switch (shape) {
    case "diamond":
      return Math.SQRT2;
    case "diamond-narrow":
    case "diamond-wide":
      return Math.sqrt(1 / DIAMOND_ASPECT ** 2 + 1);
    case "square":
    case "circle":
    case "dotted-circle":
    case "dashed-circle":
      return 1;
  }
}

export function fitCircleScale(
  radius: number,
  extent: number,
  shape: FrameShapeKind,
): number {
  if (radius === 0) return 1;
  return extent / (radius * diamondWorstCaseNorm(shape));
}

/**
 * Scales every letter's position and font size by `scale`, about the canvas
 * center — the block stays centered, only its size changes.
 */
export function scaleLayout(layout: Layout, scale: number): Layout {
  const letters: PositionedLetter[] = layout.letters.map((letter) => ({
    ...letter,
    x: CENTER + (letter.x - CENTER) * scale,
    y: CENTER + (letter.y - CENTER) * scale,
    fontSize: letter.fontSize * scale,
  }));
  return {
    letters,
    blockWidth: layout.blockWidth * scale,
    blockHeight: layout.blockHeight * scale,
  };
}

export interface FitFrameOptions {
  id: string;
  gap?: number;
  strokeWidth?: number;
}

export interface FrameFitTarget {
  shape: FrameShapeKind;
  extent: number;
}

/**
 * Resolves a Frame id + Frame Gap into the geometric norm/half-extent its
 * inner boundary represents (issue #36) — null for "No Frame" or an
 * unrecognized id. The single source of truth both `fitLayoutToFrame` below
 * and the Shape warp stage (src/engine/render.ts, ADR 0007) fit against, so
 * the two don't drift by each re-deriving the extent formula themselves.
 */
export function frameFitExtent(frame: FitFrameOptions): FrameFitTarget | null {
  const shape = frameShapeFor(frame.id);
  if (!shape) {
    return null;
  }
  const gap = frame.gap ?? DEFAULT_GAP;
  return {
    shape,
    extent: Math.max(frameInnerExtent(frame.strokeWidth) - gap, 0),
  };
}

/**
 * Scales `layout` as a unit so it fits `frame`'s fixed Shape at the given
 * Frame Gap. A no-op for "No Frame" or an unknown frame id.
 */
export function fitLayoutToFrame(
  layout: Layout,
  frame: FitFrameOptions,
): Layout {
  const target = frameFitExtent(frame);
  if (!target) {
    return layout;
  }
  const scale = fitScale(
    layout.blockWidth,
    layout.blockHeight,
    target.extent,
    target.shape,
  );
  return scaleLayout(layout, scale);
}
