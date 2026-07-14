import { describe, expect, it } from "vitest";
import type { PathCommand } from "opentype.js";
import {
  warpPathCommands,
  scalePathCommands,
  type LetterBlockBox,
} from "../../src/engine/shape";

const BOX: LetterBlockBox = {
  centerX: 500,
  centerY: 500,
  halfWidth: 200,
  halfHeight: 100,
};

describe("warpPathCommands", () => {
  it("is a no-op for shape 'none'", () => {
    const commands: PathCommand[] = [
      { type: "M", x: 300, y: 400 },
      { type: "L", x: 700, y: 600 },
      { type: "Z" },
    ];
    expect(warpPathCommands(commands, BOX, "none")).toBe(commands);
  });

  it("maps the box's own boundary points exactly onto the circle (the outer-edge guarantee, issue #37)", () => {
    // The right edge of the box (centerX + halfWidth, centerY) is on the
    // block's bounding-box boundary — the envelope map's defining property
    // is that boundary points land exactly on the target circle.
    const commands: PathCommand[] = [
      { type: "M", x: BOX.centerX + BOX.halfWidth, y: BOX.centerY },
    ];
    const [warped] = warpPathCommands(commands, BOX, "circle");
    if (!warped || warped.type !== "M")
      throw new Error("expected an M command");
    const radius = Math.max(BOX.halfWidth, BOX.halfHeight);
    const dx = warped.x - BOX.centerX;
    const dy = warped.y - BOX.centerY;
    expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(radius);
  });

  it("maps the box center to itself", () => {
    const commands: PathCommand[] = [
      { type: "M", x: BOX.centerX, y: BOX.centerY },
    ];
    const [warped] = warpPathCommands(commands, BOX, "circle");
    if (!warped || warped.type !== "M")
      throw new Error("expected an M command");
    expect(warped.x).toBeCloseTo(BOX.centerX);
    expect(warped.y).toBeCloseTo(BOX.centerY);
  });

  it("subdivides straight and curved segments into many small M/L/Z steps, never emitting Q or C", () => {
    const commands: PathCommand[] = [
      { type: "M", x: 300, y: 500 },
      { type: "L", x: 700, y: 500 },
      { type: "C", x1: 720, y1: 450, x2: 720, y2: 550, x: 700, y: 600 },
      { type: "Q", x1: 500, y1: 650, x: 300, y: 600 },
      { type: "Z" },
    ];
    const warped = warpPathCommands(commands, BOX, "circle");
    expect(warped.some((c) => c.type === "Q" || c.type === "C")).toBe(false);
    // Adaptive subdivision means far more points than the 5 input commands.
    expect(warped.length).toBeGreaterThan(10);
    expect(warped[0]?.type).toBe("M");
    expect(warped.at(-1)?.type).toBe("Z");
  });

  it("produces only finite coordinates — no NaN even for points outside the nominal box", () => {
    const commands: PathCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 1000, y: 1000 },
    ];
    const warped = warpPathCommands(commands, BOX, "circle");
    for (const cmd of warped) {
      if (cmd.type === "M" || cmd.type === "L") {
        expect(Number.isFinite(cmd.x)).toBe(true);
        expect(Number.isFinite(cmd.y)).toBe(true);
      }
    }
  });

  it("doesn't divide by zero for a degenerate zero-size box", () => {
    const degenerate: LetterBlockBox = {
      centerX: 500,
      centerY: 500,
      halfWidth: 0,
      halfHeight: 0,
    };
    const commands: PathCommand[] = [{ type: "M", x: 500, y: 500 }];
    const warped = warpPathCommands(commands, degenerate, "circle");
    const [first] = warped;
    if (!first || first.type !== "M") throw new Error("expected an M command");
    expect(Number.isFinite(first.x)).toBe(true);
    expect(Number.isFinite(first.y)).toBe(true);
  });

  it("maps the box's own boundary points exactly onto the diamond (issue #38)", () => {
    // The right edge of the box (centerX + halfWidth, centerY) is on the
    // block's bounding-box boundary — the envelope map's defining property
    // is that boundary points land exactly on the target diamond, i.e. the
    // L1 distance from center equals the radius.
    const commands: PathCommand[] = [
      { type: "M", x: BOX.centerX + BOX.halfWidth, y: BOX.centerY },
    ];
    const [warped] = warpPathCommands(commands, BOX, "diamond");
    if (!warped || warped.type !== "M")
      throw new Error("expected an M command");
    const radius = Math.max(BOX.halfWidth, BOX.halfHeight);
    const dx = Math.abs(warped.x - BOX.centerX);
    const dy = Math.abs(warped.y - BOX.centerY);
    expect(dx + dy).toBeCloseTo(radius);
  });

  it("maps the box center to itself for a diamond Shape", () => {
    const commands: PathCommand[] = [
      { type: "M", x: BOX.centerX, y: BOX.centerY },
    ];
    const [warped] = warpPathCommands(commands, BOX, "diamond");
    if (!warped || warped.type !== "M")
      throw new Error("expected an M command");
    expect(warped.x).toBeCloseTo(BOX.centerX);
    expect(warped.y).toBeCloseTo(BOX.centerY);
  });

  it("produces only finite coordinates for a diamond Shape — no NaN even for points outside the nominal box", () => {
    const commands: PathCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 1000, y: 1000 },
    ];
    const warped = warpPathCommands(commands, BOX, "diamond");
    for (const cmd of warped) {
      if (cmd.type === "M" || cmd.type === "L") {
        expect(Number.isFinite(cmd.x)).toBe(true);
        expect(Number.isFinite(cmd.y)).toBe(true);
      }
    }
  });

  it("doesn't divide by zero for a degenerate zero-size box with a diamond Shape", () => {
    const degenerate: LetterBlockBox = {
      centerX: 500,
      centerY: 500,
      halfWidth: 0,
      halfHeight: 0,
    };
    const commands: PathCommand[] = [{ type: "M", x: 500, y: 500 }];
    const warped = warpPathCommands(commands, degenerate, "diamond");
    const [first] = warped;
    if (!first || first.type !== "M") throw new Error("expected an M command");
    expect(Number.isFinite(first.x)).toBe(true);
    expect(Number.isFinite(first.y)).toBe(true);
  });
});

