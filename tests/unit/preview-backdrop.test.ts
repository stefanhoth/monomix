import { describe, expect, it } from "vitest";
import { backdropTone } from "../../src/lib/preview-backdrop";

describe("backdropTone", () => {
  // The reported bug (issue #46): default near-black letters were invisible
  // on the dark-mode checkerboard. Dark letters must get the light board —
  // independent of any UI theme.
  it("picks the light board for the default near-black letters", () => {
    expect(backdropTone("#111111")).toBe("light");
  });

  // The mirrored case: deliberately white letters (dark-merch monograms)
  // must not vanish on a white board.
  it("picks the dark board for white letters", () => {
    expect(backdropTone("#ffffff")).toBe("dark");
  });

  // A light pastel reads far better against the dark board, a saturated
  // mid-blue against the light one — the choice maximizes contrast, it's
  // not just a black/white special case.
  it("picks the board with more contrast for real-world colors", () => {
    expect(backdropTone("#ffb4ab")).toBe("dark");
    expect(backdropTone("#0b57d0")).toBe("light");
  });

  it("parses shorthand hex", () => {
    expect(backdropTone("#fff")).toBe("dark");
    expect(backdropTone("#111")).toBe("light");
  });

  // Project settings come back from IndexedDB and are untrusted — anything
  // unparseable falls back to the light board, the safe choice for the
  // near-black default letters.
  it("falls back to the light board for unparseable input", () => {
    expect(backdropTone("")).toBe("light");
    expect(backdropTone("tomato")).toBe("light");
    expect(backdropTone("#12345")).toBe("light");
  });
});
