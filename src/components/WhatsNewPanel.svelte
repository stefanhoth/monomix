<script lang="ts">
  import { fly } from "svelte/transition";
  import {
    CHANGELOG_ENTRIES,
    groupEntriesByMonth,
    type ChangelogEntry,
  } from "../lib/changelog";
  import { getLocale, t } from "../lib/i18n/store.svelte";

  let {
    open,
    onClose,
    reducedMotion,
  }: {
    open: boolean;
    onClose: () => void;
    reducedMotion: boolean;
  } = $props();

  const groups = groupEntriesByMonth(CHANGELOG_ENTRIES);

  function entryText(entry: ChangelogEntry): string {
    return getLocale() === "de" ? entry.de : entry.en;
  }

  function monthLabel(monthKey: string): string {
    const [year = 1970, month = 1] = monthKey.split("-").map(Number);
    return new Intl.DateTimeFormat(getLocale(), {
      year: "numeric",
      month: "long",
    }).format(new Date(year, month - 1, 1));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }
</script>

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={onClose}
    onkeydown={handleKeydown}
  ></div>
  <div
    class="whatsnew-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="whatsnew-heading"
    transition:fly={{ x: 320, duration: reducedMotion ? 0 : 200 }}
  >
    <div class="panel-header">
      <h2 id="whatsnew-heading">{t("whatsnew.heading")}</h2>
      <button type="button" class="close" onclick={onClose}>
        {t("whatsnew.close")}
      </button>
    </div>
    {#each groups as group (group.monthKey)}
      <h3 class="month">{monthLabel(group.monthKey)}</h3>
      <ul class="entries">
        {#each group.entries as entry (entry.id)}
          <li>{entryText(entry)}</li>
        {/each}
      </ul>
    {/each}
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 30%);
    z-index: 10;
  }

  .whatsnew-panel {
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

  .month {
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: light-dark(#555, #aaa);
    margin: 1.5rem 0 0.5rem;
  }

  .month:first-of-type {
    margin-top: 1.25rem;
  }

  .entries {
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .entries li {
    line-height: 1.4;
  }
</style>
