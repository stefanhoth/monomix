/**
 * Turns a user-picked image file into a data URL the engine can embed
 * (src/engine/background.ts) — kept out of src/engine/ since it does
 * DOM/File/canvas I/O and CLAUDE.md requires the engine to stay pure.
 *
 * Downscales to MAX_DIMENSION on the long edge before encoding: a raw
 * phone-camera photo can be tens of MB, which would both bloat the
 * IndexedDB-persisted Project (every autosave round-trips it) and slow
 * down every re-render of the preview/gallery thumbnails that embed it.
 * PNG/GIF/WebP sources keep PNG (may carry transparency); anything else
 * (JPEG, HEIC-as-JPEG after browser decode, ...) becomes a quality-0.88
 * JPEG, which is dramatically smaller for photographic source material.
 */
const MAX_DIMENSION = 1600;
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB — reject before even decoding.

export class BackgroundImageError extends Error {}

function keepsTransparency(mimeType: string): boolean {
  return (
    mimeType === "image/png" ||
    mimeType === "image/gif" ||
    mimeType === "image/webp"
  );
}

export async function prepareBackgroundImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new BackgroundImageError("not-an-image");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new BackgroundImageError("too-large");
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new BackgroundImageError("decode-failed"));
      image.src = url;
    });

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new BackgroundImageError("canvas-unavailable");
    }
    ctx.drawImage(image, 0, 0, width, height);

    return keepsTransparency(file.type)
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}
