<script lang="ts">
  import type { Gradient } from "../engine";
  import type { PaintKind } from "../lib/project";
  import { t } from "../lib/i18n/store.svelte";
  import GradientEditor from "./GradientEditor.svelte";

  // One fill target's solid-vs-gradient chooser (issue #122). Letters and
  // the Frame each get one; the Background keeps its own fieldset because it
  // has four kinds (transparent/color/image/gradient), not two.
  //
  // `kind` and `gradient` are $bindable: the picker mutates both, and they
  // belong to App.svelte's editor state. Declaring the two-way intent is
  // what keeps Svelte from treating a child mutating a parent's $state proxy
  // as an ownership violation.
  let {
    legend,
    name,
    gradientLabel,
    colorLabel,
    kind = $bindable(),
    color = $bindable(),
    gradient = $bindable(),
  }: {
    legend: string;
    /** Unique per instance — a shared radio `name` would merge the mounted
     * pickers into one radio group. */
    name: string;
    gradientLabel: string;
    colorLabel: string;
    kind: PaintKind;
    color: string;
    gradient: Gradient;
  } = $props();
</script>

<fieldset class="paint-kind">
  <legend>{legend}</legend>
  <div class="kind-options">
    <label class="kind-option">
      <input
        type="radio"
        name={`${name}-paint-kind`}
        value="color"
        bind:group={kind}
      />
      {t("color.paintSolid")}
    </label>
    <label class="kind-option">
      <input
        type="radio"
        name={`${name}-paint-kind`}
        value="gradient"
        bind:group={kind}
      />
      {t("color.paintGradient")}
    </label>
  </div>

  {#if kind === "gradient"}
    <GradientEditor bind:gradient {name} label={gradientLabel} />
  {:else}
    <label class="sub-control">
      {colorLabel}
      <input type="color" bind:value={color} />
    </label>
  {/if}
</fieldset>

<style>
  .paint-kind {
    border: 1px solid light-dark(#e2e2e2, #2a2a2c);
    border-radius: 0.4rem;
    padding: 0.5rem 0.75rem 0.75rem;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .paint-kind legend {
    font-size: 0.8125rem;
    padding: 0 0.25rem;
    color: light-dark(#555, #aaa);
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

  .sub-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.875rem;
    padding: 0.25rem;
  }
</style>
