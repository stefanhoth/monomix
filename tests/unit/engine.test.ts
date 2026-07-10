import { describe, expect, it } from "vitest";
import { composeMonogram } from "../../src/engine";

describe("composeMonogram", () => {
  it("uppercases and caps letters at three", () => {
    expect(composeMonogram("stef")).toBe('<monogram letters="STE" />');
  });
});
