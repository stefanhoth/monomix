<script lang="ts">
  import type { Font } from "opentype.js";
  import type { Arrangement, Frame, Shape } from "../engine";
  import { composeMonogram, NO_FRAME_ID } from "../engine";
  import { t } from "../lib/i18n/store.svelte";
  import type { DictKey } from "../lib/i18n/dictionary";

  // Frame names are plain common nouns ("Circle", "Square", ...), unlike
  // Design names (font-family + variant composites) — see docs/DECISIONS.md.
  const FRAME_NAME_KEYS: Record<string, DictKey> = {
    [NO_FRAME_ID]: "frame.none",
    circle: "frame.circle",
    square: "frame.square",
    diamond: "frame.diamond",
    "diamond-narrow": "frame.diamond-narrow",
    "diamond-wide": "frame.diamond-wide",
    "dotted-circle": "frame.dotted-circle",
    "dashed-circle": "frame.dashed-circle",
  };

  let {
    frames,
    letters,
    font,
    arrangement,
    shape,
    gap,
    lettersColor,
    frameColor,
    selectedId,
    onSelect,
  }: {
    frames: Frame[];
    letters: string;
    font: Font | undefined;
    arrangement: Arrangement | undefined;
    shape: Shape | undefined;
    gap: number;
    lettersColor: string;
    frameColor: string;
    selectedId: string;
    onSelect: (id: string) => void;
  } = $props();
</script>

<div class="gallery" role="listbox" aria-label={t("gallery.framesLabel")}>
  {#each frames as frame (frame.id)}
    {@const selected = frame.id === selectedId}
    {@const nameKey = FRAME_NAME_KEYS[frame.id]}
    <button
      type="button"
      class="tile"
      class:selected
      role="option"
      aria-selected={selected}
      onclick={() => onSelect(frame.id)}
    >
      <span class="tile-preview checkerboard">
        {#if font && letters.length > 0}
          {@html composeMonogram(letters, font, {
            arrangement,
            shape,
            // Deliberately no `fill` here (issue #65 second follow-up): a
            // filled Frame's own <mask> cutout (composeFrame/render.ts) is
            // content-hashed for a deterministic id, so a tile whose Frame,
            // color, and letters exactly match the live main preview would
            // render an id-for-id identical <mask> element. This tab panel
            // stays mounted-but-hidden (`hidden`, i.e. display:none) rather
            // than being torn down when the Frame tab isn't active, and a
            // <mask> inside a display:none subtree corrupts every other
            // element referencing that same id elsewhere in the document —
            // including the visible main preview's own cutout. The gallery
            // only needs to preview Frame *shapes* for selection; showing
            // the fill/cutout combo isn't worth that risk.
            frame: { id: frame.id, gap, color: frameColor },
            lettersColor,
          })}
        {/if}
      </span>
      <span class="tile-name">{nameKey ? t(nameKey) : frame.name}</span>
    </button>
  {/each}
</div>

<style>
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: 0.5rem;
    /* No max-height/overflow of its own — the sidebar's panel area (issue
       #47) is the single scroll container, avoiding nested scrollbars. */
    padding: 0.25rem;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem;
    border: 2px solid light-dark(#ddd, #333);
    border-radius: 0.5rem;
    background: light-dark(#fff, #1c1c1e);
    cursor: pointer;
    font: inherit;
  }

  .tile.selected {
    border-color: light-dark(#0b57d0, #a8c7fa);
  }

  .tile-preview {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.25rem;
    /* Finer grid than the main preview — same .checkerboard utility. */
    --checker-size: 8px;
  }

  .tile-preview :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .tile-name {
    font-size: 0.6875rem;
    color: light-dark(#555, #aaa);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
</style>
