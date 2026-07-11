<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { scale } from "svelte/transition";
  import type { Font } from "opentype.js";
  import {
    composeMonogram,
    DESIGNS,
    FONTS,
    FRAMES,
    NO_FRAME_ID,
    type LetterCount,
  } from "./engine";
  import { loadFont } from "./lib/font-loader";
  import { exportSvg } from "./lib/export/svg";
  import { exportPng, exportJpg } from "./lib/export/raster";
  import { triggerDownload } from "./lib/export/download";
  import { DEFAULT_EXPORT_SIZE } from "./lib/export/options";
  import { sanitizeLettersInput } from "./lib/letters-input";
  import {
    resolveFrameGap,
    DEFAULT_FRAME_GAP,
    MIN_GAP,
    MAX_GAP,
  } from "./lib/frame-gap";
  import {
    filterDesignsByLetterCount,
    resolveSelectedDesignId,
  } from "./lib/gallery";
  import DesignGallery from "./components/DesignGallery.svelte";
  import FrameGallery from "./components/FrameGallery.svelte";

  let letters = $state("MX");
  let lettersHint: string | null = $state(null);
  // Debounced separately from `letters` — the main preview reflects every
  // keystroke instantly (Design Principle 3), but re-composing all ~30+
  // gallery tiles on every keystroke is wasted work while still typing.
  let debouncedLetters = $state(untrack(() => letters));
  // SvelteMap so tiles can populate progressively as each font finishes
  // loading, without replacing the whole Map (and its reactive subscribers)
  // on every single arrival.
  const fonts = new SvelteMap<string, Font>();
  let exportSize = $state(DEFAULT_EXPORT_SIZE);
  // The user's explicit choice, if any — undefined until they pick a tile.
  // Never written to reactively; see resolvedDesignId below.
  let selectedDesignId: string | undefined = $state(undefined);
  let reducedMotion = $state(false);

  // Frame (CONTEXT.md): "No Frame" is the default per the Frame gallery's
  // acceptance criteria. Gap is stored raw and clamped just before it
  // reaches the engine (resolveFrameGap) — same pattern as exportSize below,
  // so a manually typed negative number never reaches composeMonogram.
  let selectedFrameId = $state(NO_FRAME_ID);
  let frameGap = $state(DEFAULT_FRAME_GAP);
  // Near-black default for both swatches — approximates the "currentColor"
  // look the preview had before explicit color controls existed, without
  // trying to track the system color scheme dynamically.
  let lettersColor = $state("#111111");
  let frameColor = $state("#111111");
  // Background is transparent by default (checkerboard, not white — see
  // .preview below). `backgroundColor` only takes effect once the user
  // unchecks "Transparent", and remembers their last pick if they toggle
  // back and forth.
  let transparentBackground = $state(true);
  let backgroundColor = $state("#ffffff");

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
  let resolvedFrameGap = $derived(resolveFrameGap(frameGap));
  let resolvedBackground = $derived(
    transparentBackground ? "transparent" : backgroundColor,
  );
  let preview = $derived(
    resolvedFont && resolvedDesign && letters.length > 0
      ? composeMonogram(letters, resolvedFont, {
          arrangement: resolvedDesign.arrangement,
          frame: {
            id: selectedFrameId,
            gap: resolvedFrameGap,
            color: frameColor,
          },
          lettersColor,
          background: resolvedBackground,
        })
      : "",
  );

  onMount(async () => {
    // Load the font the initial preview actually needs first, so it's
    // never blocked on the other 16 gallery fonts (Design Principle 2:
    // fast first result). The rest load in the background and populate
    // the gallery progressively as each one arrives.
    const primaryId = untrack(() => resolvedDesign)?.fontId;
    const primary = FONTS.find((f) => f.id === primaryId);
    const rest = FONTS.filter((f) => f.id !== primaryId);

    if (primary) {
      fonts.set(primary.id, await loadFont(primary.url));
    }
    for (const f of rest) {
      loadFont(f.url).then((font) => fonts.set(f.id, font));
    }
  });

  $effect(() => {
    const current = letters;
    const timer = setTimeout(() => {
      debouncedLetters = current;
    }, 200);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = query.matches;
    const handleChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
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
    <div
      class="preview"
      transition:scale={{ start: 0.98, duration: reducedMotion ? 0 : 200 }}
    >
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

  <FrameGallery
    frames={FRAMES}
    letters={debouncedLetters}
    font={resolvedFont}
    arrangement={resolvedDesign?.arrangement}
    gap={resolvedFrameGap}
    {lettersColor}
    {frameColor}
    selectedId={selectedFrameId}
    onSelect={(id) => (selectedFrameId = id)}
  />

  <div class="gap-control">
    <label>
      Frame Gap
      <input
        type="range"
        min={MIN_GAP}
        max={MAX_GAP}
        step="5"
        bind:value={frameGap}
      />
    </label>
    <output class="gap-value">{frameGap}</output>
  </div>

  <div class="color-controls">
    <label>
      Letter Color
      <input type="color" bind:value={lettersColor} />
    </label>
    <label>
      Frame Color
      <input type="color" bind:value={frameColor} />
    </label>
    <label class:disabled={transparentBackground}>
      Background Color
      <input
        type="color"
        bind:value={backgroundColor}
        disabled={transparentBackground}
      />
    </label>
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={transparentBackground} />
      Transparent background
    </label>
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
    /* Checkerboard, not a solid fill — a transparent background (the
       default, see `transparentBackground` above) must read as transparent,
       not as accidentally white/gray. An opaque chosen background fully
       covers this anyway, so it's safe to render unconditionally. */
    background-color: light-dark(#fff, #1c1c1e);
    background-image:
      linear-gradient(45deg, light-dark(#ddd, #333) 25%, transparent 25%),
      linear-gradient(-45deg, light-dark(#ddd, #333) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, light-dark(#ddd, #333) 75%),
      linear-gradient(-45deg, transparent 75%, light-dark(#ddd, #333) 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0px;
    color: light-dark(#111, #eee);
  }

  .preview :global(svg) {
    display: block;
    width: 100%;
    max-width: 20rem;
    margin: 0 auto;
  }

  .gap-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .gap-control label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .gap-value {
    font-variant-numeric: tabular-nums;
    min-width: 2.5rem;
    text-align: right;
  }

  .color-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 1rem;
    margin-top: 1rem;
  }

  .color-controls label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .color-controls label.disabled {
    opacity: 0.5;
  }

  .color-controls label.checkbox-label {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }

  .export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
