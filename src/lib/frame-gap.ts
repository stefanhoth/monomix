const MIN_GAP = 0;
const MAX_GAP = 300;
/** Matches the engine's own implicit default (src/engine/frames.ts) so
 * switching a Frame on doesn't visually jump before the user ever touches
 * the gap control. */
export const DEFAULT_FRAME_GAP = 40;

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
