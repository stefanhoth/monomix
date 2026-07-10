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
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts"],
  },
});
