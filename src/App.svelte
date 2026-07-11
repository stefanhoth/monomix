<script lang="ts">
  import { onMount } from "svelte";
  import type { Font } from "opentype.js";
  import { composeMonogram } from "./engine";
  import { FONTS } from "./engine/fonts";
  import { loadFont } from "./lib/font-loader";
  import { exportSvg } from "./lib/export/svg";
  import { exportPng, exportJpg } from "./lib/export/raster";
  import { triggerDownload } from "./lib/export/download";

  // TEMP default font until the Design gallery (issue #11) picks one.
  const defaultFont = FONTS.find((f) => f.id === "archivo-black")!;

  let letters = $state("MX");
  let font: Font | undefined = $state(undefined);
  let preview = $derived(
    font && letters.length > 0 ? composeMonogram(letters, font) : "",
  );

  onMount(async () => {
    font = await loadFont(defaultFont.url);
  });

  async function handleExport(format: "svg" | "png" | "jpg" | "pdf") {
    if (!font || !preview) return;
    const svg = composeMonogram(letters, font);
    let blob: Blob;
    switch (format) {
      case "svg":
        blob = exportSvg(svg);
        break;
      case "png":
        blob = await exportPng(svg);
        break;
      case "jpg":
        blob = await exportJpg(svg);
        break;
      case "pdf": {
        // jsPDF + svg2pdf.js are ~490 KB — code-split so the common case
        // (no PDF export) never pays for it (docs/BACKLOG.md).
        const { exportPdf } = await import("./lib/export/pdf");
        blob = await exportPdf(svg);
        break;
      }
    }
    triggerDownload(blob, `monomix.${format}`);
  }
</script>

<main>
  <h1>MonoMix</h1>
  <p class="tagline">Mix your monogram and take it with you.</p>

  <label>
    Letters
    <input bind:value={letters} maxlength="3" />
  </label>

  <div class="preview">
    {#if preview}
      {@html preview}
    {/if}
  </div>

  <div class="export-actions">
    <button onclick={() => handleExport("svg")} disabled={!preview}>
      Export SVG
    </button>
    <button onclick={() => handleExport("png")} disabled={!preview}>
      Export PNG
    </button>
    <button onclick={() => handleExport("jpg")} disabled={!preview}>
      Export JPG
    </button>
    <button onclick={() => handleExport("pdf")} disabled={!preview}>
      Export PDF
    </button>
  </div>
</main>

<style>
  main {
    max-width: 32rem;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .tagline {
    color: light-dark(#555, #aaa);
  }

  .preview {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background: light-dark(#f2f2f2, #1c1c1e);
    color: light-dark(#111, #eee);
  }

  .preview :global(svg) {
    display: block;
    width: 100%;
    max-width: 20rem;
    margin: 0 auto;
  }

  .export-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
