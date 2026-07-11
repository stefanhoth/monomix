/**
 * Validates a color string before it's interpolated into SVG markup.
 *
 * This isn't just "don't crash on malformed input" — colors flow straight
 * into `fill="${color}"` / `stroke="${color}"` attributes in a string that
 * later gets rendered via `{@html}` in the UI. An unvalidated string like
 * `red" onload="alert(1)` would be a real XSS vector, not just a cosmetic
 * bug. The allow-list below has no room for `"`, `<`, `>`, or `=`, so
 * nothing matching it can break out of the attribute it's placed in.
 */
const SAFE_COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|rgba|hsl|hsla)\([\d.,%\s]+\))$/;

export function sanitizeColor(
  input: string | undefined,
  fallback: string,
): string {
  if (input === undefined) return fallback;
  return SAFE_COLOR_PATTERN.test(input) ? input : fallback;
}
