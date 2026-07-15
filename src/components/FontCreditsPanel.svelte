<script lang="ts">
  import type { Font } from "opentype.js";
  import { fly } from "svelte/transition";
  import { FONTS, composeMonogram } from "../engine";
  import { licenseName, specimenUrl } from "../lib/font-credits";
  import { t } from "../lib/i18n/store.svelte";

  // Font credits (ADR 0003: "an about page credits every font") — lists the
  // complete catalog, not just the fonts the curated Designs use, since the
  // full catalog ships with the app. Specimens render lazily: App.svelte
  // loads the not-yet-loaded fonts when this panel first opens, and tiles
  // pop in as each one arrives (same progressive pattern as the galleries).
  let {
    open,
    fonts,
    onClose,
    reducedMotion,
  }: {
    open: boolean;
    fonts: Map<string, Font>;
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
    class="credits-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="credits-heading"
    transition:fly={{ x: 320, duration: reducedMotion ? 0 : 200 }}
  >
    <div class="panel-header">
      <h2 id="credits-heading">{t("credits.heading")}</h2>
      <button type="button" class="close" onclick={onClose}>
        {t("credits.close")}
      </button>
    </div>

    <p class="intro">{t("credits.intro")}</p>

    <ul class="font-list">
      {#each FONTS as entry (entry.id)}
        {@const font = fonts.get(entry.id)}
        <li class="font-row">
          <span class="specimen" aria-hidden="true">
            {#if font}
              {@html composeMonogram("AZ", font, {
                arrangement: "horizontal",
                shape: "none",
              })}
            {/if}
          </span>
          <span class="meta">
            <a href={specimenUrl(entry.family)} target="_blank" rel="noopener">
              {entry.family}
            </a>
            <span class="license">{licenseName(entry.license)}</span>
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 30%);
    z-index: 10;
  }

  .credits-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(22rem, 100vw);
    overflow-y: auto;
    padding: 1.5rem;
    background: light-dark(#fff, #1c1c1e);
    color: light-dark(#111, #eee);
    box-shadow: -0.25rem 0 1rem rgb(0 0 0 / 20%);
    z-index: 11;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .panel-header h2 {
    font-size: 1.125rem;
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
    font-size: 0.875rem;
    color: light-dark(#555, #aaa);
  }

  .font-list {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .font-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .specimen {
    display: block;
    width: 3.25rem;
    height: 3.25rem;
    flex-shrink: 0;
    border: 1px solid light-dark(#ddd, #333);
    border-radius: 0.4rem;
    padding: 0.3rem;
  }

  .specimen :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .meta a {
    color: inherit;
    font-size: 0.9375rem;
  }

  .license {
    font-size: 0.75rem;
    color: light-dark(#555, #aaa);
  }
</style>
