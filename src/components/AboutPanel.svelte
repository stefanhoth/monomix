<script lang="ts">
  import { fly } from "svelte/transition";
  import { t } from "../lib/i18n/store.svelte";

  // About panel (issue #55): explains the app's purpose and basic usage.
  // Deliberately a near-fullscreen centered modal, not the side-drawer used
  // by WhatsNewPanel/FontCreditsPanel — this is prose to read, not a list to
  // skim alongside the editor. Deep-linkable via the #about URL hash so it
  // can be shared externally; App.svelte owns the hash <-> `open` sync.
  let {
    open,
    onClose,
    reducedMotion,
  }: {
    open: boolean;
    onClose: () => void;
    reducedMotion: boolean;
  } = $props();

  // Bound on window rather than the backdrop div — a click-to-dismiss
  // backdrop isn't itself focusable, so a keydown handler on it would never
  // fire for Escape.
  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="backdrop" role="presentation" onclick={onClose}></div>
  <div
    class="about-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="about-heading"
    transition:fly={{ y: 16, duration: reducedMotion ? 0 : 200 }}
  >
    <div class="panel-header">
      <h2 id="about-heading">{t("about.heading")}</h2>
      <button type="button" class="close" onclick={onClose}>
        {t("about.close")}
      </button>
    </div>

    <p class="intro">{t("about.intro")}</p>

    <h3 class="usage-heading">{t("about.usageHeading")}</h3>
    <ol class="usage-steps">
      <li>{t("about.usageStep1")}</li>
      <li>{t("about.usageStep2")}</li>
      <li>{t("about.usageStep3")}</li>
      <li>{t("about.usageStep4")}</li>
    </ol>

    <p class="privacy-note">{t("about.privacyNote")}</p>

    <p class="version">{t("about.version", { version: __APP_VERSION__ })}</p>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 30%);
    z-index: 10;
  }

  .about-panel {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(48rem, calc(100vw - 2rem));
    height: min(85vh, calc(100dvh - 2rem));
    overflow-y: auto;
    padding: 2rem clamp(1.5rem, 4vw, 3rem);
    border-radius: 0.75rem;
    background: light-dark(#fff, #1c1c1e);
    color: light-dark(#111, #eee);
    box-shadow: 0 0.5rem 2rem rgb(0 0 0 / 25%);
    z-index: 11;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .panel-header h2 {
    font-size: 1.5rem;
    margin: 0;
  }

  .close {
    font: inherit;
    font-size: 0.875rem;
    background: none;
    border: none;
    padding: 0;
    color: light-dark(#555, #aaa);
    text-decoration: underline;
    cursor: pointer;
  }

  .intro {
    font-size: 1.0625rem;
    line-height: 1.5;
    margin-top: 1.5rem;
  }

  .usage-heading {
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: light-dark(#555, #aaa);
    margin: 2rem 0 0.75rem;
  }

  .usage-steps {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    font-size: 1rem;
    line-height: 1.4;
  }

  .privacy-note {
    margin-top: 2rem;
    font-size: 0.875rem;
    color: light-dark(#555, #aaa);
  }

  .version {
    margin-top: 1rem;
    font-size: 0.75rem;
    color: light-dark(#888, #777);
  }
</style>
