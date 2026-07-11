/**
 * The rendering engine is pure: (letters, font, Frame clip, colors) in, an
 * SVG markup string out. No DOM access, no globals — see CLAUDE.md. This
 * keeps every Design/Frame combination unit-testable without a browser.
 */
export { composeMonogram, type ComposeOptions } from "./render";
export {
  layoutLetters,
  VIEWBOX_SIZE,
  type Layout,
  type PositionedLetter,
} from "./layout";
