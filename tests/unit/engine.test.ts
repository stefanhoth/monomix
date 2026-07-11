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

  it("is a pure function: matches its regression snapshot", () => {
    // File snapshot (not inline) — the full SVG path data is too long to
    // read comfortably inline in the test source.
    expect(composeMonogram("MX", font)).toMatchSnapshot();
  });
});
