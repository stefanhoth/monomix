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

  it("draws the monogram's paths into the page content stream, not just an empty page", async () => {
    const svg = composeMonogram("MX", font, { frame: { id: "circle" } });
    const text = await (await exportPdf(svg)).text();
    // jsPDF's fixed font table alone makes an empty page ~3KB, so a size
    // check proves nothing. Count real path-construction operators in the
    // (uncompressed) content stream: moveto + curveto/lineto segments.
    const stream = text.slice(
      text.indexOf("stream"),
      text.indexOf("endstream"),
    );
    expect(stream.match(/ m\n/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(stream.match(/ (c|l)\n/g)?.length ?? 0).toBeGreaterThan(20);

    const empty = await (
      await exportPdf(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"></svg>',
      )
    ).text();
    expect(empty.match(/ m\n/g)).toBeNull();
  });
});
