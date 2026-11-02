import { describe, expect, it } from "vitest";
import { composeMonogram } from "../../src/engine";
import {
  composeBackgroundLayer,
  imagePlacement,
  DEFAULT_IMAGE_TRANSFORM,
  MIN_IMAGE_ZOOM,
  MAX_IMAGE_ZOOM,
} from "../../src/engine/background";
import { loadTestFont } from "./helpers/load-test-font";

const font = loadTestFont("archivo-black");

// A tiny valid 1x1 transparent PNG, base64-encoded — realistic enough to
// exercise the data-URL allow-list without needing a real photo fixture.
const VALID_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("composeBackgroundLayer", () => {
  it("still handles a plain color string exactly as before (backward compatible)", () => {
    expect(composeBackgroundLayer("#00ff00", 1000)).toEqual({
      defs: "",
      markup: '<rect width="1000" height="1000" fill="#00ff00"/>',
    });
  });

  it("returns no markup for transparent/undefined", () => {
    expect(composeBackgroundLayer(undefined, 1000)).toEqual({
      defs: "",
      markup: "",
    });
    expect(composeBackgroundLayer("transparent", 1000)).toEqual({
      defs: "",
      markup: "",
    });
  });

  it("embeds a valid image data URL as a covering <image>", () => {
    const layer = composeBackgroundLayer(
      { kind: "image", dataUrl: VALID_PNG_DATA_URL },
      1000,
    );
    expect(layer.markup).toContain(`href="${VALID_PNG_DATA_URL}"`);
    expect(layer.markup).toContain('width="1000"');
    expect(layer.markup).toContain('height="1000"');
    expect(layer.markup).toContain('preserveAspectRatio="xMidYMid slice"');
  });

  it("rejects a non-data-URL / non-image value instead of injecting it", () => {
    for (const unsafe of [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      'data:image/png;base64,abc" onerror="alert(1)',
      "https://example.com/tracker.png",
    ]) {
      expect(
        composeBackgroundLayer({ kind: "image", dataUrl: unsafe }, 1000),
      ).toEqual({ defs: "", markup: "" });
    }
  });
});

describe("composeMonogram with an image background", () => {
  it("draws the image before the letters, still a self-contained SVG string", () => {
    const svg = composeMonogram("A", font, {
      background: { kind: "image", dataUrl: VALID_PNG_DATA_URL },
    });
    expect(svg).toContain("<image ");
    expect(svg.indexOf("<image")).toBeLessThan(svg.indexOf("<path"));
    expect(svg).toContain("</svg>");
  });

  it("falls back to no background for an unsafe image value", () => {
    const svg = composeMonogram("A", font, {
      background: { kind: "image", dataUrl: "javascript:alert(1)" },
    });
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("javascript:");
  });
});

describe("composeBackgroundLayer (gradients, issue #64)", () => {
  it("renders a linear gradient as defs + a rect filled via url(#id)", () => {
    const layer = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 45,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#0000ff", offset: 100 },
          ],
        },
      },
      1000,
    );
    expect(layer.defs).toContain("<linearGradient");
    expect(layer.defs).toContain('gradientTransform="rotate(45 0.5 0.5)"');
    expect(layer.defs).toContain('stop-color="#ff0000"');
    expect(layer.defs).toContain('stop-color="#0000ff"');
    const idMatch = layer.defs.match(/id="([^"]+)"/);
    expect(idMatch).not.toBeNull();
    expect(layer.markup).toBe(
      `<rect width="1000" height="1000" fill="url(#${idMatch![1]})"/>`,
    );
  });

  it("renders a radial gradient with a corner-covering radius, ignoring angle", () => {
    const layer = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "radial",
          angle: 999,
          stops: [
            { color: "#ffffff", offset: 0 },
            { color: "#000000", offset: 100 },
          ],
        },
      },
      1000,
    );
    expect(layer.defs).toContain("<radialGradient");
    expect(layer.defs).toContain('r="70.7%"');
    expect(layer.defs).not.toContain("rotate");
  });

  it("supports a third color stop", () => {
    const layer = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 0,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#00ff00", offset: 50 },
            { color: "#0000ff", offset: 100 },
          ],
        },
      },
      1000,
    );
    expect((layer.defs.match(/<stop /g) ?? []).length).toBe(3);
    expect(layer.defs).toContain('offset="50%"');
  });

  it("sorts stops by offset regardless of array order (issue #64 regression: an out-of-order stop must not collapse onto its neighbor)", () => {
    // Mirrors exactly what naively appending a new middle stop after an
    // existing 100%-offset stop produces: array order [0%, 100%, 50%].
    // SVG clamps an out-of-order stop's offset up to the previous stop's
    // offset, so without sorting this would render as if the 50% stop
    // were also at 100% — a hard break between stop 1 and 2, with stop 3
    // invisibly stacked on top of stop 2 instead of blending between all
    // three.
    const outOfOrder = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 0,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#0000ff", offset: 100 },
            { color: "#00ff00", offset: 50 },
          ],
        },
      },
      1000,
    );
    const inOrder = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 0,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#00ff00", offset: 50 },
            { color: "#0000ff", offset: 100 },
          ],
        },
      },
      1000,
    );
    // Same id too: the hash is over the (now-sorted) stop content, not
    // insertion order, so these two equivalent gradients dedupe to one def.
    expect(outOfOrder.defs).toBe(inOrder.defs);
  });

  it("is deterministic: the same gradient always yields the same id/defs (pure function)", () => {
    const gradient = {
      style: "linear" as const,
      angle: 90,
      stops: [
        { color: "#ff0000", offset: 0 },
        { color: "#0000ff", offset: 100 },
      ],
    };
    const a = composeBackgroundLayer({ kind: "gradient", gradient }, 1000);
    const b = composeBackgroundLayer({ kind: "gradient", gradient }, 1000);
    expect(a).toEqual(b);
  });

  it("gives two different gradients different ids, so multiple gradient SVGs in one document don't collide", () => {
    const a = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 0,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#0000ff", offset: 100 },
          ],
        },
      },
      1000,
    );
    const b = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 180,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#0000ff", offset: 100 },
          ],
        },
      },
      1000,
    );
    expect(a.markup).not.toBe(b.markup);
  });

  it("falls back to a white-to-black gradient when fewer than 2 valid stops are given", () => {
    const layer = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: { style: "linear", angle: 0, stops: [] },
      },
      1000,
    );
    expect(layer.defs).toContain('stop-color="#ffffff"');
    expect(layer.defs).toContain('stop-color="#000000"');
  });

  it("sanitizes each stop's color and clamps its offset instead of injecting malformed input", () => {
    const layer = composeBackgroundLayer(
      {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 0,
          stops: [
            { color: 'red" onload="alert(1)', offset: -50 },
            { color: "#0000ff", offset: 500 },
          ],
        },
      },
      1000,
    );
    expect(layer.defs).not.toContain("onload");
    expect(layer.defs).toContain('stop-color="#ffffff"'); // sanitizeColor's fallback
    expect(layer.defs).toContain('offset="0%"');
    expect(layer.defs).toContain('offset="100%"');
  });
});

