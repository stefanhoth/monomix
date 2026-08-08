<script lang="ts">
  import { COLOR_PRESETS, type ColorPreset } from "../lib/color-presets";
  import { t } from "../lib/i18n/store.svelte";

  // Easy mode's Colors step (impeccable shape brief, 2026-08-08): a handful
  // of curated solid-color combinations, nothing else — no gradients, no
  // opacity, no background image. Full mode's PaintPicker/GradientEditor
  // stack is where that depth lives.
  let {
    selectedId,
    onSelect,
  }: {
    selectedId: string | undefined;
    onSelect: (preset: ColorPreset) => void;
  } = $props();
</script>

<div class="presets" role="listbox" aria-label={t("colorPreset.label")}>
  {#each COLOR_PRESETS as preset (preset.id)}
    {@const selected = preset.id === selectedId}
    <button
      type="button"
      class="preset"
      class:selected
      role="option"
      aria-selected={selected}
      onclick={() => onSelect(preset)}
    >
      <span
        class="swatch"
        class:checkerboard={preset.backgroundKind === "transparent"}
        style:background={preset.backgroundKind === "color"
          ? preset.backgroundColor
          : undefined}
        style:--checker-size="8px"
      >
        <span class="swatch-letter" style:color={preset.lettersColor}>Aa</span>
      </span>
      <span class="preset-name">{t(preset.nameKey)}</span>
    </button>
  {/each}
</div>

<style>
  .presets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .preset {
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

  .preset.selected {
    border-color: var(--accent);
  }

  .swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.25rem;
    --checker-size: 8px;
  }

  .swatch-letter {
    font-size: 1.1rem;
    font-weight: 650;
  }

  .preset-name {
    font-size: 0.6875rem;
    color: light-dark(#555, #aaa);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
</style>
