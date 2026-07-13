import { describe, expect, it } from "vitest";
import {
  isSupportedLocale,
  resolveBrowserLocale,
} from "../../../src/lib/i18n/locale";

describe("resolveBrowserLocale", () => {
  it("maps a German language tag to de", () => {
    expect(resolveBrowserLocale("de-DE")).toBe("de");
    expect(resolveBrowserLocale("de")).toBe("de");
  });

  it("maps any English variant to en", () => {
    expect(resolveBrowserLocale("en-US")).toBe("en");
    expect(resolveBrowserLocale("en-GB")).toBe("en");
  });

  it("falls back to en for an unsupported language", () => {
    expect(resolveBrowserLocale("fr-FR")).toBe("en");
  });

  it("falls back to en when no language tag is given", () => {
    expect(resolveBrowserLocale(undefined)).toBe("en");
  });
});

describe("isSupportedLocale", () => {
  it("accepts en and de", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("de")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSupportedLocale("fr")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
  });
});
