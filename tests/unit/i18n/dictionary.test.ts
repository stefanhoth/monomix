import { describe, expect, it } from "vitest";
import {
  dictionary,
  LOCALES,
  translate,
} from "../../../src/lib/i18n/dictionary";

describe("dictionary completeness", () => {
  it("has a non-empty string for every locale on every key", () => {
    for (const [key, entry] of Object.entries(dictionary)) {
      for (const locale of LOCALES) {
        expect(entry[locale], `${key}.${locale}`).toBeTypeOf("string");
        expect(entry[locale].trim().length, `${key}.${locale}`).toBeGreaterThan(
          0,
        );
      }
    }
  });
});

describe("translate", () => {
  it("looks up a key for the given locale", () => {
    expect(translate("projects.new", "en")).toBe("New Project");
    expect(translate("projects.new", "de")).toBe("Neues Projekt");
  });

  it("interpolates params into {placeholders}", () => {
    const text = translate("letters.hint.suggestion", "en", {
      suggestion: "AE",
      invalid: "ä",
    });
    expect(text).toContain('"AE"');
    expect(text).toContain('"ä"');
  });

  it("leaves the string untouched when no params are given", () => {
    expect(translate("letters.label", "en")).toBe("Letters");
  });
});
