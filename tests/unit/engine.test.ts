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

describe("composeMonogram (Frame fitting, issue #36)", () => {
  function letterPaths(svg: string): string {
    // Everything after the frame markup and before the closing </g> — i.e.
    // just the glyph <path> elements, not the frame's own geometry.
    return svg.slice(svg.indexOf('<g fill="currentColor">'));
  }

  it("the Frame sits at a fixed position regardless of Frame Gap", () => {
    const tiny = composeMonogram("MX", font, {
      frame: { id: "circle", gap: 0 },
    });
    const huge = composeMonogram("MX", font, {
      frame: { id: "circle", gap: 100000 },
    });
    const frameMarkup = (svg: string) =>
      svg.slice(0, svg.indexOf('<g fill="currentColor">'));
    expect(frameMarkup(tiny)).toBe(frameMarkup(huge));
  });

  it("increasing Frame Gap scales the lettering down, not the Frame", () => {
    const smallGap = composeMonogram("MX", font, {
      frame: { id: "circle", gap: 0 },
    });
    const largeGap = composeMonogram("MX", font, {
      frame: { id: "circle", gap: 300 },
    });
    expect(letterPaths(smallGap)).not.toBe(letterPaths(largeGap));
  });

  it("an extreme Frame Gap that exhausts the Frame's inner boundary shrinks the lettering to nothing, not NaN or invalid geometry", () => {
    const svg = composeMonogram("MX", font, {
      frame: { id: "diamond", gap: 100000 },
    });
    expect(svg).not.toContain("NaN");
    expect((letterPaths(svg).match(/<path /g) ?? []).length).toBe(2);
  });

  it.each(["circle", "square", "diamond", "dotted-circle", "dashed-circle"])(
    "%s: fits every Letter Count without producing NaN or invalid geometry, across a range of gaps",
    (frameId) => {
      for (const letters of ["A", "MX", "WIW"]) {
        for (const gap of [0, 40, 100, 300]) {
          const svg = composeMonogram(letters, font, {
            frame: { id: frameId, gap },
          });
          expect(svg).not.toContain("NaN");
          expect((letterPaths(svg).match(/<path /g) ?? []).length).toBe(
            letters.length,
          );
        }
      }
    },
  );

  it("without a Frame, rendering is unchanged regardless of what gap is passed", () => {
    // Frame Gap only has meaning once a Frame exists (CONTEXT.md) — passing
    // it alongside "No Frame" must not affect the unshaped layout.
    const withoutGap = composeMonogram("MX", font);
    const withGap = composeMonogram("MX", font, {
      frame: { id: "none", gap: 250 },
    });
    expect(withoutGap).toBe(withGap);
  });
});
