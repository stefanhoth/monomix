<script lang="ts">
  import type { Font } from "opentype.js";
  import { fly } from "svelte/transition";
  import { DESIGNS, composeMonogram, paintSolidColor } from "../engine";
  import {
    resolveProjectBackground,
    resolveProjectFrameFill,
    resolveProjectFramePaint,
    resolveProjectLettersPaint,
  } from "../lib/project";
  import {
    JUMP_OFF_ENTRIES,
    jumpOffSettings,
    type JumpOffEntry,
  } from "../lib/jump-off-gallery";
  import { backdropTone, BACKDROP_COLORS } from "../lib/preview-backdrop";
  import { t } from "../lib/i18n/store.svelte";

  // The jump-off gallery (impeccable shape brief, 2026-08-07): shown once,
  // right after the initials prompt and before the full Design grid — a
  // small hand-curated set of fully styled starting points so a newcomer's
  // first look at MonoMix is "look what this can do", not a wall of font
  // names. Picking one seeds a real Project with those settings already
  // applied; "See all designs instead" drops straight into today's editor,
  // exactly as if this step didn't exist.
  let {
    letters,
    fonts,
    onPick,
    onSkip,
    reducedMotion = false,
  }: {
    letters: string;
    fonts: Map<string, Font>;
    onPick: (entry: JumpOffEntry) => void;
    onSkip: () => void;
    reducedMotion?: boolean;
  } = $props();

  // The curated set is small (currently 7 entries) — no capped stagger
  // ceiling needed the way DesignGallery's ~30-tile catalog needs one.
  const STAGGER_STEP_MS = 40;
</script>

<main class="jump-off">
  <h1>{t("jumpOff.heading")}</h1>
  <p class="intro">{t("jumpOff.intro")}</p>

  <ul class="gallery">
    {#each JUMP_OFF_ENTRIES as entry, i (entry.id)}
      {@const settings = jumpOffSettings(entry)}
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
          onclick={() => onPick(entry)}
          in:fly={{
            y: 10,
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

  <button type="button" class="skip" onclick={onSkip}>
    {t("jumpOff.skip")}
  </button>
</main>

<style>
  .jump-off {
    max-width: 52rem;
    margin: 3rem auto;
    padding: 0 1.5rem 3rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  @media (max-width: 30rem) {
    .jump-off {
      margin: 1.5rem auto;
    }
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .intro {
    margin: 0.5rem 0 2rem;
    color: light-dark(#555, #aaa);
  }

  .gallery {
    list-style: none;
    margin: 0 0 2rem;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 1rem;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.6rem;
    border: 2px solid light-dark(#ddd, #333);
    border-radius: 0.75rem;
    background: light-dark(#fff, #1c1c1e);
    cursor: pointer;
    font: inherit;
  }

  .tile:hover,
  .tile:focus-visible {
    border-color: light-dark(#0b57d0, #a8c7fa);
  }

  .tile-preview {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    --checker-size: 10px;
  }

  .tile-preview :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .tile-caption {
    font-size: 0.8125rem;
    line-height: 1.3;
    color: light-dark(#555, #aaa);
    text-align: center;
  }

  .skip {
    display: block;
    margin: 0 auto;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: light-dark(#555, #aaa);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
