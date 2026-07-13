import { describe, expect, it } from "vitest";
import { formatLettersHint } from "../../../src/lib/i18n/format-letters-hint";

describe("formatLettersHint", () => {
  it("formats a generic hint in English", () => {
    expect(formatLettersHint({ kind: "generic" }, "en")).toBe(
      "Only A-Z letters are supported.",
    );
  });

  it("formats a generic hint in German", () => {
    expect(formatLettersHint({ kind: "generic" }, "de")).toBe(
      "Es werden nur die Buchstaben A-Z unterstützt.",
    );
  });

  it("interpolates the suggestion and invalid chars in English", () => {
    const text = formatLettersHint(
      { kind: "suggestion", invalid: "ä", suggestion: "AE" },
      "en",
    );
    expect(text).toBe(
      'Only A-Z letters are supported. Try "AE" instead of "ä".',
    );
  });

  it("interpolates the suggestion and invalid chars in German", () => {
    const text = formatLettersHint(
      { kind: "suggestion", invalid: "ä", suggestion: "AE" },
      "de",
    );
    expect(text).toContain("AE");
    expect(text).toContain("ä");
  });
});
