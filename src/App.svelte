<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { scale } from "svelte/transition";
  import type { Font } from "opentype.js";
  import { composeMonogram, DESIGNS, FONTS, type LetterCount } from "./engine";
  import { loadFont } from "./lib/font-loader";
  import { exportSvg } from "./lib/export/svg";
  import { exportPng, exportJpg } from "./lib/export/raster";
  import { triggerDownload } from "./lib/export/download";
  import { DEFAULT_EXPORT_SIZE } from "./lib/export/options";
  import { sanitizeLettersInput } from "./lib/letters-input";
  import {
    filterDesignsByLetterCount,
    resolveSelectedDesignId,
  } from "./lib/gallery";
  import DesignGallery from "./components/DesignGallery.svelte";

  let letters = $state("MX");
  let lettersHint: string | null = $state(null);
  // Debounced separately from `letters` — the main preview reflects every
  // keystroke instantly (Design Principle 3), but re-composing all ~30+
  // gallery tiles on every keystroke is wasted work while still typing.
  let debouncedLetters = $state(untrack(() => letters));
  let fonts: Map<string, Font> = $state(new Map());
  let exportSize = $state(DEFAULT_EXPORT_SIZE);
  // The user's explicit choice, if any — undefined until they pick a tile.
  // Never written to reactively; see resolvedDesignId below.
  let selectedDesignId: string | undefined = $state(undefined);

  let letterCount = $derived(
    Math.min(Math.max(letters.length, 1), 3) as LetterCount,
  );
  let availableDesigns = $derived(
    filterDesignsByLetterCount(DESIGNS, letterCount),
  );
  // Keeps the current selection if it still supports this Letter Count,
  // else falls back — purely derived, so there's no effect writing back
  // into the state it reads (no risk of a reactive loop).
  let resolvedDesignId = $derived(
    resolveSelectedDesignId(selectedDesignId, availableDesigns),
  );
  let resolvedDesign = $derived(
    availableDesigns.find((d) => d.id === resolvedDesignId),
  );
  let resolvedFont = $derived(
    resolvedDesign && fonts.get(resolvedDesign.fontId),
  );
  let preview = $derived(
    resolvedFont && resolvedDesign && letters.length > 0
      ? composeMonogram(letters, resolvedFont, {
          arrangement: resolvedDesign.arrangement,
        })
      : "",
  );

  onMount(async () => {
    const loaded = await Promise.all(
      FONTS.map(async (f) => [f.id, await loadFont(f.url)] as const),
    );
    fonts = new Map(loaded);
  });

  $effect(() => {
    const current = letters;
    const timer = setTimeout(() => {
      debouncedLetters = current;
    }, 200);
    return () => clearTimeout(timer);
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

  {#key resolvedDesignId}
    <div class="preview" transition:scale={{ start: 0.98, duration: 200 }}>
      {#if preview}
        {@html preview}
      {/if}
    </div>
  {/key}

  <DesignGallery
    designs={availableDesigns}
    letters={debouncedLetters}
    {fonts}
    selectedId={resolvedDesignId}
    onSelect={(id) => (selectedDesignId = id)}
  />

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
