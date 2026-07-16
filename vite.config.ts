import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// ADR 0005: the release workflow injects the CalVer tag as the APP_VERSION
// env var around `npm run build` (.github/workflows/release.yml); `define`
// inlines it as a build-time constant so it reaches the About panel without
// a runtime env lookup. Falls back to "dev" for local builds, which never
// set that env var.
const appVersion = process.env.APP_VERSION ?? "dev";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "MonoMix",
        short_name: "MonoMix",
        description: "Mix your monogram and take it with you",
        theme_color: "#0b0b0c",
        background_color: "#0b0b0c",
        display: "standalone",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Every design/frame font is precached so the app works fully offline
        // immediately after install, not just for previously visited routes.
        globPatterns: ["**/*.{js,css,html,svg,png,ttf}"],
        // jsPDF dynamically imports these as optional add-ons for APIs we
        // never call (.html(), its built-in SVG-as-image support) — we use
        // svg2pdf.js directly instead. Named explicitly via manualChunks
        // below so this pattern can't accidentally catch an unrelated,
        // legitimately-used chunk in the future.
        globIgnores: ["**/jspdf-unused-*.js"],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Trailing slash: matches only the package itself, not a
          // same-prefix package like a hypothetical "canvg-fork".
          if (id.includes("node_modules/canvg/")) return "jspdf-unused-canvg";
          if (id.includes("node_modules/html2canvas/"))
            return "jspdf-unused-html2canvas";
          if (id.includes("node_modules/dompurify/"))
            return "jspdf-unused-dompurify";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts"],
  },
});
