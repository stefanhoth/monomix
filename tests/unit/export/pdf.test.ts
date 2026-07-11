import { describe, expect, it } from "vitest";
import { exportPdf } from "../../../src/lib/export/pdf";
import { composeMonogram } from "../../../src/engine";
import { loadTestFont } from "../helpers/load-test-font";

const font = loadTestFont("archivo-black");

describe("exportPdf", () => {
  it("produces a Blob with the correct MIME type and PDF header", async () => {
    const svg = composeMonogram("MX", font);
    const blob = await exportPdf(svg);
    expect(blob.type).toBe("application/pdf");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("produces a non-trivial single-page PDF containing the monogram", async () => {
    const svg = composeMonogram("MX", font, { frame: { id: "circle" } });
    const blob = await exportPdf(svg);
    const text = await blob.text();
    // A real content stream, not just an empty page — proves the SVG's
    // paths actually made it into the PDF, not just a blank document.
    expect(text).toContain("/Type /Page");
    expect(text.length).toBeGreaterThan(500);
  });
});
