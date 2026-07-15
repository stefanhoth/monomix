import { describe, expect, it } from "vitest";
import { FONTS } from "../../src/engine";
import { licenseName, specimenUrl } from "../../src/lib/font-credits";

describe("specimenUrl", () => {
  it("builds the fonts.google.com specimen URL from a family name", () => {
    expect(specimenUrl("Playfair Display")).toBe(
      "https://fonts.google.com/specimen/Playfair+Display",
    );
    expect(specimenUrl("Rye")).toBe("https://fonts.google.com/specimen/Rye");
  });

  it("handles multi-space families without leaking raw spaces", () => {
    expect(specimenUrl("Monsieur La Doulaise")).toBe(
      "https://fonts.google.com/specimen/Monsieur+La+Doulaise",
    );
  });
});

describe("licenseName", () => {
  it("maps every catalog license id to its full display name", () => {
    expect(licenseName("OFL-1.1")).toBe("SIL Open Font License 1.1");
    expect(licenseName("Apache-2.0")).toBe("Apache License 2.0");
  });

  it("covers every license actually used by the catalog", () => {
    for (const font of FONTS) {
      expect(licenseName(font.license)).toBeTruthy();
    }
  });
});
