<script lang="ts">
  import { onMount } from "svelte";
  import type { Font } from "opentype.js";
  import { composeMonogram } from "./engine";
  import { FONTS } from "./engine/fonts";
  import { loadFont } from "./lib/font-loader";

  // TEMP default font until the Design gallery (issue #11) picks one.
  const defaultFont = FONTS.find((f) => f.id === "archivo-black")!;

  let letters = $state("MX");
  let font: Font | undefined = $state(undefined);
  let preview = $derived(
    font && letters.length > 0 ? composeMonogram(letters, font) : "",
  );

  onMount(async () => {
    font = await loadFont(defaultFont.url);
  });
</script>

<main>
  <h1>MonoMix</h1>
  <p class="tagline">Mix your monogram and take it with you.</p>

  <label>
    Letters
    <input bind:value={letters} maxlength="3" />
  </label>

  <div class="preview">
    {#if preview}
      {@html preview}
    {/if}
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

  .tagline {
    color: light-dark(#555, #aaa);
  }

  .preview {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background: light-dark(#f2f2f2, #1c1c1e);
    color: light-dark(#111, #eee);
  }

  .preview :global(svg) {
    display: block;
    width: 100%;
    max-width: 20rem;
    margin: 0 auto;
  }
</style>
