import { VIEWBOX_SIZE, type Layout, type PositionedLetter } from "./layout";
import {
  frameInnerExtent,
  frameShapeFor,
  DEFAULT_GAP,
  type FrameShapeKind,
} from "./frames";

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

/**
 * Scales `layout` as a unit so it fits `frame`'s fixed Shape at the given
 * Frame Gap. A no-op for "No Frame" or an unknown frame id.
 */
export function fitLayoutToFrame(
  layout: Layout,
  frame: FitFrameOptions,
): Layout {
  const shape = frameShapeFor(frame.id);
  if (!shape) {
    return layout;
  }
  const gap = frame.gap ?? DEFAULT_GAP;
  const extent = Math.max(frameInnerExtent(frame.strokeWidth) - gap, 0);
  const scale = fitScale(layout.blockWidth, layout.blockHeight, extent, shape);
  return scaleLayout(layout, scale);
}
