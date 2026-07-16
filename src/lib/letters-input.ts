/**
 * Letters are restricted to A-Z (CONTEXT.md: input is uppercased; umlauts
 * and other characters are rejected with a transliteration hint rather
 * than silently replaced). This is the pure sanitization logic behind the
 * Letters input — independent of the Svelte component so it's directly
 * unit-testable.
 */
const MAX_LETTERS = 3;

// Lowercase keys, looked up via ch.toLowerCase() — NOT ch.toUpperCase().
// German "ß".toUpperCase() is "SS" (a real JS/Unicode quirk), so validating
// against the *uppercased* string would silently transliterate ß before we
// ever get a chance to reject it. toLowerCase() has no such multi-character
// expansion, so per-character validation stays honest.
const TRANSLITERATIONS: Record<string, string> = {
  ä: "AE",
  ö: "OE",
  ü: "UE",
  ß: "SS",
  à: "A",
  á: "A",
  â: "A",
  ã: "A",
  å: "A",
  è: "E",
  é: "E",
  ê: "E",
  ë: "E",
  ì: "I",
  í: "I",
  î: "I",
  ï: "I",
  ò: "O",
  ó: "O",
  ô: "O",
  õ: "O",
  ù: "U",
  ú: "U",
  û: "U",
  ñ: "N",
  ç: "C",
};

/**
 * Structured, locale-agnostic description of why input was rejected — the
 * final display string is produced by formatLettersHint (src/lib/i18n) so
 * this stays pure and translatable rather than baking in English text.
 */
export type LettersHint =
  | { kind: "generic" }
  | { kind: "suggestion"; invalid: string; suggestion: string };

/**
 * The case model (issue #62, ADR 0008): "upper" is the original, still-
 * default behavior (every valid letter is uppercased). "preserve" keeps
 * each valid letter's case exactly as typed, so "Max" stays "Max" rather
 * than becoming "MAX".
 */
export type LetterCaseMode = "upper" | "preserve";

export interface LettersInputResult {
  /** A-Z or a-z depending on `caseMode`, capped at 3 characters — safe to feed straight into the engine. */
  letters: string;
  /** Set when at least one character was rejected; null when the input was already clean. */
  hint: LettersHint | null;
}

const isAsciiLetter = (ch: string) => /^[a-zA-Z]$/.test(ch);

export function sanitizeLettersInput(
  raw: string,
  caseMode: LetterCaseMode = "upper",
): LettersInputResult {
  const chars = [...raw];
  const invalidChars = chars.filter((ch) => !isAsciiLetter(ch));
  const validChars = chars
    .filter(isAsciiLetter)
    .slice(0, MAX_LETTERS)
    .map((ch) => (caseMode === "upper" ? ch.toUpperCase() : ch));

  if (invalidChars.length === 0) {
    return { letters: validChars.join(""), hint: null };
  }

  const suggestions = invalidChars
    .map((ch) => TRANSLITERATIONS[ch.toLowerCase()])
    .filter((s): s is string => !!s);
  const hint: LettersHint =
    suggestions.length > 0
      ? {
          kind: "suggestion",
          invalid: invalidChars.join(""),
          suggestion: suggestions.join(""),
        }
      : { kind: "generic" };

  return { letters: validChars.join(""), hint };
}
