/**
 * Lightweight DE/EN mini-dictionary (issue #15) — no i18n framework, just a
 * flat key -> {en, de} map. Scope is the app's UI chrome (labels, buttons,
 * headings, hints) plus Frame names (plain common nouns like "Circle" that
 * read as ordinary UI copy). Design names (src/engine/designs.ts) are
 * generated font-family + variant composites — font family names are
 * proper nouns that don't get translated — and stay out of the dictionary.
 * See docs/DECISIONS.md.
 *
 * `as const satisfies` gives a compile-time guarantee that every key has
 * both locales; the runtime completeness test (tests/unit/i18n/dictionary.test.ts)
 * additionally catches an accidentally-empty string, which the type system
 * can't.
 */
export type Locale = "en" | "de";

export const LOCALES: Locale[] = ["en", "de"];

export const dictionary = {
  "app.tagline": {
    en: "Mix your monogram and take it with you.",
    de: "Misch dein Monogramm und nimm es überallhin mit.",
  },
  "letters.label": { en: "Letters", de: "Buchstaben" },
  "letters.hint.generic": {
    en: "Only A-Z letters are supported.",
    de: "Es werden nur die Buchstaben A-Z unterstützt.",
  },
  "letters.hint.suggestion": {
    en: 'Only A-Z letters are supported. Try "{suggestion}" instead of "{invalid}".',
    de: 'Es werden nur die Buchstaben A-Z unterstützt. Verwende "{suggestion}" statt "{invalid}".',
  },
  "frameGap.label": { en: "Frame Gap", de: "Abstand" },
  "color.letters": { en: "Letter Color", de: "Buchstabenfarbe" },
  "color.frame": { en: "Frame Color", de: "Rahmenfarbe" },
  "color.background": { en: "Background Color", de: "Hintergrundfarbe" },
  "color.transparent": {
    en: "Transparent background",
    de: "Transparenter Hintergrund",
  },
  "export.sizeLabel": { en: "PNG/JPG size (px)", de: "PNG/JPG-Größe (px)" },
  "export.svg": { en: "Export SVG", de: "SVG exportieren" },
  "export.png": { en: "Export PNG", de: "PNG exportieren" },
  "export.jpg": { en: "Export JPG", de: "JPG exportieren" },
  "export.pdf": { en: "Export PDF", de: "PDF exportieren" },
  "gallery.designsLabel": { en: "Designs", de: "Designs" },
  "gallery.framesLabel": { en: "Frames", de: "Rahmen" },
  "frame.none": { en: "No Frame", de: "Kein Rahmen" },
  "frame.circle": { en: "Circle", de: "Kreis" },
  "frame.square": { en: "Square", de: "Quadrat" },
  "frame.diamond": { en: "Diamond", de: "Raute" },
  "frame.dotted-circle": { en: "Dotted Circle", de: "Gepunkteter Kreis" },
  "frame.dashed-circle": { en: "Dashed Circle", de: "Gestrichelter Kreis" },
  "projects.heading": { en: "Projects", de: "Projekte" },
  "projects.new": { en: "New Project", de: "Neues Projekt" },
  "projects.rename": { en: "Rename", de: "Umbenennen" },
  "projects.delete": { en: "Delete", de: "Löschen" },
  "projects.nameLabel": { en: "Project name", de: "Projektname" },
  "onboarding.initialsLabel": { en: "Your initials?", de: "Deine Initialen?" },
  "onboarding.submit": {
    en: "See my monogram",
    de: "Mein Monogramm ansehen",
  },
  "onboarding.skip": { en: "Just browsing", de: "Nur stöbern" },
  "locale.switchLabel": { en: "Language", de: "Sprache" },
  "whatsnew.buttonLabel": { en: "What's new", de: "Neuigkeiten" },
  "whatsnew.unseenIndicator": { en: "(new)", de: "(neu)" },
  "whatsnew.heading": { en: "What's new", de: "Neuigkeiten" },
  "whatsnew.close": { en: "Close", de: "Schließen" },
} as const satisfies Record<string, Record<Locale, string>>;

export type DictKey = keyof typeof dictionary;

/** Pure string lookup + `{param}` interpolation — no reactivity, no DOM. */
export function translate(
  key: DictKey,
  locale: Locale,
  params?: Record<string, string>,
): string {
  let text: string = dictionary[key][locale];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}
