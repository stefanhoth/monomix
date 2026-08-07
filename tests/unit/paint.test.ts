import { describe, expect, it } from "vitest";
import {
  isGradient,
  paintSolidColor,
  resolvePaint,
  sanitizeStops,
  type Gradient,
} from "../../src/engine/paint";

const gradient = (overrides: Partial<Gradient> = {}): Gradient => ({
  style: "linear",
  angle: 180,
  stops: [
    { color: "#a8c7fa", offset: 0 },
    { color: "#0b57d0", offset: 100 },
  ],
  ...overrides,
});

describe("isGradient", () => {
  it("separates gradients from color strings and absent paints", () => {
    expect(isGradient(gradient())).toBe(true);
    expect(isGradient("#ff0000")).toBe(false);
    expect(isGradient("currentColor")).toBe(false);
    expect(isGradient(undefined)).toBe(false);
  });
});

describe("resolvePaint with a solid color", () => {
  // The byte-identical guarantee: everything painted with a plain color must
  // emit exactly what it did before gradients existed (issue #122).
  it("emits no defs at all", () => {
    expect(resolvePaint("#ff0000", "currentColor", "mm-x")).toEqual({
      defs: "",
      value: "#ff0000",
    });
  });

  it("falls back for an absent or unsafe color, like sanitizeColor", () => {
    expect(resolvePaint(undefined, "currentColor", "mm-x").value).toBe(
      "currentColor",
    );
    expect(
      resolvePaint('red" onload="alert(1)', "currentColor", "mm-x").value,
    ).toBe("currentColor");
  });
});

describe("resolvePaint with a gradient", () => {
  it("emits a defs block and references it by url()", () => {
    const { defs, value } = resolvePaint(
      gradient(),
      "currentColor",
      "mm-letters-gradient",
    );
    const id = value.slice("url(#".length, -1);

    expect(id).toMatch(/^mm-letters-gradient-/);
    expect(defs).toContain(`<linearGradient id="${id}"`);
    expect(defs).toContain('<stop offset="0%" stop-color="#a8c7fa"/>');
    expect(defs).toContain('<stop offset="100%" stop-color="#0b57d0"/>');
  });

  it("rotates a linear gradient about the unit square's center", () => {
    const { defs } = resolvePaint(
      gradient({ angle: 45 }),
      "currentColor",
      "mm-x",
    );
    expect(defs).toContain('gradientTransform="rotate(45 0.5 0.5)"');
  });

  it("renders a radial gradient at the corner-reaching radius", () => {
    const { defs } = resolvePaint(
      gradient({ style: "radial" }),
      "currentColor",
      "mm-x",
    );
    expect(defs).toContain("<radialGradient id=");
    expect(defs).toContain('cx="50%" cy="50%" r="70.7%"');
    expect(defs).not.toContain("gradientTransform");
  });

  it("is a pure function: identical input gives byte-identical output", () => {
    expect(resolvePaint(gradient(), "currentColor", "mm-x")).toEqual(
      resolvePaint(gradient(), "currentColor", "mm-x"),
    );
  });

  it("hashes over effective content, so stop order doesn't change the id", () => {
    const ordered = gradient();
    const shuffled = gradient({ stops: [...ordered.stops].reverse() });
    expect(resolvePaint(shuffled, "currentColor", "mm-x")).toEqual(
      resolvePaint(ordered, "currentColor", "mm-x"),
    );
  });

  it("gives the same gradient different ids under different id scopes", () => {
    // This is what keeps letters and Frame from colliding when a user picks
    // the same gradient for both — a <defs id> is document-global.
    const letters = resolvePaint(gradient(), "x", "mm-letters-gradient");
    const frame = resolvePaint(gradient(), "x", "mm-frame-gradient");
    expect(letters.value).not.toBe(frame.value);
  });

  it("gives different gradients different ids under the same scope", () => {
    const a = resolvePaint(gradient(), "x", "mm-x");
    const b = resolvePaint(gradient({ angle: 90 }), "x", "mm-x");
    expect(a.value).not.toBe(b.value);
  });
});

describe("sanitizeStops", () => {
  it("sorts by offset so SVG can't clamp an out-of-order stop", () => {
    const stops = sanitizeStops([
      { color: "#000000", offset: 0 },
      { color: "#ffffff", offset: 100 },
      { color: "#888888", offset: 50 },
    ]);
    expect(stops.map((s) => s.offset)).toEqual([0, 50, 100]);
  });

  it("clamps offsets, sanitizes colors, and caps at 3 stops", () => {
    const stops = sanitizeStops([
      { color: "#000000", offset: -20 },
      { color: 'x" onload="y', offset: 400 },
      { color: "#111111", offset: 50 },
      { color: "#222222", offset: 60 },
    ]);
    expect(stops).toHaveLength(3);
    expect(stops[0]!.offset).toBe(0);
    expect(stops.at(-1)!.offset).toBe(100);
    expect(stops.some((s) => s.color.includes("onload"))).toBe(false);
  });

  it("falls back to a renderable pair when fewer than 2 stops survive", () => {
    expect(sanitizeStops([{ color: "#123456", offset: 0 }])).toEqual([
      { color: "#ffffff", offset: 0 },
      { color: "#000000", offset: 100 },
    ]);
  });
});

describe("paintSolidColor", () => {
  // Gallery tiles paint with this instead of the real gradient, so a
  // <defs id> can never be duplicated into a hidden (display:none) panel.
  it("returns a gradient's first stop, after sorting", () => {
    expect(paintSolidColor(gradient(), "#111111")).toBe("#a8c7fa");
    expect(
      paintSolidColor(
        gradient({
          stops: [
            { color: "#0b57d0", offset: 100 },
            { color: "#a8c7fa", offset: 0 },
          ],
        }),
        "#111111",
      ),
    ).toBe("#a8c7fa");
  });

  it("passes a solid color through and falls back for unsafe input", () => {
    expect(paintSolidColor("#ff0000", "#111111")).toBe("#ff0000");
    expect(paintSolidColor(undefined, "#111111")).toBe("#111111");
    expect(paintSolidColor('x" onload="y', "#111111")).toBe("#111111");
  });
});
