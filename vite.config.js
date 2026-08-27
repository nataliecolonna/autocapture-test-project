import { defineConfig } from 'vite';
import { resolve } from 'path';

// `base` must match the GitHub Pages project-site path so built asset URLs resolve.
// Repo: nataliecolonna/autocapture-test-project -> https://<user>.github.io/autocapture-test-project/
export default defineConfig({
  base: '/autocapture-test-project/',
  build: {
    rollupOptions: {
      // Multi-page app: build both the home page and the confirmation page.
      input: {
        main: resolve(__dirname, 'index.html'),
        confirmation: resolve(__dirname, 'confirmation.html'),
      },
    },
  },
});
