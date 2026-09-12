import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    // 2026-09-11, on request: renamed from Vite's default `dist` so this
    // repo's build output has a name that says what it's for — the folder
    // to point Chrome's "Load Unpacked" at directly, permanently, during
    // local iteration (no zip/download/unzip round trip, and no risk of
    // stale hash-named files lingering the way an ad hoc unzip-over-an-
    // existing-folder can: Vite's own emptyOutDir default, still in
    // effect, wipes this directory clean before every build). CI's own
    // release workflows zip this same folder for the website's download
    // button — see release.yml/production-release.yml.
    outDir: 'deploy',
    rollupOptions: {
      // Declared explicitly rather than relying on @crxjs/vite-plugin to
      // auto-discover it from manifest.json's side_panel.default_path —
      // this exact "the plugin didn't pick up an HTML entry on its own"
      // failure already happened once today (popup.html silently missing
      // from dist/ right after default_popup was removed), so being
      // explicit here is a safety net regardless of whether this crx
      // version's side_panel auto-discovery works or not.
      input: {
        sidepanel: 'sidepanel.html',
      },
    },
  },
});
