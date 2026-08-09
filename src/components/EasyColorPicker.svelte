<script lang="ts">
  import type { Gradient } from "../engine";
  import { COLOR_PRESETS, type ColorPreset } from "../lib/color-presets";
  import { t } from "../lib/i18n/store.svelte";

  // Easy mode's Colors step (impeccable shape brief, 2026-08-08): a handful
  // of curated, one-click color combinations — some plain solids, some a
  // pre-made gradient (never an editable one; Full mode's
  // PaintPicker/GradientEditor stack is where stop/angle editing lives).
  // Swatches render gradients as a plain CSS background/text-gradient, not
  // through the SVG engine — no <defs> involved, so none of the
  // content-hashed-id hazard EasyDesignGallery documents applies here.
  let {
    letters,
    selectedId,
    onSelect,
  }: {
    letters: string;
    selectedId: string | undefined;
    onSelect: (preset: ColorPreset) => void;
  } = $props();

  // Approximates the engine's own gradient convention (src/engine/paint.ts:
  // a linear gradient's `angle` rotates a fixed top-to-bottom vector) closely
  // enough for a small decorative swatch — exact fidelity isn't the point,
  // recognizability is.
  function cssGradient(gradient: Gradient): string {
    const stops = gradient.stops
      .map((s) => `${s.color} ${s.offset}%`)
      .join(", ");
    return gradient.style === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${180 + gradient.angle}deg, ${stops})`;
  }
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
        style:background={preset.backgroundKind === "gradient" &&
        preset.backgroundGradient
          ? cssGradient(preset.backgroundGradient)
          : preset.backgroundKind === "color"
            ? preset.backgroundColor
            : undefined}
        style:--checker-size="8px"
      >
        <span
          class="swatch-letter"
          class:swatch-letter-gradient={preset.lettersColorKind ===
            "gradient" && preset.lettersGradient}
          style:color={preset.lettersColorKind === "gradient"
            ? undefined
            : preset.lettersColor}
          style:background-image={preset.lettersColorKind === "gradient" &&
          preset.lettersGradient
            ? cssGradient(preset.lettersGradient)
            : undefined}>{letters || "Aa"}</span
        >
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
    font-size: 1.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .swatch-letter-gradient {
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
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
