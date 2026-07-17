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
  import {
    sanitizeLettersInput,
    type LettersHint,
    type LetterCaseMode,
  } from "./lib/letters-input";
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
    WORKSPACE_TABS,
    tabForKey,
    type WorkspaceTab,
  } from "./lib/workspace-tabs";
  import {
    hasCompletedOnboarding,
    markOnboardingComplete,
  } from "./lib/onboarding";
  import {
    createProject,
    projectSettingsEqual,
    remixProject,
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
  import AboutPanel from "./components/AboutPanel.svelte";
  import DesignGallery from "./components/DesignGallery.svelte";
  import FontCreditsPanel from "./components/FontCreditsPanel.svelte";
  import FrameGallery from "./components/FrameGallery.svelte";
  import NewProjectSurface from "./components/NewProjectSurface.svelte";
  import OnboardingPrompt from "./components/OnboardingPrompt.svelte";
  import LocaleSwitcher from "./components/LocaleSwitcher.svelte";
  import WhatsNewPanel from "./components/WhatsNewPanel.svelte";

  let letters = $state("MX");
  // Case model (issue #62, ADR 0008): "upper" (default) uppercases every
  // letter as before; "preserve" keeps each letter's case exactly as
  // typed. Only affects how future keystrokes are sanitized — toggling it
  // never retroactively recovers case already discarded by "upper".
  let letterCase: LetterCaseMode = $state(DEFAULT_PROJECT_SETTINGS.letterCase);
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

  // Sidebar tab (issue #47). Tabs are views over the same live editor
  // state, never gates — all editable state lives in the $state vars above,
  // so switching tabs can't lose anything. All four panels stay mounted
  // (toggled via the `hidden` attribute) so e.g. the Design gallery's
  // scroll position survives a round-trip through the Colors tab.
  let activeTab: WorkspaceTab = $state("design");

  // WAI-ARIA tabs keyboard pattern with automatic activation: arrows move
  // both focus and selection. tabForKey returns undefined for keys the
  // tablist doesn't own (Tab, characters, ...) — those must keep their
  // default behavior. Attached to each tab button (the focusable elements),
  // not the tablist container.
  function handleTabKeydown(
    event: KeyboardEvent & { currentTarget: HTMLButtonElement },
  ) {
    const next = tabForKey(activeTab, event.key);
    if (!next) return;
    event.preventDefault();
    activeTab = next;
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#tab-${next}`)
      ?.focus();
  }

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

  // Font credits panel (ADR 0003: "an about page credits every font"). It
  // lists the whole catalog, so opening it lazy-loads the fonts no curated
  // Design uses — the initial page load keeps paying only for Design fonts
  // (Design Principle 2). `requestedFontIds` is plain (not $state): only
  // read inside the effect to dedupe fetches, never displayed.
  let creditsOpen = $state(false);
  const requestedFontIds = new Set<string>();
  $effect(() => {
    if (!creditsOpen) return;
    for (const f of FONTS) {
      if (fonts.has(f.id) || requestedFontIds.has(f.id)) continue;
      requestedFontIds.add(f.id);
      loadFont(f.url).then(
        (font) => fonts.set(f.id, font),
        // Forget failed loads so re-opening the panel retries them instead
        // of leaving that specimen permanently blank.
        () => requestedFontIds.delete(f.id),
      );
    }
  });

  // About panel (issue #55): explains the app's purpose and basic usage as
  // a near-fullscreen modal. Deep-linkable via the #about URL hash — kept in
  // sync with `aboutOpen` via history.replaceState (no pushState) so opening
  // or closing it never grows browser history, and mounted outside the
  // projectReady/onboarding gate below so a shared /#about link resolves
  // instantly rather than waiting on the IndexedDB Project check.
  let aboutOpen = $state(location.hash === "#about");

  function setAboutHash(open: boolean) {
    const url = new URL(location.href);
    url.hash = open ? "about" : "";
    history.replaceState(null, "", url);
  }

  function openAbout() {
    aboutOpen = true;
    setAboutHash(true);
  }

  function closeAbout() {
    aboutOpen = false;
    setAboutHash(false);
  }

  function syncAboutFromHash() {
    aboutOpen = location.hash === "#about";
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
    letterCase,
    designId: resolvedDesignId,
    frameId: selectedFrameId,
    frameGap,
    lettersColor,
    frameColor,
    transparentBackground,
    backgroundColor,
  });

  // Loads every field from `project` into the live editor state and makes
  // it the active Project — used on initial hydration, by "Start blank" and
  // Remix (issue #48), and after onboarding creates the first one.
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
    letterCase = project.letterCase;
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

  // The New surface (issue #48): the topbar "New" button opens an overlay
  // with "Start blank" + recent Projects as Remix seeds, replacing #14's
  // silent "new Project inherits last settings".
  let newSurfaceOpen = $state(false);

  // "Start blank" (issue #48 AC): a fresh Project from app defaults —
  // deliberately NOT the last-used settings; building on previous work is
  // exactly what Remix below is for.
  async function handleStartBlank() {
    newSurfaceOpen = false;
    const project = createProject();
    switchToProject(project);
    await projectStore.put(project);
    await refreshProjects();
  }

  // Remix (issue #48 AC): new Project seeded from the source's settings,
  // made active; the source's content and lastEditedAt stay untouched (we
  // only ever put() the remix). Reads from the already-loaded `projects`
  // list and calls switchToProject synchronously — see its docstring for
  // why an async gap before the switch would be a correctness bug.
  async function handleRemixProject(id: string) {
    const stored = projects.find((p) => p.id === id);
    if (!stored) return;
    newSurfaceOpen = false;
    // Remixing the ACTIVE Project must seed from the live editor state, not
    // the stored snapshot — an edit still inside the autosave debounce
    // window (400ms) wouldn't have landed in `projects` yet and would be
    // silently missing from the remix.
    const source =
      id === activeProjectMeta?.id
        ? { ...stored, ...currentProjectSettings }
        : stored;
    const remix = remixProject(source);
    switchToProject(remix);
    await projectStore.put(remix);
    await refreshProjects();
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
        letterCase = DEFAULT_PROJECT_SETTINGS.letterCase;
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
    const result = sanitizeLettersInput(event.currentTarget.value, letterCase);
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

<svelte:window onhashchange={syncAboutFromHash} />

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
  <!-- Fullscreen workspace (issue #47): the monogram is the hero — the
       canvas zone (preview + letters input) is always visible, every other
       control lives in the sidebar's tabs, and nothing ever scrolls the
       preview out of view. The backdrop custom properties are set here so
       the main preview AND the gallery tiles share the same letters-color-
       aware checkerboard (issue #46 follow-up). -->
  <div
    class="workspace"
    style:--backdrop-base={backdrop.base}
    style:--backdrop-check={backdrop.check}
  >
    <header class="top-bar">
      <div class="brand">
        <h1>MonoMix</h1>
        <p class="tagline">{t("app.tagline")}</p>
      </div>
      <div class="top-bar-actions">
        <button type="button" onclick={() => (newSurfaceOpen = true)}>
          {t("projects.new")}
        </button>
        <button
          type="button"
          class="quiet-trigger whatsnew-trigger"
          onclick={openWhatsNew}
        >
          {t("whatsnew.buttonLabel")}
          {#if hasUnseenChangelog}
            <span class="badge" aria-hidden="true"></span>
            <span class="sr-only">{t("whatsnew.unseenIndicator")}</span>
          {/if}
        </button>
        <button type="button" class="quiet-trigger" onclick={openAbout}>
          {t("about.trigger")}
        </button>
        <LocaleSwitcher />
      </div>
    </header>

    <aside class="sidebar">
      <div class="tablist" role="tablist" aria-label={t("tabs.label")}>
        {#each WORKSPACE_TABS as tab (tab)}
          <button
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`}
            tabindex={activeTab === tab ? 0 : -1}
            onclick={() => (activeTab = tab)}
            onkeydown={handleTabKeydown}
          >
            {t(`tabs.${tab}`)}
          </button>
        {/each}
      </div>

      <div class="sidebar-content">
        <div
          class="panel"
          role="tabpanel"
          id="panel-design"
          aria-labelledby="tab-design"
          hidden={activeTab !== "design"}
        >
          <DesignGallery
            designs={availableDesigns}
            letters={debouncedLetters}
            {fonts}
            {lettersColor}
            selectedId={resolvedDesignId}
            onSelect={(id) => (selectedDesignId = id)}
            {reducedMotion}
          />
        </div>

        <div
          class="panel"
          role="tabpanel"
          id="panel-frame"
          aria-labelledby="tab-frame"
          hidden={activeTab !== "frame"}
        >
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
        </div>

        <div
          class="panel"
          role="tabpanel"
          id="panel-colors"
          aria-labelledby="tab-colors"
          hidden={activeTab !== "colors"}
        >
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
        </div>

        <div
          class="panel"
          role="tabpanel"
          id="panel-export"
          aria-labelledby="tab-export"
          hidden={activeTab !== "export"}
        >
          <label class="export-size">
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
        </div>
        <button
          type="button"
          class="quiet-trigger credits-trigger"
          onclick={() => (creditsOpen = true)}
        >
          {t("credits.trigger")}
        </button>
      </div>
    </aside>

    <main class="canvas-zone">
      <div class="letters-row">
        <label class="letters-field">
          {t("letters.label")}
          <input value={letters} oninput={handleLettersInput} />
        </label>
        <!-- Case toggle (issue #62, ADR 0008): affects only how future
             keystrokes are sanitized, not a retroactive re-case of the
             current letters (see letterCase's docstring above). -->
        <div
          class="case-toggle"
          role="group"
          aria-label={t("letters.caseLabel")}
        >
          <button
            type="button"
            aria-pressed={letterCase === "upper"}
            onclick={() => (letterCase = "upper")}
          >
            {t("letters.caseUpper")}
          </button>
          <button
            type="button"
            aria-pressed={letterCase === "preserve"}
            onclick={() => (letterCase = "preserve")}
          >
            {t("letters.casePreserve")}
          </button>
        </div>
      </div>
      <!-- Fixed-height slot so the hint appearing/disappearing never shifts
           the preview (or anything else) around. -->
      <div class="hint-slot">
        {#if lettersHint}
          <p class="hint" role="alert">{lettersHint}</p>
        {/if}
      </div>

      {#key resolvedDesignId}
        <div
          class="preview checkerboard"
          transition:scale={{ start: 0.98, duration: reducedMotion ? 0 : 200 }}
        >
          {#if preview}
            {@html preview}
          {/if}
        </div>
      {/key}
    </main>
  </div>
  <WhatsNewPanel open={whatsNewOpen} onClose={closeWhatsNew} {reducedMotion} />
  <FontCreditsPanel
    open={creditsOpen}
    {fonts}
    onClose={() => (creditsOpen = false)}
    {reducedMotion}
  />
  <NewProjectSurface
    open={newSurfaceOpen}
    {projects}
    {fonts}
    onStartBlank={() => void handleStartBlank()}
    onRemix={(id) => void handleRemixProject(id)}
    onRename={(id, name) => void handleRenameProject(id, name)}
    onDelete={(id) => void handleDeleteProject(id)}
    onClose={() => (newSurfaceOpen = false)}
    {reducedMotion}
  />
{/if}

<AboutPanel open={aboutOpen} onClose={closeAbout} {reducedMotion} />

<style>
  .workspace {
    display: grid;
    grid-template-areas:
      "topbar topbar"
      "sidebar canvas";
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: clamp(18rem, 32vw, 24rem) minmax(0, 1fr);
    height: 100dvh;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .top-bar {
    grid-area: topbar;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 1.25rem;
    border-bottom: 1px solid light-dark(#e2e2e2, #2a2a2c);
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    min-width: 0;
  }

  .brand h1 {
    margin: 0;
    font-size: 1.25rem;
  }

  .top-bar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  /* Shared quiet-link look for chrome that must recede (Design Principle
     1): the What's-new, Fonts-&-licenses, and About triggers. */
  .quiet-trigger {
    font: inherit;
    font-size: 0.875rem;
    background: none;
    border: none;
    padding: 0;
    color: light-dark(#555, #aaa);
    text-decoration: underline;
    cursor: pointer;
  }

  .whatsnew-trigger {
    position: relative;
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
    margin: 0;
    font-size: 0.875rem;
    color: light-dark(#555, #aaa);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar {
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid light-dark(#e2e2e2, #2a2a2c);
    background: light-dark(#fafafa, #161618);
  }

  .tablist {
    display: flex;
    gap: 0.25rem;
    padding: 0.4rem 0.75rem 0;
    border-bottom: 1px solid light-dark(#e2e2e2, #2a2a2c);
  }

  .tablist [role="tab"] {
    flex: 1;
    font: inherit;
    font-size: 0.875rem;
    padding: 0.5rem 0.25rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: light-dark(#555, #aaa);
    cursor: pointer;
  }

  .tablist [role="tab"][aria-selected="true"] {
    color: light-dark(#0b57d0, #a8c7fa);
    border-bottom-color: currentColor;
    font-weight: 600;
  }

  .sidebar-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 0.75rem;
  }

  .credits-trigger {
    display: block;
    margin: 1.5rem 0.25rem 0.25rem;
    font-size: 0.8125rem;
  }

  /* Restarts every time a panel un-hides (CSS animations don't run while
     display: none), so tab switches get a light glide without any JS —
     and none at all under prefers-reduced-motion. */
  .panel {
    animation: panel-in 160ms ease;
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel {
      animation: none;
    }
  }

  .canvas-zone {
    grid-area: canvas;
    /* Size container so .preview below can size itself against the zone's
       *height* (cqh) — the one dimension plain percentages can't reach in
       a column flexbox. */
    container-type: size;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 0;
    overflow: hidden;
    padding: 1.5rem;
  }

  .letters-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.75rem;
  }

  .letters-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: light-dark(#555, #aaa);
  }

  .case-toggle {
    display: flex;
    border: 1px solid light-dark(#d5d5d5, #3a3a3c);
    border-radius: 0.4rem;
    overflow: hidden;
  }

  .case-toggle button {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.35rem 0.6rem;
    border: none;
    background: none;
    color: light-dark(#555, #aaa);
    cursor: pointer;
  }

  .case-toggle button + button {
    border-left: 1px solid light-dark(#d5d5d5, #3a3a3c);
  }

  .case-toggle button[aria-pressed="true"] {
    background: light-dark(#0b57d0, #a8c7fa);
    color: light-dark(#fff, #1c1c1e);
    font-weight: 600;
  }

  .letters-field input {
    font: inherit;
    font-size: 1.4rem;
    text-align: center;
    width: 9rem;
    letter-spacing: 0.15em;
    padding: 0.3rem 0.5rem;
    color: light-dark(#111, #eee);
  }

  /* The slot reserves one line; the hint itself overlays (absolute) so a
     long suggestion wrapping to a second line on narrow viewports still
     never shifts the preview below it. */
  .hint-slot {
    position: relative;
    min-height: 1.4rem;
    width: 100%;
  }

  .hint {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: 100%;
    text-align: center;
    color: light-dark(#b3261e, #ffb4ab);
    font-size: 0.875rem;
    margin: 0;
  }

  .preview {
    /* The monogram is a square (the engine emits a square viewBox), so its
       rendered height equals this width — capping the width at "the zone's
       height minus everything stacked around the preview" (letters field,
       hint slot, gaps, paddings) guarantees the whole canvas zone fits
       without scrolling. The rem cap keeps it tasteful on huge screens.
       Checkerboard background comes from the shared .checkerboard utility
       (app.css) fed by the --backdrop-* properties set on .workspace. */
    width: min(100%, max(calc(100cqh - 11rem), 12rem), 44rem);
    padding: 1.5rem;
    border-radius: 0.75rem;
  }

  .preview :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .gap-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    padding: 0 0.25rem;
  }

  .gap-control label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    font-size: 0.875rem;
  }

  .gap-value {
    font-variant-numeric: tabular-nums;
    min-width: 2.5rem;
    text-align: right;
  }

  .color-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.25rem;
  }

  .color-controls label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.875rem;
  }

  .color-controls label.disabled {
    opacity: 0.5;
  }

  .color-controls label.checkbox-label {
    flex-direction: row-reverse;
    justify-content: flex-end;
    gap: 0.4rem;
  }

  .export-size {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.875rem;
    padding: 0.25rem;
  }

  .export-size input {
    width: 6rem;
  }

  .export-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0 0.25rem;
  }

  /* Mobile (issue #47): fixed vertical split — canvas zone on top, tab bar
     + panel below, panel content scrolls within its own zone. Deliberately
     not a bottom sheet: a sheet covers the preview exactly when a change
     is being made. */
  @media (max-width: 48rem) {
    .workspace {
      grid-template-areas:
        "topbar"
        "canvas"
        "sidebar";
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 42dvh) minmax(0, 1fr);
    }

    .tagline {
      display: none;
    }

    /* Tighter topbar so the full brand name and all three actions fit a
       375px-wide viewport without truncating. */
    .top-bar {
      padding: 0.5rem 0.75rem;
      gap: 0.5rem;
    }

    .top-bar-actions {
      gap: 0.5rem;
    }

    .brand h1 {
      font-size: 1.1rem;
    }

    .sidebar {
      border-right: none;
      border-top: 1px solid light-dark(#e2e2e2, #2a2a2c);
    }

    .canvas-zone {
      padding: 0.75rem 1rem;
      gap: 0.4rem;
    }

    .letters-row {
      gap: 0.5rem;
    }

    .letters-field {
      flex-direction: row;
      gap: 0.5rem;
    }

    .letters-field input {
      font-size: 1.1rem;
      width: 7rem;
    }

    .case-toggle button {
      padding: 0.3rem 0.45rem;
    }

    .hint-slot {
      min-height: 1.2rem;
    }

    .preview {
      width: min(100%, max(calc(100cqh - 7rem), 8rem), 44rem);
      padding: 1rem;
    }
  }
</style>
