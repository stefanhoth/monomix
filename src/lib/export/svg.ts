/**
 * The composed SVG (src/engine) is already self-contained — no external
 * font/image references, since glyphs are converted to paths (ADR 0001).
 * Exporting is just adding the XML prolog some tools expect for a
 * standalone .svg file and wrapping it as a downloadable Blob.
 */
export function exportSvg(svgString: string): Blob {
  const withProlog = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
  return new Blob([withProlog], { type: "image/svg+xml" });
}
