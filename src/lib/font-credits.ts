// Font credits (issue #55-to-be, ADR 0003: "an about page credits every
// font"). Pure helpers for the credits panel — the catalog data itself
// lives in src/engine/fonts.ts.

import type { FontEntry } from "../engine";

/** The family's page on fonts.google.com — every catalog font is sourced
 * from google/fonts (docs/FONTS.md), so the specimen page doubles as the
 * canonical credit link. */
export function specimenUrl(family: string): string {
  return `https://fonts.google.com/specimen/${family.replaceAll(" ", "+")}`;
}

/** License display names are legal proper nouns — deliberately not in the
 * i18n dictionary. */
export function licenseName(license: FontEntry["license"]): string {
  switch (license) {
    case "OFL-1.1":
      return "SIL Open Font License 1.1";
    case "Apache-2.0":
      return "Apache License 2.0";
  }
}
