import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// CarSide is served from a GitHub *project* page, i.e. https://<user>.github.io/CarSide/
// so every asset URL has to be rooted at /CarSide/. Override with VITE_BASE_PATH
// (e.g. "/") when building for a custom domain or local static hosting.
const base = process.env.VITE_BASE_PATH ?? '/CarSide/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      // fileURLToPath keeps spaces in the project path intact (URL.pathname would percent-encode them).
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 2048,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
