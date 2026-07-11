import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";

/**
 * Renders `svgString` into a single-page PDF sized to match its own
 * viewBox (in points, 1 viewBox unit = 1pt — arbitrary but simple, since
 * the monogram is vector art with no fixed physical size). Everything is
 * already vector paths (ADR 0001/0006), so no font embedding is needed.
 */
export async function exportPdf(svgString: string): Promise<Blob> {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.documentElement;

  const viewBox = svgEl.getAttribute("viewBox");
  const [, , width, height] = viewBox
    ? viewBox.split(/\s+/).map(Number)
    : [0, 0, 1000, 1000];

  const pdf = new jsPDF({
    unit: "pt",
    format: [width ?? 1000, height ?? 1000],
  });
  await svg2pdf(svgEl as unknown as SVGSVGElement, pdf, {
    x: 0,
    y: 0,
    width,
    height,
  });

  return pdf.output("blob");
}
