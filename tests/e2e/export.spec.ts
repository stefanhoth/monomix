import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const FORMATS = [
  { button: "Export SVG", extension: "svg" },
  { button: "Export PNG", extension: "png" },
  { button: "Export JPG", extension: "jpg" },
  { button: "Export PDF", extension: "pdf" },
] as const;

for (const { button, extension } of FORMATS) {
  test(`exporting as ${extension.toUpperCase()} downloads a valid file`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: button })).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: button }).click(),
    ]);

    expect(download.suggestedFilename()).toBe(`monomix.${extension}`);

    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = await readFile(path!);
    expect(bytes.length).toBeGreaterThan(0);

    switch (extension) {
      case "svg":
        expect(bytes.toString("utf-8")).toContain("<svg");
        break;
      case "png":
        // 8-byte PNG signature.
        expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        break;
      case "jpg":
        // JFIF/EXIF JPEG SOI marker.
        expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
        break;
      case "pdf":
        expect(bytes.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
        break;
    }
  });
}
