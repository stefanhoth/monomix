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
  "tabs.label": { en: "Editor sections", de: "Editor-Bereiche" },
  "tabs.design": { en: "Design", de: "Design" },
  "tabs.frame": { en: "Frame", de: "Rahmen" },
  "tabs.colors": { en: "Colors", de: "Farben" },
  "tabs.export": { en: "Export", de: "Export" },
  "frame.none": { en: "No Frame", de: "Kein Rahmen" },
  "frame.circle": { en: "Circle", de: "Kreis" },
  "frame.square": { en: "Square", de: "Quadrat" },
  "frame.diamond": { en: "Diamond", de: "Raute" },
  "frame.diamond-narrow": { en: "Narrow Diamond", de: "Schmale Raute" },
  "frame.diamond-wide": { en: "Wide Diamond", de: "Breite Raute" },
  "frame.dotted-circle": { en: "Dotted Circle", de: "Gepunkteter Kreis" },
  "frame.dashed-circle": { en: "Dashed Circle", de: "Gestrichelter Kreis" },
  "projects.new": { en: "New Project", de: "Neues Projekt" },
  "projects.rename": { en: "Rename", de: "Umbenennen" },
  "projects.delete": { en: "Delete", de: "Löschen" },
  "projects.nameLabel": { en: "Project name", de: "Projektname" },
  // The New surface (issue #48). "Remix" stays "Remix" in German — it's the
  // product pun (MonoMix → Remix), see CONTEXT.md.
  "new.startBlank": { en: "Start blank", de: "Leer starten" },
  "new.remix": { en: "Remix", de: "Remix" },
  "new.recent": {
    en: "Or remix a recent Project",
    de: "Oder remixe ein früheres Projekt",
  },
  "new.close": { en: "Close", de: "Schließen" },
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
  "credits.trigger": { en: "Fonts & licenses", de: "Schriften & Lizenzen" },
  "credits.heading": { en: "Fonts & licenses", de: "Schriften & Lizenzen" },
  "credits.intro": {
    en: "Every monogram is set in one of these libre-licensed fonts:",
    de: "Jedes Monogramm entsteht aus einer dieser frei lizenzierten Schriften:",
  },
  "credits.close": { en: "Close", de: "Schließen" },
  "about.trigger": { en: "About", de: "Über" },
  "about.heading": { en: "About MonoMix", de: "Über MonoMix" },
  "about.close": { en: "Close", de: "Schließen" },
  "about.intro": {
    en: "MonoMix turns 1–3 letters into a monogram, entirely in your browser — no account, no upload, no server. Pick a Design, add a Frame, choose your colors, and export as SVG, PNG, JPG, or PDF.",
    de: "MonoMix verwandelt 1–3 Buchstaben in ein Monogramm – komplett in deinem Browser, ohne Konto, Upload oder Server. Wähle ein Design, füge einen Rahmen hinzu, bestimme die Farben und exportiere als SVG, PNG, JPG oder PDF.",
  },
  "about.usageHeading": { en: "How it works", de: "So funktioniert's" },
  "about.usageStep1": {
    en: "Type your initials (1–3 letters).",
    de: "Gib deine Initialen ein (1–3 Buchstaben).",
  },
  "about.usageStep2": {
    en: "Pick a Design — a font, arrangement, and shape.",
    de: "Wähle ein Design – eine Kombination aus Schrift, Anordnung und Form.",
  },
  "about.usageStep3": {
    en: "Optionally add a Frame and set your colors.",
    de: "Füge optional einen Rahmen hinzu und lege die Farben fest.",
  },
  "about.usageStep4": {
    en: "Export as SVG, PNG, JPG, or PDF.",
    de: "Exportiere als SVG, PNG, JPG oder PDF.",
  },
  "about.privacyNote": {
    en: "Everything happens on your device. Install MonoMix as an app to use it offline.",
    de: "Alles passiert auf deinem Gerät. Installiere MonoMix als App, um es offline zu nutzen.",
  },
  "about.version": { en: "Version {version}", de: "Version {version}" },
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
