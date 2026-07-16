import { describe, expect, it } from "vitest";
import {
  createProject,
  deserializeProject,
  normalizeProject,
  projectSettingsEqual,
  remixProject,
  resolveProjectBackground,
  serializeProject,
  toProjectSettings,
  DEFAULT_PROJECT_SETTINGS,
  type Project,
  type ProjectSettings,
} from "../../src/lib/project";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "MX",
    letters: "MX",
    letterCase: "upper",
    designId: "cinzel-classic",
    frameId: "circle",
    frameGap: 40,
    lettersColor: "#111111",
    frameColor: "#111111",
    backgroundKind: "transparent",
    backgroundColor: "#ffffff",
    backgroundImage: null,
    createdAt: 1000,
    lastEditedAt: 2000,
    ...overrides,
  };
}

describe("serializeProject / deserializeProject", () => {
  it("round-trips a Project through JSON without loss", () => {
    const original = project();
    const restored = deserializeProject(serializeProject(original));
    expect(restored).toEqual(original);
  });
});

describe("normalizeProject", () => {
  it("passes through a well-formed record unchanged", () => {
    const original = project();
    expect(
      normalizeProject(original as unknown as Record<string, unknown>),
    ).toEqual(original);
  });

  it("fills in DEFAULT_PROJECT_SETTINGS for missing settings fields", () => {
    const result = normalizeProject({ id: "p1", name: "Untitled" });
    expect(result.letters).toBe(DEFAULT_PROJECT_SETTINGS.letters);
    expect(result.designId).toBe(DEFAULT_PROJECT_SETTINGS.designId);
    expect(result.frameId).toBe(DEFAULT_PROJECT_SETTINGS.frameId);
    expect(result.frameGap).toBe(DEFAULT_PROJECT_SETTINGS.frameGap);
    expect(result.backgroundKind).toBe(DEFAULT_PROJECT_SETTINGS.backgroundKind);
  });

  it("generates an id and name when missing or malformed, rather than throwing", () => {
    const result = normalizeProject({ name: "" });
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.name).toBe("Untitled");
  });

  it("ignores wrongly-typed fields and falls back to defaults", () => {
    const result = normalizeProject({
      letters: 123,
      frameGap: "not a number",
      backgroundKind: "not-a-kind",
    });
    expect(result.letters).toBe(DEFAULT_PROJECT_SETTINGS.letters);
    expect(result.frameGap).toBe(DEFAULT_PROJECT_SETTINGS.frameGap);
    expect(result.backgroundKind).toBe(DEFAULT_PROJECT_SETTINGS.backgroundKind);
  });

  it("derives backgroundKind from the pre-#63 transparentBackground boolean when backgroundKind is absent", () => {
    expect(
      normalizeProject({ transparentBackground: true }).backgroundKind,
    ).toBe("transparent");
    expect(
      normalizeProject({ transparentBackground: false }).backgroundKind,
    ).toBe("color");
  });

  it("defaults createdAt/lastEditedAt to now when missing", () => {
    const before = Date.now();
    const result = normalizeProject({});
    const after = Date.now();
    expect(result.createdAt).toBeGreaterThanOrEqual(before);
    expect(result.createdAt).toBeLessThanOrEqual(after);
    expect(result.lastEditedAt).toBeGreaterThanOrEqual(before);
    expect(result.lastEditedAt).toBeLessThanOrEqual(after);
  });
});

describe("createProject", () => {
  it("falls back to DEFAULT_PROJECT_SETTINGS when nothing to inherit", () => {
    const created = createProject();
    expect(created.letters).toBe(DEFAULT_PROJECT_SETTINGS.letters);
    expect(created.designId).toBe(DEFAULT_PROJECT_SETTINGS.designId);
    expect(created.frameId).toBe(DEFAULT_PROJECT_SETTINGS.frameId);
    expect(created.frameGap).toBe(DEFAULT_PROJECT_SETTINGS.frameGap);
  });

  it("inherits every settings field from the given settings, not hardcoded defaults", () => {
    const settings: ProjectSettings = {
      letters: "ABC",
      letterCase: "preserve",
      designId: "playfair-stacked",
      frameId: "diamond",
      frameGap: 120,
      lettersColor: "#ff0000",
      frameColor: "#00ff00",
      backgroundKind: "color",
      backgroundColor: "#3355ff",
      backgroundImage: null,
    };
    const created = createProject(settings);
    expect(created).toMatchObject(settings);
  });

  it("gives each new Project a fresh, unique id", () => {
    const a = createProject();
    const b = createProject();
    expect(a.id).not.toBe(b.id);
  });

  it("names the Project after its letters", () => {
    const created = createProject({
      ...DEFAULT_PROJECT_SETTINGS,
      letters: "STE",
    });
    expect(created.name).toBe("STE");
  });

  it("falls back to 'Untitled' when letters is blank", () => {
    const created = createProject({ ...DEFAULT_PROJECT_SETTINGS, letters: "" });
    expect(created.name).toBe("Untitled");
  });

  it("sets createdAt and lastEditedAt to the same fresh timestamp", () => {
    const created = createProject();
    expect(created.createdAt).toBe(created.lastEditedAt);
  });
});

