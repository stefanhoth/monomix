import type { LettersHint } from "../letters-input";
import { translate, type Locale } from "./dictionary";

/** Turns a structured LettersHint (src/lib/letters-input.ts) into display text for the given locale. */
export function formatLettersHint(hint: LettersHint, locale: Locale): string {
  if (hint.kind === "generic") {
    return translate("letters.hint.generic", locale);
  }
  return translate("letters.hint.suggestion", locale, {
    suggestion: hint.suggestion,
    invalid: hint.invalid,
  });
}
