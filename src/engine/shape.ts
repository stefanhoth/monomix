import type { PathCommand } from "opentype.js";

/**
 * The outer silhouette a Design's arranged letters are pressed into
 * (CONTEXT.md's Shape). "none" leaves the arrangement undeformed — the pure
 * warp stage (ADR 0007) is a no-op for it.
 */
export type Shape = "none" | "circle" | "diamond";

/** The arranged letter block's bounding box, in viewBox units — what the
 * envelope map normalizes every path point against (ADR 0007: "letter-block
 * bounding box → target silhouette"). */
export interface LetterBlockBox {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
}

type EnvelopeMap = (u: number, v: number) => { u: number; v: number };

/**
 * Maps the square [-1,1]x[-1,1] onto the unit disc so that the square's
 * entire boundary — not just its corners — lands exactly on the unit
 * circle (the Fernandez-Guasti "elliptical grid" square-to-disc mapping):
 * at |u|=1, u²(1-v²/2) + v²(1-u²/2) reduces to exactly 1 for any v, and
 * symmetrically at |v|=1. Applied to a letter block's bounding box, this is
 * what presses the outer edges of the outer letters onto the circle Shape
 * while mapping interior points smoothly inward.
 */
function circleEnvelope(u: number, v: number): { u: number; v: number } {
  return {
    u: u * Math.sqrt(Math.max(0, 1 - (v * v) / 2)),
    v: v * Math.sqrt(Math.max(0, 1 - (u * u) / 2)),
  };
}

/**
 * Maps the square [-1,1]x[-1,1] onto the diamond |u|+|v|<=1 (the unit disc
 * in the L1 norm) — the diamond analogue of circleEnvelope's elliptical-grid
 * formula above, same separable shape (each coordinate scaled by a factor of
 * the *other* coordinate) but with the linear factor (1-|t|/2) in place of
 * the elliptical sqrt(1-t²/2): at |u|=1, u'=(1-|v|/2) and v'=v/2, so
 * |u'|+|v'| = (1-|v|/2)+|v|/2 = 1 for every v, and symmetrically at |v|=1 —
 * the whole square boundary lands exactly on the diamond, not just corners.
 * (A pure radial rescale from the box center was tried first and rejected:
 * it scales each point by a factor depending on its own angle from center,
 * which twists a glyph's strokes against each other instead of warping the
 * block as a whole — this grid-style formula keeps the same per-axis
 * structure that makes circleEnvelope read as a smooth press, not a twist.)
 */
function diamondEnvelope(u: number, v: number): { u: number; v: number } {
  return {
    u: u * (1 - Math.abs(v) / 2),
    v: v * (1 - Math.abs(u) / 2),
  };
}

// Adding a new Shape (BACKLOG.md: "just" a new mapping function) means
// adding one more entry here.
const ENVELOPES: Partial<Record<Shape, EnvelopeMap>> = {
  circle: circleEnvelope,
  diamond: diamondEnvelope,
};

/** Maps one point through `shape`'s envelope, relative to `box`. A no-op
 * for "none", an unrecognized Shape, or a degenerate zero-size box. */
function warpPoint(
  x: number,
  y: number,
  box: LetterBlockBox,
  shape: Shape,
): { x: number; y: number } {
  const envelope = ENVELOPES[shape];
  if (!envelope || box.halfWidth === 0 || box.halfHeight === 0) {
    return { x, y };
  }
  const radius = Math.max(box.halfWidth, box.halfHeight);
  const mapped = envelope(
    (x - box.centerX) / box.halfWidth,
    (y - box.centerY) / box.halfHeight,
  );
  return {
    x: box.centerX + mapped.u * radius,
    y: box.centerY + mapped.v * radius,
  };
}

interface Point {
  x: number;
  y: number;
}

// The envelope map is non-linear, so both straight segments and curves must
// be flattened into enough small pieces that the warp still reads as
// smooth, not faceted, once every point is individually re-mapped.
const MIN_STEPS = 4;
const MAX_STEPS = 64;
const STEP_SIZE = 6; // viewBox units of (pre-warp) control-polygon length per step

