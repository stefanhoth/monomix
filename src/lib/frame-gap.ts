import { DEFAULT_GAP, frameInnerExtent } from "../engine";

export const MIN_GAP = 0;
/**
 * Recalibrated for the fixed-Frame-position semantics (issue #36): Frame
 * Gap no longer moves the Frame, it shrinks the lettering inside it, so its
 * ceiling is derived from the engine's own fitting geometry
 * (`frameInnerExtent`) rather than picked independently. `MIN_VISIBLE_EXTENT`
 * keeps at least a sliver of lettering visible at the slider's maximum
 * instead of letting it shrink to nothing.
 */
const MIN_VISIBLE_EXTENT = 40;
export const MAX_GAP = Math.floor(frameInnerExtent() - MIN_VISIBLE_EXTENT);
/** Sourced from the engine's own default (src/engine/frames.ts) so
 * switching a Frame on doesn't visually jump before the user ever touches
 * the gap control. */
export const DEFAULT_FRAME_GAP = DEFAULT_GAP;

/**
 * Clamps a requested Frame Gap (CONTEXT.md) to a non-negative, sane range
 * before it reaches the engine. `composeFrame` already clamps the resulting
 * radius so it can never go negative, but that produces a degenerate
 * zero-radius frame rather than a helpful UI state — this keeps the number
 * input itself honest (e.g. a manually typed "-20" can't reach the engine).
 */
export function resolveFrameGap(requested: number | undefined): number {
  if (requested === undefined || Number.isNaN(requested)) {
    return DEFAULT_FRAME_GAP;
  }
  return Math.round(Math.min(Math.max(requested, MIN_GAP), MAX_GAP));
}
