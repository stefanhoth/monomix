<script lang="ts">
  import type { Font } from "opentype.js";
  import { DESIGNS, composeMonogram } from "../engine";
  import type { Project } from "../lib/project";
  import { t } from "../lib/i18n/store.svelte";

  // "New Project" moved to the workspace topbar (issue #47) — this panel
  // only lists/renames/deletes until it dissolves into the New/Remix flow.
  let {
    projects,
    fonts,
    activeId,
    onSelect,
    onRename,
    onDelete,
  }: {
    /** Ordered by lastEditedAt desc — the caller (App.svelte) owns sorting. */
    projects: Project[];
    fonts: Map<string, Font>;
    activeId: string | undefined;
    onSelect: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
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
      cancelRename();
    }
  }

  // Autofocus + select-all when the rename input first appears, so typing a
  // new name doesn't require an extra click to clear the old one.
  function autofocus(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<section class="projects-panel">
  <div class="projects-header">
    <h2>{t("projects.heading")}</h2>
  </div>

  {#if projects.length > 0}
    <ul class="projects-list">
      {#each projects as project (project.id)}
        {@const design = DESIGNS.find((d) => d.id === project.designId)}
        {@const font = design && fonts.get(design.fontId)}
        <li class="project-item" class:active={project.id === activeId}>
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
            <button
              type="button"
              class="project-tile"
              onclick={() => onSelect(project.id)}
            >
              <span class="thumb">
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
                    background: project.transparentBackground
                      ? "transparent"
                      : project.backgroundColor,
                  })}
                {/if}
              </span>
              <span class="name">{project.name}</span>
            </button>
            <div class="project-actions">
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
</section>

<style>
  .projects-panel {
    margin-top: 1.5rem;
  }

  .projects-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .projects-header h2 {
    font-size: 1rem;
    margin: 0;
  }

  .projects-list {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.5rem;
  }

  .project-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.4rem;
    border: 2px solid light-dark(#ddd, #333);
    border-radius: 0.5rem;
    background: light-dark(#fff, #1c1c1e);
  }

  .project-item.active {
    border-color: light-dark(#0b57d0, #a8c7fa);
  }

  .project-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
  }

  .thumb {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    color: light-dark(#111, #eee);
  }

  .thumb :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .name {
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .rename-input {
    width: 100%;
    font: inherit;
    font-size: 0.75rem;
  }

  .project-actions {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
  }

  .project-actions button {
    flex: 1;
    font-size: 0.6875rem;
    padding: 0.25rem;
  }
</style>
