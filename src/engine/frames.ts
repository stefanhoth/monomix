import { VIEWBOX_SIZE } from "./layout";

/**
 * Frames are independent decorative rings around the letters (CONTEXT.md),
 * not a clip mask — they're positioned purely relative to the fixed
 * VIEWBOX_SIZE canvas, not the letters' actual rendered ink extent. Basic
 * parametric geometry only; motif/advanced frames are deferred
 * (docs/BACKLOG.md).
 */
export type FrameShapeKind =
  "circle" | "square" | "diamond" | "dotted-circle" | "dashed-circle";

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
  { id: "dotted-circle", name: "Dotted Circle", shape: "dotted-circle" },
  { id: "dashed-circle", name: "Dashed Circle", shape: "dashed-circle" },
];

const DEFAULT_GAP = 40;
const DEFAULT_STROKE_WIDTH = 20;
const CENTER = VIEWBOX_SIZE / 2;

export interface FrameOptions {
  /** Distance from the canvas edge to the frame's outer boundary, in viewBox units. */
  gap?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Renders `frameId`'s shape as an SVG fragment (a stroked, unfilled ring),
 * or "" for "No Frame" / an id with no shape. Pure function — no DOM.
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

  const gap = options.gap ?? DEFAULT_GAP;
  const strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const color = options.color ?? "currentColor";

  // Radius/half-extent of the stroke centerline. Clamped so an extreme gap
  // never produces a negative (invalid) radius.
  const r = Math.max(VIEWBOX_SIZE / 2 - gap - strokeWidth / 2, 0);
  const attrs = `fill="none" stroke="${color}" stroke-width="${strokeWidth}"`;

  switch (frame.shape) {
    case "circle":
      return `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" ${attrs}/>`;
    case "square":
      return `<rect x="${CENTER - r}" y="${CENTER - r}" width="${r * 2}" height="${r * 2}" ${attrs}/>`;
    case "diamond": {
      const d = `M${CENTER} ${CENTER - r} L${CENTER + r} ${CENTER} L${CENTER} ${CENTER + r} L${CENTER - r} ${CENTER} Z`;
      return `<path d="${d}" ${attrs}/>`;
    }
    case "dotted-circle":
      return `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" ${attrs} stroke-dasharray="2 14" stroke-linecap="round"/>`;
    case "dashed-circle":
      return `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" ${attrs} stroke-dasharray="50 24"/>`;
  }
}