// Remix (CONTEXT.md, issue #48): a new Project seeded from an existing
// Project's settings; the source stays untouched. The only way to build on
// a past Project.
describe("remixProject", () => {
  it("copies every settings field from the source", () => {
    const source = project({
      letters: "ABC",
      designId: "playfair-circle",
      frameId: "diamond",
      frameGap: 80,
      lettersColor: "#ff0000",
      frameColor: "#00ff00",
      backgroundKind: "color",
      backgroundColor: "#0000ff",
    });
    const remix = remixProject(source);
    expect(projectSettingsEqual(remix, toProjectSettings(source))).toBe(true);
  });

  it("is a new Project: fresh id and fresh timestamps, not the source's", () => {
    const source = project({ createdAt: 1000, lastEditedAt: 2000 });
    const before = Date.now();
    const remix = remixProject(source);
    expect(remix.id).not.toBe(source.id);
    expect(remix.createdAt).toBeGreaterThanOrEqual(before);
    expect(remix.lastEditedAt).toBe(remix.createdAt);
  });

  it("names the remix after its source", () => {
    const remix = remixProject(project({ name: "My Monogram" }));
    expect(remix.name).toBe("My Monogram Remix");
  });

  it("does not mutate the source Project (pure)", () => {
    const source = project();
    const snapshot = { ...source };
    remixProject(source);
    expect(source).toEqual(snapshot);
  });
});

describe("toProjectSettings", () => {
  it("strips identity/metadata fields, keeping only the settings", () => {
    const full = project();
    const settings = toProjectSettings(full);
    expect(settings).toEqual({
      letters: full.letters,
      letterCase: full.letterCase,
      designId: full.designId,
      frameId: full.frameId,
      frameGap: full.frameGap,
      lettersColor: full.lettersColor,
      frameColor: full.frameColor,
      backgroundKind: full.backgroundKind,
      backgroundColor: full.backgroundColor,
      backgroundImage: full.backgroundImage,
    });
    expect(settings).not.toHaveProperty("id");
    expect(settings).not.toHaveProperty("name");
  });
});

describe("projectSettingsEqual", () => {
  it("is true for two settings objects with identical fields", () => {
    const a = toProjectSettings(project());
    const b = toProjectSettings(project());
    expect(projectSettingsEqual(a, b)).toBe(true);
  });

  it("is false when any single field differs", () => {
    const a = toProjectSettings(project());
    const b = toProjectSettings(project({ letters: "ABC" }));
    expect(projectSettingsEqual(a, b)).toBe(false);
  });
});

describe("resolveProjectBackground (issue #63/#64)", () => {
  it("resolves 'transparent' to the plain transparent string", () => {
    expect(
      resolveProjectBackground({
        backgroundKind: "transparent",
        backgroundColor: "#3355ff",
        backgroundImage: "data:image/png;base64,abc",
      }),
    ).toBe("transparent");
  });

  it("resolves 'color' to the plain color string", () => {
    expect(
      resolveProjectBackground({
        backgroundKind: "color",
        backgroundColor: "#3355ff",
        backgroundImage: null,
      }),
    ).toBe("#3355ff");
  });

  it("resolves 'image' with a picked image to a BackgroundFill object", () => {
    expect(
      resolveProjectBackground({
        backgroundKind: "image",
        backgroundColor: "#3355ff",
        backgroundImage: "data:image/png;base64,abc",
      }),
    ).toEqual({ kind: "image", dataUrl: "data:image/png;base64,abc" });
  });

  it("falls back to transparent for 'image' with nothing picked yet", () => {
    expect(
      resolveProjectBackground({
        backgroundKind: "image",
        backgroundColor: "#3355ff",
        backgroundImage: null,
      }),
    ).toBe("transparent");
  });
});
