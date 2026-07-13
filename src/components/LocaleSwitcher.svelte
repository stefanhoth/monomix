<script lang="ts">
  import { LOCALES, type Locale } from "../lib/i18n/dictionary";
  import { getLocale, setLocale, t } from "../lib/i18n/store.svelte";

  // Language names are shown in their own language (every locale picker
  // does this — "Deutsch" doesn't get translated further), so this is
  // deliberately not routed through the dictionary.
  const LOCALE_NAMES: Record<Locale, string> = {
    en: "English",
    de: "Deutsch",
  };

  function handleChange(event: Event & { currentTarget: HTMLSelectElement }) {
    setLocale(event.currentTarget.value as Locale);
  }
</script>

<label class="locale-switcher">
  <span class="sr-only">{t("locale.switchLabel")}</span>
  <select value={getLocale()} onchange={handleChange}>
    {#each LOCALES as loc (loc)}
      <option value={loc}>{LOCALE_NAMES[loc]}</option>
    {/each}
  </select>
</label>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  select {
    font: inherit;
    font-size: 0.875rem;
  }
</style>
