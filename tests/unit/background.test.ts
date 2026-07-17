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
