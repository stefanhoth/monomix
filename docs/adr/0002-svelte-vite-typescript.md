# UI stack: Svelte + Vite + TypeScript

The app is a single editor screen whose core work is client-side SVG generation; it must ship as a small, offline-capable PWA. We chose Svelte over React for its minimal runtime footprint and reactive-controls fit, with Vite (+ PWA plugin) and TypeScript as the build foundation. React was the alternative (bigger ecosystem), rejected because we need very few libraries (opentype.js, jsPDF) and bundle size matters more here.

Open option: sveltebits (https://sveltebits.xyz) as a UI component kit — to be evaluated, not yet committed.

Note: plain Vite + Svelte, not SvelteKit — the app is a single client-only screen with no routing or SSR needs, so SvelteKit's app-server conventions would be pure overhead.
