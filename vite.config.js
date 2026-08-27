import { defineConfig } from 'vite';

// `base` must match the GitHub Pages project-site path so built asset URLs resolve.
// Repo: nataliecolonna/autocapture-test-project -> https://<user>.github.io/autocapture-test-project/
export default defineConfig({
  base: '/autocapture-test-project/',
});
