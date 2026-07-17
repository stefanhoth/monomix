import { describe, expect, it } from "vitest";
import { composeMonogram } from "../../src/engine";
import { composeBackgroundLayer } from "../../src/engine/background";
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
