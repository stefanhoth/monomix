<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { scale } from "svelte/transition";
  import type { Font } from "opentype.js";
  import {
    composeMonogram,
    DESIGNS,
    FONTS,
    FRAMES,
    NO_FRAME_ID,
    type LetterCount,
  } from "./engine";
  import { loadFont } from "./lib/font-loader";
  import { exportSvg } from "./lib/export/svg";
  import { exportPng, exportJpg } from "./lib/export/raster";
  import { triggerDownload } from "./lib/export/download";
  import { DEFAULT_EXPORT_SIZE } from "./lib/export/options";
  import { sanitizeLettersInput, type LettersHint } from "./lib/letters-input";
  import {
    resolveFrameGap,
    DEFAULT_FRAME_GAP,
    MIN_GAP,
    MAX_GAP,
  } from "./lib/frame-gap";
  import {
    filterDesignsByLetterCount,
    resolveSelectedDesignId,
  } from "./lib/gallery";
  import { isFirstRun } from "./lib/first-run";
  import { backdropTone, BACKDROP_COLORS } from "./lib/preview-backdrop";
  import {
    hasCompletedOnboarding,
    markOnboardingComplete,
  } from "./lib/onboarding";
  import {
    createProject,
    createNewProject,
    projectSettingsEqual,
    toProjectSettings,
    DEFAULT_PROJECT_SETTINGS,
    type Project,
    type ProjectSettings,
  } from "./lib/project";
  import { createIndexedDbProjectStore } from "./lib/project-store-indexeddb";
  import { createAutosaveController } from "./lib/autosave";
  import { formatLettersHint } from "./lib/i18n/format-letters-hint";
  import { getLocale, t } from "./lib/i18n/store.svelte";
  import {
    CHANGELOG_ENTRIES,
    hasUnseenEntries,
    latestEntryId,
  } from "./lib/changelog";
  import { getLastSeenEntryId, markEntrySeen } from "./lib/changelog-storage";
  import DesignGallery from "./components/DesignGallery.svelte";
  import FrameGallery from "./components/FrameGallery.svelte";
  import OnboardingPrompt from "./components/OnboardingPrompt.svelte";
  import ProjectsPanel from "./components/ProjectsPanel.svelte";
  import LocaleSwitcher from "./components/LocaleSwitcher.svelte";
  import WhatsNewPanel from "./components/WhatsNewPanel.svelte";

  let letters = $state("MX");
  let lettersHintInfo: LettersHint | null = $state(null);
  let lettersHint = $derived(
    lettersHintInfo && formatLettersHint(lettersHintInfo, getLocale()),
  );
  // Debounced separately from `letters` — the main preview reflects every
  // keystroke instantly (Design Principle 3), but re-composing all ~30+
  // gallery tiles on every keystroke is wasted work while still typing.
  let debouncedLetters = $state(untrack(() => letters));
  // SvelteMap so tiles can populate progressively as each font finishes
  // loading, without replacing the whole Map (and its reactive subscribers)
  // on every single arrival.
  const fonts = new SvelteMap<string, Font>();
  let exportSize = $state(DEFAULT_EXPORT_SIZE);
  // The user's explicit choice, if any — undefined until they pick a tile.
  // Never written to reactively; see resolvedDesignId below.
  let selectedDesignId: string | undefined = $state(undefined);
  let reducedMotion = $state(false);

  // Frame (CONTEXT.md): "No Frame" is the default per the Frame gallery's
  // acceptance criteria. Gap is stored raw and clamped just before it
  // reaches the engine (resolveFrameGap) — same pattern as exportSize below,
  // so a manually typed negative number never reaches composeMonogram.
  let selectedFrameId = $state(NO_FRAME_ID);
  let frameGap = $state(DEFAULT_FRAME_GAP);
  // Near-black default for both swatches — approximates the "currentColor"
  // look the preview had before explicit color controls existed, without
  // trying to track the system color scheme dynamically.
  let lettersColor = $state("#111111");
  let frameColor = $state("#111111");
  // Background is transparent by default (checkerboard, not white — see
  // .preview below). `backgroundColor` only takes effect once the user
  // unchecks "Transparent", and remembers their last pick if they toggle
  // back and forth.
  let transparentBackground = $state(true);
  let backgroundColor = $state("#ffffff");

  let onboardingComplete = $state(untrack(() => hasCompletedOnboarding()));

  // What's new panel (issue #17, ADR 0005): lastSeenChangelogId starts from
  // storage and only updates when the panel is opened (see openWhatsNew) —
  // hasUnseenChangelog is purely derived from it, so the badge disappears
  // the instant the panel opens rather than waiting on a storage round-trip.
  let whatsNewOpen = $state(false);
  let lastSeenChangelogId: string | null = $state(
    untrack(() => getLastSeenEntryId()),
  );
  let hasUnseenChangelog = $derived(
    hasUnseenEntries(CHANGELOG_ENTRIES, lastSeenChangelogId),
  );

  function openWhatsNew() {
    whatsNewOpen = true;
    const latest = latestEntryId(CHANGELOG_ENTRIES);
    if (latest) {
      markEntrySeen(latest);
      lastSeenChangelogId = latest;
    }
  }

  function closeWhatsNew() {
    whatsNewOpen = false;
  }

  // Projects (issue #14): implicit, Canva/Figma-style autosave — every
  // editor change debounce-saves to the active Project, no save button.
  // `activeProjectMeta` holds just the identity fields (id/name/createdAt);
  // the settings fields (letters, design, frame, colors, ...) already live
  // in the $state vars above, which double as "the active Project's current
  // settings" — see `currentProjectSettings` further down.
  const projectStore = createIndexedDbProjectStore();
  let activeProjectMeta:
    { id: string; name: string; createdAt: number } | undefined =
    $state(undefined);
  // Becomes true once the initial "does a Project already exist?" check
  // completes — gates both the autosave effect (must not fire before we
  // know whether we're hydrating an existing Project) and the very first
  // render decision (see the template below).
  let projectReady = $state(false);
  let projects: Project[] = $state([]);
  // Plain (non-reactive) bookkeeping var, not $state: the autosave effect
  // both reads and would otherwise need to write this on every run, which
  // reading it as $state would turn into a self-triggering reactive loop.
  // It only needs to be read for comparison, never displayed.
  let lastSavedSettings: ProjectSettings | undefined;

  const autosave = createAutosaveController(projectStore, {
    delayMs: 400,
    onSaved: () => {
      void refreshProjects();
    },
  });

  // Onboarding (issue #13): a pure predicate (isFirstRun) decides whether
  // to show the initials prompt instead of the editor. It's fed by a
  // localStorage flag (src/lib/onboarding.ts) OR'd with `hasAnyProject`
  // (issue #14) — once any Project exists, onboarding never shows again,
  // even if the localStorage flag itself was cleared. isFirstRun() itself
  // is unchanged in shape.
  let hasAnyProject = $derived(activeProjectMeta !== undefined);
  let showOnboarding = $derived(
    isFirstRun({ onboardingComplete: onboardingComplete || hasAnyProject }),
  );

  let letterCount = $derived(
    Math.min(Math.max(letters.length, 1), 3) as LetterCount,
  );
  let availableDesigns = $derived(
    filterDesignsByLetterCount(DESIGNS, letterCount),
  );
  // Keeps the current selection if it still supports this Letter Count,
  // else falls back — purely derived, so there's no effect writing back
  // into the state it reads (no risk of a reactive loop).
  let resolvedDesignId = $derived(
    resolveSelectedDesignId(selectedDesignId, availableDesigns),
  );
  let resolvedDesign = $derived(
    availableDesigns.find((d) => d.id === resolvedDesignId),
  );
  let resolvedFont = $derived(
    resolvedDesign && fonts.get(resolvedDesign.fontId),
  );
  let resolvedFrameGap = $derived(resolveFrameGap(frameGap));
  let resolvedBackground = $derived(
    transparentBackground ? "transparent" : backgroundColor,
  );
  // Checkerboard follows the letters color, not the UI theme (issue #46) —
  // near-black default letters were unreadable on the dark-mode board.
  let backdrop = $derived(BACKDROP_COLORS[backdropTone(lettersColor)]);
  let preview = $derived(
    resolvedFont && resolvedDesign && letters.length > 0
      ? composeMonogram(letters, resolvedFont, {
          arrangement: resolvedDesign.arrangement,
          shape: resolvedDesign.shape,
          frame: {
            id: selectedFrameId,
            gap: resolvedFrameGap,
            color: frameColor,
          },
          lettersColor,
          background: resolvedBackground,
        })
      : "",
  );

  // The active Project's settings as they exist *right now* — always a
  // valid, concrete snapshot (uses resolvedDesignId, never the possibly-
  // undefined selectedDesignId) so it's always safe to persist. Read by the
  // autosave effect below.
  let currentProjectSettings: ProjectSettings = $derived({
    letters,
    designId: resolvedDesignId,
    frameId: selectedFrameId,
    frameGap,
    lettersColor,
    frameColor,
    transparentBackground,
    backgroundColor,
  });

  // Loads every field from `project` into the live editor state and makes
  // it the active Project — used on initial hydration, when switching to a
  // different recent Project, and after onboarding creates the first one.
  // Deliberately synchronous end-to-end (no `await` before the field
  // reassignments): flush()'s pending-write capture happens synchronously
  // the instant it's called (the JS engine runs an async function's body
  // synchronously up to its first `await`), so firing it without awaiting
  // still safely persists the *previous* active Project's last edit. If
  // this instead awaited an async fetch (e.g. `projectStore.get`) before
  // reassigning `activeProjectMeta`, an edit made during that window would
  // race the switch and land on the outgoing Project instead of the new
  // one — this function must never have an async gap before the
  // reassignments below.
  function switchToProject(project: Project) {
    void autosave.flush();
    activeProjectMeta = {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
    };
    lastSavedSettings = toProjectSettings(project);
    letters = project.letters;
    debouncedLetters = project.letters;
    selectedDesignId = project.designId;
    selectedFrameId = project.frameId;
    frameGap = project.frameGap;
    lettersColor = project.lettersColor;
    frameColor = project.frameColor;
    transparentBackground = project.transparentBackground;
    backgroundColor = project.backgroundColor;
  }

  async function refreshProjects() {
    const list = await projectStore.list();
    projects = list.slice().sort((a, b) => b.lastEditedAt - a.lastEditedAt);
  }

  async function initProject() {
    const lastEdited = await projectStore.getLastEdited();
    if (lastEdited) {
      switchToProject(lastEdited);
    }
    await refreshProjects();
    projectReady = true;
  }

  onMount(async () => {
    // Resolve/hydrate the active Project first (issue #14) — fast (a local
    // IndexedDB read), and it decides which font is actually "the" primary
    // one below for a returning user.
    await initProject();

    // Load the font the initial preview actually needs first, so it's
    // never blocked on the other gallery fonts (Design Principle 2: fast
    // first result). The rest load in the background and populate the
    // gallery progressively as each one arrives — only fonts a curated
    // Design actually uses, since #39 shrunk DESIGNS to a subset of FONTS.
    const primaryId = untrack(() => resolvedDesign)?.fontId;
    const primary = FONTS.find((f) => f.id === primaryId);
    const usedFontIds = new Set(DESIGNS.map((d) => d.fontId));
    const rest = FONTS.filter(
      (f) => f.id !== primaryId && usedFontIds.has(f.id),
    );

    if (primary) {
      fonts.set(primary.id, await loadFont(primary.url));
    }
    for (const f of rest) {
      loadFont(f.url).then((font) => fonts.set(f.id, font));
    }
  });

  $effect(() => {
    const current = letters;
    const timer = setTimeout(() => {
      debouncedLetters = current;
    }, 200);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = query.matches;
    const handleChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  });

  // Autosave (issue #14): debounce-saves every editor change to the active
  // Project. Gated on `projectReady` (must not run before we know whether
  // we're hydrating an existing Project) and `showOnboarding` (must not
  // create a stray Project while the user hasn't submitted/skipped
  // onboarding yet — see completeOnboarding). Skips the write entirely when
  // `currentProjectSettings` hasn't actually changed since the last save,
  // so merely switching the active Project (which reassigns every field to
  // values that already match) doesn't bump its lastEditedAt.
  $effect(() => {
    if (!projectReady || showOnboarding) return;
    const settings = currentProjectSettings;
    const meta = activeProjectMeta;

    if (!meta) {
      // No Project exists yet (e.g. onboarding was completed in a previous
      // session, so `onboardingComplete` is already true, but no edit has
      // happened yet this session) — create one from the current settings.
      const created = createProject(settings);
      activeProjectMeta = {
        id: created.id,
        name: created.name,
        createdAt: created.createdAt,
      };
      lastSavedSettings = settings;
      autosave.scheduleSave(created);
      return;
    }

    if (
      lastSavedSettings &&
      projectSettingsEqual(lastSavedSettings, settings)
    ) {
      return;
    }
    lastSavedSettings = settings;
    autosave.scheduleSave({
      ...settings,
      id: meta.id,
      name: meta.name,
      createdAt: meta.createdAt,
      lastEditedAt: Date.now(),
    });
  });

  // Shared by both onboarding exits (submit and skip): creates and persists
  // the first Project (design guidance for #14: "submitting initials /
  // skipping should create the first Project"), makes it active (sets the
  // real letters immediately, bypassing the 200ms gallery debounce below,
  // so the reveal shows the user's actual letters from the first frame, not
  // a stale default), and marks onboarding complete so it never shows again.
  async function completeOnboarding(nextLetters: string) {
    const project = createProject({
      ...DEFAULT_PROJECT_SETTINGS,
      letters: nextLetters,
    });
    switchToProject(project);
    markOnboardingComplete();
    onboardingComplete = true;
    await projectStore.put(project);
    await refreshProjects();
  }

  function handleOnboardingSubmit(submittedLetters: string) {
    void completeOnboarding(submittedLetters);
  }

  // Skip / "just browsing" (issue #13 AC): defaults to a pleasant
  // placeholder rather than dead-ending on an empty monogram.
  function handleOnboardingSkip() {
    void completeOnboarding("ABC");
  }

  // "New Project" (issue #14 AC): starts from the most recently used
  // settings, not hardcoded defaults. Flushes any pending autosave first so
  // `createNewProject`'s "most recently edited Project" lookup sees the
  // latest edit, not a stale pre-debounce snapshot.
  async function handleNewProject() {
    await autosave.flush();
    const project = await createNewProject(projectStore);
    switchToProject(project);
    await projectStore.put(project);
    await refreshProjects();
  }

  // Synchronous and reads from the already-loaded `projects` list rather
  // than re-fetching from the store — see switchToProject's docstring for
  // why an async gap here would be a correctness bug, not just a style
  // choice: an edit made while awaiting a fetch could land on the outgoing
  // Project instead of the one being switched to.
  function handleSelectProject(id: string) {
    if (id === activeProjectMeta?.id) return;
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    switchToProject(project);
  }

  async function handleRenameProject(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = await projectStore.get(id);
    if (!existing) return;
    await projectStore.put({ ...existing, name: trimmed });
    if (activeProjectMeta?.id === id) {
      activeProjectMeta = { ...activeProjectMeta, name: trimmed };
    }
    await refreshProjects();
  }

  async function handleDeleteProject(id: string) {
    if (activeProjectMeta?.id === id) {
      // Discard any pending debounced write for the Project we're about to
      // delete, and wait out a write already in flight (the debounce timer
      // fired but store.put() hasn't resolved yet — cancelPending() alone
      // can't stop it) — otherwise it could land after delete() below and
      // resurrect the Project. This must happen *before* store.delete(id)
      // so the delete is guaranteed to be the last write for this id.
      autosave.cancelPending();
      await autosave.settleInFlight();
    }
    await projectStore.delete(id);
    if (activeProjectMeta?.id === id) {
      const fallback = await projectStore.getLastEdited();
      if (fallback) {
        switchToProject(fallback);
      } else {
        // No Projects left at all — fall back to the same hardcoded
        // defaults the app shipped with pre-#14, since there's nothing left
        // to hydrate from. onboardingComplete stays true (a one-way flag,
        // see #13), so this does not bring the onboarding prompt back.
        activeProjectMeta = undefined;
        lastSavedSettings = undefined;
        letters = DEFAULT_PROJECT_SETTINGS.letters;
        debouncedLetters = DEFAULT_PROJECT_SETTINGS.letters;
        selectedDesignId = undefined;
        selectedFrameId = DEFAULT_PROJECT_SETTINGS.frameId;
        frameGap = DEFAULT_PROJECT_SETTINGS.frameGap;
        lettersColor = DEFAULT_PROJECT_SETTINGS.lettersColor;
        frameColor = DEFAULT_PROJECT_SETTINGS.frameColor;
        transparentBackground = DEFAULT_PROJECT_SETTINGS.transparentBackground;
        backgroundColor = DEFAULT_PROJECT_SETTINGS.backgroundColor;
      }
    }
    await refreshProjects();
  }

  // No native maxlength: it counts raw keystrokes, not valid ones, so once
  // 3 valid letters already fill the field, the browser would block the
  // 4th keystroke *before* oninput ever fires — swallowing an invalid
  // character with no hint shown at all. sanitizeLettersInput() already
  // enforces the 3-letter cap itself.
  function handleLettersInput(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    const result = sanitizeLettersInput(event.currentTarget.value);
    letters = result.letters;
    lettersHintInfo = result.hint;
    // Keep the DOM in sync immediately — a rejected character (e.g. an
    // umlaut) must never render, not even for a frame.
    event.currentTarget.value = result.letters;
  }

  async function handleExport(format: "svg" | "png" | "jpg" | "pdf") {
    if (!preview) return;
    let blob: Blob;
    switch (format) {
      case "svg":
        blob = exportSvg(preview);
        break;
      case "png":
        blob = await exportPng(preview, exportSize);
        break;
      case "jpg":
        blob = await exportJpg(preview, exportSize);
        break;
      case "pdf": {
        // jsPDF + svg2pdf.js are ~490 KB — code-split so the common case
        // (no PDF export) never pays for it (docs/BACKLOG.md).
        const { exportPdf } = await import("./lib/export/pdf");
        blob = await exportPdf(preview);
        break;
      }
    }
    triggerDownload(blob, `monomix.${format}`);
  }
