import { describe, expect, it } from "vitest";
import { composeMonogram } from "../../src/engine";
import { loadTestFont } from "./helpers/load-test-font";

const font = loadTestFont("archivo-black");

describe("composeMonogram", () => {
  it("produces a self-contained SVG with one path per letter", () => {
    const svg = composeMonogram("MX", font);
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1000 1000">/,
    );
    expect(svg).toContain("</svg>");
    expect((svg.match(/<path /g) ?? []).length).toBe(2);
  });

  it("draws the frame before the letters when a frame is given", () => {
    const svg = composeMonogram("A", font, { frame: { id: "circle" } });
    expect(svg).toContain("<circle");
    expect(svg.indexOf("<circle")).toBeLessThan(svg.indexOf("<path"));
  });

  it("produces the letter composition unchanged when no frame is given", () => {
    const withoutOption = composeMonogram("A", font);
    const withNoFrameId = composeMonogram("A", font, { frame: { id: "none" } });
    expect(withoutOption).toBe(withNoFrameId);
    expect(withoutOption).not.toContain("circle");
    expect(withoutOption).not.toContain("rect");
  });

  it("applies the letters color to the glyph group", () => {
    const svg = composeMonogram("A", font, { lettersColor: "#ff0000" });
    expect(svg).toContain('<g fill="#ff0000">');
  });

  it("defaults letters color to currentColor", () => {
    const svg = composeMonogram("A", font);
    expect(svg).toContain('<g fill="currentColor">');
  });

  it("draws a background rect first when a background color is given", () => {
    const svg = composeMonogram("A", font, { background: "#00ff00" });
    expect(svg).toContain('<rect width="1000" height="1000" fill="#00ff00"/>');
    expect(svg.indexOf("<rect")).toBeLessThan(svg.indexOf("<path"));
  });

  it("omits the background rect by default (transparent)", () => {
    const svg = composeMonogram("A", font);
    expect(svg).not.toContain("<rect");
  });

  it("omits the background rect when explicitly set to transparent", () => {
    const svg = composeMonogram("A", font, { background: "transparent" });
    expect(svg).not.toContain("<rect");
  });

  it("falls back to safe defaults instead of crashing or injecting malformed colors", () => {
    const svg = composeMonogram("A", font, {
      lettersColor: 'red" onload="alert(1)',
      background: "javascript:alert(1)",
      frame: { id: "circle", color: "</svg><script>alert(1)</script>" },
    });
    expect(svg).toContain('<g fill="currentColor">');
    expect(svg).not.toContain("<rect");
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("onload");
  });

  it("is a pure function: matches its regression snapshot", () => {
    // File snapshot (not inline) — the full SVG path data is too long to
    // read comfortably inline in the test source.
    expect(composeMonogram("MX", font)).toMatchSnapshot();
  });
});
