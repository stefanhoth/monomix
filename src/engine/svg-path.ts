import type { PathCommand } from "opentype.js";

/**
 * Serializes opentype.js path commands to an SVG path `d` string ourselves,
 * rather than trusting `Path.prototype.toPathData()`.
 *
 * opentype.js 2.0.0's own rounding helper concatenates a coordinate's decimal
 * remainder into a string like `${decimalPart}e+${places}` to round it. When
 * a coordinate lands extremely close to a whole number (a routine outcome of
 * scaling font units by an arbitrary fontSize), the remainder itself is tiny
 * enough that its own string form is already in exponential notation (e.g.
 * "5.68e-14"), producing a malformed double-exponent string ("5.68e-14e+2")
 * that parses to NaN — silently corrupting the glyph outline. Plain
 * `Number.prototype.toFixed` has no such bug, so we use that instead.
 */
export function pathCommandsToSvgData(
  commands: PathCommand[],
  decimalPlaces = 2,
): string {
  const n = (value: number) => value.toFixed(decimalPlaces);

  return commands
    .map((cmd) => {
      switch (cmd.type) {
        case "M":
          return `M${n(cmd.x)} ${n(cmd.y)}`;
        case "L":
          return `L${n(cmd.x)} ${n(cmd.y)}`;
        case "Q":
          return `Q${n(cmd.x1)} ${n(cmd.y1)} ${n(cmd.x)} ${n(cmd.y)}`;
        case "C":
          return `C${n(cmd.x1)} ${n(cmd.y1)} ${n(cmd.x2)} ${n(cmd.y2)} ${n(cmd.x)} ${n(cmd.y)}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}
