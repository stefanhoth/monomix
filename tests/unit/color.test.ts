import { describe, expect, it } from "vitest";
import { sanitizeColor } from "../../src/engine/color";

describe("sanitizeColor", () => {
  it("accepts common valid color formats", () => {
    for (const color of [
      "#fff",
      "#ffffff",
      "#ffffffaa",
      "red",
      "currentColor",
      "transparent",
      "rgb(255, 0, 0)",
      "rgba(255, 0, 0, 0.5)",
      "hsl(0, 100%, 50%)",
    ]) {
      expect(sanitizeColor(color, "fallback")).toBe(color);
    }
  });

  it("falls back to the given default when input is undefined", () => {
    expect(sanitizeColor(undefined, "currentColor")).toBe("currentColor");
  });

  it("falls back for malformed/nonsense input instead of crashing", () => {
    expect(sanitizeColor("not a color!!!", "currentColor")).toBe(
      "currentColor",
    );
    expect(sanitizeColor("", "currentColor")).toBe("currentColor");
  });

  // Colors are interpolated straight into SVG attribute strings that later
  // render via {@html} — an unsanitized value here would be a real XSS
  // vector, not just a cosmetic bug. Every attempt below must be rejected.
  it("rejects attribute-breakout / injection attempts", () => {
    const attempts = [
      'red" onload="alert(1)',
      "red'><script>alert(1)</script>",
      "red;</style><script>alert(1)</script>",
      "url(javascript:alert(1))",
      "</svg><script>alert(1)</script>",
    ];
    for (const attempt of attempts) {
      expect(sanitizeColor(attempt, "currentColor")).toBe("currentColor");
    }
  });
});
