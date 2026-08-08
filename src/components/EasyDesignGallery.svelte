<script lang="ts">
  import type { Font } from "opentype.js";
  import { fly } from "svelte/transition";
  import { DESIGNS, composeMonogram, paintSolidColor } from "../engine";
  import {
    resolveProjectFramePaint,
    resolveProjectLettersPaint,
    type ProjectSettings,
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

  // Tiles paint with representative solids, never a true gradient or filled
  // Frame — same reason DesignGallery/FrameGallery do (docs/DECISIONS.md,
  // 2026-07-17): this panel stays mounted-but-hidden when another rail step
  // is active (so e.g. scroll position survives a round-trip), and a
  // content-hashed <linearGradient>/<mask> id inside a display:none subtree
  // corrupts every other reference to that same id in the document —
  // including the live main preview, if it happens to render the same
  // paint. Picking a tile still applies the entry's *real* gradient/fill to
  // the live editor (handleCuratedDesignSelect in App.svelte); only this
  // grid's own preview is simplified.
  function tileBackground(settings: ProjectSettings): string {
    if (settings.backgroundKind === "color") return settings.backgroundColor;
    if (settings.backgroundKind === "gradient") {
      return settings.backgroundGradient.stops[0]?.color ?? "transparent";
    }
    return "transparent";
  }
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
                color: paintSolidColor(
                  resolveProjectFramePaint(settings),
                  "#111111",
                ),
                // No `fill` (matches FrameGallery): a filled Frame's cutout
                // mask is content-hashed too — same hazard as the gradient
                // defs above.
              },
              lettersColor: paintSolidColor(
                resolveProjectLettersPaint(settings),
                "#111111",
              ),
              lettersOpacity: settings.lettersOpacity,
              background: tileBackground(settings),
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
