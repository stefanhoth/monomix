<script lang="ts">
  import type { Font } from "opentype.js";
  import { fly } from "svelte/transition";
  import type { Design } from "../engine";
  import { composeMonogram } from "../engine";
  import { t } from "../lib/i18n/store.svelte";

  let {
    designs,
    letters,
    fonts,
    selectedId,
    onSelect,
    reducedMotion = false,
  }: {
    designs: Design[];
    letters: string;
    fonts: Map<string, Font>;
    selectedId: string;
    onSelect: (id: string) => void;
    // Staggered reveal (issue #13: first-run onboarding transition). Svelte
    // only plays `in:` transitions when a block is inserted by a *later*
    // reactive update, not on the very first page render — so this fires
    // when the gallery mounts fresh right after the onboarding prompt is
    // replaced by the editor, but never for a returning user whose editor
    // is already showing on first render. Also plays (harmlessly) whenever
    // a tile newly enters because the Letter Count changed.
    reducedMotion?: boolean;
  } = $props();

  // Capped so a large catalog doesn't drag the reveal out indefinitely.
  const STAGGER_STEP_MS = 30;
  const MAX_STAGGER_STEPS = 10;
</script>

<div class="gallery" role="listbox" aria-label={t("gallery.designsLabel")}>
  {#each designs as design, i (design.id)}
    {@const font = fonts.get(design.fontId)}
    {@const selected = design.id === selectedId}
    <button
      type="button"
      class="tile"
      class:selected
      role="option"
      aria-selected={selected}
      onclick={() => onSelect(design.id)}
      in:fly={{
        y: reducedMotion ? 0 : 10,
        duration: reducedMotion ? 0 : 200,
        delay: reducedMotion
          ? 0
          : Math.min(i, MAX_STAGGER_STEPS) * STAGGER_STEP_MS,
      }}
    >
      <span class="tile-preview">
        {#if font && letters.length > 0}
          {@html composeMonogram(letters, font, {
            arrangement: design.arrangement,
          })}
        {/if}
      </span>
      <span class="tile-name">{design.name}</span>
    </button>
  {/each}
</div>

<style>
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: 0.5rem;
    max-height: 20rem;
    overflow-y: auto;
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
    color: light-dark(#111, #eee);
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
