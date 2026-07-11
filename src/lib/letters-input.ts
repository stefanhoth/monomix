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

export interface LettersInputResult {
  /** Always uppercase A-Z, capped at 3 characters — safe to feed straight into the engine. */
  letters: string;
  /** Set when at least one character was rejected; null when the input was already clean. */
  hint: string | null;
}

const isAsciiLetter = (ch: string) => /^[a-zA-Z]$/.test(ch);

export function sanitizeLettersInput(raw: string): LettersInputResult {
  const chars = [...raw];
  const invalidChars = chars.filter((ch) => !isAsciiLetter(ch));
  const validChars = chars
    .filter(isAsciiLetter)
    .slice(0, MAX_LETTERS)
    .map((ch) => ch.toUpperCase());

  if (invalidChars.length === 0) {
    return { letters: validChars.join(""), hint: null };
  }

  const suggestions = invalidChars
    .map((ch) => TRANSLITERATIONS[ch.toLowerCase()])
    .filter((s): s is string => !!s);
  const hint =
    suggestions.length > 0
      ? `Only A-Z letters are supported. Try "${suggestions.join("")}" instead of "${invalidChars.join("")}".`
      : `Only A-Z letters are supported.`;

  return { letters: validChars.join(""), hint };
}
