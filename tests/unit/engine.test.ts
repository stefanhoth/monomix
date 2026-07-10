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

  it("wraps the letters in a clipPath when clipPathD is given", () => {
    const svg = composeMonogram("A", font, {
      clipPathD: "M0 0 L1000 0 L1000 1000 Z",
    });
    expect(svg).toContain('<clipPath id="mm-clip">');
    expect(svg).toContain('clip-path="url(#mm-clip)"');
  });

  it("omits the clipPath entirely when no clip is given", () => {
    const svg = composeMonogram("A", font);
    expect(svg).not.toContain("clipPath");
  });

  it("is a pure function: identical input produces identical output", () => {
    expect(composeMonogram("MX", font)).toBe(composeMonogram("MX", font));
  });
});
