/**
 * Font catalog backing the algorithmic Designs (ADR 0006). Every font is
 * subset to A-Z + space at build time (see docs/FONTS.md) — there is no
 * dedicated monogram font under a compatible license, so ordinary display
 * fonts stand in and Designs compose them into circle/diamond/shield/etc.
 * shapes.
 */

const fontUrls = import.meta.glob("../assets/fonts/*/font.ttf", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type FontStyle =
  "serif" | "slab" | "geometric-sans" | "blackletter" | "script";

export interface FontEntry {
  id: string;
  family: string;
  style: FontStyle;
  license: "OFL-1.1" | "Apache-2.0";
  url: string;
}

const CATALOG: Omit<FontEntry, "url">[] = [
  { id: "cinzel", family: "Cinzel", style: "serif", license: "OFL-1.1" },
  {
    id: "cinzel-decorative",
    family: "Cinzel Decorative",
    style: "serif",
    license: "OFL-1.1",
  },
  {
    id: "playfair-display",
    family: "Playfair Display",
    style: "serif",
    license: "OFL-1.1",
  },
  {
    id: "cormorant-garamond",
    family: "Cormorant Garamond",
    style: "serif",
    license: "OFL-1.1",
  },
  {
    id: "abril-fatface",
    family: "Abril Fatface",
    style: "serif",
    license: "OFL-1.1",
  },
  {
    id: "archivo-black",
    family: "Archivo Black",
    style: "geometric-sans",
    license: "OFL-1.1",
  },
  {
    id: "league-spartan",
    family: "League Spartan",
    style: "geometric-sans",
    license: "OFL-1.1",
  },
  {
    id: "poppins",
    family: "Poppins",
    style: "geometric-sans",
    license: "OFL-1.1",
  },
  {
    id: "bebas-neue",
    family: "Bebas Neue",
    style: "geometric-sans",
    license: "OFL-1.1",
  },
  {
    id: "alfa-slab-one",
    family: "Alfa Slab One",
    style: "slab",
    license: "OFL-1.1",
  },
  {
    id: "roboto-slab",
    family: "Roboto Slab",
    style: "slab",
    license: "Apache-2.0",
  },
  { id: "kelly-slab", family: "Kelly Slab", style: "slab", license: "OFL-1.1" },
  {
    id: "unifraktur-maguntia",
    family: "UnifrakturMaguntia",
    style: "blackletter",
    license: "OFL-1.1",
  },
  {
    id: "unifraktur-cook",
    family: "UnifrakturCook",
    style: "blackletter",
    license: "OFL-1.1",
  },
  {
    id: "pinyon-script",
    family: "Pinyon Script",
    style: "script",
    license: "OFL-1.1",
  },
  {
    id: "alex-brush",
    family: "Alex Brush",
    style: "script",
    license: "OFL-1.1",
  },
  { id: "tangerine", family: "Tangerine", style: "script", license: "OFL-1.1" },
];

export const FONTS: FontEntry[] = CATALOG.map((entry) => {
  const match = Object.entries(fontUrls).find(([path]) =>
    path.includes(`/${entry.id}/`),
  );
  if (!match) {
    throw new Error(`No font file found for catalog entry "${entry.id}"`);
  }
  return { ...entry, url: match[1] };
});
