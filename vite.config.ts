import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
          if (id.includes("node_modules/canvg")) return "jspdf-unused-canvg";
          if (id.includes("node_modules/html2canvas"))
            return "jspdf-unused-html2canvas";
          if (id.includes("node_modules/dompurify"))
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