function stepsFor(controlPolygonLength: number): number {
  return Math.min(
    MAX_STEPS,
    Math.max(MIN_STEPS, Math.round(controlPolygonLength / STEP_SIZE)),
  );
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function sampleLine(p0: Point, p1: Point, steps: number): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
  }
  return points;
}

function sampleQuadratic(
  p0: Point,
  p1: Point,
  p2: Point,
  steps: number,
): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    points.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return points;
}

function sampleCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  steps: number,
): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    points.push({
      x:
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x,
      y:
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y,
    });
  }
  return points;
}

/**
 * Adaptively subdivides `commands` (a glyph's raw M/L/Q/C/Z path) and maps
 * every resulting point through `shape`'s envelope relative to `box` — the
 * pure engine stage ADR 0007 inserts between layout and rendering. Output
 * is always flattened to M/L/Z: once warped, a formerly-straight segment is
 * no longer straight, so re-expressing it as a bezier isn't meaningful.
 * Enough subdivision steps keep the result reading as smooth curves rather
 * than a faceted polygon at the sizes MonoMix renders and exports.
 */
export function warpPathCommands(
  commands: PathCommand[],
  box: LetterBlockBox,
  shape: Shape,
): PathCommand[] {
  if (shape === "none") return commands;

  const out: PathCommand[] = [];
  let current: Point = { x: 0, y: 0 };
  let subpathStart: Point = current;

  const emit = (p: Point) => {
    const w = warpPoint(p.x, p.y, box, shape);
    out.push({ type: "L", x: w.x, y: w.y });
  };

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M": {
        current = { x: cmd.x, y: cmd.y };
        subpathStart = current;
        const w = warpPoint(current.x, current.y, box, shape);
        out.push({ type: "M", x: w.x, y: w.y });
        break;
      }
      case "L": {
        const target: Point = { x: cmd.x, y: cmd.y };
        for (const p of sampleLine(
          current,
          target,
          stepsFor(dist(current, target)),
        )) {
          emit(p);
        }
        current = target;
        break;
      }
      case "Q": {
        const p1: Point = { x: cmd.x1, y: cmd.y1 };
        const p2: Point = { x: cmd.x, y: cmd.y };
        const length = dist(current, p1) + dist(p1, p2);
        for (const p of sampleQuadratic(current, p1, p2, stepsFor(length))) {
          emit(p);
        }
        current = p2;
        break;
      }
      case "C": {
        const p1: Point = { x: cmd.x1, y: cmd.y1 };
        const p2: Point = { x: cmd.x2, y: cmd.y2 };
        const p3: Point = { x: cmd.x, y: cmd.y };
        const length = dist(current, p1) + dist(p1, p2) + dist(p2, p3);
        for (const p of sampleCubic(current, p1, p2, p3, stepsFor(length))) {
          emit(p);
        }
        current = p3;
        break;
      }
      case "Z": {
        out.push({ type: "Z" });
        current = subpathStart;
        break;
      }
    }
  }
  return out;
}

/**
 * Scales already-warped path points by `scale` about (`centerX`, `centerY`)
 * — the raw-path equivalent of fit.ts's `scaleLayout`, used to fit a shaped
 * (already-warped) letter block into a chosen Frame, or the default canvas
 * area when there is none (src/engine/render.ts).
 */
export function scalePathCommands(
  commands: PathCommand[],
  scale: number,
  centerX: number,
  centerY: number,
): PathCommand[] {
  if (scale === 1) return commands;
  const sx = (x: number) => centerX + (x - centerX) * scale;
  const sy = (y: number) => centerY + (y - centerY) * scale;
  return commands.map((cmd): PathCommand => {
    switch (cmd.type) {
      case "M":
      case "L":
        return { type: cmd.type, x: sx(cmd.x), y: sy(cmd.y) };
      case "Q":
        return {
          type: "Q",
          x1: sx(cmd.x1),
          y1: sy(cmd.y1),
          x: sx(cmd.x),
          y: sy(cmd.y),
        };
      case "C":
        return {
          type: "C",
          x1: sx(cmd.x1),
          y1: sy(cmd.y1),
          x2: sx(cmd.x2),
          y2: sy(cmd.y2),
          x: sx(cmd.x),
          y: sy(cmd.y),
        };
      case "Z":
        return cmd;
    }
  });
}
