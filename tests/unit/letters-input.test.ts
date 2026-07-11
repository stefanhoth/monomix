import { describe, expect, it } from "vitest";
import { sanitizeLettersInput } from "../../src/lib/letters-input";

describe("sanitizeLettersInput", () => {
  it("uppercases valid A-Z input", () => {
    expect(sanitizeLettersInput("abc")).toEqual({ letters: "ABC", hint: null });
  });

  it("caps at 3 characters without a hint", () => {
    expect(sanitizeLettersInput("abcd")).toEqual({
      letters: "ABC",
      hint: null,
    });
  });

  it("passes through empty input", () => {
    expect(sanitizeLettersInput("")).toEqual({ letters: "", hint: null });
  });

  it("rejects an umlaut and suggests its transliteration, without applying it", () => {
    const result = sanitizeLettersInput("mä");
    expect(result.letters).toBe("M");
    expect(result.hint).toContain("AE");
    expect(result.hint).not.toBeNull();
  });

  it("rejects a character with no known transliteration using a generic hint", () => {
    const result = sanitizeLettersInput("m@");
    expect(result.letters).toBe("M");
    expect(result.hint).toBe("Only A-Z letters are supported.");
  });

  it("filters invalid characters before applying the 3-letter cap", () => {
    // "MÄXI" has 4 valid letters once Ä is stripped (M, X, I) plus itself —
    // make sure the cap counts only the valid ones, not the raw length.
    const result = sanitizeLettersInput("mäxi");
    expect(result.letters).toBe("MXI");
  });

  it("never lets a rejected character silently appear in the output", () => {
    for (const raw of ["ß", "@", "1", " ", "ü"]) {
      const result = sanitizeLettersInput(raw);
      expect(result.letters).not.toContain(raw.toUpperCase());
    }
  });
});
