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

describe("layoutLetters (stacked arrangement)", () => {
  it("positions one letter per row, top to bottom", () => {
    const layout = layoutLetters("ABC", font, { arrangement: "stacked" });
    expect(layout.letters.map((l) => l.letter)).toEqual(["A", "B", "C"]);
    const [a, b, c] = layout.letters;
    if (!a || !b || !c) throw new Error("expected three positioned letters");
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
  });

  it("centers each row horizontally instead of sharing one baseline", () => {
    const layout = layoutLetters("IW", font, { arrangement: "stacked" });
    const [i, w] = layout.letters;
    if (!i || !w) throw new Error("expected two positioned letters");
    // Different letters, same font size -> different widths -> different
    // centered x, unlike horizontal where they share a common baseline y.
    expect(i.y).not.toBe(w.y);
  });

  it("never overflows the viewBox width or height, for narrow/wide letters at every letter count", () => {
    for (const letters of ["I", "W", "IW", "WI", "IWI", "WIW"]) {
      const layout = layoutLetters(letters, font, { arrangement: "stacked" });
      for (const positioned of layout.letters) {
        const width = font.getAdvanceWidth(
          positioned.letter,
          positioned.fontSize,
        );
        expect(positioned.x).toBeGreaterThanOrEqual(0);
        expect(positioned.x + width).toBeLessThanOrEqual(VIEWBOX_SIZE);
        expect(positioned.y).toBeGreaterThanOrEqual(0);
        expect(positioned.y).toBeLessThanOrEqual(VIEWBOX_SIZE);
      }
    }
  });

  it("shrinks per-letter font size as letter count grows", () => {
    const [one] = layoutLetters("A", font, { arrangement: "stacked" }).letters;
    const [two] = layoutLetters("AA", font, { arrangement: "stacked" }).letters;
    const [three] = layoutLetters("AAA", font, {
      arrangement: "stacked",
    }).letters;
    if (!one || !two || !three) throw new Error("expected a positioned letter");
    expect(one.fontSize).toBeGreaterThan(two.fontSize);
    expect(two.fontSize).toBeGreaterThan(three.fontSize);
  });
});