describe("scalePathCommands", () => {
  it("is a no-op at scale 1", () => {
    const commands: PathCommand[] = [{ type: "M", x: 100, y: 200 }];
    expect(scalePathCommands(commands, 1, 500, 500)).toBe(commands);
  });

  it("scales points about the given center", () => {
    const commands: PathCommand[] = [{ type: "M", x: 600, y: 500 }];
    const [scaled] = scalePathCommands(commands, 0.5, 500, 500);
    if (!scaled || scaled.type !== "M")
      throw new Error("expected an M command");
    // 600 is 100 units right of center 500; at half scale that's 50.
    expect(scaled.x).toBeCloseTo(550);
    expect(scaled.y).toBeCloseTo(500);
  });

  it("scales every coordinate of a curve command", () => {
    const commands: PathCommand[] = [
      { type: "C", x1: 600, y1: 500, x2: 700, y2: 500, x: 800, y: 500 },
    ];
    const [scaled] = scalePathCommands(commands, 2, 500, 500);
    if (!scaled || scaled.type !== "C") throw new Error("expected a C command");
    expect(scaled.x1).toBeCloseTo(700);
    expect(scaled.x2).toBeCloseTo(900);
    expect(scaled.x).toBeCloseTo(1100);
  });

  it("leaves a Z command unchanged", () => {
    const commands: PathCommand[] = [{ type: "Z" }];
    expect(scalePathCommands(commands, 0.5, 500, 500)).toEqual([{ type: "Z" }]);
  });
});