describe("composeMonogram with a gradient background", () => {
  it("draws the gradient defs+rect before the letters", () => {
    const svg = composeMonogram("A", font, {
      background: {
        kind: "gradient",
        gradient: {
          style: "linear",
          angle: 0,
          stops: [
            { color: "#ff0000", offset: 0 },
            { color: "#0000ff", offset: 100 },
          ],
        },
      },
    });
    expect(svg).toContain("<defs>");
    expect(svg).toContain("<linearGradient");
    expect(svg.indexOf("<defs>")).toBeLessThan(svg.indexOf("<path"));
    expect(svg).toContain("</svg>");
  });
});

// Zoom + pan for image backgrounds (issue #123).
describe("imagePlacement", () => {
  const SIZE = 1000;

  it("reproduces the original centered cover fit at the defaults", () => {
    // The byte-identical guarantee: these are exactly the numbers the
    // pre-#123 markup hardcoded.
    expect(imagePlacement(DEFAULT_IMAGE_TRANSFORM, SIZE)).toEqual({
      x: 0,
      y: 0,
      size: SIZE,
    });
    expect(imagePlacement(undefined, SIZE)).toEqual({ x: 0, y: 0, size: SIZE });
  });

  it("grows the rect and keeps it centered when zooming with no offset", () => {
    expect(imagePlacement({ zoom: 2, offsetX: 0, offsetY: 0 }, SIZE)).toEqual({
      x: -500,
      y: -500,
      size: 2000,
    });
  });

  it("pins the image's edges at the extremes of the offset range", () => {
    const zoomed = { zoom: 2, offsetX: 0, offsetY: 0 };
    // offset -1 puts the rect's right edge on the canvas's right edge...
    const min = imagePlacement({ ...zoomed, offsetX: -1 }, SIZE);
    expect(min.x + min.size).toBe(SIZE);
    // ...and +1 puts its left edge on the canvas's left edge.
    expect(imagePlacement({ ...zoomed, offsetX: 1 }, SIZE).x).toBe(0);
  });

  it("never lets an offset expose a gap, because zoom 1 has no pan range", () => {
    // The issue's "should pan be clamped so the image can never under-fill
    // the canvas?" — answered by construction: offsets scale with the slack
    // the zoom opened up, and at zoom 1 that slack is zero.
    for (const offset of [-1, -0.5, 0.5, 1]) {
      expect(
        imagePlacement({ zoom: 1, offsetX: offset, offsetY: offset }, SIZE),
      ).toEqual({ x: 0, y: 0, size: SIZE });
    }
  });

  it("clamps zoom below 1 and above the maximum", () => {
    expect(
      imagePlacement({ zoom: 0.2, offsetX: 0, offsetY: 0 }, SIZE).size,
    ).toBe(SIZE * MIN_IMAGE_ZOOM);
    expect(
      imagePlacement({ zoom: 99, offsetX: 0, offsetY: 0 }, SIZE).size,
    ).toBe(SIZE * MAX_IMAGE_ZOOM);
  });

  it("clamps offsets outside -1..1 rather than sliding the image off-canvas", () => {
    const far = imagePlacement({ zoom: 2, offsetX: 50, offsetY: -50 }, SIZE);
    expect(far).toEqual(
      imagePlacement({ zoom: 2, offsetX: 1, offsetY: -1 }, SIZE),
    );
  });

  it("falls back to the default fit for non-finite values", () => {
    expect(
      imagePlacement({ zoom: NaN, offsetX: NaN, offsetY: NaN }, SIZE),
    ).toEqual({ x: 0, y: 0, size: SIZE });
  });

  it("rounds to 3 decimals so exported SVG carries no float noise", () => {
    const placed = imagePlacement(
      { zoom: 1.333, offsetX: 0.1, offsetY: 0 },
      SIZE,
    );
    for (const value of [placed.x, placed.y, placed.size]) {
      expect(String(value)).toMatch(/^-?\d+(\.\d{1,3})?$/);
    }
  });
});
