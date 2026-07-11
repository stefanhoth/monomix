import { resolveExportSize, resolveJpgBackground } from "./options";

/**
 * PNG/JPG rasterization uses the browser's native Canvas API (Image +
 * <canvas> + toBlob) rather than a WASM rasterizer — no extra dependency,
 * and it's the real code path browsers execute. The tradeoff: canvas isn't
 * available in jsdom, so this file isn't unit-tested — the download flow
 * (including real PNG/JPEG signature bytes) is covered by Playwright E2E
 * instead, which runs an actual browser. The pure decision logic these
 * functions rely on (resolveExportSize, resolveJpgBackground) lives in
 * options.ts and *is* unit-tested.
 */
async function rasterize(
  svgString: string,
  size: number,
): Promise<HTMLCanvasElement> {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to rasterize SVG"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }
    ctx.drawImage(image, 0, 0, size, size);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error(`${type} export failed`)),
      type,
      quality,
    );
  });
}

export async function exportPng(
  svgString: string,
  size?: number,
): Promise<Blob> {
  const resolvedSize = resolveExportSize(size);
  const canvas = await rasterize(svgString, resolvedSize);
  return canvasToBlob(canvas, "image/png");
}

export async function exportJpg(
  svgString: string,
  size?: number,
  background?: string,
): Promise<Blob> {
  const resolvedSize = resolveExportSize(size);
  const resolvedBackground = resolveJpgBackground(background);
  const canvas = await rasterize(svgString, resolvedSize);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  // JPEG has no alpha channel — paint the fallback color behind whatever
  // was already drawn (which may include transparent areas).
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = resolvedBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvasToBlob(canvas, "image/jpeg", 0.92);
}