</script>

{#if !projectReady}
  <!-- Briefly blank while the initial "does a Project already exist?"
       IndexedDB check resolves — deciding whether to show onboarding or the
       editor (and, for a returning user, which Project to hydrate) depends
       on its result, so neither can render first. In practice this is a
       single local IndexedDB read (sub-millisecond to a few ms), well
       within Design Principle 2's "fast first result." -->
{:else if showOnboarding}
  <OnboardingPrompt
    onSubmit={handleOnboardingSubmit}
    onSkip={handleOnboardingSkip}
  />
{:else}
  <main>
    <div class="top-bar">
      <h1>MonoMix</h1>
      <div class="top-bar-actions">
        <button type="button" class="whatsnew-trigger" onclick={openWhatsNew}>
          {t("whatsnew.buttonLabel")}
          {#if hasUnseenChangelog}
            <span class="badge" aria-hidden="true"></span>
            <span class="sr-only">{t("whatsnew.unseenIndicator")}</span>
          {/if}
        </button>
        <LocaleSwitcher />
      </div>
    </div>
    <p class="tagline">{t("app.tagline")}</p>

    <label>
      {t("letters.label")}
      <input value={letters} oninput={handleLettersInput} />
    </label>
    {#if lettersHint}
      <p class="hint" role="alert">{lettersHint}</p>
    {/if}

    {#key resolvedDesignId}
      <div
        class="preview"
        style:--backdrop-base={backdrop.base}
        style:--backdrop-check={backdrop.check}
        transition:scale={{ start: 0.98, duration: reducedMotion ? 0 : 200 }}
      >
        {#if preview}
          {@html preview}
        {/if}
      </div>
    {/key}

    <DesignGallery
      designs={availableDesigns}
      letters={debouncedLetters}
      {fonts}
      selectedId={resolvedDesignId}
      onSelect={(id) => (selectedDesignId = id)}
      {reducedMotion}
    />

    <FrameGallery
      frames={FRAMES}
      letters={debouncedLetters}
      font={resolvedFont}
      arrangement={resolvedDesign?.arrangement}
      shape={resolvedDesign?.shape}
      gap={resolvedFrameGap}
      {lettersColor}
      {frameColor}
      selectedId={selectedFrameId}
      onSelect={(id) => (selectedFrameId = id)}
    />

    <div class="gap-control">
      <label>
        {t("frameGap.label")}
        <input
          type="range"
          min={MIN_GAP}
          max={MAX_GAP}
          step="5"
          bind:value={frameGap}
        />
      </label>
      <output class="gap-value">{frameGap}</output>
    </div>

    <div class="color-controls">
      <label>
        {t("color.letters")}
        <input type="color" bind:value={lettersColor} />
      </label>
      <label>
        {t("color.frame")}
        <input type="color" bind:value={frameColor} />
      </label>
      <label class:disabled={transparentBackground}>
        {t("color.background")}
        <input
          type="color"
          bind:value={backgroundColor}
          disabled={transparentBackground}
        />
      </label>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={transparentBackground} />
        {t("color.transparent")}
      </label>
    </div>

    <label>
      {t("export.sizeLabel")}
      <input type="number" min="128" max="4096" bind:value={exportSize} />
    </label>

    <div class="export-actions">
      <button onclick={() => handleExport("svg")} disabled={!preview}>
        {t("export.svg")}
      </button>
      <button onclick={() => handleExport("png")} disabled={!preview}>
        {t("export.png")}
      </button>
      <button onclick={() => handleExport("jpg")} disabled={!preview}>
        {t("export.jpg")}
      </button>
      <button onclick={() => handleExport("pdf")} disabled={!preview}>
        {t("export.pdf")}
      </button>
    </div>

    <ProjectsPanel
      {projects}
      {fonts}
      activeId={activeProjectMeta?.id}
      onSelect={handleSelectProject}
      onRename={(id, name) => void handleRenameProject(id, name)}
      onDelete={(id) => void handleDeleteProject(id)}
      onNewProject={() => void handleNewProject()}
    />
  </main>
  <WhatsNewPanel open={whatsNewOpen} onClose={closeWhatsNew} {reducedMotion} />
{/if}

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

  @media (max-width: 30rem) {
    main {
      margin: 1.5rem auto;
    }
  }

  .top-bar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .top-bar h1 {
    margin: 0;
  }

  .top-bar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .whatsnew-trigger {
    position: relative;
    font: inherit;
    font-size: 0.875rem;
    background: none;
    border: none;
    padding: 0;
    color: light-dark(#555, #aaa);
    text-decoration: underline;
    cursor: pointer;
  }

  .badge {
    position: absolute;
    top: -0.15rem;
    right: -0.6rem;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: light-dark(#0b57d0, #a8c7fa);
  }

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

  .tagline {
    color: light-dark(#555, #aaa);
  }

  .hint {
    color: light-dark(#b3261e, #ffb4ab);
    font-size: 0.875rem;
    margin: 0.25rem 0 0;
  }

  .preview {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    /* Checkerboard, not a solid fill — a transparent background (the
       default, see `transparentBackground` above) must read as transparent,
       not as accidentally white/gray. An opaque chosen background fully
       covers this anyway, so it's safe to render unconditionally.
       The colors come from BACKDROP_COLORS via the custom properties set on
       the element — light or dark board depending on the letters color
       (issue #46), not on the UI theme. */
    background-color: var(--backdrop-base);
    background-image:
      linear-gradient(45deg, var(--backdrop-check) 25%, transparent 25%),
      linear-gradient(-45deg, var(--backdrop-check) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--backdrop-check) 75%),
      linear-gradient(-45deg, transparent 75%, var(--backdrop-check) 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0px;
    color: light-dark(#111, #eee);
  }

  .preview :global(svg) {
    display: block;
    width: 100%;
    max-width: 20rem;
    margin: 0 auto;
  }

  .gap-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .gap-control label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .gap-value {
    font-variant-numeric: tabular-nums;
    min-width: 2.5rem;
    text-align: right;
  }

  .color-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 1rem;
    margin-top: 1rem;
  }

  .color-controls label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .color-controls label.disabled {
    opacity: 0.5;
  }

  .color-controls label.checkbox-label {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }

  .export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
