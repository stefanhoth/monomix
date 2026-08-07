<script lang="ts">
  import type { Gradient } from "../engine";
  import { t } from "../lib/i18n/store.svelte";

  // The gradient stop editor (issue #64), extracted from App.svelte when
  // issue #122 gave letters and Frames their own gradients — three copies of
  // this markup was the point where duplicating it stopped being cheaper
  // than a component.
  //
  // `gradient` is mutated in place rather than emitted through a callback:
  // it's a $state proxy owned by App.svelte, so deep mutation propagates
  // back on its own. `name` must be unique per instance — with three editors
  // mounted at once, a shared radio `name` would make all three style
  // toggles one radio group.
  let {
    gradient,
    name,
    label,
  }: {
    gradient: Gradient;
    name: string;
    label: string;
  } = $props();

  // Up to 3 stops, matching issue #64's own "keep the initial set small"
  // open question. Existing stops are redistributed evenly *before* the new
  // one is appended at 100% — simply pushing a 50%-offset stop after an
  // existing 100%-offset one would leave the stops out of offset order
  // (array order [0%, 100%, 50%]), and SVG clamps an out-of-order stop's
  // offset up to the previous stop's value, collapsing the new stop
  // invisibly onto the old last stop instead of blending between all three.
  function handleAddStop() {
    const stops = gradient.stops;
    if (stops.length >= 3) return;
    const last = stops.at(-1);
    stops.forEach((stop, i) => {
      stop.offset = Math.round((i / stops.length) * 100);
    });
    stops.push({ color: last?.color ?? "#000000", offset: 100 });
  }

  function handleRemoveStop(index: number) {
    if (gradient.stops.length <= 2) return;
    gradient.stops.splice(index, 1);
  }
</script>

<div class="gradient-control" role="group" aria-label={label}>
  <div class="kind-options">
    <label class="kind-option">
      <input
        type="radio"
        name={`${name}-gradient-style`}
        value="linear"
        bind:group={gradient.style}
      />
      {t("color.gradientLinear")}
    </label>
    <label class="kind-option">
      <input
        type="radio"
        name={`${name}-gradient-style`}
        value="radial"
        bind:group={gradient.style}
      />
      {t("color.gradientRadial")}
    </label>
  </div>

  {#if gradient.style === "linear"}
    <label class="sub-control angle-control">
      {t("color.gradientAngle")}
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        bind:value={gradient.angle}
      />
      <output>{gradient.angle}°</output>
    </label>
  {/if}

  <div class="gradient-stops">
    {#each gradient.stops as stop, i (i)}
      <div class="gradient-stop">
        <input
          type="color"
          aria-label={t("color.gradientStopColor", { n: String(i + 1) })}
          bind:value={stop.color}
        />
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          aria-label={t("color.gradientStopPosition", { n: String(i + 1) })}
          bind:value={stop.offset}
        />
        <output>{stop.offset}%</output>
        {#if gradient.stops.length > 2}
          <button
            type="button"
            class="remove-stop"
            aria-label={t("color.gradientRemoveStop", { n: String(i + 1) })}
            onclick={() => handleRemoveStop(i)}
          >
            ×
          </button>
        {/if}
      </div>
    {/each}
    {#if gradient.stops.length < 3}
      <button type="button" class="add-stop" onclick={handleAddStop}>
        {t("color.gradientAddStop")}
      </button>
    {/if}
  </div>
</div>

<style>
  .gradient-control {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.6rem;
    padding: 0.25rem 0 0;
  }

  .kind-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .kind-option {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.875rem;
  }

  .angle-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }

  .angle-control input[type="range"] {
    flex: 1;
    min-width: 0;
  }

  .angle-control output {
    font-variant-numeric: tabular-nums;
    min-width: 2.5rem;
    text-align: right;
  }

  .gradient-stops {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .gradient-stop {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gradient-stop input[type="range"] {
    flex: 1;
    min-width: 0;
  }

  .gradient-stop output {
    font-variant-numeric: tabular-nums;
    min-width: 2.25rem;
    text-align: right;
    font-size: 0.8125rem;
  }

  .remove-stop {
    font:
      1rem/1 inherit,
      sans-serif;
    padding: 0.15rem 0.5rem;
    border: 1px solid light-dark(#d5d5d5, #3a3a3c);
    border-radius: 0.3rem;
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .add-stop {
    align-self: flex-start;
    font: inherit;
    font-size: 0.8125rem;
    padding: 0.3rem 0.6rem;
    border: 1px dashed light-dark(#bbb, #555);
    border-radius: 0.3rem;
    background: none;
    color: light-dark(#555, #aaa);
    cursor: pointer;
  }
</style>
