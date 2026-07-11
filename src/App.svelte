<script lang="ts">
  import { onMount } from "svelte";
  import type { Font } from "opentype.js";
  import { composeMonogram } from "./engine";
  import { FONTS } from "./engine/fonts";
  import { loadFont } from "./lib/font-loader";
  import { exportSvg } from "./lib/export/svg";
  import { exportPng, exportJpg } from "./lib/export/raster";
  import { triggerDownload } from "./lib/export/download";
  import { DEFAULT_EXPORT_SIZE } from "./lib/export/options";
  import { sanitizeLettersInput } from "./lib/letters-input";

  // TEMP default font until the Design gallery (issue #11) picks one.
  const defaultFont = FONTS.find((f) => f.id === "archivo-black")!;

  let letters = $state("MX");
  let lettersHint: string | null = $state(null);
  let font: Font | undefined = $state(undefined);
  let exportSize = $state(DEFAULT_EXPORT_SIZE);
  let preview = $derived(
    font && letters.length > 0 ? composeMonogram(letters, font) : "",
  );

  onMount(async () => {
    font = await loadFont(defaultFont.url);
  });

  // No native maxlength: it counts raw keystrokes, not valid ones, so once
  // 3 valid letters already fill the field, the browser would block the
  // 4th keystroke *before* oninput ever fires — swallowing an invalid
  // character with no hint shown at all. sanitizeLettersInput() already
  // enforces the 3-letter cap itself.
  function handleLettersInput(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    const result = sanitizeLettersInput(event.currentTarget.value);
    letters = result.letters;
    lettersHint = result.hint;
    // Keep the DOM in sync immediately — a rejected character (e.g. an
    // umlaut) must never render, not even for a frame.
    event.currentTarget.value = result.letters;
  }

  async function handleExport(format: "svg" | "png" | "jpg" | "pdf") {
    if (!preview) return;
    let blob: Blob;
    switch (format) {
      case "svg":
        blob = exportSvg(preview);
        break;
      case "png":
        blob = await exportPng(preview, exportSize);
        break;
      case "jpg":
        blob = await exportJpg(preview, exportSize);
        break;
      case "pdf": {
        // jsPDF + svg2pdf.js are ~490 KB — code-split so the common case
        // (no PDF export) never pays for it (docs/BACKLOG.md).
        const { exportPdf } = await import("./lib/export/pdf");
        blob = await exportPdf(preview);
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
    <input value={letters} oninput={handleLettersInput} />
  </label>
  {#if lettersHint}
    <p class="hint" role="alert">{lettersHint}</p>
  {/if}

  <div class="preview">
    {#if preview}
      {@html preview}
    {/if}
  </div>

  <label>
    PNG/JPG size (px)
    <input type="number" min="128" max="4096" bind:value={exportSize} />
  </label>

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

  @media (max-width: 30rem) {
    main {
      margin: 1.5rem auto;
    }
  }

  .tagline {
    color: light-dark(#555, #aaa);
  }

  .hint {
    color: light-dark(#b3261e, #ffb4ab);
    font-size: 0.875rem;
    margin: 0.25rem 0 0;
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
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
