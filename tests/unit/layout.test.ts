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

  it("never overflows the viewBox width, for a narrow and a wide letter", () => {
    for (const letters of ["I", "W", "IWI", "WIW"]) {
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

  it("applies centerEmphasis only to the middle letter of a 3-letter monogram", () => {
    const plainMiddle = layoutLetters("ABC", font).letters[1];
    const emphasizedMiddle = layoutLetters("ABC", font, { centerEmphasis: 1.5 })
      .letters[1];
    if (!plainMiddle || !emphasizedMiddle)
      throw new Error("expected a middle letter");
    expect(emphasizedMiddle.fontSize).toBeGreaterThan(plainMiddle.fontSize);

    // no "middle" letter in a 2-letter monogram — emphasis must be a no-op
    const [twoA, twoB] = layoutLetters("AB", font, {
      centerEmphasis: 1.5,
    }).letters;
    const [plainA, plainB] = layoutLetters("AB", font).letters;
    if (!twoA || !twoB || !plainA || !plainB)
      throw new Error("expected two positioned letters");
    expect(twoA.fontSize).toBeCloseTo(plainA.fontSize, 5);
    expect(twoB.fontSize).toBeCloseTo(plainB.fontSize, 5);
  });

  it("is a pure function: identical input produces identical output", () => {
    const a = layoutLetters("MX", font);
    const b = layoutLetters("MX", font);
    expect(a).toEqual(b);
  });
});
