<script lang="ts">
  import type { Font } from "opentype.js";
  import { fly } from "svelte/transition";
  import { composeMonogram, DESIGNS, paintSolidColor } from "../engine";
  import {
    resolveProjectBackground,
    resolveProjectFrameFill,
    resolveProjectFramePaint,
    resolveProjectLettersPaint,
  } from "../lib/project";
  import {
    CURATED_DESIGNS,
    curatedDesignSettings,
    type CuratedDesignEntry,
  } from "../lib/curated-designs";
  import { backdropTone, BACKDROP_COLORS } from "../lib/preview-backdrop";
  import { t } from "../lib/i18n/store.svelte";

  // Easy mode's Design step (impeccable shape brief, 2026-08-08): a small
  // set of fully styled starting points, always available (not a one-time
  // gate — see docs/DECISIONS.md on the former jump-off gallery). Picking a
  // tile applies its Design + Frame + colors straight onto the live editor;
  // it never touches the letters already typed.
  //
  // Renders every tile with its *true* paint — real gradients, a real
  // filled+cut-out Frame — not a solid-color approximation: App.svelte only
  // mounts this component while the Design step is actually the active
  // rail step (never hidden-but-mounted alongside another step), so it's
  // never present in a display:none subtree the way DesignGallery/
  // FrameGallery's always-mounted tabs are — the same "mounts only while
  // actually visible" precedent NewProjectSurface's remix thumbnails
  // already established (docs/DECISIONS.md, 2026-08-07/2026-08-08).
  let {
    letters,
    fonts,
    onSelect,
    reducedMotion = false,
  }: {
    letters: string;
    fonts: Map<string, Font>;
    onSelect: (entry: CuratedDesignEntry) => void;
    reducedMotion?: boolean;
  } = $props();

  const STAGGER_STEP_MS = 30;
</script>

<ul class="gallery" aria-label={t("gallery.curatedDesignsLabel")}>
  {#each CURATED_DESIGNS as entry, i (entry.id)}
    {@const settings = curatedDesignSettings(entry)}
    {@const design = DESIGNS.find((d) => d.id === settings.designId)}
    {@const font = design && fonts.get(design.fontId)}
    {@const letterTone = paintSolidColor(
      resolveProjectLettersPaint(settings),
      "#111111",
    )}
    {@const board = BACKDROP_COLORS[backdropTone(letterTone)]}
    <li>
      <button
        type="button"
        class="tile"
        onclick={() => onSelect(entry)}
        in:fly={{
          y: reducedMotion ? 0 : 10,
          duration: reducedMotion ? 0 : 200,
          delay: reducedMotion ? 0 : i * STAGGER_STEP_MS,
        }}
      >
        <span
          class="tile-preview checkerboard"
          style:--backdrop-base={board.base}
          style:--backdrop-check={board.check}
        >
          {#if font && design && letters.length > 0}
            {@html composeMonogram(letters, font, {
              arrangement: design.arrangement,
              shape: design.shape,
              frame: {
                id: settings.frameId,
                gap: settings.frameGap,
                color: resolveProjectFramePaint(settings),
                fill: resolveProjectFrameFill(settings),
              },
              lettersColor: resolveProjectLettersPaint(settings),
              lettersOpacity: settings.lettersOpacity,
              background: resolveProjectBackground(settings),
            })}
          {/if}
        </span>
        <span class="tile-caption">{t(entry.captionKey)}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .gallery {
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: 0.75rem;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.5rem;
    border: 2px solid light-dark(#ddd, #333);
    border-radius: 0.6rem;
    background: light-dark(#fff, #1c1c1e);
    cursor: pointer;
    font: inherit;
  }

  .tile:hover,
  .tile:focus-visible {
    border-color: var(--accent);
  }

  .tile-preview {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.4rem;
    --checker-size: 8px;
  }

  .tile-preview :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .tile-caption {
    font-size: 0.75rem;
    line-height: 1.3;
    color: light-dark(#555, #aaa);
    text-align: center;
  }
</style>
