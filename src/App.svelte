<script lang="ts">
  import { composeMonogram } from "./engine";

  let letters = $state("MX");
  let preview = $derived(composeMonogram(letters));
</script>

<main>
  <h1>MonoMix</h1>
  <p class="tagline">Mix your monogram and take it with you.</p>

  <label>
    Letters
    <input bind:value={letters} maxlength="3" />
  </label>

  <pre class="preview">{preview}</pre>
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
  }
</style>
