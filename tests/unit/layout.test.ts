import { describe, expect, it } from "vitest";
import { layoutLetters, VIEWBOX_SIZE } from "../../src/engine/layout";
import { loadTestFont } from "./helpers/load-test-font";

const font = loadTestFont("archivo-black");

describe("layoutLetters", () => {
  it("rejects empty and >3 letter input", () => {
    expect(() => layoutLetters("", font)).toThrow();
    expect(() => layoutLetters("WXYZ", font)).toThrow();
  });

  it("positions one letter per input character", () => {
    for (const letters of ["A", "AB", "ABC"]) {
      const layout = layoutLetters(letters, font);
      expect(layout.letters.map((l) => l.letter)).toEqual([...letters]);
    }
  });

  it("never overflows the viewBox width, for narrow/wide letters at every letter count", () => {
    for (const letters of ["I", "W", "IW", "WI", "IWI", "WIW"]) {
      const layout = layoutLetters(letters, font);
      const [first] = layout.letters;
      const last = layout.letters.at(-1);
      if (!first || !last)
        throw new Error("expected at least one positioned letter");
      const rightEdge =
        last.x + font.getAdvanceWidth(last.letter, last.fontSize);
      expect(first.x).toBeGreaterThanOrEqual(0);
      expect(rightEdge).toBeLessThanOrEqual(VIEWBOX_SIZE);
    }
  });

  it("shrinks per-letter font size as letter count grows", () => {
    const [one] = layoutLetters("A", font).letters;
    const [two] = layoutLetters("AA", font).letters;
    const [three] = layoutLetters("AAA", font).letters;
    if (!one || !two || !three) throw new Error("expected a positioned letter");
    expect(one.fontSize).toBeGreaterThan(two.fontSize);
    expect(two.fontSize).toBeGreaterThan(three.fontSize);
  });

  it("is a pure function: matches its regression snapshot", () => {
    expect(layoutLetters("MX", font)).toMatchInlineSnapshot(`
      {
        "letters": [
          {
            "fontSize": 487.8048780487805,
            "letter": "M",
            "x": 79.99999999999994,
            "y": 662.9268292682927,
          },
          {
            "fontSize": 487.8048780487805,
            "letter": "X",
            "x": 540.4878048780488,
            "y": 662.9268292682927,
          },
        ],
      }
    `);
  });
});
