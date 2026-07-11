/**
 * The rendering engine is pure: (letters, font, Frame, colors) in, an SVG
 * markup string out. No DOM access, no globals — see CLAUDE.md. This keeps
 * every Design/Frame combination unit-testable without a browser.
 */
export { composeMonogram, type ComposeOptions } from "./render";
export {
  layoutLetters,
  VIEWBOX_SIZE,
  type Arrangement,
  type Layout,
  type LayoutOptions,
  type PositionedLetter,
} from "./layout";
export { DESIGNS, type Design, type LetterCount } from "./designs";
export { FONTS, type FontEntry, type FontStyle } from "./fonts";
export {
  FRAMES,
  NO_FRAME_ID,
  composeFrame,
  type Frame,
  type FrameShapeKind,
  type FrameOptions,
} from "./frames";
