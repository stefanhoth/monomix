<script lang="ts">
  import type { Font } from "opentype.js";
  import { fly } from "svelte/transition";
  import { DESIGNS, composeMonogram } from "../engine";
  import { resolveProjectBackground, type Project } from "../lib/project";
  import { backdropTone, BACKDROP_COLORS } from "../lib/preview-backdrop";
  import { t } from "../lib/i18n/store.svelte";

  // The New surface (issue #48): "Start blank" plus every recent Project as
  // a Remix seed. Remix-only — a non-active Project is a frozen snapshot
  // that can be remixed, renamed, or deleted, never re-opened for editing,
  // so there is deliberately no "open" action here.
  let {
    open,
    projects,
    fonts,
    onStartBlank,
    onRemix,
    onRename,
    onDelete,
    onClose,
    reducedMotion,
  }: {
    open: boolean;
    /** Ordered by lastEditedAt desc — the caller (App.svelte) owns sorting. */
    projects: Project[];
    fonts: Map<string, Font>;
    onStartBlank: () => void;
    onRemix: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    reducedMotion: boolean;
  } = $props();

  // Only one row can be mid-rename at a time, so a single pair of fields is
  // enough — no need to key state per-project.
  let editingId: string | undefined = $state(undefined);
  let editingValue = $state("");

  function startRename(project: Project) {
    editingId = project.id;
    editingValue = project.name;
  }

  function commitRename() {
    if (editingId) {
      onRename(editingId, editingValue);
    }
    editingId = undefined;
  }

  function cancelRename() {
    editingId = undefined;
  }

  function handleRenameInput(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    editingValue = event.currentTarget.value;
  }

  function handleRenameKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      // Must not bubble to the window handler below — Escape mid-rename
      // cancels the rename, it must not also dismiss the whole surface.
      event.stopPropagation();
      cancelRename();
    }
  }

  // Autofocus + select-all when the rename input first appears, so typing a
  // new name doesn't require an extra click to clear the old one.
  function autofocus(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

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
    class="new-surface"
    role="dialog"
    aria-modal="true"
    aria-labelledby="new-surface-heading"
    transition:fly={{ y: 16, duration: reducedMotion ? 0 : 200 }}
  >
    <div class="panel-header">
      <h2 id="new-surface-heading">{t("projects.new")}</h2>
      <button type="button" class="close" onclick={onClose}>
        {t("new.close")}
      </button>
    </div>

    <button type="button" class="start-blank" onclick={onStartBlank}>
      <span class="plus" aria-hidden="true">+</span>
      {t("new.startBlank")}
    </button>

    {#if projects.length > 0}
      <h3 class="remix-heading">{t("new.recent")}</h3>
      <ul class="remix-list">
        {#each projects as project (project.id)}
          {@const design = DESIGNS.find((d) => d.id === project.designId)}
          {@const font = design && fonts.get(design.fontId)}
          {@const board = BACKDROP_COLORS[backdropTone(project.lettersColor)]}
          <li class="remix-item">
            {#if editingId === project.id}
              <input
                class="rename-input"
                aria-label={t("projects.nameLabel")}
                value={editingValue}
                oninput={handleRenameInput}
                onkeydown={handleRenameKeydown}
                onblur={commitRename}
                use:autofocus
              />
            {:else}
              <span
                class="thumb checkerboard"
                style:--backdrop-base={board.base}
                style:--backdrop-check={board.check}
              >
                {#if font && design && project.letters.length > 0}
                  {@html composeMonogram(project.letters, font, {
                    arrangement: design.arrangement,
                    shape: design.shape,
                    frame: {
                      id: project.frameId,
                      gap: project.frameGap,
                      color: project.frameColor,
                    },
                    lettersColor: project.lettersColor,
                    background: resolveProjectBackground(project),
                  })}
                {/if}
              </span>
              <span class="name">{project.name}</span>
              <button
                type="button"
                class="remix-action"
                onclick={() => onRemix(project.id)}
              >
                {t("new.remix")}
              </button>
              <div class="secondary-actions">
                <button type="button" onclick={() => startRename(project)}>
                  {t("projects.rename")}
                </button>
                <button type="button" onclick={() => onDelete(project.id)}>
                  {t("projects.delete")}
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 30%);
    z-index: 10;
  }

  .new-surface {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(38rem, calc(100vw - 2rem));
    height: fit-content;
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    padding: 1.5rem;
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

  .start-blank {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    margin-top: 1.25rem;
    padding: 1rem;
    font: inherit;
    border: 2px dashed light-dark(#bbb, #555);
    border-radius: 0.5rem;
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .start-blank:hover {
    border-color: light-dark(#0b57d0, #a8c7fa);
  }

  .plus {
    font-size: 1.25rem;
    line-height: 1;
  }

  .remix-heading {
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: light-dark(#555, #aaa);
    margin: 1.5rem 0 0.5rem;
  }

  .remix-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.5rem;
  }

  .remix-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.4rem;
    border: 2px solid light-dark(#ddd, #333);
    border-radius: 0.5rem;
  }

  .thumb {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.25rem;
    --checker-size: 8px;
  }

  .thumb :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .name {
    font-size: 0.75rem;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .remix-action {
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.3rem;
    border: none;
    border-radius: 0.35rem;
    background: light-dark(#0b57d0, #a8c7fa);
    color: light-dark(#fff, #1c1c1e);
    cursor: pointer;
  }

  .secondary-actions {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
  }

  .secondary-actions button {
    flex: 1;
    font-size: 0.6875rem;
    padding: 0.25rem;
  }

  .rename-input {
    width: 100%;
    font: inherit;
    font-size: 0.75rem;
  }
</style>
