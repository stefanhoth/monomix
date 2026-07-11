import { describe, expect, it } from "vitest";
import { exportSvg } from "../../../src/lib/export/svg";

const SAMPLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path d="M0 0"/></svg>';

describe("exportSvg", () => {
  it("produces a Blob with the correct MIME type", () => {
    const blob = exportSvg(SAMPLE_SVG);
    expect(blob.type).toBe("image/svg+xml");
  });

  it("prepends an XML prolog and preserves the SVG content, with no external references", async () => {
    const blob = exportSvg(SAMPLE_SVG);
    const text = await blob.text();
    expect(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
      true,
    );
    expect(text).toContain(SAMPLE_SVG);
    expect(text).not.toContain("<image");
    expect(text).not.toContain("xlink:href");
    expect(text).not.toContain("@font-face");
  });
});
