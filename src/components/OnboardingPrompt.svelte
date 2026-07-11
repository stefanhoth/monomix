<script lang="ts">
  import { sanitizeLettersInput } from "../lib/letters-input";

  let {
    onSubmit,
    onSkip,
  }: {
    onSubmit: (letters: string) => void;
    onSkip: () => void;
  } = $props();

  let value = $state("");
  let hint: string | null = $state(null);

  // Same sanitisation as the main editor's Letters field (A-Z only,
  // 3-letter cap, transliteration hints) — see src/lib/letters-input.ts.
  function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    const result = sanitizeLettersInput(event.currentTarget.value);
    value = result.letters;
    hint = result.hint;
    event.currentTarget.value = result.letters;
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (value.length === 0) return;
    onSubmit(value);
  }
</script>

<main class="onboarding">
  <h1>MonoMix</h1>
  <p class="tagline">Mix your monogram and take it with you.</p>

  <form onsubmit={handleSubmit}>
    <label>
      Your initials?
      <input {value} oninput={handleInput} placeholder="ABC" />
    </label>
    {#if hint}
      <p class="hint" role="alert">{hint}</p>
    {/if}

    <div class="actions">
      <button type="submit" disabled={value.length === 0}>
        See my monogram
      </button>
      <button type="button" class="skip" onclick={onSkip}>
        Just browsing
      </button>
    </div>
  </form>
</main>

<style>
  .onboarding {
    max-width: 32rem;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  @media (max-width: 30rem) {
    .onboarding {
      margin: 1.5rem auto;
    }
  }

  .tagline {
    color: light-dark(#555, #aaa);
  }

  form {
    margin-top: 2rem;
  }

  label {
    display: block;
    font-size: 1.125rem;
  }

  input {
    display: block;
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.75rem;
    font-size: 1.5rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hint {
    color: light-dark(#b3261e, #ffb4ab);
    font-size: 0.875rem;
    margin: 0.5rem 0 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .actions button[type="submit"] {
    padding: 0.6rem 1.25rem;
    font-size: 1rem;
  }

  .skip {
    background: none;
    border: none;
    padding: 0;
    color: light-dark(#555, #aaa);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
</style>
